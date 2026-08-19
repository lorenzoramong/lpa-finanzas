import { db } from './db';

const DEFAULT_CYCLE_START_DAY = 19;
const DEFAULT_CYCLE_END_DAY = 19;

function normalizeDay(value, fallback) {
  const number = Number(value);

  if (!Number.isInteger(number)) {
    return fallback;
  }

  return Math.min(31, Math.max(1, number));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalISODate(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

function getDateForMonth(year, month, day) {
  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(day, lastDay),
    0,
    0,
    0,
    0
  );
}

function addMonths(year, month, amount) {
  const date = new Date(
    year,
    month + amount,
    1
  );

  return {
    year: date.getFullYear(),
    month: date.getMonth()
  };
}

function createCycleId(startDate, endDate) {
  return `academy-cycle-${startDate}-${endDate}`;
}

export function getAcademyCycleRule(settings = {}) {
  return {
    cycleStartDay: normalizeDay(
      settings.cycleStartDay,
      DEFAULT_CYCLE_START_DAY
    ),
    cycleEndDay: normalizeDay(
      settings.cycleEndDay,
      DEFAULT_CYCLE_END_DAY
    )
  };
}

export function getAcademyCycleRange(
  settings = {},
  referenceDate = new Date()
) {
  const {
    cycleStartDay,
    cycleEndDay
  } = getAcademyCycleRule(settings);

  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);

  let startYear = reference.getFullYear();
  let startMonth = reference.getMonth();

  let start = getDateForMonth(
    startYear,
    startMonth,
    cycleStartDay
  );

  if (reference < start) {
    const previous = addMonths(
      startYear,
      startMonth,
      -1
    );

    startYear = previous.year;
    startMonth = previous.month;

    start = getDateForMonth(
      startYear,
      startMonth,
      cycleStartDay
    );
  }

  let endYear = startYear;
  let endMonth = startMonth;

  /*
   * Cuando el día final es igual o menor al inicial,
   * el final pertenece al mes siguiente.
   *
   * Ejemplo:
   * 19 → 19 = 19 de agosto a 19 de septiembre.
   */
  if (cycleEndDay <= cycleStartDay) {
    const next = addMonths(
      startYear,
      startMonth,
      1
    );

    endYear = next.year;
    endMonth = next.month;
  }

  let end = getDateForMonth(
    endYear,
    endMonth,
    cycleEndDay
  );

  if (end <= start) {
    const next = addMonths(
      endYear,
      endMonth,
      1
    );

    end = getDateForMonth(
      next.year,
      next.month,
      cycleEndDay
    );
  }

  const startDate = toLocalISODate(start);
  const endDate = toLocalISODate(end);

  return {
    id: createCycleId(startDate, endDate),
    startDate,
    endDate,
    cycleStartDay,
    cycleEndDay
  };
}

function isCycleExpired(cycle, todayISO) {
  return (
    cycle?.status === 'active' &&
    cycle?.endDate &&
    todayISO >= cycle.endDate
  );
}

function isDateInsideCycle(cycle, todayISO) {
  return (
    cycle?.status === 'active' &&
    cycle?.startDate &&
    cycle?.endDate &&
    todayISO >= cycle.startDate &&
    todayISO < cycle.endDate
  );
}

function createPlayerSnapshots({
  players = [],
  locations = []
}) {
  const locationMap = new Map(
    locations.map((location) => [
      location.id,
      location
    ])
  );

  return players
    .filter((player) => player.active !== false)
    .map((player) => {
      const location = locationMap.get(
        player.locationId
      );

      return {
        playerId: player.id,
        name: player.name || '',
        phone: player.phone || '',
        email: player.email || '',
        locationId: player.locationId || '',
        locationName:
          player.locationName ||
          location?.name ||
          '',
        monthlyFee: Number(
          player.monthlyFee || 0
        )
      };
    });
}

function createCoachSnapshots({
  coaches = [],
  locations = []
}) {
  const locationMap = new Map(
    locations.map((location) => [
      location.id,
      location
    ])
  );

  return coaches
    .filter((coach) => coach.active !== false)
    .map((coach) => {
      const location = locationMap.get(
        coach.locationId
      );

      return {
        coachId: coach.id,
        name: coach.name || '',
        locationId: coach.locationId || '',
        locationName:
          coach.locationName ||
          location?.name ||
          '',
        paymentPerCycle: Number(
          coach.paymentPerCycle || 0
        )
      };
    });
}

export async function ensureCurrentAcademyCycle({
  cycles = [],
  players = [],
  coaches = [],
  locations = [],
  settings = {},
  referenceDate = new Date()
}) {
  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);

  const todayISO = toLocalISODate(reference);
  const now = new Date().toISOString();

  /*
   * Cerramos automáticamente ciclos cuyo final ya llegó.
   * El final se maneja como límite exclusivo:
   * un ciclo 19 ago → 19 sep termina al comenzar el 19 sep.
   */
  for (const cycle of cycles) {
    if (isCycleExpired(cycle, todayISO)) {
      await db.put('academyCycles', {
        ...cycle,
        status: 'closed',
        closedAt: cycle.closedAt || now,
        updatedAt: now
      });
    }
  }

  const activeCycle = cycles.find(
    (cycle) =>
      isDateInsideCycle(cycle, todayISO)
  );

  if (activeCycle) {
    /*
     * El ciclo activo conserva lo que ya tenía, pero permite
     * incorporar jugadores y entrenadores que se agreguen
     * durante el mismo ciclo.
     *
     * Nunca eliminamos automáticamente snapshots existentes
     * ni sobrescribimos sus valores históricos. Los ciclos
     * cerrados permanecen completamente congelados.
     */
    const currentPlayerSnapshots =
      activeCycle.playerSnapshots || [];

    const currentCoachSnapshots =
      activeCycle.coachSnapshots || [];

    const existingPlayerIds = new Set(
      currentPlayerSnapshots.map(
        (player) => player.playerId
      )
    );

    const existingCoachIds = new Set(
      currentCoachSnapshots.map(
        (coach) => coach.coachId
      )
    );

    const newPlayerSnapshots =
      createPlayerSnapshots({
        players,
        locations
      }).filter(
        (player) =>
          !existingPlayerIds.has(player.playerId)
      );

    const newCoachSnapshots =
      createCoachSnapshots({
        coaches,
        locations
      }).filter(
        (coach) =>
          !existingCoachIds.has(coach.coachId)
      );

    if (
      !newPlayerSnapshots.length &&
      !newCoachSnapshots.length
    ) {
      return activeCycle;
    }

    const playerSnapshots = [
      ...currentPlayerSnapshots,
      ...newPlayerSnapshots
    ];

    const coachSnapshots = [
      ...currentCoachSnapshots,
      ...newCoachSnapshots
    ];

    const projectedIncome =
      playerSnapshots.reduce(
        (total, player) =>
          total +
          Number(player.monthlyFee || 0),
        0
      );

    const projectedCoachExpense =
      coachSnapshots.reduce(
        (total, coach) =>
          total +
          Number(coach.paymentPerCycle || 0),
        0
      );

    const updatedCycle = {
      ...activeCycle,

      playerSnapshots,
      coachSnapshots,

      projectedPlayers:
        playerSnapshots.length,

      projectedIncome,

      projectedCoachExpense,

      projectedUtility:
        projectedIncome -
        projectedCoachExpense,

      updatedAt: now
    };

    await db.put(
      'academyCycles',
      updatedCycle
    );

    return updatedCycle;
  }

  const range = getAcademyCycleRange(
    settings,
    reference
  );

  const existing = cycles.find(
    (cycle) => cycle.id === range.id
  );

  if (existing) {
    return existing;
  }

  const playerSnapshots =
    createPlayerSnapshots({
      players,
      locations
    });

  const coachSnapshots =
    createCoachSnapshots({
      coaches,
      locations
    });

  const projectedIncome =
    playerSnapshots.reduce(
      (total, player) =>
        total +
        Number(player.monthlyFee || 0),
      0
    );

  const projectedCoachExpense =
    coachSnapshots.reduce(
      (total, coach) =>
        total +
        Number(coach.paymentPerCycle || 0),
      0
    );

  const cycle = {
    id: range.id,

    name: `${range.startDate} → ${range.endDate}`,

    startDate: range.startDate,
    endDate: range.endDate,

    status: 'active',

    cycleRuleSnapshot: {
      cycleStartDay: range.cycleStartDay,
      cycleEndDay: range.cycleEndDay
    },

    playerSnapshots,
    coachSnapshots,

    projectedPlayers:
      playerSnapshots.length,

    projectedIncome,

    projectedCoachExpense,

    projectedUtility:
      projectedIncome -
      projectedCoachExpense,

    createdAt: now,
    updatedAt: now
  };

  await db.put(
    'academyCycles',
    cycle
  );

  return cycle;
}

export async function saveAcademyCycleSettings({
  generalSettings,
  cycleStartDay,
  cycleEndDay
}) {
  const rule = getAcademyCycleRule({
    cycleStartDay,
    cycleEndDay
  });

  const now = new Date().toISOString();

  const updatedGeneralSettings = {
    ...(generalSettings || {}),
    id: 'general',

    academySettings: {
      ...(generalSettings?.academySettings || {}),
      ...rule
    },

    updatedAt: now
  };

  await db.put(
    'settings',
    updatedGeneralSettings
  );

  return updatedGeneralSettings;
}


/* =========================================================
   PAGOS Y PROYECCIONES DE ACADEMIA
   ========================================================= */

function academyPaymentProjectionId(paymentId) {
  return `academy-projection-${paymentId}`;
}

function academyInstallmentMovementId(
  paymentId,
  installmentId
) {
  return `academy-movement-${paymentId}-${installmentId}`;
}

function academyPaymentDescription(payment) {
  if (payment.kind === 'player') {
    return `Mensualidad academia - ${payment.personName}`;
  }

  return `Pago entrenador academia - ${payment.personName}`;
}

function academyPaymentSubcategory(payment) {
  return payment.kind === 'player'
    ? 'Mensualidades'
    : 'Entrenadores';
}

function getPaymentTotals(payment) {
  const amount = Math.max(
    0,
    Number(payment?.amount || 0)
  );

  const installments =
    payment?.installments || [];

  const paidAmount = installments.reduce(
    (total, installment) =>
      total +
      Math.max(
        0,
        Number(installment.amount || 0)
      ),
    0
  );

  const pendingAmount = Math.max(
    0,
    amount - paidAmount
  );

  let status = payment?.status || 'pending';

  if (status !== 'cancelled') {
    if (paidAmount <= 0) {
      status =
        payment?.kind === 'coach' &&
        payment?.status === 'projected'
          ? 'projected'
          : 'pending';
    } else if (pendingAmount > 0) {
      status = 'partial';
    } else {
      status = 'paid';
    }
  }

  return {
    amount,
    paidAmount,
    pendingAmount,
    status
  };
}

async function syncAcademyProjection(payment) {
  const projectionId =
    academyPaymentProjectionId(payment.id);

  const now = new Date().toISOString();

  const totals = getPaymentTotals(payment);

  /*
   * La proyección representa únicamente lo que todavía falta
   * por cobrar o pagar. Cada abono real va por separado al
   * Flujo de Caja.
   */
  const projectionStatus =
    totals.status === 'paid' ||
    totals.status === 'cancelled'
      ? 'completed'
      : 'pending';

  await db.put('projections', {
    id: projectionId,

    type:
      payment.type === 'expense'
        ? 'expense'
        : 'income',

    description:
      academyPaymentDescription(payment),

    amount:
      projectionStatus === 'completed'
        ? 0
        : totals.pendingAmount,

    originalAmount: totals.amount,
    paidAmount: totals.paidAmount,
    pendingAmount: totals.pendingAmount,

    probability: 100,

    dueDate: payment.dueDate || '',

    status: projectionStatus,

    notes: [
      `Academia · ${payment.locationName || 'Sin sede'}.`,
      `Ciclo ${payment.cycleStartDate || ''} → ${payment.cycleEndDate || ''}.`,
      totals.paidAmount > 0
        ? `Abonado: ${totals.paidAmount}. Pendiente: ${totals.pendingAmount}.`
        : '',
      payment.notes || ''
    ]
      .filter(Boolean)
      .join(' '),

    source: 'academy',
    academyPaymentId: payment.id,
    academyCycleId: payment.cycleId,
    academyLocationId: payment.locationId,

    completedAt:
      projectionStatus === 'completed'
        ? payment.paidAt || now
        : null,

    createdAt:
      payment.projectionCreatedAt ||
      payment.createdAt ||
      now,

    updatedAt: now
  });
}

async function syncAcademyInstallmentMovement({
  payment,
  installment
}) {
  const now = new Date().toISOString();

  const movement = {
    id: academyInstallmentMovementId(
      payment.id,
      installment.id
    ),

    type:
      payment.type === 'expense'
        ? 'expense'
        : 'income',

    date:
      installment.date ||
      now.slice(0, 10),

    amount: Number(
      installment.amount || 0
    ),

    category: 'Academia',

    subcategory:
      academyPaymentSubcategory(payment),

    description:
      academyPaymentDescription(payment),

    notes: [
      `Sede: ${payment.locationName || 'Sin sede'}.`,
      `Ciclo: ${payment.cycleStartDate || ''} → ${payment.cycleEndDate || ''}.`,
      installment.notes || '',
      payment.notes || ''
    ]
      .filter(Boolean)
      .join(' '),

    source: 'academy',

    academyPaymentId: payment.id,
    academyInstallmentId: installment.id,
    academyCycleId: payment.cycleId,
    academyLocationId: payment.locationId,

    createdAt:
      installment.createdAt ||
      now,

    updatedAt: now
  };

  await db.put(
    'movements',
    movement
  );

  return movement;
}

async function deleteAcademyInstallmentMovements(
  payment
) {
  const movements =
    await db.getAll('movements');

  const related = movements.filter(
    (movement) =>
      movement.source === 'academy' &&
      movement.academyPaymentId === payment.id
  );

  for (const movement of related) {
    await db.delete(
      'movements',
      movement.id
    );
  }
}

async function syncAllAcademyInstallmentMovements(
  payment
) {
  await deleteAcademyInstallmentMovements(
    payment
  );

  if (payment.status === 'cancelled') {
    return;
  }

  for (const installment of
    payment.installments || []) {
    await syncAcademyInstallmentMovement({
      payment,
      installment
    });
  }
}

async function updateCycleFromPayment(payment) {
  if (!payment?.cycleId) {
    return;
  }

  const cycle = await db.get(
    'academyCycles',
    payment.cycleId
  );

  if (!cycle) {
    return;
  }

  let playerSnapshots =
    cycle.playerSnapshots || [];

  let coachSnapshots =
    cycle.coachSnapshots || [];

  if (payment.kind === 'player') {
    playerSnapshots =
      playerSnapshots.map((snapshot) =>
        snapshot.playerId === payment.personId
          ? {
              ...snapshot,
              monthlyFee: Number(
                payment.amount || 0
              )
            }
          : snapshot
      );
  }

  if (payment.kind === 'coach') {
    coachSnapshots =
      coachSnapshots.map((snapshot) =>
        snapshot.coachId === payment.personId
          ? {
              ...snapshot,
              paymentPerCycle: Number(
                payment.amount || 0
              )
            }
          : snapshot
      );
  }

  const projectedIncome =
    playerSnapshots.reduce(
      (total, snapshot) =>
        total +
        Number(snapshot.monthlyFee || 0),
      0
    );

  const projectedCoachExpense =
    coachSnapshots.reduce(
      (total, snapshot) =>
        total +
        Number(
          snapshot.paymentPerCycle || 0
        ),
      0
    );

  await db.put(
    'academyCycles',
    {
      ...cycle,

      playerSnapshots,
      coachSnapshots,

      projectedPlayers:
        playerSnapshots.length,

      projectedIncome,

      projectedCoachExpense,

      projectedUtility:
        projectedIncome -
        projectedCoachExpense,

      updatedAt:
        new Date().toISOString()
    }
  );
}

function createPlayerPayment({
  cycle,
  player,
  now
}) {
  return {
    id: `academy-payment-${cycle.id}-player-${player.playerId}`,

    cycleId: cycle.id,
    cycleStartDate: cycle.startDate,
    cycleEndDate: cycle.endDate,

    kind: 'player',
    type: 'income',

    personId: player.playerId,
    personName: player.name,

    locationId: player.locationId,
    locationName: player.locationName,

    amount: Number(
      player.monthlyFee || 0
    ),

    originalAmount: Number(
      player.monthlyFee || 0
    ),

    paidAmount: 0,
    pendingAmount: Number(
      player.monthlyFee || 0
    ),

    installments: [],

    status: 'pending',

    dueDate: cycle.endDate,

    paymentDate: '',
    paidAt: null,

    notes: '',

    createdAt: now,
    updatedAt: now
  };
}

function createCoachPayment({
  cycle,
  coach,
  now
}) {
  const cycleIsClosed =
    cycle.status === 'closed';

  return {
    id: `academy-payment-${cycle.id}-coach-${coach.coachId}`,

    cycleId: cycle.id,
    cycleStartDate: cycle.startDate,
    cycleEndDate: cycle.endDate,

    kind: 'coach',
    type: 'expense',

    personId: coach.coachId,
    personName: coach.name,

    locationId: coach.locationId,
    locationName: coach.locationName,

    amount: Number(
      coach.paymentPerCycle || 0
    ),

    originalAmount: Number(
      coach.paymentPerCycle || 0
    ),

    paidAmount: 0,
    pendingAmount: Number(
      coach.paymentPerCycle || 0
    ),

    installments: [],

    status:
      cycleIsClosed
        ? 'pending'
        : 'projected',

    dueDate: cycle.endDate,

    paymentDate: '',
    paidAt: null,

    notes: '',

    createdAt: now,
    updatedAt: now
  };
}

function normalizeExistingPayment(payment) {
  const installments =
    payment.installments || [];

  /*
   * Compatibilidad con pagos del Paso 6 que pudieron
   * haberse marcado como pagados antes de incorporar abonos.
   */
  let normalizedInstallments = installments;

  if (
    payment.status === 'paid' &&
    !installments.length &&
    Number(payment.amount || 0) > 0
  ) {
    const now = new Date().toISOString();

    normalizedInstallments = [
      {
        id: crypto.randomUUID(),
        amount: Number(
          payment.amount || 0
        ),
        date:
          payment.paymentDate ||
          payment.paidAt?.slice(0, 10) ||
          now.slice(0, 10),
        notes:
          'Pago migrado desde el esquema anterior.',
        createdAt:
          payment.paidAt ||
          payment.updatedAt ||
          now
      }
    ];
  }

  const normalized = {
    ...payment,
    installments: normalizedInstallments
  };

  const totals = getPaymentTotals(
    normalized
  );

  return {
    ...normalized,
    ...totals,

    paidAt:
      totals.status === 'paid'
        ? payment.paidAt ||
          normalizedInstallments.at(-1)?.createdAt ||
          new Date().toISOString()
        : null
  };
}

export async function ensureAcademyCyclePayments({
  cycles = [],
  payments = []
}) {
  const existingById = new Map(
    payments.map((payment) => [
      payment.id,
      payment
    ])
  );

  const now = new Date().toISOString();

  for (const cycle of cycles) {
    for (const player of
      cycle.playerSnapshots || []) {
      const newPayment =
        createPlayerPayment({
          cycle,
          player,
          now
        });

      const existing =
        existingById.get(newPayment.id);

      if (!existing) {
        await db.put(
          'academyPayments',
          newPayment
        );

        await syncAcademyProjection(
          newPayment
        );

        existingById.set(
          newPayment.id,
          newPayment
        );

        continue;
      }

      const normalized =
        normalizeExistingPayment(existing);

      await db.put(
        'academyPayments',
        normalized
      );

      await syncAcademyProjection(
        normalized
      );

      await syncAllAcademyInstallmentMovements(
        normalized
      );

      existingById.set(
        normalized.id,
        normalized
      );
    }

    for (const coach of
      cycle.coachSnapshots || []) {
      const newPayment =
        createCoachPayment({
          cycle,
          coach,
          now
        });

      const existing =
        existingById.get(newPayment.id);

      if (!existing) {
        await db.put(
          'academyPayments',
          newPayment
        );

        await syncAcademyProjection(
          newPayment
        );

        existingById.set(
          newPayment.id,
          newPayment
        );

        continue;
      }

      let normalized =
        normalizeExistingPayment(existing);

      if (
        cycle.status === 'closed' &&
        normalized.status === 'projected'
      ) {
        normalized = {
          ...normalized,
          status: 'pending',
          updatedAt: now
        };
      }

      await db.put(
        'academyPayments',
        normalized
      );

      await syncAcademyProjection(
        normalized
      );

      await syncAllAcademyInstallmentMovements(
        normalized
      );

      existingById.set(
        normalized.id,
        normalized
      );
    }
  }
}

export async function updateAcademyPayment({
  payment,
  amount,
  notes
}) {
  if (!payment?.id) {
    throw new Error(
      'No fue posible identificar el pago.'
    );
  }

  const nextAmount = Number(amount);

  if (
    !Number.isFinite(nextAmount) ||
    nextAmount < 0
  ) {
    throw new Error(
      'El valor debe ser un número válido.'
    );
  }

  const current =
    normalizeExistingPayment(payment);

  if (nextAmount < current.paidAmount) {
    throw new Error(
      `El nuevo valor no puede ser menor que lo ya abonado (${current.paidAmount}).`
    );
  }

  const draft = {
    ...current,

    amount: nextAmount,

    notes:
      String(notes ?? current.notes ?? '')
        .trim(),

    status:
      current.status === 'cancelled'
        ? 'cancelled'
        : current.status,

    updatedAt:
      new Date().toISOString()
  };

  const totals = getPaymentTotals(draft);

  const updatedPayment = {
    ...draft,
    ...totals,

    paidAt:
      totals.status === 'paid'
        ? draft.paidAt ||
          new Date().toISOString()
        : null
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  /*
   * Esto hace que editar el valor del entrenador o del alumno
   * se refleje también en el resumen del ciclo y en todas las
   * tarjetas que usan projectedIncome / projectedCoachExpense.
   */
  await updateCycleFromPayment(
    updatedPayment
  );

  await syncAcademyProjection(
    updatedPayment
  );

  await syncAllAcademyInstallmentMovements(
    updatedPayment
  );

  return updatedPayment;
}

export async function addAcademyPaymentInstallment({
  payment,
  amount,
  date,
  notes
}) {
  if (!payment?.id) {
    throw new Error(
      'No fue posible identificar el pago.'
    );
  }

  const current =
    normalizeExistingPayment(payment);

  if (current.status === 'cancelled') {
    throw new Error(
      'No puedes registrar abonos en un pago anulado.'
    );
  }

  if (
    payment.kind === 'coach' &&
    current.status === 'projected'
  ) {
    throw new Error(
      'El pago del entrenador todavía está proyectado. Debe estar pendiente antes de registrar un abono.'
    );
  }

  const installmentAmount =
    Number(amount);

  if (
    !Number.isFinite(installmentAmount) ||
    installmentAmount <= 0
  ) {
    throw new Error(
      'El abono debe ser mayor que cero.'
    );
  }

  if (
    installmentAmount >
    current.pendingAmount
  ) {
    throw new Error(
      `El abono no puede superar el saldo pendiente (${current.pendingAmount}).`
    );
  }

  const now = new Date().toISOString();

  const installment = {
    id: crypto.randomUUID(),
    amount: installmentAmount,
    date:
      date ||
      now.slice(0, 10),
    notes:
      String(notes || '').trim(),
    createdAt: now
  };

  const draft = {
    ...current,
    installments: [
      ...(current.installments || []),
      installment
    ],
    updatedAt: now
  };

  const totals = getPaymentTotals(draft);

  const updatedPayment = {
    ...draft,
    ...totals,

    paymentDate:
      totals.status === 'paid'
        ? installment.date
        : '',

    paidAt:
      totals.status === 'paid'
        ? now
        : null
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  await syncAcademyInstallmentMovement({
    payment: updatedPayment,
    installment
  });

  await syncAcademyProjection(
    updatedPayment
  );

  return updatedPayment;
}


export async function payAcademyPaymentInFull({
  payment,
  date,
  notes
}) {
  if (!payment?.id) {
    throw new Error(
      'No fue posible identificar el pago.'
    );
  }

  const current =
    normalizeExistingPayment(payment);

  if (current.status === 'cancelled') {
    throw new Error(
      'No puedes registrar un pago sobre un registro anulado.'
    );
  }

  if (current.pendingAmount <= 0) {
    return current;
  }

  const now = new Date().toISOString();

  const installment = {
    id: crypto.randomUUID(),

    amount:
      current.pendingAmount,

    date:
      date ||
      now.slice(0, 10),

    notes:
      String(
        notes ||
          (payment.kind === 'coach'
            ? 'Pago completo al entrenador.'
            : 'Pago completo de mensualidad.')
      ).trim(),

    createdAt: now
  };

  const draft = {
    ...current,

    installments: [
      ...(current.installments || []),
      installment
    ],

    updatedAt: now
  };

  const totals = getPaymentTotals(draft);

  const updatedPayment = {
    ...draft,
    ...totals,

    status: 'paid',

    paymentDate:
      installment.date,

    paidAt: now
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  await syncAcademyInstallmentMovement({
    payment: updatedPayment,
    installment
  });

  await syncAcademyProjection(
    updatedPayment
  );

  return updatedPayment;
}

export async function changeAcademyPaymentStatus({
  payment,
  status
}) {
  if (!payment?.id) {
    throw new Error(
      'No fue posible identificar el pago.'
    );
  }

  if (
    ![
      'projected',
      'pending',
      'cancelled'
    ].includes(status)
  ) {
    throw new Error(
      'El estado se calcula automáticamente con los abonos. Usa Registrar abono para pasar a Parcial o Pagado.'
    );
  }

  const current =
    normalizeExistingPayment(payment);

  const updatedPayment = {
    ...current,

    status,

    paidAt: null,
    paymentDate: '',

    updatedAt:
      new Date().toISOString()
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  await syncAcademyProjection(
    updatedPayment
  );

  if (status === 'cancelled') {
    await deleteAcademyInstallmentMovements(
      updatedPayment
    );
  } else {
    await syncAllAcademyInstallmentMovements(
      updatedPayment
    );
  }

  return updatedPayment;
}

/* =========================================================
   ELIMINAR JUGADOR DE ACADEMIA
   ========================================================= */

export async function removeAcademyPlayer({
  player,
  cycles = [],
  payments = []
}) {
  if (!player?.id) {
    throw new Error(
      'No fue posible identificar el jugador.'
    );
  }

  const now = new Date().toISOString();

  await db.delete(
    'academyPlayers',
    player.id
  );

  const activeCycles = cycles.filter(
    (cycle) => cycle.status === 'active'
  );

  for (const cycle of activeCycles) {
    const playerSnapshots =
      cycle.playerSnapshots || [];

    const existsInCycle =
      playerSnapshots.some(
        (snapshot) =>
          snapshot.playerId === player.id
      );

    if (!existsInCycle) {
      continue;
    }

    const paymentId =
      `academy-payment-${cycle.id}-player-${player.id}`;

    const payment =
      payments.find(
        (item) => item.id === paymentId
      );

    const normalizedPayment = payment
      ? normalizeExistingPayment(payment)
      : null;

    /*
     * Si ya hubo uno o más abonos reales, conservamos el
     * registro del ciclo y sus movimientos como histórico.
     */
    if (
      normalizedPayment?.paidAmount > 0
    ) {
      continue;
    }

    const nextPlayerSnapshots =
      playerSnapshots.filter(
        (snapshot) =>
          snapshot.playerId !== player.id
      );

    const projectedIncome =
      nextPlayerSnapshots.reduce(
        (total, snapshot) =>
          total +
          Number(snapshot.monthlyFee || 0),
        0
      );

    const projectedCoachExpense =
      Number(
        cycle.projectedCoachExpense || 0
      );

    await db.put(
      'academyCycles',
      {
        ...cycle,

        playerSnapshots:
          nextPlayerSnapshots,

        projectedPlayers:
          nextPlayerSnapshots.length,

        projectedIncome,

        projectedUtility:
          projectedIncome -
          projectedCoachExpense,

        updatedAt: now
      }
    );

    if (payment) {
      await db.delete(
        'academyPayments',
        payment.id
      );
    }

    const projectionId =
      academyPaymentProjectionId(paymentId);

    const projection = await db.get(
      'projections',
      projectionId
    );

    if (projection) {
      await db.delete(
        'projections',
        projectionId
      );
    }

    const movements =
      await db.getAll('movements');

    const relatedMovements =
      movements.filter(
        (movement) =>
          movement.source === 'academy' &&
          movement.academyPaymentId === paymentId
      );

    for (const movement of
      relatedMovements) {
      await db.delete(
        'movements',
        movement.id
      );
    }
  }

  return true;
}
