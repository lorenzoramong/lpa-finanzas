import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Edit3,
  MapPin,
  Plus,
  Power,
  UserRound,
  Users
} from 'lucide-react';

import AcademyCoachForm from '../components/academy/AcademyCoachForm';
import AcademyPlayerForm from '../components/academy/AcademyPlayerForm';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function Academy({
  locations = [],
  coaches = [],
  players = [],
  cycles = [],
  settings,
  onSaveCoach,
  onSavePlayer,
  onTogglePlayer
}) {
  const [coachLocation, setCoachLocation] =
    useState(null);

  const [playerLocation, setPlayerLocation] =
    useState(null);

  const [editingPlayer, setEditingPlayer] =
    useState(null);

  const activePlayers = players.filter(
    (player) => player.active !== false
  );

  const projectedIncome = activePlayers.reduce(
    (total, player) =>
      total + Number(player.monthlyFee || 0),
    0
  );

  const cycleStartDay =
    settings?.cycleStartDay ?? 19;

  const cycleEndDay =
    settings?.cycleEndDay ?? 19;

  const coachByLocation = useMemo(() => {
    return locations.reduce((result, location) => {
      result[location.id] =
        coaches.find(
          (coach) =>
            coach.locationId === location.id
        ) || null;

      return result;
    }, {});
  }, [locations, coaches]);

  const selectedCoach = coachLocation
    ? coachByLocation[coachLocation.id]
    : null;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">
            Gestión financiera
          </p>

          <h1>Academia</h1>

          <p className="muted">
            Control financiero de sedes, jugadores,
            entrenadores y ciclos de la academia.
          </p>
        </div>
      </section>

      <section className="tournament-kpi-grid">
        <article className="tournament-kpi-card current">
          <small>Jugadores activos</small>
          <strong>{activePlayers.length}</strong>
        </article>

        <article className="tournament-kpi-card income">
          <small>Ingreso proyectado</small>
          <strong>
            {formatCurrency(projectedIncome)}
          </strong>
        </article>

        <article className="tournament-kpi-card utility">
          <small>Sedes</small>
          <strong>{locations.length}</strong>
        </article>

        <article className="tournament-kpi-card expense">
          <small>Ciclo actual</small>
          <strong>
            {cycleStartDay} → {cycleEndDay}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Operación
            </p>

            <h2>Sedes de la academia</h2>
          </div>
        </div>

        <div className="tournament-grid">
          {locations.map((location) => {
            const locationPlayers = players.filter(
              (player) =>
                player.locationId === location.id
            );

            const locationActivePlayers =
              locationPlayers.filter(
                (player) => player.active !== false
              );

            const locationCoach =
              coachByLocation[location.id];

            const locationProjectedIncome =
              locationActivePlayers.reduce(
                (total, player) =>
                  total +
                  Number(player.monthlyFee || 0),
                0
              );

            return (
              <article
                key={location.id}
                className="tournament-card"
              >
                <div className="tournament-card-top">
                  <div>
                    <span className="tournament-status-badge">
                      <MapPin size={14} />
                      Sede
                    </span>

                    <h3>{location.name}</h3>
                  </div>

                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      setCoachLocation(location)
                    }
                  >
                    <Edit3 size={16} />
                    {locationCoach
                      ? 'Editar entrenador'
                      : 'Configurar entrenador'}
                  </button>
                </div>

                <div className="tournament-card-metrics">
                  <div>
                    <span>
                      <UserRound size={16} />
                      Entrenador
                    </span>

                    <strong>
                      {locationCoach?.name ||
                        'Sin configurar'}
                    </strong>

                    {locationCoach && (
                      <small>
                        {locationCoach.active !== false
                          ? 'Activo'
                          : 'Inactivo'}
                      </small>
                    )}
                  </div>

                  <div>
                    <span>
                      Pago por ciclo
                    </span>

                    <strong>
                      {locationCoach
                        ? formatCurrency(
                            locationCoach.paymentPerCycle
                          )
                        : 'Sin configurar'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <Users size={16} />
                      Jugadores activos
                    </span>

                    <strong>
                      {locationActivePlayers.length}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Ingreso proyectado
                    </span>

                    <strong>
                      {formatCurrency(
                        locationProjectedIncome
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Jugadores
            </p>

            <h2>Jugadores de la academia</h2>
          </div>
        </div>

        <div className="tournament-section-stack">
          {locations.map((location) => {
            const locationPlayers = players
              .filter(
                (player) =>
                  player.locationId === location.id
              )
              .sort((a, b) =>
                String(a.name || '').localeCompare(
                  String(b.name || ''),
                  'es'
                )
              );

            const activeCount =
              locationPlayers.filter(
                (player) => player.active !== false
              ).length;

            const projectedLocationIncome =
              locationPlayers
                .filter(
                  (player) =>
                    player.active !== false
                )
                .reduce(
                  (total, player) =>
                    total +
                    Number(player.monthlyFee || 0),
                  0
                );

            return (
              <article
                key={location.id}
                className="panel"
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      {location.name}
                    </p>

                    <h3>
                      {activeCount} activos ·{' '}
                      {formatCurrency(
                        projectedLocationIncome
                      )}{' '}
                      proyectados
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      setEditingPlayer(null);
                      setPlayerLocation(location);
                    }}
                  >
                    <Plus size={17} />
                    Agregar jugador
                  </button>
                </div>

                {!locationPlayers.length ? (
                  <div className="empty-state">
                    Todavía no hay jugadores registrados en
                    esta sede.
                  </div>
                ) : (
                  <div className="tournament-table-wrapper">
                    <table className="tournament-table">
                      <thead>
                        <tr>
                          <th>Jugador</th>
                          <th>Mensualidad</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {locationPlayers.map((player) => (
                          <tr key={player.id}>
                            <td>
                              <strong>
                                {player.name}
                              </strong>

                              <small>
                                {player.phone ||
                                  player.email ||
                                  'Sin contacto'}
                              </small>
                            </td>

                            <td>
                              <strong>
                                {formatCurrency(
                                  player.monthlyFee
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`tournament-status-pill ${
                                  player.active !== false
                                    ? 'active'
                                    : 'cancelled'
                                }`}
                              >
                                {player.active !== false
                                  ? 'Activo'
                                  : 'Inactivo'}
                              </span>
                            </td>

                            <td>
                              <div className="tournament-row-actions">
                                <button
                                  type="button"
                                  title="Editar jugador"
                                  onClick={() => {
                                    setEditingPlayer(player);
                                    setPlayerLocation(
                                      location
                                    );
                                  }}
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  type="button"
                                  title={
                                    player.active !== false
                                      ? 'Inactivar jugador'
                                      : 'Activar jugador'
                                  }
                                  onClick={() =>
                                    onTogglePlayer(
                                      player,
                                      player.active === false
                                    )
                                  }
                                >
                                  <Power size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              Ciclos
            </p>

            <h2>Control mensual</h2>
          </div>

          <CalendarDays size={24} />
        </div>

        <p className="muted">
          El ciclo inicial está configurado del día{' '}
          {cycleStartDay} al día {cycleEndDay}. La estructura
          queda preparada para administrar y editar los ciclos
          en los siguientes pasos.
        </p>

        {!!cycles.length && (
          <div className="tournament-comparison-list">
            {cycles.slice(0, 3).map((cycle) => (
              <div key={cycle.id}>
                <span>
                  {cycle.name || 'Ciclo academia'}
                </span>

                <strong>
                  {cycle.status || 'Pendiente'}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      {playerLocation && (
        <AcademyPlayerForm
          location={playerLocation}
          player={editingPlayer}
          onSave={onSavePlayer}
          onClose={() => {
            setPlayerLocation(null);
            setEditingPlayer(null);
          }}
        />
      )}

      {coachLocation && (
        <AcademyCoachForm
          location={coachLocation}
          coach={selectedCoach}
          onSave={onSaveCoach}
          onClose={() =>
            setCoachLocation(null)
          }
        />
      )}
    </div>
  );
}
