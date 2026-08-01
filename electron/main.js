const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const Database = require('better-sqlite3');
const fs = require('fs');
const autoUpdater = require('./autoUpdater');
const { expandCategoryIds } = require('./categoryTree');

let mainWindow;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
let db;
let userDb;
let servicesDb;

const isDev = process.env.NODE_ENV === 'development';
const appRoot = path.join(__dirname, '..');

// ============ IPC input guards ============
// The renderer is context-isolated but is still untrusted input: every IPC
// handler must coerce/normalize its arguments before touching SQL or fs.

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

function toIntIn(value, min, max, fallback) {
  const n = toInt(value, fallback);
  return Math.min(max, Math.max(min, n));
}

function toText(value, maxLen = 1000, fallback = '') {
  return typeof value === 'string' ? value.slice(0, maxLen) : fallback;
}

function toIntArray(value, maxLen = 500) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    const n = Number(v);
    if (Number.isInteger(n)) out.push(n);
    if (out.length >= maxLen) break;
  }
  return out;
}

// Local PDF library (dev: the desktop install next to the repo; prod: a writable
// download cache inside the data folder, so the whole library — DB + PDFs — lives
// under one self-contained directory). Overridable for tests.
function getPdfDir() {
  if (process.env.SHAMELA_PDF_DIR) return process.env.SHAMELA_PDF_DIR;
  return isDev
    ? path.join(appRoot, '..', 'eshamila.net', 'pdf')
    : path.join(getDataDir(), 'pdf');
}

// One-time migration: production PDFs previously lived at userData/pdf next to
// the data folder. Move them under data/pdf so books stay with the DB. No-op in
// dev, or when there is nothing to migrate.
function migrateLegacyPdfDir() {
  if (isDev) return;
  const oldDir = path.join(app.getPath('userData'), 'pdf');
  const newDir = getPdfDir();
  require('./pdfMigration').migrateLegacyPdfDir(oldDir, newDir);
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
  const windowState = require('./windowState').load();
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
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

  // Resilient renderer load: dev (Vite dev server) and prod (local file) both
  // fail transiently — Vite re-optimizing deps on first run, the Chromium
  // network service restarting after a cache hiccup, or a hung load. Without a
  // retry the window stays black until the user closes and reopens it.
  let loadAttempts = 0;
  let loadWatchdog = null;
  const MAX_LOAD_ATTEMPTS = isDev ? 15 : 5;
  const LOAD_WATCHDOG_MS = 10000;

  const clearWatchdog = () => {
    if (loadWatchdog) { clearTimeout(loadWatchdog); loadWatchdog = null; }
  };

  const retryLoad = () => {
    if (mainWindow.isDestroyed() || loadAttempts >= MAX_LOAD_ATTEMPTS) return;
    loadAttempts++;
    clearWatchdog();
    loadWatchdog = setTimeout(() => {
      if (!mainWindow.isDestroyed()) scheduleRetry('load timeout');
    }, LOAD_WATCHDOG_MS);
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
  };

  const scheduleRetry = (reason) => {
    if (mainWindow.isDestroyed() || loadAttempts >= MAX_LOAD_ATTEMPTS) return;
    console.error(`Renderer load issue (${reason}); retrying ${loadAttempts}/${MAX_LOAD_ATTEMPTS}`);
    setTimeout(() => { if (!mainWindow.isDestroyed()) retryLoad(); }, 1000);
  };

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Ignore subframes and aborted navigations; only retry main-frame failures.
    if (!isMainFrame || errorCode === -3) return;
    scheduleRetry(errorDescription);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    clearWatchdog();
    loadAttempts = 0;
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit') return;
    console.error('Renderer process gone:', details.reason, details.exitCode);
    scheduleRetry(`renderer ${details.reason}`);
  });

  retryLoad();

  if (windowState.isMaximized) mainWindow.maximize();
  require('./windowState').track(mainWindow);

  mainWindow.on('closed', () => {
    clearWatchdog();
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

ipcMain.handle('db:getBooks', (event, { categoryId, authorId, search, page = 0, limit = 50 } = {}) => {
  if (!db) return { books: [], total: 0 };

  let where = [];
  let params = [];

  if (categoryId) {
    const catId = toInt(categoryId);
    if (!catId) return { books: [], total: 0 };
    const catIds = expandCategoryIds(db, catId);
    where.push('category_id IN (' + catIds.map(() => '?').join(',') + ')');
    params.push(...catIds);
  }
  if (authorId) {
    where.push('author_id = ?');
    params.push(toInt(authorId));
  }
  if (search) {
    where.push('id IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ?)');
    params.push(toText(search, 200));
  }

  const safePage = toIntIn(page, 0, 100000, 0);
  const safeLimit = toIntIn(limit, 1, 200, 50);
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM books ${whereClause}`).get(...params).count;
  const books = db.prepare(`SELECT * FROM books ${whereClause} ORDER BY title LIMIT ? OFFSET ?`).all(...params, safeLimit, safePage * safeLimit);

  return { books, total, page: safePage, limit: safeLimit };
});

ipcMain.handle('db:getBook', (event, bookId) => {
  if (!db) return null;
  const id = toInt(bookId);
  if (!id) return null;
  return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
});

ipcMain.handle('db:getBookContent', (event, { bookId, page = 1 } = {}) => {
  if (!db) return { content: [], totalPages: 0, currentPage: 1 };
  const id = toInt(bookId);
  if (!id) return { content: [], totalPages: 0, currentPage: 1 };
  const safePage = toInt(page, 1);
  const pages = db.prepare('SELECT DISTINCT page FROM book_content WHERE book_id = ? ORDER BY page').all(id).map(r => r.page);
  const totalPages = pages.length;
  const targetPage = pages.includes(safePage) ? safePage : (pages[0] || 1);
  const content = db.prepare(
    'SELECT * FROM book_content WHERE book_id = ? AND page = ? ORDER BY part'
  ).all(id, targetPage);
  return { content, totalPages, currentPage: targetPage };
});

ipcMain.handle('db:getBookContentByPage', (event, { bookId, shamelaPage } = {}) => {
  if (!db) return { content: [], totalPages: 0, currentPage: 1 };
  const id = toInt(bookId);
  if (!id) return { content: [], totalPages: 0, currentPage: 1 };
  const pages = db.prepare('SELECT DISTINCT page FROM book_content WHERE book_id = ? ORDER BY page').all(id).map(r => r.page);
  const totalPages = pages.length;
  const targetPage = pages.includes(toInt(shamelaPage, 1)) ? toInt(shamelaPage, 1) : (pages[0] || 1);
  const content = db.prepare(
    'SELECT * FROM book_content WHERE book_id = ? AND page = ? ORDER BY part'
  ).all(id, targetPage);
  return { content, totalPages, currentPage: targetPage };
});

ipcMain.handle('db:getBookToc', (event, bookId) => {
  if (!db) return [];
  const id = toInt(bookId);
  if (!id) return [];
  return db.prepare('SELECT * FROM book_toc WHERE book_id = ? ORDER BY page, level').all(id);
});

ipcMain.handle('db:getAuthors', (event, { page = 0, limit = 50, search = '' } = {}) => {
  if (!db) return { authors: [], total: 0 };
  const safePage = toIntIn(page, 0, 100000, 0);
  const safeLimit = toIntIn(limit, 1, 200, 50);
  const offset = safePage * safeLimit;
  const term = toText(search, 200).replace(/[%_\\]/g, '\\$&');
  if (term) {
    const total = db.prepare("SELECT COUNT(*) as count FROM authors WHERE name LIKE ? ESCAPE '\\'").get(`%${term}%`).count;
    const authors = db.prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM books WHERE author_id = a.id) as book_count
      FROM authors a WHERE a.name LIKE ? ESCAPE '\\'
      ORDER BY a.name LIMIT ? OFFSET ?
    `).all(`%${term}%`, safeLimit, offset);
    return { authors, total, page: safePage, limit: safeLimit };
  }
  const total = db.prepare('SELECT COUNT(*) as count FROM authors').get().count;
  const authors = db.prepare(`
    SELECT a.*, (SELECT COUNT(*) FROM books WHERE author_id = a.id) as book_count
    FROM authors a
    ORDER BY a.name LIMIT ? OFFSET ?
  `).all(safeLimit, offset);
  return { authors, total, page: safePage, limit: safeLimit };
});

ipcMain.handle('db:getAuthor', (event, authorId) => {
  if (!db) return null;
  const id = toInt(authorId);
  if (!id) return null;
  return db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
});

ipcMain.handle('db:getAuthorBooks', (event, authorId) => {
  if (!db) return [];
  const id = toInt(authorId);
  if (!id) return [];
  return db.prepare('SELECT * FROM books WHERE author_id = ? ORDER BY title').all(id);
});

ipcMain.handle('db:search', (event, { query, limit = 50 } = {}) => {
  if (!db || !query) return [];
  const safeLimit = toIntIn(limit, 1, 200, 50);
  const safeQuery = toText(query, 200);

  try {
    const { toFtsQuery } = require('./arabicNormalize');
    const ftsQuery = toFtsQuery(safeQuery);
    if (!ftsQuery) return [];
    const results = db.prepare(`
      SELECT b.*, snippet(books_fts, 0, '<mark>', '</mark>', '...', 30) as snippet
      FROM books_fts
      JOIN books b ON books_fts.rowid = b.id
      WHERE books_fts MATCH ?
      LIMIT ?
    `).all(ftsQuery, safeLimit);
    return results;
  } catch (e) {
    console.error('Search error:', e);
    return [];
  }
});

ipcMain.handle('db:searchContent', (event, { query, bookId, limit = 50 } = {}) => {
  if (!db || !query) return [];
  const safeLimit = toIntIn(limit, 1, 200, 50);
  const safeQuery = toText(query, 200);
  const safeBookId = toInt(bookId, 0) || null;

  const { toFtsQuery } = require('./arabicNormalize');
  const ftsQuery = toFtsQuery(safeQuery);

  try {
    if (!ftsQuery) throw new Error('empty fts query');
    if (contentIndexingActive) throw new Error('content index rebuilding');
    const hasFts = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='book_content_fts'")
      .get();
    if (!hasFts) throw new Error('book_content_fts missing');

    let sql = `
      SELECT bc.id, bc.book_id, bc.page, substr(bc.content, 1, 320) as content,
             b.title as book_title, b.author_name,
             snippet(book_content_fts, 2, '<mark>', '</mark>', '...', 40) as snippet
      FROM book_content_fts
      JOIN book_content bc ON bc.id = book_content_fts.rowid
      JOIN books b ON bc.book_id = b.id
      WHERE book_content_fts MATCH ?
    `;
    const params = [ftsQuery];
    if (safeBookId) {
      sql += ' AND bc.book_id = ?';
      params.push(safeBookId);
    }
    sql += ' LIMIT ?';
    params.push(safeLimit);

    return db.prepare(sql).all(...params);
  } catch (e) {
    // FTS index not available yet (pre-backfill DB): fall back to LIKE scan.
    try {
      let sql = `
        SELECT bc.id, bc.book_id, bc.page, substr(bc.content, 1, 320) as content,
               b.title as book_title, b.author_name, NULL as snippet
        FROM book_content bc
        JOIN books b ON bc.book_id = b.id
        WHERE bc.content LIKE ?
      `;
      const params = [`%${safeQuery}%`];
      if (safeBookId) {
        sql += ' AND bc.book_id = ?';
        params.push(safeBookId);
      }
      sql += ' LIMIT ?';
      params.push(safeLimit);
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

const pdfDownloader = require('./pdfDownloader');

ipcMain.handle('getPdfPath', async (event, relativePath) => {
  const rel = toText(relativePath, 500);
  if (!rel) return null;
  const localPath = pdfDownloader.resolveInPdfDir(rel);
  if (localPath) return localPath;
  return pdfDownloader.ensurePdfDownloaded(rel);
});

// ============ Bulk PDF download (full offline library) ============

ipcMain.handle('pdf:downloadAll', async () => {
  return pdfDownloader.downloadAll({
    concurrency: 4,
    onProgress: (p) => {
      if (mainWindow && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('pdf:downloadProgress', p);
      }
      if (p.type === 'progress' && p.total > 0) {
        mainWindow?.setProgressBar(Math.min(1, p.downloaded / p.total));
      } else if (p.type === 'done' || p.type === 'stopped') {
        mainWindow?.setProgressBar(-1);
      }
    },
  });
});

ipcMain.handle('pdf:stopDownload', () => pdfDownloader.requestStop());

ipcMain.handle('pdf:getState', () => pdfDownloader.getState());

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
    const requested = toIntArray(bookIds, 500);
    const toInstall = requested.length
      ? [...result.newBooks, ...result.updatedBooks].filter(b => requested.includes(Number(b.id)))
      : [...result.newBooks, ...result.updatedBooks];

    if (toInstall.length === 0) {
      updateInProgress = false;
      return { installed: 0, message: 'لا توجد كتب جديدة' };
    }

    // Install runs in a worker thread so the UI stays responsive during large
    // updates (downloads, MDB parsing and SQLite writes are all off the main
    // process event loop).
    const { Worker } = require('worker_threads');
    await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'updateWorker.js'), {
        workerData: {
          tmpDir: path.join(getDataDir(), '.update-tmp'),
          dbPath: getDbPath(),
          books: toInstall,
        },
      });
      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          const progress = { msg: msg.msg, current: msg.current, total: msg.total };
          if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send('update:progress', progress);
          }
          if (mainWindow) {
            if (msg.msg === 'اكتمل التحديث') {
              mainWindow.setProgressBar(-1);
            } else if (msg.total > 0) {
              mainWindow.setProgressBar(Math.min(1, msg.current / msg.total));
            }
          }
        } else if (msg.type === 'done') {
          resolve();
        } else if (msg.type === 'error') {
          reject(new Error(msg.message || 'فشل التحديث'));
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`worker exited with code ${code}`));
      });
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

ipcMain.handle('db:addHistory', (event, { bookId, bookTitle, authorName, page = 0 } = {}) => {
  if (!userDb || !bookId) return null;
  const id = toInt(bookId);
  if (!id) return null;
  userDb.prepare(`
    INSERT INTO history (book_id, book_title, author_name, page, visited_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, toText(bookTitle, 300), toText(authorName, 300), toIntIn(page, 0, 100000, 0));
  // Keep only last 200 entries
  userDb.prepare('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 200)').run();
  return true;
});

ipcMain.handle('db:getHistory', (event, { limit = 50 } = {}) => {
  if (!userDb) return [];
  const safeLimit = toIntIn(limit, 1, 500, 50);
  return userDb.prepare('SELECT * FROM history ORDER BY visited_at DESC LIMIT ?').all(safeLimit);
});

ipcMain.handle('db:clearHistory', () => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM history').run();
  return true;
});

ipcMain.handle('db:deleteHistoryItem', (event, id) => {
  if (!userDb) return false;
  const safeId = toInt(id);
  if (!safeId) return false;
  userDb.prepare('DELETE FROM history WHERE id = ?').run(safeId);
  return true;
});

ipcMain.handle('db:addBookmark', (event, { bookId, bookTitle, authorName, page = 0, title } = {}) => {
  if (!userDb || !bookId) return null;
  const id = toInt(bookId);
  if (!id) return null;
  userDb.prepare(`
    INSERT INTO bookmarks (book_id, book_title, author_name, page, title, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, toText(bookTitle, 300), toText(authorName, 300), toIntIn(page, 0, 100000, 0), toText(title, 300));
  return true;
});

ipcMain.handle('db:getBookmarks', (event, { limit = 100 } = {}) => {
  if (!userDb) return [];
  const safeLimit = toIntIn(limit, 1, 500, 100);
  return userDb.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT ?').all(safeLimit);
});

ipcMain.handle('db:deleteBookmark', (event, id) => {
  if (!userDb) return false;
  userDb.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('db:getBookmarksForBook', (event, bookId) => {
  if (!userDb) return [];
  const id = toInt(bookId);
  if (!id) return [];
  return userDb.prepare('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC').all(id);
});

// ============ Notes IPC Handlers ============

ipcMain.handle('db:addNote', (event, { bookId, bookTitle, page = 0, content } = {}) => {
  if (!userDb || !bookId || !content) return null;
  const id = toInt(bookId);
  if (!id) return null;
  userDb.prepare(`
    INSERT INTO notes (book_id, book_title, page, content, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(id, toText(bookTitle, 300), toIntIn(page, 0, 100000, 0), toText(content, 20000));
  return true;
});

ipcMain.handle('db:getNotes', (event, { limit = 100 } = {}) => {
  if (!userDb) return [];
  const safeLimit = toIntIn(limit, 1, 500, 100);
  return userDb.prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?').all(safeLimit);
});

ipcMain.handle('db:deleteNote', (event, id) => {
  if (!userDb) return false;
  const safeId = toInt(id);
  if (!safeId) return false;
  userDb.prepare('DELETE FROM notes WHERE id = ?').run(safeId);
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

ipcMain.handle('db:mergeDuplicateAuthors', async (event, { primaries } = {}) => {
  if (!servicesDb) return { success: false, error: 'Services database not available' };
  if (!Array.isArray(primaries) || primaries.length === 0) return { success: false, error: 'لا توجد مجموعات للمعالجة' };
  // primaries: array of { primaryId: number, duplicateIds: number[] }
  const results = { merged: 0, deleted: 0, errors: [] };
  const transaction = servicesDb.transaction(() => {
    for (const raw of primaries.slice(0, 200)) {
      const group = {
        primaryId: toInt(raw?.primaryId, 0),
        duplicateIds: toIntArray(raw?.duplicateIds, 200).filter((id) => id !== toInt(raw?.primaryId, 0)),
      };
      if (!group.primaryId) continue;
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

ipcMain.handle('exportText', async (event, { content, defaultName = 'export.txt' } = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: toText(defaultName, 200) || 'export.txt',
    filters: [{ name: 'ملفات نصية', extensions: ['txt'] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, toText(content, 500000, ''), 'utf-8');
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
  migrateLegacyPdfDir();
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

  pdfDownloader.setPdfDir(getPdfDir());

  const pdfDir = (() => { try { return fs.realpathSync(getPdfDir()); } catch { return null; } })();

  protocol.handle('shamela-pdf', (request) => {
    try {
      if (!pdfDir) return new Response('Not Found', { status: 404 });
      const url = new URL(request.url);
      const relativePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
      const dest = pdfDownloader.pdfDestFor(relativePath);
      if (!dest) return new Response('Forbidden', { status: 403 });
      const resolved = fs.realpathSync(dest);
      if (resolved !== pdfDir && !resolved.startsWith(pdfDir + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(resolved).toString());
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
