const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY,
    name TEXT,
    long_name TEXT,
    death_year TEXT,
    description TEXT,
    shamela_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT,
    parent_id INTEGER,
    level INTEGER,
    order_num INTEGER,
    shamela_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author_id INTEGER,
    author_name TEXT,
    category_id INTEGER,
    category_name TEXT,
    description TEXT,
    download_url TEXT,
    shamela_id INTEGER,
    author_shamela_id INTEGER,
    pdf_path TEXT,
    has_content INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS book_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    page INTEGER,
    part INTEGER,
    content TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS book_toc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    title TEXT,
    level INTEGER,
    page INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id);
  CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_content_book ON book_content(book_id);
  CREATE INDEX IF NOT EXISTS idx_content_page ON book_content(book_id, page);
  CREATE INDEX IF NOT EXISTS idx_toc_book ON book_toc(book_id);
`;

const FTS_SQL = `
  CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
    title,
    author_name,
    content='books',
    content_rowid='id'
  );

  INSERT INTO books_fts (rowid, title, author_name)
  SELECT id, title, author_name FROM books WHERE id NOT IN (SELECT rowid FROM books_fts);
`;

function initSchema(db) {
  db.exec(SCHEMA_SQL);
}

function rebuildFts(db) {
  try {
    db.exec(FTS_SQL);
  } catch (e) {
    console.error('FTS rebuild error:', e.message);
  }
}

module.exports = { initSchema, SCHEMA_SQL, FTS_SQL, rebuildFts };
