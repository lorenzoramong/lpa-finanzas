# Modelo de Datos — Firebase (LPA Finanzas)

## 1) Servicios Firebase
- Firebase Auth: autenticación (email/password o Google)
- Firestore: movimientos y auditoría
- Firebase Storage: soportes (imágenes)

---

## 2) Firestore — Colecciones

### 2.1 movements (colección)
Documento: movements/{record_id}

Campos sugeridos:
- record_id: string (UUID)
- type: "income" | "expense"
- date: timestamp (fecha del movimiento)
- amount: number
- category: "Torneos" | "Academia" | "Eventos (No Torneo)" | "Impuestos" | "Otros"
- subcategory: string
- payment_method: string
- third_party: string
- description: string
- tags: array<string>
- support:
  - has_support: boolean
  - storage_path: string (ej. supports/{record_id}/archivo.png)
  - download_url: string (opcional, si se guarda)
  - file_name: string
  - content_type: string

Auditoría dentro del movimiento:
- created_at: timestamp
- created_by:
  - uid: string
  - email: string
- updated_at: timestamp | null
- updated_by:
  - uid: string
  - email: string
- deleted_at: timestamp | null
- deleted_by:
  - uid: string
  - email: string
- is_deleted: boolean

Notas:
- Eliminación será soft delete: is_deleted=true y deleted_at/deleted_by.
- El consolidado NO debe contar is_deleted=true.

---

### 2.2 audit_logs (colección)
Documento: audit_logs/{event_id}

Campos sugeridos:
- event_id: string (UUID)
- event_type: "CREATE_MOVEMENT" | "UPDATE_MOVEMENT" | "DELETE_MOVEMENT"
- record_id: string (referencia a movements)
- actor:
  - uid: string
  - email: string
- created_at: timestamp
- before: object | null
- after: object | null
- metadata:
  - user_agent: string (opcional)
  - ip: string (opcional si se captura por backend; normalmente no en frontend)
  - notes: string (opcional)

---

## 3) Storage — Rutas
- supports/{record_id}/{filename}

Reglas:
- Solo imágenes: jpg, jpeg, png.
- Tamaño máximo recomendado: 5 MB (configurable).

---

## 4) Seguridad (alto nivel)
- Solo usuarios autenticados.
- Todos pueden leer y escribir (sin roles).
- Se recomienda validar:
  - required fields
  - tamaño de imagen
  - content_type permitido

---

## 5) Índices y consultas
Consultas típicas:
- movements por rango de fecha (date)
- movements por type y date
- movements por category y date
- búsqueda por third_party (en UI; Firestore requiere estrategia específica si se quiere full-text)

Nota:
- Para búsquedas tipo “contains” se hará filtrado en frontend (con paginación) o se definirá estrategia más adelante.
