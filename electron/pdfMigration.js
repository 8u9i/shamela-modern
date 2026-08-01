const fs = require('fs');
const path = require('path');

// Copies files from src into dest, merging into existing directories.
function copyDirMerge(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirMerge(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

// Moves a legacy PDF directory into the data folder so installed books live
// next to the database. If the destination already exists, merges then removes
// the legacy folder. Returns the destination path, or null when there was
// nothing to migrate.
function migrateLegacyPdfDir(oldDir, newDir) {
  if (!oldDir || !newDir || oldDir === newDir) return null;
  if (!fs.existsSync(oldDir)) return null;
  try {
    fs.mkdirSync(newDir, { recursive: true });
    if (fs.existsSync(newDir)) {
      copyDirMerge(oldDir, newDir);
      fs.rmSync(oldDir, { recursive: true, force: true });
    } else {
      try {
        fs.renameSync(oldDir, newDir);
      } catch (e) {
        copyDirMerge(oldDir, newDir);
        fs.rmSync(oldDir, { recursive: true, force: true });
      }
    }
    return newDir;
  } catch (e) {
    console.error('PDF dir migration failed:', e.message);
    return null;
  }
}

module.exports = { migrateLegacyPdfDir, copyDirMerge };
