const messagesEl = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('input');
const typingEl = document.getElementById('typing');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Controle do menu mobile
function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
  menuToggle.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  menuToggle.classList.remove('active');
}

// Event listeners para o menu
menuToggle.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Fecha sidebar ao clicar em um arquivo (mobile)
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && e.target.closest('.file-item')) {
    setTimeout(closeSidebar, 300);
  }
});

// Fecha sidebar ao redimensionar para desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeSidebar();
  }
});

function showBanner(message, type = 'error') {
  let b = document.getElementById('app-banner');
  if (b) {
    b.remove();
  }
  
  b = document.createElement('div');
  b.id = 'app-banner';
  b.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    max-width: 400px;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: slideInRight 0.3s ease;
  `;
  
  b.textContent = message;
  
  if (type === 'error') {
    b.style.background = '#ff4444';
    b.style.color = '#ffffff';
  } else if (type === 'success') {
    b.style.background = '#00ff88';
    b.style.color = '#000000';
  } else {
    b.style.background = '#ffffff';
    b.style.color = '#000000';
  }
  
  // Ajuste para mobile
  if (window.innerWidth <= 768) {
    b.style.top = '4.5rem';
    b.style.left = '1rem';
    b.style.right = '1rem';
    b.style.maxWidth = 'none';
  }
  
  document.body.appendChild(b);
  
  setTimeout(() => {
    if (b && b.parentNode) {
      b.remove();
    }
  }, 5000);
}

function appendMessage(text, sender = 'bot') {
  const wrap = document.createElement('div');
  wrap.className = `message ${sender === 'user' ? 'user' : 'bot'}`;
  const bubble = document.createElement('div');
  bubble.className = `bubble ${sender === 'user' ? 'user' : 'bot'}`;
  
  bubble.style.whiteSpace = 'pre-wrap';
  bubble.textContent = text;
  
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadFilesList() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('Erro ao carregar lista de arquivos');
    
    const data = await res.json();
    const files = data.files || [];
    
    if (files.length === 0) {
      filesList.innerHTML = '<p class="no-files">Nenhum arquivo enviado ainda</p>';
      return;
    }
    
    filesList.innerHTML = files.map(file => `
      <div class="file-item" data-id="${file.id}">
        <div class="file-info">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${file.rows} linhas</small>
        </div>
        <button class="delete-btn" onclick="deleteFile('${file.id}')" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar arquivos:', err);
    filesList.innerHTML = '<p class="error-text">Erro ao carregar planilhas</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    console.log('📤 Enviando arquivo:', file.name);
    showBanner('Enviando arquivo...', 'info');
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Status da resposta:', res.status);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || 'Erro ao enviar arquivo');
    }
    
    const data = await res.json();
    console.log('✅ Arquivo enviado:', data);
    
    showBanner(`✓ ${data.file.name} enviado com sucesso (${data.file.rows} linhas)`, 'success');
    
    await loadFilesList();
    appendMessage(`Arquivo "${data.file.name}" adicionado com sucesso! Agora você pode fazer perguntas sobre os dados.`, 'bot');
    
    // Fecha sidebar no mobile após upload bem-sucedido
    if (window.innerWidth <= 768) {
      setTimeout(closeSidebar, 800);
    }
  } catch (err) {
    console.error('❌ Erro no upload:', err);
    showBanner('Erro ao enviar arquivo: ' + err.message, 'error');
  }
}

async function deleteFile(fileId) {
  if (!confirm('Tem certeza que deseja remover esta planilha?')) return;
  
  try {
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Erro ao remover arquivo');
    
    showBanner('Planilha removida com sucesso', 'success');
    await loadFilesList();
  } catch (err) {
    console.error('Erro ao deletar:', err);
    showBanner('Erro ao remover planilha: ' + err.message, 'error');
  }
}

// Event listener para upload de arquivos
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  console.log('📁 Arquivos selecionados:', files.length);
  
  if (files.length > 0) {
    files.forEach(file => {
      console.log('📄 Processando:', file.name, 'Tamanho:', file.size, 'bytes');
      uploadFile(file);
    });
    fileInput.value = '';
  }
});

async function queryServer(q) {
  const typingTimer = setTimeout(() => {
    typingEl.hidden = false;
  }, 500);

  try {
    console.log('💬 Enviando pergunta:', q);

    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error('Erro ao consultar servidor: ' + (text || res.statusText));
    }

    const data = await res.json().catch(() => null);
    
    clearTimeout(typingTimer);
    typingEl.hidden = true;

    console.log('📨 Resposta recebida:', data);

    if (data && data.answer) {
      appendMessage(data.answer, 'bot');
    } else if (data && data.error) {
      appendMessage('Erro do servidor: ' + data.error, 'bot');
    } else {
      appendMessage('Desculpe, não consegui gerar uma resposta.', 'bot');
    }
  } catch (err) {
    clearTimeout(typingTimer);
    typingEl.hidden = true;
    console.error('❌ Erro na consulta:', err);
    appendMessage('Erro: ' + (err.message || err), 'bot');
    showBanner('Falha ao contatar o backend. ' + (err.message || ''), 'error');
  }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  appendMessage(q, 'user');
  input.value = '';
  queryServer(q);
});

// Mensagem inicial
appendMessage('Olá! Eu sou o Mercurius, um assistente de análise de dados. Envie uma planilha e me faça perguntas sobre ela!', 'bot');

// Carrega a lista de arquivos ao iniciar
window.addEventListener('load', async () => {
  console.log('🚀 Aplicação iniciada');
  await loadFilesList();
  
  try {
    const res = await fetch('/api/debug');
    if (res.ok) {
      const data = await res.json();
      console.info('🔍 Debug:', data);
      
      if (!data.geminiKeyDefined) {
        showBanner('⚠️ Chave da API Gemini não configurada no .env', 'error');
      }
    }
  } catch (e) {
    console.warn('Debug endpoint não disponível:', e);
  }
});

// Adiciona animação CSS para o banner
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);