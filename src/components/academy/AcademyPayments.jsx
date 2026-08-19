import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  UserRound,
  Wallet,
  X
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function statusLabel(payment) {
  if (payment.status === 'paid') {
    return 'Pagado';
  }

  if (payment.status === 'cancelled') {
    return 'Anulado';
  }

  if (payment.status === 'projected') {
    return 'Proyectado';
  }

  return 'Pendiente';
}

function statusClass(payment) {
  if (payment.status === 'paid') {
    return 'completed';
  }

  if (payment.status === 'cancelled') {
    return 'cancelled';
  }

  if (payment.status === 'projected') {
    return 'projected';
  }

  return 'pending';
}

export default function AcademyPayments({
  cycle,
  payments = [],
  onChangeStatus,
  onUpdatePayment
}) {
  const [editingPayment, setEditingPayment] =
    useState(null);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const cyclePayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.cycleId === cycle?.id
      ),
    [payments, cycle]
  );

  const playerPayments = cyclePayments.filter(
    (payment) => payment.kind === 'player'
  );

  const coachPayments = cyclePayments.filter(
    (payment) => payment.kind === 'coach'
  );

  const collectedIncome =
    playerPayments
      .filter(
        (payment) => payment.status === 'paid'
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

  const pendingIncome =
    playerPayments
      .filter(
        (payment) =>
          payment.status !== 'paid' &&
          payment.status !== 'cancelled'
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

  const paidCoachExpense =
    coachPayments
      .filter(
        (payment) => payment.status === 'paid'
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );

  const openEditor = (payment) => {
    setEditingPayment(payment);
    setAmount(String(payment.amount || 0));
    setNotes(payment.notes || '');
  };

  const closeEditor = () => {
    setEditingPayment(null);
    setAmount('');
    setNotes('');
  };

  const saveEdit = async (event) => {
    event.preventDefault();

    if (!editingPayment) {
      return;
    }

    setSaving(true);

    try {
      const saved = await onUpdatePayment({
        payment: editingPayment,
        amount: Number(amount || 0),
        notes
      });

      if (saved) {
        closeEditor();
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (
    payment,
    status
  ) => {
    await onChangeStatus({
      payment,
      status
    });
  };

  if (!cycle) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            Cartera del ciclo
          </p>

          <h2>Pagos de Academia</h2>
        </div>
      </div>

      <section className="tournament-kpi-grid">
        <article className="tournament-kpi-card income">
          <small>Recaudado</small>
          <strong>
            {formatCurrency(collectedIncome)}
          </strong>
        </article>

        <article className="tournament-kpi-card current">
          <small>Por cobrar</small>
          <strong>
            {formatCurrency(pendingIncome)}
          </strong>
        </article>

        <article className="tournament-kpi-card expense">
          <small>Entrenadores pagados</small>
          <strong>
            {formatCurrency(paidCoachExpense)}
          </strong>
        </article>

        <article className="tournament-kpi-card players">
          <small>Alumnos pagados</small>
          <strong>
            {
              playerPayments.filter(
                (payment) =>
                  payment.status === 'paid'
              ).length
            }
            {' / '}
            {playerPayments.length}
          </strong>
        </article>
      </section>

      <div className="tournament-section-stack">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Ingresos
              </p>

              <h3>Mensualidades</h3>
            </div>
          </div>

          <div className="tournament-table-wrapper">
            <table className="tournament-table">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Sede</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!playerPayments.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        No hay mensualidades para este ciclo.
                      </div>
                    </td>
                  </tr>
                )}

                {playerPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>
                        {payment.personName}
                      </strong>

                      <small>
                        {payment.status === 'paid'
                          ? 'Ingreso enviado al flujo de caja'
                          : 'Ingreso proyectado'}
                      </small>
                    </td>

                    <td>
                      {payment.locationName ||
                        'Sin sede'}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          payment.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <select
                        className={`tournament-status-select ${statusClass(
                          payment
                        )}`}
                        value={payment.status}
                        onChange={(event) =>
                          changeStatus(
                            payment,
                            event.target.value
                          )
                        }
                      >
                        <option value="pending">
                          Pendiente
                        </option>

                        <option value="paid">
                          Pagado
                        </option>

                        <option value="cancelled">
                          Anulado
                        </option>
                      </select>
                    </td>

                    <td>
                      <div className="tournament-row-actions">
                        <button
                          type="button"
                          title="Editar valor"
                          onClick={() =>
                            openEditor(payment)
                          }
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                Egresos
              </p>

              <h3>Entrenadores</h3>
            </div>
          </div>

          <div className="tournament-table-wrapper">
            <table className="tournament-table">
              <thead>
                <tr>
                  <th>Entrenador</th>
                  <th>Sede</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!coachPayments.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">
                        No hay obligaciones de entrenador para
                        este ciclo.
                      </div>
                    </td>
                  </tr>
                )}

                {coachPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>
                        {payment.personName}
                      </strong>

                      <small>
                        {payment.status === 'projected'
                          ? 'Se vuelve pendiente al cerrar el ciclo'
                          : payment.status === 'paid'
                            ? 'Egreso enviado al flujo de caja'
                            : 'Obligación del ciclo'}
                      </small>
                    </td>

                    <td>
                      {payment.locationName ||
                        'Sin sede'}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          payment.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <select
                        className={`tournament-status-select ${statusClass(
                          payment
                        )}`}
                        value={payment.status}
                        onChange={(event) =>
                          changeStatus(
                            payment,
                            event.target.value
                          )
                        }
                      >
                        <option value="projected">
                          Proyectado
                        </option>

                        <option value="pending">
                          Pendiente
                        </option>

                        <option value="paid">
                          Pagado
                        </option>

                        <option value="cancelled">
                          Anulado
                        </option>
                      </select>
                    </td>

                    <td>
                      <div className="tournament-row-actions">
                        <button
                          type="button"
                          title="Editar valor"
                          onClick={() =>
                            openEditor(payment)
                          }
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {editingPayment && (
        <div
          className="tournament-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <section
            className="tournament-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Editar valor del pago"
          >
            <div className="tournament-modal-header">
              <div>
                <p className="eyebrow">
                  {editingPayment.kind === 'player'
                    ? 'Mensualidad'
                    : 'Pago entrenador'}
                </p>

                <h2>
                  {editingPayment.personName}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveEdit}>
              <div className="form-grid">
                <label className="full">
                  Valor del ciclo
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="full">
                  Observaciones
                  <textarea
                    rows="3"
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    placeholder="Motivo del ajuste, descuento u observación"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  <Wallet size={18} />
                  {saving
                    ? 'Guardando...'
                    : 'Guardar valor'}
                </button>

                <button
                  type="button"
                  className="ghost-btn"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
