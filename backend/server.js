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

// The tab id (gid) is permanent for that tab's lifetime — unaffected by
// renaming or reordering. Present in the URL whenever a specific tab is open,
// e.g. .../edit#gid=204675008
function extractGid(input) {
  const s = String(input || '');
  const m = s.match(/[#&?]gid=(\d+)/);
  return m ? m[1] : null;
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
    const gid = extractGid(sheetId);
    const sheets = getSheetsClient();

    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const allTabs = meta.data.sheets || [];

    let target;
    if (gid !== null) {
      target = allTabs.find(s => String(s.properties.sheetId) === gid);
      if (!target) {
        return res.status(404).json({
          error: `That tab (gid=${gid}) no longer exists in this spreadsheet — it may have been deleted. This spreadsheet has ${allTabs.length} tab(s).`,
          code: 'TAB_NOT_FOUND',
          tabCount: allTabs.length,
        });
      }
    } else {
      // No gid in the stored link — fall back to the first tab (legacy behavior).
      target = allTabs[0];
    }

    const sheetTitle = target.properties.title;
    const tabIndex = target.properties.index + 1; // 1-based, for display

    const valuesResp = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: sheetTitle,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    // No parsing here — the frontend auto-detects headers and lets the user
    // map columns, so any sheet layout works, not just one fixed schema.
    const rows = valuesResp.data.values || [];

    res.json({
      rows,
      sheetName: sheetTitle,
      tabIndex,
      tabCount: allTabs.length,
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
