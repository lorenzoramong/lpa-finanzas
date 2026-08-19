import { useEffect, useState } from 'react';
import {
  Save,
  UserRound,
  X
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  monthlyFee: '',
  active: true,
  notes: ''
};

export default function AcademyPlayerForm({
  location,
  player,
  onSave,
  onClose
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: player?.name || '',
      phone: player?.phone || '',
      email: player?.email || '',
      monthlyFee: player?.monthlyFee ?? '',
      active: player?.active !== false,
      notes: player?.notes || ''
    });
  }, [player]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert('Escribe el nombre del jugador.');
      return;
    }

    setSaving(true);

    try {
      const saved = await onSave({
        ...player,
        ...form,
        locationId: location.id,
        locationName: location.name,
        monthlyFee: Number(form.monthlyFee || 0)
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
        aria-label="Configurar jugador"
      >
        <div className="tournament-modal-header">
          <div>
            <p className="eyebrow">
              Academia · {location.name}
            </p>

            <h2>
              {player
                ? 'Editar jugador'
                : 'Nuevo jugador'}
            </h2>
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
            <label className="full">
              Nombre del jugador

              <div className="input-with-icon">
                <UserRound size={18} />

                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      'name',
                      event.target.value
                    )
                  }
                  placeholder="Nombre completo"
                  autoFocus
                />
              </div>
            </label>

            <label>
              Teléfono
              <input
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    'phone',
                    event.target.value
                  )
                }
                placeholder="300 000 0000"
              />
            </label>

            <label>
              Correo
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField(
                    'email',
                    event.target.value
                  )
                }
                placeholder="correo@ejemplo.com"
              />
            </label>

            <label>
              Mensualidad
              <input
                type="number"
                min="0"
                step="1000"
                value={form.monthlyFee}
                onChange={(event) =>
                  updateField(
                    'monthlyFee',
                    event.target.value
                  )
                }
                placeholder="0"
              />
            </label>

            <label>
              Estado
              <select
                value={
                  form.active
                    ? 'active'
                    : 'inactive'
                }
                onChange={(event) =>
                  updateField(
                    'active',
                    event.target.value === 'active'
                  )
                }
              >
                <option value="active">
                  Activo
                </option>

                <option value="inactive">
                  Inactivo
                </option>
              </select>
            </label>

            <label className="full">
              Observaciones
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Información adicional"
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
                ? 'Guardando...'
                : 'Guardar jugador'}
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
