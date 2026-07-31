const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-catalog-test-'));
const catalogPath = path.join(tmpDir, 'pdf-catalog.json');

const FIXTURE = {
  generated: '2026-01-01T00:00:00.000Z',
  source: 'test',
  count: 3,
  books: {
    '1001276': [
      { rel: 'Rel:pdf\\مرشد الطلاب\\1001276.pdf', url: 'upload/book_pdf/1818545490037109.pdf', part: 0 },
    ],
    '1001330': [
      { rel: 'Rel:pdf\\القواعد الفقهية عند الإباضية ج 1\\1001330.pdf', url: 'upload/book_pdf/1001330-1.pdf', part: 1 },
      { rel: 'Rel:pdf\\القواعد الفقهية عند الإباضية ج 2\\1001330.pdf', url: 'upload/book_pdf/1001330-2.pdf', part: 2 },
      { rel: 'Rel:pdf\\القواعد الفقهية عند الإباضية ج 3\\1001330.pdf', url: 'upload/book_pdf/1001330-3.pdf', part: 3 },
    ],
    '2000000': [],
  },
};
fs.writeFileSync(catalogPath, JSON.stringify(FIXTURE), 'utf8');
process.env.SHAMELA_PDF_CATALOG = catalogPath;

const {
  normalizeRel,
  loadCatalog,
  getPartsForBook,
  getEntryByRel,
  getPrimaryPdfForBook,
  applyPdfCatalog,
} = require('./pdfCatalog');

test('loadCatalog parses fixture', () => {
  const catalog = loadCatalog();
  assert.equal(catalog.count, 3);
  assert.ok(catalog.books['1001276']);
});

test('normalizeRel is case-insensitive and separator-normalized', () => {
  assert.equal(normalizeRel('Rel:pdf\\كتاب\\1.PDF'), 'rel:pdf/كتاب/1.pdf');
  assert.equal(normalizeRel('  pdf/كتاب/1.pdf  '), 'pdf/كتاب/1.pdf');
});

test('getEntryByRel matches with different separator/case forms', () => {
  const entry = getEntryByRel('pdf\\مرشد الطلاب\\1001276.pdf');
  assert.ok(entry);
  assert.equal(entry.url, 'upload/book_pdf/1818545490037109.pdf');
  assert.equal(entry.idBook, '1001276');
});

test('getEntryByRel returns null for unknown rel', () => {
  assert.equal(getEntryByRel('Rel:pdf\\لا يوجد\\1.pdf'), null);
});

test('getPartsForBook returns all parts sorted by part number', () => {
  const parts = getPartsForBook('1001330');
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map((p) => p.part), [1, 2, 3]);
  assert.equal(getPartsForBook('9999999').length, 0);
  assert.equal(getPartsForBook('2000000').length, 0);
});

test('getPrimaryPdfForBook returns first part', () => {
  const primary = getPrimaryPdfForBook('1001330');
  assert.ok(primary);
  assert.equal(primary.rel, 'Rel:pdf\\القواعد الفقهية عند الإباضية ج 1\\1001330.pdf');
  assert.equal(getPrimaryPdfForBook('9999999'), null);
});

test('applyPdfCatalog sets pdf_path only for matching books', () => {
  const dbPath = path.join(tmpDir, 'test.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      title TEXT,
      shamela_id INTEGER,
      pdf_path TEXT
    );
    INSERT INTO books (id, title, shamela_id, pdf_path) VALUES
      (1, 'كتاب أ', 1001276, NULL),
      (2, 'كتاب ب', 1001330, 'old-value'),
      (3, 'كتاب ج', 7777777, NULL);
  `);

  const updated = applyPdfCatalog(db);
  assert.equal(updated, 2);

  const rowA = db.prepare('SELECT pdf_path FROM books WHERE id = 1').get();
  assert.equal(rowA.pdf_path, 'Rel:pdf\\مرشد الطلاب\\1001276.pdf');

  const rowB = db.prepare('SELECT pdf_path FROM books WHERE id = 2').get();
  assert.equal(rowB.pdf_path, 'Rel:pdf\\القواعد الفقهية عند الإباضية ج 1\\1001330.pdf');

  const rowC = db.prepare('SELECT pdf_path FROM books WHERE id = 3').get();
  assert.equal(rowC.pdf_path, null);

  // Idempotent: second run updates nothing
  assert.equal(applyPdfCatalog(db), 0);
  db.close();
});

test('applyPdfCatalog handles empty / null db safely', () => {
  assert.equal(applyPdfCatalog(null), 0);
});
