const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const iconv = require('iconv-lite');
const StreamZip = require('node-stream-zip');

const API_BASE = 'https://eshamila.net';
const BOOKS_API = `${API_BASE}/api/books`;
const TMP_DIR = path.join(__dirname, '..', 'data', '.update-tmp');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Shamela-Modern/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'Shamela-Modern/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function decodeCp1256(buf) {
  try { return iconv.decode(buf, 'win1256'); }
  catch (e) { return buf.toString('utf8'); }
}

async function checkForUpdates() {
  ensureTmpDir();
  const apiBooks = await fetchJson(BOOKS_API);
  const db = new Database(path.join(__dirname, '..', 'data', 'shamela.db'), { readonly: true });

  const existing = new Map();
  const rows = db.prepare('SELECT id, shamela_id, title, has_content FROM books').all();
  for (const r of rows) {
    existing.set(String(r.id), r);
  }
  db.close();

  const newBooks = [];
  const updatedBooks = [];

  for (const book of apiBooks) {
    const shamId = String(book.id);
    const existingBook = existing.get(shamId);
    if (!existingBook) {
      newBooks.push(book);
    } else if (String(book.update_book) === '1' && existingBook.has_content === 0) {
      updatedBooks.push(book);
    }
  }

  return {
    total: apiBooks.length,
    local: existing.size,
    newCount: newBooks.length,
    updateCount: updatedBooks.length,
    newBooks,
    updatedBooks,
  };
}

async function installBook(book, writeDb, onProgress) {
  const zipUrl = `${API_BASE}/${book.book_zip}`;
  const zipName = path.basename(book.book_zip);
  const zipPath = path.join(TMP_DIR, zipName);

  onProgress(`جاري تحميل: ${book.book_name}`);
  try {
    await downloadFile(zipUrl, zipPath);
  } catch (e) {
    onProgress(`فشل تحميل ${book.book_name}: ${e.message}`);
    return;
  }

  onProgress(`جاري فك: ${book.book_name}`);
  let bokFile;
  try {
    const zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const bokEntry = Object.entries(entries).find(([name]) => name.endsWith('.bok'));
    if (!bokEntry) {
      onProgress(`ملف .bok غير موجود في: ${book.book_name}`);
      await zip.close();
      return;
    }
    bokFile = path.join(TMP_DIR, bokEntry[0]);
    await zip.extract(bokEntry[0], bokFile);
    await zip.close();
  } catch (e) {
    onProgress(`فشل فك ${book.book_name}: ${e.message}`);
    return;
  }

  onProgress(`جاري تثبيت: ${book.book_name}`);
  try {
    const { default: MDBReader } = await import('mdb-reader');
    const buffer = fs.readFileSync(bokFile);
    const reader = new MDBReader(buffer);
    const main = reader.getTable('Main');
    if (main.rowCount === 0) {
      onProgress(`لا توجد بيانات في: ${book.book_name}`);
      return;
    }
    const row = main.getData({ columns: main.getColumnNames() })[0];
    const bkData = Buffer.from(row.Bk || '', 'latin1');
    const betakaData = Buffer.from(row.Betaka || '', 'latin1');
    const authData = Buffer.from(row.Auth || '', 'latin1');

    const title = decodeCp1256(bkData).trim() || book.book_name;
    const authorName = decodeCp1256(authData).trim() || book.book_author;
    const description = decodeCp1256(betakaData).trim() || book.book_card;
    const shamelaId = Number(book.id);

    // Upsert category
    const catShamelaId = Number(book.speciality_id) || null;
    let categoryId = null;
    if (catShamelaId) {
      const existingCat = writeDb.prepare('SELECT id FROM categories WHERE shamela_id = ?').get(catShamelaId);
      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const catInsert = writeDb.prepare('INSERT INTO categories (name, parent_id, level, order_num, shamela_id) VALUES (?, NULL, 0, 0, ?)');
        const result = catInsert.run(book.speciality_name || 'غير مصنف', catShamelaId);
        categoryId = result.lastInsertRowid;
      }
    }

    // Upsert author
    const authorShamelaId = Number(book.author_id) || null;
    let authorId = null;
    if (authorShamelaId) {
      const existingAuth = writeDb.prepare('SELECT id FROM authors WHERE shamela_id = ?').get(authorShamelaId);
      if (existingAuth) {
        authorId = existingAuth.id;
      } else {
        const authInsert = writeDb.prepare('INSERT INTO authors (name, long_name, death_year, description, shamela_id) VALUES (?, ?, NULL, NULL, ?)');
        const result = authInsert.run(authorName, authorName, authorShamelaId);
        authorId = result.lastInsertRowid;
      }
    }

    // Upsert book
    const existingBook = writeDb.prepare('SELECT id FROM books WHERE shamela_id = ?').get(shamelaId);
    let bookId;
    if (existingBook) {
      bookId = existingBook.id;
      writeDb.prepare(`
        UPDATE books SET title=?, author_id=?, author_name=?, category_id=?, category_name=?, description=?, has_content=1
        WHERE id=?
      `).run(title, authorId, authorName, categoryId, book.speciality_name, description, bookId);
    } else {
      const bookInsert = writeDb.prepare(`
        INSERT INTO books (id, title, author_id, author_name, category_id, category_name, description, shamela_id, author_shamela_id, has_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      const result = bookInsert.run(null, title, authorId, authorName, categoryId, book.speciality_name, description, shamelaId, authorShamelaId);
      bookId = result.lastInsertRowid;
    }

    // Insert book content (page by page)
    const contentTables = ['Main', 'Shrooh', 'com', 'abc'];
    let pageNum = 1;
    const deleteContent = writeDb.prepare('DELETE FROM book_content WHERE book_id = ?');
    deleteContent.run(bookId);
    const insertContent = writeDb.prepare(`
      INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)
    `);

    for (const tblName of contentTables) {
      try {
        const tbl = reader.getTable(tblName);
        if (tbl.rowCount === 0) continue;
        const rows = tbl.getData({ columns: tbl.getColumnNames() });
        for (const r of rows) {
          const textBuf = Buffer.from(r.nass || r.com || r.Bk || '', 'latin1');
          const text = decodeCp1256(textBuf).trim();
          if (text) {
            insertContent.run(bookId, pageNum++, 0, text);
          }
        }
      } catch (e) {
        // table doesn't exist or is empty
      }
    }

    onProgress(`تم تثبيت: ${title}`);
  } catch (e) {
    onProgress(`فشل تثبيت ${book.book_name}: ${e.message}`);
  } finally {
    if (bokFile) {
      try { fs.unlinkSync(bokFile); } catch (e) {}
    }
    try { fs.unlinkSync(zipPath); } catch (e) {}
  }
}

async function runUpdates(booksToInstall, onProgress) {
  ensureTmpDir();
  const writeDbPath = path.join(__dirname, '..', 'data', 'shamela.db');
  const writeDb = new Database(writeDbPath);
  writeDb.pragma('journal_mode = WAL');
  writeDb.pragma('synchronous = OFF');

  for (let i = 0; i < booksToInstall.length; i++) {
    const book = booksToInstall[i];
    onProgress(`جاري تحميل وتثبيت: ${book.book_name} (${i + 1}/${booksToInstall.length})`, i, booksToInstall.length);
    try {
      await installBook(book, writeDb, (msg) => {
        onProgress(msg, i, booksToInstall.length);
      });
    } catch (e) {
      console.error(`Failed to install book ${book.book_name}:`, e);
      onProgress(`فشل: ${book.book_name}`, i, booksToInstall.length);
    }
  }

  writeDb.close();

  // Cleanup temp
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}

  onProgress('اكتمل التحديث', booksToInstall.length, booksToInstall.length);
}

module.exports = { checkForUpdates, runUpdates, installBook };
