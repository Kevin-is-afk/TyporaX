(() => {
  'use strict';

  const { store, Sound, text: T } = window.TX;
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid) node.append(kid);
    return node;
  }

  const ICONS = {
    soundOn: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>'
  };

  /* ---------- settings ---------- */
  const settings = Object.assign(
    { sound: true, volume: 0.5, profile: 'typewriter', size: 22, showWpm: true, tourSeen: false, layout: 'page' },
    store.getSettings()
  );
  settings.theme = document.documentElement.dataset.theme;

  function saveSettings() { store.setSettings(settings); }

  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--type-size', settings.size + 'px');
    Sound.configure({ enabled: settings.sound, volume: settings.volume, profile: settings.profile });
    const btn = $('#btn-sound');
    btn.innerHTML = settings.sound ? ICONS.soundOn : ICONS.soundOff;
    btn.classList.toggle('off', !settings.sound);
    btn.setAttribute('aria-pressed', String(settings.sound));
    document.querySelectorAll('[data-theme-set]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === settings.theme)));
    $('#set-sound').checked = settings.sound;
    $('#set-profile').value = settings.profile;
    $('#set-profile').disabled = !settings.sound;
    $('#set-volume').value = settings.volume;
    $('#set-volume').disabled = !settings.sound;
    $('#set-size').value = settings.size;
    $('#set-wpm').checked = settings.showWpm;
    document.querySelectorAll('[data-layout]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.layout === settings.layout)));
    if (S.book && !S.done) paintStats();
  }

  function setSound(on) {
    settings.sound = on;
    Sound.unlock();
    applySettings(); saveSettings();
    if (on) Sound.play('key');
  }
  $('#btn-sound').addEventListener('click', () => { setSound(!settings.sound); blurButtons(); });
  $('#set-sound').addEventListener('change', e => setSound(e.target.checked));

  function setLayout(layout) {
    settings.layout = layout;
    applySettings(); saveSettings();
    if (view === 'read' && S.book && !S.done) layoutPage(false);
    blurButtons();
  }
  document.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.layout)));

  $('#btn-settings').innerHTML = ICONS.gear;
  $('#btn-tour').innerHTML = ICONS.help;
  document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
    settings.theme = b.dataset.themeSet; applySettings(); saveSettings();
  }));
  $('#set-profile').addEventListener('change', e => {
    settings.profile = e.target.value; applySettings(); saveSettings();
    Sound.unlock(); Sound.play('key');
  });
  $('#set-volume').addEventListener('input', e => {
    settings.volume = Number(e.target.value); applySettings(); saveSettings();
    Sound.unlock(); Sound.play('key');
  });
  $('#set-size').addEventListener('input', e => {
    settings.size = Number(e.target.value); applySettings(); saveSettings();
  });

  $('#set-wpm').addEventListener('change', e => {
    settings.showWpm = e.target.checked; applySettings(); saveSettings();
  });

  const panel = $('#settings');
  function toggleSettings(open = panel.hidden) {
    panel.hidden = !open;
    $('#btn-settings').setAttribute('aria-expanded', String(open));
  }
  $('#btn-settings').addEventListener('click', () => toggleSettings());
  document.addEventListener('pointerdown', e => {
    if (!panel.hidden && !e.target.closest('#settings, #btn-settings')) {
      toggleSettings(false);
      blurButtons();
    }
  });

  // Typing uses the whole page as the input, so a focused button must never swallow Space/Enter.
  function blurButtons() {
    const a = document.activeElement;
    if (a && a !== document.body && a.matches('button, a, select, input[type="range"]')) a.blur();
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------- formatting ---------- */
  const fmtNum = n => n.toLocaleString();
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const hrs = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60), sec = s % 60;
    if (hrs) return `${hrs}h ${String(min).padStart(2, '0')}m`;
    if (min) return `${min}m ${String(sec).padStart(2, '0')}s`;
    return `${sec}s`;
  }
  function hueFor(str) {
    let n = 0;
    for (const c of str) n = (n * 31 + c.charCodeAt(0)) % 360;
    return n;
  }

  /* ---------- library ---------- */
  const POPULAR = window.TX_BOOKS.map(b => {
    const text = T.normalize(b.text);
    return { ...b, text, length: text.length, words: T.countWords(text) };
  });

  function cover(book, tag = 'a') {
    return h(tag, { class: 'cover', style: `--h:${book.hue}`, href: `#/read/${encodeURIComponent(book.id)}`, 'aria-label': `Open ${book.title}` },
      h('span', { class: 'c-title', text: book.title }),
      h('span', { class: 'c-author', text: book.author || '' }));
  }

  function bookCard(book, prog) {
    const pct = prog ? Math.floor(Math.min(1, prog.pos / book.length) * 100) : 0;
    const finished = prog && prog.pos >= book.length;
    const meta = finished ? 'Finished' : pct > 0 ? `${pct}% typed` : `${fmtNum(book.words)} words`;
    const card = h('article', { class: 'card' },
      cover(book),
      h('div', { class: 'card-body' },
        h('div', { class: 'card-meta', text: meta }),
        pct > 0 ? h('div', { class: 'mini-bar' }, h('span', { style: `width:${pct}%` })) : null));
    if (book.user) {
      const del = h('button', { class: 'icon-btn del', type: 'button', title: 'Remove from library', 'aria-label': `Remove ${book.title}` });
      del.innerHTML = ICONS.trash;
      del.addEventListener('click', async () => {
        if (!confirm(`Remove "${book.title}" from your library? Your progress on it will be deleted too.`)) return;
        await store.deleteBook(book.id);
        toast('Removed from your library');
        renderHome();
      });
      card.append(del);
    }
    return card;
  }

  function resumeCard(book, prog) {
    const pct = Math.floor(Math.min(1, prog.pos / book.length) * 100);
    return h('a', { class: 'resume', href: `#/read/${encodeURIComponent(book.id)}` },
      cover(book, 'div'),
      h('div', {},
        h('h3', { text: book.title }),
        h('div', { class: 'card-meta', text: `${book.author ? book.author + ' · ' : ''}${pct}% typed` }),
        h('div', { class: 'mini-bar' }, h('span', { style: `width:${pct}%` }))));
  }

  async function renderHome() {
    const mine = (await store.listBooks()).map(m => ({ ...m, user: true }));
    const progress = store.allProgress();
    const everything = [...mine, ...POPULAR];

    const inProgress = everything
      .filter(b => progress[b.id] && progress[b.id].pos > 0 && progress[b.id].pos < b.length)
      .sort((a, b) => progress[b.id].updated - progress[a.id].updated);
    $('#sec-continue').hidden = inProgress.length === 0;
    $('#list-continue').replaceChildren(...inProgress.map(b => resumeCard(b, progress[b.id])));

    $('#list-mine').replaceChildren(...(mine.length
      ? mine.map(b => bookCard(b, progress[b.id]))
      : [h('div', { class: 'empty', text: 'Nothing here yet. Add a novel, an article or a favourite poem and it will wait for you here.' })]));

    $('#list-popular').replaceChildren(...POPULAR.map(b => bookCard(b, progress[b.id])));
  }

  /* ---------- typing session ---------- */
  const PAGE_CHARS = 460;       // characters per page in single-page mode
  const BOOK_PAGE_CHARS = 330;  // characters per page in open-book mode (two pages per spread)
  const wideScreen = window.matchMedia('(min-width: 860px)');

  // pageStart..leftEnd is the left (or only) page, leftEnd..pageEnd the right page of a spread.
  const S = {
    book: null, text: '', pos: 0, pageStart: 0, leftEnd: 0, pageEnd: 0,
    spans: [], marks: [], prog: null, done: false,
    sess: { keys: 0, errors: 0, correct: 0, ms: 0, last: 0 }
  };
  const pageEl = $('#page'), page2El = $('#page2'), wrapEl = $('.page-wrap');
  let saveTimer, statTimer;

  const bookMode = () => settings.layout === 'book' && wideScreen.matches;

  function pageEndFrom(start, size) {
    const { text } = S;
    let end = Math.min(text.length, start + size);
    if (end >= text.length) return text.length;
    const limit = Math.min(text.length, end + 40);
    while (end < limit && text[end] !== ' ' && text[end] !== '\n') end++;
    return Math.min(text.length, end + 1);
  }

  // Work out where the current page (or spread) ends for the active layout, then draw it.
  function layoutPage(animate) {
    const book = bookMode();
    const size = book ? BOOK_PAGE_CHARS : PAGE_CHARS;
    S.leftEnd = pageEndFrom(S.pageStart, size);
    S.pageEnd = book && S.leftEnd < S.text.length ? pageEndFrom(S.leftEnd, size) : S.leftEnd;
    // Switching from book to single page while typing on the right page: start a fresh page here.
    if (S.pos >= S.pageEnd && S.pos < S.text.length) {
      S.pageStart = S.pos; S.marks = [];
      return layoutPage(animate);
    }
    renderPage(animate, book);
  }

  wideScreen.addEventListener('change', () => { if (view === 'read' && S.book && !S.done) layoutPage(false); });

  // Begin typing at a character offset (used when opening, restarting and jumping).
  function startAt(pos) {
    S.pos = pos; S.done = false;
    S.pageStart = pos; S.marks = [];
    $('#done').hidden = true;
    wrapEl.hidden = false;
    layoutPage(true);
    paintStats();
    clearInterval(statTimer);
    statTimer = setInterval(paintStats, 1000);
  }

  function renderContext() {
    let ctx = S.text.slice(Math.max(0, S.pageStart - 240), S.pageStart).replace(/\n/g, ' ¶ ');
    if (S.pageStart > 240) ctx = ctx.slice(ctx.indexOf(' ') + 1);
    $('#context').textContent = S.pageStart > 0 ? '… ' + ctx.trim() : '';
  }

  function renderPage(animate, book) {
    S.spans = [];
    const frags = [document.createDocumentFragment(), document.createDocumentFragment()];
    let word = null, side = 0;
    for (let i = S.pageStart; i < S.pageEnd; i++) {
      if (i === S.leftEnd) { side = 1; word = null; }
      const frag = frags[side];
      const c = S.text[i];
      const span = h('span', { class: 'ch' });
      S.spans.push(span);
      const mark = S.marks[i - S.pageStart]; // keep what was already typed when the layout changes
      if (i < S.pos && mark) span.classList.add(mark === 1 ? 'ok' : 'bad');
      if (c === ' ' || c === '\n') {
        word = null;
        span.textContent = c === '\n' ? '↵' : ' ';
        if (c === '\n') span.classList.add('nl');
        frag.append(span);
        if (c === '\n') frag.append(h('span', { class: 'brk' }));
      } else {
        span.textContent = c;
        if (!word) { word = h('span', { class: 'w' }); frag.append(word); }
        word.append(span);
      }
    }
    pageEl.replaceChildren(frags[0]);
    page2El.replaceChildren(frags[1]);
    page2El.hidden = !book;
    $('#sheet').classList.toggle('book', book);
    $('#view-read').classList.toggle('is-book', book);
    renderContext();
    placeCursor();
    if (animate) {
      for (const el of [pageEl, page2El]) {
        el.classList.remove('turn');
        void el.offsetWidth;
        el.classList.add('turn');
      }
    }
  }

  function placeCursor() {
    wrapEl.querySelectorAll('.cur').forEach(n => n.classList.remove('cur'));
    const span = S.spans[S.pos - S.pageStart];
    if (span) span.classList.add('cur');
  }

  // A faint live-speed readout floating just above the cursor.
  function placeTip(wpm) {
    const tip = $('#wpm-tip');
    const span = S.spans[S.pos - S.pageStart];
    if (!settings.showWpm || wpm === null || !span || wrapEl.hidden) { tip.hidden = true; return; }
    const wrap = wrapEl.getBoundingClientRect();
    const r = span.getBoundingClientRect();
    tip.textContent = `${wpm} wpm`;
    tip.hidden = false;
    tip.style.left = (r.left - wrap.left + r.width / 2) + 'px';
    tip.style.top = (r.top - wrap.top) + 'px';
  }
  window.addEventListener('resize', () => { if (view === 'read' && !S.done) paintStats(); });

  function paintStats() {
    const { sess, prog } = S;
    const min = sess.ms / 60000;
    const wpm = sess.ms > 3000 ? Math.max(0, Math.round(sess.correct / 5 / min)) : null;
    $('#st-wpm').textContent = wpm === null ? '--' : wpm;
    placeTip(wpm);
    $('#st-acc').textContent = sess.keys ? Math.max(0, Math.round((1 - sess.errors / sess.keys) * 100)) : '--';
    $('#st-time').textContent = fmtTime(prog.ms);
    const pct = S.text.length ? S.pos / S.text.length * 100 : 0;
    $('#st-pct').textContent = pct >= 99.5 && pct < 100 ? 99 : Math.round(pct);
    $('#bar-fill').style.width = pct + '%';
    $('.bar').setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  function saveNow() {
    clearTimeout(saveTimer);
    if (!S.book || !S.prog) return;
    S.prog.pos = S.pos;
    S.prog.updated = Date.now();
    store.setProgress(S.book.id, S.prog);
  }
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); };

  async function openBook(id) {
    let book = POPULAR.find(b => b.id === id);
    let text;
    if (book) {
      text = book.text;
    } else {
      const meta = await store.getMeta(id);
      text = meta && await store.getText(id);
      if (!meta || !text) { toast('That book is no longer in your library.'); location.hash = '#/'; return; }
      book = { ...meta, user: true };
    }

    const saved = store.getProgress(id);
    S.book = book; S.text = text;
    S.prog = { pos: 0, ms: 0, started: Date.now(), updated: Date.now(), ...saved };
    S.pos = Math.min(S.prog.pos, text.length);
    S.sess = { keys: 0, errors: 0, correct: 0, ms: 0, last: 0 };
    S.done = false;

    $('#read-title').textContent = book.title;
    $('#read-author').textContent = book.author || '';
    document.title = `${book.title} - TyporaX`;
    showView('read');
    $('#sheet').classList.remove('finished');

    if (S.pos >= text.length) { finish(true); return; }
    startAt(S.pos);
    if (S.pos > 0) toast(`Welcome back. Continuing from ${Math.round(S.pos / text.length * 100)}%.`);
  }

  function finish(silent) {
    S.done = true;
    S.pos = S.text.length;
    saveNow();
    clearInterval(statTimer);
    paintStats();
    const { sess, prog } = S;
    const acc = sess.keys ? Math.max(0, Math.round((1 - sess.errors / sess.keys) * 100)) : null;
    $('#done-stats').textContent = sess.keys
      ? `${fmtTime(prog.ms)} in total · ${acc}% accuracy this session`
      : `You've already typed all of ${S.book.title}. ${fmtTime(prog.ms)} spent in total.`;
    wrapEl.hidden = true;
    $('#context').textContent = '';
    $('#done').hidden = false;
    if (!silent) Sound.play('done');
  }

  function restart() {
    if (!confirm(`Start "${S.book.title}" from the beginning? Your saved progress on it will be reset.`)) return;
    S.prog = { pos: 0, ms: 0, started: Date.now(), updated: Date.now() };
    S.sess = { keys: 0, errors: 0, correct: 0, ms: 0, last: 0 };
    S.pos = 0;
    saveNow();
    startAt(0);
    blurButtons();
  }
  $('#btn-restart').addEventListener('click', restart);
  $('#btn-again').addEventListener('click', restart);

  function tick() {
    const now = performance.now();
    // Only count gaps shorter than 4s so pausing to think or read doesn't tank your speed.
    if (S.sess.last && now - S.sess.last < 4000) {
      const gap = now - S.sess.last;
      S.sess.ms += gap;
      S.prog.ms += gap;
    }
    S.sess.last = now;
  }

  function typeChar(ch) {
    const idx = S.pos - S.pageStart;
    const expected = S.text[S.pos];
    const ok = ch === expected;
    tick();
    S.sess.keys++;
    if (ok) S.sess.correct++; else S.sess.errors++;
    S.marks[idx] = ok ? 1 : 2;
    const span = S.spans[idx];
    span.classList.add(ok ? 'ok' : 'bad');
    S.pos++;

    Sound.play(!ok ? 'error' : ch === '\n' ? 'return' : ch === ' ' ? 'space' : 'key');

    if (S.pos >= S.pageEnd) {
      if (S.pos >= S.text.length) { finish(false); return; }
      S.pageStart = S.pos; S.marks = [];
      layoutPage(true);
      if (ch !== '\n') Sound.play('page');
      saveNow();
    } else {
      placeCursor();
      saveSoon();
    }
    paintStats();
  }

  // word=true (Ctrl/Alt+Backspace) removes the whole word before the cursor, plus any spaces after it.
  function backspace(word = false) {
    if (S.pos <= S.pageStart) return;
    let target = S.pos - 1;
    if (word) {
      const gap = i => S.text[i] === ' ' || S.text[i] === '\n';
      target = S.pos;
      while (target > S.pageStart && gap(target - 1)) target--;
      while (target > S.pageStart && !gap(target - 1)) target--;
    }
    while (S.pos > target) {
      S.pos--;
      const idx = S.pos - S.pageStart;
      if (S.marks[idx] === 1) S.sess.correct--;
      S.marks[idx] = 0;
      S.spans[idx].classList.remove('ok', 'bad');
    }
    tick();
    Sound.play('back');
    placeCursor();
    paintStats();
    saveSoon();
  }

  document.addEventListener('keydown', e => {
    if (tour) { tourKey(e); return; }
    if (e.key === 'Escape') {
      if (!panel.hidden) { toggleSettings(false); return; }
      if (view === 'read' && !document.querySelector('dialog[open]')) location.hash = '#/';
      return;
    }
    if (view !== 'read' || S.done) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    // AltGr (reported as Ctrl+Alt) is how many layouts type @, {, [ and similar, so it must still type.
    const altGr = e.getModifierState && e.getModifierState('AltGraph');
    const mod = (e.ctrlKey || e.metaKey || e.altKey) && !altGr;

    let ch = null;
    if (e.key === 'Backspace') { e.preventDefault(); Sound.unlock(); backspace(mod); return; }
    if (mod) return;
    else if (e.key === 'Enter') ch = '\n';
    else if (e.key.length === 1) ch = e.key;
    if (ch === null) return;

    e.preventDefault();
    Sound.unlock();
    if (!panel.hidden) toggleSettings(false);
    typeChar(ch);
  });

  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  /* ---------- "Start from..." : jump to a chapter, a point in the book, or a phrase ---------- */
  const jumpDlg = $('#dlg-jump');
  const J = { target: 0, lower: null };

  const NUM_WORDS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last|final';
  const HEAD_A = new RegExp(`^(?:chapter|part|book|volume|section|act|scene|letter|canto|stave)\\s+(?:\\d+|[ivxlcdm]+|${NUM_WORDS})\\b`, 'i');
  const HEAD_B = /^(?:prologue|epilogue|preface|introduction|foreword|afterword|prelude|interlude|appendix|dedication)\b/i;
  const HEAD_C = /^(?:[IVXLCDM]{1,8}|\d{1,3})[.:)]?$/;

  // Chapter-like headings are short paragraphs such as "Chapter 2", "PREFACE" or a bare "XII."
  function findChapters() {
    const paras = [];
    let at = 0;
    for (const p of S.text.split('\n')) { paras.push({ p, at }); at += p.length + 1; }
    const found = [];
    paras.forEach(({ p, at }, i) => {
      if (p.length > 80 || !(HEAD_A.test(p) || HEAD_B.test(p) || HEAD_C.test(p))) return;
      let title = p;
      const next = paras[i + 1];
      if (next && p.length <= 25 && next.p.length <= 60 && !HEAD_A.test(next.p)) title += ' – ' + next.p;
      found.push({ title: title.slice(0, 80), at });
    });
    return found;
  }

  const snippet = (pos, n) => S.text.slice(pos, pos + n).replace(/\n/g, ' ¶ ') + (pos + n < S.text.length ? '…' : '');
  const snapToParagraph = pos => S.text.lastIndexOf('\n', pos - 1) + 1;

  function jumpItem(label, at, hint) {
    return h('button', { class: 'jump-item', type: 'button', 'data-pos': String(at), 'aria-pressed': 'false', onclick: () => setTarget(at) },
      h('span', { class: 'jump-label', text: label }),
      hint ? h('span', { class: 'jump-hint', text: hint }) : null);
  }

  function setTarget(pos, { moveSlider = true } = {}) {
    J.target = Math.max(0, Math.min(pos, S.text.length - 1));
    const pct = J.target / S.text.length * 100;
    if (moveSlider) $('#jump-range').value = Math.round(pct * 10);
    $('#jump-pct').textContent = `${pct.toFixed(1)}% into the book`;
    $('#jump-snippet').textContent = snippet(J.target, 170);
    jumpDlg.querySelectorAll('.jump-item').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pos) === J.target)));
  }

  function openJump() {
    if (!S.book) return;
    const chapters = findChapters();
    const list = $('#jump-chapters');
    list.replaceChildren(
      jumpItem('Beginning of the book', 0),
      ...chapters.filter(c => c.at > 0).map(c => jumpItem(c.title, c.at, Math.round(c.at / S.text.length * 100) + '%')));
    $('#jump-nochap').hidden = chapters.length > 0;
    J.lower = null;
    $('#jump-search').value = '';
    $('#jump-results').replaceChildren();
    setTarget(S.done ? 0 : S.pos);
    jumpDlg.showModal();
  }

  function searchBook() {
    const q = $('#jump-search').value.trim().toLowerCase().replace(/\s+/g, ' ');
    const out = $('#jump-results');
    if (q.length < 3) { out.replaceChildren(); return; }
    J.lower = J.lower || S.text.toLowerCase();
    const hits = [];
    for (let i = J.lower.indexOf(q); i !== -1 && hits.length < 8; i = J.lower.indexOf(q, i + q.length)) hits.push(i);
    out.replaceChildren(...(hits.length
      ? hits.map(at => jumpItem(snippet(at, 90), at, Math.round(at / S.text.length * 100) + '%'))
      : [h('p', { class: 'count', text: 'No matches. Try fewer or different words.' })]));
    if (hits.length) setTarget(hits[0]);
  }

  function jumpTo(pos) {
    S.sess.last = 0;
    startAt(pos);
    saveNow();
    toast(`Starting from ${Math.round(pos / S.text.length * 100)}% into the book`);
  }

  $('#btn-jump').addEventListener('click', () => { openJump(); blurButtons(); });
  $('#jump-range').addEventListener('input', e => {
    setTarget(snapToParagraph(Math.round(Number(e.target.value) / 1000 * S.text.length)), { moveSlider: false });
  });
  let searchTimer;
  $('#jump-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchBook, 200); });
  $('#jump-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); searchBook(); }
  });
  $('#jump-close').addEventListener('click', () => jumpDlg.close());
  $('#jump-cancel').addEventListener('click', () => jumpDlg.close());
  jumpDlg.addEventListener('click', e => { if (e.target === jumpDlg) jumpDlg.close(); });
  $('#form-jump').addEventListener('submit', e => {
    e.preventDefault();
    jumpDlg.close();
    jumpTo(J.target);
  });

  /* ---------- add-text dialog ---------- */
  const dlg = $('#dlg-add');
  const form = $('#form-add');
  const drop = $('#drop');
  $('#btn-add').addEventListener('click', () => { form.reset(); resetDrop(); showError(''); updateCount(); dlg.showModal(); $('#add-title').focus(); });
  $('#dlg-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  function showError(msg) { const el = $('#add-error'); el.textContent = msg; el.hidden = !msg; }
  function resetDrop() {
    drop.classList.remove('has-file', 'over');
    drop.querySelector('strong').textContent = 'Drop a .txt file here';
    drop.querySelector('span').textContent = 'or click to choose one';
  }
  function updateCount() {
    const n = T.countWords($('#add-text').value);
    $('#add-count').textContent = `${fmtNum(n)} word${n === 1 ? '' : 's'}`;
  }
  $('#add-text').addEventListener('input', updateCount);

  async function loadFile(file) {
    if (!file) return;
    if (!/\.(txt|text|md)$/i.test(file.name) && !file.type.startsWith('text/')) {
      showError('Please choose a plain-text (.txt) file. EPUB and PDF files can be converted to .txt first.');
      return;
    }
    showError('');
    try {
      $('#add-text').value = await file.text();
      updateCount();
      drop.classList.add('has-file');
      drop.querySelector('strong').textContent = file.name;
      drop.querySelector('span').textContent = 'loaded, you can still edit it below';
      if (!$('#add-title').value.trim()) {
        $('#add-title').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      }
    } catch {
      showError('Could not read that file.');
    }
  }
  $('#add-file').addEventListener('change', e => loadFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('#add-title').value.trim();
    const text = T.normalize($('#add-text').value);
    if (!title) { showError('Give it a title.'); return; }
    if (text.length < 40) { showError('That is too short to practise on. Paste or upload a bit more text.'); return; }

    const meta = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      author: $('#add-author').value.trim(),
      hue: hueFor(title),
      length: text.length,
      words: T.countWords(text),
      added: Date.now()
    };
    await store.addBook(meta, text);
    dlg.close();
    if (!store.isPersistent()) toast('Your browser blocked local storage, so this book will vanish when you close the tab.');
    if ($('#add-start').checked) { location.hash = `#/read/${encodeURIComponent(meta.id)}`; }
    else { toast(`"${title}" added to your library`); renderHome(); }
  });

  /* ---------- routing ---------- */
  let view = 'home';
  function showView(name) {
    view = name;
    if (name !== 'home' && !tourAsk.hidden) { tourAsk.hidden = true; asked = false; } // ask again next time they are home
    $('#view-home').hidden = name !== 'home';
    $('#view-read').hidden = name !== 'read';
    window.scrollTo(0, 0);
  }

  async function route() {
    saveNow();
    clearInterval(statTimer);
    toggleSettings(false);
    blurButtons();
    const m = location.hash.match(/^#\/read\/(.+)$/);
    if (m) {
      await openBook(decodeURIComponent(m[1]));
    } else {
      S.book = null;
      document.title = 'TyporaX - type the books you love';
      showView('home');
      renderHome();
      maybeAskTour();
    }
    window.dispatchEvent(new Event('tx:routed'));
  }
  window.addEventListener('hashchange', route);

  /* ---------- guided tour (only starts when the user says yes) ---------- */
  const TOUR_STEPS = [
    { view: 'home', target: '#sec-popular', title: 'Pick a classic',
      body: 'Choose a popular book and start typing right away. These are opening excerpts of public-domain favourites.' },
    { view: 'home', target: '#btn-add', title: 'Bring your own book',
      body: 'Upload a .txt file or paste any text, like the novel you are reading. It stays in your browser and shows up under Your library.' },
    { view: 'home', target: '#btn-settings', title: 'Make it yours',
      body: 'Switch between the Paper and Lamplight themes, turn the typing sound on or off, pick its style and volume, resize the text, and show or hide the live speed readout.' },
    { view: 'read', target: '#sheet', title: 'Type what you read',
      body: 'Grey text is still to come, correct letters turn dark and mistakes turn red. Backspace fixes a letter, Ctrl+Backspace removes a whole word, and Enter moves past each ↵ paragraph break.' },
    { view: 'read', target: '.layout-seg', title: 'Page or open book',
      body: 'Switch between a single page and an open-book spread with two pages side by side. Book mode needs a wide window.' },
    { view: 'read', target: '#btn-jump', title: 'Start anywhere',
      body: 'Want to skip the preface? Use Start from… to jump to a chapter, to any point in the book, or to a phrase you search for.' },
    { view: 'read', target: '#stats', title: 'Watch your progress',
      body: 'Speed, accuracy and time are tracked as you go. The faint number above your cursor is your live speed.' },
    { view: 'read', target: '.back', title: 'Leave any time',
      body: 'Your place is saved automatically. Come back through Continue reading and you will land on the exact sentence you stopped at. Esc also returns to the library.' }
  ];

  const tourRoot = $('#tour'), tourSpot = $('#tour-spot'), tourCard = $('#tour-card'), tourAsk = $('#tour-ask');
  let tour = null;
  let asked = false;

  function maybeAskTour() {
    if (settings.tourSeen || asked || tour) return;
    asked = true;
    setTimeout(() => { if (view === 'home' && !tour) tourAsk.hidden = false; }, 900);
  }
  function dismissAsk() {
    tourAsk.hidden = true;
    settings.tourSeen = true;
    saveSettings();
  }
  $('#ask-yes').addEventListener('click', () => { dismissAsk(); startTour(); });
  $('#ask-no').addEventListener('click', () => { dismissAsk(); toast('No problem. The ? button in the top bar starts the tour any time.'); blurButtons(); });
  $('#btn-tour').addEventListener('click', () => { dismissAsk(); startTour(); });

  const routed = () => new Promise(resolve => {
    const t = setTimeout(resolve, 1500);
    window.addEventListener('tx:routed', () => { clearTimeout(t); resolve(); }, { once: true });
  });

  async function enterView(name) {
    if (name === 'home' && view !== 'home') {
      const done = routed(); location.hash = '#/'; await done;
    } else if (name === 'read' && view !== 'read') {
      const back = tour.returnHash.match(/^#\/read\/(.+)$/);
      const demo = back ? decodeURIComponent(back[1])
        : (POPULAR.find(b => !store.getProgress(b.id)) || POPULAR[0]).id;
      const done = routed(); location.hash = `#/read/${encodeURIComponent(demo)}`; await done;
    }
    await new Promise(r => setTimeout(r, 40)); // let the new view lay out
  }

  const visible = el => (el && el.getClientRects().length ? el : null);

  function startTour() {
    if (tour) return;
    toggleSettings(false);
    tourAsk.hidden = true;
    tour = { i: 0, token: 0, returnHash: location.hash || '#/' };
    tourRoot.hidden = false;
    showStep(0);
    blurButtons();
  }

  async function showStep(i) {
    const token = ++tour.token;
    tour.i = i;
    const step = TOUR_STEPS[i];
    await enterView(step.view);
    if (!tour || token !== tour.token) return;

    const last = i === TOUR_STEPS.length - 1;
    tourCard.replaceChildren(
      h('div', { class: 'tour-count', text: `${i + 1} of ${TOUR_STEPS.length}` }),
      h('h3', { text: step.title }),
      h('p', { text: step.body }),
      h('div', { class: 'tour-actions' },
        last ? null : h('button', { class: 'link-btn', type: 'button', text: 'Skip tour', onclick: () => endTour() }),
        h('span', { class: 'spacer' }),
        i > 0 ? h('button', { class: 'btn', type: 'button', text: 'Back', onclick: () => showStep(i - 1) }) : null,
        h('button', { class: 'btn primary', type: 'button', text: last ? 'Done' : 'Next', onclick: () => (last ? endTour() : showStep(i + 1)) })));

    const target = visible($(step.target));
    if (target) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    positionTour();
    tourCard.querySelector('.btn.primary').focus({ preventScroll: true });
  }

  function positionTour() {
    if (!tour) return;
    const target = visible($(TOUR_STEPS[tour.i].target));
    const pad = 8, margin = 12;
    const cw = tourCard.offsetWidth, ch = tourCard.offsetHeight;
    let top, left;
    if (target) {
      const r = target.getBoundingClientRect();
      const spotTop = Math.max(r.top - pad, 6), spotBottom = Math.min(r.bottom + pad, innerHeight - 6);
      Object.assign(tourSpot.style, {
        left: r.left - pad + 'px', top: spotTop + 'px',
        width: r.width + pad * 2 + 'px', height: spotBottom - spotTop + 'px'
      });
      top = r.bottom + pad + 14;
      if (top + ch > innerHeight - margin) top = r.top - pad - 14 - ch;
      if (top < margin) top = Math.max(margin, innerHeight - ch - 16); // target too tall: dock at the bottom
      left = Math.min(Math.max(r.left + r.width / 2 - cw / 2, margin), innerWidth - cw - margin);
    } else {
      Object.assign(tourSpot.style, { left: '50%', top: '50%', width: '0', height: '0' });
      top = (innerHeight - ch) / 2; left = (innerWidth - cw) / 2;
    }
    tourCard.style.top = top + 'px';
    tourCard.style.left = left + 'px';
  }
  window.addEventListener('resize', positionTour);

  function endTour() {
    if (!tour) return;
    const back = tour.returnHash;
    tour = null;
    tourRoot.hidden = true;
    settings.tourSeen = true;
    saveSettings();
    if (location.hash !== back && !(back === '#/' && !location.hash)) location.hash = back;
    blurButtons();
  }

  function tourKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); endTour(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (tour.i < TOUR_STEPS.length - 1) showStep(tour.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (tour.i > 0) showStep(tour.i - 1); }
  }

  /* ---------- boot ---------- */
  applySettings();
  store.ready().then(ok => { if (!ok) toast('Browser storage is unavailable. Uploaded books will not be saved.'); });
  route();
})();
