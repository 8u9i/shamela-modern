const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

const DEFAULT_STATE = { width: 1400, height: 900, x: null, y: null, isMaximized: false };

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (!saved || !Number.isFinite(saved.width) || !Number.isFinite(saved.height)) return DEFAULT_STATE;
    const state = {
      width: Math.max(800, saved.width),
      height: Math.max(600, saved.height),
      x: Number.isFinite(saved.x) ? saved.x : null,
      y: Number.isFinite(saved.y) ? saved.y : null,
      isMaximized: !!saved.isMaximized,
    };
    // A saved position can point at a now-disconnected monitor: drop x/y so the
    // OS picks a visible display rather than opening off-screen.
    if (state.x !== null && state.y !== null) {
      const onScreen = screen.getAllDisplays().some((d) => {
        const b = d.workArea;
        return (
          state.x < b.x + b.width &&
          state.x + state.width > b.x &&
          state.y < b.y + b.height &&
          state.y + state.height > b.y
        );
      });
      if (!onScreen) { state.x = null; state.y = null; }
    }
    return state;
  } catch {
    return DEFAULT_STATE;
  }
}

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, ms);
  };
}

function track(win) {
  const save = () => {
    if (win.isDestroyed()) return;
    const normal = win.getNormalBounds();
    const state = {
      width: normal.width,
      height: normal.height,
      x: normal.x,
      y: normal.y,
      isMaximized: win.isMaximized(),
    };
    try {
      fs.writeFileSync(stateFile(), JSON.stringify(state));
    } catch (e) {
      // Non-fatal: window state is a convenience, not critical data.
    }
  };
  const debouncedSave = debounce(save, 400);
  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);
  win.on('close', save);
}

module.exports = { load, track };
