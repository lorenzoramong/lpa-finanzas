import { useEffect, useMemo, useState } from 'react';

import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import History from './pages/History';
import Projections from './pages/Projections';
import Tournaments from './pages/Tournaments';
import Academy from './pages/Academy';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

import { db, seedDatabase } from './lib/db';

import {
  changeAcademyPaymentStatus,
  ensureAcademyCyclePayments,
  ensureCurrentAcademyCycle,
  saveAcademyCycleSettings,
  updateAcademyPayment
} from './lib/academy';

import {
  prepareImportedRegistrationForSave
} from './lib/tournamentImport';

import {
  calculateTournamentFinancials,
  changeRegistrationPaymentStatus,
  changeTournamentTransactionStatus,
  loadTournamentModule,
  removeTournamentRecord,
  removeTournamentRegistration,
  removeTournamentTransaction,
  saveTournamentRecord,
  saveTournamentRegistration,
  saveTournamentTransaction
} from './lib/tournaments';

function normalizePlayerIdentifier(player) {
  return String(
    player?.email ||
      player?.phone ||
      player?.document ||
      player?.name ||
      ''
  )
    .trim()
    .toLowerCase();
}

function createStableId(value) {
  const text = String(value || '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `player_${(hash >>> 0).toString(36)}`;
}


export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projections, setProjections] = useState([]);

  const [tournaments, setTournaments] = useState([]);
  const [tournamentTransactions, setTournamentTransactions] =
    useState([]);
  const [tournamentRegistrations, setTournamentRegistrations] =
    useState([]);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [tournamentImports, setTournamentImports] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] =
    useState(null);

  const [academyLocations, setAcademyLocations] = useState([]);
  const [academyCoaches, setAcademyCoaches] = useState([]);
  const [academyPlayers, setAcademyPlayers] = useState([]);
  const [academyCycles, setAcademyCycles] = useState([]);
  const [academyPayments, setAcademyPayments] = useState([]);
  const [academySettings, setAcademySettings] = useState(null);

  const [settings, setSettings] = useState({
    initialBalance: 0,
    projectionTrafficLight: {
      yellowDays: 15,
      redDays: 0
    }
  });

  const [initialType, setInitialType] = useState('income');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      await seedDatabase();

      const [
        movementData,
        categoryData,
        projectionData,
        settingsData,
        tournamentData,
        academyLocationData,
        academyCoachData,
        academyPlayerData,
        academyCycleData
      ] = await Promise.all([
        db.getAll('movements'),
        db.getAll('categories'),
        db.getAll('projections'),
        db.get('settings', 'general'),
        loadTournamentModule(),
        db.getAll('academyLocations'),
        db.getAll('academyCoaches'),
        db.getAll('academyPlayers'),
        db.getAll('academyCycles')
      ]);

      await ensureCurrentAcademyCycle({
        cycles: academyCycleData || [],
        players: academyPlayerData || [],
        coaches: academyCoachData || [],
        locations: academyLocationData || [],
        settings:
          settingsData?.academySettings || {}
      });

      const refreshedAcademyCycles =
        await db.getAll('academyCycles');

      const existingAcademyPayments =
        await db.getAll('academyPayments');

      await ensureAcademyCyclePayments({
        cycles: refreshedAcademyCycles || [],
        payments: existingAcademyPayments || []
      });

      const refreshedAcademyPayments =
        await db.getAll('academyPayments');

      /*
       * ensureAcademyCyclePayments puede crear/actualizar
       * proyecciones. Recargamos movimientos y proyecciones
       * para que Inicio, Proyecciones y Flujo queden en sintonía.
       */
      const [
        refreshedMovements,
        refreshedProjections
      ] = await Promise.all([
        db.getAll('movements'),
        db.getAll('projections')
      ]);

      setMovements(refreshedMovements || []);

      setCategories(categoryData || []);
      setProjections(
        refreshedProjections || []
      );

      setTournaments(tournamentData.tournaments || []);
      setTournamentTransactions(
        tournamentData.transactions || []
      );
      setTournamentRegistrations(
        tournamentData.registrations || []
      );
      setTournamentPlayers(tournamentData.players || []);
      setTournamentImports(tournamentData.imports || []);

      setAcademyLocations(academyLocationData || []);
      setAcademyCoaches(academyCoachData || []);
      setAcademyPlayers(academyPlayerData || []);
      setAcademyCycles(
        refreshedAcademyCycles || []
      );
      setAcademyPayments(
        refreshedAcademyPayments || []
      );
      setAcademySettings(
        settingsData?.academySettings || {
          cycleStartDay: 19,
          cycleEndDay: 19
        }
      );

      setSettings(
        settingsData || {
          initialBalance: 0,
          projectionTrafficLight: {
            yellowDays: 15,
            redDays: 0
          }
        }
      );
    } catch (error) {
      console.error('Error al cargar la aplicación:', error);
      alert('No fue posible cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const income = movements
      .filter((movement) => movement.type === 'income')
      .reduce(
        (total, movement) =>
          total + Number(movement.amount || 0),
        0
      );

    const expenses = movements
      .filter((movement) => movement.type === 'expense')
      .reduce(
        (total, movement) =>
          total + Number(movement.amount || 0),
        0
      );

    return {
      income,
      expenses,
      utility: income - expenses,
      balance:
        Number(settings.initialBalance || 0) +
        income -
        expenses
    };
  }, [movements, settings]);

  const projectionTotals = useMemo(() => {
    const pendingProjections = projections.filter(
      (projection) => projection.status !== 'completed'
    );

    const projectedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const projectedExpenses = pendingProjections
      .filter((projection) => projection.type === 'expense')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const weightedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total +
          Number(projection.amount || 0) *
            (Number(projection.probability || 0) / 100),
        0
      );

    return {
      projectedIncome,
      projectedExpenses,
      projectedUtility:
        projectedIncome - projectedExpenses,
      weightedIncome,
      projectedBalance:
        totals.balance +
        weightedIncome -
        projectedExpenses
    };
  }, [projections, totals.balance]);

  const projectionStatusSummary = useMemo(() => {
    const yellowDays =
      settings?.projectionTrafficLight?.yellowDays ?? 15;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      onTime: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
      pendingIncomeCount: 0,
      pendingExpenseCount: 0
    };

    projections.forEach((projection) => {
      if (projection.status === 'completed') {
        summary.completed += 1;
        return;
      }

      if (projection.type === 'income') {
        summary.pendingIncomeCount += 1;
      }

      if (projection.type === 'expense') {
        summary.pendingExpenseCount += 1;
      }

      if (!projection.dueDate) {
        summary.onTime += 1;
        return;
      }

      const dueDate = new Date(
        `${projection.dueDate}T00:00:00`
      );

      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) / 86400000
      );

      if (daysRemaining < 0) {
        summary.overdue += 1;
      } else if (daysRemaining <= yellowDays) {
        summary.upcoming += 1;
      } else {
        summary.onTime += 1;
      }
    });

    return summary;
  }, [projections, settings]);

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) => tournament.id === selectedTournamentId
      ) || null,
    [tournaments, selectedTournamentId]
  );

  const tournamentFinancials = useMemo(() => {
    return tournaments.reduce((result, tournament) => {
      result[tournament.id] = calculateTournamentFinancials({
        tournament,
        transactions: tournamentTransactions,
        registrations: tournamentRegistrations
      });

      return result;
    }, {});
  }, [
    tournaments,
    tournamentTransactions,
    tournamentRegistrations
  ]);

  const tournamentSummary = useMemo(() => {
    return tournaments.reduce(
      (summary, tournament) => {
        const financials =
          tournamentFinancials[tournament.id] || {};

        summary.projectedIncome += Number(
          financials.projectedIncome || 0
        );
        summary.realIncome += Number(
          financials.realIncome || 0
        );
        summary.projectedExpenses += Number(
          financials.projectedExpenses || 0
        );
        summary.realExpenses += Number(
          financials.realExpenses || 0
        );
        summary.projectedUtility += Number(
          financials.projectedUtility || 0
        );
        summary.realUtility += Number(
          financials.realUtility || 0
        );
        summary.totalPairs += Number(
          financials.totalPairs || 0
        );
        summary.totalPlayers += Number(
          financials.totalPlayers || 0
        );

        return summary;
      },
      {
        projectedIncome: 0,
        realIncome: 0,
        projectedExpenses: 0,
        realExpenses: 0,
        projectedUtility: 0,
        realUtility: 0,
        totalPairs: 0,
        totalPlayers: 0
      }
    );
  }, [tournaments, tournamentFinancials]);

  const openNewMovement = (type = 'income') => {
    setEditing(null);
    setInitialType(type);
    setTab('movements');
  };

  const saveMovement = async (data) => {
    try {
      const item = {
        ...data,
        amount: Number(data.amount),
        id: editing?.id || crypto.randomUUID(),
        createdAt:
          editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.put('movements', item);

      setEditing(null);
      await load();
      setTab('cashflow');
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      alert('No fue posible guardar el movimiento.');
    }
  };

  const deleteMovement = async (id) => {
    const confirmed = confirm(
      '¿Eliminar este movimiento? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('movements', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
      alert('No fue posible eliminar el movimiento.');
    }
  };

  const editMovement = (movement) => {
    setEditing(movement);
    setInitialType(movement.type);
    setTab('movements');
  };

  const saveProjection = async (projection) => {
    try {
      const existingProjection = projection.id
        ? projections.find(
            (item) => item.id === projection.id
          )
        : null;

      const item = {
        ...projection,
        id: projection.id || crypto.randomUUID(),
        amount: Number(projection.amount || 0),
        probability: Number(
          projection.probability ?? 100
        ),
        status:
          projection.status ||
          existingProjection?.status ||
          'pending',
        completedAt:
          projection.completedAt ??
          existingProjection?.completedAt ??
          null,
        createdAt:
          projection.createdAt ||
          existingProjection?.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.put('projections', item);
      await load();
    } catch (error) {
      console.error('Error al guardar proyección:', error);
      alert('No fue posible guardar la proyección.');
    }
  };

  const deleteProjection = async (id) => {
    const confirmed = confirm(
      '¿Eliminar esta proyección? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('projections', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar proyección:', error);
      alert('No fue posible eliminar la proyección.');
    }
  };

  const completeProjection = async (projection) => {
    const isIncome = projection.type === 'income';
    const completedLabel = isIncome ? 'recibido' : 'pagado';

    const confirmed = confirm(
      `¿Confirmas que este ${
        isIncome ? 'ingreso' : 'egreso'
      } ya fue ${completedLabel}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const completedAt = new Date().toISOString();

      await db.put('projections', {
        ...projection,
        status: 'completed',
        completedAt,
        updatedAt: completedAt
      });

      const registerAsMovement = confirm(
        `La proyección fue marcada como ${completedLabel}.\n\n¿Deseas registrarla también como movimiento real en el flujo de caja?`
      );

      if (registerAsMovement) {
        let projectionCategory = categories.find(
          (category) =>
            category.name?.trim().toLowerCase() ===
            'proyecciones'
        );

        if (!projectionCategory) {
          projectionCategory = {
            id: crypto.randomUUID(),
            name: 'Proyecciones',
            color: '#172A46',
            subcategories: [
              'Ingreso proyectado',
              'Egreso proyectado'
            ],
            createdAt: completedAt,
            updatedAt: completedAt
          };

          await db.put(
            'categories',
            projectionCategory
          );
        }

        await db.put('movements', {
          id: crypto.randomUUID(),
          type: projection.type,
          date: completedAt.slice(0, 10),
          amount: Number(projection.amount || 0),
          category: projectionCategory.name,
          subcategory: isIncome
            ? 'Ingreso proyectado'
            : 'Egreso proyectado',
          description: projection.description,
          notes: [
            projection.notes,
            `Creado desde la proyección ${projection.id}.`
          ]
            .filter(Boolean)
            .join(' '),
          projectionId: projection.id,
          createdAt: completedAt,
          updatedAt: completedAt
        });
      }

      await load();

      alert(
        registerAsMovement
          ? 'La proyección se completó y el movimiento real fue creado.'
          : 'La proyección fue completada.'
      );
    } catch (error) {
      console.error(
        'Error al completar proyección:',
        error
      );

      alert('No fue posible completar la proyección.');
    }
  };

  const handleSaveTournament = async (tournamentData) => {
    try {
      const savedTournament =
        await saveTournamentRecord(tournamentData);

      setSelectedTournamentId(savedTournament.id);
      await load();

      return savedTournament;
    } catch (error) {
      console.error('Error al guardar torneo:', error);
      alert(
        error.message || 'No fue posible guardar el torneo.'
      );
      return null;
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    const tournament = tournaments.find(
      (item) => item.id === tournamentId
    );

    const confirmed = confirm(
      `¿Eliminar ${
        tournament?.name || 'este torneo'
      }?\n\nTambién se eliminarán sus inscripciones, ingresos, egresos y todos los movimientos relacionados del flujo de caja.`
    );

    if (!confirmed) {
      return false;
    }

    try {
      await removeTournamentRecord(tournamentId);

      if (selectedTournamentId === tournamentId) {
        setSelectedTournamentId(null);
      }

      await load();
      return true;
    } catch (error) {
      console.error('Error al eliminar torneo:', error);
      alert('No fue posible eliminar el torneo.');
      return false;
    }
  };

  const handleSaveTournamentTransaction = async ({
    transaction,
    tournament
  }) => {
    try {
      const savedTransaction =
        await saveTournamentTransaction({
          transaction,
          tournament
        });

      await load();
      return savedTransaction;
    } catch (error) {
      console.error(
        'Error al guardar ingreso o egreso:',
        error
      );
      alert(
        error.message ||
          'No fue posible guardar el registro financiero.'
      );
      return null;
    }
  };

  const handleChangeTournamentTransactionStatus = async ({
    transaction,
    tournament,
    status
  }) => {
    try {
      const savedTransaction =
        await changeTournamentTransactionStatus({
          transaction,
          tournament,
          status
        });

      await load();
      return savedTransaction;
    } catch (error) {
      console.error(
        'Error al cambiar el estado financiero:',
        error
      );
      alert(
        error.message ||
          'No fue posible cambiar el estado.'
      );
      return null;
    }
  };

  const handleDeleteTournamentTransaction = async (
    transactionId
  ) => {
    const confirmed = confirm(
      '¿Eliminar este registro financiero?\n\nSi ya generó un movimiento, también se eliminará del flujo de caja.'
    );

    if (!confirmed) {
      return false;
    }

    try {
      await removeTournamentTransaction(transactionId);
      await load();
      return true;
    } catch (error) {
      console.error(
        'Error al eliminar ingreso o egreso:',
        error
      );
      alert('No fue posible eliminar el registro financiero.');
      return false;
    }
  };

  const handleSaveTournamentRegistration = async ({
    registration,
    tournament
  }) => {
    try {
      const savedRegistration =
        await saveTournamentRegistration({
          registration,
          tournament
        });

      await load();
      return savedRegistration;
    } catch (error) {
      console.error(
        'Error al guardar inscripción:',
        error
      );
      alert(
        error.message ||
          'No fue posible guardar la inscripción.'
      );
      return null;
    }
  };

  const handleChangeRegistrationPaymentStatus = async ({
    registration,
    tournament,
    paymentStatus
  }) => {
    try {
      const savedRegistration =
        await changeRegistrationPaymentStatus({
          registration,
          tournament,
          paymentStatus
        });

      await load();
      return savedRegistration;
    } catch (error) {
      console.error(
        'Error al cambiar el estado de la inscripción:',
        error
      );
      alert(
        error.message ||
          'No fue posible cambiar el estado de pago.'
      );
      return null;
    }
  };

  const handleDeleteTournamentRegistration = async (
    registrationId
  ) => {
    const confirmed = confirm(
      '¿Eliminar esta inscripción?\n\nSi ya generó un ingreso, también se eliminará del flujo de caja.'
    );

    if (!confirmed) {
      return false;
    }

    try {
      await removeTournamentRegistration(registrationId);
      await load();
      return true;
    } catch (error) {
      console.error(
        'Error al eliminar inscripción:',
        error
      );
      alert('No fue posible eliminar la inscripción.');
      return false;
    }
  };

  const handleImportTournamentRegistrations = async ({
    tournament,
    readResult,
    comparison
  }) => {
    if (!tournament?.id) {
      throw new Error(
        'No fue posible identificar el torneo.'
      );
    }

    const now = new Date().toISOString();

    const playerMap = new Map(
      tournamentPlayers.map((player) => [
        normalizePlayerIdentifier(player),
        player
      ])
    );

    const upsertPlayer = async (
      playerData,
      registrationId
    ) => {
      const identifier =
        normalizePlayerIdentifier(playerData);

      if (!identifier) {
        return;
      }

      const existing = playerMap.get(identifier);

      const tournamentIds = Array.from(
        new Set([
          ...(existing?.tournamentIds || []),
          tournament.id
        ])
      );

      const registrationIds = Array.from(
        new Set([
          ...(existing?.registrationIds || []),
          registrationId
        ])
      );

      const player = {
        ...existing,
        ...playerData,

        id:
          existing?.id ||
          createStableId(identifier),

        normalizedIdentifier: identifier,

        tournamentIds,
        registrationIds,

        firstSeenAt:
          existing?.firstSeenAt || now,

        lastSeenAt: now,
        updatedAt: now
      };

      await db.put('players', player);
      playerMap.set(identifier, player);
    };

    let created = 0;
    let updated = 0;

    const recordsToSave = [
      ...comparison.newRegistrations.map(
        (imported) => ({
          imported,
          existing: null,
          operation: 'created'
        })
      ),

      ...comparison.updatedRegistrations.map(
        ({ imported, existing }) => ({
          imported,
          existing,
          operation: 'updated'
        })
      )
    ];

    for (const record of recordsToSave) {
      const preparedRegistration =
        prepareImportedRegistrationForSave({
          imported: record.imported,
          existing: record.existing,
          tournament
        });

      await db.put(
        'tournamentRegistrations',
        preparedRegistration
      );

      await upsertPlayer(
        preparedRegistration.player1,
        preparedRegistration.id
      );

      await upsertPlayer(
        preparedRegistration.player2,
        preparedRegistration.id
      );

      if (record.operation === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }

    const importRecord = {
      id: crypto.randomUUID(),

      tournamentId: tournament.id,
      tournamentName: tournament.name,

      fileName: readResult.fileName,
      sheetName: readResult.sheetName,

      totalRows: readResult.totalRows,
      validRows: readResult.validRows,

      created,
      updated,

      unchanged:
        comparison.counts.unchanged,

      excluded:
        comparison.counts.excluded,

      review:
        comparison.counts.review,

      invalid:
        readResult.invalidRows.length,

      duplicates:
        readResult.duplicateKeys.length,

      createdAt: now,
      updatedAt: now
    };

    await db.put(
      'tournamentImports',
      importRecord
    );

    await load();

    return importRecord;
  };

  const handleSaveAcademyCoach = async (coachData) => {
    if (!coachData?.locationId) {
      alert('No fue posible identificar la sede.');
      return null;
    }

    try {
      const existingCoach = academyCoaches.find(
        (coach) =>
          coach.locationId === coachData.locationId
      );

      const now = new Date().toISOString();

      const coach = {
        ...existingCoach,
        ...coachData,

        id:
          existingCoach?.id ||
          coachData.id ||
          crypto.randomUUID(),

        name: String(
          coachData.name || ''
        ).trim(),

        phone: String(
          coachData.phone || ''
        ).trim(),

        email: String(
          coachData.email || ''
        ).trim(),

        paymentPerCycle: Number(
          coachData.paymentPerCycle || 0
        ),

        active:
          coachData.active !== false,

        notes: String(
          coachData.notes || ''
        ).trim(),

        createdAt:
          existingCoach?.createdAt ||
          coachData.createdAt ||
          now,

        updatedAt: now
      };

      if (!coach.name) {
        alert('El entrenador debe tener un nombre.');
        return null;
      }

      await db.put(
        'academyCoaches',
        coach
      );

      await load();

      return coach;
    } catch (error) {
      console.error(
        'Error al guardar entrenador:',
        error
      );

      alert(
        'No fue posible guardar el entrenador.'
      );

      return null;
    }
  };

  const handleSaveAcademyPlayer = async (playerData) => {
    if (!playerData?.locationId) {
      alert('No fue posible identificar la sede.');
      return null;
    }

    try {
      const existingPlayer = playerData.id
        ? academyPlayers.find(
            (player) => player.id === playerData.id
          )
        : null;

      const now = new Date().toISOString();

      const player = {
        ...existingPlayer,
        ...playerData,

        id:
          existingPlayer?.id ||
          playerData.id ||
          crypto.randomUUID(),

        name: String(
          playerData.name || ''
        ).trim(),

        phone: String(
          playerData.phone || ''
        ).trim(),

        email: String(
          playerData.email || ''
        ).trim(),

        monthlyFee: Number(
          playerData.monthlyFee || 0
        ),

        active:
          playerData.active !== false,

        notes: String(
          playerData.notes || ''
        ).trim(),

        createdAt:
          existingPlayer?.createdAt ||
          playerData.createdAt ||
          now,

        updatedAt: now
      };

      if (!player.name) {
        alert('El jugador debe tener un nombre.');
        return null;
      }

      await db.put(
        'academyPlayers',
        player
      );

      await load();

      return player;
    } catch (error) {
      console.error(
        'Error al guardar jugador:',
        error
      );

      alert(
        'No fue posible guardar el jugador.'
      );

      return null;
    }
  };

  const handleToggleAcademyPlayer = async (
    player,
    nextActive
  ) => {
    if (!player?.id) {
      return null;
    }

    try {
      const updatedPlayer = {
        ...player,
        active: nextActive,
        updatedAt: new Date().toISOString()
      };

      await db.put(
        'academyPlayers',
        updatedPlayer
      );

      await load();

      return updatedPlayer;
    } catch (error) {
      console.error(
        'Error al cambiar estado del jugador:',
        error
      );

      alert(
        'No fue posible cambiar el estado del jugador.'
      );

      return null;
    }
  };

  const handleChangeAcademyPaymentStatus = async ({
    payment,
    status
  }) => {
    try {
      const saved =
        await changeAcademyPaymentStatus({
          payment,
          status
        });

      await load();

      return saved;
    } catch (error) {
      console.error(
        'Error al cambiar estado del pago de academia:',
        error
      );

      alert(
        error.message ||
          'No fue posible cambiar el estado del pago.'
      );

      return null;
    }
  };

  const handleUpdateAcademyPayment = async ({
    payment,
    amount,
    notes
  }) => {
    try {
      const saved =
        await updateAcademyPayment({
          payment,
          amount,
          notes
        });

      await load();

      return saved;
    } catch (error) {
      console.error(
        'Error al actualizar pago de academia:',
        error
      );

      alert(
        error.message ||
          'No fue posible actualizar el pago.'
      );

      return null;
    }
  };

  const handleSaveAcademyCycleSettings = async ({
    cycleStartDay,
    cycleEndDay
  }) => {
    try {
      const updatedSettings =
        await saveAcademyCycleSettings({
          generalSettings: settings,
          cycleStartDay,
          cycleEndDay
        });

      setSettings(updatedSettings);

      setAcademySettings(
        updatedSettings.academySettings
      );

      await load();

      return updatedSettings.academySettings;
    } catch (error) {
      console.error(
        'Error al guardar configuración de ciclos:',
        error
      );

      alert(
        'No fue posible guardar la configuración de ciclos.'
      );

      return null;
    }
  };

  const addCategory = async (category) => {
    try {
      await db.put('categories', {
        ...category,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await load();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      alert('No fue posible crear la categoría.');
    }
  };

  const updateCategory = async (category) => {
    if (!category?.id) {
      alert('No fue posible identificar la categoría.');
      return;
    }

    try {
      await db.put('categories', {
        ...category,
        updatedAt: new Date().toISOString()
      });

      await load();
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      alert('No fue posible actualizar la categoría.');
    }
  };

  const deleteCategory = async (id) => {
    const confirmed = confirm(
      '¿Eliminar esta categoría? Los movimientos existentes no se borrarán.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('categories', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('No fue posible eliminar la categoría.');
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await db.put('settings', {
        ...newSettings,
        id: 'general',
        initialBalance: Number(
          newSettings.initialBalance || 0
        ),
        projectionTrafficLight:
          newSettings.projectionTrafficLight ||
          settings.projectionTrafficLight || {
            yellowDays: 15,
            redDays: 0
          },
        updatedAt: new Date().toISOString()
      });

      await load();
      alert('Configuración actualizada.');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('No fue posible actualizar la configuración.');
    }
  };

  const backup = () => {
    const backupData = {
      version: 3,
      exportedAt: new Date().toISOString(),
      settings,
      categories,
      movements,
      projections,
      tournaments,
      tournamentTransactions,
      tournamentRegistrations,
      players: tournamentPlayers,
      tournamentImports,
      academyLocations,
      academyCoaches,
      academyPlayers,
      academyCycles,
      academyPayments
    };

    const blob = new Blob(
      [JSON.stringify(backupData, null, 2)],
      {
        type: 'application/json'
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `LPA-Backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    link.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file) => {
    if (!file) {
      return;
    }

    try {
      const data = JSON.parse(await file.text());

      const confirmed = confirm(
        'Esto reemplazará los datos actuales. ¿Continuar?'
      );

      if (!confirmed) {
        return;
      }

      for (const store of [
        'movements',
        'categories',
        'settings',
        'projections',
        'tournaments',
        'tournamentRegistrations',
        'tournamentTransactions',
        'players',
        'tournamentImports',
        'academyLocations',
        'academyCoaches',
        'academyPlayers',
        'academyCycles',
        'academyPayments'
      ]) {
        await db.clear(store);
      }

      for (const movement of data.movements || []) {
        await db.put('movements', movement);
      }

      for (const category of data.categories || []) {
        await db.put('categories', category);
      }

      for (const projection of data.projections || []) {
        await db.put('projections', projection);
      }

      for (const tournament of data.tournaments || []) {
        await db.put('tournaments', tournament);
      }

      for (const registration of
        data.tournamentRegistrations || []) {
        await db.put(
          'tournamentRegistrations',
          registration
        );
      }

      for (const transaction of
        data.tournamentTransactions || []) {
        await db.put(
          'tournamentTransactions',
          transaction
        );
      }

      for (const player of data.players || []) {
        await db.put('players', player);
      }

      for (const importSession of
        data.tournamentImports || []) {
        await db.put(
          'tournamentImports',
          importSession
        );
      }

      for (const location of
        data.academyLocations || []) {
        await db.put(
          'academyLocations',
          location
        );
      }

      for (const coach of
        data.academyCoaches || []) {
        await db.put(
          'academyCoaches',
          coach
        );
      }

      for (const player of
        data.academyPlayers || []) {
        await db.put(
          'academyPlayers',
          player
        );
      }

      for (const cycle of
        data.academyCycles || []) {
        await db.put(
          'academyCycles',
          cycle
        );
      }

      for (const payment of
        data.academyPayments || []) {
        await db.put(
          'academyPayments',
          payment
        );
      }

      await db.put('settings', {
        ...(data.settings || {}),
        id: 'general',
        updatedAt: new Date().toISOString()
      });

      setSelectedTournamentId(null);
      await load();
      alert('Respaldo restaurado.');
    } catch (error) {
      console.error('Error al restaurar respaldo:', error);
      alert('El archivo no es un respaldo válido.');
    }
  };

  if (loading) {
    return (
      <div className="splash">
        <img
          src={`${import.meta.env.BASE_URL}logo-lpa.png`}
          alt="LPA"
        />

        <div className="loader" />
      </div>
    );
  }

  const content = {
    dashboard: (
      <Home
        totals={totals}
        projectionTotals={projectionTotals}
        projectionStatusSummary={projectionStatusSummary}
        projections={projections}
        onNewMovement={openNewMovement}
        goProjections={() => setTab('projections')}
      />
    ),

    cashflow: (
      <Dashboard
        movements={movements}
        settings={settings}
        totals={totals}
        onNewMovement={openNewMovement}
        goHistory={() => setTab('history')}
      />
    ),

    movements: (
      <Movements
        categories={categories}
        initialType={initialType}
        editing={editing}
        onSave={saveMovement}
        onCancelEdit={() => {
          setEditing(null);
          setTab('history');
        }}
      />
    ),

    history: (
      <History
        movements={movements}
        onEdit={editMovement}
        onDelete={deleteMovement}
      />
    ),

    projections: (
      <Projections
        projections={projections}
        settings={settings}
        onSave={saveProjection}
        onDelete={deleteProjection}
        onComplete={completeProjection}
      />
    ),

    tournaments: (
      <Tournaments
        tournaments={tournaments}
        transactions={tournamentTransactions}
        registrations={tournamentRegistrations}
        players={tournamentPlayers}
        imports={tournamentImports}
        financials={tournamentFinancials}
        summary={tournamentSummary}
        selectedTournament={selectedTournament}
        onSelectTournament={setSelectedTournamentId}
        onCloseTournament={() =>
          setSelectedTournamentId(null)
        }
        onSaveTournament={handleSaveTournament}
        onDeleteTournament={handleDeleteTournament}
        onSaveTransaction={
          handleSaveTournamentTransaction
        }
        onChangeTransactionStatus={
          handleChangeTournamentTransactionStatus
        }
        onDeleteTransaction={
          handleDeleteTournamentTransaction
        }
        onSaveRegistration={
          handleSaveTournamentRegistration
        }
        onChangeRegistrationStatus={
          handleChangeRegistrationPaymentStatus
        }
        onDeleteRegistration={
          handleDeleteTournamentRegistration
        }
        onImportRegistrations={
          handleImportTournamentRegistrations
        }
      />
    ),

    academy: (
      <Academy
        locations={academyLocations}
        coaches={academyCoaches}
        players={academyPlayers}
        cycles={academyCycles}
        settings={academySettings}
        onSaveCoach={handleSaveAcademyCoach}
        onSavePlayer={handleSaveAcademyPlayer}
        onTogglePlayer={handleToggleAcademyPlayer}
        onSaveCycleSettings={
          handleSaveAcademyCycleSettings
        }
        payments={academyPayments}
        onChangePaymentStatus={
          handleChangeAcademyPaymentStatus
        }
        onUpdatePayment={
          handleUpdateAcademyPayment
        }
      />
    ),

    stats: (
      <Stats movements={movements} />
    ),

    settings: (
      <Settings
        settings={settings}
        categories={categories}
        onSaveSettings={saveSettings}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onBackup={backup}
        onRestore={restore}
      />
    )
  }[tab];

  return (
    <Layout
      activeTab={tab}
      setActiveTab={(newTab) => {
        setEditing(null);
        setTab(newTab);
      }}
    >
      {content}
    </Layout>
  );
}

