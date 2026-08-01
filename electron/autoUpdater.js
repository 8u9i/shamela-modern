const { BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow = null;
let autoUpdater = null;

const PRODUCT_NAME = 'Al-Maktaba Al-Shamela';
const PRODUCT_DIR = 'al-maktaba-al-shamela';

function isDevRun() {
  const dir = path.dirname(process.execPath);
  return dir.includes('node_modules') || dir.includes('electron');
}

function getInstallDirectory() {
  const exeDir = path.dirname(process.execPath);
  switch (process.platform) {
    case 'win32': {
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      const nsisDir = path.join(localAppData, 'Programs', PRODUCT_NAME);
      return isDevRun() ? nsisDir : exeDir;
    }
    case 'darwin': {
      const appBundle = path.join('/Applications', `${PRODUCT_NAME}.app`);
      if (isDevRun()) return appBundle;
      const bundle = path.resolve(exeDir, '..', '..', '..');
      return bundle.endsWith('.app') ? bundle : appBundle;
    }
    default: {
      if (process.env.APPIMAGE) return path.dirname(process.env.APPIMAGE);
      if (isDevRun()) return path.join('/', 'opt', PRODUCT_DIR);
      return exeDir;
    }
  }
}

let listenersRegistered = false;

function ensureLoaded() {
  if (!autoUpdater) {
    const mod = require('electron-updater');
    autoUpdater = mod.autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
  }
  if (!listenersRegistered) {
    // Register once: electron-updater events are emitted per-update-cycle, so
    // re-registering on every check would pile up duplicate listeners.
    autoUpdater.removeAllListeners();
    autoUpdater.on('checking-for-update', () => {
      sendToWindow('update:status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      sendToWindow('update:status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      sendToWindow('update:status', {
        status: 'not-available',
        version: info.version,
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      sendToWindow('update:status', {
        status: 'downloading',
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      sendToWindow('update:status', {
        status: 'downloaded',
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('error', (error) => {
      sendToWindow('update:status', {
        status: 'error',
        message: error.message,
      });
    });
    listenersRegistered = true;
  }
  return autoUpdater;
}

function init(window) {
  mainWindow = window;
  // Don't load electron-updater here — defer to first check
}

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function checkForUpdates() {
  try {
    const updater = ensureLoaded();
    updater.checkForUpdates().catch((err) => {
      sendToWindow('update:status', {
        status: 'error',
        message: err.message,
      });
    });
  } catch (err) {
    sendToWindow('update:status', {
      status: 'error',
      message: err.message,
    });
  }
}

function downloadUpdate() {
  try {
    ensureLoaded();
    autoUpdater.downloadUpdate().catch((err) => {
      sendToWindow('update:status', {
        status: 'error',
        message: err.message,
      });
    });
  } catch (err) {
    sendToWindow('update:status', {
      status: 'error',
      message: err.message,
    });
  }
}

function quitAndInstall() {
  try {
    ensureLoaded();
    autoUpdater.quitAndInstall();
  } catch (err) {
    // silent
  }
}

function getCurrentVersion() {
  try {
    return ensureLoaded().currentVersion || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

module.exports = {
  init,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getCurrentVersion,
  getInstallDirectory,
};
