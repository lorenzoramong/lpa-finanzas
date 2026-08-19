import { useEffect, useState } from 'react';
import {
  CircleDollarSign,
  Save,
  X
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function AcademyPaymentInstallmentForm({
  payment,
  onSave,
  onClose
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const pendingAmount = Number(
    payment?.pendingAmount ??
      payment?.amount ??
      0
  );

  useEffect(() => {
    const today =
      new Date().toISOString().slice(0, 10);

    setAmount('');
    setDate(today);
    setNotes('');
  }, [payment]);

  const submit = async (event) => {
    event.preventDefault();

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      alert(
        'Escribe el valor del abono.'
      );
      return;
    }

    if (value > pendingAmount) {
      alert(
        `El máximo que puedes registrar es ${formatCurrency(
          pendingAmount
        )}.`
      );
      return;
    }

    setSaving(true);

    try {
      const saved = await onSave({
        payment,
        amount: value,
        date,
        notes
      });

      if (saved) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="tournament-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="tournament-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar abono"
      >
        <div className="tournament-modal-header">
          <div>
            <p className="eyebrow">
              {payment.kind === 'player'
                ? 'Cobro de mensualidad'
                : 'Pago a entrenador'}
            </p>

            <h2>{payment.personName}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="tournament-comparison-list">
          <div>
            <span>Valor total</span>
            <strong>
              {formatCurrency(payment.amount)}
            </strong>
          </div>

          <div>
            <span>Ya abonado</span>
            <strong className="positive">
              {formatCurrency(
                payment.paidAmount || 0
              )}
            </strong>
          </div>

          <div>
            <span>Pendiente</span>
            <strong>
              {formatCurrency(
                pendingAmount
              )}
            </strong>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Valor de este abono

              <div className="input-with-icon">
                <CircleDollarSign size={18} />

                <input
                  type="number"
                  min="1"
                  max={pendingAmount}
                  step="1000"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="0"
                  autoFocus
                />
              </div>
            </label>

            <label>
              Fecha
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
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
                placeholder="Transferencia, efectivo, referencia, etc."
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              <Save size={18} />

              {saving
                ? 'Registrando...'
                : 'Registrar abono'}
            </button>

            <button
              type="button"
              className="ghost-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
