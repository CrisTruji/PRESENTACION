# Informe de Roadmap — Healthy App
**Fecha de análisis:** 2026-03-11
**Autor:** Análisis automático con Claude Code

---

## Resumen Ejecutivo

La aplicación Healthy es un sistema de gestión de producción y alimentación institucional (hospitales/unidades). Está bien estructurada en FSD (Feature-Sliced Design), con React + Vite en frontend y Supabase como backend.

Este informe detalla las mejoras pendientes identificadas, clasificadas por área, y para cada una indica: qué se necesita definir antes de implementar, el esfuerzo estimado, y el orden sugerido de implementación.

---

## BUGS CORREGIDOS EN ESTA SESIÓN (Sprint L)

| ID | Archivo | Descripción | Severidad |
|----|---------|-------------|-----------|
| L-01 | `consolidadoService.js` | RPC `descontar_stock_consolidado` sin verificar error — podía marcar stock como descontado cuando en realidad fallaba | CRÍTICO → RESUELTO |
| L-02 | `ConsolidadoSupervisor.jsx` | `window.confirm()` bloqueante para re-generación — reemplazado por modal propio | MODERADO → RESUELTO |
| L-03 | `ConsolidadoSupervisor.jsx` | Clases CSS `text-muted` inválidas — reemplazadas por `text-text-muted` | BAJO → RESUELTO |

---

## ÁREA 1 — CICLOS MENÚ

### Lo que se quiere lograr
- Ingresar ciclos menú en la aplicación con gramaje por unidad
- Registrar las recetas del día (ciclo-menú)
- Crear recetas locales por producto
- Configurar gramaje por tipo de dieta
- Ciclo menú personalizado por unidad (cada unidad solo ve la suya)

### Análisis del estado actual
El módulo `menu-cycles` existe (`src/features/menu-cycles/`) con `ChefDashboard`. También hay componentes en `food-orders` que ya consumen ciclos (`ModalCicloCompleto`, `PanelMenuUnidad`, `getCicloActivoPorOperacion`). La estructura de DB ya tiene `ciclos_menu`, `menu_componentes`, `gramajes_componente_menu`, `tipos_dieta`.

### Lo que falta implementar

#### 1.1 — Restricción de ingreso solo para códigos tipo 3
**Problema:** Actualmente no se valida que solo se puedan ingresar como ingredientes materias primas con código tipo 3 (código de 3 dígitos o clasificación específica).
**Antes de implementar:** Definir exactamente qué es "código 3" — ¿es el campo `codigo` que empieza con 3? ¿Es una clasificación en la tabla? ¿O es un tipo de producto específico en `arbol_materia_prima`?

#### 1.2 — Alimentos de materia prima entregable
**Problema:** Se necesita poder marcar/filtrar materias primas que son "entregables" directamente (sin transformación).
**Antes de implementar:** Definir si esto es un campo booleano `es_entregable` en `arbol_materia_prima` o una categoría.

#### 1.3 — Configuración de gramaje por tipo de dieta
**Estado actual:** La tabla `gramajes_componente_menu` ya existe con campos `gramaje`, `unidad_medida`, `excluir`, `tipos_dieta`. El modelo está pero la UI de configuración puede estar incompleta.
**Lo que falta:** Pantalla de administración para editar gramajes por dieta para cada componente del menú.

#### 1.4 — Personalización por unidad (cada unidad ve solo la suya)
**Antes de implementar:** Definir los formatos que aplican a cada unidad y cuáles son similares entre unidades. Esto puede implementarse con RLS en Supabase filtrando por `operacion_id` del usuario.

### Esfuerzo estimado
- Sprint M-1: Restricciones de ingreso (códigos tipo 3, MP entregable) — 1-2 días
- Sprint M-2: UI gramaje por dieta — 1-2 días
- Sprint M-3: Personalización por unidad + RLS — 1 día

---

## ÁREA 2 — PORTAL EMPLEADOS / NÓMINA

### Lo que se quiere lograr
- Ingresar desprendibles a dos carpetas del sistema
- Crear usuario de nómina
- Que el empleado pueda ingresar documentos
- Que el empleado pueda consultar sus vacaciones
- Verificación de usuario como admin
- Aceptación de usuarios
- Verificación de correo del usuario
- Definir parámetros de vacaciones
- Definir qué documentos se permiten

### Análisis del estado actual
El portal de empleados está implementado (`src/features/portal-empleado/` y `src/features/nomina/`). Existe `PanelNomina` con `SubirDesprendiblesMasivos`. Los buckets de Supabase ya están creados. La autenticación básica con `EmpleadoRegistroScreen` existe.

### Lo que falta implementar

#### 2.1 — Ingresar a dos carpetas de desprendibles
**Estado:** Solo existe `desprendibles-nomina`. Se necesita soportar una segunda carpeta/período.
**Antes de implementar:** Definir cuáles son las dos carpetas exactamente (¿por período? ¿por tipo de desprendible?).

#### 2.2 — Usuario de nómina (rol `nomina`)
**Estado:** El rol existe en el router. Verificar si el flujo de creación de usuario nómina desde admin está completo.
**Lo que falta:** Panel de admin para asignar rol `nomina` a un usuario.

#### 2.3 — Verificación de correo del usuario
**Estado:** Supabase Auth soporta email confirmation nativo.
**Lo que falta:** Asegurarse de que `emailRedirectTo` esté configurado en el `signUp` y que el mensaje al usuario sea claro.

#### 2.4 — Aceptación y verificación de usuarios por admin
**Estado:** Existe `WaitingRoleScreen` para usuarios sin rol asignado.
**Lo que falta:** Panel en admin donde se listen los usuarios pendientes y el admin pueda asignar rol + aprobar.

#### 2.5 — Parámetros de vacaciones
**Antes de implementar:** Definir: ¿días de vacaciones legales? ¿Se calculan automáticamente por fechas de contrato? ¿El empleado solo consulta o también solicita?

#### 2.6 — Tipos de documentos permitidos
**Antes de implementar:** Listar los documentos que cada empleado puede subir (ej: cédula, RH, certificados, etc.).

### Esfuerzo estimado
- Sprint N-1: Verificación de correo + aceptación admin — 1 día
- Sprint N-2: Panel admin gestión usuarios (pendientes/rol) — 1-2 días
- Sprint N-3: Dos carpetas de desprendibles — 1 día
- Sprint N-4: Parámetros vacaciones (después de definir reglas) — 2 días

---

## ÁREA 3 — SISTEMA DE FACTURAS

### Lo que se quiere lograr
- Incorporar facturas de caja menor
- Flujo completo: remisión, notas crédito, traspaso, devolución
- Guardar a qué proveedor se está comprando en flujo normal

### Análisis del estado actual
El módulo `warehouse` tiene `RecepcionFactura` y `Facturas`. El módulo `purchases` tiene flujo de solicitudes. Existe `GestionCompras` con proyección de compras.

### Lo que falta implementar

#### 3.1 — Facturas de caja menor
**Antes de implementar:** Definir con el encargado: ¿qué campos tiene una factura de caja menor vs una factura normal? ¿Hay un presupuesto de caja menor por período? ¿Quién la aprueba?

#### 3.2 — Flujos adicionales de factura
**Antes de implementar (CRÍTICO):** Este es el punto que más requiere definición con el encargado de compras:
- **Remisión:** ¿Cómo se diferencia de una factura? ¿Tiene número de remisión propio?
- **Nota crédito:** ¿Cuándo se genera? ¿Descuenta del valor de una factura existente?
- **Traspaso:** ¿Es movimiento entre unidades o entre bodegas?
- **Devolución:** ¿Devuelve al proveedor o a bodega?

#### 3.3 — Proveedor en solicitud de pedido
**Estado:** El flujo de solicitud existe pero puede no guardar el proveedor.
**Lo que falta:** Agregar campo `proveedor_id` en la tabla de solicitudes/pedidos y en el formulario de solicitud.
**Esfuerzo:** Bajo — migración de DB + campo en formulario.

### Esfuerzo estimado
- Sprint O-1: Proveedor en solicitud (independiente, bajo) — 0.5 días
- Sprint O-2: Facturas de caja menor (después de definir) — 2-3 días
- Sprint O-3: Flujos remisión/NC/traspaso/devolución (después de definir proceso) — 3-5 días

---

## ÁREA 4 — MEJORAS DE INTERFAZ (Frontend)

### Lo que se quiere lograr
- Aplicación más intuitiva
- Mejores vistas
- Incorporar herramienta de diseño para mock-ups

### Análisis del estado actual
La aplicación usa Tailwind CSS con un design system propio (variables CSS en `style.css`). Ya tiene dark/light mode. Los componentes siguen un patrón consistente (cards, stats-cards, form-inputs, etc.).

### Lo que se necesita antes de implementar
- **Definir un mock-up base** para las pantallas principales. Se recomienda usar Figma o similar para hacer un prototipo visual antes de codear.
- **Identificar las pantallas más usadas** por cada rol para priorizar las mejoras.
- **Recolectar feedback** de los usuarios actuales sobre qué encuentran difícil o confuso.

### Áreas de mejora identificadas (sin necesitar definición previa)
1. **Navegación:** El `Navbar` podría tener breadcrumbs para saber dónde está el usuario.
2. **Onboarding:** Primera vez que entra un usuario, no hay tutorial o guía.
3. **Estados vacíos:** Algunos componentes no tienen buen mensaje cuando no hay datos.
4. **Responsive mobile:** Revisar vistas en celular (especialmente tablas).
5. **Feedback de acciones:** Algunas acciones no tienen confirmación visual inmediata.

### Esfuerzo estimado
- Sprint P-1: Navegación + breadcrumbs + estados vacíos — 1-2 días
- Sprint P-2: Mejoras responsive — 2 días
- Sprint P-3: Rediseño de pantallas principales (requiere mock-ups aprobados) — 5-8 días

---

## ÁREA 5 — PANTALLA DE SOLICITUD DE PEDIDO PERSONALIZADA

### Lo que se quiere lograr
- Adaptar la pantalla de pedido a los requerimientos de cada unidad
- Que sea más sencillo para cada unidad

### Análisis del estado actual
`PedidoServicioForm` es el formulario actual de pedido. Sirve para todas las unidades de igual manera.

### Lo que falta implementar
- **Antes de implementar (CRÍTICO):** Definir con cada unidad qué funcionalidades necesitan. Posibles variaciones:
  - ¿Diferentes servicios disponibles por unidad?
  - ¿Diferentes componentes del menú por unidad?
  - ¿Diferentes tipos de dieta por unidad?
  - ¿Algunas unidades no necesitan campos que otras sí?
- La base técnica (filtro por `operacion_id`) ya existe en la DB.

### Esfuerzo estimado
- Definición con unidades: 3-5 días de reuniones
- Implementación técnica (después de definir): 2-3 días

---

## ÁREA 6 — INGRESO DE INFORMACIÓN MAESTRA

### Lo que se quiere lograr
- Crear materia prima, platos, recetas, proveedores desde la aplicación

### Análisis del estado actual
El módulo `products` tiene `SelectorArboles` y `ArbolMateriaPrima`. El módulo `recipes` existe pero puede estar incompleto. El módulo `purchases` puede tener gestión de proveedores.

### Lo que falta
- Pantalla de **CRUD completo** para materia prima (crear, editar, desactivar)
- Pantalla de **CRUD completo** para proveedores
- Pantalla de **CRUD de recetas** con ingredientes
- Pantalla de **CRUD de platos** (componentes del plato)
- Todos bajo el rol `administrador` o `chef` según corresponda

### Esfuerzo estimado
- Sprint Q-1: CRUD materia prima — 2 días
- Sprint Q-2: CRUD proveedores — 1 día
- Sprint Q-3: CRUD recetas con ingredientes — 2-3 días
- Sprint Q-4: CRUD platos/componentes — 1-2 días

---

## ÁREA 7 — DESECHABLES EN PEDIDOS

### Lo que se quiere lograr
- Que el sistema cuente cuando se usan desechables
- Opción: ¿Con o sin desechables?
- Si escogen con desechables → descontar del stock los desechables correspondientes

### Lo que falta
- Campo `usar_desechables` (boolean) en la tabla de pedidos o consolidados
- Tabla de desechables o marcación en `arbol_materia_prima` como tipo desechable
- Lógica en el RPC `descontar_stock_consolidado` para incluir desechables si `usar_desechables = true`
- UI en el formulario de pedido para elegir la opción

### Antes de implementar
- Definir: ¿Los desechables se calculan por número de porciones? ¿Por tipo de servicio? ¿Se puede configurar la cantidad de desechables por porción?

### Esfuerzo estimado
- Migración DB + RPC: 1 día
- UI formulario de pedido: 0.5 días
- Total: ~2 días (después de definir reglas)

---

## ÁREA 8 — CONSOLIDADOS: MOSTRAR RECETAS A PREPARAR

### Lo que se quiere lograr
- Que los consolidados de planta muestren la receta que se tiene que preparar

### Análisis del estado actual
`VistaRecetas` en `ConsolidadoSupervisor` ya muestra las recetas. Sin embargo, puede que la vista en `planta` (rol `jefe_de_planta`) no muestre esta información.

### Lo que falta
- Verificar qué ve el rol `jefe_de_planta` en su pantalla
- Si no ve las recetas, agregar una vista similar a `VistaRecetas` en el contexto de planta
- Esfuerzo: BAJO si el componente ya existe, solo hay que reutilizarlo

---

## ÁREA 9 — STOCK POR UNIDAD

### Lo que se quiere lograr
- Que todas las unidades manejen también un stock propio

### Estado actual
El stock está centralizado (sin `operacion_id`). Para stock por unidad se necesita una revisión de la arquitectura de inventario.

### Antes de implementar (CRÍTICO)
Este es un cambio arquitectónico importante. Definir:
- ¿El stock por unidad es independiente del stock central?
- ¿Quién puede ajustar el stock de cada unidad?
- ¿Cómo se reabastece el stock de unidad desde el central?
- ¿El descuento de stock en `marcarPreparado` descuenta del stock central o del stock de la unidad?

### Esfuerzo estimado
Después de definir la arquitectura: 5-8 días (migración DB + servicios + UI)

---

## PUNTOS PEQUEÑOS IDENTIFICADOS

| # | Descripción | Esfuerzo | Estado |
|---|-------------|----------|--------|
| P1 | Restablecer contraseña (reset password flow) | Bajo — Supabase Auth ya lo soporta | Pendiente |
| P2 | Ciclo menú personalizado por unidad (filtrar por operacion_id) | Medio | Pendiente — requiere definición |
| P3 | Formatos aplicables por unidad | Definición requerida | Pendiente |

### P1 — Restablecer Contraseña
Supabase Auth soporta `resetPasswordForEmail()` y el flujo completo con deep link. Solo falta:
1. Botón "¿Olvidé mi contraseña?" en la pantalla de login
2. Pantalla `ResetPasswordScreen` que recibe el token y permite cambiar la contraseña
3. Configurar el `Site URL` en Supabase Dashboard para el redirect

---

## ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Inmediato (sin necesidad de definiciones adicionales)
1. **Sprint L (hecho):** Bugs corregidos
2. **P1 — Restablecer contraseña:** Independiente, bajo esfuerzo, alta necesidad
3. **O-1 — Proveedor en solicitud:** Bajo esfuerzo, claro requisito
4. **Área 8 — Recetas en consolidado de planta:** Revisar y reutilizar componentes

### A mediano plazo (requieren reunión de definición primero)
5. **Área 3 — Facturas de caja menor:** Reunión con encargado de compras
6. **Área 7 — Desechables:** Definir reglas con operaciones
7. **Área 2 — Portal empleados:** Definir parámetros vacaciones + documentos
8. **Área 1 — Ciclos menú:** Definir "código 3" y MP entregable

### A largo plazo (requieren diseño previo)
9. **Área 5 — Pedido personalizado por unidad:** Mapeado de requerimientos por unidad
10. **Área 4 — Rediseño interfaz:** Mock-ups y aprobación de diseño
11. **Área 9 — Stock por unidad:** Diseño arquitectónico completo
12. **Área 6 — CRUD información maestra:** Definir permisos y flujos

---

## DEUDA TÉCNICA IDENTIFICADA

| # | Descripción | Severidad |
|---|-------------|-----------|
| DT-1 | FSD Migration pendiente: `screens/`, `services/`, `components/`, `lib/`, `utils/` son legacy | Media |
| DT-2 | `context/auth.jsx` importado en ~20+ archivos, candidato a migrar a Zustand | Media |
| DT-3 | `utils/notifier.js` importado en ~15+ archivos — debería unificarse con `@shared/lib/notifier` | Baja |
| DT-4 | Tests: `vitest.config.js` existe pero no hay tests implementados | Media |
| DT-5 | `getIngredientesTotales` tiene fallback JS que puede ser lento para consolidados grandes — requiere que el RPC esté aplicado en producción | Baja |

---

## RESUMEN DE ESFUERZO TOTAL

| Área | Sprints necesarios | Definición previa requerida |
|------|-------------------|---------------------------|
| Bugs (hecho) | 0 | No |
| Ciclos menú | 3 | Sí — "código 3", MP entregable |
| Portal empleados | 4 | Sí — parámetros vacaciones, tipos doc |
| Facturas | 3 | Sí — proceso de compras |
| Interfaz | 3 | Sí — mock-ups |
| Pedido por unidad | 2 | Sí — levantamiento con unidades |
| Información maestra | 4 | Parcial |
| Desechables | 1 | Sí — reglas de cálculo |
| Consolidado planta | 1 | No |
| Stock por unidad | 5+ | Sí — arquitectura |
| Reset contraseña | 1 | No |
| **TOTAL** | **~27 sprints** | |

