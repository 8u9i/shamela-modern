const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'category-tree-test-'));
const { getSectionChildIds, expandCategoryIds } = require('./categoryTree');

function makeDb(schema) {
  const db = new Database(path.join(tmpDir, `cat-${Date.now()}-${Math.random().toString(36).slice(2)}.db`));
  db.exec(`
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER, level INTEGER, order_num INTEGER, shamela_id INTEGER);
    CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, category_id INTEGER);
  `);
  for (const c of schema.categories) {
    db.prepare('INSERT INTO categories (id, name, parent_id, level, order_num, shamela_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      c.id, c.name, c.parent_id ?? null, c.level ?? 0, c.order_num ?? 0, c.shamela_id ?? null
    );
  }
  for (const b of schema.books || []) {
    db.prepare('INSERT INTO books (id, title, category_id) VALUES (?, ?, ?)').run(b.id, b.title, b.category_id);
  }
  return db;
}

function countFor(db, catIds) {
  const ph = catIds.map(() => '?').join(',');
  return db.prepare(`SELECT COUNT(*) c FROM books WHERE category_id IN (${ph})`).get(...catIds).c;
}

test('flat API-built DB: virtual root 50074 matches every category', () => {
  // Mirrors electron/update.js: each distinct speciality becomes a level-0 row
  // keyed by shamela_id; no 50074 tree exists.
  const db = makeDb({
    categories: [
      { id: 1, name: 'الفقه', shamela_id: 50006 },
      { id: 2, name: 'الفقه', shamela_id: 50035 },
      { id: 3, name: 'التفسير', shamela_id: 50000 },
    ],
    books: [
      { id: 1, title: 'a', category_id: 1 },
      { id: 2, title: 'b', category_id: 2 },
      { id: 3, title: 'c', category_id: 3 },
    ],
  });

  const ids = expandCategoryIds(db, 50074);
  assert.strictEqual(countFor(db, ids), 3, 'root should show every book');
  db.close();
});

test('flat API-built DB: missing root returns all categories', () => {
  const db = makeDb({
    categories: [{ id: 5, name: 'التاريخ', shamela_id: 50011 }],
  });
  assert.deepStrictEqual(getSectionChildIds(db, 999999).sort((a, b) => a - b), [5]);
  db.close();
});

test('flat API-built DB: level-0 category groups same-name siblings', () => {
  const db = makeDb({
    categories: [
      { id: 1, name: 'الفقه', shamela_id: 50006 },
      { id: 2, name: 'الفقه', shamela_id: 50035 },
      { id: 3, name: 'التفسير', shamela_id: 50000 },
    ],
    books: [
      { id: 1, title: 'a', category_id: 1 },
      { id: 2, title: 'b', category_id: 2 },
      { id: 3, title: 'c', category_id: 3 },
    ],
  });

  // Clicking one "الفقه" entry must surface books in both same-name categories.
  const ids = expandCategoryIds(db, 1);
  assert.deepStrictEqual([...ids].sort((a, b) => a - b), [1, 2]);
  assert.strictEqual(countFor(db, ids), 2);
  db.close();
});

test('flat API-built DB: leaf without siblings returns just itself', () => {
  const db = makeDb({
    categories: [{ id: 3, name: 'التفسير', shamela_id: 50000 }],
    books: [{ id: 1, title: 'c', category_id: 3 }],
  });
  const ids = expandCategoryIds(db, 3);
  assert.deepStrictEqual(ids, [3]);
  assert.strictEqual(countFor(db, ids), 1);
  db.close();
});

test('hierarchy DB: level 1 expands through level 2 to level 3 leaves', () => {
  // Mirrors scripts/convert.js: 50074 (level 1) -> 50029 (level 2) -> level-3 leaves.
  const db = makeDb({
    categories: [
      { id: 50074, name: 'كتب الموقع الرسمي', parent_id: null, level: 1, order_num: 1 },
      { id: 50029, name: 'المطبوعات', parent_id: null, level: 2, order_num: 2 },
      { id: 50044, name: 'غير المطبوعات', parent_id: null, level: 2, order_num: 34 },
      { id: 50000, name: 'التفسير', parent_id: null, level: 3, order_num: 3 },
      { id: 50006, name: 'الفقه', parent_id: null, level: 3, order_num: 5 },
      { id: 50055, name: 'التاريخ', parent_id: null, level: 3, order_num: 40 },
    ],
    books: [
      { id: 1, title: 'a', category_id: 50000 },
      { id: 2, title: 'b', category_id: 50006 },
      { id: 3, title: 'c', category_id: 50055 },
    ],
  });

  const ids = expandCategoryIds(db, 50074);
  assert.ok(ids.includes(50000), 'level-3 under first sub-section');
  assert.ok(ids.includes(50006), 'level-3 under first sub-section');
  assert.ok(ids.includes(50055), 'level-3 under second sub-section');
  assert.strictEqual(countFor(db, ids), 3);
  db.close();
});

test('hierarchy DB: level 2 expands only its own level-3 range', () => {
  const db = makeDb({
    categories: [
      { id: 50029, name: 'المطبوعات', parent_id: null, level: 2, order_num: 2 },
      { id: 50044, name: 'غير المطبوعات', parent_id: null, level: 2, order_num: 34 },
      { id: 50000, name: 'التفسير', parent_id: null, level: 3, order_num: 3 },
      { id: 50055, name: 'التاريخ', parent_id: null, level: 3, order_num: 40 },
    ],
    books: [
      { id: 1, title: 'a', category_id: 50000 },
      { id: 3, title: 'c', category_id: 50055 },
    ],
  });

  const ids = expandCategoryIds(db, 50029);
  assert.deepStrictEqual(ids, [50029, 50000]);
  assert.strictEqual(countFor(db, ids), 1);
  db.close();
});
