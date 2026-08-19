import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Save,
  X
} from 'lucide-react';

export default function AcademyCycleSettingsForm({
  settings,
  onSave,
  onClose
}) {
  const [form, setForm] = useState({
    cycleStartDay: 19,
    cycleEndDay: 19
  });

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setForm({
      cycleStartDay:
        settings?.cycleStartDay ?? 19,
      cycleEndDay:
        settings?.cycleEndDay ?? 19
    });
  }, [settings]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cycleStartDay = Number(
      form.cycleStartDay
    );

    const cycleEndDay = Number(
      form.cycleEndDay
    );

    if (
      !Number.isInteger(cycleStartDay) ||
      cycleStartDay < 1 ||
      cycleStartDay > 31
    ) {
      alert(
        'El día inicial debe estar entre 1 y 31.'
      );
      return;
    }

    if (
      !Number.isInteger(cycleEndDay) ||
      cycleEndDay < 1 ||
      cycleEndDay > 31
    ) {
      alert(
        'El día final debe estar entre 1 y 31.'
      );
      return;
    }

    setSaving(true);

    try {
      const saved = await onSave({
        cycleStartDay,
        cycleEndDay
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
        aria-label="Configurar ciclos"
      >
        <div className="tournament-modal-header">
          <div>
            <p className="eyebrow">
              Academia
            </p>

            <h2>Configurar ciclos</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Día de inicio
              <input
                type="number"
                min="1"
                max="31"
                value={form.cycleStartDay}
                onChange={(event) =>
                  updateField(
                    'cycleStartDay',
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Día de finalización
              <input
                type="number"
                min="1"
                max="31"
                value={form.cycleEndDay}
                onChange={(event) =>
                  updateField(
                    'cycleEndDay',
                    event.target.value
                  )
                }
              />
            </label>

            <div className="full">
              <div className="tournament-commercial-list">
                <div>
                  <CalendarDays size={19} />

                  <span>
                    La configuración nueva se utilizará para
                    crear los próximos ciclos. El ciclo actual
                    conserva las fechas, jugadores, cuotas y
                    entrenadores con los que fue creado.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              <Save size={18} />

              {saving
                ? 'Guardando...'
                : 'Guardar configuración'}
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
