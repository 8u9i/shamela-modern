const mdb = require('mdb-reader');
const fs = require('fs');
const Database = mdb.default;
const base = 'D:\\Downloads D\\ShamelaFull_2026-07-22_142851\\eshamila.net';

const duser = new Database(fs.readFileSync(base + '\\Files\\Duser'));
const books = duser.getTable('BookInfo').getData();

// Check the mapping between idBook and IdBkSahmela
const sample = books.slice(0, 10);
console.log('Book ID mapping:');
for (const r of sample) {
  console.log('  idBook:', r.idBook, '| IdBkSahmela:', r.IdBkSahmela, '| title:', r.titleBook.substring(0, 30));
}

// Get all Shamela IDs
const shamelaIds = books.map(r => r.IdBkSahmela).filter(Boolean);
console.log('\nTotal books with Shamela ID:', shamelaIds.length);
console.log('Min Shamela ID:', Math.min(...shamelaIds));
console.log('Max Shamela ID:', Math.max(...shamelaIds));

// Check if MDB table names match Shamela IDs
const bookBuf = fs.readFileSync(base + '\\Books\\Archive\\1.mdb');
const bookDb = new Database(bookBuf);
const tables = bookDb.getTableNames();
const bTables = tables.filter(t => t.startsWith('b'));
console.log('\nMDB b-table count:', bTables.length);
const mdbIds = bTables.map(t => parseInt(t.substring(1))).filter(n => !isNaN(n));
console.log('MDB b-table IDs sample:', mdbIds.slice(0, 20));
console.log('MDB b-table min:', Math.min(...mdbIds), 'max:', Math.max(...mdbIds));

// Check overlap
const overlap = mdbIds.filter(id => shamelaIds.includes(id));
console.log('\nOverlap between MDB table IDs and Shamela IDs:', overlap.length);
const matchByIdBook = mdbIds.filter(id => books.some(b => b.idBook === id));
console.log('Overlap between MDB table IDs and idBook:', matchByIdBook.length);

// Check if there's a different mapping
const bookMap = {};
for (const b of books) {
  bookMap[b.IdBkSahmela] = b.idBook;
}
const mappedCount = mdbIds.filter(id => bookMap[id]).length;
console.log('Mapped via IdBkSahmela:', mappedCount);

// Show a few mapped examples
for (const id of mdbIds.slice(0, 5)) {
  const realId = bookMap[id];
  const book = books.find(b => b.idBook === realId);
  console.log(`  MDB table b${id} -> Shamela ${id} -> idBook ${realId} -> ${book ? book.titleBook.substring(0, 40) : 'NOT FOUND'}`);
}
