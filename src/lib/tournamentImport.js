/*
 * Importador de inscripciones de torneos.
 *
 * Este archivo:
 * - carga SheetJS directamente en el navegador, sin npm;
 * - lee archivos .xlsx, .xls y .csv;
 * - reconoce las columnas reales del Google Forms de LPA;
 * - normaliza parejas y jugadores;
 * - genera una llave estable por Timestamp + correo/celular;
 * - compara el archivo contra Firebase;
 * - nunca modifica pagos, descuentos ni movimientos;
 * - respeta inscripciones excluidas manualmente.
 */

import { db } from './db';

/* =========================================================
   CONFIGURACIÓN DEL LECTOR DE EXCEL
   ========================================================= */

const SHEETJS_CDN_URL =
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

let sheetJsPromise = null;

async function loadSheetJS() {
  if (globalThis.XLSX) {
    return globalThis.XLSX;
  }

  if (sheetJsPromise) {
    return sheetJsPromise;
  }

  sheetJsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-lpa-sheetjs="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (globalThis.XLSX) {
          resolve(globalThis.XLSX);
        } else {
          reject(
            new Error(
              'SheetJS se cargó, pero no quedó disponible.'
            )
          );
        }
      });

      existingScript.addEventListener('error', () => {
        reject(
          new Error(
            'No fue posible cargar el lector de Excel.'
          )
        );
      });

      return;
    }

    const script = document.createElement('script');

    script.src = SHEETJS_CDN_URL;
    script.async = true;
    script.dataset.lpaSheetjs = 'true';

    script.onload = () => {
      if (globalThis.XLSX) {
        resolve(globalThis.XLSX);
      } else {
        reject(
          new Error(
            'SheetJS se cargó, pero no quedó disponible.'
          )
        );
      }
    };

    script.onerror = () => {
      reject(
        new Error(
          'No fue posible cargar el lector de Excel. Revisa la conexión a internet.'
        )
      );
    };

    document.head.appendChild(script);
  });

  return sheetJsPromise;
}

/* =========================================================
   ENCABEZADOS REALES DEL FORMULARIO
   ========================================================= */

const HEADER_ALIASES = {
  timestamp: [
    'timestamp',
    'marca temporal',
    'fecha y hora'
  ],

  category: [
    '¿qué categoría deseas competir? (6ta sold out)',
    '¿qué categoria deseas competir? (6ta sold out)',
    '¿qué categoría deseas competir?',
    '¿qué categoria deseas competir?',
    'categoría',
    'categoria'
  ],

  player1Name: [
    'nombre completo jugador(a) #1',
    'nombre completo jugador #1',
    'nombre jugador(a) #1',
    'nombre jugador #1'
  ],

  player1Email: [
    'email jugador(a) #1',
    'email jugador #1',
    'correo jugador(a) #1',
    'correo jugador #1'
  ],

  player1Phone: [
    'numero de teléfono jugador(a) #1',
    'numero de telefono jugador(a) #1',
    'número de teléfono jugador(a) #1',
    'número de telefono jugador(a) #1',
    'telefono jugador(a) #1',
    'teléfono jugador(a) #1'
  ],

  player1Document: [
    'numero de identificación jugador(a) #1',
    'numero de identificacion jugador(a) #1',
    'número de identificación jugador(a) #1',
    'número de identificacion jugador(a) #1',
    'identificación jugador(a) #1',
    'identificacion jugador(a) #1'
  ],

  player1ShirtSize: [
    'talla camisa jugador(a) #1',
    'talla camisa jugador #1',
    'talla jugador(a) #1',
    'talla jugador #1'
  ],

  player1AgeRange: [
    'edad jugador #1',
    'edad jugador(a) #1',
    'rango de edad jugador #1',
    'rango de edad jugador(a) #1'
  ],

  player2Name: [
    'nombre completo jugador(a) #2',
    'nombre completo jugador #2',
    'nombre jugador(a) #2',
    'nombre jugador #2'
  ],

  player2Email: [
    'email jugador(a) #2',
    'email jugador #2',
    'correo jugador(a) #2',
    'correo jugador #2'
  ],

  player2Phone: [
    'numero de telefono jugador(a) #2',
    'numero de teléfono jugador(a) #2',
    'número de telefono jugador(a) #2',
    'número de teléfono jugador(a) #2',
    'telefono jugador(a) #2',
    'teléfono jugador(a) #2'
  ],

  player2Document: [
    'numero de identificación jugador(a) #2',
    'numero de identificacion jugador(a) #2',
    'número de identificación jugador(a) #2',
    'número de identificacion jugador(a) #2',
    'identificación jugador(a) #2',
    'identificacion jugador(a) #2'
  ],

  player2ShirtSize: [
    'talla camisa jugador(a) #2',
    'talla camisa jugador #2',
    'talla jugador(a) #2',
    'talla jugador #2'
  ],

  player2AgeRange: [
    'edad jugador #2',
    'edad jugador(a) #2',
    'rango de edad jugador #2',
    'rango de edad jugador(a) #2'
  ],

  paymentProof: [
    'para confirmar tu cupo, debes realizar el pago ($) del valor de la inscripción a la cuenta de ahorros bancolombia nº 55400011618 y adjuntar el comprobante de pago de la inscripción.',
    'comprobante de pago',
    'comprobante',
    'soporte de pago'
  ],

  reportedAmount: [
    '$$$',
    'valor',
    'valor reportado',
    'valor pagado'
  ]
};

/* =========================================================
   UTILIDADES DE NORMALIZACIÓN
   ========================================================= */

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return String(value ?? '')
    .replace(/[^\d+]/g, '')
    .trim();
}

function normalizeDocument(value) {
  return String(value ?? '')
    .replace(/[^\dA-Za-z-]/g, '')
    .trim();
}

function normalizeMoney(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = normalizeText(value);

  if (!raw) {
    return 0;
  }

  const cleaned = raw
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function excelSerialToISOString(serial, XLSX) {
  if (!Number.isFinite(serial)) {
    return '';
  }

  const parsed = XLSX.SSF.parse_date_code(serial);

  if (!parsed) {
    return '';
  }

  const date = new Date(
    parsed.y,
    parsed.m - 1,
    parsed.d,
    parsed.H || 0,
    parsed.M || 0,
    Math.floor(parsed.S || 0)
  );

  return date.toISOString();
}

function parseTimestamp(value, XLSX) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return excelSerialToISOString(value, XLSX);
  }

  const raw = normalizeText(value);

  if (!raw) {
    return '';
  }

  const nativeDate = new Date(raw);

  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString();
  }

  const latinMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (latinMatch) {
    const [
      ,
      day,
      month,
      yearValue,
      hours = '0',
      minutes = '0',
      seconds = '0'
    ] = latinMatch;

    const year =
      yearValue.length === 2
        ? Number(`20${yearValue}`)
        : Number(yearValue);

    const date = new Date(
      year,
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return raw;
}

function normalizeCategory(value) {
  return normalizeText(value)
    .replace(/\s*\(.*?sold\s*out.*?\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAgeRange(value) {
  const raw = normalizeText(value);
  const normalized = normalizeHeader(raw);

  if (!normalized) {
    return '';
  }

  if (
    normalized.includes('menor') &&
    normalized.includes('18')
  ) {
    return 'Menor de 18 años';
  }

  if (
    normalized.includes('18') &&
    normalized.includes('28')
  ) {
    return 'Entre 18 y 28 años';
  }

  if (
    normalized.includes('29') &&
    normalized.includes('40')
  ) {
    return 'Entre 29 y 40 años';
  }

  if (
    normalized.includes('mayor') &&
    normalized.includes('41')
  ) {
    return 'Mayor de 41 años';
  }

  return raw;
}

function createStableHash(value) {
  const text = String(value ?? '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getPrimaryPlayerIdentifier(player) {
  return (
    normalizeEmail(player?.email) ||
    normalizePhone(player?.phone) ||
    normalizeDocument(player?.document) ||
    normalizeHeader(player?.name)
  );
}

export function buildRegistrationKey(registration) {
  const timestamp = registration.sourceTimestamp || '';
  const playerIdentifier =
    getPrimaryPlayerIdentifier(registration.player1) ||
    getPrimaryPlayerIdentifier(registration.player2);

  if (!timestamp || !playerIdentifier) {
    return '';
  }

  return `reg_${createStableHash(
    `${timestamp}|${playerIdentifier}`
  )}`;
}

function buildSourceFingerprint(registration) {
  const comparable = {
    sourceTimestamp: registration.sourceTimestamp,
    category: registration.category,
    teamName: registration.teamName,
    player1: registration.player1,
    player2: registration.player2,
    paymentProofUrl: registration.paymentProofUrl,
    sourceReportedAmount: registration.sourceReportedAmount,
    sourceExtraData: registration.sourceExtraData
  };

  return createStableHash(JSON.stringify(comparable));
}

/* =========================================================
   DETECCIÓN DE COLUMNAS
   ========================================================= */

function findHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);

  return headers.findIndex((header) =>
    normalizedAliases.includes(normalizeHeader(header))
  );
}

function buildColumnMap(headers) {
  const map = {};

  Object.entries(HEADER_ALIASES).forEach(
    ([field, aliases]) => {
      map[field] = findHeaderIndex(headers, aliases);
    }
  );

  return map;
}

function assertRequiredColumns(columnMap) {
  const missing = [];

  if (columnMap.timestamp < 0) {
    missing.push('Timestamp');
  }

  if (columnMap.category < 0) {
    missing.push('Categoría');
  }

  if (columnMap.player1Name < 0) {
    missing.push('Nombre jugador 1');
  }

  if (columnMap.player2Name < 0) {
    missing.push('Nombre jugador 2');
  }

  if (missing.length) {
    throw new Error(
      `No se encontraron estas columnas requeridas: ${missing.join(
        ', '
      )}.`
    );
  }
}

function getCell(row, index) {
  return index >= 0 ? row[index] : '';
}

/* =========================================================
   CONVERSIÓN DE UNA FILA
   ========================================================= */

function buildPlayer(row, columnMap, number) {
  const prefix = `player${number}`;

  return {
    name: normalizeText(
      getCell(row, columnMap[`${prefix}Name`])
    ),
    email: normalizeEmail(
      getCell(row, columnMap[`${prefix}Email`])
    ),
    phone: normalizePhone(
      getCell(row, columnMap[`${prefix}Phone`])
    ),
    document: normalizeDocument(
      getCell(row, columnMap[`${prefix}Document`])
    ),
    shirtSize: normalizeText(
      getCell(row, columnMap[`${prefix}ShirtSize`])
    ).toUpperCase(),
    ageRange: normalizeAgeRange(
      getCell(row, columnMap[`${prefix}AgeRange`])
    )
  };
}

function collectExtraData(headers, row, columnMap) {
  const usedIndexes = new Set(
    Object.values(columnMap).filter(
      (index) => Number.isInteger(index) && index >= 0
    )
  );

  return headers.reduce((extraData, header, index) => {
    if (usedIndexes.has(index)) {
      return extraData;
    }

    const value = getCell(row, index);

    if (
      header === null ||
      header === undefined ||
      normalizeText(header) === '' ||
      value === null ||
      value === undefined ||
      normalizeText(value) === ''
    ) {
      return extraData;
    }

    extraData[normalizeText(header)] = value;

    return extraData;
  }, {});
}

function normalizeRegistrationRow({
  row,
  rowNumber,
  headers,
  columnMap,
  tournament,
  XLSX
}) {
  const player1 = buildPlayer(row, columnMap, 1);
  const player2 = buildPlayer(row, columnMap, 2);

  const sourceTimestamp = parseTimestamp(
    getCell(row, columnMap.timestamp),
    XLSX
  );

  const registration = {
    tournamentId: tournament.id,
    tournamentName: tournament.name,

    source: 'excel',
    sourceRowNumber: rowNumber,
    sourceTimestamp,

    category: normalizeCategory(
      getCell(row, columnMap.category)
    ),

    player1,
    player2,

    teamName: [player1.name, player2.name]
      .filter(Boolean)
      .join(' / '),

    paymentProofUrl: normalizeText(
      getCell(row, columnMap.paymentProof)
    ),

    sourceReportedAmount: normalizeMoney(
      getCell(row, columnMap.reportedAmount)
    ),

    sourceExtraData: collectExtraData(
      headers,
      row,
      columnMap
    )
  };

  registration.registrationKey =
    buildRegistrationKey(registration);

  registration.sourceFingerprint =
    buildSourceFingerprint(registration);

  return registration;
}

function validateRegistration(registration) {
  const errors = [];

  if (!registration.sourceTimestamp) {
    errors.push('Timestamp vacío o inválido.');
  }

  if (!registration.category) {
    errors.push('Categoría vacía.');
  }

  if (!registration.player1?.name) {
    errors.push('Jugador 1 sin nombre.');
  }

  if (!registration.player2?.name) {
    errors.push('Jugador 2 sin nombre.');
  }

  if (!registration.registrationKey) {
    errors.push(
      'No fue posible construir el identificador de la inscripción.'
    );
  }

  return errors;
}

/* =========================================================
   LECTURA DEL ARCHIVO
   ========================================================= */

export async function readTournamentExcel({
  file,
  tournament
}) {
  if (!file) {
    throw new Error('Selecciona un archivo de Excel.');
  }

  if (!tournament?.id) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const allowedExtensions = [
    '.xlsx',
    '.xls',
    '.xlsm',
    '.csv'
  ];

  const lowerName = file.name.toLowerCase();

  if (
    !allowedExtensions.some((extension) =>
      lowerName.endsWith(extension)
    )
  ) {
    throw new Error(
      'El archivo debe ser .xlsx, .xls, .xlsm o .csv.'
    );
  }

  const XLSX = await loadSheetJS();
  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: false,
    cellText: false,
    raw: true
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      'El archivo no contiene hojas para importar.'
    );
  }

  const sheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: ''
  });

  if (!matrix.length) {
    throw new Error('La hoja está vacía.');
  }

  const headers = matrix[0].map((value) =>
    normalizeText(value)
  );

  const columnMap = buildColumnMap(headers);

  assertRequiredColumns(columnMap);

  const registrations = [];
  const invalidRows = [];
  const duplicatedKeys = new Set();
  const keysSeen = new Set();

  matrix.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;

    const isEmpty = row.every(
      (value) =>
        value === null ||
        value === undefined ||
        normalizeText(value) === ''
    );

    if (isEmpty) {
      return;
    }

    const registration = normalizeRegistrationRow({
      row,
      rowNumber,
      headers,
      columnMap,
      tournament,
      XLSX
    });

    const errors = validateRegistration(registration);

    if (errors.length) {
      invalidRows.push({
        rowNumber,
        errors,
        registration
      });
      return;
    }

    if (keysSeen.has(registration.registrationKey)) {
      duplicatedKeys.add(registration.registrationKey);
    }

    keysSeen.add(registration.registrationKey);
    registrations.push(registration);
  });

  return {
    fileName: file.name,
    sheetName,
    headers,
    columnMap,
    registrations,
    invalidRows,
    duplicateKeys: [...duplicatedKeys],
    totalRows: matrix.length - 1,
    validRows: registrations.length
  };
}

/* =========================================================
   COMPARACIÓN CONTRA FIREBASE
   ========================================================= */

function getExistingFingerprint(registration) {
  if (registration.sourceFingerprint) {
    return registration.sourceFingerprint;
  }

  return buildSourceFingerprint(registration);
}

export async function compareTournamentImport({
  tournament,
  importedRegistrations
}) {
  if (!tournament?.id) {
    throw new Error(
      'No fue posible identificar el torneo.'
    );
  }

  const existingRegistrations = (
    await db.getAll('tournamentRegistrations')
  ).filter(
    (registration) =>
      registration.tournamentId === tournament.id
  );

  const existingByKey = new Map(
    existingRegistrations
      .filter((registration) => registration.registrationKey)
      .map((registration) => [
        registration.registrationKey,
        registration
      ])
  );

  const newRegistrations = [];
  const updatedRegistrations = [];
  const unchangedRegistrations = [];
  const excludedRegistrations = [];
  const reviewRegistrations = [];

  importedRegistrations.forEach((imported) => {
    const existing = existingByKey.get(
      imported.registrationKey
    );

    if (!existing) {
      newRegistrations.push(imported);
      return;
    }

    if (
      existing.deletedFromImport === true ||
      existing.isExcluded === true
    ) {
      excludedRegistrations.push({
        imported,
        existing
      });
      return;
    }

    const importedFingerprint =
      imported.sourceFingerprint;

    const existingFingerprint =
      getExistingFingerprint(existing);

    if (
      importedFingerprint === existingFingerprint
    ) {
      unchangedRegistrations.push({
        imported,
        existing
      });
      return;
    }

    if (
      existing.player1?.name &&
      existing.player2?.name &&
      (!imported.player1?.name ||
        !imported.player2?.name)
    ) {
      reviewRegistrations.push({
        imported,
        existing,
        reason:
          'El archivo nuevo tiene menos información que el registro existente.'
      });
      return;
    }

    updatedRegistrations.push({
      imported,
      existing
    });
  });

  return {
    newRegistrations,
    updatedRegistrations,
    unchangedRegistrations,
    excludedRegistrations,
    reviewRegistrations,

    counts: {
      new: newRegistrations.length,
      updated: updatedRegistrations.length,
      unchanged: unchangedRegistrations.length,
      excluded: excludedRegistrations.length,
      review: reviewRegistrations.length,
      total: importedRegistrations.length
    }
  };
}

/* =========================================================
   PREPARACIÓN PARA GUARDAR
   ========================================================= */

function preserveFinancialFields(existing = {}) {
  return {
    paymentStatus:
      existing.paymentStatus || 'review',

    paymentDate:
      existing.paymentDate || '',

    paidAmount:
      Number(existing.paidAmount || 0),

    registrationValue:
      Number(existing.registrationValue || 0),

    discountType:
      existing.discountType || 'fixed',

    discountValue:
      Number(existing.discountValue || 0),

    discountAmount:
      Number(existing.discountAmount || 0),

    discountReason:
      existing.discountReason || '',

    finalAmount:
      Number(existing.finalAmount || 0),

    movementId:
      existing.movementId || null,

    notes:
      existing.notes || '',

    internalNotes:
      existing.internalNotes || '',

    deletedFromImport:
      existing.deletedFromImport === true,

    deletedAt:
      existing.deletedAt || null,

    deletedReason:
      existing.deletedReason || ''
  };
}

export function prepareImportedRegistrationForSave({
  imported,
  existing,
  tournament
}) {
  const now = new Date().toISOString();

  const defaultRegistrationValue = Number(
    tournament.registrationValue || 0
  );

  const financialFields = preserveFinancialFields(
    existing
  );

  const registrationValue =
    existing?.registrationValue !== undefined
      ? Number(existing.registrationValue || 0)
      : defaultRegistrationValue;

  const finalAmount =
    existing?.finalAmount !== undefined &&
    Number(existing.finalAmount) >= 0
      ? Number(existing.finalAmount)
      : registrationValue;

  return {
    ...existing,
    ...imported,

    id:
      existing?.id ||
      imported.id ||
      crypto.randomUUID(),

    tournamentId: tournament.id,
    tournamentName: tournament.name,

    ...financialFields,

    registrationValue,
    finalAmount,

    createdAt:
      existing?.createdAt ||
      imported.createdAt ||
      now,

    importedAt:
      existing?.importedAt || now,

    lastSyncedAt: now,
    updatedAt: now
  };
}

/* =========================================================
   RESUMEN PARA LA INTERFAZ
   ========================================================= */

export function buildImportPreview({
  readResult,
  comparison
}) {
  return {
    fileName: readResult.fileName,
    sheetName: readResult.sheetName,

    totalRows: readResult.totalRows,
    validRows: readResult.validRows,
    invalidRows: readResult.invalidRows.length,
    duplicatesInFile: readResult.duplicateKeys.length,

    newCount: comparison.counts.new,
    updatedCount: comparison.counts.updated,
    unchangedCount: comparison.counts.unchanged,
    excludedCount: comparison.counts.excluded,
    reviewCount: comparison.counts.review
  };
}
