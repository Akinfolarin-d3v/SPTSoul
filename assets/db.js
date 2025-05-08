



// assets/js/db.js
import { openDB } from 'https://unpkg.com/idb@7/build/esm/index.js';

export const initDB = () =>
  openDB('beatsDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('packs')) {
        db.createObjectStore('packs', { keyPath: 'id', autoIncrement: true });
      }
    }
  });

export async function savePack(pack) {
  const db = await initDB();
  return db.add('packs', pack);
}

export async function getAllPacks() {
  const db = await initDB();
  return db.getAll('packs');
}

export async function getPack(id) {
  const db = await initDB();
  return db.get('packs', id);
}
