const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'shamela.db');

// Check if already exists
if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 1000000) {
  console.log(`✅ Database already exists at: ${DB_PATH}`);
  console.log(`   Size: ${(fs.statSync(DB_PATH).size / 1073741824).toFixed(2)} GB`);
  process.exit(0);
}

console.log(`
⚠  Database (2.1 GB) not found locally.

The database is not available for direct download yet.
Please obtain it from the project maintainer or build it
from the original ShamelaFull data using:

  npm run convert

This requires the original ShamelaFull data directory.
`);

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

process.exit(1);
