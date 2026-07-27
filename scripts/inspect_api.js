const mdb = require('mdb-reader');
const fs = require('fs');
const Database = mdb.default;

const base = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';
const buf = fs.readFileSync(base + '\\Files\\Duser');
const db = new Database(buf);
const table = db.getTable('BookInfo');
console.log('Table type:', typeof table);
console.log('Table keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(table)));
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(table)).filter(m => typeof table[m] === 'function');
console.log('Table methods:', methods);

// Try data
const data = table.getData();
console.log('getData type:', typeof data, Array.isArray(data));
if (Array.isArray(data)) {
  console.log('Row count:', data.length);
  console.log('First row keys:', Object.keys(data[0] || {}));
  console.log('First row:', JSON.stringify(data[0]).substring(0, 500));
} else {
  console.log('getData result:', data);
}
