import { ArrowDownCircle, ArrowUpCircle, ChevronRight } from 'lucide-react';
import SummaryCards from '../components/SummaryCards';
import { formatCurrency, formatDate } from '../lib/format';

export default function Dashboard({ movements, settings, totals, onNewMovement, goHistory }) {
  const recent = [...movements].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  return (
    <div className="page page-dashboard">
      <section className="balance-hero">
        <span>Saldo disponible</span>
        <h1>{formatCurrency(totals.balance)}</h1>
        <small>Balance inicial: {formatCurrency(settings.initialBalance)}</small>
        <div className="quick-actions">
          <button onClick={() => onNewMovement('income')}><ArrowUpCircle /> + Ingreso</button>
          <button className="secondary" onClick={() => onNewMovement('expense')}><ArrowDownCircle /> + Egreso</button>
        </div>
      </section>

      <SummaryCards income={totals.income} expenses={totals.expenses} utility={totals.utility} />

      <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Actividad</p><h2>Últimos movimientos</h2></div>
          <button className="link-btn" onClick={goHistory}>Ver todos <ChevronRight size={16}/></button>
        </div>
        <div className="movement-list">
          {!recent.length && <div className="empty-state">Todavía no has registrado movimientos.</div>}
          {recent.map((m) => (
            <article className="movement-row" key={m.id}>
              <div className={`movement-badge ${m.type}`}>{m.type === 'income' ? <ArrowUpCircle/> : <ArrowDownCircle/>}</div>
              <div className="movement-main"><strong>{m.description}</strong><span>{m.category} · {m.subcategory || 'Sin subcategoría'} · {formatDate(m.date)}</span></div>
              <strong className={m.type === 'income' ? 'positive' : 'negative'}>{m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
