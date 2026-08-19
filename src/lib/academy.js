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
