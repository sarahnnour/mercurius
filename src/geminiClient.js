const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

async function askGemini(prompt) {
  if (!GEMINI_KEY) {
    return `Erro: A chave da API do Gemini não foi configurada. Verifique o arquivo .env`;
  }

  // Gemini 2.5 Flash - melhor custo-benefício (rápido e inteligente)
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

  try {
    const body = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    console.log('Chamando Gemini 2.5 Flash...');
    
    const res = await axios.post(url, body, { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30 segundos de timeout
    });
    
    const data = res.data || {};

    // Verifica se há resposta válida
    if (data.candidates && 
        data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }

    // Se não houver candidatos, pode ter sido bloqueado por safety
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
      console.warn('Resposta bloqueada:', data.candidates[0].finishReason);
      return 'Desculpe, não consegui gerar uma resposta adequada. Tente reformular sua pergunta.';
    }

    return `Não foi possível extrair a resposta da API Gemini.`;

  } catch (err) {
    console.error('Erro ao chamar Gemini 2.5:', err.response ? err.response.data : err.message);
    
    const errorDetails = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error('Falha ao consultar a API Gemini: ' + errorDetails);
  }
}

module.exports = { askGemini };