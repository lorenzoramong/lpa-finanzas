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

const centerTabIds = centerOptions.map((option) => option.id);

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
      document.removeEventListener('keydown', closeWithEscape);
      document.body.classList.remove('center-menu-open');
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
              className={activeTab === id ? 'active' : ''}
              onClick={() => navigateTo(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            className={`sidebar-center-btn ${
              centerIsActive || centerOpen ? 'active' : ''
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
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => navigateTo('dashboard')}
        >
          <Home size={20} />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          className={activeTab === 'cashflow' ? 'active' : ''}
          onClick={() => navigateTo('cashflow')}
        >
          <Landmark size={20} />
          <span>Flujo</span>
        </button>

        <button
          type="button"
          className={activeTab === 'movements' ? 'active' : ''}
          onClick={() => navigateTo('movements')}
        >
          <PlusCircle size={20} />
          <span>Nuevo</span>
        </button>

        <button
          type="button"
          className={centerIsActive || centerOpen ? 'active' : ''}
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
                <p className="eyebrow">Navegación</p>
                <h2 id="center-title">Centro financiero</h2>
                <span>Herramientas y módulos de LPA Finanzas</span>
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
                    className={`center-option ${option.className} ${
                      activeTab === option.id ? 'selected' : ''
                    }`}
                    onClick={() => navigateTo(option.id)}
                  >
                    <span className="center-option-icon">
                      <Icon size={22} />
                    </span>

                    <span className="center-option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
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

/* =========================================================
   CENTRO FINANCIERO
   ========================================================= */

body.center-menu-open {
  overflow: hidden;
}

.center-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  padding: 24px;
  background: rgba(10, 22, 38, 0.48);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: centerOverlayIn 0.2s ease;
}

.center-sheet {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  padding: 24px;
  overflow-y: auto;
  border: 1px solid rgba(223, 230, 238, 0.9);
  border-radius: 26px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 31, 52, 0.28);
  animation: centerSheetDesktopIn 0.24s ease;
}

.center-handle {
  display: none;
}

.center-sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.center-sheet-header .eyebrow {
  margin: 0 0 4px;
}

.center-sheet-header h2 {
  margin: 0;
  color: var(--navy);
  font-size: 1.5rem;
}

.center-sheet-header span {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.9rem;
}

.center-close-btn {
  width: 42px;
  height: 42px;
  min-width: 42px;
  padding: 0;
  border: 0;
  border-radius: 13px;
  background: #eef2f6;
  color: var(--navy);
  display: grid;
  place-items: center;
}

.center-close-btn:hover {
  background: #e2e8ef;
}

.center-options {
  display: grid;
  gap: 11px;
}

.center-option {
  width: 100%;
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 17px;
  background: #ffffff;
  color: var(--navy);
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  text-align: left;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.center-option:hover {
  transform: translateY(-2px);
  border-color: #bac8d7;
  box-shadow: 0 10px 25px rgba(31, 51, 74, 0.08);
}

.center-option.selected {
  border-color: rgba(23, 42, 70, 0.3);
  background: #f3f6fa;
}

.center-option-icon {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  display: grid;
  place-items: center;
}

.center-option.history .center-option-icon {
  background: #eaf1fb;
  color: #3769a5;
}

.center-option.projections .center-option-icon {
  background: #e9f7ef;
  color: var(--green);
}

.center-option.stats .center-option-icon {
  background: #f1ebfb;
  color: #7651a8;
}

.center-option.settings .center-option-icon {
  background: #eef2f6;
  color: var(--navy);
}

.center-option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.center-option-copy strong {
  font-size: 0.98rem;
}

.center-option-copy small {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.35;
}

.center-option-arrow {
  color: #91a0b1;
  flex: 0 0 auto;
}

@keyframes centerOverlayIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes centerSheetDesktopIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* =========================================================
   CENTRO FINANCIERO EN CELULAR
   ========================================================= */

@media (max-width: 760px) {
  .center-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .center-sheet {
    width: 100%;
    max-height: calc(88vh - env(safe-area-inset-top));
    max-height: calc(88dvh - env(safe-area-inset-top));
    padding:
      10px
      16px
      calc(22px + env(safe-area-inset-bottom));
    border: 0;
    border-radius: 26px 26px 0 0;
    animation: centerSheetMobileIn 0.28s ease;
  }

  .center-handle {
    width: 44px;
    height: 5px;
    margin: 0 auto 17px;
    border-radius: 999px;
    background: #d5dde6;
    display: block;
  }

  .center-sheet-header {
    margin-bottom: 18px;
  }

  .center-sheet-header h2 {
    font-size: 1.35rem;
  }

  .center-sheet-header span {
    font-size: 0.82rem;
  }

  .center-close-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }

  .center-options {
    gap: 10px;
  }

  .center-option {
    min-height: 76px;
    padding: 13px;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    gap: 11px;
  }

  .center-option-icon {
    width: 46px;
    height: 46px;
  }

  .center-option-copy strong {
    font-size: 0.94rem;
  }

  .center-option-copy small {
    font-size: 0.75rem;
  }
}

@keyframes centerSheetMobileIn {
  from {
    opacity: 0;
    transform: translateY(100%);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
