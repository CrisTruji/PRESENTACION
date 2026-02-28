# Sprint 4 – Vacaciones + Incapacidades

**Fecha:** 2026-02-27
**Estado:** ✅ Completado

---

## Objetivo

- Empleado puede solicitar vacaciones y ver su saldo de días
- Empleado puede reportar incapacidades y adjuntar PDF
- Nómina puede aprobar/rechazar solicitudes (desde PanelNomina – Sprint 3)

---

## Archivos Creados

### `src/features/portal-empleado/services/vacacionesService.js`
- `calcularDiasDisponibles(empleadoId)` → calcula días causados (1.25/mes desde ingreso) menos días tomados (aprobado/disfrutado/en_curso/programado). Retorna `{ diasCausados, diasTomados, diasDisponibles }`
- `getVacacionesByEmpleado(empleadoId)` → historial del empleado
- `crearSolicitudVacaciones(empleadoId, datos)` → inserta en `empleado_vacaciones` con estado `pendiente`
- `calcularDiasCalendario(inicio, fin)` → utilidad pura (días calendario inclusive)

### `src/features/portal-empleado/services/incapacidadesService.js`
- `getIncapacidadesByEmpleado(empleadoId)` → historial
- `reportarIncapacidad(empleadoId, datos, archivo)` → sube PDF a bucket `incapacidades-docs` + inserta en `empleado_incapacidades`
- `getIncapacidadDocUrl(archivoPath)` → URL firmada (1h) para descargar el documento

### `src/features/portal-empleado/hooks/useVacaciones.js`
- `useVacaciones(empleadoId)` → historial
- `useDiasDisponibles(empleadoId)` → saldo de días (staleTime 10 min)
- `useCrearSolicitudVacaciones(empleadoId)` → mutation con invalidación de cache

### `src/features/portal-empleado/hooks/useIncapacidades.js`
- `useIncapacidades(empleadoId)` → historial
- `useReportarIncapacidad(empleadoId)` → mutation (sube archivo + registra)
- `useIncapacidadDocUrl()` → mutation para generar URL y abrir en nueva pestaña

---

## Archivos Modificados (placeholders reemplazados)

### `src/features/portal-empleado/components/Vacaciones.jsx`
Implementación completa:
- **3 tarjetas**: días disponibles / días disfrutados / días causados
- **Barra de progreso**: % utilizado del saldo causado
- **Formulario de solicitud** (se abre inline):
  - Tipo: Ordinarias / Compensatorias
  - Fechas: mínimo 15 días de anticipación desde hoy
  - Auto-cálculo de días calendario (se muestra con validación en color)
  - Reglas: máx 30 días, saldo suficiente
  - Observaciones opcional
- **Historial** con pills de estado (colores por estado)
- Muestra motivo de rechazo si `estado = "rechazado"`

### `src/features/portal-empleado/components/Incapacidades.jsx`
Implementación completa:
- **Formulario de reporte** (inline):
  - Tipos: enfermedad_general / accidente_laboral / accidente_transito / maternidad_paternidad
  - Fechas inicio y fin
  - Diagnóstico, entidad emisora, número de radicado (opcionales)
  - Zona drag & drop PDF (máx 10MB, solo PDF) con vista previa del archivo
  - Observaciones opcional
- **Historial** con pills de estado
- Botón descargar documento si `archivo_path` está disponible

---

## Columnas de BD utilizadas

**`empleado_vacaciones`:**
- `tipo`, `fecha_inicio`, `fecha_fin`, `dias_solicitados`, `anio`, `estado`, `observaciones`
- `aprobado_por`, `motivo_rechazo` (gestionados desde PanelNomina)

**`empleado_incapacidades`:**
- `tipo`, `fecha_inicio`, `fecha_fin`, `dias_incapacidad`, `diagnostico`, `entidad_emisora`, `numero_radicado`, `observaciones`, `archivo_path`, `estado`

---

## Fórmula de vacaciones (Colombia)

```
Días causados = Math.floor(meses_trabajados × 1.25)
Días tomados = SUM(dias_solicitados) WHERE estado IN ('aprobado', 'disfrutado', 'en_curso', 'programado')
Días disponibles = max(0, causados - tomados)
```

---

## Prueba Manual

**Vacaciones (rol: usuario):**
1. Tab "Vacaciones" → verificar saldo (0 si empleado recién creado)
2. "Solicitar" → completar fechas con >15 días de anticipación → enviar
3. Verificar solicitud aparece en historial con estado "Pendiente"
4. En PanelNomina (rol: nomina) → Sección Vacaciones → aprobar → verificar estado cambia

**Incapacidades (rol: usuario):**
1. Tab "Incapacidades" → "Reportar"
2. Completar fechas y datos → adjuntar PDF de prueba
3. Verificar que aparece en historial con estado "Pendiente"
4. Si tiene PDF → botón "Doc" → debe abrir URL firmada en nueva pestaña

---

## Commit Sugerido

```
git commit -m "sprint 4: vacaciones e incapacidades - empleado + aprobación nómina"
```
