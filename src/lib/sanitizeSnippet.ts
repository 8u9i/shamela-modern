const MARK = '\uE000';
const MARK_CLOSE = '\uE001';

// SQLite FTS `snippet()` returns raw book content wrapped in <mark> tags.
// Book text is network-sourced, so it must not carry HTML into the page:
// escape everything except the match markers, then re-emit only <mark>.
export function sanitizeSnippet(html: string): string {
  if (!html) return '';
  return html
    .replace(/<mark>|<\/mark>/gi, (m) => (m.toLowerCase() === '</mark>' ? MARK_CLOSE : MARK))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(new RegExp(MARK, 'g'), '<mark>')
    .replace(new RegExp(MARK_CLOSE, 'g'), '</mark>');
}
