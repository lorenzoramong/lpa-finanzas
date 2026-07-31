import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X
} from 'lucide-react';

export default function Settings({
  settings,
  categories,
  onSaveSettings,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onBackup,
  onRestore
}) {
  const [balance, setBalance] = useState(settings.initialBalance ?? 0);

  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [color, setColor] = useState('#172A46');

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#172A46');
  const [editingSubcategories, setEditingSubcategories] = useState([]);
  const [newSubcategory, setNewSubcategory] = useState('');

  const fileRef = useRef(null);

  useEffect(() => {
    setBalance(settings.initialBalance ?? 0);
  }, [settings.initialBalance]);

  const createCategory = async () => {
    const categoryName = name.trim();

    if (!categoryName) {
      alert('Escribe el nombre de la categoría.');
      return;
    }

    const duplicatedCategory = categories.some(
      (category) =>
        category.name.trim().toLowerCase() === categoryName.toLowerCase()
    );

    if (duplicatedCategory) {
      alert('Ya existe una categoría con ese nombre.');
      return;
    }

    const subcategories = Array.from(
      new Map(
        sub
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => [item.toLowerCase(), item])
      ).values()
    );

    await onAddCategory({
      name: categoryName,
      color,
      subcategories
    });

    setName('');
    setSub('');
    setColor('#172A46');
  };

  const startEditing = (category) => {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color || '#172A46');
    setEditingSubcategories([...(category.subcategories || [])]);
    setNewSubcategory('');
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setEditingName('');
    setEditingColor('#172A46');
    setEditingSubcategories([]);
    setNewSubcategory('');
  };

  const addSubcategory = () => {
    const value = newSubcategory.trim();

    if (!value) {
      return;
    }

    const alreadyExists = editingSubcategories.some(
      (subcategory) =>
        subcategory.trim().toLowerCase() === value.toLowerCase()
    );

    if (alreadyExists) {
      alert('Esa subcategoría ya existe.');
      return;
    }

    setEditingSubcategories((current) => [...current, value]);
    setNewSubcategory('');
  };

  const updateSubcategoryName = (index, value) => {
    setEditingSubcategories((current) =>
      current.map((subcategory, currentIndex) =>
        currentIndex === index ? value : subcategory
      )
    );
  };

  const removeSubcategory = (index) => {
    setEditingSubcategories((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const saveCategoryChanges = async () => {
    const categoryName = editingName.trim();

    if (!categoryName) {
      alert('La categoría debe tener un nombre.');
      return;
    }

    const duplicatedCategory = categories.some(
      (category) =>
        category.id !== editingCategoryId &&
        category.name.trim().toLowerCase() === categoryName.toLowerCase()
    );

    if (duplicatedCategory) {
      alert('Ya existe otra categoría con ese nombre.');
      return;
    }

    const cleanSubcategories = Array.from(
      new Map(
        editingSubcategories
          .map((subcategory) => subcategory.trim())
          .filter(Boolean)
          .map((subcategory) => [
            subcategory.toLowerCase(),
            subcategory
          ])
      ).values()
    );

    const originalCategory = categories.find(
      (category) => category.id === editingCategoryId
    );

    if (!originalCategory) {
      alert('No fue posible encontrar la categoría.');
      return;
    }

    await onUpdateCategory({
      ...originalCategory,
      name: categoryName,
      color: editingColor,
      subcategories: cleanSubcategories
    });

    cancelEditing();
  };

  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">Personalización</p>
        <h1>Configuración</h1>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <h2>Balance inicial</h2>

          <p className="muted">
            Se configura una sola vez y puedes editarlo cuando sea necesario.
          </p>

          <label>
            Valor inicial
            <input
              type="number"
              inputMode="numeric"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              onSaveSettings({
                ...settings,
                initialBalance: Number(balance)
              })
            }
          >
            <Save size={18} />
            Guardar balance
          </button>
        </section>

        <section className="panel">
          <h2>Nueva categoría</h2>

          <div className="form-grid">
            <label>
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. APC"
              />
            </label>

            <label>
              Color
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>

            <label className="full">
              Subcategorías iniciales
              <input
                value={sub}
                onChange={(event) => setSub(event.target.value)}
                placeholder="Separadas por coma: Cancha, Pelotas"
              />
            </label>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={createCategory}
          >
            <Plus size={18} />
            Crear categoría
          </button>
        </section>

        <section className="panel full-panel">
          <h2>Categorías actuales</h2>

          <div className="category-grid">
            {categories.map((category) => {
              const isEditing = editingCategoryId === category.id;

              return (
                <article className="category-card" key={category.id}>
                  {isEditing ? (
                    <div className="category-editor">
                      <div className="form-grid">
                        <label>
                          Nombre
                          <input
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                          />
                        </label>

                        <label>
                          Color
                          <input
                            type="color"
                            value={editingColor}
                            onChange={(event) =>
                              setEditingColor(event.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="subcategory-editor">
                        <strong>Subcategorías</strong>

                        {!editingSubcategories.length && (
                          <p className="muted">
                            Esta categoría no tiene subcategorías.
                          </p>
                        )}

                        <div className="subcategory-list">
                          {editingSubcategories.map(
                            (subcategory, index) => (
                              <div
                                className="subcategory-edit-row"
                                key={`${category.id}-${index}`}
                              >
                                <input
                                  value={subcategory}
                                  onChange={(event) =>
                                    updateSubcategoryName(
                                      index,
                                      event.target.value
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  className="subcategory-delete-btn"
                                  onClick={() => removeSubcategory(index)}
                                  aria-label={`Eliminar ${subcategory}`}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        <div className="subcategory-add-row">
                          <input
                            value={newSubcategory}
                            onChange={(event) =>
                              setNewSubcategory(event.target.value)
                            }
                            placeholder="Nueva subcategoría"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addSubcategory();
                              }
                            }}
                          />

                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={addSubcategory}
                          >
                            <Plus size={17} />
                            Agregar
                          </button>
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={saveCategoryChanges}
                        >
                          <Check size={18} />
                          Guardar cambios
                        </button>

                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={cancelEditing}
                        >
                          <X size={18} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="category-color"
                        style={{
                          background: category.color || '#172A46'
                        }}
                      />

                      <div>
                        <h3>{category.name}</h3>

                        <p>
                          {category.subcategories?.join(' · ') ||
                            'Sin subcategorías'}
                        </p>
                      </div>

                      <div className="category-actions">
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          aria-label={`Editar ${category.name}`}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteCategory(category.id)}
                          aria-label={`Eliminar ${category.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel full-panel">
          <h2>Respaldo de datos</h2>

          <p className="muted">
            Descarga un respaldo JSON o restaura uno anterior.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={onBackup}
            >
              <Download size={18} />
              Descargar respaldo
            </button>

            <button
              type="button"
              className="ghost-btn"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} />
              Restaurar respaldo
            </button>

            <input
              ref={fileRef}
              hidden
              type="file"
              accept="application/json"
              onChange={(event) =>
                onRestore(event.target.files?.[0])
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
