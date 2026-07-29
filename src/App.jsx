import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot
} from 'firebase/firestore';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import History from './pages/History';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

import { db, seedDatabase } from './lib/db';
import { db as firestore } from './lib/firebase';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    initialBalance: 0,
    organizationName: 'Liga de Padel del Atlántico',
    currency: 'COP'
  });

  const [initialType, setInitialType] = useState('income');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    let unsubscribeMovements;
    let unsubscribeCategories;
    let unsubscribeSettings;
    let active = true;

    async function connectFirestore() {
      try {
        await seedDatabase();

        if (!active) {
          return;
        }

        const loaded = {
          movements: false,
          categories: false,
          settings: false
        };

        const checkLoading = () => {
          if (
            loaded.movements &&
            loaded.categories &&
            loaded.settings
          ) {
            setLoading(false);
          }
        };

        unsubscribeMovements = onSnapshot(
          collection(firestore, 'movements'),
          (snapshot) => {
            const data = snapshot.docs.map((document) => ({
              id: document.id,
              ...document.data()
            }));

            setMovements(data);
            loaded.movements = true;
            checkLoading();
          },
          (error) => {
            console.error('Error al escuchar movimientos:', error);
            setConnectionError(
              'No fue posible sincronizar los movimientos con Firebase.'
            );
            setLoading(false);
          }
        );

        unsubscribeCategories = onSnapshot(
          collection(firestore, 'categories'),
          (snapshot) => {
            const data = snapshot.docs.map((document) => ({
              id: document.id,
              ...document.data()
            }));

            setCategories(data);
            loaded.categories = true;
            checkLoading();
          },
          (error) => {
            console.error('Error al escuchar categorías:', error);
            setConnectionError(
              'No fue posible sincronizar las categorías con Firebase.'
            );
            setLoading(false);
          }
        );

        unsubscribeSettings = onSnapshot(
          doc(firestore, 'settings', 'general'),
          (snapshot) => {
            if (snapshot.exists()) {
              setSettings({
                id: snapshot.id,
                ...snapshot.data()
              });
            }

            loaded.settings = true;
            checkLoading();
          },
          (error) => {
            console.error('Error al escuchar configuración:', error);
            setConnectionError(
              'No fue posible sincronizar la configuración con Firebase.'
            );
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error al conectar Firebase:', error);
        setConnectionError(
          'No fue posible conectar la aplicación con Firebase.'
        );
        setLoading(false);
      }
    }

    connectFirestore();

    return () => {
      active = false;

      if (unsubscribeMovements) {
        unsubscribeMovements();
      }

      if (unsubscribeCategories) {
        unsubscribeCategories();
      }

      if (unsubscribeSettings) {
        unsubscribeSettings();
      }
    };
  }, []);

  const totals = useMemo(() => {
    const income = movements
      .filter((movement) => movement.type === 'income')
      .reduce(
        (total, movement) => total + Number(movement.amount || 0),
        0
      );

    const expenses = movements
      .filter((movement) => movement.type === 'expense')
      .reduce(
        (total, movement) => total + Number(movement.amount || 0),
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
      setTab('dashboard');
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
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert('No fue posible guardar la categoría.');
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
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `LPA-Backup-${new Date().toISOString().slice(0, 10)}.json`;

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

      await Promise.all([
        db.clear('movements'),
        db.clear('categories'),
        db.clear('settings')
      ]);

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

  if (connectionError) {
    return (
      <div className="splash">
        <img
          src={`${import.meta.env.BASE_URL}logo-lpa.png`}
          alt="LPA"
        />

        <p>{connectionError}</p>

        <button onClick={() => window.location.reload()}>
          Intentar nuevamente
        </button>
      </div>
    );
  }

  const content = {
    dashboard: (
      <Dashboard
        movements={movements}
        settings={settings}
        totals={totals}
        onNewMovement={(type) => {
          setEditing(null);
          setInitialType(type);
          setTab('movements');
        }}
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

    stats: (
      <Stats movements={movements} />
    ),

    settings: (
      <Settings
        settings={settings}
        categories={categories}
        onSaveSettings={saveSettings}
        onAddCategory={addCategory}
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
