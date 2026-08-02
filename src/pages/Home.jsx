import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  ChevronRight,
  Wallet
} from 'lucide-react';

import { formatCurrency } from '../lib/format';

export default function Home({
  totals,
  movements,
  onNewMovement,
  goCashflow,
  goProjections
}) {
  const recent = [...movements]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt)
    )
    .slice(0, 3);

  return (
    <div className="page">
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
          <button onClick={() => onNewMovement('income')}>
            <ArrowUpCircle />
            Nuevo ingreso
          </button>

          <button
            className="secondary"
            onClick={() => onNewMovement('expense')}
          >
            <ArrowDownCircle />
            Nuevo egreso
          </button>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon">
            <Wallet size={20} />
          </div>
          <span>Saldo actual</span>
          <strong>{formatCurrency(totals.balance)}</strong>
        </article>

        <article className="summary-card">
          <div className="summary-icon">
            <CalendarClock size={20} />
          </div>
          <span>Saldo proyectado</span>
          <strong>Próximamente</strong>
        </article>

        <article className="summary-card">
          <div className="summary-icon">
            <CalendarClock size={20} />
          </div>
          <span>Proyecciones</span>
          <strong>Por configurar</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2>Últimos movimientos</h2>
          </div>

          <button className="link-btn" onClick={goCashflow}>
            Ver flujo de caja
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="movement-list">
          {!recent.length && (
            <div className="empty-state">
              Todavía no has registrado movimientos.
            </div>
          )}

          {recent.map((movement) => (
            <article className="movement-row" key={movement.id}>
              <div
                className={`movement-badge ${movement.type}`}
              >
                {movement.type === 'income' ? (
                  <ArrowUpCircle />
                ) : (
                  <ArrowDownCircle />
                )}
              </div>

              <div className="movement-main">
                <strong>{movement.description}</strong>
                <span>
                  {movement.category} ·{' '}
                  {movement.subcategory || 'Sin subcategoría'}
                </span>
              </div>

              <strong
                className={
                  movement.type === 'income'
                    ? 'positive'
                    : 'negative'
                }
              >
                {movement.type === 'income' ? '+' : '-'}
                {formatCurrency(movement.amount)}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Planeación</p>
            <h2>Proyecciones</h2>
          </div>

          <button className="link-btn" onClick={goProjections}>
            Abrir módulo
            <ChevronRight size={16} />
          </button>
        </div>

        <p className="muted">
          Aquí aparecerán los ingresos proyectados, egresos
          proyectados y el semáforo de vencimientos.
        </p>
      </section>
    </div>
  );
}
