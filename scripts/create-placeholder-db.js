const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'shamela.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY, name TEXT, long_name TEXT, death_year TEXT, description TEXT, shamela_id INTEGER);
  CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER, level INTEGER, order_num INTEGER, shamela_id INTEGER);
  CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER, author_name TEXT, category_id INTEGER, category_name TEXT, description TEXT, download_url TEXT, shamela_id INTEGER, author_shamela_id INTEGER, pdf_path TEXT, has_content INTEGER);
  CREATE TABLE IF NOT EXISTS book_content (id INTEGER PRIMARY KEY, book_id INTEGER, page INTEGER, part INTEGER, content TEXT);
  INSERT OR IGNORE INTO authors (id, name) VALUES (1, 'قاعدة بيانات تجريبية');
  INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'الكتب');
  INSERT OR IGNORE INTO books (id, title, author_name, has_content) VALUES (1, 'المكتبة الشاملة الإباضية', 'المكتبة', 0);
`);
db.close();
console.log('✅ Placeholder database created at', dbPath);
