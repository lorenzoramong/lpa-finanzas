import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

import { formatCurrency } from '../lib/format';

const initialForm = {
  type: 'income',
  description: '',
  amount: '',
  startDate: '',
  dueDate: '',
  probability: 100,
  responsible: '',
  priority: 'medium',
  notes: ''
};

function getProjectionStatus(projection, yellowDays = 15) {
  if (projection.status === 'completed') {
    return {
      key: 'completed',
      label:
        projection.type === 'income'
          ? 'Recibido'
          : 'Pagado'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${projection.dueDate}T00:00:00`);
  const differenceInMilliseconds = dueDate - today;
  const daysRemaining = Math.ceil(
    differenceInMilliseconds / 86400000
  );

  if (daysRemaining < 0) {
    return {
      key: 'red',
      label: `Vencido hace ${Math.abs(daysRemaining)} días`,
      daysRemaining
    };
  }

  if (daysRemaining <= yellowDays) {
    return {
      key: 'yellow',
      label:
        daysRemaining === 0
          ? 'Vence hoy'
          : `Vence en ${daysRemaining} días`,
      daysRemaining
    };
  }

  return {
    key: 'green',
    label: `En tiempo · ${daysRemaining} días`,
    daysRemaining
  };
}

export default function Projections({
  projections,
  settings,
  onSave,
  onDelete,
  onComplete
}) {
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');

  const yellowDays =
    settings?.projectionTrafficLight?.yellowDays ?? 15;

  const pendingProjections = useMemo(
    () =>
      projections.filter(
        (projection) => projection.status !== 'completed'
      ),
    [projections]
  );

  const totals = useMemo(() => {
    const projectedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const projectedExpenses = pendingProjections
      .filter((projection) => projection.type === 'expense')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const weightedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total +
          Number(projection.amount || 0) *
            (Number(projection.probability || 0) / 100),
        0
      );

    return {
      projectedIncome,
      projectedExpenses,
      projectedUtility:
        projectedIncome - projectedExpenses,
      weightedIncome
    };
  }, [pendingProjections]);

  const filteredProjections = useMemo(() => {
    return [...projections]
      .filter((projection) => {
        if (
          typeFilter !== 'all' &&
          projection.type !== typeFilter
        ) {
          return false;
        }

        if (
          statusFilter === 'pending' &&
          projection.status === 'completed'
        ) {
          return false;
        }

        if (
          statusFilter === 'completed' &&
          projection.status !== 'completed'
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') {
          return 1;
        }

        if (a.status !== 'completed' && b.status === 'completed') {
          return -1;
        }

        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [projections, typeFilter, statusFilter]);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setShowForm(false);
  };

  const startEditing = (projection) => {
    setEditing(projection);

    setForm({
      type: projection.type,
      description: projection.description || '',
      amount: String(projection.amount || ''),
      startDate: projection.startDate || '',
      dueDate: projection.dueDate || '',
      probability: Number(projection.probability ?? 100),
      responsible: projection.responsible || '',
      priority: projection.priority || 'medium',
      notes: projection.notes || ''
    });

    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.description.trim()) {
      alert('Escribe una descripción.');
      return;
    }

    if (Number(form.amount) <= 0) {
      alert('El valor debe ser mayor a cero.');
      return;
    }

    if (!form.startDate || !form.dueDate) {
      alert('Selecciona la fecha inicial y la fecha límite.');
      return;
    }

    if (form.dueDate < form.startDate) {
      alert(
        'La fecha límite no puede ser anterior a la fecha inicial.'
      );
      return;
    }

    await onSave({
      ...form,
      id: editing?.id,
      amount: Number(form.amount),
      probability: Number(form.probability),
      status: editing?.status || 'pending',
      completedAt: editing?.completedAt || null,
      createdAt: editing?.createdAt
    });

    resetForm();
  };

  return (
    <div className="page">
      <div className="page-title row-title">
        <div>
          <p className="eyebrow">Planeación financiera</p>
          <h1>Proyecciones</h1>
          <p>
            Controla ingresos y egresos futuros sin mezclarlos con
            el flujo real.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setEditing(null);
            setForm(initialForm);
            setShowForm((current) => !current);
          }}
        >
          <Plus size={18} />
          Nueva proyección
        </button>
      </div>

      <section className="projection-summary-grid">
        <article className="projection-summary-card income">
          <span className="projection-summary-icon">
            <TrendingUp size={21} />
          </span>

          <div>
            <small>Ingresos proyectados</small>
            <strong>
              {formatCurrency(totals.projectedIncome)}
            </strong>
          </div>
        </article>

        <article className="projection-summary-card expense">
          <span className="projection-summary-icon">
            <TrendingDown size={21} />
          </span>

          <div>
            <small>Egresos proyectados</small>
            <strong>
              {formatCurrency(totals.projectedExpenses)}
            </strong>
          </div>
        </article>

        <article className="projection-summary-card utility">
          <span className="projection-summary-icon">
            <CircleDollarSign size={21} />
          </span>

          <div>
            <small>Resultado proyectado</small>
            <strong>
              {formatCurrency(totals.projectedUtility)}
            </strong>
          </div>
        </article>

        <article className="projection-summary-card probable">
          <span className="projection-summary-icon">
            <CalendarClock size={21} />
          </span>

          <div>
            <small>Ingreso ponderado</small>
            <strong>
              {formatCurrency(totals.weightedIncome)}
            </strong>
          </div>
        </article>
      </section>

      {showForm && (
        <form
          className="panel projection-form"
          onSubmit={submit}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {editing ? 'Editar' : 'Nuevo registro'}
              </p>
              <h2>
                {editing
                  ? 'Editar proyección'
                  : 'Agregar proyección'}
              </h2>
            </div>
          </div>

          <div className="segmented">
            <button
              type="button"
              className={
                form.type === 'income'
                  ? 'selected income'
                  : ''
              }
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  type: 'income'
                }))
              }
            >
              Ingreso proyectado
            </button>

            <button
              type="button"
              className={
                form.type === 'expense'
                  ? 'selected expense'
                  : ''
              }
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  type: 'expense'
                }))
              }
            >
              Egreso proyectado
            </button>
          </div>

          <div className="form-grid">
            <label className="full">
              Descripción
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Ej. Patrocinio Tecnoglass"
              />
            </label>

            <label>
              Valor
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value
                  }))
                }
                placeholder="0"
              />
            </label>

            <label>
              Probabilidad
              <select
                value={form.probability}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    probability: Number(event.target.value)
                  }))
                }
              >
                <option value="100">100% · Confirmado</option>
                <option value="80">80% · Muy probable</option>
                <option value="50">50% · Probable</option>
                <option value="20">20% · Incierto</option>
              </select>
            </label>

            <label>
              Fecha inicial
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value
                  }))
                }
              />
            </label>

            <label>
              Fecha límite
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value
                  }))
                }
              />
            </label>

            <label>
              Responsable
              <input
                value={form.responsible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    responsible: event.target.value
                  }))
                }
                placeholder="Ej. Lorenzo"
              />
            </label>

            <label>
              Prioridad
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value
                  }))
                }
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </label>

            <label className="full">
              Observaciones
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value
                  }))
                }
                placeholder="Contrato, factura pendiente, condiciones de pago..."
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-btn">
              {editing ? 'Guardar cambios' : 'Guardar proyección'}
            </button>

            <button
              type="button"
              className="ghost-btn"
              onClick={resetForm}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="panel projection-list-panel">
        <div className="projection-toolbar">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Compromisos financieros</h2>
          </div>

          <div className="projection-filters">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
            >
              <option value="all">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Egresos</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="pending">Pendientes</option>
              <option value="completed">Completados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        <div className="projection-list">
          {!filteredProjections.length && (
            <div className="empty-state">
              No hay proyecciones para mostrar.
            </div>
          )}

          {filteredProjections.map((projection) => {
            const status = getProjectionStatus(
              projection,
              yellowDays
            );

            return (
              <article
                className={`projection-card ${status.key}`}
                key={projection.id}
              >
                <div className="projection-status-bar" />

                <div className="projection-card-content">
                  <div className="projection-card-header">
                    <div>
                      <span
                        className={`type-pill ${projection.type}`}
                      >
                        {projection.type === 'income'
                          ? 'Ingreso'
                          : 'Egreso'}
                      </span>

                      <h3>{projection.description}</h3>
                    </div>

                    <strong
                      className={
                        projection.type === 'income'
                          ? 'positive'
                          : 'negative'
                      }
                    >
                      {formatCurrency(projection.amount)}
                    </strong>
                  </div>

                  <div className="projection-meta-grid">
                    <div>
                      <small>Estado</small>
                      <span
                        className={`projection-status-badge ${status.key}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div>
                      <small>Fecha límite</small>
                      <strong>{projection.dueDate}</strong>
                    </div>

                    <div>
                      <small>Probabilidad</small>
                      <strong>
                        {projection.probability ?? 100}%
                      </strong>
                    </div>

                    <div>
                      <small>Responsable</small>
                      <strong>
                        {projection.responsible || 'Sin asignar'}
                      </strong>
                    </div>
                  </div>

                  {projection.notes && (
                    <p className="projection-notes">
                      {projection.notes}
                    </p>
                  )}

                  <div className="projection-card-actions">
                    {projection.status !== 'completed' && (
                      <button
                        type="button"
                        className="projection-complete-btn"
                        onClick={() => onComplete(projection)}
                      >
                        <CheckCircle2 size={17} />
                        {projection.type === 'income'
                          ? 'Marcar recibido'
                          : 'Marcar pagado'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => startEditing(projection)}
                    >
                      <Pencil size={17} />
                      Editar
                    </button>

                    <button
                      type="button"
                      className="projection-delete-btn"
                      onClick={() => onDelete(projection.id)}
                    >
                      <Trash2 size={17} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
