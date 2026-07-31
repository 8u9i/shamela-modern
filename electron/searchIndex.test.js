const { test } = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');

const {
  ensureSearchIndex,
  needsContentRebuild,
  buildContentFtsStep,
  indexBookContent,
  resetContentFts,
} = require('./searchIndex');
const { toFtsQuery } = require('./arabicNormalize');

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author_name TEXT,
      shamela_id INTEGER
    );
    CREATE TABLE book_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      page INTEGER,
      part INTEGER,
      content TEXT
    );
  `);
  db.prepare('INSERT INTO books (id, title, author_name, shamela_id) VALUES (?, ?, ?, ?)')
    .run(1, 'سيرة النبي', 'ابن كثير', 1001);
  return db;
}

test('ensureSearchIndex creates both FTS tables and syncs books_fts', () => {
  const db = makeDb();
  ensureSearchIndex(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'").all();
  const names = tables.map((t) => t.name);
  assert.ok(names.includes('books_fts'));
  assert.ok(names.includes('book_content_fts'));

  const match = db.prepare('SELECT rowid FROM books_fts WHERE books_fts MATCH ?').get(toFtsQuery('سيرة'));
  assert.equal(match.rowid, 1);
  db.close();
});

test('indexBookContent indexes a book and MATCH finds normalized terms', () => {
  const db = makeDb();
  ensureSearchIndex(db);
  db.prepare('INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)')
    .run(1, 1, 0, 'مَازِنُ بْنُ مَرْحَبٍ كانَ رَجُلاً صادِقاً');
  db.prepare('INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)')
    .run(1, 2, 0, 'ثُمَّ خَرَجَ أَحْمَدُ مِنَ البيتِ');

  const ftsRows = db.prepare('SELECT id FROM book_content').all();
  const contentRows = db.prepare('SELECT id, content FROM book_content').all();
  indexBookContent(db, 1, contentRows);

  const q = toFtsQuery('مازن رجل');
  assert.equal(q, '"مازن" "رجل"*');
  const results = db.prepare(`
    SELECT bc.id, bc.page
    FROM book_content_fts
    JOIN book_content bc ON bc.id = book_content_fts.rowid
    WHERE book_content_fts MATCH ?
  `).all(q);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, ftsRows[0].id);

  // Hamza/diacritics-insensitive match
  const q2 = toFtsQuery('أحمد البيت');
  const results2 = db.prepare(`
    SELECT bc.id FROM book_content_fts
    JOIN book_content bc ON bc.id = book_content_fts.rowid
    WHERE book_content_fts MATCH ?
  `).all(q2);
  assert.equal(results2.length, 1);
  db.close();
});

test('snippet returns marked-up normalized text', () => {
  const db = makeDb();
  ensureSearchIndex(db);
  db.prepare('INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)')
    .run(1, 1, 0, 'قالَ اللهُ تَعالى في كِتابِهِ العَزيزِ وَكَذلِكَ جَزاءُ المُحْسِنينَ');
  const contentRows = db.prepare('SELECT id, content FROM book_content').all();
  indexBookContent(db, 1, contentRows);

  const row = db.prepare(`
    SELECT snippet(book_content_fts, 2, '<mark>', '</mark>', '...', 40) as snippet
    FROM book_content_fts
    WHERE book_content_fts MATCH ?
  `).get(toFtsQuery('المحسنين'));
  assert.ok(row);
  assert.ok(row.snippet.includes('<mark>'));
  db.close();
});

test('needsContentRebuild detects mismatch after manual insert', () => {
  const db = makeDb();
  ensureSearchIndex(db);
  assert.equal(needsContentRebuild(db), false);
  db.prepare('INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)')
    .run(1, 1, 0, 'نص جديد');
  assert.equal(needsContentRebuild(db), true);

  buildContentFtsStep(db, { batchSize: 100 });
  assert.equal(needsContentRebuild(db), false);

  // reset wipes the index -> mismatch again
  resetContentFts(db);
  assert.equal(needsContentRebuild(db), true);
  db.close();
});

test('buildContentFtsStep processes in batches and preserves rowids', () => {
  const db = makeDb();
  ensureSearchIndex(db);
  const insert = db.prepare('INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)');
  for (let i = 1; i <= 5; i++) insert.run(1, i, 0, `صفحة ${i} محتوى`);
  resetContentFts(db);

  const first = buildContentFtsStep(db, { batchSize: 2 });
  assert.ok(first.done < first.total);

  let afterId = first.lastId;
  for (;;) {
    const res = buildContentFtsStep(db, { batchSize: 2, afterId });
    if (!res || res.done >= res.total) break;
    afterId = res.lastId;
  }
  assert.equal(needsContentRebuild(db), false);
  const rowids = db.prepare('SELECT rowid FROM book_content_fts ORDER BY rowid').all();
  assert.deepEqual(rowids.map((r) => r.rowid), [1, 2, 3, 4, 5]);
  db.close();
});

test('searchIndex helpers tolerate empty DB', () => {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_name TEXT);');
  db.exec('CREATE TABLE book_content (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER, page INTEGER, part INTEGER, content TEXT);');
  ensureSearchIndex(db);
  assert.equal(needsContentRebuild(db), false);
  indexBookContent(db, 1, []);
  const res = buildContentFtsStep(db, { batchSize: 100 });
  assert.deepEqual(res, { done: 0, total: 0, lastId: 0 });
  db.close();
});
