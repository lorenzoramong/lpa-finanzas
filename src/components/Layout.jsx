import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  History,
  Home,
  Landmark,
  LayoutGrid,
  PlusCircle,
  Settings,
  Trophy,
  X
} from 'lucide-react';

const primaryTabs = [
  ['dashboard', 'Inicio', Home],
  ['cashflow', 'Flujo de caja', Landmark],
  ['movements', 'Nuevo movimiento', PlusCircle]
];

const centerOptions = [
  {
    id: 'history',
    label: 'Historial',
    description: 'Consulta y administra todos los movimientos',
    icon: History,
    className: 'history'
  },
  {
    id: 'projections',
    label: 'Proyecciones',
    description: 'Gestiona ingresos y egresos futuros',
    icon: CalendarClock,
    className: 'projections'
  },
  {
    id: 'tournaments',
    label: 'Torneos',
    description: 'Control financiero, rentabilidad y audiencia',
    icon: Trophy,
    className: 'tournaments'
  },
  {
    id: 'stats',
    label: 'Estadísticas',
    description: 'Indicadores, filtros y gráficos financieros',
    icon: BarChart3,
    className: 'stats'
  },
  {
    id: 'settings',
    label: 'Ajustes',
    description: 'Categorías, balance y respaldos',
    icon: Settings,
    className: 'settings'
  }
];

const centerTabIds = centerOptions.map(
  (option) => option.id
);

export default function Layout({
  activeTab,
  setActiveTab,
  children
}) {
  const [centerOpen, setCenterOpen] = useState(false);

  const centerIsActive = centerTabIds.includes(activeTab);

  useEffect(() => {
    if (!centerOpen) {
      return undefined;
    }

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') {
        setCenterOpen(false);
      }
    };

    document.addEventListener('keydown', closeWithEscape);
    document.body.classList.add('center-menu-open');

    return () => {
      document.removeEventListener(
        'keydown',
        closeWithEscape
      );

      document.body.classList.remove(
        'center-menu-open'
      );
    };
  }, [centerOpen]);

  const navigateTo = (tabId) => {
    setActiveTab(tabId);
    setCenterOpen(false);
  };

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
          {primaryTabs.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={
                activeTab === id ? 'active' : ''
              }
              onClick={() => navigateTo(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            className={`sidebar-center-btn ${
              centerIsActive || centerOpen
                ? 'active'
                : ''
            }`}
            onClick={() => setCenterOpen(true)}
          >
            <LayoutGrid size={20} />
            <span>Centro</span>
          </button>
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
        </header>

        <main>{children}</main>
      </div>

      <nav
        className="bottom-nav"
        aria-label="Navegación móvil"
      >
        <button
          type="button"
          className={
            activeTab === 'dashboard' ? 'active' : ''
          }
          onClick={() => navigateTo('dashboard')}
        >
          <Home size={20} />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          className={
            activeTab === 'cashflow' ? 'active' : ''
          }
          onClick={() => navigateTo('cashflow')}
        >
          <Landmark size={20} />
          <span>Flujo</span>
        </button>

        <button
          type="button"
          className={
            activeTab === 'movements' ? 'active' : ''
          }
          onClick={() => navigateTo('movements')}
        >
          <PlusCircle size={20} />
          <span>Nuevo</span>
        </button>

        <button
          type="button"
          className={
            centerIsActive || centerOpen
              ? 'active'
              : ''
          }
          onClick={() => setCenterOpen(true)}
        >
          <LayoutGrid size={20} />
          <span>Centro</span>
        </button>
      </nav>

      {centerOpen && (
        <div
          className="center-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCenterOpen(false);
            }
          }}
        >
          <section
            className="center-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="center-title"
          >
            <div className="center-handle" />

            <div className="center-sheet-header">
              <div>
                <p className="eyebrow">
                  Navegación
                </p>

                <h2 id="center-title">
                  Centro financiero
                </h2>

                <span>
                  Herramientas y módulos de LPA Finanzas
                </span>
              </div>

              <button
                type="button"
                className="center-close-btn"
                onClick={() => setCenterOpen(false)}
                aria-label="Cerrar centro"
              >
                <X size={21} />
              </button>
            </div>

            <div className="center-options">
              {centerOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`center-option ${
                      option.className
                    } ${
                      activeTab === option.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      navigateTo(option.id)
                    }
                  >
                    <span className="center-option-icon">
                      <Icon size={22} />
                    </span>

                    <span className="center-option-copy">
                      <strong>
                        {option.label}
                      </strong>

                      <small>
                        {option.description}
                      </small>
                    </span>

                    <ChevronRight
                      className="center-option-arrow"
                      size={19}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

