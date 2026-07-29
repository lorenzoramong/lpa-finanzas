import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../lib/format';

export default function SummaryCards({ income, expenses, utility, compact = false }) {
  const cards = [
    ['Ingresos', income, 'income', TrendingUp],
    ['Egresos', expenses, 'expense', TrendingDown],
    ['Utilidad', utility, utility >= 0 ? 'income' : 'expense', Wallet],
  ];
  return (
    <section className={`summary-grid ${compact ? 'compact' : ''}`}>
      {cards.map(([label, value, tone, Icon]) => (
        <article className={`summary-card ${tone}`} key={label}>
          <div className="summary-icon"><Icon size={20} /></div>
          <span>{label}</span>
          <strong>{formatCurrency(value)}</strong>
        </article>
      ))}
    </section>
  );
}
