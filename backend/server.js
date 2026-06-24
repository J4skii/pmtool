import express from 'express';
import axios from 'axios';
import XLSX from 'xlsx';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const TENANT      = process.env.AZURE_TENANT_ID    || '130082fa-9207-414f-adc2-d194b13593a6';
const CLIENT_ID   = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL  || 'https://pmtool-4-praeto.vercel.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://pmtool-4-praeto.vercel.app';
const REDIRECT_URI = `${BACKEND_URL}/api/auth/callback`;
const SCOPES = 'offline_access Files.Read User.Read';

function encodeShareUrl(url) {
  const b64 = Buffer.from(url).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `u!${b64}`;
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
    const start = parseExcelDate(row[4]);
    const finish = parseExcelDate(row[5]);
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

function parseExcelDate(v) {
  if (!v) return '';
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number' && v > 40000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return '';
}

// ─── Auth: redirect user to Microsoft login ───────────────────────────────
app.get('/api/auth/login', (req, res) => {
  if (!CLIENT_ID) return res.status(503).send('Azure credentials not configured.');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_mode: 'query',
  });
  res.redirect(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params}`);
});

// ─── Auth: exchange code for tokens, send refresh token to frontend ────────
app.get('/api/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) return res.status(400).send(`Microsoft auth error: ${error_description || error}`);

  try {
    const resp = await axios.post(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPES,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { refresh_token } = resp.data;
    // Send the refresh token to the frontend via URL fragment — never touches a server log
    res.redirect(`${FRONTEND_URL}#rt=${encodeURIComponent(refresh_token)}`);
  } catch (e) {
    const msg = e.response?.data?.error_description || e.message;
    res.status(500).send('Token exchange failed: ' + msg);
  }
});

// ─── Data: fetch and parse the Excel file ─────────────────────────────────
// Requires X-Refresh-Token header from the frontend.
app.get('/api/data', async (req, res) => {
  const { shareUrl } = req.query;
  if (!shareUrl) return res.status(400).json({ error: 'shareUrl query param is required' });

  const refreshToken = req.headers['x-refresh-token'];
  if (!refreshToken) {
    return res.status(401).json({
      error: 'Not connected to OneDrive. Click "Connect OneDrive" in the dashboard.',
      code: 'NO_AUTH',
    });
  }

  try {
    // Exchange refresh token for a fresh access token
    const tokenResp = await axios.post(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Files.Read',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token: newRefreshToken } = tokenResp.data;

    // Get pre-authenticated download URL from Graph
    const shareId = encodeShareUrl(shareUrl);
    const metaResp = await axios.get(
      `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
      {
        params: { $select: '@microsoft.graph.downloadUrl' },
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const dlUrl = metaResp.data['@microsoft.graph.downloadUrl'];
    if (!dlUrl) throw new Error('No download URL returned — ensure the file is an Excel workbook.');

    const fileResp = await axios.get(dlUrl, { responseType: 'arraybuffer' });

    const workbook = XLSX.read(fileResp.data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const projects = parseProjectRows(rows);

    res.json({
      projects,
      sheetName,
      lastSync: new Date().toISOString(),
      // Return rotated refresh token so frontend keeps it fresh
      newRefreshToken: newRefreshToken || null,
    });
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.error_description || error.response?.data?.error?.message || error.message;
    console.error(`/api/data error [${status}]:`, detail);

    if (status === 401 || (error.response?.data?.error === 'invalid_grant')) {
      return res.status(401).json({ error: 'Session expired. Reconnect OneDrive.', code: 'TOKEN_EXPIRED' });
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
    console.log(`Login: http://localhost:${PORT}/api/auth/login`);
  });
}

export default app;
