import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  Plus,
  Search,
  Trash2,
  Trophy,
  Upload,
  Users,
  Wallet
} from 'lucide-react';

import { formatCurrency } from '../lib/format';

import TournamentForm from '../components/tournaments/TournamentForm';
import TournamentModal from '../components/tournaments/TournamentModal';
import TransactionForm from '../components/tournaments/TransactionForm';

const EMPTY_TOURNAMENT_FORM = {
  name: '',
  edition: '',
  season: '',
  venue: '',
  startDate: '',
  endDate: '',
  status: 'draft',
  registrationValue: '',
  projectedPairs: '',
  projectedPlayers: '',
  notes: ''
};

const EMPTY_TRANSACTION_FORM = {
  type: 'income',
  concept: '',
  projectedAmount: '',
  actualAmount: '',
  paidAmount: '',
  status: 'projected',
  date: '',
  dueDate: '',
  provider: '',
  responsible: '',
  notes: ''
};

const TOURNAMENT_STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activo',
  completed: 'Finalizado',
  cancelled: 'Anulado'
};

const TRANSACTION_STATUS_LABELS = {
  projected: 'Proyectado',
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Pagado',
  cancelled: 'Anulado'
};

const REGISTRATION_STATUS_LABELS = {
  review: 'Por verificar',
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  courtesy: 'Cortesía',
  cancelled: 'Anulado'
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getTournamentStatusClass(status) {
  if (status === 'active') {
    return 'active';
  }

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  return 'draft';
}

function getTransactionStatusClass(status) {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  if (status === 'pending') {
    return 'pending';
  }

  return 'projected';
}

function getRegistrationStatusClass(status) {
  if (status === 'paid') {
    return 'completed';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'courtesy') {
    return 'courtesy';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  if (status === 'pending') {
    return 'pending';
  }

  return 'review';
}

function formatTournamentDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export default function Tournaments({
  tournaments = [],
  transactions = [],
  registrations = [],
  players = [],
  imports = [],
  financials = {},
  summary = {},
  selectedTournament,
  onSelectTournament,
  onCloseTournament,
  onSaveTournament,
  onDeleteTournament,
  onSaveTransaction,
  onChangeTransactionStatus,
  onDeleteTransaction,
  onSaveRegistration,
  onChangeRegistrationStatus,
  onDeleteRegistration
}) {
  const [mainView, setMainView] = useState('tournaments');
  const [tournamentTab, setTournamentTab] = useState('summary');

  const [showTournamentForm, setShowTournamentForm] =
    useState(false);

  const [editingTournament, setEditingTournament] =
    useState(null);

  const [tournamentForm, setTournamentForm] = useState(
    EMPTY_TOURNAMENT_FORM
  );

  const [showTransactionForm, setShowTransactionForm] =
    useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState(null);

  const [transactionForm, setTransactionForm] = useState(
    EMPTY_TRANSACTION_FORM
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [transactionSearch, setTransactionSearch] =
    useState('');
  const [registrationSearch, setRegistrationSearch] =
    useState('');
  const [registrationStatusFilter, setRegistrationStatusFilter] =
    useState('all');

  const selectedFinancials = selectedTournament
    ? financials[selectedTournament.id] || {}
    : {};

  const selectedTransactions = useMemo(() => {
    if (!selectedTournament) {
      return [];
    }

    return transactions.filter(
      (transaction) =>
        transaction.tournamentId === selectedTournament.id
    );
  }, [transactions, selectedTournament]);

  const selectedRegistrations = useMemo(() => {
    if (!selectedTournament) {
      return [];
    }

    return registrations.filter(
      (registration) =>
        registration.tournamentId === selectedTournament.id
    );
  }, [registrations, selectedTournament]);

  const filteredTournaments = useMemo(() => {
    const term = normalizeText(search);

    return [...tournaments]
      .filter((tournament) => {
        if (
          statusFilter !== 'all' &&
          tournament.status !== statusFilter
        ) {
          return false;
        }

        if (!term) {
          return true;
        }

        return [
          tournament.name,
          tournament.edition,
          tournament.season,
          tournament.venue
        ].some((value) =>
          normalizeText(value).includes(term)
        );
      })
      .sort((a, b) => {
        const firstDate = a.startDate || '';
        const secondDate = b.startDate || '';

        return secondDate.localeCompare(firstDate);
      });
  }, [tournaments, search, statusFilter]);

  const filteredTransactions = useMemo(() => {
    const term = normalizeText(transactionSearch);

    return selectedTransactions.filter((transaction) => {
      if (!term) {
        return true;
      }

      return [
        transaction.concept,
        transaction.provider,
        transaction.responsible,
        transaction.notes
      ].some((value) =>
        normalizeText(value).includes(term)
      );
    });
  }, [selectedTransactions, transactionSearch]);

  const filteredRegistrations = useMemo(() => {
    const term = normalizeText(registrationSearch);

    return selectedRegistrations.filter((registration) => {
      if (
        registrationStatusFilter !== 'all' &&
        registration.paymentStatus !==
          registrationStatusFilter
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        registration.teamName,
        registration.pairName,
        registration.category,
        registration.player1?.name,
        registration.player2?.name,
        registration.player1?.email,
        registration.player2?.email,
        registration.player1?.phone,
        registration.player2?.phone
      ].some((value) =>
        normalizeText(value).includes(term)
      );
    });
  }, [
    selectedRegistrations,
    registrationSearch,
    registrationStatusFilter
  ]);

  const incomeTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === 'income'
  );

  const expenseTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === 'expense'
  );

  const ageStatistics = useMemo(() => {
    const values = {
      under18: 0,
      '18to28': 0,
      '29to40': 0,
      over41: 0
    };

    selectedRegistrations.forEach((registration) => {
      const people = [
        registration.player1,
        registration.player2
      ].filter(Boolean);

      people.forEach((player) => {
        const ageRange =
          player.ageRange ||
          player.ageGroup ||
          player.age;

        if (!ageRange) {
          return;
        }

        const normalized = normalizeText(ageRange);

        if (
          normalized.includes('menor') ||
          normalized === 'under18'
        ) {
          values.under18 += 1;
        } else if (
          normalized.includes('18') &&
          normalized.includes('28')
        ) {
          values['18to28'] += 1;
        } else if (
          normalized.includes('29') &&
          normalized.includes('40')
        ) {
          values['29to40'] += 1;
        } else if (
          normalized.includes('41') ||
          normalized === 'over41'
        ) {
          values.over41 += 1;
        }
      });
    });

    return values;
  }, [selectedRegistrations]);

  const audienceStatistics = useMemo(() => {
    const result = {
      male: 0,
      female: 0,
      mixed: 0
    };

    selectedRegistrations.forEach((registration) => {
      const category = normalizeText(
        registration.category
      );

      const playersInRegistration = [
        registration.player1,
        registration.player2
      ].filter(Boolean).length || 2;

      if (
        category.includes('femen') ||
        category.includes('damas')
      ) {
        result.female += playersInRegistration;
      } else if (
        category.includes('mascul') ||
        category.includes('caballer')
      ) {
        result.male += playersInRegistration;
      } else if (category.includes('mixt')) {
        result.mixed += playersInRegistration;
      }
    });

    return result;
  }, [selectedRegistrations]);

  const topPlayers = useMemo(() => {
    const playerParticipation = new Map();

    registrations.forEach((registration) => {
      [
        registration.player1,
        registration.player2
      ]
        .filter(Boolean)
        .forEach((player) => {
          const name = String(
            player.name ||
              player.fullName ||
              ''
          ).trim();

          if (!name) {
            return;
          }

          const key =
            normalizeText(player.email) ||
            normalizeText(player.phone) ||
            normalizeText(name);

          const current = playerParticipation.get(key) || {
            name,
            participations: 0,
            tournaments: new Set()
          };

          current.participations += 1;

          if (registration.tournamentId) {
            current.tournaments.add(
              registration.tournamentId
            );
          }

          playerParticipation.set(key, current);
        });
    });

    return [...playerParticipation.values()]
      .map((player) => ({
        name: player.name,
        participations: player.participations,
        tournaments: player.tournaments.size
      }))
      .sort(
        (a, b) =>
          b.participations - a.participations
      )
      .slice(0, 5);
  }, [registrations]);

  const openNewTournamentForm = () => {
    setEditingTournament(null);
    setTournamentForm(EMPTY_TOURNAMENT_FORM);
    setShowTournamentForm(true);
  };

  const openEditTournamentForm = (tournament) => {
    setEditingTournament(tournament);

    setTournamentForm({
      name: tournament.name || '',
      edition: tournament.edition || '',
      season: tournament.season || '',
      venue: tournament.venue || '',
      startDate: tournament.startDate || '',
      endDate: tournament.endDate || '',
      status: tournament.status || 'draft',
      registrationValue:
        tournament.registrationValue || '',
      projectedPairs:
        tournament.projectedPairs || '',
      projectedPlayers:
        tournament.projectedPlayers || '',
      notes: tournament.notes || ''
    });

    setShowTournamentForm(true);
  };

  const closeTournamentForm = () => {
    setShowTournamentForm(false);
    setEditingTournament(null);
    setTournamentForm(EMPTY_TOURNAMENT_FORM);
  };

  const submitTournament = async (event) => {
    event.preventDefault();

    if (!tournamentForm.name.trim()) {
      alert('Escribe el nombre del torneo.');
      return;
    }

    if (
      tournamentForm.startDate &&
      tournamentForm.endDate &&
      tournamentForm.endDate <
        tournamentForm.startDate
    ) {
      alert(
        'La fecha final no puede ser anterior a la fecha inicial.'
      );
      return;
    }

    const savedTournament = await onSaveTournament({
      ...editingTournament,
      ...tournamentForm,
      id: editingTournament?.id,
      registrationValue: Number(
        tournamentForm.registrationValue || 0
      ),
      projectedPairs: Number(
        tournamentForm.projectedPairs || 0
      ),
      projectedPlayers: Number(
        tournamentForm.projectedPlayers || 0
      )
    });

    if (savedTournament) {
      closeTournamentForm();
      onSelectTournament(savedTournament.id);
      setTournamentTab('summary');
    }
  };

  const openNewTransactionForm = (type) => {
    setEditingTransaction(null);

    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      type
    });

    setShowTransactionForm(true);
  };

  const openEditTransactionForm = (transaction) => {
    setEditingTransaction(transaction);

    setTransactionForm({
      type: transaction.type || 'expense',
      concept: transaction.concept || '',
      projectedAmount:
        transaction.projectedAmount || '',
      actualAmount: transaction.actualAmount || '',
      paidAmount: transaction.paidAmount || '',
      status: transaction.status || 'projected',
      date: transaction.date || '',
      dueDate: transaction.dueDate || '',
      provider: transaction.provider || '',
      responsible: transaction.responsible || '',
      notes: transaction.notes || ''
    });

    setShowTransactionForm(true);
  };

  const closeTransactionForm = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
    setTransactionForm(EMPTY_TRANSACTION_FORM);
  };

  const submitTransaction = async (event) => {
    event.preventDefault();

    if (!selectedTournament) {
      return;
    }

    if (!transactionForm.concept.trim()) {
      alert('Escribe el concepto.');
      return;
    }

    if (
      transactionForm.status === 'completed' &&
      Number(
        transactionForm.paidAmount ||
          transactionForm.actualAmount ||
          0
      ) <= 0
    ) {
      alert(
        'Para marcarlo como pagado debes indicar el valor real.'
      );
      return;
    }

    const savedTransaction = await onSaveTransaction({
      tournament: selectedTournament,
      transaction: {
        ...editingTransaction,
        ...transactionForm,
        id: editingTransaction?.id,
        projectedAmount: Number(
          transactionForm.projectedAmount || 0
        ),
        actualAmount: Number(
          transactionForm.actualAmount || 0
        ),
        paidAmount: Number(
          transactionForm.paidAmount ||
            transactionForm.actualAmount ||
            0
        )
      }
    });

    if (savedTransaction) {
      closeTransactionForm();
    }
  };

  const changeTransactionStatus = async (
    transaction,
    status
  ) => {
    if (!selectedTournament) {
      return;
    }

    if (
      status === 'completed' &&
      Number(
        transaction.paidAmount ||
          transaction.actualAmount ||
          0
      ) <= 0
    ) {
      alert(
        'Primero edita el registro e indica el valor real.'
      );
      return;
    }

    await onChangeTransactionStatus({
      transaction,
      tournament: selectedTournament,
      status
    });
  };

  const changeRegistrationStatus = async (
    registration,
    paymentStatus
  ) => {
    if (!selectedTournament) {
      return;
    }

    await onChangeRegistrationStatus({
      registration,
      tournament: selectedTournament,
      paymentStatus
    });
  };

  const openTournament = (tournament) => {
    onSelectTournament(tournament.id);
    setTournamentTab('summary');
  };

  const closeTournament = () => {
    onCloseTournament();
    setTournamentTab('summary');
  };

  if (selectedTournament) {
    return (
      <div className="page tournament-detail-page">
        <div className="tournament-detail-topbar">
          <button
            type="button"
            className="ghost-btn"
            onClick={closeTournament}
          >
            <ArrowLeft size={18} />
            Volver a Torneos
          </button>

          <div className="tournament-detail-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() =>
                openEditTournamentForm(
                  selectedTournament
                )
              }
            >
              <Edit3 size={17} />
              Editar torneo
            </button>

            <button
              type="button"
              className="tournament-delete-btn"
              onClick={() =>
                onDeleteTournament(
                  selectedTournament.id
                )
              }
            >
              <Trash2 size={17} />
              Eliminar
            </button>
          </div>
        </div>

        <section className="tournament-detail-hero">
          <div>
            <span
              className={`tournament-status-pill ${getTournamentStatusClass(
                selectedTournament.status
              )}`}
            >
              {TOURNAMENT_STATUS_LABELS[
                selectedTournament.status
              ] || 'Borrador'}
            </span>

            <p className="eyebrow">
              Gestión financiera del torneo
            </p>

            <h1>{selectedTournament.name}</h1>

            <p>
              {selectedTournament.venue ||
                'Sede sin definir'}{' '}
              ·{' '}
              {formatTournamentDate(
                selectedTournament.startDate
              )}
              {selectedTournament.endDate
                ? ` – ${formatTournamentDate(
                    selectedTournament.endDate
                  )}`
                : ''}
            </p>
          </div>

          <div className="tournament-hero-kpis">
            <div>
              <span>Utilidad proyectada</span>
              <strong>
                {formatCurrency(
                  selectedFinancials.projectedUtility ||
                    0
                )}
              </strong>
            </div>

            <div>
              <span>Utilidad real</span>
              <strong>
                {formatCurrency(
                  selectedFinancials.realUtility || 0
                )}
              </strong>
            </div>

            <div>
              <span>Margen real</span>
              <strong>
                {Number(
                  selectedFinancials.realMargin || 0
                ).toFixed(1)}
                %
              </strong>
            </div>
          </div>
        </section>

        <nav
          className="tournament-tabs"
          aria-label="Secciones del torneo"
        >
          {[
            ['summary', 'Resumen'],
            ['registrations', 'Inscripciones'],
            ['income', 'Ingresos'],
            ['expenses', 'Egresos'],
            ['profitability', 'Rentabilidad'],
            ['audience', 'Audiencia'],
            ['sync', 'Sincronización']
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={
                tournamentTab === id
                  ? 'active'
                  : ''
              }
              onClick={() => setTournamentTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tournamentTab === 'summary' && (
          <div className="tournament-section-stack">
            <section className="tournament-kpi-grid">
              <article className="tournament-kpi-card income">
                <span className="tournament-kpi-icon">
                  <Wallet size={21} />
                </span>

                <small>Ingresos reales</small>

                <strong>
                  {formatCurrency(
                    selectedFinancials.realIncome || 0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card expense">
                <span className="tournament-kpi-icon">
                  <CircleDollarSign size={21} />
                </span>

                <small>Egresos reales</small>

                <strong>
                  {formatCurrency(
                    selectedFinancials.realExpenses || 0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card utility">
                <span className="tournament-kpi-icon">
                  <BarChart3 size={21} />
                </span>

                <small>Utilidad real</small>

                <strong>
                  {formatCurrency(
                    selectedFinancials.realUtility || 0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card players">
                <span className="tournament-kpi-icon">
                  <Users size={21} />
                </span>

                <small>Jugadores</small>

                <strong>
                  {selectedFinancials.totalPlayers || 0}
                </strong>
              </article>
            </section>

            <section className="tournament-summary-grid">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      Control presupuestal
                    </p>
                    <h2>Proyectado vs real</h2>
                  </div>
                </div>

                <div className="tournament-comparison-list">
                  <div>
                    <span>Ingresos proyectados</span>
                    <strong>
                      {formatCurrency(
                        selectedFinancials.projectedIncome ||
                          0
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Ingresos reales</span>
                    <strong className="positive">
                      {formatCurrency(
                        selectedFinancials.realIncome || 0
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Egresos proyectados</span>
                    <strong>
                      {formatCurrency(
                        selectedFinancials.projectedExpenses ||
                          0
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Egresos reales</span>
                    <strong className="negative">
                      {formatCurrency(
                        selectedFinancials.realExpenses || 0
                      )}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      Inscripciones
                    </p>
                    <h2>Estado del recaudo</h2>
                  </div>
                </div>

                <div className="tournament-registration-summary">
                  <div>
                    <strong>
                      {selectedFinancials.totalPairs || 0}
                    </strong>
                    <span>Parejas</span>
                  </div>

                  <div>
                    <strong>
                      {selectedFinancials.paidRegistrations ||
                        0}
                    </strong>
                    <span>Pagadas</span>
                  </div>

                  <div>
                    <strong>
                      {selectedFinancials.pendingRegistrations ||
                        0}
                    </strong>
                    <span>Pendientes</span>
                  </div>

                  <div>
                    <strong>
                      {selectedFinancials.courtesyRegistrations ||
                        0}
                    </strong>
                    <span>Cortesías</span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        )}

        {tournamentTab === 'registrations' && (
          <section className="panel tournament-data-panel">
            <div className="tournament-toolbar">
              <div>
                <p className="eyebrow">
                  Recaudo de inscripciones
                </p>
                <h2>Parejas registradas</h2>
              </div>

              <div className="tournament-filter-group">
                <div className="search-box">
                  <Search size={18} />

                  <input
                    value={registrationSearch}
                    onChange={(event) =>
                      setRegistrationSearch(
                        event.target.value
                      )
                    }
                    placeholder="Buscar pareja o jugador"
                  />
                </div>

                <select
                  value={registrationStatusFilter}
                  onChange={(event) =>
                    setRegistrationStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    Todos los estados
                  </option>
                  <option value="review">
                    Por verificar
                  </option>
                  <option value="pending">
                    Pendiente
                  </option>
                  <option value="partial">
                    Parcial
                  </option>
                  <option value="paid">Pagado</option>
                  <option value="courtesy">
                    Cortesía
                  </option>
                  <option value="cancelled">
                    Anulado
                  </option>
                </select>
              </div>
            </div>

            <div className="tournament-table-wrapper">
              <table className="tournament-table">
                <thead>
                  <tr>
                    <th>Pareja</th>
                    <th>Categoría</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {!filteredRegistrations.length && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">
                          No hay inscripciones para mostrar.
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredRegistrations.map(
                    (registration) => (
                      <tr key={registration.id}>
                        <td>
                          <strong>
                            {registration.teamName ||
                              registration.pairName ||
                              [
                                registration.player1?.name,
                                registration.player2?.name
                              ]
                                .filter(Boolean)
                                .join(' / ') ||
                              'Pareja sin nombre'}
                          </strong>

                          <small>
                            {registration.sourceTimestamp ||
                              'Registro manual'}
                          </small>
                        </td>

                        <td>
                          {registration.category ||
                            'Sin categoría'}
                        </td>

                        <td>
                          {formatCurrency(
                            registration.registrationValue ||
                              selectedTournament.registrationValue ||
                              0
                          )}
                        </td>

                        <td>
                          <select
                            className={`tournament-status-select ${getRegistrationStatusClass(
                              registration.paymentStatus
                            )}`}
                            value={
                              registration.paymentStatus ||
                              'review'
                            }
                            onChange={(event) =>
                              changeRegistrationStatus(
                                registration,
                                event.target.value
                              )
                            }
                          >
                            {Object.entries(
                              REGISTRATION_STATUS_LABELS
                            ).map(([value, label]) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <div className="tournament-row-actions">
                            <button
                              type="button"
                              title="Eliminar inscripción"
                              onClick={() =>
                                onDeleteRegistration(
                                  registration.id
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(tournamentTab === 'income' ||
          tournamentTab === 'expenses') && (
          <section className="panel tournament-data-panel">
            <div className="tournament-toolbar">
              <div>
                <p className="eyebrow">
                  {tournamentTab === 'income'
                    ? 'Ingresos del torneo'
                    : 'Presupuesto y gastos'}
                </p>

                <h2>
                  {tournamentTab === 'income'
                    ? 'Ingresos'
                    : 'Egresos'}
                </h2>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  openNewTransactionForm(
                    tournamentTab === 'income'
                      ? 'income'
                      : 'expense'
                  )
                }
              >
                <Plus size={18} />
                {tournamentTab === 'income'
                  ? 'Agregar ingreso'
                  : 'Agregar egreso'}
              </button>
            </div>

            <div className="tournament-transaction-search">
              <div className="search-box">
                <Search size={18} />

                <input
                  value={transactionSearch}
                  onChange={(event) =>
                    setTransactionSearch(
                      event.target.value
                    )
                  }
                  placeholder="Buscar concepto, proveedor o responsable"
                />
              </div>
            </div>

            <div className="tournament-table-wrapper">
              <table className="tournament-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Proyectado</th>
                    <th>Real</th>
                    <th>Variación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {(tournamentTab === 'income'
                    ? incomeTransactions
                    : expenseTransactions
                  ).map((transaction) => {
                    const projectedAmount = Number(
                      transaction.projectedAmount || 0
                    );

                    const actualAmount = Number(
                      transaction.actualAmount || 0
                    );

                    const variation =
                      actualAmount - projectedAmount;

                    return (
                      <tr key={transaction.id}>
                        <td>
                          <strong>
                            {transaction.concept}
                          </strong>

                          <small>
                            {transaction.provider ||
                              transaction.responsible ||
                              'Sin responsable'}
                          </small>
                        </td>

                        <td>
                          {formatCurrency(
                            projectedAmount
                          )}
                        </td>

                        <td>
                          {formatCurrency(actualAmount)}
                        </td>

                        <td
                          className={
                            variation > 0
                              ? transaction.type ===
                                'expense'
                                ? 'negative'
                                : 'positive'
                              : variation < 0
                                ? transaction.type ===
                                  'expense'
                                  ? 'positive'
                                  : 'negative'
                                : ''
                          }
                        >
                          {variation > 0 ? '+' : ''}
                          {formatCurrency(variation)}
                        </td>

                        <td>
                          <select
                            className={`tournament-status-select ${getTransactionStatusClass(
                              transaction.status
                            )}`}
                            value={
                              transaction.status ||
                              'projected'
                            }
                            onChange={(event) =>
                              changeTransactionStatus(
                                transaction,
                                event.target.value
                              )
                            }
                          >
                            {Object.entries(
                              TRANSACTION_STATUS_LABELS
                            ).map(([value, label]) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {transaction.type ===
                                  'income' &&
                                value === 'completed'
                                  ? 'Cobrado'
                                  : label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <div className="tournament-row-actions">
                            <button
                              type="button"
                              title="Editar"
                              onClick={() =>
                                openEditTransactionForm(
                                  transaction
                                )
                              }
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              title="Eliminar"
                              onClick={() =>
                                onDeleteTransaction(
                                  transaction.id
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tournamentTab === 'profitability' && (
          <div className="tournament-section-stack">
            <section className="tournament-kpi-grid">
              <article className="tournament-kpi-card utility">
                <small>Utilidad proyectada</small>
                <strong>
                  {formatCurrency(
                    selectedFinancials.projectedUtility ||
                      0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card utility">
                <small>Utilidad real</small>
                <strong>
                  {formatCurrency(
                    selectedFinancials.realUtility || 0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card players">
                <small>Costo por jugador</small>
                <strong>
                  {formatCurrency(
                    selectedFinancials.totalPlayers > 0
                      ? Number(
                          selectedFinancials.realExpenses ||
                            0
                        ) /
                          selectedFinancials.totalPlayers
                      : 0
                  )}
                </strong>
              </article>

              <article className="tournament-kpi-card income">
                <small>Ingreso por jugador</small>
                <strong>
                  {formatCurrency(
                    selectedFinancials.totalPlayers > 0
                      ? Number(
                          selectedFinancials.realIncome ||
                            0
                        ) /
                          selectedFinancials.totalPlayers
                      : 0
                  )}
                </strong>
              </article>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    Análisis financiero
                  </p>
                  <h2>Resultado del torneo</h2>
                </div>
              </div>

              <div className="tournament-profitability-summary">
                <div>
                  <span>Margen real</span>
                  <strong>
                    {Number(
                      selectedFinancials.realMargin || 0
                    ).toFixed(1)}
                    %
                  </strong>
                </div>

                <div>
                  <span>Diferencia de utilidad</span>
                  <strong>
                    {formatCurrency(
                      Number(
                        selectedFinancials.realUtility ||
                          0
                      ) -
                        Number(
                          selectedFinancials.projectedUtility ||
                            0
                        )
                    )}
                  </strong>
                </div>

                <div>
                  <span>Recaudo por inscripciones</span>
                  <strong>
                    {formatCurrency(
                      selectedFinancials.registrationIncome ||
                        0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Otros ingresos</span>
                  <strong>
                    {formatCurrency(
                      selectedFinancials.additionalIncome ||
                        0
                    )}
                  </strong>
                </div>
              </div>
            </section>
          </div>
        )}

        {tournamentTab === 'audience' && (
          <div className="tournament-section-stack">
            <section className="tournament-kpi-grid">
              <article className="tournament-kpi-card players">
                <small>Jugadores registrados</small>
                <strong>
                  {selectedFinancials.totalPlayers || 0}
                </strong>
              </article>

              <article className="tournament-kpi-card current">
                <small>Participación masculina</small>
                <strong>
                  {audienceStatistics.male}
                </strong>
              </article>

              <article className="tournament-kpi-card income">
                <small>Participación femenina</small>
                <strong>
                  {audienceStatistics.female}
                </strong>
              </article>

              <article className="tournament-kpi-card utility">
                <small>Categorías mixtas</small>
                <strong>
                  {audienceStatistics.mixed}
                </strong>
              </article>
            </section>

            <section className="tournament-summary-grid">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      Perfil de audiencia
                    </p>
                    <h2>Distribución por edades</h2>
                  </div>
                </div>

                <div className="tournament-age-list">
                  {[
                    [
                      'Menor de 18 años',
                      ageStatistics.under18
                    ],
                    [
                      'Entre 18 y 28 años',
                      ageStatistics['18to28']
                    ],
                    [
                      'Entre 29 y 40 años',
                      ageStatistics['29to40']
                    ],
                    [
                      'Mayor de 41 años',
                      ageStatistics.over41
                    ]
                  ].map(([label, value]) => {
                    const total =
                      ageStatistics.under18 +
                      ageStatistics['18to28'] +
                      ageStatistics['29to40'] +
                      ageStatistics.over41;

                    const percentage =
                      total > 0
                        ? (value / total) * 100
                        : 0;

                    return (
                      <div key={label}>
                        <div>
                          <span>{label}</span>
                          <strong>
                            {value} ·{' '}
                            {percentage.toFixed(1)}%
                          </strong>
                        </div>

                        <div className="tournament-progress-track">
                          <span
                            style={{
                              width: `${percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      Información comercial
                    </p>
                    <h2>Datos para patrocinadores</h2>
                  </div>
                </div>

                <div className="tournament-commercial-list">
                  <div>
                    <Users size={19} />
                    <span>
                      {selectedFinancials.totalPlayers || 0}{' '}
                      jugadores registrados.
                    </span>
                  </div>

                  <div>
                    <Trophy size={19} />
                    <span>
                      {selectedFinancials.totalPairs || 0}{' '}
                      parejas participantes.
                    </span>
                  </div>

                  <div>
                    <CheckCircle2 size={19} />
                    <span>
                      {selectedFinancials.paidRegistrations ||
                        0}{' '}
                      inscripciones confirmadas.
                    </span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        )}

        {tournamentTab === 'sync' && (
          <section className="panel tournament-sync-panel">
            <div className="tournament-sync-box">
              <Upload size={38} />

              <h2>Sincronizar inscripciones</h2>

              <p>
                La importación actualizará parejas, jugadores,
                categorías y estadísticas. Nunca modificará el
                estado financiero ni los pagos registrados
                manualmente.
              </p>

              <button
                type="button"
                className="primary-btn"
                disabled
              >
                <Upload size={18} />
                Importar Excel
              </button>

              <small>
                El importador se conectará en la siguiente fase.
              </small>
            </div>

            {!!imports.filter(
              (item) =>
                item.tournamentId ===
                selectedTournament.id
            ).length && (
              <div className="tournament-import-history">
                <h3>Historial de sincronización</h3>

                {imports
                  .filter(
                    (item) =>
                      item.tournamentId ===
                      selectedTournament.id
                  )
                  .map((item) => (
                    <article key={item.id}>
                      <strong>
                        {item.fileName ||
                          'Archivo importado'}
                      </strong>

                      <span>
                        {item.created || 0} nuevas ·{' '}
                        {item.updated || 0} actualizadas ·{' '}
                        {item.unchanged || 0} sin cambios
                      </span>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}

        {showTournamentForm && (
          <TournamentModal
            title={
              editingTournament
                ? 'Editar torneo'
                : 'Nuevo torneo'
            }
            onClose={closeTournamentForm}
          >
            <TournamentForm
              form={tournamentForm}
              setForm={setTournamentForm}
              onSubmit={submitTournament}
              editing={Boolean(editingTournament)}
              onCancel={closeTournamentForm}
            />
          </TournamentModal>
        )}

        {showTransactionForm && (
          <TournamentModal
            title={
              editingTransaction
                ? 'Editar registro financiero'
                : transactionForm.type === 'income'
                  ? 'Nuevo ingreso'
                  : 'Nuevo egreso'
            }
            onClose={closeTransactionForm}
          >
            <TransactionForm
              form={transactionForm}
              setForm={setTransactionForm}
              onSubmit={submitTransaction}
              editing={Boolean(editingTransaction)}
              onCancel={closeTransactionForm}
            />
          </TournamentModal>
        )}
      </div>
    );
  }

  return (
    <div className="page tournaments-page">
      <div className="page-title row-title">
        <div>
          <p className="eyebrow">
            Gestión financiera por evento
          </p>

          <h1>Torneos</h1>

          <p>
            Presupuesto, recaudo, rentabilidad y estadísticas
            comerciales.
          </p>
        </div>

        <div className="tournaments-heading-actions">
          <button
            type="button"
            className={
              mainView === 'statistics'
                ? 'ghost-btn active'
                : 'ghost-btn'
            }
            onClick={() =>
              setMainView(
                mainView === 'statistics'
                  ? 'tournaments'
                  : 'statistics'
              )
            }
          >
            <BarChart3 size={18} />
            {mainView === 'statistics'
              ? 'Ver torneos'
              : 'Estadísticas generales'}
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={openNewTournamentForm}
          >
            <Plus size={18} />
            Nuevo torneo
          </button>
        </div>
      </div>

      {mainView === 'statistics' ? (
        <section className="tournament-section-stack">
          <section className="tournament-kpi-grid historical">
            <article className="tournament-kpi-card current">
              <small>Torneos registrados</small>
              <strong>{tournaments.length}</strong>
            </article>

            <article className="tournament-kpi-card players">
              <small>Participaciones</small>
              <strong>
                {summary.totalPlayers || 0}
              </strong>
            </article>

            <article className="tournament-kpi-card income">
              <small>Ingresos históricos</small>
              <strong>
                {formatCurrency(
                  summary.realIncome || 0
                )}
              </strong>
            </article>

            <article className="tournament-kpi-card utility">
              <small>Utilidad histórica</small>
              <strong>
                {formatCurrency(
                  summary.realUtility || 0
                )}
              </strong>
            </article>
          </section>

          <section className="tournament-summary-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    Participación histórica
                  </p>

                  <h2>Top 5 jugadores</h2>
                </div>
              </div>

              <div className="tournament-ranking-list">
                {!topPlayers.length && (
                  <div className="empty-state">
                    Todavía no hay suficiente información.
                  </div>
                )}

                {topPlayers.map((player, index) => (
                  <article key={player.name}>
                    <span>{index + 1}</span>

                    <div>
                      <strong>{player.name}</strong>
                      <small>
                        {player.tournaments}{' '}
                        {player.tournaments === 1
                          ? 'torneo'
                          : 'torneos'}
                      </small>
                    </div>

                    <strong>
                      {player.participations}
                    </strong>
                  </article>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    Rentabilidad histórica
                  </p>

                  <h2>Resumen financiero</h2>
                </div>
              </div>

              <div className="tournament-comparison-list">
                <div>
                  <span>Ingresos proyectados</span>
                  <strong>
                    {formatCurrency(
                      summary.projectedIncome || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Ingresos reales</span>
                  <strong className="positive">
                    {formatCurrency(
                      summary.realIncome || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Egresos reales</span>
                  <strong className="negative">
                    {formatCurrency(
                      summary.realExpenses || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Utilidad acumulada</span>
                  <strong>
                    {formatCurrency(
                      summary.realUtility || 0
                    )}
                  </strong>
                </div>
              </div>
            </article>
          </section>
        </section>
      ) : (
        <>
          <section className="tournament-kpi-grid historical">
            <article className="tournament-kpi-card current">
              <span className="tournament-kpi-icon">
                <Trophy size={21} />
              </span>

              <small>Torneos</small>
              <strong>{tournaments.length}</strong>
            </article>

            <article className="tournament-kpi-card players">
              <span className="tournament-kpi-icon">
                <Users size={21} />
              </span>

              <small>Participaciones</small>
              <strong>
                {summary.totalPlayers || 0}
              </strong>
            </article>

            <article className="tournament-kpi-card income">
              <span className="tournament-kpi-icon">
                <Wallet size={21} />
              </span>

              <small>Ingresos reales</small>
              <strong>
                {formatCurrency(
                  summary.realIncome || 0
                )}
              </strong>
            </article>

            <article className="tournament-kpi-card utility">
              <span className="tournament-kpi-icon">
                <BarChart3 size={21} />
              </span>

              <small>Utilidad acumulada</small>
              <strong>
                {formatCurrency(
                  summary.realUtility || 0
                )}
              </strong>
            </article>
          </section>

          <section className="panel tournaments-list-panel">
            <div className="tournament-toolbar">
              <div>
                <p className="eyebrow">
                  Eventos financieros
                </p>
                <h2>Todos los torneos</h2>
              </div>

              <div className="tournament-filter-group">
                <div className="search-box">
                  <Search size={18} />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Buscar torneo"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    Todos los estados
                  </option>
                  <option value="draft">
                    Borradores
                  </option>
                  <option value="active">
                    Activos
                  </option>
                  <option value="completed">
                    Finalizados
                  </option>
                  <option value="cancelled">
                    Anulados
                  </option>
                </select>
              </div>
            </div>

            {!filteredTournaments.length ? (
              <div className="tournament-empty-state">
                <Trophy size={46} />

                <h3>
                  Todavía no hay torneos registrados
                </h3>

                <p>
                  Crea el primer torneo para comenzar a
                  controlar presupuesto, ingresos, egresos y
                  rentabilidad.
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={openNewTournamentForm}
                >
                  <Plus size={18} />
                  Crear primer torneo
                </button>
              </div>
            ) : (
              <div className="tournament-card-grid">
                {filteredTournaments.map(
                  (tournament) => {
                    const tournamentFinancials =
                      financials[tournament.id] || {};

                    return (
                      <article
                        className="tournament-card"
                        key={tournament.id}
                      >
                        <div className="tournament-card-header">
                          <span
                            className={`tournament-status-pill ${getTournamentStatusClass(
                              tournament.status
                            )}`}
                          >
                            {TOURNAMENT_STATUS_LABELS[
                              tournament.status
                            ] || 'Borrador'}
                          </span>

                          <div className="tournament-card-actions">
                            <button
                              type="button"
                              onClick={() =>
                                openEditTournamentForm(
                                  tournament
                                )
                              }
                              title="Editar torneo"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onDeleteTournament(
                                  tournament.id
                                )
                              }
                              title="Eliminar torneo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="tournament-card-title">
                          <span className="tournament-card-icon">
                            <Trophy size={23} />
                          </span>

                          <div>
                            <h3>{tournament.name}</h3>

                            <p>
                              {tournament.venue ||
                                'Sede sin definir'}
                            </p>
                          </div>
                        </div>

                        <div className="tournament-card-dates">
                          <CalendarDays size={17} />

                          <span>
                            {formatTournamentDate(
                              tournament.startDate
                            )}

                            {tournament.endDate
                              ? ` – ${formatTournamentDate(
                                  tournament.endDate
                                )}`
                              : ''}
                          </span>
                        </div>

                        <div className="tournament-card-financials">
                          <div>
                            <span>Ingresos reales</span>
                            <strong className="positive">
                              {formatCurrency(
                                tournamentFinancials.realIncome ||
                                  0
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Utilidad real</span>
                            <strong>
                              {formatCurrency(
                                tournamentFinancials.realUtility ||
                                  0
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Parejas</span>
                            <strong>
                              {tournamentFinancials.totalPairs ||
                                0}
                            </strong>
                          </div>

                          <div>
                            <span>Jugadores</span>
                            <strong>
                              {tournamentFinancials.totalPlayers ||
                                0}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="tournament-open-btn"
                          onClick={() =>
                            openTournament(tournament)
                          }
                        >
                          Abrir torneo
                          <ChevronRight size={18} />
                        </button>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </>
      )}

      {showTournamentForm && (
        <TournamentModal
          title={
            editingTournament
              ? 'Editar torneo'
              : 'Nuevo torneo'
          }
          onClose={closeTournamentForm}
        >
          <TournamentForm
            form={tournamentForm}
            setForm={setTournamentForm}
            onSubmit={submitTournament}
            editing={Boolean(editingTournament)}
            onCancel={closeTournamentForm}
          />
        </TournamentModal>
      )}
    </div>
  );
}


