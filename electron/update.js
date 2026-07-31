const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const iconv = require('iconv-lite');
const StreamZip = require('node-stream-zip');

const API_BASE = process.env.SHAMELA_API_BASE || 'https://eshamila.net';
const BOOKS_API = `${API_BASE}/api/books`;
const DOWNLOAD_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const httpAgent = new https.Agent({ keepAlive: true, maxSockets: DOWNLOAD_CONCURRENCY * 2 });

function getTransport(url) {
  return url.startsWith('https:') ? https : http;
}

// Settable from main.js so paths match production userData dir
let _tmpDir = null;
let _dbPath = null;

function setPaths(tmpDir, dbPath) {
  _tmpDir = tmpDir;
  _dbPath = dbPath;
}

function getTmpDir() {
  if (!_tmpDir) _tmpDir = path.join(__dirname, '..', 'data', '.update-tmp');
  return _tmpDir;
}

function getDbPath() {
  if (!_dbPath) _dbPath = path.join(__dirname, '..', 'data', 'shamela.db');
  return _dbPath;
}

function ensureTmpDir() {
  const dir = getTmpDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirectsLeft) => {
      const isHttps = u.startsWith('https:');
      const req = getTransport(u).get(u, { headers: { 'User-Agent': 'Shamela-Modern/1.0' }, agent: isHttps ? httpAgent : undefined }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          get(new URL(res.headers.location, u).toString(), redirectsLeft - 1);
          return;
        }
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
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`Request timed out: ${url}`));
      });
    };
    get(url, 5);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const get = (u, redirectsLeft) => {
      const isHttps = u.startsWith('https:');
      const req = getTransport(u).get(u, { headers: { 'User-Agent': 'Shamela-Modern/1.0' }, agent: isHttps ? httpAgent : undefined }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          get(new URL(res.headers.location, u).toString(), redirectsLeft - 1);
          return;
        }
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
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`Download timed out: ${url}`));
      });
    };
    get(url, 5);
  });
}

function decodeCp1256(buf) {
  try { return iconv.decode(buf, 'win1256'); }
  catch (e) { return buf.toString('utf8'); }
}

async function checkForUpdates() {
  ensureTmpDir();
  const apiBooks = await fetchJson(BOOKS_API);
  const existing = new Map();
  const broken = new Set();

  try {
    const db = new Database(getDbPath(), { readonly: true });
    const rows = db.prepare(`
      SELECT b.id, b.shamela_id, b.title, b.has_content,
             (SELECT COUNT(*) FROM book_content c WHERE c.book_id = b.id) AS content_rows
      FROM books b
    `).all();
    for (const r of rows) {
      existing.set(String(r.shamela_id), r);
      if (r.has_content === 1 && r.content_rows === 1) {
        const c = db.prepare('SELECT content FROM book_content WHERE book_id = ? LIMIT 1').get(r.id);
        if (c && c.content && c.content.trim() === (r.title || '').trim()) {
          broken.add(String(r.shamela_id));
        }
      }
    }
    db.close();
  } catch (e) {
    console.log('checkForUpdates: no existing DB, will download all');
  }

  const newBooks = [];
  const updatedBooks = [];

  for (const book of apiBooks) {
    const shamId = String(book.id);
    const existingBook = existing.get(shamId);
    if (!existingBook) {
      newBooks.push(book);
    } else if (
      (String(book.update_book) === '1' && existingBook.has_content === 0) ||
      broken.has(shamId)
    ) {
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

async function downloadBookZip(book, onProgress) {
  const zipUrl = `${API_BASE}/${book.book_zip}`;
  const zipName = path.basename(book.book_zip);
  const zipPath = path.join(getTmpDir(), zipName);

  onProgress(`جاري تحميل: ${book.book_name}`);
  try {
    await downloadFile(zipUrl, zipPath);
    return zipPath;
  } catch (e) {
    onProgress(`فشل تحميل ${book.book_name}: ${e.message}`);
    return null;
  }
}

function cleanupZip(zipPath) {
  try { fs.unlinkSync(zipPath); } catch (e) {}
}

async function installBookZip(book, zipPath, writeDb, onProgress) {
  let bokFile;
  try {
    onProgress(`جاري فك: ${book.book_name}`);
    const zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const bokEntry = Object.entries(entries).find(([name]) => name.endsWith('.bok'));
    if (!bokEntry) {
      onProgress(`ملف .bok غير موجود في: ${book.book_name}`);
      await zip.close();
      return;
    }
    bokFile = path.join(getTmpDir(), bokEntry[0]);
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
    const tableNames = reader.getTableNames();
    const main = reader.getTable('Main');
    if (main.rowCount === 0) {
      onProgress(`لا توجد بيانات في: ${book.book_name}`);
      return;
    }
    const mainRows = main.getData({ columns: main.getColumnNames() });
    const row = mainRows[0];
    const bkData = Buffer.from(row.Bk || '', 'latin1');
    const betakaData = Buffer.from(row.Betaka || '', 'latin1');
    const authData = Buffer.from(row.Auth || '', 'latin1');

    const title = decodeCp1256(bkData).trim() || book.book_name;
    const authorName = decodeCp1256(authData).trim() || book.book_author;
    const description = decodeCp1256(betakaData).trim() || book.book_card;
    const shamelaId = Number(book.id);

    // eshamila.net .bok files store content in a b### table and TOC in t###
    const contentTable = tableNames
      .filter((n) => /^b\d+$/.test(n))
      .sort((a, b) => reader.getTable(b).rowCount - reader.getTable(a).rowCount)[0];
    const tocTable = tableNames.find((n) => /^t\d+$/.test(n));

    // Collect all content rows in memory first, then write in a single transaction
    const contentRows = [];
    const idToPage = new Map();

    if (contentTable) {
      const tbl = reader.getTable(contentTable);
      if (tbl.rowCount > 0) {
        const rows = tbl.getData({ columns: tbl.getColumnNames() }).slice();
        // Content is ordered by row id (physical order). The `page` column is the
        // printed page number and resets per part, so it must not be used for sorting.
        if (rows.some((r) => r.id != null)) {
          rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        }
        for (const r of rows) {
          const text = decodeCp1256(Buffer.from(r.nass || r.com || r.Bk || '', 'latin1')).trim();
          if (!text) continue;
          contentRows.push(text);
          if (r.id != null) idToPage.set(Number(r.id), contentRows.length);
        }
      }
    }

    if (contentRows.length === 0) {
      // Legacy shamela 1.x format: content in Main/Shrooh/com/abc
      for (const r of mainRows) {
        const text = decodeCp1256(Buffer.from(r.nass || r.com || r.Bk || '', 'latin1')).trim();
        if (text) contentRows.push(text);
      }
      const legacyTables = ['Shrooh', 'com', 'abc'];
      for (const tblName of legacyTables) {
        try {
          const tbl = reader.getTable(tblName);
          if (tbl.rowCount === 0) continue;
          const rows = tbl.getData({ columns: tbl.getColumnNames() });
          for (const r of rows) {
            const text = decodeCp1256(Buffer.from(r.nass || r.com || r.Bk || '', 'latin1')).trim();
            if (text) contentRows.push(text);
          }
        } catch (e) {
          // table doesn't exist or is empty
        }
      }
    }

    const tocRows = [];
    if (tocTable) {
      try {
        const tbl = reader.getTable(tocTable);
        if (tbl.rowCount > 0) {
          const rows = tbl.getData({ columns: tbl.getColumnNames() }).slice();
          rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
          for (const r of rows) {
            const tocTitle = decodeCp1256(Buffer.from(r.tit || '', 'latin1')).trim();
            if (!tocTitle) continue;
            // The TOC row id references a content row; `sub` is a section flag,
            // not a page number. Map the row id to its sequential page position.
            const page = idToPage.get(Number(r.id)) || 1;
            tocRows.push({ title: tocTitle, level: Number(r.lvl) || 1, page });
          }
        }
      } catch (e) {
        // no toc
      }
    }

    writeDb.transaction(() => {
      const catShamelaId = Number(book.speciality_id) || null;
      let categoryId = null;
      if (catShamelaId) {
        const existingCat = writeDb.prepare('SELECT id FROM categories WHERE shamela_id = ?').get(catShamelaId);
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const catInsert = writeDb.prepare('INSERT INTO categories (name, parent_id, level, order_num, shamela_id) VALUES (?, NULL, 0, 0, ?)');
          categoryId = catInsert.run(book.speciality_name || 'غير مصنف', catShamelaId).lastInsertRowid;
        }
      }

      const authorShamelaId = Number(book.author_id) || null;
      let authorId = null;
      if (authorShamelaId) {
        const existingAuth = writeDb.prepare('SELECT id FROM authors WHERE shamela_id = ?').get(authorShamelaId);
        if (existingAuth) {
          authorId = existingAuth.id;
        } else {
          const authInsert = writeDb.prepare('INSERT INTO authors (name, long_name, death_year, description, shamela_id) VALUES (?, ?, NULL, NULL, ?)');
          authorId = authInsert.run(authorName, authorName, authorShamelaId).lastInsertRowid;
        }
      }

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
        bookId = bookInsert.run(null, title, authorId, authorName, categoryId, book.speciality_name, description, shamelaId, authorShamelaId).lastInsertRowid;
      }

      writeDb.prepare('DELETE FROM book_content WHERE book_id = ?').run(bookId);
      const insertContent = writeDb.prepare(`
        INSERT INTO book_content (book_id, page, part, content) VALUES (?, ?, ?, ?)
      `);
      for (let i = 0; i < contentRows.length; i++) {
        insertContent.run(bookId, i + 1, 0, contentRows[i]);
      }

      writeDb.prepare('DELETE FROM book_toc WHERE book_id = ?').run(bookId);
      if (tocRows.length > 0) {
        const insertToc = writeDb.prepare(`
          INSERT INTO book_toc (book_id, title, level, page) VALUES (?, ?, ?, ?)
        `);
        for (const t of tocRows) {
          insertToc.run(bookId, t.title, t.level, t.page);
        }
      }
    })();

    onProgress(`تم تثبيت: ${title}`);
  } catch (e) {
    onProgress(`فشل تثبيت ${book.book_name}: ${e.message}`);
  } finally {
    if (bokFile) cleanupZip(bokFile);
  }
}

async function installBook(book, writeDb, onProgress) {
  const zipPath = await downloadBookZip(book, onProgress);
  if (!zipPath) return;
  try {
    await installBookZip(book, zipPath, writeDb, onProgress);
  } finally {
    cleanupZip(zipPath);
  }
}

async function runUpdates(booksToInstall, onProgress) {
  ensureTmpDir();
  const writeDb = new Database(getDbPath());
  writeDb.pragma('journal_mode = WAL');
  writeDb.pragma('synchronous = OFF');
  writeDb.pragma('cache_size = -64000');

  const { initSchema } = require('./dbSchema');
  initSchema(writeDb);

  const total = booksToInstall.length;
  const pendingDownloads = [];
  let cursor = 0;

  // Keep up to DOWNLOAD_CONCURRENCY downloads in flight; install as each finishes.
  const startDownloads = () => {
    while (pendingDownloads.length < DOWNLOAD_CONCURRENCY && cursor < total) {
      const book = booksToInstall[cursor++];
      pendingDownloads.push(downloadBookZip(book, onProgress).then((zipPath) => ({ book, zipPath })));
    }
  };

  for (let i = 0; i < total; i++) {
    startDownloads();
    const { book, zipPath } = await pendingDownloads.shift();
    if (zipPath) {
      try {
        await installBookZip(book, zipPath, writeDb, (msg) => {
          onProgress(msg, i, total);
        });
      } catch (e) {
        console.error(`Failed to install book ${book.book_name}:`, e);
        onProgress(`فشل: ${book.book_name}`, i, total);
      } finally {
        cleanupZip(zipPath);
      }
    } else {
      onProgress(`فشل: ${book.book_name}`, i, total);
    }
  }

  // Backfill books.pdf_path for catalog books installed in this run.
  try {
    const updated = require('./pdfCatalog').applyPdfCatalog(writeDb);
    if (updated > 0) console.log('PDF catalog applied:', updated, 'books');
  } catch (e) {
    console.error('Failed to apply PDF catalog after update:', e.message);
  }

  writeDb.close();

  try { fs.rmSync(getTmpDir(), { recursive: true, force: true }); } catch (e) {}

  onProgress('اكتمل التحديث', booksToInstall.length, booksToInstall.length);
}

module.exports = { checkForUpdates, runUpdates, installBook, setPaths, downloadFile };
