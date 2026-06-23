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

// GET /api/data?shareUrl=<encoded 1drv.ms link>
// The share link must be set to "Anyone with the link can view" in OneDrive.
app.get('/api/data', async (req, res) => {
  const { shareUrl } = req.query;
  if (!shareUrl) {
    return res.status(400).json({ error: 'shareUrl query param is required' });
  }

  try {
    const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodeShareUrl(shareUrl)}/driveItem/content`;
    const response = await axios.get(graphUrl, { responseType: 'arraybuffer' });

    const workbook = XLSX.read(response.data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const projects = parseProjectRows(rows);

    res.json({ projects, sheetName, lastSync: new Date().toISOString() });
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return res.status(403).json({
        error: 'Cannot access this file. Set the OneDrive share link to "Anyone with the link can view".',
        code: 'NOT_PUBLIC'
      });
    }
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: error.message });
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
