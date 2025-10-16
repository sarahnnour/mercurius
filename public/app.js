// Lógica do frontend: manda as perguntas pro backend e mostra as respostas na tela
const messagesEl = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('input');
const typingEl = document.getElementById('typing');
const rootEl = document.querySelector('main.centered');

// Mostra uma faixa de aviso ou erro no topo da tela
function showBanner(message, type = 'error'){
  let b = document.getElementById('app-banner');
  if(!b){
    b = document.createElement('div');
    b.id = 'app-banner';
    b.style.padding = '10px';
    b.style.marginBottom = '12px';
    b.style.borderRadius = '8px';
    rootEl.insertBefore(b, rootEl.firstChild);
  }
  b.textContent = message;
  b.style.background = type === 'error' ? '#fff1f0' : '#ecfdf5';
  b.style.color = type === 'error' ? '#991b1b' : '#064e3b';
}

function appendMessage(text, sender = 'bot'){
  const wrap = document.createElement('div');
  wrap.className = `message ${sender === 'user' ? 'user' : 'bot'}`;
  const bubble = document.createElement('div');
  bubble.className = `bubble ${sender === 'user' ? 'user' : 'bot'}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function queryServer(q){
  typingEl.hidden = false;
  try{
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q })
    });
    if(!res.ok){
      const text = await res.text().catch(()=>null);
      throw new Error('Erro ao consultar servidor: ' + (text || res.statusText));
    }
    const data = await res.json().catch(()=>null);
    typingEl.hidden = true;
    if(data && data.answer) appendMessage(data.answer, 'bot');
    else if(data && data.error) appendMessage('Erro do servidor: ' + data.error, 'bot');
    else appendMessage('Desculpe, não consegui gerar uma resposta.', 'bot');
  }catch(err){
    typingEl.hidden = true;
    appendMessage('Erro: ' + (err.message || err), 'bot');
    showBanner('Falha ao contatar o backend. Verifique se o servidor está rodando (npm start). ' + (err.message || ''), 'error');
  }
}

form.addEventListener('submit', e =>{
  e.preventDefault();
  const q = input.value.trim();
  if(!q) return;
  appendMessage(q, 'user');
  input.value = '';
  queryServer(q);
});

// Mensagem inicial quando abre o app
appendMessage('Olá! Pergunte sobre as vendas mensais, produtos mais vendidos, comparações e insights.', 'bot');

// Quando carrega a página, testa se o backend tá funcionando
window.addEventListener('load', async ()=>{
  try{
    const res = await fetch('/api/files');
    if(!res.ok) {
      const txt = await res.text().catch(()=>null);
      showBanner('Aviso: /api/files retornou erro. ' + (txt || res.statusText));
      return;
    }
    const json = await res.json().catch(()=>null);
    if(json && json.files) console.info('Arquivos na pasta:', json.files);
  }catch(e){
    showBanner('Não foi possível acessar /api/files — o backend pode não estar rodando. ' + (e.message||''));
  }
});
