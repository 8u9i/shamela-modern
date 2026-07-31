const path = require('path');
const fs = require('fs');

let _catalog = null;
let _byRel = null;
let _error = null;

function getCatalogPath() {
  if (process.env.SHAMELA_PDF_CATALOG) return process.env.SHAMELA_PDF_CATALOG;
  if (process.env.NODE_ENV !== 'development' && process.resourcesPath) {
    return path.join(process.resourcesPath, 'pdf-catalog.json');
  }
  return path.join(__dirname, '..', 'resources', 'pdf-catalog.json');
}

function loadCatalog() {
  if (_catalog) return _catalog;
  try {
    const raw = fs.readFileSync(getCatalogPath(), 'utf8');
    _catalog = JSON.parse(raw);
    _byRel = new Map();
    for (const [idBook, parts] of Object.entries(_catalog.books || {})) {
      for (const p of parts) {
        if (p && p.rel) {
          const normalized = normalizeRel(p.rel);
          const entry = { idBook, ...p };
          _byRel.set(normalized, entry);
          _byRel.set(normalized.replace(/^rel:/, ''), entry);
        }
      }
    }
  } catch (e) {
    _error = e;
    _catalog = null;
    _byRel = new Map();
    console.error('PDF catalog load failed:', e.message);
  }
  return _catalog;
}

function normalizeRel(rel) {
  return String(rel || '').trim().replace(/\\/g, '/').toLowerCase();
}

function getPartsForBook(idBook) {
  loadCatalog();
  if (!_catalog || !_catalog.books) return [];
  return _catalog.books[String(idBook)] || [];
}

function getEntryByRel(rel) {
  loadCatalog();
  if (!_byRel) return null;
  return _byRel.get(normalizeRel(rel)) || null;
}

function getPrimaryPdfForBook(idBook) {
  const parts = getPartsForBook(idBook);
  if (parts.length === 0) return null;
  return parts[0];
}

// Sets books.pdf_path (primary part) for every catalog book already present.
// Idempotent; call after schema init and after runUpdates.
function applyPdfCatalog(db) {
  if (!db) return 0;
  loadCatalog();
  if (!_catalog || !_catalog.books) return 0;
  const update = db.prepare('UPDATE books SET pdf_path = ? WHERE shamela_id = ? AND (pdf_path IS NULL OR pdf_path != ?)');
  let updated = 0;
  const tx = db.transaction(() => {
    for (const [idBook, parts] of Object.entries(_catalog.books)) {
      if (!parts || parts.length === 0) continue;
      const primary = parts[0];
      if (!primary || !primary.rel) continue;
      const result = update.run(primary.rel, Number(idBook) || idBook, primary.rel);
      updated += result.changes;
    }
  });
  tx();
  return updated;
}

module.exports = {
  loadCatalog,
  getCatalogPath,
  getPartsForBook,
  getEntryByRel,
  getPrimaryPdfForBook,
  applyPdfCatalog,
  normalizeRel,
};
