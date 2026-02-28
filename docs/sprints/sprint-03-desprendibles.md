# Sprint 3 – Desprendibles de Nómina

**Fecha:** 2026-02-27
**Estado:** ✅ Completado

---

## Objetivo

- Personal de nómina sube PDFs de desprendibles por empleado/período
- Empleados descargan sus desprendibles con URLs firmadas (seguras)

---

## Archivos Creados

### `src/features/portal-empleado/services/desprendiblesService.js`

Funciones:
- `getDesprendiblesByEmpleado(empleadoId)` → lista del empleado, orden desc por período
- `descargarDesprendible(id, archivoPath)` → URL firmada 1h + marca `descargado=true` en BD
- `subirDesprendible(file, cedula, periodo, empleadoId, subioPor)` → sube a Storage + upsert en BD
- `getEmpleadosConEstadoDesprendible(periodo)` → empleados activos con estado de desprendible
- `getEstadisticasPeriodo(periodo)` → total/con/sin/porcentaje de cobertura

### `src/features/portal-empleado/hooks/useDesprendibles.js`

Hooks React Query:
- `useDesprendibles(empleadoId)` → lista para vista del empleado
- `useDescargarDesprendible()` → mutation: abre URL firmada en nueva pestaña + invalida cache
- `useEmpleadosConDesprendible(periodo)` → lista para PanelNomina
- `useEstadisticasPeriodo(periodo)` → stats de cobertura
- `useSubirDesprendibles(periodo)` → mutation genérica (utilizada opcionalmente)

---

## Archivos Modificados

### `src/features/portal-empleado/components/Desprendibles.jsx`
Reemplazado placeholder por implementación completa:
- Lista cronológica de desprendibles del empleado
- Badge "Nuevo" para los no descargados
- Botón descargar → genera URL firmada y abre en nueva pestaña
- Estado visual: icono verde = descargado, azul = no descargado
- Conteo de pendientes al pie

### `src/features/nomina/components/PanelNomina.jsx`
Reemplazado placeholder por implementación completa:

**Sección 1 – Subir Desprendibles:**
- Zona drag & drop (también clic para seleccionar)
- Valida que sean PDFs con nombre formato `{cedula}_{YYYY-MM}.pdf`
- Lookup automático del empleado por cédula al procesar archivos
- Lista de archivos con estado: listo / no_encontrado / inválido / subiendo / subido / error
- Subida secuencial con actualización de estado en tiempo real
- Notificaciones de éxito/error al finalizar

**Sección 2 – Estado de Empleados:**
- Tabla completa de empleados activos con estado de desprendible del período
- Buscador por nombre/cédula
- Pills "Subido" (verde) / "Pendiente" (amarillo)

**Sección 3 – Solicitudes de Vacaciones:**
- Lista todas las solicitudes con `estado = 'pendiente'`
- Muestra: empleado, tipo, fechas, días solicitados, observaciones
- Botón Aprobar → actualiza estado + `aprobado_por`
- Botón Rechazar → prompt para motivo + actualiza estado + `motivo_rechazo`

**UI General:**
- Selector de período (input type=month)
- Barra de progreso de cobertura del período
- Estadísticas: N subidos / M pendientes / X% cobertura
- Secciones colapsables (accordion)

---

## Migración Supabase

### `portal_desprendibles_unique_constraint`
```sql
ALTER TABLE empleado_desprendibles
  ADD CONSTRAINT empleado_desprendibles_empleado_periodo_key
  UNIQUE (empleado_id, periodo);
```
Necesario para el `upsert` por `(empleado_id, periodo)`.

---

## Prueba Manual

**Vista empleado (rol: usuario):**
1. Tab "Desprendibles" → debe mostrar lista o mensaje de vacío
2. Al descargar: se abre URL firmada en nueva pestaña, ícono cambia a verde

**Vista nómina (rol: nomina):**
1. Seleccionar período
2. Arrastrar PDF con nombre `{cedula}_{YYYY-MM}.pdf` (ej: `1234567_2026-02.pdf`)
3. Verificar que el empleado es encontrado automáticamente
4. Subir → verificar estado "Subido" en la lista
5. Sección Estado: el empleado debe aparecer con pill verde "Subido"
6. Sección Vacaciones: aprobar/rechazar una solicitud pendiente

---

## Commit Sugerido

```
git commit -m "sprint 3: desprendibles - upload nomina + descarga empleado"
```
