# Sprint 1 – Base de Datos + Auth
**Fecha:** 2026-02-27
**Estado:** ✅ Completado

---

## Objetivo
Infraestructura de base de datos, storage y autenticación lista para el portal de empleados.

---

## Cambios en Base de Datos (Supabase: TecFood_DB)

### Migraciones ejecutadas

**`portal_empleados_nuevas_tablas`**
- `empleados.auth_user_id UUID` — columna nueva que vincula cada empleado con su cuenta Supabase Auth
- `empleado_desprendibles` — tabla nueva para desprendibles de pago (empleado_id, periodo, archivo_path, descargado, subido_por)
- RLS habilitado en `empleados_vacaciones`, `empleado_incapacidades`, `empleado_documentos`

**`portal_empleados_correccion_tablas`**
- Eliminada tabla duplicada `empleados_vacaciones` (ya existía `empleado_vacaciones`)
- `empleado_vacaciones`: columnas agregadas: `tipo`, `aprobado_por`, `motivo_rechazo`, `dias_solicitados`
- `empleado_vacaciones`: CHECK constraint ampliado para incluir estados `aprobado` y `rechazado`
- `empleado_incapacidades`: columna `estado` agregada (pendiente|revisado|rechazado)
- RLS habilitado y policies creadas para `usuario`, `nomina`, `administrador`

**`portal_storage_rls_policies`**
- RLS en `storage.objects` para buckets `desprendibles-nomina` e `incapacidades-docs`

### Storage Buckets creados
| Bucket | Acceso | Tamaño máx | Tipos permitidos |
|---|---|---|---|
| `desprendibles-nomina` | Privado | 10 MB | application/pdf |
| `incapacidades-docs` | Privado | 10 MB | PDF, JPEG, PNG |

---

## Edge Function desplegada

**`employee-register`** (verify_jwt: false)
URL: `{SUPABASE_URL}/functions/v1/employee-register`

Acciones disponibles:
- `verificar_cedula` — recibe `{ cedula }`, retorna nombre del empleado si existe y no tiene cuenta
- `crear_cuenta` — recibe `{ cedula, email, password }`, crea cuenta Auth con `role: 'usuario'`, vincula `auth_user_id`

---

## Archivos Modificados en el Proyecto

| Archivo | Cambio |
|---|---|
| `src/router/rolerouter.jsx` | Imports de `PortalEmpleadoDashboard` y `PanelNomina`; cases `usuario`→`portal_empleado`, `nomina`→`panel_nomina` |
| `src/context/auth.jsx` | Agregado `"nomina"` al arreglo de roles del devpanel |

## Archivos Creados en el Proyecto

| Archivo | Descripción |
|---|---|
| `src/features/portal-empleado/index.js` | Public API del módulo |
| `src/features/portal-empleado/components/PortalEmpleadoDashboard.jsx` | Dashboard principal con tabs |
| `src/features/portal-empleado/components/MiInformacion.jsx` | Ver/editar datos personales del empleado |
| `src/features/portal-empleado/components/Desprendibles.jsx` | Placeholder Sprint 3 |
| `src/features/portal-empleado/components/Vacaciones.jsx` | Placeholder Sprint 4 |
| `src/features/portal-empleado/components/Incapacidades.jsx` | Placeholder Sprint 4 |
| `src/features/portal-empleado/components/MisDocumentos.jsx` | Placeholder Sprint 5 |
| `src/features/portal-empleado/hooks/useEmpleadoPerfil.js` | React Query hooks para perfil |
| `src/features/portal-empleado/services/portalEmpleadoService.js` | Servicios: verificarCedula, crearCuenta, getEmpleadoByAuthUser, updateDatosPersonales |
| `src/features/nomina/index.js` | Public API del módulo nómina |
| `src/features/nomina/components/PanelNomina.jsx` | Placeholder Sprint 3 |

---

## Verificación

- [x] Tablas `empleado_desprendibles`, `empleado_vacaciones` (ampliada) existen en Supabase
- [x] Columna `auth_user_id` en tabla `empleados`
- [x] Buckets `desprendibles-nomina` e `incapacidades-docs` visibles en Storage
- [x] Edge Function `employee-register` activa en Functions
- [x] Dev panel muestra rol `nomina` en auth.jsx
- [x] rolerouter.jsx redirige `usuario` → `portal_empleado` y `nomina` → `panel_nomina`
- [ ] Test end-to-end: registrar empleado por cédula (pendiente Sprint 2)

---

## Commit sugerido
```
git commit -m "sprint 1: db + auth + estructura FSD portal empleados"
```
