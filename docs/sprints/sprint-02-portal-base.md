# Sprint 2 – Portal Base + Mi Información

**Fecha:** 2026-02-27
**Estado:** ✅ Completado

---

## Objetivo

Permitir que un empleado:
1. Se auto-registre usando su cédula (flujo de 3 pasos)
2. Inicie sesión y aterrice en el Portal de Empleados
3. Consulte y edite sus datos personales

---

## Archivos Creados

### `src/features/portal-empleado/services/portalEmpleadoService.js`
Funciones de servicio para el portal:
- `verificarCedula(cedula)` → llama Edge Function `employee-register` con `action: "verificar_cedula"`
- `crearCuentaEmpleado(cedula, email, password)` → llama Edge Function con `action: "crear_cuenta"`
- `getEmpleadoByAuthUser()` → busca empleado por `auth_user_id = auth.uid()` con joins a `empleados_talento_humano` y `empleados_sst`
- `updateDatosPersonales(empleadoId, datos)` → actualiza solo `correo`, `telefono`, `direccion`
- `getResumenPortal(empleadoId)` → contadores para tarjetas de resumen del dashboard

### `src/features/portal-empleado/hooks/useEmpleadoPerfil.js`
Hooks React Query:
- `useEmpleadoPerfil()` → carga perfil del empleado autenticado (`staleTime: 5 min`)
- `useUpdateDatosPersonales()` → mutation con invalidación de cache
- `useResumenPortal(empleadoId)` → contadores para tarjetas del dashboard

### `src/features/portal-empleado/components/PortalEmpleadoDashboard.jsx`
Pantalla principal del portal con:
- Topbar sticky: logo Healthy SC, nombre + cargo del empleado, botón Cerrar Sesión
- Navegación por tabs: Mi Información | Desprendibles | Vacaciones | Incapacidades | Mis Documentos
- Renderiza el sub-componente activo según tab seleccionada
- Estados: cargando perfil, perfil no encontrado (con instrucción de contactar TH)

### `src/features/portal-empleado/components/MiInformacion.jsx`
Vista/edición de datos personales:
- **Solo lectura:** nombres, apellidos, cédula, cargo, tipo contrato, EPS, AFP, fecha ingreso, estado SST (exámenes, vacunas), estado activo
- **Editable por empleado:** correo, teléfono, dirección
- Maneja `empleados.activo` como texto `'true'`/`'false'` (no booleano)

### `src/features/portal-empleado/components/Desprendibles.jsx`
Placeholder Sprint 3 — "En construcción"

### `src/features/portal-empleado/components/Vacaciones.jsx`
Placeholder Sprint 4 — "En construcción"

### `src/features/portal-empleado/components/Incapacidades.jsx`
Placeholder Sprint 4 — "En construcción"

### `src/features/portal-empleado/components/MisDocumentos.jsx`
Placeholder Sprint 5 — "En construcción"

### `src/features/portal-empleado/index.js`
```js
export { default as PortalEmpleadoDashboard } from "./components/PortalEmpleadoDashboard";
```

### `src/features/auth/components/EmpleadoRegistroScreen.jsx`
Flujo de 3 pasos para auto-registro:
- **Paso 1:** Input cédula → llama `verificarCedula()` → verifica que existe en `empleados` y no tiene cuenta aún
- **Paso 2:** Input email + contraseña (mín. 8 chars) → llama `crearCuentaEmpleado()`
- **Paso 3:** Confirmación con correo de acceso + botón "Ir a mi portal" (auto-login via `signIn()`)
- Props: `{ goToLogin }` — callback para volver al login

---

## Archivos Modificados

### `src/App.jsx`
- Importado `EmpleadoRegistroScreen` desde `@/features/auth`
- `AuthViews` actualizado a 3 estados: `"login"` | `"register_admin"` | `"register_empleado"`
- El rol `usuario` ya no recibe `<Navbar>` + `<main page-container>` — el `PortalEmpleadoDashboard` tiene su propio header

```jsx
// Rol usuario → portal con su propio header
roleName === "usuario" ? (
  <RoleRouter />
) : (
  <>
    <Navbar />
    ...
    <RoleRouter />
  </>
)
```

### `src/features/auth/components/LoginScreen.jsx`
- Agregada prop `goToEmpleadoRegistro`
- Nuevo botón "Soy empleado · Crear mi acceso al portal" (visible solo si el prop está disponible)

### `src/features/auth/index.js`
- Agregado export: `export { default as EmpleadoRegistroScreen } from './components/EmpleadoRegistroScreen'`

---

## Flujo de Navegación

```
Login
 ├─ [Crear cuenta nueva]        → RegisterScreen (admin/staff)
 └─ [Soy empleado · Portal]     → EmpleadoRegistroScreen
      └─ Paso 1: Cédula
      └─ Paso 2: Email + Password
      └─ Paso 3: ¡Listo! → auto-login → PortalEmpleadoDashboard
```

---

## Prueba Manual (devpanel)

1. Abrir devpanel → seleccionar rol `usuario`
2. Verificar que carga `PortalEmpleadoDashboard` (sin navbar principal)
3. Verificar tabs: Mi Información muestra datos del empleado vinculado
4. Editar teléfono → verificar que se guarda (toast de éxito)
5. Verificar que los 4 tabs restantes muestran placeholder "En construcción"

Para probar el registro:
1. Ir a Login → clic en "Soy empleado · Crear mi acceso al portal"
2. Ingresar cédula de empleado existente en BD
3. Completar email + contraseña
4. Verificar redirección automática al portal

---

## Commit Sugerido

```
git commit -m "sprint 2: portal empleado - registro + mi información"
```
