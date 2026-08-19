import { useEffect, useState } from 'react';
import {
  ArrowRight,
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

  const totalAmount =
    Number(payment?.amount || 0);

  const paidAmount =
    Number(payment?.paidAmount || 0);

  const pendingAmount =
    Number(
      payment?.pendingAmount ??
        totalAmount - paidAmount
    );

  const enteredAmount =
    Number(amount || 0);

  const remainingAfter =
    Math.max(
      0,
      pendingAmount -
        (Number.isFinite(enteredAmount)
          ? enteredAmount
          : 0)
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

    if (value >= pendingAmount) {
      alert(
        'Para pagar el saldo completo usa el botón "Pago completo". Esta ventana es solo para abonos parciales.'
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
        aria-label="Registrar abono parcial"
      >
        <div className="tournament-modal-header">
          <div>
            <p className="eyebrow">
              Abono parcial · Mensualidad
            </p>

            <h2>{payment.personName}</h2>

            <span className="muted">
              {payment.locationName || 'Sin sede'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 22
          }}
        >
          <div
            style={{
              padding: '16px',
              border: '1px solid #dbe4ef',
              borderRadius: 16,
              background: '#f8fafc'
            }}
          >
            <small
              style={{
                display: 'block',
                marginBottom: 7,
                fontWeight: 800,
                color: '#64748b'
              }}
            >
              VALOR TOTAL
            </small>

            <strong
              style={{
                fontSize: 18
              }}
            >
              {formatCurrency(totalAmount)}
            </strong>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid #cfe9da',
              borderRadius: 16,
              background: '#f4fbf7'
            }}
          >
            <small
              style={{
                display: 'block',
                marginBottom: 7,
                fontWeight: 800,
                color: '#64748b'
              }}
            >
              YA ABONADO
            </small>

            <strong
              className="positive"
              style={{
                fontSize: 18
              }}
            >
              {formatCurrency(paidAmount)}
            </strong>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid #dbe4ef',
              borderRadius: 16,
              background: '#ffffff'
            }}
          >
            <small
              style={{
                display: 'block',
                marginBottom: 7,
                fontWeight: 800,
                color: '#64748b'
              }}
            >
              PENDIENTE
            </small>

            <strong
              style={{
                fontSize: 18
              }}
            >
              {formatCurrency(pendingAmount)}
            </strong>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Valor del abono

              <div className="input-with-icon">
                <CircleDollarSign size={18} />

                <input
                  type="number"
                  min="1"
                  max={Math.max(
                    0,
                    pendingAmount - 1
                  )}
                  step="1000"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 200000"
                  autoFocus
                />
              </div>
            </label>

            <label>
              Fecha del pago
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

            <div
              className="full"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 16px',
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <div>
                <small
                  style={{
                    display: 'block',
                    marginBottom: 4,
                    color: '#64748b'
                  }}
                >
                  Después de este abono quedaría pendiente
                </small>

                <strong
                  style={{
                    fontSize: 18
                  }}
                >
                  {formatCurrency(
                    remainingAfter
                  )}
                </strong>
              </div>

              <ArrowRight size={20} />
            </div>

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
                : 'Registrar abono parcial'}
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
