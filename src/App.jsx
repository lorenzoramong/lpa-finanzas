import { useEffect, useMemo, useState } from 'react';

import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import History from './pages/History';
import Projections from './pages/Projections';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

import { db, seedDatabase } from './lib/db';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projections, setProjections] = useState([]);

  const [settings, setSettings] = useState({
    initialBalance: 0,
    projectionTrafficLight: {
      yellowDays: 15,
      redDays: 0
    }
  });

  const [initialType, setInitialType] = useState('income');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      await seedDatabase();

      const [
        movementData,
        categoryData,
        projectionData,
        settingsData
      ] = await Promise.all([
        db.getAll('movements'),
        db.getAll('categories'),
        db.getAll('projections'),
        db.get('settings', 'general')
      ]);

      setMovements(movementData || []);
      setCategories(categoryData || []);
      setProjections(projectionData || []);

      setSettings(
        settingsData || {
          initialBalance: 0,
          projectionTrafficLight: {
            yellowDays: 15,
            redDays: 0
          }
        }
      );
    } catch (error) {
      console.error('Error al cargar la aplicación:', error);
      alert('No fue posible cargar la información.');
    } finally {
      setLoading(false);
    }
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

  const projectionTotals = useMemo(() => {
    const pendingProjections = projections.filter(
      (projection) => projection.status !== 'completed'
    );

    const projectedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const projectedExpenses = pendingProjections
      .filter((projection) => projection.type === 'expense')
      .reduce(
        (total, projection) =>
          total + Number(projection.amount || 0),
        0
      );

    const weightedIncome = pendingProjections
      .filter((projection) => projection.type === 'income')
      .reduce(
        (total, projection) =>
          total +
          Number(projection.amount || 0) *
            (Number(projection.probability || 0) / 100),
        0
      );

    return {
      projectedIncome,
      projectedExpenses,
      projectedUtility:
        projectedIncome - projectedExpenses,
      weightedIncome,
      projectedBalance:
        totals.balance +
        weightedIncome -
        projectedExpenses
    };
  }, [projections, totals.balance]);

  const projectionStatusSummary = useMemo(() => {
    const yellowDays =
      settings?.projectionTrafficLight?.yellowDays ?? 15;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      onTime: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
      pendingIncomeCount: 0,
      pendingExpenseCount: 0
    };

    projections.forEach((projection) => {
      if (projection.status === 'completed') {
        summary.completed += 1;
        return;
      }

      if (projection.type === 'income') {
        summary.pendingIncomeCount += 1;
      }

      if (projection.type === 'expense') {
        summary.pendingExpenseCount += 1;
      }

      if (!projection.dueDate) {
        summary.onTime += 1;
        return;
      }

      const dueDate = new Date(
        `${projection.dueDate}T00:00:00`
      );

      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) / 86400000
      );

      if (daysRemaining < 0) {
        summary.overdue += 1;
      } else if (daysRemaining <= yellowDays) {
        summary.upcoming += 1;
      } else {
        summary.onTime += 1;
      }
    });

    return summary;
  }, [projections, settings]);

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

  const saveProjection = async (projection) => {
    try {
      const existingProjection = projection.id
        ? projections.find(
            (item) => item.id === projection.id
          )
        : null;

      const item = {
        ...projection,
        id: projection.id || crypto.randomUUID(),
        amount: Number(projection.amount || 0),
        probability: Number(
          projection.probability ?? 100
        ),
        status:
          projection.status ||
          existingProjection?.status ||
          'pending',
        completedAt:
          projection.completedAt ??
          existingProjection?.completedAt ??
          null,
        createdAt:
          projection.createdAt ||
          existingProjection?.createdAt ||
          new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.put('projections', item);
      await load();
    } catch (error) {
      console.error('Error al guardar proyección:', error);
      alert('No fue posible guardar la proyección.');
    }
  };

  const deleteProjection = async (id) => {
    const confirmed = confirm(
      '¿Eliminar esta proyección? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await db.delete('projections', id);
      await load();
    } catch (error) {
      console.error('Error al eliminar proyección:', error);
      alert('No fue posible eliminar la proyección.');
    }
  };

  const completeProjection = async (projection) => {
    const isIncome = projection.type === 'income';
    const completedLabel = isIncome ? 'recibido' : 'pagado';

    const confirmed = confirm(
      `¿Confirmas que este ${
        isIncome ? 'ingreso' : 'egreso'
      } ya fue ${completedLabel}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const completedAt = new Date().toISOString();

      await db.put('projections', {
        ...projection,
        status: 'completed',
        completedAt,
        updatedAt: completedAt
      });

      const registerAsMovement = confirm(
        `La proyección fue marcada como ${completedLabel}.\n\n¿Deseas registrarla también como movimiento real en el flujo de caja?`
      );

      if (registerAsMovement) {
        let projectionCategory = categories.find(
          (category) =>
            category.name?.trim().toLowerCase() ===
            'proyecciones'
        );

        if (!projectionCategory) {
          projectionCategory = {
            id: crypto.randomUUID(),
            name: 'Proyecciones',
            color: '#172A46',
            subcategories: [
              'Ingreso proyectado',
              'Egreso proyectado'
            ],
            createdAt: completedAt,
            updatedAt: completedAt
          };

          await db.put(
            'categories',
            projectionCategory
          );
        }

        await db.put('movements', {
          id: crypto.randomUUID(),
          type: projection.type,
          date: completedAt.slice(0, 10),
          amount: Number(projection.amount || 0),
          category: projectionCategory.name,
          subcategory: isIncome
            ? 'Ingreso proyectado'
            : 'Egreso proyectado',
          description: projection.description,
          notes: [
            projection.notes,
            `Creado desde la proyección ${projection.id}.`
          ]
            .filter(Boolean)
            .join(' '),
          projectionId: projection.id,
          createdAt: completedAt,
          updatedAt: completedAt
        });
      }

      await load();

      alert(
        registerAsMovement
          ? 'La proyección se completó y el movimiento real fue creado.'
          : 'La proyección fue completada.'
      );
    } catch (error) {
      console.error(
        'Error al completar proyección:',
        error
      );

      alert('No fue posible completar la proyección.');
    }
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
        projectionTrafficLight:
          newSettings.projectionTrafficLight ||
          settings.projectionTrafficLight || {
            yellowDays: 15,
            redDays: 0
          },
        updatedAt: new Date().toISOString()
      });

      await load();
      alert('Configuración actualizada.');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('No fue posible actualizar la configuración.');
    }
  };

  const backup = () => {
    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      categories,
      movements,
      projections
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
        'settings',
        'projections'
      ]) {
        await db.clear(store);
      }

      for (const movement of data.movements || []) {
        await db.put('movements', movement);
      }

      for (const category of data.categories || []) {
        await db.put('categories', category);
      }

      for (const projection of data.projections || []) {
        await db.put('projections', projection);
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
        projectionTotals={projectionTotals}
        projectionStatusSummary={projectionStatusSummary}
        projections={projections}
        onNewMovement={openNewMovement}
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
      <Projections
        projections={projections}
        settings={settings}
        onSave={saveProjection}
        onDelete={deleteProjection}
        onComplete={completeProjection}
      />
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
