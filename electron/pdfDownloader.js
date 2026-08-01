const path = require('path');
const fs = require('fs');

let _pdfDir = null;
const pdfDownloadsInFlight = new Map();
let _running = false;
let _stopRequested = false;
let _lastRun = { downloaded: 0, failed: 0, stopped: false };

function setPdfDir(dir) {
  _pdfDir = dir;
}

function getPdfDir() {
  return _pdfDir;
}

// Canonical destination under PDF_DIR for a catalog relative path (no existence check).
function pdfDestFor(relativePath) {
  if (!relativePath) return null;
  const pdfDirResolved = path.resolve(getPdfDir());
  const normalized = String(relativePath)
    .replace(/\\/g, path.sep)
    .replace(/^Rel:/, '')
    .replace(/^pdf[/\\]/, '');
  const fullPath = path.resolve(path.join(pdfDirResolved, normalized));
  if (!fullPath.startsWith(pdfDirResolved + path.sep) && fullPath !== pdfDirResolved) return null;
  return fullPath;
}

function resolveInPdfDir(relativePath) {
  const fullPath = pdfDestFor(relativePath);
  if (fullPath && fs.existsSync(fullPath)) return fullPath;
  return null;
}

async function ensurePdfDownloaded(relativePath) {
  const entry = require('./pdfCatalog').getEntryByRel(relativePath);
  if (!entry || !entry.url) return null;

  if (pdfDownloadsInFlight.has(entry.rel)) {
    try { await pdfDownloadsInFlight.get(entry.rel); } catch (e) {}
    const existing = pdfDestFor(entry.rel);
    if (existing && fs.existsSync(existing)) return existing;
    return null;
  }

  const destPath = pdfDestFor(entry.rel);
  if (!destPath) return null;
  if (fs.existsSync(destPath)) return destPath;

  const promise = (async () => {
    try {
      const { downloadFile } = require('./update');
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const base = process.env.SHAMELA_API_BASE || 'https://eshamila.net';
      await downloadFile(`${base}/${entry.url}`, destPath);
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        try { fs.unlinkSync(destPath); } catch (e) {}
        return null;
      }
      return destPath;
    } catch (e) {
      try { fs.unlinkSync(destPath); } catch (err) {}
      console.error(`PDF download failed for ${entry.rel}:`, e.message);
      return null;
    }
  })();

  pdfDownloadsInFlight.set(entry.rel, promise);
  try {
    return await promise;
  } finally {
    pdfDownloadsInFlight.delete(entry.rel);
  }
}

// Every distinct catalog PDF file (deduped by rel).
function listCatalogFiles() {
  const { loadCatalog } = require('./pdfCatalog');
  const catalog = loadCatalog();
  const files = [];
  const seen = new Set();
  if (!catalog || !catalog.books) return files;
  for (const parts of Object.values(catalog.books)) {
    for (const p of parts) {
      if (!p || !p.rel) continue;
      if (seen.has(p.rel)) continue;
      seen.add(p.rel);
      files.push(p);
    }
  }
  return files;
}

function getState() {
  const files = listCatalogFiles();
  let cached = 0;
  for (const f of files) {
    if (resolveInPdfDir(f.rel)) cached++;
  }
  return {
    running: _running,
    total: files.length,
    cached,
    downloaded: _lastRun.downloaded,
    failed: _lastRun.failed,
    stopped: _lastRun.stopped,
  };
}

// Bulk-downloads every catalog PDF. Skips already-cached files, so it resumes
// across runs. Progress events: { type: 'start'|'progress'|'done'|'stopped', ... }.
async function downloadAll({ concurrency = 4, onProgress = () => {} } = {}) {
  if (_running) return { started: false };
  _running = true;
  _stopRequested = false;
  _lastRun = { downloaded: 0, failed: 0, stopped: false };
  const files = listCatalogFiles();
  onProgress({ type: 'start', total: files.length, downloaded: 0, failed: 0, stopped: false, current: null });

  let filesCursor = 0;
  const worker = async () => {
    while (!_stopRequested) {
      const idx = filesCursor++;
      if (idx >= files.length) break;
      const local = await ensurePdfDownloaded(files[idx].rel);
      if (local) _lastRun.downloaded++;
      else _lastRun.failed++;
      onProgress({
        type: 'progress',
        total: files.length,
        downloaded: _lastRun.downloaded,
        failed: _lastRun.failed,
        stopped: false,
        current: files[idx].rel,
      });
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  _lastRun.stopped = _stopRequested;
  _running = false;
  onProgress({
    type: _lastRun.stopped ? 'stopped' : 'done',
    total: files.length,
    downloaded: _lastRun.downloaded,
    failed: _lastRun.failed,
    stopped: _lastRun.stopped,
    current: null,
  });
  return { started: true, ..._lastRun };
}

function requestStop() {
  _stopRequested = true;
  return true;
}

module.exports = {
  setPdfDir,
  getPdfDir,
  pdfDestFor,
  resolveInPdfDir,
  ensurePdfDownloaded,
  listCatalogFiles,
  getState,
  downloadAll,
  requestStop,
};
