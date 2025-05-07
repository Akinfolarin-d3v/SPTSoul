// idb-helpers.js

const DB_NAME    = 'BeatStoreDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      // Recreate 'products' so each product is its own record, keyed by 'id'
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        // You can create indexes if needed, e.g. prodStore.createIndex('section', 'section');
      }
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
      }
    };
    rq.onsuccess = e => res(e.target.result);
    rq.onerror   = e => rej(e.target.error);
  });
}

// Add a single item to a store
async function idbAdd(store, item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.add(item);
    rq.onsuccess = () => res(rq.result);  // returns the new record's key
    rq.onerror   = () => rej(rq.error);
  });
}

// Get all items from a store
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

// Update (put) a single item
async function idbPut(store, item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.put(item);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

// Delete by id
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

export { idbAdd, idbGetAll, idbPut, idbDelete };
