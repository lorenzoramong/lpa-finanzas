export default function TournamentForm({
  form,
  setForm,
  onSubmit,
  editing,
  onCancel
}) {
  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="full">
          Nombre del torneo
          <input
            value={form.name}
            onChange={(event) =>
              updateField(
                'name',
                event.target.value
              )
            }
            placeholder="Ej. Segunda Parada LPA Tour 2026"
          />
        </label>

        <label>
          Edición
          <input
            value={form.edition}
            onChange={(event) =>
              updateField(
                'edition',
                event.target.value
              )
            }
            placeholder="Ej. Segunda Parada"
          />
        </label>

        <label>
          Temporada
          <input
            value={form.season}
            onChange={(event) =>
              updateField(
                'season',
                event.target.value
              )
            }
            placeholder="Ej. 2026"
          />
        </label>

        <label className="full">
          Sede
          <input
            value={form.venue}
            onChange={(event) =>
              updateField(
                'venue',
                event.target.value
              )
            }
            placeholder="Ej. Barranquilla"
          />
        </label>

        <label>
          Fecha inicial
          <input
            type="date"
            value={form.startDate}
            onChange={(event) =>
              updateField(
                'startDate',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Fecha final
          <input
            type="date"
            value={form.endDate}
            onChange={(event) =>
              updateField(
                'endDate',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Estado
          <select
            value={form.status}
            onChange={(event) =>
              updateField(
                'status',
                event.target.value
              )
            }
          >
            <option value="draft">
              Borrador
            </option>
            <option value="active">
              Activo
            </option>
            <option value="completed">
              Finalizado
            </option>
            <option value="cancelled">
              Anulado
            </option>
          </select>
        </label>

        <label>
          Valor de inscripción por pareja
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={form.registrationValue}
            onChange={(event) =>
              updateField(
                'registrationValue',
                event.target.value
              )
            }
            placeholder="0"
          />
        </label>

        <label>
          Parejas proyectadas
          <input
            type="number"
            min="0"
            value={form.projectedPairs}
            onChange={(event) =>
              updateField(
                'projectedPairs',
                event.target.value
              )
            }
            placeholder="0"
          />
        </label>

        <label>
          Jugadores proyectados
          <input
            type="number"
            min="0"
            value={form.projectedPlayers}
            onChange={(event) =>
              updateField(
                'projectedPlayers',
                event.target.value
              )
            }
            placeholder="0"
          />
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
            placeholder="Información adicional del torneo"
          />
        </label>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="primary-btn"
        >
          {editing
            ? 'Guardar cambios'
            : 'Crear torneo'}
        </button>

        <button
          type="button"
          className="ghost-btn"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

