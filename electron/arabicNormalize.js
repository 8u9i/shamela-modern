// Arabic text normalization for search: strips tashkeel/tatweel and unifies
// alef/hamza/ta-marbuta/ya forms so that e.g. "مازن" matches "مَازِن",
// "أحمد" matches "احمد", and "المدرسة" matches "المدرسه".

const DIACRITICS = /[\u064B-\u065F\u0670]/;
const TATWEEL = '\u0640';
const CHAR_MAP = {
  '\u0622': '\u0627', // آ -> ا
  '\u0623': '\u0627', // أ -> ا
  '\u0625': '\u0627', // إ -> ا
  '\u0671': '\u0627', // ٱ -> ا
  '\u0629': '\u0647', // ة -> ه
  '\u0649': '\u064A', // ى -> ي
  '\u0626': '\u064A', // ئ -> ي
  '\u0624': '\u0648', // ؤ -> و
};
// Keep Arabic letters (U+0621-U+064A), Arabic digits (U+0660-U+0669) and ASCII.
const VALID_CHAR = /[\u0621-\u064A\u0660-\u0669\u0020-\u007E]/;

// Per-character transform: returns the normalized char, null when dropped,
// or ' ' when an invalid char becomes a word separator.
function transformChar(ch) {
  if (DIACRITICS.test(ch) || ch === TATWEEL) return null;
  if (CHAR_MAP[ch]) return CHAR_MAP[ch];
  if (VALID_CHAR.test(ch)) return ch;
  return ' ';
}

// Normalize a string for FTS indexing / querying.
function normalizeForSearch(text) {
  return String(text || '')
    .split('')
    .map(transformChar)
    .filter(Boolean)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a safe FTS5 MATCH expression from a free-text query.
// Each term is quoted so FTS5 metacharacters are ignored; terms AND together.
// The last term is prefix-matched ("term"*) so "نبي" also finds "النبي".
function toFtsQuery(text) {
  const normalized = normalizeForSearch(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const terms = tokens
    .map((t) => t.replace(/["*:\^\-+~(){}[\]!]/g, '').trim())
    .filter(Boolean);
  return terms
    .map((t, i) => {
      const isLast = i === terms.length - 1;
      if (isLast && t.length >= 2) return `"${t}"*`;
      return `"${t}"`;
    })
    .join(' ');
}

// Locate normalization-aware matches of `query` inside raw `text`.
// Returns [{ start, end }] in raw character offsets, or [] when none.
function findMatches(raw, query) {
  const nq = normalizeForSearch(query);
  if (!nq) return [];
  const out = [];
  const map = [];
  for (let i = 0; i < raw.length; i++) {
    const t = transformChar(raw[i]);
    if (t === null) continue;
    out.push(t);
    map.push(i);
  }
  const nr = out.join('');
  const matches = [];
  let from = 0;
  for (;;) {
    const idx = nr.indexOf(nq, from);
    if (idx === -1) break;
    matches.push({ start: map[idx], end: map[idx + nq.length - 1] + 1 });
    from = idx + 1;
  }
  return matches;
}

// Wrap all query matches in `raw` with <mark> tags (normalization-aware).
function highlightMatches(raw, query) {
  const matches = findMatches(raw, query);
  if (matches.length === 0) return raw;
  const parts = [];
  let cursor = 0;
  for (const m of matches) {
    parts.push(raw.slice(cursor, m.start));
    parts.push(`<mark class="search-highlight">${raw.slice(m.start, m.end)}</mark>`);
    cursor = m.end;
  }
  parts.push(raw.slice(cursor));
  return parts.join('');
}

module.exports = { transformChar, normalizeForSearch, toFtsQuery, findMatches, highlightMatches };
