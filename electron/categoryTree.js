// Expands a category id to the full set of category ids whose books should
// appear under it, handling both DB shapes:
//
// 1. Full hierarchy (built by scripts/convert.js): 50074 (level 1) ->
//    sub-sections (level 2) -> leaf sections (level 3). Levels 1 and 2 recurse
//    via order_num ranges.
// 2. Flat API-built DBs (electron/update.js): every book's speciality becomes a
//    level-0 category keyed by shamela_id, with no parent hierarchy. A missing
//    "virtual root" (e.g. the hardcoded 50074) therefore matches every
//    category, and level-0 categories with a shared name are grouped so one
//    sidebar entry surfaces every book for that label.

function getSectionChildIds(db, categoryId) {
  if (!db) return [categoryId];
  const cat = db.prepare('SELECT level, order_num, name FROM categories WHERE id = ?').get(categoryId);
  if (!cat) {
    return db.prepare('SELECT id FROM categories').all().map(c => c.id);
  }
  if (cat.level === 0) {
    return db.prepare('SELECT id FROM categories WHERE name = ?').all(cat.name).map(c => c.id);
  }
  if (cat.level === 1) {
    return db.prepare('SELECT id FROM categories WHERE level = 2 ORDER BY order_num').all().map(c => c.id);
  }
  if (cat.level === 2) {
    const next = db.prepare('SELECT order_num FROM categories WHERE level = 2 AND order_num > ? ORDER BY order_num LIMIT 1').get(cat.order_num);
    const endOrder = next ? next.order_num : 999999;
    const children = db.prepare('SELECT id FROM categories WHERE level = 3 AND order_num > ? AND order_num < ? ORDER BY order_num').all(cat.order_num, endOrder);
    return children.map(c => c.id);
  }
  return [categoryId];
}

// BFS-expands a categoryId into the concrete list of category ids used for the
// WHERE category_id IN (...) filter in getBooks.
function expandCategoryIds(db, categoryId) {
  const catIds = [];
  const queue = [categoryId];
  const seen = new Set();
  while (queue.length > 0) {
    const id = queue.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    catIds.push(id);
    const childIds = getSectionChildIds(db, id);
    for (const childId of childIds) {
      if (!seen.has(childId)) queue.push(childId);
    }
  }
  return catIds;
}

module.exports = { getSectionChildIds, expandCategoryIds };
