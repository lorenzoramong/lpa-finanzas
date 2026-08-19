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

/* =========================================================
   COLECCIONES DISPONIBLES
   ========================================================= */

const STORES = [
  'movements',
  'categories',
  'settings',
  'projections',

  // Módulo financiero de Torneos
  'tournaments',
  'tournamentRegistrations',
  'tournamentTransactions',
  'players',
  'tournamentImports',

  // Módulo financiero de Academia
  'academyLocations',
  'academyCoaches',
  'academyPlayers',
  'academyCycles',
  'academyPayments'
];

/* =========================================================
   CONFIGURACIÓN BASE DE ACADEMIA
   ========================================================= */

export const DEFAULT_ACADEMY_LOCATIONS = [
  {
    id: 'ace-padel',
    name: 'Ace Padel',
    isActive: true
  },
  {
    id: 'padel-park',
    name: 'Padel Park',
    isActive: true
  }
];

export const ACADEMY_PLAYER_STATUSES = [
  {
    key: 'active',
    label: 'Activo'
  },
  {
    key: 'inactive',
    label: 'Inactivo'
  }
];

export const ACADEMY_PAYMENT_STATUSES = [
  {
    key: 'projected',
    label: 'Proyectado'
  },
  {
    key: 'pending',
    label: 'Pendiente'
  },
  {
    key: 'paid',
    label: 'Pagado'
  },
  {
    key: 'cancelled',
    label: 'Anulado'
  }
];

/* =========================================================
   CONCEPTOS FINANCIEROS PREDETERMINADOS
   ========================================================= */

export const DEFAULT_TOURNAMENT_INCOME_CONCEPTS = [
  {
    key: 'registrations',
    name: 'INSCRIPCIONES',
    type: 'income',
    isDefault: true
  },
  {
    key: 'sponsorships',
    name: 'PATROCINIOS',
    type: 'income',
    isDefault: true
  }
];

export const DEFAULT_TOURNAMENT_EXPENSE_CONCEPTS = [
  {
    key: 'courts',
    name: 'CANCHAS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'referee',
    name: 'REFEREE',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'assistants',
    name: 'AYUDANTES',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'branding',
    name: 'BRANDING + PROMOCIÓN IG',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'trophies',
    name: 'TROFEOS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'prizes',
    name: 'PREMIOS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'prizeKits',
    name: 'KITS PREMIOS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'chairs',
    name: 'SILLAS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'shirts',
    name: 'CAMISETAS',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'advertisingInstallation',
    name: 'POSTURA DE PUBLICIDAD',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'photographer',
    name: 'FOTÓGRAFO',
    type: 'expense',
    isDefault: true
  },
  {
    key: 'balls',
    name: 'PELOTAS',
    type: 'expense',
    isDefault: true
  }
];

/* =========================================================
   ESTADOS FINANCIEROS
   ========================================================= */

export const TOURNAMENT_TRANSACTION_STATUSES = [
  {
    key: 'projected',
    label: 'Proyectado'
  },
  {
    key: 'pending',
    label: 'Pendiente'
  },
  {
    key: 'partial',
    label: 'Parcial'
  },
  {
    key: 'completed',
    label: 'Pagado / Cobrado'
  },
  {
    key: 'cancelled',
    label: 'Anulado'
  }
];

export const TOURNAMENT_REGISTRATION_STATUSES = [
  {
    key: 'review',
    label: 'Por verificar'
  },
  {
    key: 'pending',
    label: 'Pendiente'
  },
  {
    key: 'partial',
    label: 'Parcial'
  },
  {
    key: 'paid',
    label: 'Pagado'
  },
  {
    key: 'courtesy',
    label: 'Cortesía'
  },
  {
    key: 'cancelled',
    label: 'Anulado'
  }
];

/* =========================================================
   RANGOS DE EDAD DEL FORMULARIO
   ========================================================= */

export const TOURNAMENT_AGE_RANGES = [
  {
    key: 'under18',
    label: 'Menor de 18 años'
  },
  {
    key: '18to28',
    label: 'Entre 18 y 28 años'
  },
  {
    key: '29to40',
    label: 'Entre 29 y 40 años'
  },
  {
    key: 'over41',
    label: 'Mayor de 41 años'
  }
];

/* =========================================================
   VALIDACIÓN DE COLECCIONES
   ========================================================= */

function validateStore(store) {
  if (!STORES.includes(store)) {
    throw new Error(`Colección no válida: ${store}`);
  }
}

/* =========================================================
   OPERACIONES GENERALES DE FIRESTORE
   ========================================================= */

export const db = {
  async getAll(store) {
    validateStore(store);

    const snapshot = await getDocs(
      collection(firestore, store)
    );

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  },

  async get(store, id) {
    validateStore(store);

    if (!id) {
      throw new Error(
        'Debes proporcionar un id para consultar el registro.'
      );
    }

    const snapshot = await getDoc(
      doc(firestore, store, id)
    );

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

    await setDoc(
      doc(firestore, store, id),
      data
    );

    return value;
  },

  async delete(store, id) {
    validateStore(store);

    if (!id) {
      throw new Error(
        'Debes proporcionar un id para eliminar el registro.'
      );
    }

    await deleteDoc(
      doc(firestore, store, id)
    );
  },

  async clear(store) {
    validateStore(store);

    const snapshot = await getDocs(
      collection(firestore, store)
    );

    if (snapshot.empty) {
      return;
    }

    const documents = snapshot.docs;
    const batchLimit = 450;

    for (
      let index = 0;
      index < documents.length;
      index += batchLimit
    ) {
      const batch = writeBatch(firestore);

      documents
        .slice(index, index + batchLimit)
        .forEach((document) => {
          batch.delete(document.ref);
        });

      await batch.commit();
    }
  }
};

/* =========================================================
   CREAR TRANSACCIONES PREDETERMINADAS DE UN TORNEO
   ========================================================= */

export async function seedTournamentTransactions(
  tournamentId,
  tournamentName
) {
  if (!tournamentId) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const existingTransactions = (
    await db.getAll('tournamentTransactions')
  ).filter(
    (transaction) =>
      transaction.tournamentId === tournamentId
  );

  const existingKeys = new Set(
    existingTransactions.map(
      (transaction) => transaction.conceptKey
    )
  );

  const now = new Date().toISOString();

  const defaultConcepts = [
    ...DEFAULT_TOURNAMENT_INCOME_CONCEPTS,
    ...DEFAULT_TOURNAMENT_EXPENSE_CONCEPTS
  ];

  for (const concept of defaultConcepts) {
    if (existingKeys.has(concept.key)) {
      continue;
    }

    await db.put('tournamentTransactions', {
      id: crypto.randomUUID(),
      tournamentId,
      tournamentName: tournamentName || '',
      conceptKey: concept.key,
      concept: concept.name,
      type: concept.type,
      isDefault: concept.isDefault,

      projectedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,

      status: 'projected',

      date: '',
      dueDate: '',
      provider: '',
      responsible: '',
      notes: '',

      movementId: null,

      createdAt: now,
      updatedAt: now
    });
  }
}

/* =========================================================
   CREAR TORNEO
   ========================================================= */

export async function createTournamentRecord(data) {
  const now = new Date().toISOString();

  const tournament = {
    id: data?.id || crypto.randomUUID(),

    name: data?.name?.trim() || '',
    edition: data?.edition?.trim() || '',
    season: data?.season?.trim() || '',
    venue: data?.venue?.trim() || '',

    startDate: data?.startDate || '',
    endDate: data?.endDate || '',

    status: data?.status || 'draft',

    registrationValue: Number(
      data?.registrationValue || 0
    ),

    projectedPairs: Number(
      data?.projectedPairs || 0
    ),

    projectedPlayers: Number(
      data?.projectedPlayers || 0
    ),

    notes: data?.notes?.trim() || '',

    createdAt: data?.createdAt || now,
    updatedAt: now
  };

  if (!tournament.name) {
    throw new Error(
      'El torneo debe tener un nombre.'
    );
  }

  await db.put('tournaments', tournament);

  await seedTournamentTransactions(
    tournament.id,
    tournament.name
  );

  return tournament;
}

/* =========================================================
   ELIMINAR TORNEO Y TODOS SUS REGISTROS RELACIONADOS
   ========================================================= */

export async function deleteTournamentCascade(
  tournamentId
) {
  if (!tournamentId) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const [
    registrations,
    transactions,
    imports,
    movements
  ] = await Promise.all([
    db.getAll('tournamentRegistrations'),
    db.getAll('tournamentTransactions'),
    db.getAll('tournamentImports'),
    db.getAll('movements')
  ]);

  const relatedRegistrations = registrations.filter(
    (registration) =>
      registration.tournamentId === tournamentId
  );

  const relatedTransactions = transactions.filter(
    (transaction) =>
      transaction.tournamentId === tournamentId
  );

  const relatedImports = imports.filter(
    (importSession) =>
      importSession.tournamentId === tournamentId
  );

  const relatedMovements = movements.filter(
    (movement) =>
      movement.source === 'tournament' &&
      movement.tournamentId === tournamentId
  );

  for (const movement of relatedMovements) {
    await db.delete('movements', movement.id);
  }

  for (const registration of relatedRegistrations) {
    await db.delete(
      'tournamentRegistrations',
      registration.id
    );
  }

  for (const transaction of relatedTransactions) {
    await db.delete(
      'tournamentTransactions',
      transaction.id
    );
  }

  for (const importSession of relatedImports) {
    await db.delete(
      'tournamentImports',
      importSession.id
    );
  }

  await db.delete('tournaments', tournamentId);
}

/* =========================================================
   INICIALIZACIÓN GENERAL
   ========================================================= */

export async function seedDatabase() {
  const categories = await db.getAll('categories');

  if (!categories.length) {
    await db.put('categories', {
      id: crypto.randomUUID(),
      name: 'APC',
      color: '#172A46',
      subcategories: ['Cancha'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const settings = await db.get(
    'settings',
    'general'
  );

  const academySettings = {
    cycleStartDay: 19,
    cycleEndDay: 19,
    playerStatuses:
      ACADEMY_PLAYER_STATUSES,
    paymentStatuses:
      ACADEMY_PAYMENT_STATUSES
  };

  if (!settings) {
    await db.put('settings', {
      id: 'general',

      initialBalance: 0,

      organizationName:
        'Liga de Padel del Atlántico',

      currency: 'COP',

      projectionTrafficLight: {
        yellowDays: 15,
        redDays: 0
      },

      tournamentSettings: {
        registrationStatuses:
          TOURNAMENT_REGISTRATION_STATUSES,

        transactionStatuses:
          TOURNAMENT_TRANSACTION_STATUSES,

        ageRanges:
          TOURNAMENT_AGE_RANGES
      },

      academySettings,

      updatedAt: new Date().toISOString()
    });
  } else if (!settings.academySettings) {
    await db.put('settings', {
      ...settings,
      id: 'general',
      academySettings,
      updatedAt: new Date().toISOString()
    });
  }

  const academyLocations = await db.getAll(
    'academyLocations'
  );

  if (!academyLocations.length) {
    const now = new Date().toISOString();

    for (const location of DEFAULT_ACADEMY_LOCATIONS) {
      await db.put('academyLocations', {
        ...location,
        coachId: null,
        createdAt: now,
        updatedAt: now
      });
    }
  }
}
