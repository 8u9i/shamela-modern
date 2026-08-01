const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-downloader-test-'));
const pdfDir = path.join(tmpDir, 'pdf');
const catalogPath = path.join(tmpDir, 'pdf-catalog.json');

const FIXTURE = {
  count: 4,
  books: {
    '1001276': [{ rel: 'Rel:pdf\\مرشد الطلاب\\1001276.pdf', url: 'files/a.pdf', part: 0 }],
    '1001330': [
      { rel: 'Rel:pdf\\القواعد ج 1\\1001330.pdf', url: 'files/b1.pdf', part: 1 },
      { rel: 'Rel:pdf\\القواعد ج 2\\1001330.pdf', url: 'files/b2.pdf', part: 2 },
      { rel: 'Rel:pdf\\القواعد ج 3\\1001330.pdf', url: 'files/b3.pdf', part: 3 },
    ],
    '2000000': [],
  },
};
fs.writeFileSync(catalogPath, JSON.stringify(FIXTURE), 'utf8');
process.env.SHAMELA_PDF_CATALOG = catalogPath;

const PDF_BYTES = Buffer.from('%PDF-1.4 test pdf payload');
let server;

test('setup local http server', async () => {
  server = http.createServer((req, res) => {
    if (req.url && req.url.endsWith('.pdf')) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end(PDF_BYTES);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.SHAMELA_API_BASE = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  if (server) server.close();
});

const downloader = require('./pdfDownloader');
downloader.setPdfDir(pdfDir);

test('pdfDestFor normalizes rel and joins under pdfDir', () => {
  assert.equal(
    downloader.pdfDestFor('Rel:pdf\\مرشد الطلاب\\1001276.pdf'),
    path.join(pdfDir, 'مرشد الطلاب', '1001276.pdf')
  );
  assert.equal(downloader.pdfDestFor('pdf/القواعد ج 1/1001330.pdf'), path.join(pdfDir, 'القواعد ج 1', '1001330.pdf'));
});

test('pdfDestFor rejects traversal outside pdfDir', () => {
  assert.equal(downloader.pdfDestFor('..\\..\\evil.pdf'), null);
  assert.equal(downloader.pdfDestFor('Rel:pdf\\..\\..\\evil.pdf'), null);
  assert.equal(downloader.pdfDestFor(''), null);
  assert.equal(downloader.pdfDestFor(null), null);
});

test('listCatalogFiles dedupes by rel and includes all parts', () => {
  const files = downloader.listCatalogFiles();
  assert.equal(files.length, 4);
  const rels = files.map((f) => f.rel).sort();
  assert.ok(rels.includes('Rel:pdf\\مرشد الطلاب\\1001276.pdf'));
  assert.ok(rels.includes('Rel:pdf\\القواعد ج 3\\1001330.pdf'));
});

test('resolveInPdfDir returns null for missing and path for existing', () => {
  assert.equal(downloader.resolveInPdfDir('Rel:pdf\\مرشد الطلاب\\1001276.pdf'), null);
  const dest = path.join(pdfDir, 'مرشد الطلاب', '1001276.pdf');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, PDF_BYTES);
  assert.equal(downloader.resolveInPdfDir('Rel:pdf\\مرشد الطلاب\\1001276.pdf'), dest);
});

test('getState reports total and cached counts', () => {
  const state = downloader.getState();
  assert.equal(state.total, 4);
  assert.equal(state.cached, 1);
  assert.equal(state.running, false);
});

test('downloadAll downloads every catalog PDF with progress events', async () => {
  const events = [];
  const result = await downloader.downloadAll({ concurrency: 2, onProgress: (p) => events.push(p) });

  assert.equal(result.started, true);
  assert.equal(result.stopped, false);
  assert.equal(result.failed, 0);
  assert.equal(result.downloaded, 4);

  for (const f of downloader.listCatalogFiles()) {
    const local = downloader.resolveInPdfDir(f.rel);
    assert.ok(local, `missing ${f.rel}`);
    assert.ok(fs.statSync(local).size > 0);
  }

  assert.equal(events[0].type, 'start');
  assert.equal(events[0].total, 4);
  assert.equal(events[events.length - 1].type, 'done');
  assert.equal(events[events.length - 1].downloaded, 4);
  assert.ok(events.some((e) => e.type === 'progress'));
});

test('downloadAll is resumable: cached files are not re-downloaded', async () => {
  const events = [];
  const result = await downloader.downloadAll({ concurrency: 4, onProgress: (p) => events.push(p) });
  assert.equal(result.downloaded, 4);
  assert.equal(result.failed, 0);
  assert.equal(events[events.length - 1].type, 'done');
  assert.equal(downloader.getState().cached, 4);
});

test('downloadAll does not start twice while running', async () => {
  const slow = downloader.downloadAll({ concurrency: 4, onProgress: () => {} });
  const again = await downloader.downloadAll({ onProgress: () => {} });
  assert.equal(again.started, false);
  await slow;
});
