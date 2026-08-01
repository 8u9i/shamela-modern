const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-title-test-'));
const { looksLikeFileTitle, repairFilelikeTitles, setPaths } = require('./update');

function makeDb(dbPath) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      title TEXT,
      author_id INTEGER,
      author_name TEXT,
      category_id INTEGER,
      category_name TEXT,
      description TEXT,
      shamela_id INTEGER,
      author_shamela_id INTEGER,
      has_content INTEGER
    );
    CREATE TABLE books_fts (title, author_name);
    CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT, long_name TEXT, death_year INTEGER, description TEXT, shamela_id INTEGER);
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER, level INTEGER, order_num INTEGER, shamela_id INTEGER);
    CREATE TABLE book_content (id INTEGER PRIMARY KEY, book_id INTEGER, page INTEGER, part INTEGER, content TEXT);
  `);
  return db;
}

test('looksLikeFileTitle: recognizes filename-style titles', () => {
  assert.strictEqual(looksLikeFileTitle('Alsaidia_431_Modified'), true);
  assert.strictEqual(looksLikeFileTitle('Alsaidia_9_Original'), true);
  assert.strictEqual(looksLikeFileTitle('chikhkaabache_16'), true);
  assert.strictEqual(looksLikeFileTitle('book_123.zip'), true);
});

test('looksLikeFileTitle: Arabic titles are real titles', () => {
  assert.strictEqual(looksLikeFileTitle('الجواهر المنتقاة'), false);
  assert.strictEqual(looksLikeFileTitle('النية الخالصة لناصر الجهضمي'), false);
  assert.strictEqual(looksLikeFileTitle(''), false);
  assert.strictEqual(looksLikeFileTitle(null), false);
});

test('repairFilelikeTitles: fixes filename titles from the API, leaves Arabic alone', () => {
  const dbPath = path.join(tmpDir, `repair-${Date.now()}.db`);
  const db = makeDb(dbPath);
  db.prepare('INSERT INTO books (id, title, shamela_id, has_content) VALUES (1, ?, 1000183, 1)').run('Alsaidia_9_Modified');
  db.prepare('INSERT INTO books (id, title, shamela_id, has_content) VALUES (2, ?, 1001277, 1)').run('Alsaidia_396_Modified');
  db.prepare('INSERT INTO books (id, title, shamela_id, has_content) VALUES (3, ?, 1000000, 1)').run('النية الخالصة');
  db.close();

  setPaths(path.join(tmpDir, 'tmp'), dbPath);
  const apiBooks = [
    { id: '1000183', book_name: 'الجواهر المنتقاة' },
    { id: '1001277', book_name: 'رسالة العلامة جاعد بن خميس الخروصي' },
    { id: '1000000', book_name: 'النية الخالصة' },
  ];

  const repaired = repairFilelikeTitles(apiBooks);
  assert.strictEqual(repaired, 2, 'only the two filename titles are repaired');

  const check = new Database(dbPath, { readonly: true });
  const rows = check.prepare('SELECT id, title FROM books ORDER BY id').all();
  assert.strictEqual(rows[0].title, 'الجواهر المنتقاة');
  assert.strictEqual(rows[1].title, 'رسالة العلامة جاعد بن خميس الخروصي');
  assert.strictEqual(rows[2].title, 'النية الخالصة');
  check.close();
});

test('repairFilelikeTitles: idempotent and returns 0 when nothing to fix', () => {
  const dbPath = path.join(tmpDir, `repair-none-${Date.now()}.db`);
  const db = makeDb(dbPath);
  db.prepare('INSERT INTO books (id, title, shamela_id, has_content) VALUES (1, ?, 1000000, 1)').run('النية الخالصة');
  db.close();

  setPaths(path.join(tmpDir, 'tmp'), dbPath);
  const apiBooks = [{ id: '1000000', book_name: 'النية الخالصة' }];

  assert.strictEqual(repairFilelikeTitles(apiBooks), 0);
  assert.strictEqual(repairFilelikeTitles(apiBooks), 0);
});
