import {
  Home,
  PlusCircle,
  List,
  BarChart3,
  CalendarClock,
  Settings
} from 'lucide-react';

const desktopTabs = [
  ['dashboard', 'Inicio', Home],
  ['movements', 'Movimientos', PlusCircle],
  ['history', 'Historial', List],
  ['projections', 'Proyecciones', CalendarClock],
  ['stats', 'Estadísticas', BarChart3],
  ['settings', 'Ajustes', Settings]
];

const mobileTabs = [
  ['dashboard', 'Inicio', Home],
  ['movements', 'Movimientos', PlusCircle],
  ['history', 'Historial', List],
  ['projections', 'Proyecciones', CalendarClock],
  ['stats', 'Estadísticas', BarChart3]
];

export default function Layout({
  activeTab,
  setActiveTab,
  children
}) {
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo-lpa.png`}
            className="sidebar-logo"
            alt="Logo LPA"
          />

          <div>
            <strong>LPA Finanzas</strong>
            <span>Liga de Padel del Atlántico</span>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Navegación principal"
        >
          {desktopTabs.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? 'active' : ''}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="brand-wrap">
            <img
              src={`${import.meta.env.BASE_URL}logo-lpa.png`}
              className="brand-logo"
              alt="Logo LPA"
            />

            <div>
              <strong>LPA Finanzas</strong>
              <span>Liga de Padel del Atlántico</span>
            </div>
          </div>

          <button
            type="button"
            className={`mobile-settings-btn ${
              activeTab === 'settings' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('settings')}
            aria-label="Abrir ajustes"
          >
            <Settings size={22} />
          </button>
        </header>

        <main>{children}</main>
      </div>

      <nav
        className="bottom-nav"
        aria-label="Navegación móvil"
      >
        {mobileTabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? 'active' : ''}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
