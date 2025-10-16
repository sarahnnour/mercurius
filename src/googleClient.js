const {google} = require('googleapis');
const fs = require('fs');
const path = require('path');

let authClient;
function getAuth(){
  if(authClient) return authClient;
  console.log('Log da hora que iniciou:', new Date().toISOString());
  const credPath = path.join(__dirname, '..', 'credentials.json');
  if(!fs.existsSync(credPath)) throw new Error('Arquivo credentials.json não encontrado. Cole o JSON da service account em credentials.json na raiz do projeto.');
  const key = require(credPath);
  authClient = new google.auth.GoogleAuth({
    credentials: key,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ]
  });
  return authClient;
}

async function listFilesInFolder(folderId){
  if(!folderId) throw new Error('GDRIVE_FOLDER_ID não definido em .env');
  console.log('listFilesInFolder: chamada em', new Date().toISOString());
  const auth = getAuth();
  const drive = google.drive({version:'v3', auth});
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: 'files(id,name)'
  });
  return res.data.files || [];
}

async function readSheet(fileId){
  console.log('readSheet: chamada em', new Date().toISOString());
  const auth = getAuth();
  const sheets = google.sheets({version:'v4', auth});
  // Read first sheet values
  const meta = await sheets.spreadsheets.get({ spreadsheetId: fileId });
  const sheetName = meta.data.sheets[0].properties.title;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range: `${sheetName}` });
  return res.data.values || [];
}

module.exports = { listFilesInFolder, readSheet };
