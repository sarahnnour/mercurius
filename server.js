// Simple Express server providing endpoints to list files and answer queries.
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { listFilesInFolder, readSheet } = require('./src/googleClient');
const { askGemini } = require('./src/geminiClient');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/files', async (req, res) =>{
  try{
    const files = await listFilesInFolder(process.env.GDRIVE_FOLDER_ID);
    res.json({ files });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Endpoint de diagnóstico (seguro): informa se env vars e credentials foram carregados
app.get('/api/debug', (req, res) =>{
  const fs = require('fs');
  const path = require('path');
  const credPath = path.join(__dirname, 'credentials.json');
  let serviceEmail = null;
  if(fs.existsSync(credPath)){
    try{ const key = require(credPath); serviceEmail = key.client_email || null }catch(e){ /* ignore */ }
  }
  res.json({
    gdriveFolderIdDefined: !!process.env.GDRIVE_FOLDER_ID,
    geminiKeyDefined: !!process.env.GEMINI_API_KEY,
    serviceAccountEmail: serviceEmail
  });
});

// Rota solicitada: lista Planilhas Google em uma pasta (usa credentials.json)
app.get('/api/drive-files', async (req, res) => {
  const { google } = require('googleapis');
  const fs = require('fs');
  const path = require('path');

  try {
    const credPath = path.join(__dirname, 'credentials.json');
    if (!fs.existsSync(credPath)) {
      throw new Error('Arquivo credentials.json não encontrado na raiz do projeto');
    }
    const key = require(credPath);

    // Autenticação usando service account (credentials.json)
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    // ID da pasta placeholder conforme solicitado
    const folderId = '1TGow6q7-0Itc5ktBEGzkkb81wo5LpkD-';

    // Query: arquivos na pasta que sejam Google Spreadsheets
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: 'files(id,name)'
    });

    // Debug: imprime a resposta completa da API do Google Drive para diagnóstico
    console.log('Resposta completa da API do Google:', response.data);

    const files = (response.data && response.data.files) ? response.data.files.map(f => ({ id: f.id, name: f.name })) : [];

    return res.json({ files });
  } catch (error) {
    console.error('Erro /api/drive-files:', error);
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/query', async (req, res) =>{
  const { question } = req.body || {};
  if(!question) return res.status(400).json({ error: 'Pergunta ausente' });
  
  console.log('Debug /api/query:', {
    'GEMINI_API_KEY exists?': !!process.env.GEMINI_API_KEY,
    'GDRIVE_FOLDER_ID exists?': !!process.env.GDRIVE_FOLDER_ID,
    'Question received': question
  });

  try{
    // Example flow: list files, read sheets, aggregate minimal data, forward to Gemini
    const files = await listFilesInFolder(process.env.GDRIVE_FOLDER_ID);
    console.log('Debug /api/query: encontradas', files.length, 'planilhas');
    
    // For demo, read first sheet if any
    let sheetsData = [];
    if(files.length){
      const first = files[0];
      try{
        const data = await readSheet(first.id);
        sheetsData.push({ name: first.name, data });
        console.log('Debug /api/query: lida planilha', first.name, 'com', data?.length || 0, 'linhas');
      }catch(e){ console.warn('Não foi possível ler a planilha', e.message) }
    }

    // Build a prompt: include small sample of sheet data and the user question
    const prompt = `Dados: ${JSON.stringify(sheetsData).slice(0,4000)}\n\nPergunta: ${question} (responda em português)`;
    const answer = await askGemini(prompt);
    res.json({ answer });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server rodando na porta ${PORT}`));
