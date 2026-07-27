import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ShamelaDatabase } from './database';

let mainWindow: BrowserWindow | null = null;
let db: ShamelaDatabase | null = null;

const isDev = process.env.NODE_ENV === 'development';

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'shamela.db');
  
  if (fs.existsSync(dbPath)) return dbPath;

  const extraResourcePath = path.join(process.resourcesPath, 'shamela.db');
  if (fs.existsSync(extraResourcePath)) return extraResourcePath;

  return dbPath;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'المكتبة الشاملة',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeDatabase(dataDir: string): Promise<boolean> {
  try {
    const dbPath = getDbPath();
    db = new ShamelaDatabase(dbPath);
    
    if (!db.isInitialized()) {
      console.log('Database not initialized. Running conversion...');
      const converter = await import('./converter');
      await converter.convertMdbToSqlite(dataDir, dbPath);
      db = new ShamelaDatabase(dbPath);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

function setupIPC(): void {
  ipcMain.handle('select-data-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'اختر مجلد المكتبة الشاملة',
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('init-database', async (_event, dataDir: string) => {
    return await initializeDatabase(dataDir);
  });

  ipcMain.handle('get-categories', async () => {
    if (!db) return [];
    return db.getCategories();
  });

  ipcMain.handle('get-books', async (_event, categoryId?: number, page?: number, pageSize?: number) => {
    if (!db) return { books: [], total: 0 };
    return db.getBooks(categoryId, page || 1, pageSize || 50);
  });

  ipcMain.handle('get-book-detail', async (_event, bookId: number) => {
    if (!db) return null;
    return db.getBookDetail(bookId);
  });

  ipcMain.handle('get-book-content', async (_event, bookId: number, page?: number) => {
    if (!db) return { content: '', totalPages: 0 };
    return db.getBookContent(bookId, page || 1);
  });

  ipcMain.handle('search-books', async (_event, query: string, page?: number) => {
    if (!db) return { results: [], total: 0 };
    return db.searchBooks(query, page || 1);
  });

  ipcMain.handle('search-content', async (_event, query: string, bookId?: number) => {
    if (!db) return { results: [], total: 0 };
    return db.searchContent(query, bookId);
  });

  ipcMain.handle('get-authors', async () => {
    if (!db) return [];
    return db.getAuthors();
  });

  ipcMain.handle('get-author-books', async (_event, authorId: number) => {
    if (!db) return [];
    return db.getAuthorBooks(authorId);
  });

  ipcMain.handle('get-stats', async () => {
    if (!db) return null;
    return db.getStats();
  });

  ipcMain.handle('get-pdf-path', async (_event, bookId: number) => {
    if (!db) return null;
    return db.getPdfPath(bookId);
  });

  ipcMain.handle('add-bookmark', async (_event, bookId: number, page: number, note?: string) => {
    if (!db) return false;
    return db.addBookmark(bookId, page, note);
  });

  ipcMain.handle('get-bookmarks', async (_event, bookId?: number) => {
    if (!db) return [];
    return db.getBookmarks(bookId);
  });

  ipcMain.handle('remove-bookmark', async (_event, id: number) => {
    if (!db) return false;
    return db.removeBookmark(id);
  });

  ipcMain.handle('get-recent-books', async () => {
    if (!db) return [];
    return db.getRecentBooks();
  });

  ipcMain.handle('add-recent-book', async (_event, bookId: number) => {
    if (!db) return;
    db.addRecentBook(bookId);
  });
}

app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
    db = null;
  }
});
