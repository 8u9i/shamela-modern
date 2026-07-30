const { BrowserWindow } = require('electron');

let mainWindow = null;
let autoUpdater = null;

function ensureLoaded() {
  if (!autoUpdater) {
    const mod = require('electron-updater');
    autoUpdater = mod.autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
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

    updater.on('checking-for-update', () => {
      sendToWindow('update:status', { status: 'checking' });
    });

    updater.on('update-available', (info) => {
      sendToWindow('update:status', {
        status: 'available',
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    updater.on('update-not-available', (info) => {
      sendToWindow('update:status', {
        status: 'not-available',
        version: info.version,
      });
    });

    updater.on('download-progress', (progressObj) => {
      sendToWindow('update:status', {
        status: 'downloading',
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    updater.on('update-downloaded', (info) => {
      sendToWindow('update:status', {
        status: 'downloaded',
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    updater.on('error', (error) => {
      sendToWindow('update:status', {
        status: 'error',
        message: error.message,
      });
    });

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
};
