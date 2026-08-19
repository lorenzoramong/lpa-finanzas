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
    return activeCycle;
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

function academyPaymentMovementId(paymentId) {
  return `academy-movement-${paymentId}`;
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

async function syncAcademyProjection(payment) {
  const projectionId =
    academyPaymentProjectionId(payment.id);

  const now = new Date().toISOString();

  const status =
    payment.status === 'paid' ||
    payment.status === 'cancelled'
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

    amount: Number(payment.amount || 0),

    probability:
      status === 'completed'
        ? 100
        : 100,

    dueDate: payment.dueDate || '',

    status,

    notes: [
      `Academia · ${payment.locationName || 'Sin sede'}.`,
      `Ciclo ${payment.cycleStartDate || ''} → ${payment.cycleEndDate || ''}.`,
      payment.notes || ''
    ]
      .filter(Boolean)
      .join(' '),

    source: 'academy',
    academyPaymentId: payment.id,
    academyCycleId: payment.cycleId,
    academyLocationId: payment.locationId,

    completedAt:
      status === 'completed'
        ? payment.paidAt || now
        : null,

    createdAt:
      payment.projectionCreatedAt ||
      payment.createdAt ||
      now,

    updatedAt: now
  });
}

async function syncAcademyMovement(payment) {
  const movementId =
    academyPaymentMovementId(payment.id);

  if (payment.status !== 'paid') {
    const existing = await db.get(
      'movements',
      movementId
    );

    if (existing) {
      await db.delete(
        'movements',
        movementId
      );
    }

    return null;
  }

  const now = new Date().toISOString();

  const movement = {
    id: movementId,

    type:
      payment.type === 'expense'
        ? 'expense'
        : 'income',

    date:
      payment.paymentDate ||
      payment.paidAt?.slice(0, 10) ||
      now.slice(0, 10),

    amount: Number(payment.amount || 0),

    category: 'Academia',

    subcategory:
      academyPaymentSubcategory(payment),

    description:
      academyPaymentDescription(payment),

    notes: [
      `Sede: ${payment.locationName || 'Sin sede'}.`,
      `Ciclo: ${payment.cycleStartDate || ''} → ${payment.cycleEndDate || ''}.`,
      payment.notes || ''
    ]
      .filter(Boolean)
      .join(' '),

    source: 'academy',

    academyPaymentId: payment.id,
    academyCycleId: payment.cycleId,
    academyLocationId: payment.locationId,

    createdAt:
      payment.movementCreatedAt ||
      now,

    updatedAt: now
  };

  await db.put(
    'movements',
    movement
  );

  return movement;
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
      } else {
        await syncAcademyProjection(
          existing
        );
      }
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

      /*
       * Al cerrarse el ciclo, la obligación del entrenador
       * pasa automáticamente de Proyectado a Pendiente.
       */
      if (
        cycle.status === 'closed' &&
        existing.status === 'projected'
      ) {
        const pendingPayment = {
          ...existing,
          status: 'pending',
          updatedAt: now
        };

        await db.put(
          'academyPayments',
          pendingPayment
        );

        await syncAcademyProjection(
          pendingPayment
        );

        existingById.set(
          pendingPayment.id,
          pendingPayment
        );
      } else {
        await syncAcademyProjection(
          existing
        );
      }
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

  const updatedPayment = {
    ...payment,

    amount: nextAmount,

    notes:
      String(notes ?? payment.notes ?? '')
        .trim(),

    updatedAt: new Date().toISOString()
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  await syncAcademyProjection(
    updatedPayment
  );

  await syncAcademyMovement(
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
      'paid',
      'cancelled'
    ].includes(status)
  ) {
    throw new Error(
      'Estado de pago no válido.'
    );
  }

  const now = new Date().toISOString();

  const updatedPayment = {
    ...payment,

    status,

    paidAt:
      status === 'paid'
        ? payment.paidAt || now
        : null,

    paymentDate:
      status === 'paid'
        ? payment.paymentDate ||
          now.slice(0, 10)
        : '',

    updatedAt: now
  };

  await db.put(
    'academyPayments',
    updatedPayment
  );

  await syncAcademyProjection(
    updatedPayment
  );

  await syncAcademyMovement(
    updatedPayment
  );

  return updatedPayment;
}
