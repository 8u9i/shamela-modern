const { normalizeForSearch } = require('./arabicNormalize');

const CONTENT_FTS_SQL = `
  CREATE VIRTUAL TABLE IF NOT EXISTS book_content_fts USING fts5(
    book_id,
    page,
    content_norm,
    tokenize='unicode61 remove_diacritics 1'
  );
`;

// books_fts is a NORMAL (not external-content) FTS5 table storing normalized
// title/author so Arabic queries match regardless of diacritics/hamza/spelling.
// Existing installs may have the legacy external-content table, which is
// incompatible (full scans read the content table, DELETE corrupts it): detect
// and migrate.
const BOOKS_FTS_SQL = `
  CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
    title,
    author_name
  );
`;

// Creates both FTS tables if missing and syncs the books title/author index.
// Safe to call on every startup and before update runs.
function ensureSearchIndex(db) {
  if (!db) return;
  try {
    const def = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='books_fts'").get();
    if (def && def.sql.includes("content='books'")) {
      db.exec('DROP TABLE books_fts');
    }
    db.exec(BOOKS_FTS_SQL);
    if (countRows(db, 'books') !== countRows(db, 'books_fts')) {
      db.prepare('DELETE FROM books_fts').run();
      const rows = db
        .prepare('SELECT id, title, author_name FROM books')
        .all();
      const insert = db.prepare('INSERT INTO books_fts (rowid, title, author_name) VALUES (?, ?, ?)');
      const tx = db.transaction(() => {
        for (const r of rows) {
          insert.run(r.id, normalizeForSearch(r.title), normalizeForSearch(r.author_name));
        }
      });
      tx();
    }
  } catch (e) {
    console.error('books_fts sync failed:', e.message);
  }
  try {
    db.exec(CONTENT_FTS_SQL);
  } catch (e) {
    console.error('book_content_fts create failed:', e.message);
  }
}

function countRows(db, table) {
  try {
    return db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
  } catch (e) {
    return 0;
  }
}

// True when the content index lags behind book_content (new books installed,
// legacy DB, or a failed partial rebuild).
function needsContentRebuild(db) {
  return countRows(db, 'book_content') !== countRows(db, 'book_content_fts');
}

// Replaces the whole content index with one batch of rows after `afterId`.
// Returns { done, total, lastId } or null when the index is already complete.
function buildContentFtsStep(db, { batchSize = 25000, afterId = 0 } = {}) {
  const total = countRows(db, 'book_content');
  if (total === 0) return { done: 0, total: 0, lastId: 0 };
  const rows = db
    .prepare('SELECT id, book_id, page, content FROM book_content WHERE id > ? ORDER BY id LIMIT ?')
    .all(afterId, batchSize);
  if (rows.length === 0) return { done: total, total, lastId: afterId };
  const insert = db.prepare(
    'INSERT INTO book_content_fts (rowid, book_id, page, content_norm) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const r of rows) {
      insert.run(r.id, r.book_id, r.page, normalizeForSearch(r.content));
    }
  });
  tx();
  const done = Math.min(countRows(db, 'book_content_fts'), total);
  return { done, total, lastId: rows[rows.length - 1].id };
}

// Used by update.js inside the same transaction as book_content: re-indexes one
// book. rows: [{ id, content }] where id is the book_content rowid.
function indexBookContent(db, bookId, rows) {
  if (!db || !bookId || !rows) return;
  db.prepare('DELETE FROM book_content_fts WHERE book_id = ?').run(bookId);
  const insert = db.prepare(
    'INSERT INTO book_content_fts (rowid, book_id, page, content_norm) VALUES (?, ?, ?, ?)'
  );
  for (let i = 0; i < rows.length; i++) {
    insert.run(rows[i].id, bookId, i + 1, normalizeForSearch(rows[i].content));
  }
}

// Wipes the content index before a full rebuild. DROP + recreate instead of
// DELETE: a full DELETE over an FTS5 index walks every segment and is far
// slower than dropping the shadow tables.
function resetContentFts(db) {
  db.exec('DROP TABLE IF EXISTS book_content_fts');
  db.exec(CONTENT_FTS_SQL);
}

module.exports = {
  ensureSearchIndex,
  needsContentRebuild,
  buildContentFtsStep,
  indexBookContent,
  resetContentFts,
};
