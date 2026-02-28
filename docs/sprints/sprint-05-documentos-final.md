# Sprint 5 – Mis Documentos + Integración Final

**Fecha:** 2026-02-27
**Estado:** ✅ Completado

---

## Objetivo

- Empleado puede ver y descargar sus documentos de expediente por categoría
- Permisos consolidados para los nuevos roles
- Portal de empleados completamente funcional end-to-end

---

## Archivos Modificados

### `src/features/portal-empleado/components/MisDocumentos.jsx`
Reemplazado placeholder por implementación completa:
- **Sidebar de categorías**: agrupa documentos por `area` (Personales, Laborales, SST, Dotación)
- **Lista de documentos**: por área activa, con nombre amigable (usa `nombre_archivo` array)
- **Ver/Descargar**: enlace directo al `archivo_path` (URL pública del bucket `empleado-documentos`)
- **Solo lectura**: el empleado no puede subir ni eliminar documentos (eso es desde el admin panel)
- Reutiliza `getEmpleadoDocumentos(empleadoId)` de `features/employees/services/empleadosService.js:379`
- Usa `@tanstack/react-query` con `useQuery` para caching

### `src/features/auth/lib/permissions.js`
Agregados permisos:
```js
ver_portal_empleado:    ["usuario"],
gestionar_desprendibles: ["nomina", "administrador"],
aprobar_vacaciones:     ["nomina", "administrador"],
ver_incapacidades_admin: ["nomina", "administrador"],
```

---

## Resumen completo del Portal

### Flujo de registro de empleado
```
LoginScreen
  └─ [Soy empleado · Crear mi acceso al portal]
       └─ EmpleadoRegistroScreen
            ├─ Paso 1: Cédula → Edge Function verifica en tabla empleados
            ├─ Paso 2: Email + Contraseña → Edge Function crea cuenta Auth con role=usuario
            └─ Paso 3: ¡Listo! → auto-login → PortalEmpleadoDashboard
```

### Pantallas del portal (rol: usuario)
| Tab | Componente | Estado |
|---|---|---|
| Mi Información | MiInformacion.jsx | ✅ Ver + editar correo/tel/dirección |
| Desprendibles | Desprendibles.jsx | ✅ Lista + descarga con URL firmada |
| Vacaciones | Vacaciones.jsx | ✅ Saldo + solicitud + historial |
| Incapacidades | Incapacidades.jsx | ✅ Reporte con PDF + historial |
| Mis Documentos | MisDocumentos.jsx | ✅ Ver por categoría + descarga |

### Panel de Nómina (rol: nomina)
| Sección | Estado |
|---|---|
| Subir desprendibles (drag & drop) | ✅ |
| Estado de empleados por período | ✅ |
| Aprobar/rechazar vacaciones | ✅ |

---

## Infraestructura creada en este proyecto

### Tablas Supabase
- `empleado_desprendibles` (NUEVA) — constraint único (empleado_id, periodo)
- `empleado_vacaciones` (MODIFICADA) — columnas tipo, aprobado_por, motivo_rechazo, dias_solicitados
- `empleado_incapacidades` (MODIFICADA) — columna estado
- `empleados` (MODIFICADA) — columna auth_user_id

### Buckets Storage
- `desprendibles-nomina` (privado) — PDFs de desprendibles
- `incapacidades-docs` (privado) — PDFs de incapacidades

### Edge Function
- `employee-register` — verifica cédula y crea cuenta Auth

---

## Estructura de archivos creados

```
src/features/portal-empleado/
├── components/
│   ├── PortalEmpleadoDashboard.jsx   ✅
│   ├── MiInformacion.jsx              ✅
│   ├── Desprendibles.jsx              ✅
│   ├── Vacaciones.jsx                 ✅
│   ├── Incapacidades.jsx              ✅
│   └── MisDocumentos.jsx              ✅
├── hooks/
│   ├── useEmpleadoPerfil.js           ✅
│   ├── useDesprendibles.js            ✅
│   ├── useVacaciones.js               ✅
│   └── useIncapacidades.js            ✅
├── services/
│   ├── portalEmpleadoService.js       ✅
│   ├── desprendiblesService.js        ✅
│   ├── vacacionesService.js           ✅
│   └── incapacidadesService.js        ✅
└── index.js                           ✅

src/features/nomina/
├── components/PanelNomina.jsx         ✅
└── index.js                           ✅

src/features/auth/components/
└── EmpleadoRegistroScreen.jsx         ✅

docs/sprints/
├── sprint-01-base-datos.md            ✅
├── sprint-02-portal-base.md           ✅
├── sprint-03-desprendibles.md         ✅
├── sprint-04-vacaciones-incapacidades.md ✅
└── sprint-05-documentos-final.md      ✅
```

---

## Commits Sugeridos por Sprint

```bash
# Sprint 1
git add sql/ supabase/ src/router/rolerouter.jsx src/context/auth.jsx
git commit -m "sprint 1: db migrations + auth empleados + estructura FSD"

# Sprint 2
git add src/App.jsx src/features/auth/ src/features/portal-empleado/ src/features/nomina/ docs/sprints/sprint-02-portal-base.md
git commit -m "sprint 2: portal empleado - registro + mi información"

# Sprint 3
git add src/features/portal-empleado/services/desprendiblesService.js src/features/portal-empleado/hooks/useDesprendibles.js src/features/portal-empleado/components/Desprendibles.jsx src/features/nomina/ docs/sprints/sprint-03-desprendibles.md
git commit -m "sprint 3: desprendibles - upload nomina + descarga empleado"

# Sprint 4
git add src/features/portal-empleado/services/vacacionesService.js src/features/portal-empleado/services/incapacidadesService.js src/features/portal-empleado/hooks/ src/features/portal-empleado/components/Vacaciones.jsx src/features/portal-empleado/components/Incapacidades.jsx docs/sprints/sprint-04-vacaciones-incapacidades.md
git commit -m "sprint 4: vacaciones e incapacidades - empleado + aprobacion nomina"

# Sprint 5
git add src/features/portal-empleado/components/MisDocumentos.jsx src/features/auth/lib/permissions.js docs/sprints/sprint-05-documentos-final.md
git commit -m "sprint 5: portal empleado completo - documentos + integracion final"
```
