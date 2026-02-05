# lpa-finanzas
# LPA – Sistema de Finanzas

Aplicativo interno para el registro, control y análisis de los ingresos y egresos de la Liga de Pádel.

## Objetivo
Centralizar la información financiera de la liga en un solo aplicativo, permitiendo:
- Registrar ingresos y egresos con trazabilidad completa
- Visualizar información consolidada mediante KPIs y gráficos
- Exportar la información a Excel en cualquier momento
- Mantener control de auditoría sobre cada movimiento

## Alcance
- Uso interno (máximo 5 usuarios)
- Autenticación mediante Firebase
- Almacenamiento de información en Firebase
- Sin manejo de cuentas bancarias ni saldos visibles

## Módulos
### Registro
- Creación, edición y eliminación de movimientos financieros
- Categorización y subcategorización libre
- Adjuntar soporte en imagen
- Alerta de posibles duplicados

### Consolidado
- KPIs de ingresos, egresos y utilidad
- Gráficos circulares filtrables
- Tabla consolidada de movimientos
- Exportación a Excel

## Seguridad
- Cierre automático de sesión por inactividad (5 minutos)
- Registro de auditoría por movimiento

## Identidad visual
Interfaz corporativa siguiendo la identidad visual de la Liga de Pádel.
