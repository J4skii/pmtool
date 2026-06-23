import express from 'express';
import axios from 'axios';
import XLSX from 'xlsx';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

let syncCache = {
  data: null,
  lastSync: null,
  error: null,
  sheets: []
};

let userTokens = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

function shareUrlToItemId(shareUrl) {
  try {
    const encoded = Buffer.from(shareUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return `u!${encoded}`;
  } catch (e) {
    throw new Error('Invalid share URL');
  }
}

async function refreshAccessToken() {
  if (!userTokens.refreshToken) throw new Error('No refresh token — user must sign in again');
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    client_secret: process.env.AZURE_CLIENT_SECRET,
    refresh_token: userTokens.refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/.default offline_access'
  });
  const response = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const { access_token, refresh_token, expires_in } = response.data;
  userTokens.accessToken = access_token;
  if (refresh_token) userTokens.refreshToken = refresh_token;
  userTokens.expiresAt = Date.now() + expires_in * 1000;
}

// Returns a valid token, refreshing automatically if within 5 min of expiry
async function getValidAccessToken() {
  if (!userTokens.accessToken) throw new Error('Not authenticated');
  if (userTokens.expiresAt && Date.now() > userTokens.expiresAt - 5 * 60 * 1000) {
    await refreshAccessToken();
  }
  return userTokens.accessToken;
}

async function fetchExcelFromOneDrive(shareUrl, accessToken) {
  try {
    const itemId = shareUrlToItemId(shareUrl);
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${itemId}/driveItem/content`;
    const response = await axios.get(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer'
    });
    return response.data;
  } catch (error) {
    console.error('OneDrive fetch error:', error.message);
    throw new Error(`Failed to fetch from OneDrive: ${error.response?.status || error.message}`);
  }
}

function parseExcelWorkbook(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheets = {};
    const sheetNames = [];
    workbook.SheetNames.forEach(name => {
      sheetNames.push(name);
      const worksheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      sheets[name] = parseProjectRows(rows);
    });
    return { sheets, sheetNames };
  } catch (error) {
    console.error('Excel parse error:', error.message);
    throw new Error(`Failed to parse Excel: ${error.message}`);
  }
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
        n: name,
        o: owner || currentProject.owner,
        p: priority || currentProject.priority,
        s: 'todo',
        f: start,
        t: finish,
        note: ''
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

app.get('/api/auth/login', (req, res) => {
  res.redirect(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.AZURE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.BACKEND_URL + '/api/auth/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://graph.microsoft.com/.default offline_access')}&` +
    `state=oauth2`
  );
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=${error}`);
  }
  try {
    // Microsoft token endpoint requires form-encoded body, not JSON
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      code,
      redirect_uri: process.env.BACKEND_URL + '/api/auth/callback',
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/.default offline_access'
    });
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    userTokens.accessToken = access_token;
    userTokens.refreshToken = refresh_token;
    userTokens.expiresAt = Date.now() + expires_in * 1000;
    res.redirect(`${process.env.FRONTEND_URL}?auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

app.get('/api/auth/status', (req, res) => {
  const isAuthed = !!userTokens.accessToken;
  const expiresIn = isAuthed ? Math.max(0, Math.ceil((userTokens.expiresAt - Date.now()) / 1000)) : null;
  res.json({
    authenticated: isAuthed,
    expiresIn,
    lastRefresh: userTokens.expiresAt ? new Date(userTokens.expiresAt).toISOString() : null
  });
});

app.post('/api/sync', async (req, res) => {
  const { shareUrl } = req.body;
  if (!userTokens.accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Call /api/auth/login first.' });
  }
  const url = shareUrl || process.env.ONEDRIVE_SHARE_LINK;
  if (!url) {
    return res.status(400).json({ error: 'No shareUrl provided and none in .env' });
  }
  try {
    syncCache.error = null;
    const token = await getValidAccessToken();
    const buffer = await fetchExcelFromOneDrive(url, token);
    const { sheets, sheetNames } = parseExcelWorkbook(buffer);
    syncCache.data = sheets;
    syncCache.sheets = sheetNames;
    syncCache.lastSync = new Date().toISOString();
    res.json({
      success: true,
      lastSync: syncCache.lastSync,
      sheets: sheetNames,
      projectCount: Object.values(sheets).reduce((sum, s) => sum + s.length, 0)
    });
  } catch (error) {
    syncCache.error = error.message;
    console.error('Sync error:', error.message);
    res.status(500).json({ error: error.message, lastSync: syncCache.lastSync });
  }
});

app.get('/api/data/:sheet', (req, res) => {
  const { sheet } = req.params;
  if (!syncCache.data) {
    return res.status(400).json({ error: 'No data synced yet. Call POST /api/sync first.' });
  }
  if (!syncCache.data[sheet]) {
    return res.status(404).json({ error: `Sheet "${sheet}" not found. Available: ${syncCache.sheets.join(', ')}` });
  }
  res.json({
    sheet,
    projects: syncCache.data[sheet],
    lastSync: syncCache.lastSync
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    authenticated: !!userTokens.accessToken,
    lastSync: syncCache.lastSync,
    error: syncCache.error,
    sheets: syncCache.sheets,
    projectCount: syncCache.data ? Object.values(syncCache.data).reduce((sum, s) => sum + s.length, 0) : 0
  });
});

app.get('/health', (req, res) => {
  const now = Date.now();
  const isAuthed = !!userTokens.accessToken;
  const expiresIn = isAuthed && userTokens.expiresAt ? Math.max(0, Math.ceil((userTokens.expiresAt - now) / 1000)) : null;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    auth: {
      authenticated: isAuthed,
      expiresInSeconds: expiresIn,
      hasRefreshToken: !!userTokens.refreshToken,
      tokenExpiry: userTokens.expiresAt ? new Date(userTokens.expiresAt).toISOString() : null
    },
    sync: {
      lastSync: syncCache.lastSync,
      error: syncCache.error,
      sheets: syncCache.sheets,
      projectCount: syncCache.data ? Object.values(syncCache.data).reduce((sum, s) => sum + s.length, 0) : 0
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Praeto Excel Sync Backend running on port ${PORT}`);
  console.log(`📝 OAuth login: http://localhost:${PORT}/api/auth/login`);
  console.log(`📊 Sync endpoint: POST http://localhost:${PORT}/api/sync`);
  console.log(`📈 Data endpoint: GET http://localhost:${PORT}/api/data/:sheet`);
});
