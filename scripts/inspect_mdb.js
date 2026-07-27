const mdb = require('mdb-reader');
const fs = require('fs');
const path = require('path');

const base = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';

// Inspect Duser
console.log('=== Duser Tables ===');
const duserBuf = fs.readFileSync(path.join(base, 'Files', 'Duser'));
const duser = new mdb.default(duserBuf);
const duserTables = duser.getTableNames();
console.log('Tables:', duserTables);
for (const name of duserTables) {
  const table = duser.getTable(name);
  const rows = table.getRowCount();
  const cols = table.getColumnNames();
  console.log(`\n  Table: ${name} | Rows: ${rows} | Cols: ${cols.join(', ')}`);
  // Show first 3 rows
  const data = table.getData();
  for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`    Row ${i}:`, JSON.stringify(data[i]).substring(0, 300));
  }
}

// Inspect main.mdb
console.log('\n\n=== main.mdb Tables ===');
const mainBuf = fs.readFileSync(path.join(base, 'Files', 'main.mdb'));
const mainDb = new mdb.default(mainBuf);
const mainTables = mainDb.getTableNames();
console.log('Tables:', mainTables);
for (const name of mainTables) {
  const table = mainDb.getTable(name);
  const rows = table.getRowCount();
  const cols = table.getColumnNames();
  console.log(`\n  Table: ${name} | Rows: ${rows} | Cols: ${cols.join(', ')}`);
  const data = table.getData();
  for (let i = 0; i < Math.min(2, data.length); i++) {
    console.log(`    Row ${i}:`, JSON.stringify(data[i]).substring(0, 300));
  }
}

// Inspect first book archive
console.log('\n\n=== Books/Archive/1.mdb Tables ===');
const bookBuf = fs.readFileSync(path.join(base, 'Books', 'Archive', '1.mdb'));
const bookDb = new mdb.default(bookBuf);
const bookTables = bookDb.getTableNames();
console.log('Tables:', bookTables);
for (const name of bookTables.slice(0, 5)) {
  const table = bookDb.getTable(name);
  const rows = table.getRowCount();
  const cols = table.getColumnNames();
  console.log(`\n  Table: ${name} | Rows: ${rows} | Cols: ${cols.join(', ')}`);
  const data = table.getData();
  for (let i = 0; i < Math.min(2, data.length); i++) {
    const row = data[i];
    // Truncate long strings
    const truncated = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.length > 200) {
        truncated[k] = v.substring(0, 200) + '...';
      } else {
        truncated[k] = v;
      }
    }
    console.log(`    Row ${i}:`, JSON.stringify(truncated));
  }
}
