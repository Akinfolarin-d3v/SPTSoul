// idb-helpers.js

const DB_NAME    = 'BeatStoreDB';
const DB_VERSION = 3;

function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
      }
    };
    rq.onsuccess = e => res(e.target.result);
    rq.onerror   = e => rej(e.target.error);
  });
}

async function idbAdd(store, item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.add(item);
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function idbGetAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const rq = os.getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}


async function idbDelete(store, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.delete(id);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

// Expose helpers globally for classic scripts
window.idbAdd    = idbAdd;
window.idbGetAll = idbGetAll;
window.idbDelete = idbDelete;


