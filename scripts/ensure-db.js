const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'shamela.db');

if (fs.existsSync(dbPath)) {
  const size = fs.statSync(dbPath).size;
  if (size > 1000000) {
    console.log(`✅ Database found: ${(size / 1073741824).toFixed(2)} GB`);
    process.exit(0);
  }
}

console.error(`
❌ Database not found or too small at: ${dbPath}

For a full release, you need the real shamela.db (2.1 GB).

How to get it:
  1. If you have the original ShamelaFull data, run:  npm run convert
  2. Or place the .db file manually at:  data/shamela.db

Note: CI builds use a placeholder database. The resulting
installers will not contain books. Only for testing.
`);
process.exit(1);
