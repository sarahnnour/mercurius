const axios = require('axios');

// Pega a chave da API das variáveis de ambiente
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Função que manda a pergunta pro modelo Gemini
// Precisa da chave da API configurada na variável GEMINI_API_KEY
async function askGemini(prompt) {
  // Se não tiver chave configurada, só retorna uma mensagem de exemplo
  if (!GEMINI_KEY) {
    return `(Resposta de demonstração) A chave da API do Gemini não foi configurada. Pergunta recebida: ${prompt.slice(0, 200)}`;
  }

  // Uso o modelo mais rápido do Gemini
  const model = 'gemini-1.5-flash';

  // Endpoint da API do Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

  try {
    const body = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
    const data = res.data || {};

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }

    return `Não foi possível extrair a resposta. Dados recebidos da API: ${JSON.stringify(data)}`;

  } catch (err) {
    console.error('Erro ao chamar a API do Gemini:', err.response ? err.response.data : err.message);
    const errorDetails = err.response ? JSON.stringify(err.response.data.error) : err.message;
    throw new Error('Falha ao consultar a API Gemini: ' + errorDetails);
  }
}

module.exports = { askGemini };