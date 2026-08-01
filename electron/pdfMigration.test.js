const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { migrateLegacyPdfDir } = require('./pdfMigration');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pdfmig-'));
}

function writeTree(root, files) {
  for (const rel of files) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'x');
  }
}

function listTree(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(root, full).replace(/\\/g, '/'));
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out.sort();
}

test('migrateLegacyPdfDir moves legacy pdf folder into data dir (rename fast path)', () => {
  const tmp = makeTmp();
  const oldDir = path.join(tmp, 'pdf');
  const dataDir = path.join(tmp, 'data');
  writeTree(oldDir, ['a.pdf', 'sub/b.pdf']);
  const newDir = path.join(dataDir, 'pdf');

  const result = migrateLegacyPdfDir(oldDir, newDir);

  assert.strictEqual(result, newDir);
  assert.ok(fs.existsSync(newDir));
  assert.ok(!fs.existsSync(oldDir));
  assert.deepStrictEqual(listTree(newDir), ['a.pdf', 'sub/b.pdf']);
});

test('migrateLegacyPdfDir merges into an existing data/pdf without losing files', () => {
  const tmp = makeTmp();
  const oldDir = path.join(tmp, 'pdf');
  const newDir = path.join(tmp, 'data', 'pdf');
  writeTree(oldDir, ['a.pdf', 'b.pdf']);
  writeTree(newDir, ['a.pdf', 'c.pdf']);

  const result = migrateLegacyPdfDir(oldDir, newDir);

  assert.strictEqual(result, newDir);
  assert.ok(!fs.existsSync(oldDir));
  assert.deepStrictEqual(listTree(newDir), ['a.pdf', 'b.pdf', 'c.pdf']);
});

test('migrateLegacyPdfDir returns null when there is nothing to migrate', () => {
  const tmp = makeTmp();
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const result = migrateLegacyPdfDir(path.join(tmp, 'pdf'), path.join(dataDir, 'pdf'));
  assert.strictEqual(result, null);
});

test('migrateLegacyPdfDir is a no-op when oldDir equals newDir', () => {
  const tmp = makeTmp();
  fs.mkdirSync(tmp, { recursive: true });
  const result = migrateLegacyPdfDir(tmp, tmp);
  assert.strictEqual(result, null);
});
