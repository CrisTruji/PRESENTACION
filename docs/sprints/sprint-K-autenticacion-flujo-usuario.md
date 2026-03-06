# Sprint K — Corrección Flujo de Autenticación y Aprobación de Usuarios

**Fecha:** 2026-03-06
**Estado:** Completado

---

## Problema Reportado

Al registrar un nuevo usuario, el administrador **no recibía notificación** de la solicitud y la solicitud no aparecía en el panel admin. Por tanto el admin no podía aprobar al usuario ni asignarle un rol.

---

## Diagnóstico: 4 bugs raíz

### Bug 1 — Sin trigger: no se crea perfil al registrarse
`supabase.auth.signUp()` crea el usuario en `auth.users` pero **no creaba ninguna fila** en `public.profiles`. La query del admin (`estado = 'pendiente'`) devolvía vacío siempre.

### Bug 2 — `signUp()` ignoraba el nombre
`AuthContext.signUp(email, password, nombre)` recibía el nombre pero no lo pasaba a Supabase (`options.data`).

### Bug 3 — `assignRole` no actualizaba `app_metadata`
Al asignar un rol, sólo se actualizaba la tabla `profiles`. El JWT del usuario no cambiaba porque el rol del JWT viene de `app_metadata.role` (via `raw_app_meta_data`). Al refrescar sesión, el usuario seguía sin rol.

### Bug 4 — `AdminRequests.jsx` destructuraba mal el return
`getPendingUsers()` usa `supabaseRequest` que **devuelve el dato directamente** (no `{data, error}`). El código hacía `const { data, error } = await getPendingUsers()` → `data` era siempre `undefined`.

---

## Solución Implementada

### 1. Trigger DB: `handle_new_user` (migración)
```sql
-- Crea automáticamente un profile pendiente al registrar usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER ...
```
- Trigger `on_auth_user_created` en `auth.users` (AFTER INSERT)
- Guarda `id`, `email`, `nombre` (de `raw_user_meta_data`), `estado = 'pendiente'`

### 2. Edge Function: `assign-role`
Nueva Edge Function desplegada en Supabase con `verify_jwt: true`.

**Flujo:**
1. Verifica que el llamador tiene `app_metadata.role = 'administrador'`
2. Llama `adminClient.auth.admin.updateUserById(userId, { app_metadata: { role: roleName } })` → actualiza el JWT
3. Actualiza `profiles.rol` y `profiles.estado = 'activo'`

### 3. `AuthContext.jsx` — dos correcciones
**`signUp()`:** ahora pasa `nombre` en `options.data`:
```js
options: { data: { nombre: nombre || '' } }
```

**`extractRoleFromToken()`:** lee de ambas ubicaciones del JWT:
```js
return payload.app_metadata?.role ?? payload.user_role ?? null;
```
(Compatibilidad con usuarios legacy que tienen rol en `app_metadata` y nuevos que podrían tenerlo via custom claims hook)

### 4. `profilesService.assignRole()` — llama Edge Function
Reemplaza la actualización directa a DB por una llamada HTTP a `/functions/v1/assign-role`:
```js
assignRole(userId, roleId, roleName)
// → POST assign-role con Bearer token del admin
```

### 5. `AdminDashboard.jsx` — pasa `roleName`
`handleAssignRole(userId, roleId)` ahora llama `assignRole(userId, roleId, roleName)`.

### 6. `AdminRequests.jsx` — triple corrección
- Fix return format: `const data = await getPendingUsers()` (en try/catch)
- Carga `getAllRoles()` al montar
- Reemplaza `approveUser(id)` hardcodeado → selector de rol por usuario + llama `assignRole(id, roleId, roleName)`
- Columna "Rol solicitado" → "Asignar Rol" con `<select>`

### 7. Migración de datos existentes (one-time SQL)
- Insertar profiles faltantes para usuarios ya en `auth.users`
- Actualizar `estado = 'activo'` y `rol` para quienes ya tienen `app_metadata.role`

---

## Flujo Correcto Post-Fix

```
1. Usuario se registra → signUp() guarda nombre en user_metadata
2. Trigger handle_new_user → INSERT profiles (estado='pendiente')
3. Admin ve pendiente en AdminDashboard / AdminRequests
4. Admin selecciona rol y aprueba → assignRole(userId, roleId, roleName)
5. Edge Function assign-role:
   a. updateUserById → app_metadata.role = roleName (JWT se actualiza)
   b. profiles → rol = roleId, estado = 'activo'
6. Usuario refresca sesión (WaitingRoleScreen lo hace automáticamente cada 12s)
7. JWT tiene app_metadata.role → AuthContext.extractRoleFromToken lo lee
8. RoleRouter enruta al dashboard correspondiente
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/auth/context/AuthContext.jsx` | signUp pasa nombre; extractRoleFromToken lee app_metadata.role y user_role |
| `src/features/auth/services/profilesService.js` | assignRole llama Edge Function assign-role |
| `src/features/admin/components/AdminDashboard.jsx` | handleAssignRole pasa roleName |
| `src/features/admin/components/AdminRequests.jsx` | Fix return format, carga roles, selector de rol |

## Nuevos Recursos

| Recurso | Tipo | Descripción |
|---------|------|-------------|
| `handle_new_user` | DB Function + Trigger | Auto-crea profile al registrarse |
| `assign-role` | Edge Function | Asigna rol en app_metadata + profiles |

---

## Commit Sugerido

```
fix: corregir flujo completo de registro y aprobación de usuarios

- Trigger DB auto-crea profile pendiente al registrarse (handle_new_user)
- Edge Function assign-role actualiza app_metadata + profiles en una sola operación
- signUp() ahora guarda nombre en user_metadata
- extractRoleFromToken lee app_metadata.role ?? user_role (compatibilidad)
- AdminRequests: fix return format getPendingUsers + selector de roles
- AdminDashboard: pasa roleName a assignRole
- Migración one-time: profiles para usuarios auth existentes sin profile
```
