import { useMemo, useState } from 'react';
import { Download, Pencil, Search, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from '../lib/format';

export default function History({ movements, onEdit, onDelete }) {
  const [query,setQuery]=useState(''); const [type,setType]=useState('all');
  const filtered=useMemo(()=>movements.filter(m=>{
    const hay=`${m.description} ${m.category} ${m.subcategory} ${m.notes}`.toLowerCase();
    return hay.includes(query.toLowerCase()) && (type==='all'||m.type===type);
  }).sort((a,b)=>b.date.localeCompare(a.date)),[movements,query,type]);
  const exportExcel=()=>{
    const rows=filtered.map(m=>({Fecha:m.date,Tipo:m.type==='income'?'Ingreso':'Egreso',Categoría:m.category,Subcategoría:m.subcategory||'',Descripción:m.description,Observaciones:m.notes||'',Valor:m.amount}));
    const ws=XLSX.utils.json_to_sheet(rows); ws['!cols']=[{wch:12},{wch:12},{wch:20},{wch:20},{wch:35},{wch:35},{wch:16}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Movimientos'); XLSX.writeFile(wb,`LPA-Movimientos-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  return <div className="page">
    <div className="page-title row-title"><div><p className="eyebrow">Consulta y respaldo</p><h1>Historial</h1></div><button className="primary-btn" onClick={exportExcel}><Download size={18}/>Exportar Excel</button></div>
    <section className="panel filters"><div className="search-box"><Search size={18}/><input placeholder="Buscar movimientos" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={type} onChange={e=>setType(e.target.value)}><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Egresos</option></select></section>
    <section className="panel history-list">{!filtered.length&&<div className="empty-state">No hay movimientos para mostrar.</div>}{filtered.map(m=><article className="history-card" key={m.id}><div><span className={`type-pill ${m.type}`}>{m.type==='income'?'Ingreso':'Egreso'}</span><h3>{m.description}</h3><p>{m.category} · {m.subcategory||'Sin subcategoría'} · {formatDate(m.date)}</p>{m.notes&&<small>{m.notes}</small>}</div><div className="history-actions"><strong className={m.type==='income'?'positive':'negative'}>{m.type==='income'?'+':'-'}{formatCurrency(m.amount)}</strong><div><button onClick={()=>onEdit(m)} aria-label="Editar"><Pencil size={17}/></button><button onClick={()=>onDelete(m.id)} aria-label="Eliminar"><Trash2 size={17}/></button></div></div></article>)}</section>
  </div>;
}
