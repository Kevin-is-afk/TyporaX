/* Local-only persistence.
   - Uploaded books (metadata + full text): IndexedDB, so large novels fit.
   - Reading progress and settings: localStorage, so they can be saved synchronously on unload.
   If IndexedDB is unavailable the library falls back to memory for the current tab only. */
(() => {
  const LS = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    }
  };

  const mem = { meta: new Map(), texts: new Map() };
  let dbPromise = null;
  let persistent = true;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open('typorax', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta', { keyPath: 'id' });
        req.result.createObjectStore('texts');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { persistent = false; });
    return dbPromise;
  }

  const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

  async function listBooks() {
    try {
      const d = await db();
      const all = await wrap(d.transaction('meta').objectStore('meta').getAll());
      return all.sort((a, b) => b.added - a.added);
    } catch {
      return [...mem.meta.values()].sort((a, b) => b.added - a.added);
    }
  }

  async function getMeta(id) {
    try { return (await wrap((await db()).transaction('meta').objectStore('meta').get(id))) || null; }
    catch { return mem.meta.get(id) || null; }
  }

  async function getText(id) {
    try { return await wrap((await db()).transaction('texts').objectStore('texts').get(id)); }
    catch { return mem.texts.get(id); }
  }

  async function addBook(meta, text) {
    try {
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction(['meta', 'texts'], 'readwrite');
        tx.objectStore('meta').put(meta);
        tx.objectStore('texts').put(text, meta.id);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } catch {
      persistent = false;
      mem.meta.set(meta.id, meta);
      mem.texts.set(meta.id, text);
    }
  }

  async function deleteBook(id) {
    mem.meta.delete(id); mem.texts.delete(id);
    try {
      const d = await db();
      await new Promise((resolve, reject) => {
        const tx = d.transaction(['meta', 'texts'], 'readwrite');
        tx.objectStore('meta').delete(id);
        tx.objectStore('texts').delete(id);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } catch { /* memory fallback already cleared */ }
    clearProgress(id);
  }

  const PROGRESS_KEY = 'typorax:progress';
  const allProgress = () => LS.get(PROGRESS_KEY, {});
  const getProgress = id => allProgress()[id] || null;
  function setProgress(id, value) {
    const all = allProgress();
    all[id] = value;
    LS.set(PROGRESS_KEY, all);
  }
  function clearProgress(id) {
    const all = allProgress();
    delete all[id];
    LS.set(PROGRESS_KEY, all);
  }

  const SETTINGS_KEY = 'typorax:settings';
  const getSettings = () => LS.get(SETTINGS_KEY, {});
  const setSettings = value => LS.set(SETTINGS_KEY, value);

  // Ask the browser not to evict our data under storage pressure (best effort).
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* ignore */ }

  window.TX = window.TX || {};
  window.TX.store = {
    listBooks, getMeta, getText, addBook, deleteBook,
    allProgress, getProgress, setProgress, clearProgress,
    getSettings, setSettings,
    isPersistent: () => persistent,
    ready: () => db().then(() => true, () => false)
  };
})();
