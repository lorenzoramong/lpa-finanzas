# UI Guide — LPA Finanzas (Corporativo)

## 1) Principios
- Estética corporativa: limpia, sobria, con jerarquía clara.
- Uso moderado del rojo: solo acciones primarias y estados activos.
- Fondo crema suave + tarjetas blancas para legibilidad.
- Tablas y KPIs con estilo “dashboard”.

---

## 2) Paleta (base)
- Fondo principal (cream): #FFFBEB
- Fondo alterno (cream suave): #FCFAE3
- Primario (rojo LPA): #E9453F
- Texto principal (nav/títulos): #163141
- Card/Blanco: #FFFFFF
- Bordes: #EFE3E5
- Éxito (acciones positivas): #20C45C

Uso:
- Botón primario (Guardar): rojo LPA
- Botón secundario: borde + texto oscuro
- Botón exportar: verde (éxito)
- Tab activo: indicador rojo, texto oscuro

---

## 3) Tipografía
- Inter (preferida)
- Jerarquía:
  - H1: 24–28px, semibold
  - H2: 18–20px, semibold
  - Body: 14–16px, regular
  - Labels: 12–13px, medium

---

## 4) Layout
- Header fijo (alto: 64px):
  - Logo/Nombre: "LPA Finanzas"
  - Tabs: Registro | Consolidado
  - Usuario + Logout
- Contenido centrado, max-width 1200–1280px
- Cards con padding generoso (20–24px)

---

## 5) Componentes
### Cards
- Fondo blanco
- Borde fino (#EFE3E5)
- Sombra muy sutil
- Radio: 16px

### Tablas
- Header gris/rosado muy suave (derivado del borde)
- Filas limpias, hover sutil
- Columna de acciones a la derecha (Editar, Eliminar, Ver soporte)

### Badges / Chips (Etiquetas)
- Fondo crema suave, borde sutil, texto oscuro

### Alertas
- Duplicado: alerta amarilla suave (sin ser chillona), con CTA "Revisar" y "Guardar igual"
- Error: roja suave con texto claro
- Éxito: verde suave

---

## 6) Iconografía
- Íconos simples (editar, eliminar, ver imagen, exportar)
- Evitar exceso de íconos decorativos

---

## 7) Comportamientos
- Modal de soporte: preview imagen + descargar (opcional)
- Confirmación al eliminar: obligatorio
- Auto logout por inactividad: 5 minutos (mensaje previo opcional a 30s)
