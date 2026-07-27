const mdb = require('mdb-reader');
const fs = require('fs');
const Database = mdb.default;
const base = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';

function inspect(name, filePath) {
  console.log(`\n=== ${name} ===`);
  const buf = fs.readFileSync(filePath);
  const db = new Database(buf);
  const tables = db.getTableNames();
  console.log('Tables:', tables);
  for (const tname of tables) {
    const table = db.getTable(tname);
    const data = table.getData();
    const cols = table.getColumnNames();
    console.log(`\n  Table: ${tname} | Rows: ${data.length} | Cols: ${cols.join(', ')}`);
    for (let i = 0; i < Math.min(2, data.length); i++) {
      const row = {};
      for (const [k, v] of Object.entries(data[i])) {
        if (typeof v === 'string' && v.length > 150) {
          row[k] = v.substring(0, 150) + '...[' + v.length + ' chars]';
        } else {
          row[k] = v;
        }
      }
      console.log(`    Row ${i}:`, JSON.stringify(row));
    }
  }
}

inspect('Duser', base + '\\Files\\Duser');
inspect('main.mdb', base + '\\Files\\main.mdb');
inspect('Books/Archive/1.mdb', base + '\\Books\\Archive\\1.mdb');
inspect('Indices/Archive/1.mdb', base + '\\Indices\\Archive\\1.mdb');
