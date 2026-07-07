import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

let credentials = null;
try {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '');
} catch (e) {
  credentials = null;
}

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function extractSheetId(input) {
  const s = String(input || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : s;
}

function parseProjectRows(rows) {
  const dataRows = rows.slice(3);
  const projects = [];
  let currentProject = null;
  const projectRegex = /^[A-Za-z]\d+$/;
  const taskRegex = /^\d+\.\d+$/;

  dataRows.forEach(row => {
    const code = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    if (!code && !name) return;

    const owner = String(row[2] || '').trim();
    const priority = normalizePriority(String(row[3] || '').trim());
    const start = parseSheetDate(row[4]);
    const finish = parseSheetDate(row[5]);
    const cat = code[0] && /[A-Za-z]/.test(code[0]) ? code[0].toUpperCase() : '';

    if (projectRegex.test(code) && name && cat) {
      currentProject = { id: code, cat, name, owner, priority: priority || 'Medium', tasks: [] };
      projects.push(currentProject);
    } else if (taskRegex.test(code) && name && currentProject) {
      currentProject.tasks.push({
        n: name, o: owner || currentProject.owner,
        p: priority || currentProject.priority,
        s: 'todo', f: start, t: finish, note: ''
      });
    }
  });
  return projects.filter(p => p.tasks.length);
}

function normalizePriority(p) {
  const map = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
  return map[(p || '').toLowerCase().trim()] || p || '';
}

// Google Sheets, with dateTimeRenderOption: SERIAL_NUMBER, returns dates as the
// same 1899-12-30 epoch serial numbers Excel uses — reuse that parsing directly.
function parseSheetDate(v) {
  if (!v && v !== 0) return '';
  if (typeof v === 'number' && v > 40000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return '';
}

// ─── Tell the frontend which Google account to share sheets with ──────────
app.get('/api/service-account', (req, res) => {
  if (!credentials) return res.status(503).json({ error: 'Service account not configured on server.' });
  res.json({ email: credentials.client_email });
});

// ─── Data: fetch and parse the Google Sheet ───────────────────────────────
app.get('/api/data', async (req, res) => {
  const { sheetId } = req.query;
  if (!sheetId) return res.status(400).json({ error: 'sheetId query param is required' });
  if (!credentials) return res.status(503).json({ error: 'Service account not configured on server.' });

  try {
    const id = extractSheetId(sheetId);
    const sheets = getSheetsClient();

    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const sheetTitle = meta.data.sheets[0].properties.title;

    const valuesResp = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: sheetTitle,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    const rows = valuesResp.data.values || [];
    const projects = parseProjectRows(rows);

    res.json({
      projects,
      sheetName: sheetTitle,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    const status = error.code || error.response?.status;
    const detail = error.response?.data?.error?.message || error.message;
    console.error(`/api/data error [${status}]:`, detail);

    if (status === 404 || status === 403) {
      return res.status(403).json({
        error: 'Cannot access this sheet. Make sure it is shared with the service account email shown in the Sheets panel.',
        code: 'NOT_SHARED',
      });
    }
    res.status(status || 500).json({ error: detail || error.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Praeto backend running on :${PORT}`);
    console.log(`Data endpoint: GET http://localhost:${PORT}/api/data?sheetId=<Google Sheet URL or ID>`);
  });
}

export default app;
