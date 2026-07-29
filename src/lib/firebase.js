import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD23opXF8-8uXihIww0-UBUB2p0YJh8F4c',
  authDomain: 'lpa-finanzas-d4466.firebaseapp.com',
  projectId: 'lpa-finanzas-d4466',
  storageBucket: 'lpa-finanzas-d4466.firebasestorage.app',
  messagingSenderId: '150365935334',
  appId: '1:150365935334:web:a2325eb5ad2d100373cd27'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
