const { test } = require('node:test');
const assert = require('node:assert');

const { normalizeForSearch, toFtsQuery, findMatches, highlightMatches } = require('./arabicNormalize');

test('normalizeForSearch strips tashkeel and tatweel', () => {
  assert.equal(normalizeForSearch('مَازِن'), 'مازن');
  assert.equal(normalizeForSearch('ذَهَبَ الولدُ'), 'ذهب الولد');
  assert.equal(normalizeForSearch('كتابـــــ'), 'كتاب');
});

test('normalizeForSearch unifies alef/hamza/ta-marbuta/ya forms', () => {
  assert.equal(normalizeForSearch('أحمد'), 'احمد');
  assert.equal(normalizeForSearch('إبراهيم'), 'ابراهيم');
  assert.equal(normalizeForSearch('آل البيت'), 'ال البيت');
  assert.equal(normalizeForSearch('المدرسة'), 'المدرسه');
  assert.equal(normalizeForSearch('على'), 'علي');
  assert.equal(normalizeForSearch('مسؤول'), 'مسوول');
});

test('normalizeForSearch handles empty and null input', () => {
  assert.equal(normalizeForSearch(''), '');
  assert.equal(normalizeForSearch(null), '');
  assert.equal(normalizeForSearch('   '), '');
  assert.equal(normalizeForSearch('…'), '');
});

test('normalizeForSearch keeps latin and digits (case preserved; FTS is case-insensitive)', () => {
  assert.equal(normalizeForSearch('Hadith 2026'), 'Hadith 2026');
});

test('toFtsQuery quotes each term and drops metacharacters', () => {
  assert.equal(toFtsQuery('كتاب السنة'), '"كتاب" "السنه"*');
  assert.equal(toFtsQuery('أحمد "العلم" * 2020'), '"احمد" "العلم" "2020"*');
  assert.equal(toFtsQuery('!!!'), '');
});

test('findMatches is normalization-aware and returns raw offsets', () => {
  const raw = 'قال الإمام أحمدُ رحمه الله';
  const matches = findMatches(raw, 'احمد');
  assert.equal(matches.length, 1);
  assert.equal(raw.slice(matches[0].start, matches[0].end), 'أحمد');
  assert.equal(findMatches(raw, 'غير موجود').length, 0);
  assert.equal(findMatches(raw, '').length, 0);
});

test('findMatches finds multiple occurrences', () => {
  const raw = 'محمد نبي و محمد هو الرسول';
  const matches = findMatches(raw, 'محمد');
  assert.equal(matches.length, 2);
});

test('highlightMatches wraps matches in mark tags', () => {
  const raw = 'قال أحمد';
  const out = highlightMatches(raw, 'احمد');
  assert.equal(out, 'قال <mark class="search-highlight">أحمد</mark>');
  assert.equal(highlightMatches(raw, 'لا شيء'), raw);
});
