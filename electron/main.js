const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const autoUpdater = require('./autoUpdater');

let mainWindow;
let db;
let userDb;
let servicesDb;

const isDev = process.env.NODE_ENV === 'development';
const appRoot = path.join(__dirname, '..');

// Local PDF library (dev: the desktop install next to the repo; prod: a writable
// download cache under userData). Overridable for tests.
function getPdfDir() {
  if (process.env.SHAMELA_PDF_DIR) return process.env.SHAMELA_PDF_DIR;
  return isDev
    ? path.join(appRoot, '..', 'eshamila.net', 'pdf')
    : path.join(app.getPath('userData'), 'pdf');
}

const resourcesPath = process.resourcesPath || '';
const packagedDb = path.join(resourcesPath, 'shamela.db');
const usePackaged = resourcesPath ? fs.existsSync(packagedDb) : false;

console.log('PDF_DIR:', getPdfDir());
console.log('  usePackaged:', usePackaged);

protocol.registerSchemesAsPrivileged([
  { scheme: 'shamela-pdf', privileges: { standard: true, supportFetchAPI: true, byPassCSP: true, stream: true } },
]);

function getDataDir() {
  return isDev
    ? path.join(appRoot, 'data')
    : path.join(app.getPath('userData'), 'data');
}

function getDbPath() { return path.join(getDataDir(), 'shamela.db'); }
function getUserDbPath() { return path.join(getDataDir(), 'userdata.db'); }

function openDatabase() {
  try {
    const dbPath = usePackaged ? packagedDb : getDbPath();
    let exists = fs.existsSync(dbPath);
    if (!exists) {
      const dir = getDataDir();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    const database = new Database(dbPath);
    database.pragma('journal_mode = WAL');
    if (!exists) {
      const { initSchema, rebuildFts } = require('./dbSchema');
      console.log('Initializing database schema...');
      initSchema(database);
    }
    return database;
  } catch (e) {
    console.error('Failed to open main database:', e);
    return null;
  }
}

function openServicesDatabase() {
  const dbPath = usePackaged ? packagedDb : getDbPath();
  if (!fs.existsSync(dbPath)) return null;
  try {
    const database = new Database(dbPath, { readonly: false });
    database.pragma('journal_mode = WAL');
    return database;
  } catch (e) {
    console.error('Failed to open services database:', e);
    return null;
  }
}

function openUserDatabase() {
  try {
    const database = new Database(getUserDbPath());
    database.pragma('journal_mode = WAL');
    database.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      author_name TEXT,
      page INTEGER DEFAULT 0,
      visited_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      author_name TEXT,
      page INTEGER DEFAULT 0,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      page INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
    return database;
  } catch (e) {
    console.error('Failed to open user database:', e);
    return null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'المكتبة الشاملة',
    backgroundColor: '#07130e',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============ IPC Handlers ============

ipcMain.handle('db:getStats', () => {
  if (!db) return null;
  const books = db.prepare('SELECT COUNT(*) as count FROM books').get();
  const authors = db.prepare('SELECT COUNT(*) as count FROM authors').get();
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  const withContent = db.prepare('SELECT COUNT(*) as count FROM books WHERE has_content = 1').get();
  return {
    books: books.count,
    authors: authors.count,
    categories: categories.count,
    withContent: withContent.count,
  };
});

ipcMain.handle('db:getCategories', () => {
  if (!db) return [];
  return db.prepare('SELECT * FROM categories ORDER BY level, order_num, name').all();
});

function getSectionChildIds(categoryId) {
  if (!db) return [categoryId];
  const cat = db.prepare('SELECT level, order_num FROM categories WHERE id = ?').get(categoryId);
  if (!cat) return [categoryId];
  if (cat.level === 1) {
    // Level 1 (50074): return level-2 sub-sections (recursion will expand each to level-3)
    return db.prepare('SELECT id FROM categories WHERE level = 2 ORDER BY order_num').all().map(c => c.id);
  }
  if (cat.level === 2) {
    // Level 2: return level-3 children within this section's order_num range
    const next = db.prepare('SELECT order_num FROM categories WHERE level = 2 AND order_num > ? ORDER BY order_num LIMIT 1').get(cat.order_num);
    const endOrder = next ? next.order_num : 999999;
    const children = db.prepare('SELECT id FROM categories WHERE level = 3 AND order_num > ? AND order_num < ? ORDER BY order_num').all(cat.order_num, endOrder);
    return children.map(c => c.id);
  }
  return [categoryId];
}

ipcMain.handle('db:getBooks', (event, { categoryId, authorId, search, page = 0, limit = 50 }) => {
  if (!db) return { books: [], total: 0 };

  let where = [];
  let params = [];

  if (categoryId) {
    const catIds = [];
    const queue = [categoryId];
    const seen = new Set();
    while (queue.length > 0) {
      const id = queue.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      catIds.push(id);
      const childIds = getSectionChildIds(id);
      for (const childId of childIds) {
        if (!seen.has(childId)) queue.push(childId);
      }
    }
    where.push('category_id IN (' + catIds.map(() => '?').join(',') + ')');
    params.push(...catIds);
  }
  if (authorId) {
    where.push('author_id = ?');
    params.push(authorId);
  }
  if (search) {
    where.push('id IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ?)');
    params.push(search);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM books ${whereClause}`).get(...params).count;
  const books = db.prepare(`SELECT * FROM books ${whereClause} ORDER BY title LIMIT ? OFFSET ?`).all(...params, limit, page * limit);

  return { books, total, page, limit };
});

ipcMain.handle('db:getBook', (event, bookId) => {
  if (!db) return null;
  return db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
});

ipcMain.handle('db:getBookContent', (event, { bookId, page = 1 }) => {
  if (!db) return { content: [], totalPages: 0, currentPage: 1 };
  const pages = db.prepare('SELECT DISTINCT page FROM book_content WHERE book_id = ? ORDER BY page').all(bookId).map(r => r.page);
  const totalPages = pages.length;
  const targetPage = pages.includes(page) ? page : (pages[0] || 1);
  const content = db.prepare(
    'SELECT * FROM book_content WHERE book_id = ? AND page = ? ORDER BY part'
  ).all(bookId, targetPage);
  return { content, totalPages, currentPage: targetPage };
});

ipcMain.handle('db:getBookContentByPage', (event, { bookId, shamelaPage }) => {
  if (!db) return { content: [], totalPages: 0, currentPage: 1 };
  const pages = db.prepare('SELECT DISTINCT page FROM book_content WHERE book_id = ? ORDER BY page').all(bookId).map(r => r.page);
  const totalPages = pages.length;
  const targetPage = pages.includes(shamelaPage) ? shamelaPage : (pages[0] || 1);
  const content = db.prepare(
    'SELECT * FROM book_content WHERE book_id = ? AND page = ? ORDER BY part'
  ).all(bookId, targetPage);
  return { content, totalPages, currentPage: targetPage };
});

ipcMain.handle('db:getBookToc', (event, bookId) => {
  if (!db) return [];
  return db.prepare('SELECT * FROM book_toc WHERE book_id = ? ORDER BY page, level').all(bookId);
});

ipcMain.handle('db:getAuthors', (event, { page = 0, limit = 50, search = '' }) => {
  if (!db) return { authors: [], total: 0 };
  const offset = page * limit;
  if (search) {
    const total = db.prepare("SELECT COUNT(*) as count FROM authors WHERE name LIKE ?").get(`%${search}%`).count;
    const authors = db.prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM books WHERE author_id = a.id) as book_count
      FROM authors a WHERE a.name LIKE ?
      ORDER BY a.name LIMIT ? OFFSET ?
    `).all(`%${search}%`, limit, offset);
    return { authors, total };
  }
  const total = db.prepare('SELECT COUNT(*) as count FROM authors').get().count;
  const authors = db.prepare(`
    SELECT a.*, (SELECT COUNT(*) FROM books WHERE author_id = a.id) as book_count
    FROM authors a
    ORDER BY a.name LIMIT ? OFFSET ?
  `).all(limit, offset);
  return { authors, total };
});

ipcMain.handle('db:getAuthor', (event, authorId) => {
  if (!db) return null;
  return db.prepare('SELECT * FROM authors WHERE id = ?').get(authorId);
});

ipcMain.handle('db:getAuthorBooks', (event, authorId) => {
  if (!db) return [];
  return db.prepare('SELECT * FROM books WHERE author_id = ? ORDER BY title').all(authorId);
});

ipcMain.handle('db:search', (event, { query, limit = 50 }) => {
  if (!db || !query) return [];

  try {
    const { toFtsQuery } = require('./arabicNormalize');
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) return [];
    const results = db.prepare(`
      SELECT b.*, snippet(books_fts, 0, '<mark>', '</mark>', '...', 30) as snippet
      FROM books_fts
      JOIN books b ON books_fts.rowid = b.id
      WHERE books_fts MATCH ?
      LIMIT ?
    `).all(ftsQuery, limit);
    return results;
  } catch (e) {
    console.error('Search error:', e);
    return [];
  }
});

ipcMain.handle('db:searchContent', (event, { query, bookId, limit = 50 }) => {
  if (!db || !query) return [];

  const { toFtsQuery } = require('./arabicNormalize');
  const ftsQuery = toFtsQuery(query);

  try {
    if (!ftsQuery) throw new Error('empty fts query');
    if (contentIndexingActive) throw new Error('content index rebuilding');
    const hasFts = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='book_content_fts'")
      .get();
    if (!hasFts) throw new Error('book_content_fts missing');

    let sql = `
      SELECT bc.id, bc.book_id, bc.page, bc.content,
             b.title as book_title, b.author_name,
             snippet(book_content_fts, 2, '<mark>', '</mark>', '...', 40) as snippet
      FROM book_content_fts
      JOIN book_content bc ON bc.id = book_content_fts.rowid
      JOIN books b ON bc.book_id = b.id
      WHERE book_content_fts MATCH ?
    `;
    const params = [ftsQuery];
    if (bookId) {
      sql += ' AND bc.book_id = ?';
      params.push(bookId);
    }
    sql += ' LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  } catch (e) {
    // FTS index not available yet (pre-backfill DB): fall back to LIKE scan.
    try {
      let sql = `
        SELECT bc.*, b.title as book_title, b.author_name, NULL as snippet
        FROM book_content bc
        JOIN books b ON bc.book_id = b.id
        WHERE bc.content LIKE ?
      `;
      const params = [`%${query}%`];
      if (bookId) {
        sql += ' AND bc.book_id = ?';
        params.push(bookId);
      }
      sql += ' LIMIT ?';
      params.push(limit);
      return db.prepare(sql).all(...params);
    } catch (e2) {
      console.error('Content search error:', e2);
      return [];
    }
  }
});

ipcMain.handle('db:getRecentBooks', () => {
  if (!db) return [];
  return db.prepare('SELECT * FROM books WHERE has_content = 1 ORDER BY RANDOM() LIMIT 20').all();
});

const pdfDownloadsInFlight = new Map();

// Canonical destination under PDF_DIR for a catalog relative path (no existence check).
function pdfDestFor(relativePath) {
  if (!relativePath) return null;
  const pdfDirResolved = path.resolve(getPdfDir());
  const normalized = String(relativePath)
    .replace(/\\/g, path.sep)
    .replace(/^Rel:/, '')
    .replace(/^pdf[/\\]/, '');
  const fullPath = path.resolve(path.join(pdfDirResolved, normalized));
  if (!fullPath.startsWith(pdfDirResolved + path.sep) && fullPath !== pdfDirResolved) return null;
  return fullPath;
}

function resolveInPdfDir(relativePath) {
  const fullPath = pdfDestFor(relativePath);
  if (fullPath && fs.existsSync(fullPath)) return fullPath;
  return null;
}

async function ensurePdfDownloaded(relativePath) {
  const entry = require('./pdfCatalog').getEntryByRel(relativePath);
  if (!entry || !entry.url) return null;

  if (pdfDownloadsInFlight.has(entry.rel)) {
    try { await pdfDownloadsInFlight.get(entry.rel); } catch (e) {}
    const existing = pdfDestFor(entry.rel);
    if (existing && fs.existsSync(existing)) return existing;
    return null;
  }

  const destPath = pdfDestFor(entry.rel);
  if (!destPath) return null;
  if (fs.existsSync(destPath)) return destPath;

  const promise = (async () => {
    try {
      const { downloadFile } = require('./update');
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const base = process.env.SHAMELA_API_BASE || 'https://eshamila.net';
      await downloadFile(`${base}/${entry.url}`, destPath);
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        try { fs.unlinkSync(destPath); } catch (e) {}
        return null;
      }
      return destPath;
    } catch (e) {
      try { fs.unlinkSync(destPath); } catch (err) {}
      console.error(`PDF download failed for ${entry.rel}:`, e.message);
      return null;
    }
  })();

  pdfDownloadsInFlight.set(entry.rel, promise);
  try {
    return await promise;
  } finally {
    pdfDownloadsInFlight.delete(entry.rel);
  }
}

ipcMain.handle('getPdfPath', async (event, relativePath) => {
  if (!relativePath) return null;
  const localPath = resolveInPdfDir(relativePath);
  if (localPath) return localPath;
  return ensurePdfDownloaded(relativePath);
});

// ============ Full-text content index ============

let contentIndexingActive = false;
let indexWorker = null;

// Starts the book_content_fts rebuild in a worker thread so the main process
// never blocks. No-op while already running or during an update.
function startContentIndexing() {
  if (!db || contentIndexingActive || updateInProgress) return;
  const { needsContentRebuild } = require('./searchIndex');
  if (!needsContentRebuild(db)) return;
  const { Worker } = require('worker_threads');
  contentIndexingActive = true;
  try {
    indexWorker = new Worker(path.join(__dirname, 'searchIndexWorker.js'), {
      workerData: { dbPath: getDbPath(), batchSize: 10000 },
    });
    indexWorker.on('message', (msg) => {
      if (!msg) return;
      if (msg.type === 'error') {
        console.error('Content FTS rebuild failed:', msg.message);
      } else if (msg.type === 'done' && !msg.stopped) {
        console.log('Content FTS rebuild complete:', msg.done, 'rows');
      }
    });
    indexWorker.on('error', (e) => {
      console.error('Content FTS rebuild failed:', e.message);
      contentIndexingActive = false;
      indexWorker = null;
    });
    indexWorker.on('exit', () => {
      contentIndexingActive = false;
      indexWorker = null;
    });
  } catch (e) {
    console.error('Content FTS rebuild failed to start:', e.message);
    contentIndexingActive = false;
    indexWorker = null;
  }
}

// Asks the worker to stop at the next batch boundary and resolves once it has
// exited. Safe to call when no worker is running.
function stopContentIndexing() {
  return new Promise((resolve) => {
    if (!indexWorker) {
      contentIndexingActive = false;
      resolve();
      return;
    }
    const worker = indexWorker;
    const onExit = () => {
      worker.removeListener('exit', onExit);
      contentIndexingActive = false;
      indexWorker = null;
      resolve();
    };
    worker.on('exit', onExit);
    try {
      worker.postMessage({ type: 'stop' });
    } catch (e) {
      contentIndexingActive = false;
      indexWorker = null;
      resolve();
    }
  });
}

ipcMain.handle('db:contentIndexStatus', () => {
  if (!db) return { indexing: false, contentRows: 0, ftsRows: 0 };
  const { needsContentRebuild } = require('./searchIndex');
  return {
    indexing: contentIndexingActive,
    needsRebuild: needsContentRebuild(db),
  };
});

// ============ Update / Sync IPC Handlers ============

function setupUpdaterPaths() {
  const updater = require('./update');
  const tmpDir = path.join(getDataDir(), '.update-tmp');
  updater.setPaths(tmpDir, getDbPath());
}

let updateInProgress = false;

ipcMain.handle('db:checkUpdates', async () => {
  try {
    setupUpdaterPaths();
    const updater = require('./update');
    return await updater.checkForUpdates();
  } catch (e) {
    console.error('Check updates error:', e);
    return { error: e.message };
  }
});

ipcMain.handle('db:startUpdate', async (event, { bookIds } = {}) => {
  if (updateInProgress) return { error: 'التحديث قيد التشغيل بالفعل' };
  updateInProgress = true;
  try {
    await stopContentIndexing();
    setupUpdaterPaths();
    const updater = require('./update');
    const result = await updater.checkForUpdates();
    const toInstall = bookIds
      ? [...result.newBooks, ...result.updatedBooks].filter(b => bookIds.includes(Number(b.id)))
      : [...result.newBooks, ...result.updatedBooks];

    if (toInstall.length === 0) {
      updateInProgress = false;
      return { installed: 0, message: 'لا توجد كتب جديدة' };
    }

    let progress = 0;
    await updater.runUpdates(toInstall, (msg, current, total) => {
      progress = { msg, current, total };
      if (mainWindow && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('update:progress', progress);
      }
    });

    updateInProgress = false;

    // Sync the title/author FTS and finish any pending content-index rebuild.
    try {
      require('./searchIndex').ensureSearchIndex(db);
      startContentIndexing();
    } catch (e) {
      console.error('Search index sync after update failed:', e.message);
    }

    return { installed: toInstall.length };
  } catch (e) {
    updateInProgress = false;
    console.error('Update error:', e);
    return { error: e.message };
  }
});

// ============ App Auto-Update IPC Handlers ============

ipcMain.handle('app:checkForUpdates', () => {
  autoUpdater.checkForUpdates();
  return true;
});

ipcMain.handle('app:downloadUpdate', () => {
  autoUpdater.downloadUpdate();
  return true;
});

ipcMain.handle('app:quitAndInstall', () => {
  autoUpdater.quitAndInstall();
  return true;
});

ipcMain.handle('app:getAppVersion', () => {
  return autoUpdater.getCurrentVersion().version;
});

ipcMain.handle('app:getInstallDirectory', () => {
  return autoUpdater.getInstallDirectory();
});

// ============ User Data IPC Handlers ============

ipcMain.handle('db:addHistory', (event, { bookId, bookTitle, authorName, page = 0 }) => {
  if (!userDb || !bookId) return null;
  userDb.prepare(`
    INSERT INTO history (book_id, book_title, author_name, page, visited_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(bookId, bookTitle, authorName, page);
  // Keep only last 200 entries
  userDb.prepare('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 200)').run();
  return true;
});

ipcMain.handle('db:getHistory', (event, { limit = 50 } = {}) => {
  if (!userDb) return [];
  return userDb.prepare('SELECT * FROM history ORDER BY visited_at DESC LIMIT ?').all(limit);
});

ipcMain.handle('db:clearHistory', () => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM history').run();
  return true;
});

ipcMain.handle('db:deleteHistoryItem', (event, id) => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM history WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('db:addBookmark', (event, { bookId, bookTitle, authorName, page = 0, title }) => {
  if (!userDb || !bookId) return null;
  userDb.prepare(`
    INSERT INTO bookmarks (book_id, book_title, author_name, page, title, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(bookId, bookTitle, authorName, page, title);
  return true;
});

ipcMain.handle('db:getBookmarks', (event, { limit = 100 } = {}) => {
  if (!userDb) return [];
  return userDb.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT ?').all(limit);
});

ipcMain.handle('db:deleteBookmark', (event, id) => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('db:getBookmarksForBook', (event, bookId) => {
  if (!userDb) return [];
  return userDb.prepare('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC').all(bookId);
});

// ============ Notes IPC Handlers ============

ipcMain.handle('db:addNote', (event, { bookId, bookTitle, page = 0, content }) => {
  if (!userDb || !bookId || !content) return null;
  userDb.prepare(`
    INSERT INTO notes (book_id, book_title, page, content, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(bookId, bookTitle, page, content);
  return true;
});

ipcMain.handle('db:getNotes', (event, { limit = 100 } = {}) => {
  if (!userDb) return [];
  return userDb.prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?').all(limit);
});

ipcMain.handle('db:deleteNote', (event, id) => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return true;
});

// ============ Export IPC Handlers ============

// ============ Services (Duplicate Fix) ============

ipcMain.handle('db:findDuplicateAuthors', () => {
  if (!db) return [];
  const groups = db.prepare(`
    SELECT a1.name, COUNT(*) as cnt,
           GROUP_CONCAT(a1.id) as ids,
           GROUP_CONCAT(a1.shamela_id) as shamela_ids,
           GROUP_CONCAT(
             (SELECT COUNT(*) FROM books WHERE author_id = a1.id)
           ) as book_counts,
           GROUP_CONCAT(
             (SELECT GROUP_CONCAT(title, '||') FROM books WHERE author_id = a1.id)
           ) as book_titles
    FROM authors a1
    GROUP BY a1.name
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, a1.name
  `).all();
  return groups.map((g) => {
    const ids = g.ids.split(',').map(Number);
    const sids = g.shamela_ids.split(',').map(Number);
    const bcs = g.book_counts.split(',').map(Number);
    const titles = g.book_titles.split(',');
    // Find the primary (shamela_id matches another author's id = the dup points to primary)
    const members = ids.map((id, i) => ({
      id,
      shamela_id: sids[i],
      book_count: bcs[i],
      books: titles[i] ? titles[i].split('||').filter(Boolean) : [],
      is_primary: false,
    }));
    // Determine primary: the one whose id is referenced by the other's shamela_id
    for (const m of members) {
      const referenced = members.some((o) => o.id !== m.id && o.shamela_id === m.id);
      if (referenced || m.shamela_id !== 0) {
        m.is_primary = true;
        break;
      }
    }
    // If no cross-ref detected, the one with lower id or more books is primary
    if (!members.some((m) => m.is_primary)) {
      const sorted = [...members].sort((a, b) => b.book_count - a.book_count || a.id - b.id);
      sorted[0].is_primary = true;
    }
    return {
      name: g.name,
      count: g.cnt,
      members,
    };
  });
});

ipcMain.handle('db:mergeDuplicateAuthors', async (event, { primaries }) => {
  if (!servicesDb) return { success: false, error: 'Services database not available' };
  // primaries: array of { primaryId: number, duplicateIds: number[] }
  const results = { merged: 0, deleted: 0, errors: [] };
  const transaction = servicesDb.transaction(() => {
    for (const group of primaries) {
      for (const dupId of group.duplicateIds) {
        try {
          // Reassign books from duplicate author to primary author
          const reassign = servicesDb.prepare('UPDATE books SET author_id = ? WHERE author_id = ?').run(group.primaryId, dupId);
          results.merged += reassign.changes;
          // Delete the duplicate author
          const del = servicesDb.prepare('DELETE FROM authors WHERE id = ?').run(dupId);
          results.deleted += del.changes;
        } catch (e) {
          results.errors.push({ dupId, error: e.message });
        }
      }
    }
  });
  try {
    transaction();
    return { success: true, ...results };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('exportText', async (event, { content, defaultName = 'export.txt' }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'ملفات نصية', extensions: ['txt'] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('print:window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  win.webContents.print({ printBackground: true }, (success, failureReason) => {
    if (!success) console.error('Print failed:', failureReason);
  });
  return true;
});

// ============ Linux Workarounds ============

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('in-process-gpu');
}

// ============ DB Schema Check ============

ipcMain.handle('db:checkStatus', () => {
  if (!db) return { ready: false, reason: 'not-found' };
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
    if (count === 0) return { ready: false, reason: 'empty' };
    const hasContent = db.prepare('SELECT COUNT(*) as count FROM books WHERE has_content = 1').get().count;
    return { ready: hasContent > 0, totalBooks: count, contentBooks: hasContent };
  } catch {
    return { ready: false, reason: 'error' };
  }
});

// ============ App Lifecycle ============

app.whenReady().then(() => {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = openDatabase();
  userDb = openUserDatabase();
  servicesDb = openServicesDatabase();

  // Backfill books.pdf_path from the PDF catalog (idempotent, safe on empty DB).
  try {
    const updated = require('./pdfCatalog').applyPdfCatalog(db);
    console.log('PDF catalog applied:', updated, 'books updated');
  } catch (e) {
    console.error('Failed to apply PDF catalog:', e.message);
  }

  // Ensure FTS tables exist and start a background content-index rebuild when needed.
  try {
    require('./searchIndex').ensureSearchIndex(db);
    startContentIndexing();
  } catch (e) {
    console.error('Failed to init search index:', e.message);
  }

  const pdfDir = (() => { try { return fs.realpathSync(getPdfDir()); } catch { return null; } })();

  protocol.handle('shamela-pdf', (request) => {
    try {
      if (!pdfDir) return new Response('Not Found', { status: 404 });
      const raw = request.url.slice('shamela-pdf:///'.length);
      const decoded = decodeURIComponent(raw);
      const filePath = decoded.replace(/\//g, path.sep);
      const resolved = fs.realpathSync(filePath);
      if (resolved !== pdfDir && !resolved.startsWith(pdfDir + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      const parts = resolved.split(path.sep);
      const fileUrl = 'file:///' + parts.map((s, i) => i === 0 ? s : encodeURIComponent(s)).join('/');
      return net.fetch(fileUrl);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
  autoUpdater.init(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) { try { db.close(); } catch (e) { console.error('close db failed:', e.message); } db = null; }
  if (servicesDb) { try { servicesDb.close(); } catch (e) {} servicesDb = null; }
  if (userDb) { try { userDb.close(); } catch (e) {} userDb = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopContentIndexing();
  if (db) { try { db.close(); } catch (e) { console.error('close db failed:', e.message); } db = null; }
  if (userDb) { try { userDb.close(); } catch (e) {} userDb = null; }
});
