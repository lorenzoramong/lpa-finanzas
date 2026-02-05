# Especificación Funcional — LPA Finanzas

## 1) Objetivo
Registrar y consolidar ingresos y egresos de la Liga de Pádel con trazabilidad, filtros, gráficos y exportación a Excel.

---

## 2) Categorías oficiales
- C1: Torneos
- C2: Academia
- C3: Eventos (No Torneo)
- C4: Impuestos
- C5: Otros

**Subcategoría:** texto libre (por ahora).

---

## 3) Entidad principal: Movimiento
### Campos del movimiento (usuario)
- Tipo: Ingreso | Egreso (obligatorio)
- Fecha del movimiento (obligatorio)
- Valor (obligatorio, > 0)
- Categoría (obligatorio)
- Subcategoría (texto libre)
- Medio de pago (obligatorio)
- Tercero (obligatorio)
- Descripción (opcional)
- Etiquetas (opcional, lista de texto)
- Soporte (opcional pero recomendado): imagen JPG/PNG

### Campos de auditoría (automáticos)
- record_id (UUID)
- created_at (timestamp)
- created_by (uid + email)
- updated_at (timestamp, si aplica)
- updated_by (uid + email, si aplica)
- deleted_at (timestamp, si aplica)
- deleted_by (uid + email, si aplica)
- is_deleted (boolean)

---

## 4) Módulo: Registro
### Acciones
- Crear movimiento
- Editar movimiento
- Eliminar movimiento (soft delete)
- Ver soporte (modal/preview)

### Reglas y validaciones
- Valor > 0
- Categoría obligatoria
- Tipo obligatorio
- Fecha obligatoria
- Tercero obligatorio
- Medio de pago obligatorio

### Alerta de duplicados (antes de guardar)
Detectar “posible duplicado” si coincide:
- Tipo
- Valor
- Tercero
- Fecha del movimiento
y existe un registro creado en los últimos 5 minutos.

Acción:
- Mostrar alerta con opción: "Revisar" o "Guardar de todos modos".

---

## 5) Módulo: Consolidado
### Filtros globales
- Rango de fechas (presets: Mes actual, Año actual, Personalizado)
- Tipo (Ingreso/Egreso/Ambos)
- Categoría
- Subcategoría (texto)
- Medio de pago
- Tercero (texto)
- Etiquetas (multi)

### KPIs
- Total ingresos
- Total egresos
- Utilidad (Ingresos - Egresos)
- # movimientos (opcional)

### Gráficos (pie)
1) Ingresos vs Egresos
2) Ingresos por categoría (o por subcategoría cuando aplique)
3) Egresos por categoría (o por subcategoría cuando aplique)

### Tabla consolidada
- Lista completa con búsqueda y paginación
- Acciones: editar / eliminar / ver soporte

---

## 6) Exportación
- Exportar Excel (.xlsx)
  - Hoja 1: Movimientos (detalle)
  - Hoja 2: Resumen (por tipo, por categoría, por mes)

No se exporta PDF.

---

## 7) Autenticación y sesión
- Login mediante Firebase Auth.
- Sin roles: todos los usuarios autenticados pueden ver y hacer todo.
- Auto logout por inactividad: 5 minutos.
  - Inactividad = sin mouse/teclado/scroll/touch.

---

## 8) Auditoría (datalake)
Cada acción genera un evento en un registro de auditoría:
- CREATE_MOVEMENT
- UPDATE_MOVEMENT
- DELETE_MOVEMENT

Cada evento guarda:
- quién (uid/email)
- cuándo (timestamp)
- record_id
- snapshot (antes/después)

