const mdb = require('mdb-reader');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const Database = require('better-sqlite3');
const MDB = mdb.default;

const BASE = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';
const DB_PATH = path.join(__dirname, '..', 'data', 'shamela.db');

// Check Duser MDB raw data
const duserPath = path.join(BASE, 'Files', 'Duser');
const duser = new MDB(fs.readFileSync(duserPath));

// Check Authors
const authorInfo = duser.getTable('AuthorInfo');
const rows = authorInfo.getData();
const nameVal = rows[0].Autor_name;
console.log('=== AuthorInfo ===');
console.log('Autor_name type:', typeof nameVal, 'isBuffer:', Buffer.isBuffer(nameVal));
if (Buffer.isBuffer(nameVal)) {
  console.log('  raw hex:', nameVal.subarray(0, 40).toString('hex'));
  console.log('  win1256:', iconv.decode(nameVal, 'win1256'));
  console.log('  latin1:', nameVal.toString('latin1'));
}

// Check Books
const bookInfo = duser.getTable('BookInfo');
const bookRows = bookInfo.getData();
const titleVal = bookRows[0].titleBook;
console.log('\n=== BookInfo ===');
console.log('titleBook type:', typeof titleVal, 'isBuffer:', Buffer.isBuffer(titleVal));
if (Buffer.isBuffer(titleVal)) {
  console.log('  raw hex:', titleVal.subarray(0, 60).toString('hex'));
  console.log('  win1256:', iconv.decode(titleVal, 'win1256'));
} else {
  console.log('  value:', titleVal);
}

// Check Books MDB content
const mdbPath = path.join(BASE, 'Books', 'Archive', '1.mdb');
if (fs.existsSync(mdbPath)) {
  const mdbFile = new MDB(fs.readFileSync(mdbPath));
  const tables = mdbFile.getTableNames().filter(t => t.startsWith('b'));
  if (tables.length > 0) {
    const table = mdbFile.getTable(tables[0]);
    const contentRows = table.getData();
    console.log('\n=== Content Table', tables[0], '===');
    console.log('Row keys:', Object.keys(contentRows[0]));
    const nassVal = contentRows[0].nass;
    console.log('nass type:', typeof nassVal, 'isBuffer:', Buffer.isBuffer(nassVal));
    if (Buffer.isBuffer(nassVal)) {
      console.log('  raw hex (first 80):', nassVal.subarray(0, 80).toString('hex'));
      console.log('  win1256:', iconv.decode(nassVal, 'win1256').substring(0, 200));
    } else {
      console.log('  value:', String(nassVal).substring(0, 200));
    }
  }
}

// Check converted DB
console.log('\n=== Converted DB ===');
if (fs.existsSync(DB_PATH)) {
  const db = new Database(DB_PATH, { readonly: true });
  const book = db.prepare('SELECT title FROM books LIMIT 1').get();
  console.log('First book title:', book.title);
  console.log('  hex:', Buffer.from(book.title, 'utf8').subarray(0, 60).toString('hex'));
  
  const author = db.prepare('SELECT name FROM authors LIMIT 1').get();
  console.log('First author name:', author.name);
  
  const content = db.prepare('SELECT content FROM book_content LIMIT 1').get();
  console.log('First content (200 chars):', content.content.substring(0, 200));
  
  db.close();
}
