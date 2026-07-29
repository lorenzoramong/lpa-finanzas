import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { todayISO } from '../lib/format';

const initialForm = { type:'income', date:todayISO(), amount:'', category:'', subcategory:'', description:'', notes:'' };

export default function Movements({ categories, initialType, editing, onSave, onCancelEdit }) {
  const [form, setForm] = useState(initialForm);
  useEffect(() => {
    if (editing) setForm({ ...editing, amount: String(editing.amount) });
    else setForm((f) => ({ ...initialForm, type: initialType || f.type }));
  }, [editing, initialType]);

  const selected = categories.find(c => c.name === form.category);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.category || Number(form.amount) <= 0) return alert('Completa descripción, categoría y un valor mayor a cero.');
    await onSave({ ...form, amount:Number(form.amount) });
    setForm({ ...initialForm, type:form.type });
  };
  return (
    <div className="page narrow-page">
      <div className="page-title"><p className="eyebrow">Registro diario</p><h1>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h1><p>Registra ingresos y egresos en pocos segundos.</p></div>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={form.type==='income'?'selected income':''} onClick={()=>setForm({...form,type:'income'})}>Ingreso</button>
          <button type="button" className={form.type==='expense'?'selected expense':''} onClick={()=>setForm({...form,type:'expense'})}>Egreso</button>
        </div>
        <div className="form-grid">
          <label>Fecha<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label>Valor<input inputMode="numeric" type="number" min="1" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
          <label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value,subcategory:''})}><option value="">Seleccionar</option>{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></label>
          <label>Subcategoría<select value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})}><option value="">Sin subcategoría</option>{selected?.subcategories?.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="full">Descripción<input placeholder="Ej. Alquiler de cancha" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label className="full">Observaciones<textarea rows="3" placeholder="Opcional" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        </div>
        <div className="form-actions"><button className="primary-btn" type="submit"><Save size={18}/>{editing?'Guardar cambios':'Guardar movimiento'}</button>{editing&&<button type="button" className="ghost-btn" onClick={onCancelEdit}>Cancelar</button>}</div>
      </form>
    </div>
  );
}
