import { Home, PlusCircle, List, BarChart3, Settings } from 'lucide-react';

const tabs = [
  ['dashboard', 'Inicio', Home],
  ['movements', 'Movimientos', PlusCircle],
  ['history', 'Historial', List],
  ['stats', 'Estadísticas', BarChart3],
  ['settings', 'Ajustes', Settings],
];

export default function Layout({ activeTab, setActiveTab, children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img src={`${import.meta.env.BASE_URL}logo-lpa.png`} className="brand-logo" alt="Logo LPA" />
          <div>
            <strong>LPA Finanzas</strong>
            <span>Liga de Padel del Atlántico</span>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
