import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import History from './pages/History';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import { db, seedDatabase } from './lib/db';

export default function App(){
  const [tab,setTab]=useState('dashboard'); const [movements,setMovements]=useState([]); const [categories,setCategories]=useState([]); const [settings,setSettings]=useState({initialBalance:0}); const [initialType,setInitialType]=useState('income'); const [editing,setEditing]=useState(null); const [loading,setLoading]=useState(true);
  const load=async()=>{await seedDatabase(); const [m,c,s]=await Promise.all([db.getAll('movements'),db.getAll('categories'),db.get('settings','general')]); setMovements(m);setCategories(c);setSettings(s);setLoading(false)};
  useEffect(()=>{load()},[]);
  const totals=useMemo(()=>{const income=movements.filter(m=>m.type==='income').reduce((a,b)=>a+b.amount,0);const expenses=movements.filter(m=>m.type==='expense').reduce((a,b)=>a+b.amount,0);return{income,expenses,utility:income-expenses,balance:Number(settings.initialBalance||0)+income-expenses}},[movements,settings]);
  const saveMovement=async(data)=>{const item={...data,id:editing?.id||crypto.randomUUID(),createdAt:editing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};await db.put('movements',item);setEditing(null);await load();setTab('dashboard')};
  const deleteMovement=async(id)=>{if(confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')){await db.delete('movements',id);await load()}};
  const editMovement=(m)=>{setEditing(m);setTab('movements')};
  const addCategory=async(c)=>{await db.put('categories',{...c,id:crypto.randomUUID(),createdAt:new Date().toISOString()});await load()};
  const deleteCategory=async(id)=>{if(confirm('¿Eliminar esta categoría? Los movimientos existentes no se borrarán.')){await db.delete('categories',id);await load()}};
  const saveSettings=async(s)=>{await db.put('settings',{...s,id:'general',updatedAt:new Date().toISOString()});await load();alert('Balance actualizado.')};
  const backup=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),settings,categories,movements},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`LPA-Backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
  const restore=async(file)=>{if(!file)return;try{const data=JSON.parse(await file.text());if(!confirm('Esto reemplazará los datos actuales. ¿Continuar?'))return;for(const store of ['movements','categories','settings'])await db.clear(store);for(const m of data.movements||[])await db.put('movements',m);for(const c of data.categories||[])await db.put('categories',c);await db.put('settings',{...(data.settings||{}),id:'general'});await load();alert('Respaldo restaurado.')}catch{alert('El archivo no es un respaldo válido.')}};
  if(loading)return <div className="splash"><img src={`${import.meta.env.BASE_URL}logo-lpa.png`} alt="LPA"/><div className="loader"/></div>;
  const content={dashboard:<Dashboard movements={movements} settings={settings} totals={totals} onNewMovement={(t)=>{setEditing(null);setInitialType(t);setTab('movements')}} goHistory={()=>setTab('history')}/>,movements:<Movements categories={categories} initialType={initialType} editing={editing} onSave={saveMovement} onCancelEdit={()=>{setEditing(null);setTab('history')}}/>,history:<History movements={movements} onEdit={editMovement} onDelete={deleteMovement}/>,stats:<Stats movements={movements}/>,settings:<Settings settings={settings} categories={categories} onSaveSettings={saveSettings} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onBackup={backup} onRestore={restore}/>}[tab];
  return <Layout activeTab={tab} setActiveTab={(t)=>{setEditing(null);setTab(t)}}>{content}</Layout>;
}
