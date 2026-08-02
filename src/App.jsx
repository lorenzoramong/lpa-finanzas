import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import History from './pages/History';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

import { db, seedDatabase } from './lib/db';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    initialBalance: 0
  });

  const [initialType, setInitialType] = useState('income');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    await seedDatabase();

    const [movementData, categoryData, settingsData] =
      await Promise.all([
        db.getAll('movements'),
        db.getAll('categories'),
        db.get('settings', 'general')
      ]);

    setMovements(movementData || []);
    setCategories(categoryData || []);
    setSettings(
      settingsData || {
        initialBalance: 0
      }
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const income = movements
      .filter((movement) => movement.type === 'income')
      .reduce(
        (total, movement) =>
          total + Number(movement.amount || 0),
        0
      );

    const expenses = movements
      .filter((movement) => movement.type === 'expense')
      .reduce(
        (total, movement) =>
          total + Number(movement.amount || 0),
        0
      );

    return {
      income,
      expenses,
      utility: income - expenses,
      balance:
        Number(settings.initialBalance || 0) +
        income -
        expenses
    };
  }, [movements, settings]);

  const openNewMovement = (type = 'income') => {
    setEditing(null);
    setInitialType(type);
    setTab('movements');
  };

  const saveMovement = async (data) => {
    try {
      const item = {
        ...data,
        amount: Number(data.amount),
        id: editing?.id || crypto.randomUUID(),
        createdAt:
          editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.put('movements', item);

      setEditing(null);
      await load();

      setTab('cashflow');
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      alert('No fue posible guardar el movimiento.');
    }
  };

  const deleteMovement = async (id) => {
    const confirmed = confirm(
      '¿Eliminar este movimiento? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('movements', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
      alert('No fue posible eliminar el movimiento.');
    }
  };

  const editMovement = (movement) => {
    setEditing(movement);
    setInitialType(movement.type);
    setTab('movements');
  };

  const addCategory = async (category) => {
    try {
      await db.put('categories', {
        ...category,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await load();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      alert('No fue posible crear la categoría.');
    }
  };

  const updateCategory = async (category) => {
    if (!category?.id) {
      alert('No fue posible identificar la categoría.');
      return;
    }

    try {
      await db.put('categories', {
        ...category,
        updatedAt: new Date().toISOString()
      });

      await load();
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      alert('No fue posible actualizar la categoría.');
    }
  };

  const deleteCategory = async (id) => {
    const confirmed = confirm(
      '¿Eliminar esta categoría? Los movimientos existentes no se borrarán.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('categories', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('No fue posible eliminar la categoría.');
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await db.put('settings', {
        ...newSettings,
        id: 'general',
        initialBalance: Number(
          newSettings.initialBalance || 0
        ),
        updatedAt: new Date().toISOString()
      });

      await load();
      alert('Balance actualizado.');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('No fue posible actualizar el balance.');
    }
  };

  const backup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      categories,
      movements
    };

    const blob = new Blob(
      [JSON.stringify(backupData, null, 2)],
      {
        type: 'application/json'
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `LPA-Backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    link.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file) => {
    if (!file) {
      return;
    }

    try {
      const data = JSON.parse(await file.text());

      const confirmed = confirm(
        'Esto reemplazará los datos actuales. ¿Continuar?'
      );

      if (!confirmed) {
        return;
      }

      for (const store of [
        'movements',
        'categories',
        'settings'
      ]) {
        await db.clear(store);
      }

      for (const movement of data.movements || []) {
        await db.put('movements', movement);
      }

      for (const category of data.categories || []) {
        await db.put('categories', category);
      }

      await db.put('settings', {
        ...(data.settings || {}),
        id: 'general',
        updatedAt: new Date().toISOString()
      });

      await load();
      alert('Respaldo restaurado.');
    } catch (error) {
      console.error('Error al restaurar respaldo:', error);
      alert('El archivo no es un respaldo válido.');
    }
  };

  if (loading) {
    return (
      <div className="splash">
        <img
          src={`${import.meta.env.BASE_URL}logo-lpa.png`}
          alt="LPA"
        />

        <div className="loader" />
      </div>
    );
  }

  const content = {
    dashboard: (
      <Home
        totals={totals}
        movements={movements}
        onNewMovement={openNewMovement}
        goCashflow={() => setTab('cashflow')}
        goProjections={() => setTab('projections')}
      />
    ),

    cashflow: (
      <Dashboard
        movements={movements}
        settings={settings}
        totals={totals}
        onNewMovement={openNewMovement}
        goHistory={() => setTab('history')}
      />
    ),

    movements: (
      <Movements
        categories={categories}
        initialType={initialType}
        editing={editing}
        onSave={saveMovement}
        onCancelEdit={() => {
          setEditing(null);
          setTab('history');
        }}
      />
    ),

    history: (
      <History
        movements={movements}
        onEdit={editMovement}
        onDelete={deleteMovement}
      />
    ),

    projections: (
      <div className="page">
        <div className="page-title">
          <p className="eyebrow">Planeación financiera</p>
          <h1>Proyecciones</h1>
          <p>
            Próximamente podrás gestionar ingresos y egresos
            proyectados.
          </p>
        </div>

        <section className="panel empty-state">
          <CalendarClock size={48} />

          <h2>Módulo en construcción</h2>

          <p>
            Aquí agregaremos el flujo proyectado, las fechas de
            pago, el semáforo de vencimientos y la conversión a
            movimientos reales.
          </p>
        </section>
      </div>
    ),

    stats: (
      <Stats movements={movements} />
    ),

    settings: (
      <Settings
        settings={settings}
        categories={categories}
        onSaveSettings={saveSettings}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onBackup={backup}
        onRestore={restore}
      />
    )
  }[tab];

  return (
    <Layout
      activeTab={tab}
      setActiveTab={(newTab) => {
        setEditing(null);
        setTab(newTab);
      }}
    >
      {content}
    </Layout>
  );
}
