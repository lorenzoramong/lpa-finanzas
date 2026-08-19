import { useMemo, useState } from 'react';
import {
  Edit3,
  Plus,
  Wallet,
  X
} from 'lucide-react';

import AcademyPaymentInstallmentForm from './AcademyPaymentInstallmentForm';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function paymentTotals(payment) {
  const amount = Number(
    payment.amount || 0
  );

  const paidAmount =
    payment.paidAmount ??
    (payment.installments || []).reduce(
      (total, installment) =>
        total +
        Number(installment.amount || 0),
      0
    );

  return {
    amount,
    paidAmount,
    pendingAmount:
      payment.pendingAmount ??
      Math.max(
        0,
        amount - paidAmount
      )
  };
}

function statusLabel(status) {
  if (status === 'paid') {
    return 'Pagado';
  }

  if (status === 'partial') {
    return 'Parcial';
  }

  if (status === 'cancelled') {
    return 'Anulado';
  }

  if (status === 'projected') {
    return 'Proyectado';
  }

  return 'Pendiente';
}

function statusClass(status) {
  if (status === 'paid') {
    return 'completed';
  }

  if (status === 'partial') {
    return 'partial';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  if (status === 'projected') {
    return 'projected';
  }

  return 'pending';
}

export default function AcademyPayments({
  cycle,
  payments = [],
  onChangeStatus,
  onUpdatePayment,
  onAddInstallment
}) {
  const [editingPayment, setEditingPayment] =
    useState(null);

  const [installmentPayment, setInstallmentPayment] =
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
    playerPayments.reduce(
      (total, payment) =>
        total +
        Number(
          paymentTotals(payment).paidAmount
        ),
      0
    );

  const pendingIncome =
    playerPayments
      .filter(
        (payment) =>
          payment.status !== 'cancelled'
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            paymentTotals(payment).pendingAmount
          ),
        0
      );

  const paidCoachExpense =
    coachPayments.reduce(
      (total, payment) =>
        total +
        Number(
          paymentTotals(payment).paidAmount
        ),
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

  const renderPaymentRows = (
    list,
    kind
  ) => {
    if (!list.length) {
      return (
        <tr>
          <td colSpan="6">
            <div className="empty-state">
              {kind === 'player'
                ? 'No hay mensualidades para este ciclo.'
                : 'No hay obligaciones de entrenador para este ciclo.'}
            </div>
          </td>
        </tr>
      );
    }

    return list.map((payment) => {
      const totals =
        paymentTotals(payment);

      const canRegisterInstallment =
        payment.status !== 'cancelled' &&
        payment.status !== 'paid' &&
        totals.pendingAmount > 0 &&
        !(
          payment.kind === 'coach' &&
          payment.status === 'projected'
        );

      return (
        <tr key={payment.id}>
          <td>
            <strong>
              {payment.personName}
            </strong>

            <small>
              {totals.paidAmount > 0
                ? `${formatCurrency(
                    totals.paidAmount
                  )} abonados`
                : payment.status === 'projected'
                  ? 'Obligación proyectada'
                  : 'Sin abonos'}
            </small>
          </td>

          <td>
            {payment.locationName ||
              'Sin sede'}
          </td>

          <td>
            <strong>
              {formatCurrency(
                totals.amount
              )}
            </strong>
          </td>

          <td>
            <strong
              className={
                totals.pendingAmount > 0
                  ? ''
                  : 'positive'
              }
            >
              {formatCurrency(
                totals.pendingAmount
              )}
            </strong>
          </td>

          <td>
            <span
              className={`tournament-status-pill ${statusClass(
                payment.status
              )}`}
            >
              {statusLabel(
                payment.status
              )}
            </span>
          </td>

          <td>
            <div className="tournament-row-actions">
              {canRegisterInstallment && (
                <button
                  type="button"
                  title="Registrar pago o abono"
                  onClick={() =>
                    setInstallmentPayment(
                      payment
                    )
                  }
                >
                  <Plus size={16} />
                </button>
              )}

              <button
                type="button"
                title="Editar valor total"
                onClick={() =>
                  openEditor(payment)
                }
              >
                <Edit3 size={16} />
              </button>

              {payment.status !==
                'cancelled' && (
                <button
                  type="button"
                  title="Anular"
                  onClick={() =>
                    onChangeStatus({
                      payment,
                      status: 'cancelled'
                    })
                  }
                >
                  <X size={16} />
                </button>
              )}

              {payment.status ===
                'cancelled' && (
                <button
                  type="button"
                  title="Reactivar"
                  onClick={() =>
                    onChangeStatus({
                      payment,
                      status:
                        payment.kind === 'coach' &&
                        cycle.status !== 'closed'
                          ? 'projected'
                          : 'pending'
                    })
                  }
                >
                  <Wallet size={16} />
                </button>
              )}
            </div>
          </td>
        </tr>
      );
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
          <small>Pagado a entrenadores</small>
          <strong>
            {formatCurrency(paidCoachExpense)}
          </strong>
        </article>

        <article className="tournament-kpi-card players">
          <small>Alumnos al día</small>
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
                  <th>Total</th>
                  <th>Pendiente</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {renderPaymentRows(
                  playerPayments,
                  'player'
                )}
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
                  <th>Total</th>
                  <th>Pendiente</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {renderPaymentRows(
                  coachPayments,
                  'coach'
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {installmentPayment && (
        <AcademyPaymentInstallmentForm
          payment={installmentPayment}
          onSave={onAddInstallment}
          onClose={() =>
            setInstallmentPayment(null)
          }
        />
      )}

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
                  Valor total del ciclo
                  <input
                    type="number"
                    min={
                      paymentTotals(
                        editingPayment
                      ).paidAmount
                    }
                    step="1000"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                  />

                  <small>
                    Ya abonado:{' '}
                    {formatCurrency(
                      paymentTotals(
                        editingPayment
                      ).paidAmount
                    )}
                  </small>
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
