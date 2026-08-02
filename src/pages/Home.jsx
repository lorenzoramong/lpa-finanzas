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
  onNewMovement,
  goProjections
}) {
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
            <p className="eyebrow">Planeación</p>
            <h2>Proyecciones</h2>
          </div>

          <button
            type="button"
            className="link-btn"
            onClick={goProjections}
          >
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
