import express from 'express';
import axios from 'axios';
import XLSX from 'xlsx';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Converts a 1drv.ms share URL into the Graph API anonymous share token
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

// GET /api/data?shareUrl=<1drv.ms link>
// The share link must be "Anyone with the link can view".
// Strategy A: append &download=1 to bypass Graph API entirely (no auth needed).
// Strategy B (fallback): client credentials token + Graph API (needs Azure env vars).
app.get('/api/data', async (req, res) => {
  const { shareUrl } = req.query;
  if (!shareUrl) {
    return res.status(400).json({ error: 'shareUrl query param is required' });
  }

  try {
    let fileBuffer;

    // Strategy A — direct download via &download=1 (no auth, works for public shares)
    const dlUrl = shareUrl.includes('?') ? `${shareUrl}&download=1` : `${shareUrl}?download=1`;
    try {
      const resp = await axios.get(dlUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 10,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
        },
      });
      const ct = resp.headers['content-type'] || '';
      if (!ct.includes('html')) {
        fileBuffer = resp.data;
      }
    } catch (e) {
      console.log('Strategy A failed:', e.message);
    }

    // Strategy B — Graph API with client credentials token (needs Azure env vars)
    if (!fileBuffer && process.env.AZURE_CLIENT_ID) {
      const tokenResp = await axios.post(
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID,
          client_secret: process.env.AZURE_CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const token = tokenResp.data.access_token;

      const shareId = encodeShareUrl(shareUrl);
      const metaResp = await axios.get(
        `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
        {
          params: { $select: '@microsoft.graph.downloadUrl' },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const graphDlUrl = metaResp.data['@microsoft.graph.downloadUrl'];
      if (graphDlUrl) {
        const fileResp = await axios.get(graphDlUrl, { responseType: 'arraybuffer' });
        fileBuffer = fileResp.data;
      }
    }

    if (!fileBuffer) {
      return res.status(403).json({
        error: 'Could not download the file. Either the share link is not set to "Anyone with the link can view", or Azure credentials are needed. See SETUP.md.',
        code: 'NO_ACCESS',
      });
    }

    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const projects = parseProjectRows(rows);

    res.json({ projects, sheetName, lastSync: new Date().toISOString() });
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || error.message;
    console.error(`/api/data error [${status}]:`, detail);
    res.status(status || 500).json({ error: detail, status });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Listen locally; Vercel uses the default export below
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Praeto backend running on :${PORT}`);
    console.log(`Data endpoint: GET http://localhost:${PORT}/api/data?shareUrl=<1drv.ms link>`);
  });
}

export default app;
