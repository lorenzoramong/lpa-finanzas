import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';

import { formatCurrency, formatDate } from '../lib/format';

const DAY_IN_MILLISECONDS = 86400000;

function getDaysRemaining(dueDate) {
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsedDueDate = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsedDueDate.getTime())) {
    return null;
  }

  return Math.ceil(
    (parsedDueDate.getTime() - today.getTime()) /
      DAY_IN_MILLISECONDS
  );
}

function getDueDateLabel(daysRemaining) {
  if (daysRemaining === null) {
    return 'Sin fecha límite';
  }

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);

    return overdueDays === 1
      ? 'Vencido hace 1 día'
      : `Vencido hace ${overdueDays} días`;
  }

  if (daysRemaining === 0) {
    return 'Vence hoy';
  }

  if (daysRemaining === 1) {
    return 'Vence mañana';
  }

  return `Vence en ${daysRemaining} días`;
}

export default function Home({
  totals,
  projectionTotals,
  projectionStatusSummary,
  projections,
  onNewMovement,
  goProjections
}) {
  const pendingProjections = projections
    .filter(
      (projection) =>
        projection.status !== 'completed' &&
        projection.dueDate
    )
    .map((projection) => ({
      ...projection,
      daysRemaining: getDaysRemaining(projection.dueDate)
    }))
    .sort((a, b) => {
      const aDays =
        a.daysRemaining === null
          ? Number.POSITIVE_INFINITY
          : a.daysRemaining;

      const bDays =
        b.daysRemaining === null
          ? Number.POSITIVE_INFINITY
          : b.daysRemaining;

      return aDays - bDays;
    });

  const nextProjection = pendingProjections[0] || null;

  const risks = [];

  if (projectionStatusSummary.overdue > 0) {
    risks.push(
      `${projectionStatusSummary.overdue} ${
        projectionStatusSummary.overdue === 1
          ? 'compromiso está vencido'
          : 'compromisos están vencidos'
      }.`
    );
  }

  if (projectionTotals.projectedBalance < 0) {
    risks.push(
      `El saldo proyectado quedaría negativo en ${formatCurrency(
        Math.abs(projectionTotals.projectedBalance)
      )}.`
    );
  }

  const lowProbabilityIncomeCount = projections.filter(
    (projection) =>
      projection.status !== 'completed' &&
      projection.type === 'income' &&
      Number(projection.probability ?? 100) <= 50
  ).length;

  if (lowProbabilityIncomeCount > 0) {
    risks.push(
      `${lowProbabilityIncomeCount} ${
        lowProbabilityIncomeCount === 1
          ? 'ingreso proyectado tiene'
          : 'ingresos proyectados tienen'
      } una probabilidad de 50% o menos.`
    );
  }

  let financialHealth = {
    key: 'good',
    label: 'Excelente',
    description:
      'La caja proyectada es positiva y no hay compromisos vencidos.'
  };

  if (
    projectionStatusSummary.overdue > 0 ||
    projectionTotals.projectedBalance < 0
  ) {
    financialHealth = {
      key: 'risk',
      label: 'Requiere atención',
      description:
        'Hay compromisos vencidos o riesgo de una caja proyectada negativa.'
    };
  } else if (
    projectionStatusSummary.upcoming > 0 ||
    lowProbabilityIncomeCount > 0
  ) {
    financialHealth = {
      key: 'warning',
      label: 'Estable',
      description:
        'La situación es estable, pero existen compromisos próximos o ingresos inciertos.'
    };
  }

  return (
    <div className="page home-dashboard">
      <div className="page-title">
        <p className="eyebrow">Vista general</p>
        <h1>Inicio</h1>
        <p>
          Resumen ejecutivo de la situación financiera de la Liga.
        </p>
      </div>

      <section className="balance-hero">
        <span>Saldo disponible</span>

        <h1>{formatCurrency(totals.balance)}</h1>

        <div className="quick-actions">
          <button
            type="button"
            onClick={() => onNewMovement('income')}
          >
            <ArrowUpCircle />
            Nuevo ingreso
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => onNewMovement('expense')}
          >
            <ArrowDownCircle />
            Nuevo egreso
          </button>
        </div>
      </section>

      <section className="home-financial-grid">
        <article className="home-financial-card current">
          <span className="home-financial-icon">
            <Wallet size={22} />
          </span>

          <div>
            <small>Saldo actual</small>
            <strong>{formatCurrency(totals.balance)}</strong>
          </div>
        </article>

        <article className="home-financial-card projected">
          <span className="home-financial-icon">
            <CircleDollarSign size={22} />
          </span>

          <div>
            <small>Saldo proyectado</small>
            <strong>
              {formatCurrency(
                projectionTotals.projectedBalance
              )}
            </strong>
          </div>
        </article>

        <article className="home-financial-card receivable">
          <span className="home-financial-icon">
            <TrendingUp size={22} />
          </span>

          <div>
            <small>Pendiente por cobrar</small>
            <strong>
              {formatCurrency(
                projectionTotals.projectedIncome
              )}
            </strong>
          </div>
        </article>

        <article className="home-financial-card payable">
          <span className="home-financial-icon">
            <TrendingDown size={22} />
          </span>

          <div>
            <small>Pendiente por pagar</small>
            <strong>
              {formatCurrency(
                projectionTotals.projectedExpenses
              )}
            </strong>
          </div>
        </article>
      </section>

      <section className="panel home-commitments-panel">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Estado de compromisos</h2>
          </div>

          <button
            type="button"
            className="link-btn"
            onClick={goProjections}
          >
            Ver proyecciones
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="home-status-grid">
          <article className="home-status-card green">
            <span className="home-status-icon">
              <ShieldCheck size={21} />
            </span>

            <div>
              <strong>
                {projectionStatusSummary.onTime}
              </strong>
              <small>En tiempo</small>
            </div>
          </article>

          <article className="home-status-card yellow">
            <span className="home-status-icon">
              <Clock3 size={21} />
            </span>

            <div>
              <strong>
                {projectionStatusSummary.upcoming}
              </strong>
              <small>Próximos a vencer</small>
            </div>
          </article>

          <article className="home-status-card red">
            <span className="home-status-icon">
              <AlertTriangle size={21} />
            </span>

            <div>
              <strong>
                {projectionStatusSummary.overdue}
              </strong>
              <small>Vencidos</small>
            </div>
          </article>

          <article className="home-status-card completed">
            <span className="home-status-icon">
              <CheckCircle2 size={21} />
            </span>

            <div>
              <strong>
                {projectionStatusSummary.completed}
              </strong>
              <small>Completados</small>
            </div>
          </article>
        </div>
      </section>

      <section className="home-insights-grid">
        <article className="panel home-next-action">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Prioridad</p>
              <h2>Próxima acción</h2>
            </div>

            <CalendarClock size={22} />
          </div>

          {nextProjection ? (
            <>
              <div className="home-next-action-header">
                <span
                  className={`type-pill ${nextProjection.type}`}
                >
                  {nextProjection.type === 'income'
                    ? 'Próximo ingreso'
                    : 'Próximo pago'}
                </span>

                <span
                  className={`home-due-badge ${
                    nextProjection.daysRemaining < 0
                      ? 'red'
                      : nextProjection.daysRemaining <= 15
                        ? 'yellow'
                        : 'green'
                  }`}
                >
                  {getDueDateLabel(
                    nextProjection.daysRemaining
                  )}
                </span>
              </div>

              <h3>{nextProjection.description}</h3>

              <strong
                className={`home-next-action-value ${
                  nextProjection.type === 'income'
                    ? 'positive'
                    : 'negative'
                }`}
              >
                {nextProjection.type === 'income' ? '+' : '-'}
                {formatCurrency(nextProjection.amount)}
              </strong>

              <div className="home-next-action-meta">
                <span>
                  Fecha límite:{' '}
                  <strong>
                    {formatDate(nextProjection.dueDate)}
                  </strong>
                </span>

                <span>
                  Responsable:{' '}
                  <strong>
                    {nextProjection.responsible ||
                      'Sin asignar'}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                className="ghost-btn home-open-projection-btn"
                onClick={goProjections}
              >
                Ir a Proyecciones
                <ChevronRight size={17} />
              </button>
            </>
          ) : (
            <div className="home-empty-insight">
              <CheckCircle2 size={34} />

              <strong>
                No hay compromisos pendientes
              </strong>

              <span>
                Cuando registres una proyección, la más próxima
                aparecerá aquí.
              </span>
            </div>
          )}
        </article>

        <article
          className={`panel home-health-card ${financialHealth.key}`}
        >
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Análisis</p>
              <h2>Salud financiera</h2>
            </div>

            {financialHealth.key === 'good' ? (
              <ShieldCheck size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
          </div>

          <div className="home-health-result">
            <span className="home-health-dot" />

            <div>
              <small>Estado actual</small>
              <strong>{financialHealth.label}</strong>
            </div>
          </div>

          <p>{financialHealth.description}</p>

          <div className="home-risk-list">
            {!risks.length ? (
              <div className="home-risk-item good">
                <CheckCircle2 size={18} />

                <span>
                  Todo está bajo control. No se detectan riesgos
                  financieros inmediatos.
                </span>
              </div>
            ) : (
              risks.map((risk) => (
                <div
                  className="home-risk-item warning"
                  key={risk}
                >
                  <AlertTriangle size={18} />
                  <span>{risk}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
