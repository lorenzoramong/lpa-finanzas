# LPA Finanzas

Aplicación PWA para llevar el flujo de caja de la Liga de Padel del Atlántico.

## Funciones
- Balance inicial editable.
- Registro de ingresos y egresos.
- Categorías y subcategorías ilimitadas.
- Historial con búsqueda, edición y eliminación.
- Exportación a Excel.
- Estadísticas por año y mes.
- Respaldo y restauración JSON.
- Datos almacenados localmente en IndexedDB.
- Instalación en Android y iPhone como PWA.

## Publicación en GitHub Pages
1. Crea un repositorio vacío en GitHub.
2. Sube todo el contenido de esta carpeta conservando la estructura.
3. En `Settings > Pages`, selecciona `GitHub Actions`.
4. Abre `Actions` y espera que `Publicar LPA Finanzas` finalice en verde.
5. La URL aparecerá en `Settings > Pages`.

## Estructura crítica
El workflow debe quedar exactamente en:

`.github/workflows/deploy.yml`

## Desarrollo local
```bash
npm install
npm run dev
```
