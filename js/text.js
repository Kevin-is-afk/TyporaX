/* Turns arbitrary pasted/uploaded text into something that can be typed on a keyboard:
   straight quotes, plain dashes, ASCII only, paragraphs separated by a single "\n". */
(() => {
  const MAP = {
    '‘': "'", '’': "'", '‚': "'", '‛': "'",
    '“': '"', '”': '"', '„': '"', '‟': '"',
    '–': '-', '—': '--', '―': '--', '−': '-',
    '…': '...', '•': '*'
  };
  const FANCY = /[‘-‟–-―−…•]/g;
  const SPACES = /[   -​  　]/g;

  function normalize(raw) {
    let t = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');

    // Project Gutenberg licence header/footer.
    const start = t.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
    if (start >= 0) t = t.slice(t.indexOf('\n', start) + 1);
    const end = t.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
    if (end >= 0) t = t.slice(0, end);

    t = t.replace(FANCY, c => MAP[c]).replace(SPACES, ' ')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\t/g, ' ').replace(/[^\x20-\x7E\n]/g, '');

    // Blank lines separate paragraphs; if there are none, every line is a paragraph.
    const paras = /\n[ ]*\n/.test(t) ? t.split(/\n[ ]*\n/) : t.split('\n');
    return paras.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  }

  const countWords = t => (t.match(/\S+/g) || []).length;

  window.TX = window.TX || {};
  window.TX.text = { normalize, countWords };
})();
