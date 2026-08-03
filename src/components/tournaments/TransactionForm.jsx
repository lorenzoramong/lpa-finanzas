export default function TransactionForm({
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
      <div className="segmented">
        <button
          type="button"
          className={
            form.type === 'income'
              ? 'selected income'
              : ''
          }
          onClick={() =>
            updateField('type', 'income')
          }
        >
          Ingreso
        </button>

        <button
          type="button"
          className={
            form.type === 'expense'
              ? 'selected expense'
              : ''
          }
          onClick={() =>
            updateField('type', 'expense')
          }
        >
          Egreso
        </button>
      </div>

      <div className="form-grid">
        <label className="full">
          Concepto
          <input
            value={form.concept}
            onChange={(event) =>
              updateField(
                'concept',
                event.target.value
              )
            }
            placeholder="Ej. Patrocinios o Canchas"
          />
        </label>

        <label>
          Valor proyectado
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={form.projectedAmount}
            onChange={(event) =>
              updateField(
                'projectedAmount',
                event.target.value
              )
            }
            placeholder="0"
          />
        </label>

        <label>
          Valor real
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={form.actualAmount}
            onChange={(event) =>
              updateField(
                'actualAmount',
                event.target.value
              )
            }
            placeholder="0"
          />
        </label>

        <label>
          Valor pagado o cobrado
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={form.paidAmount}
            onChange={(event) =>
              updateField(
                'paidAmount',
                event.target.value
              )
            }
            placeholder="0"
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
            <option value="projected">
              Proyectado
            </option>
            <option value="pending">
              Pendiente
            </option>
            <option value="partial">
              Parcial
            </option>
            <option value="completed">
              {form.type === 'income'
                ? 'Cobrado'
                : 'Pagado'}
            </option>
            <option value="cancelled">
              Anulado
            </option>
          </select>
        </label>

        <label>
          Fecha
          <input
            type="date"
            value={form.date}
            onChange={(event) =>
              updateField(
                'date',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Fecha esperada
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              updateField(
                'dueDate',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Proveedor
          <input
            value={form.provider}
            onChange={(event) =>
              updateField(
                'provider',
                event.target.value
              )
            }
            placeholder="Empresa o persona"
          />
        </label>

        <label>
          Responsable
          <input
            value={form.responsible}
            onChange={(event) =>
              updateField(
                'responsible',
                event.target.value
              )
            }
            placeholder="Responsable interno"
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
            placeholder="Detalles del ingreso o egreso"
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
            : 'Guardar registro'}
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
