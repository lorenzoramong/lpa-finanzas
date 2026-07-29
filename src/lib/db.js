const DB_NAME = 'lpa-finanzas-db';
const DB_VERSION = 1;
const STORES = ['movements', 'categories', 'settings'];

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = () => resolve(result?.result ?? result);
    tx.onerror = () => reject(tx.error);
  });
}

export const db = {
  getAll: (store) => withStore(store, 'readonly', (s) => s.getAll()),
  get: (store, id) => withStore(store, 'readonly', (s) => s.get(id)),
  put: (store, value) => withStore(store, 'readwrite', (s) => s.put(value)),
  delete: (store, id) => withStore(store, 'readwrite', (s) => s.delete(id)),
  clear: (store) => withStore(store, 'readwrite', (s) => s.clear()),
};

export async function seedDatabase() {
  const categories = await db.getAll('categories');
  if (!categories.length) {
    await db.put('categories', {
      id: crypto.randomUUID(),
      name: 'APC',
      color: '#172A46',
      subcategories: ['Cancha'],
      createdAt: new Date().toISOString(),
    });
  }
  const settings = await db.get('settings', 'general');
  if (!settings) {
    await db.put('settings', {
      id: 'general',
      initialBalance: 0,
      organizationName: 'Liga de Padel del Atlántico',
      currency: 'COP',
      updatedAt: new Date().toISOString(),
    });
  }
}
