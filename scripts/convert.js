const mdb = require('mdb-reader');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const MDB = mdb.default;
const BASE = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';
const OUT = path.join(__dirname, '..', 'data', 'shamela.db');

// Duser MDB: mdb-reader decodes to correct UTF-8 — just pass through
function decodeDuser(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (Buffer.isBuffer(val)) {
    // Buffer from Duser — decode as win1256
    const s = iconv.decode(val, 'win1256');
    return s || null;
  }
  if (typeof val === 'string') {
    return val.length === 0 ? null : val;
  }
  return String(val);
}

// Books Archive MDB: mdb-reader returns mojibake (Latin-1 interpreted win1256)
function decodeContent(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (Buffer.isBuffer(val)) return iconv.decode(val, 'win1256');
  if (typeof val === 'string') {
    if (val.length === 0) return null;
    try {
      const latin1Buf = Buffer.from(val, 'latin1');
      const decoded = iconv.decode(latin1Buf, 'win1256');
      if (decoded.includes('\uFFFD') || decoded.trim() === '') return val;
      return decoded;
    } catch {
      return val;
    }
  }
  return String(val);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

const db = new Database(OUT);
db.pragma('journal_mode = WAL');
db.pragma('encoding = "UTF-8"');

console.log('Creating schema...');

db.exec(`
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
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id);
  CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_content_book ON book_content(book_id);
  CREATE INDEX IF NOT EXISTS idx_content_page ON book_content(book_id, page);
  CREATE INDEX IF NOT EXISTS idx_toc_book ON book_toc(book_id);
`);

// ============ 1. Import Duser metadata ============
console.log('Importing metadata from Duser...');
const duser = new MDB(fs.readFileSync(path.join(BASE, 'Files', 'Duser')));

// Authors
const authorRows = duser.getTable('AuthorInfo').getData();
const insertAuthor = db.prepare(`
  INSERT INTO authors (id, name, long_name, death_year, description, shamela_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertAuthors = db.transaction((rows) => {
  for (const r of rows) {
    insertAuthor.run(
      r.IdAuthor,
      decodeDuser(r.Autor_name),
      decodeDuser(r.long_name),
      decodeDuser(r.year_death),
      decodeDuser(r.author_description),
      r.IdAuthorShamela
    );
  }
});
insertAuthors(authorRows);
console.log(`  Authors: ${authorRows.length}`);

// Categories
const catRows = duser.getTable('CatInfo').getData();
const insertCat = db.prepare(`
  INSERT INTO categories (id, name, parent_id, level, order_num, shamela_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertCats = db.transaction((rows) => {
  for (const r of rows) {
    insertCat.run(
      r.IdW,
      decodeDuser(r.Name),
      r.Parent || null,
      r.Lvl,
      r.ord,
      r.IdSamela
    );
  }
});
insertCats(catRows);
console.log(`  Categories: ${catRows.length}`);

// Books
const bookRows = duser.getTable('BookInfo').getData();
const insertBook = db.prepare(`
  INSERT INTO books (id, title, author_id, author_name, category_id, category_name, description, download_url, shamela_id, author_shamela_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertBooks = db.transaction((rows) => {
  for (const r of rows) {
    insertBook.run(
      r.idBook,
      decodeDuser(r.titleBook),
      r.Id_Author,
      decodeDuser(r.AuthName),
      r.speciality_id,
      decodeDuser(r.speciality_name),
      decodeDuser(r.book_card),
      decodeDuser(r.AdressBok),
      r.IdBkSahmela,
      r.IdAuthorShamela
    );
  }
});
insertBooks(bookRows);
console.log(`  Books: ${bookRows.length}`);

// Verify encoding
const sampleBook = db.prepare('SELECT title, author_name FROM books LIMIT 3').all();
console.log('  Sample books:', sampleBook);

// PDF info
const pdfRows = duser.getTable('PdfInfo').getData();
const updatePdf = db.prepare(`UPDATE books SET pdf_path = ? WHERE id = ?`);
const updatePdfs = db.transaction((rows) => {
  for (const r of rows) {
    const pdfPath = decodeDuser(r.pathPdfFormShamela) || decodeDuser(r.PathPdf);
    if (pdfPath) {
      updatePdf.run(pdfPath, r.idBook);
    }
  }
});
updatePdfs(pdfRows);
console.log(`  PDF entries: ${pdfRows.length}`);

// ============ 2. Import book content ============
console.log('\nImporting book content...');

const shamelaToBookId = {};
for (const r of bookRows) {
  if (r.IdBkSahmela) {
    shamelaToBookId[r.IdBkSahmela] = r.idBook;
  }
}
console.log(`  Shamela ID mapping: ${Object.keys(shamelaToBookId).length} entries`);

const ARCHIVE_COUNT = 5;
let totalContentRows = 0;

const insertContent = db.prepare(`
  INSERT INTO book_content (book_id, page, part, content)
  VALUES (?, ?, ?, ?)
`);

const insertToc = db.prepare(`
  INSERT INTO book_toc (book_id, title, level, page)
  VALUES (?, ?, ?, ?)
`);

for (let vol = 1; vol <= ARCHIVE_COUNT; vol++) {
  const mdbPath = path.join(BASE, 'Books', 'Archive', `${vol}.mdb`);
  if (!fs.existsSync(mdbPath)) continue;

  console.log(`  Processing Books/Archive/${vol}.mdb...`);
  const mdbFile = new MDB(fs.readFileSync(mdbPath));
  const tables = mdbFile.getTableNames();

  const bookTables = tables.filter(t => t.startsWith('b'));
  const tocTables = tables.filter(t => t.startsWith('t'));

  const importBook = db.transaction(() => {
    for (const tname of bookTables) {
      const shamelaId = parseInt(tname.substring(1), 10);
      if (isNaN(shamelaId)) continue;

      const bookId = shamelaToBookId[shamelaId];
      if (!bookId) {
        console.log(`    Warning: No book mapping for Shamela ID ${shamelaId} (table ${tname})`);
        continue;
      }

      const table = mdbFile.getTable(tname);
      const rows = table.getData();

      db.prepare('UPDATE books SET has_content = 1 WHERE id = ?').run(bookId);

      for (const r of rows) {
        const content = decodeContent(r.nass);
        if (!content || content.trim() === '') continue;

        let page = r.page || 0;
        if (typeof page === 'string') page = parseInt(page, 10) || 0;

        let part = r.part || 0;
        if (typeof part === 'string') part = parseInt(part, 10) || 0;

        insertContent.run(bookId, page, part, content);
        totalContentRows++;
      }
    }

    for (const tname of tocTables) {
      const shamelaId = parseInt(tname.substring(1), 10);
      if (isNaN(shamelaId)) continue;

      const bookId = shamelaToBookId[shamelaId];
      if (!bookId) continue;

      const table = mdbFile.getTable(tname);
      const rows = table.getData();

      for (const r of rows) {
        insertToc.run(
          bookId,
          decodeContent(r.tit),
          r.lvl || 0,
          r.id || 0
        );
      }
    }
  });

  importBook();
  console.log(`    Done. Total content rows so far: ${totalContentRows}`);
}

// ============ 3. Build FTS index ============
console.log('\nBuilding full-text search index...');
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
    title,
    author_name,
    content='books',
    content_rowid='id'
  );

  INSERT INTO books_fts (rowid, title, author_name)
  SELECT id, title, author_name FROM books;
`);

console.log('FTS index built.');

// ============ 4. Save settings ============
const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
insertSetting.run('source_path', BASE);
insertSetting.run('pdf_path', path.join(BASE, 'pdf'));
insertSetting.run('version', '1.0.0');
insertSetting.run('book_count', String(bookRows.length));
insertSetting.run('author_count', String(authorRows.length));

// Final verification
console.log('\n=== Verification ===');
const verifyBooks = db.prepare('SELECT title, author_name FROM books ORDER BY id LIMIT 5').all();
for (const b of verifyBooks) {
  console.log(`  Book: "${b.title}" by "${b.author_name}"`);
}

const verifyContent = db.prepare('SELECT content FROM book_content LIMIT 1').get();
if (verifyContent) {
  console.log(`  Content sample: ${verifyContent.content.substring(0, 200)}`);
}

const verifyCats = db.prepare('SELECT name FROM categories ORDER BY id LIMIT 5').all();
for (const c of verifyCats) {
  console.log(`  Category: "${c.name}"`);
}

console.log(`\nConversion complete!`);
console.log(`  Output: ${OUT}`);
console.log(`  Size: ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Books: ${bookRows.length}`);
console.log(`  Authors: ${authorRows.length}`);
console.log(`  Categories: ${catRows.length}`);
console.log(`  Content rows: ${totalContentRows}`);

db.close();
