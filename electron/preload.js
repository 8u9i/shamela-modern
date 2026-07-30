const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStats: () => ipcRenderer.invoke('db:getStats'),
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  getBooks: (opts) => ipcRenderer.invoke('db:getBooks', opts),
  getBook: (id) => ipcRenderer.invoke('db:getBook', id),
  getBookContent: (opts) => ipcRenderer.invoke('db:getBookContent', opts),
  getBookContentByPage: (opts) => ipcRenderer.invoke('db:getBookContentByPage', opts),
  getBookToc: (id) => ipcRenderer.invoke('db:getBookToc', id),
  getAuthor: (id) => ipcRenderer.invoke('db:getAuthor', id),
  getAuthors: (opts) => ipcRenderer.invoke('db:getAuthors', opts),
  getAuthorBooks: (id) => ipcRenderer.invoke('db:getAuthorBooks', id),
  search: (opts) => ipcRenderer.invoke('db:search', opts),
  searchContent: (opts) => ipcRenderer.invoke('db:searchContent', opts),
  getRecentBooks: () => ipcRenderer.invoke('db:getRecentBooks'),
  getPdfPath: (relativePath) => ipcRenderer.invoke('getPdfPath', relativePath),

  addHistory: (opts) => ipcRenderer.invoke('db:addHistory', opts),
  getHistory: (opts) => ipcRenderer.invoke('db:getHistory', opts),
  clearHistory: () => ipcRenderer.invoke('db:clearHistory'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('db:deleteHistoryItem', id),

  addBookmark: (opts) => ipcRenderer.invoke('db:addBookmark', opts),
  getBookmarks: (opts) => ipcRenderer.invoke('db:getBookmarks', opts),
  getBookmarksForBook: (bookId) => ipcRenderer.invoke('db:getBookmarksForBook', bookId),
  deleteBookmark: (id) => ipcRenderer.invoke('db:deleteBookmark', id),

  addNote: (opts) => ipcRenderer.invoke('db:addNote', opts),
  getNotes: (opts) => ipcRenderer.invoke('db:getNotes', opts),
  deleteNote: (id) => ipcRenderer.invoke('db:deleteNote', id),

  exportText: (opts) => ipcRenderer.invoke('exportText', opts),

  findDuplicateAuthors: () => ipcRenderer.invoke('db:findDuplicateAuthors'),
  mergeDuplicateAuthors: (opts) => ipcRenderer.invoke('db:mergeDuplicateAuthors', opts),

  checkUpdates: () => ipcRenderer.invoke('db:checkUpdates'),
  startUpdate: (opts) => ipcRenderer.invoke('db:startUpdate', opts),
  onUpdateProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update:progress', handler);
    return () => ipcRenderer.removeListener('update:progress', handler);
  },

  checkForAppUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadAppUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstallApp: () => ipcRenderer.invoke('app:quitAndInstall'),
  getAppVersion: () => ipcRenderer.invoke('app:getAppVersion'),
  onAppUpdateStatus: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },

  checkDbStatus: () => ipcRenderer.invoke('db:checkStatus'),
});
