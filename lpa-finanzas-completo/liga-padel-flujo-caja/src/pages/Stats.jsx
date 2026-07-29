import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import SummaryCards from '../components/SummaryCards';
import { formatCurrency } from '../lib/format';

export default function Stats({ movements }) {
  const years=[...new Set(movements.map(m=>m.date.slice(0,4)))].sort().reverse();
  const [year,setYear]=useState('all'); const [month,setMonth]=useState('all');
  const filtered=useMemo(()=>movements.filter(m=>(year==='all'||m.date.startsWith(year))&&(month==='all'||m.date.slice(5,7)===month)),[movements,year,month]);
  const income=filtered.filter(m=>m.type==='income').reduce((s,m)=>s+m.amount,0); const expenses=filtered.filter(m=>m.type==='expense').reduce((s,m)=>s+m.amount,0);
  const pie=[{name:'Ingresos',value:income,color:'#198754'},{name:'Egresos',value:expenses,color:'#D64545'}].filter(x=>x.value>0);
  const grouped={}; filtered.forEach(m=>{const key=m.category||'Sin categoría';grouped[key]=(grouped[key]||0)+(m.type==='income'?m.amount:-m.amount)}); const bars=Object.entries(grouped).map(([name,value])=>({name,value:Math.abs(value)})).sort((a,b)=>b.value-a.value).slice(0,8);
  return <div className="page"><div className="page-title row-title"><div><p className="eyebrow">Análisis financiero</p><h1>Estadísticas</h1></div><div className="date-filters"><select value={year} onChange={e=>setYear(e.target.value)}><option value="all">Todos los años</option>{years.map(y=><option key={y}>{y}</option>)}</select><select value={month} onChange={e=>setMonth(e.target.value)}><option value="all">Todos los meses</option>{Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map((m,i)=><option value={m} key={m}>{new Date(2026,i).toLocaleString('es-CO',{month:'long'})}</option>)}</select></div></div>
  <SummaryCards compact income={income} expenses={expenses} utility={income-expenses}/>
  <div className="charts-grid"><section className="panel chart-card"><h2>Ingresos vs. egresos</h2>{pie.length?<ResponsiveContainer width="100%" height={280}><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>{pie.map(e=><Cell fill={e.color} key={e.name}/>)}</Pie><Tooltip formatter={v=>formatCurrency(v)}/></PieChart></ResponsiveContainer>:<div className="empty-state">No hay datos para este período.</div>}<div className="legend"><span><i className="dot income-dot"/>Ingresos</span><span><i className="dot expense-dot"/>Egresos</span></div></section>
  <section className="panel chart-card"><h2>Movimiento por categoría</h2>{bars.length?<ResponsiveContainer width="100%" height={280}><BarChart data={bars} margin={{left:0,right:10}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tickFormatter={v=>`${Math.round(v/1000)}k`} tick={{fontSize:11}}/><Tooltip formatter={v=>formatCurrency(v)}/><Bar dataKey="value" fill="#172A46" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty-state">No hay datos para este período.</div>}</section></div></div>
}
