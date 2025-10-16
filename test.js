require('dotenv').config();
const axios = require('axios');

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
    const res = await axios.get(url);
    
    console.log('\n=== MODELOS DISPONÍVEIS ===\n');
    
    res.data.models.forEach(model => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`✅ ${model.name}`);
        console.log(`   Descrição: ${model.displayName}`);
        console.log(`   Métodos: ${model.supportedGenerationMethods.join(', ')}\n`);
      }
    });
  } catch (err) {
    console.error('Erro:', err.response ? err.response.data : err.message);
  }
}

listModels();