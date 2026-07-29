import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';

import { db as firestore } from './firebase';

const STORES = ['movements', 'categories', 'settings'];

function validateStore(store) {
  if (!STORES.includes(store)) {
    throw new Error(`Colección no válida: ${store}`);
  }
}

export const db = {
  async getAll(store) {
    validateStore(store);

    const snapshot = await getDocs(collection(firestore, store));

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  },

  async get(store, id) {
    validateStore(store);

    const snapshot = await getDoc(doc(firestore, store, id));

    if (!snapshot.exists()) {
      return undefined;
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  },

  async put(store, value) {
    validateStore(store);

    if (!value?.id) {
      throw new Error('El registro debe tener un id.');
    }

    const { id, ...data } = value;

    await setDoc(doc(firestore, store, id), data);

    return value;
  },

  async delete(store, id) {
    validateStore(store);

    await deleteDoc(doc(firestore, store, id));
  },

  async clear(store) {
    validateStore(store);

    const snapshot = await getDocs(collection(firestore, store));
    const batch = writeBatch(firestore);

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
  }
};

export async function seedDatabase() {
  const categories = await db.getAll('categories');

  if (!categories.length) {
    await db.put('categories', {
      id: crypto.randomUUID(),
      name: 'APC',
      color: '#172A46',
      subcategories: ['Cancha'],
      createdAt: new Date().toISOString()
    });
  }

  const settings = await db.get('settings', 'general');

  if (!settings) {
    await db.put('settings', {
      id: 'general',
      initialBalance: 0,
      organizationName: 'Liga de Padel del Atlántico',
      currency: 'COP',
      updatedAt: new Date().toISOString()
    });
  }
}
