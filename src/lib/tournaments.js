import {
  createTournamentRecord,
  db,
  deleteTournamentCascade,
  seedTournamentTransactions
} from './db';

/* =========================================================
   UTILIDADES
   ========================================================= */

function nowISO() {
  return new Date().toISOString();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isCompletedTransaction(transaction) {
  return transaction?.status === 'completed';
}

function isPaidRegistration(registration) {
  return registration?.paymentStatus === 'paid';
}

function getTransactionMovementAmount(transaction) {
  const actualAmount = toNumber(
    transaction?.actualAmount
  );

  const paidAmount = toNumber(
    transaction?.paidAmount
  );

  if (paidAmount > 0) {
    return paidAmount;
  }

  return actualAmount;
}

function getRegistrationMovementAmount(registration) {
  const paidAmount = toNumber(
    registration?.paidAmount
  );

  if (paidAmount > 0) {
    return paidAmount;
  }

  return toNumber(
    registration?.registrationValue ||
      registration?.amount
  );
}

/* =========================================================
   CARGA DEL MÓDULO
   ========================================================= */

export async function loadTournamentModule() {
  const [
    tournaments,
    transactions,
    registrations,
    players,
    imports
  ] = await Promise.all([
    db.getAll('tournaments'),
    db.getAll('tournamentTransactions'),
    db.getAll('tournamentRegistrations'),
    db.getAll('players'),
    db.getAll('tournamentImports')
  ]);

  return {
    tournaments: tournaments || [],
    transactions: transactions || [],
    registrations: registrations || [],
    players: players || [],
    imports: imports || []
  };
}

/* =========================================================
   TORNEOS
   ========================================================= */

export async function saveTournamentRecord(data) {
  const existingTournament = data?.id
    ? await db.get('tournaments', data.id)
    : null;

  const tournament = await createTournamentRecord({
    ...existingTournament,
    ...data,
    id: data?.id || existingTournament?.id,
    name: normalizeText(data?.name),
    edition: normalizeText(data?.edition),
    season: normalizeText(data?.season),
    venue: normalizeText(data?.venue),
    registrationValue: toNumber(
      data?.registrationValue
    ),
    projectedPairs: toNumber(
      data?.projectedPairs
    ),
    projectedPlayers: toNumber(
      data?.projectedPlayers
    ),
    notes: normalizeText(data?.notes),
    createdAt:
      existingTournament?.createdAt ||
      data?.createdAt ||
      nowISO()
  });

  await seedTournamentTransactions(
    tournament.id,
    tournament.name
  );

  return tournament;
}

export async function removeTournamentRecord(
  tournamentId
) {
  await deleteTournamentCascade(tournamentId);
}

/* =========================================================
   MOVIMIENTOS GENERADOS POR TORNEOS
   ========================================================= */

async function ensureTournamentCategory() {
  const categories = await db.getAll('categories');

  const existingCategory = categories.find(
    (category) =>
      normalizeText(category.name).toLowerCase() ===
      'torneos'
  );

  if (existingCategory) {
    return existingCategory;
  }

  const now = nowISO();

  const category = {
    id: crypto.randomUUID(),
    name: 'Torneos',
    color: '#3478C8',
    subcategories: [
      'Inscripciones',
      'Patrocinios',
      'Canchas',
      'Referee',
      'Ayudantes',
      'Branding + Promoción IG',
      'Trofeos',
      'Premios',
      'Kits premios',
      'Sillas',
      'Camisetas',
      'Postura de publicidad',
      'Fotógrafo',
      'Pelotas',
      'Otros ingresos',
      'Otros egresos'
    ],
    createdAt: now,
    updatedAt: now
  };

  await db.put('categories', category);

  return category;
}

function buildTournamentMovement({
  sourceRecord,
  tournament,
  existingMovement,
  sourceRecordType
}) {
  const isRegistration =
    sourceRecordType === 'registration';

  const type = isRegistration
    ? 'income'
    : sourceRecord.type;

  const amount = isRegistration
    ? getRegistrationMovementAmount(sourceRecord)
    : getTransactionMovementAmount(sourceRecord);

  const description = isRegistration
    ? `Inscripción · ${
        sourceRecord.teamName ||
        sourceRecord.pairName ||
        sourceRecord.description ||
        'Pareja inscrita'
      }`
    : sourceRecord.concept ||
      sourceRecord.description ||
      'Movimiento de torneo';

  const subcategory = isRegistration
    ? 'Inscripciones'
    : sourceRecord.concept ||
      (type === 'income'
        ? 'Otros ingresos'
        : 'Otros egresos');

  const now = nowISO();

  return {
    id:
      existingMovement?.id ||
      sourceRecord.movementId ||
      crypto.randomUUID(),

    type,

    date:
      sourceRecord.paymentDate ||
      sourceRecord.date ||
      todayISO(),

    amount,

    category: 'Torneos',
    subcategory,
    description,

    notes: [
      sourceRecord.notes,
      `Generado desde el torneo ${tournament.name}.`
    ]
      .filter(Boolean)
      .join(' '),

    source: 'tournament',
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    sourceRecordId: sourceRecord.id,
    sourceRecordType,

    createdAt:
      existingMovement?.createdAt || now,

    updatedAt: now
  };
}

async function createOrUpdateMovement({
  sourceRecord,
  tournament,
  sourceRecordType
}) {
  await ensureTournamentCategory();

  const existingMovement = sourceRecord.movementId
    ? await db.get(
        'movements',
        sourceRecord.movementId
      )
    : null;

  const movement = buildTournamentMovement({
    sourceRecord,
    tournament,
    existingMovement,
    sourceRecordType
  });

  if (movement.amount <= 0) {
    throw new Error(
      'El valor real debe ser mayor a cero para generar el movimiento.'
    );
  }

  await db.put('movements', movement);

  return movement;
}

async function deleteRelatedMovement(movementId) {
  if (!movementId) {
    return;
  }

  const existingMovement = await db.get(
    'movements',
    movementId
  );

  if (existingMovement) {
    await db.delete(
      'movements',
      movementId
    );
  }
}

/* =========================================================
   INGRESOS Y EGRESOS DEL TORNEO
   ========================================================= */

export async function saveTournamentTransaction({
  transaction,
  tournament
}) {
  if (!tournament?.id) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const existingTransaction = transaction?.id
    ? await db.get(
        'tournamentTransactions',
        transaction.id
      )
    : null;

  const now = nowISO();

  const item = {
    ...existingTransaction,
    ...transaction,

    id:
      transaction?.id ||
      existingTransaction?.id ||
      crypto.randomUUID(),

    tournamentId: tournament.id,
    tournamentName: tournament.name,

    concept: normalizeText(
      transaction?.concept ||
        existingTransaction?.concept
    ),

    type:
      transaction?.type ||
      existingTransaction?.type ||
      'expense',

    projectedAmount: toNumber(
      transaction?.projectedAmount
    ),

    actualAmount: toNumber(
      transaction?.actualAmount
    ),

    paidAmount: toNumber(
      transaction?.paidAmount ??
        transaction?.actualAmount
    ),

    status:
      transaction?.status ||
      existingTransaction?.status ||
      'projected',

    provider: normalizeText(
      transaction?.provider
    ),

    responsible: normalizeText(
      transaction?.responsible
    ),

    notes: normalizeText(
      transaction?.notes
    ),

    createdAt:
      existingTransaction?.createdAt ||
      transaction?.createdAt ||
      now,

    updatedAt: now
  };

  if (!item.concept) {
    throw new Error(
      'El movimiento debe tener un concepto.'
    );
  }

  const shouldHaveMovement =
    isCompletedTransaction(item);

  if (shouldHaveMovement) {
    const movement = await createOrUpdateMovement({
      sourceRecord: item,
      tournament,
      sourceRecordType: 'transaction'
    });

    item.movementId = movement.id;
  } else if (
    existingTransaction?.movementId
  ) {
    await deleteRelatedMovement(
      existingTransaction.movementId
    );

    item.movementId = null;
  }

  await db.put(
    'tournamentTransactions',
    item
  );

  return item;
}

export async function changeTournamentTransactionStatus({
  transaction,
  tournament,
  status
}) {
  return saveTournamentTransaction({
    tournament,
    transaction: {
      ...transaction,
      status,
      paidAmount:
        status === 'completed'
          ? toNumber(
              transaction.paidAmount ||
                transaction.actualAmount
            )
          : transaction.paidAmount
    }
  });
}

export async function removeTournamentTransaction(
  transactionId
) {
  const transaction = await db.get(
    'tournamentTransactions',
    transactionId
  );

  if (!transaction) {
    return;
  }

  await deleteRelatedMovement(
    transaction.movementId
  );

  await db.delete(
    'tournamentTransactions',
    transactionId
  );
}

/* =========================================================
   INSCRIPCIONES
   ========================================================= */

export async function saveTournamentRegistration({
  registration,
  tournament
}) {
  if (!tournament?.id) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const existingRegistration = registration?.id
    ? await db.get(
        'tournamentRegistrations',
        registration.id
      )
    : null;

  const now = nowISO();

  const item = {
    ...existingRegistration,
    ...registration,

    id:
      registration?.id ||
      existingRegistration?.id ||
      crypto.randomUUID(),

    tournamentId: tournament.id,
    tournamentName: tournament.name,

    sourceTimestamp:
      registration?.sourceTimestamp ||
      existingRegistration?.sourceTimestamp ||
      '',

    registrationKey:
      registration?.registrationKey ||
      existingRegistration?.registrationKey ||
      '',

    category: normalizeText(
      registration?.category
    ),

    teamName: normalizeText(
      registration?.teamName ||
        registration?.pairName
    ),

    registrationValue: toNumber(
      registration?.registrationValue ??
        tournament.registrationValue
    ),

    paidAmount: toNumber(
      registration?.paidAmount
    ),

    paymentStatus:
      registration?.paymentStatus ||
      existingRegistration?.paymentStatus ||
      'review',

    paymentDate:
      registration?.paymentDate ||
      existingRegistration?.paymentDate ||
      '',

    paymentProofUrl:
      registration?.paymentProofUrl ||
      existingRegistration?.paymentProofUrl ||
      '',

    notes: normalizeText(
      registration?.notes
    ),

    createdAt:
      existingRegistration?.createdAt ||
      registration?.createdAt ||
      now,

    updatedAt: now
  };

  const shouldHaveMovement =
    isPaidRegistration(item);

  if (shouldHaveMovement) {
    if (item.paidAmount <= 0) {
      item.paidAmount =
        item.registrationValue;
    }

    const movement = await createOrUpdateMovement({
      sourceRecord: item,
      tournament,
      sourceRecordType: 'registration'
    });

    item.movementId = movement.id;
  } else if (
    existingRegistration?.movementId
  ) {
    await deleteRelatedMovement(
      existingRegistration.movementId
    );

    item.movementId = null;
  }

  await db.put(
    'tournamentRegistrations',
    item
  );

  return item;
}

export async function changeRegistrationPaymentStatus({
  registration,
  tournament,
  paymentStatus
}) {
  return saveTournamentRegistration({
    tournament,
    registration: {
      ...registration,
      paymentStatus,
      paidAmount:
        paymentStatus === 'paid'
          ? toNumber(
              registration.paidAmount ||
                registration.registrationValue ||
                tournament.registrationValue
            )
          : registration.paidAmount
    }
  });
}

export async function removeTournamentRegistration(
  registrationId
) {
  const registration = await db.get(
    'tournamentRegistrations',
    registrationId
  );

  if (!registration) {
    return;
  }

  await deleteRelatedMovement(
    registration.movementId
  );

  await db.delete(
    'tournamentRegistrations',
    registrationId
  );
}

/* =========================================================
   SINCRONIZACIÓN DE EXCEL
   ========================================================= */

export async function saveImportedRegistration({
  registration,
  tournament
}) {
  const allRegistrations = await db.getAll(
    'tournamentRegistrations'
  );

  const existingRegistration =
    allRegistrations.find(
      (item) =>
        item.tournamentId === tournament.id &&
        item.registrationKey ===
          registration.registrationKey
    );

  /*
   * La importación nunca modifica:
   * - paymentStatus
   * - paidAmount
   * - paymentDate
   * - movementId
   *
   * Los estados financieros se administran
   * exclusivamente desde LPA Finanzas.
   */

  const importedData = {
    ...registration,

    id:
      existingRegistration?.id ||
      registration.id ||
      crypto.randomUUID(),

    tournamentId: tournament.id,
    tournamentName: tournament.name,

    paymentStatus:
      existingRegistration?.paymentStatus ||
      'review',

    paidAmount:
      existingRegistration?.paidAmount || 0,

    paymentDate:
      existingRegistration?.paymentDate || '',

    movementId:
      existingRegistration?.movementId || null,

    createdAt:
      existingRegistration?.createdAt ||
      registration.createdAt ||
      nowISO(),

    importedAt:
      existingRegistration?.importedAt ||
      nowISO(),

    lastSyncedAt: nowISO(),

    updatedAt: nowISO()
  };

  await db.put(
    'tournamentRegistrations',
    importedData
  );

  return {
    registration: importedData,
    operation: existingRegistration
      ? 'updated'
      : 'created'
  };
}

/* =========================================================
   KPIS FINANCIEROS DE UN TORNEO
   ========================================================= */

export function calculateTournamentFinancials({
  tournament,
  transactions = [],
  registrations = []
}) {
  const tournamentTransactions =
    transactions.filter(
      (transaction) =>
        transaction.tournamentId ===
        tournament.id
    );

  const tournamentRegistrations =
    registrations.filter(
      (registration) =>
        registration.tournamentId ===
        tournament.id
    );

  const incomeTransactions =
    tournamentTransactions.filter(
      (transaction) =>
        transaction.type === 'income'
    );

  const expenseTransactions =
    tournamentTransactions.filter(
      (transaction) =>
        transaction.type === 'expense'
    );

  const projectedIncome =
    incomeTransactions.reduce(
      (total, transaction) =>
        total +
        toNumber(
          transaction.projectedAmount
        ),
      0
    );

  const projectedExpenses =
    expenseTransactions.reduce(
      (total, transaction) =>
        total +
        toNumber(
          transaction.projectedAmount
        ),
      0
    );

  const realAdditionalIncome =
    incomeTransactions
      .filter(isCompletedTransaction)
      .reduce(
        (total, transaction) =>
          total +
          getTransactionMovementAmount(
            transaction
          ),
        0
      );

  const realExpenses =
    expenseTransactions
      .filter(isCompletedTransaction)
      .reduce(
        (total, transaction) =>
          total +
          getTransactionMovementAmount(
            transaction
          ),
        0
      );

  const paidRegistrations =
    tournamentRegistrations.filter(
      isPaidRegistration
    );

  const registrationIncome =
    paidRegistrations.reduce(
      (total, registration) =>
        total +
        getRegistrationMovementAmount(
          registration
        ),
      0
    );

  const realIncome =
    registrationIncome +
    realAdditionalIncome;

  const projectedUtility =
    projectedIncome - projectedExpenses;

  const realUtility =
    realIncome - realExpenses;

  const realMargin =
    realIncome > 0
      ? (realUtility / realIncome) * 100
      : 0;

  const totalPairs =
    tournamentRegistrations.filter(
      (registration) =>
        registration.paymentStatus !==
        'cancelled'
    ).length;

  const totalPlayers =
    tournamentRegistrations.reduce(
      (total, registration) => {
        const playerCount = [
          registration.player1,
          registration.player2
        ].filter(Boolean).length;

        return total + playerCount;
      },
      0
    );

  return {
    projectedIncome,
    projectedExpenses,
    projectedUtility,

    realIncome,
    realExpenses,
    realUtility,
    realMargin,

    registrationIncome,
    additionalIncome:
      realAdditionalIncome,

    totalPairs,
    totalPlayers,

    paidRegistrations:
      paidRegistrations.length,

    pendingRegistrations:
      tournamentRegistrations.filter(
        (registration) =>
          ['review', 'pending', 'partial'].includes(
            registration.paymentStatus
          )
      ).length,

    courtesyRegistrations:
      tournamentRegistrations.filter(
        (registration) =>
          registration.paymentStatus ===
          'courtesy'
      ).length
  };
}
