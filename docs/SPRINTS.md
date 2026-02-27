# Sprints de Mejora — Healthy App (TecFood)

Objetivo: Mejorar la app de 7.0/10 → 9.5/10

---

## Sprint 1 — Performance: Fix N+1 Queries ✅

**Problema:** `VistaIngredientes` calculaba totales en JavaScript haciendo una consulta por ingrediente (N+1).

**Solución:**
- Migracion `sprint1_fix_ingredientes_rpc_v2` — corrige la función `get_ingredientes_totales(ciclo_id UUID)` en Supabase con retorno `BIGINT materia_prima_id` (el tipo correcto para `arbol_materia_prima.id`).
- `consolidadoService.js` ya tenía el fallback JS + llamada RPC — no requirió cambios en JS.

**Archivos:**
- SQL: `sprint1_fix_ingredientes_rpc_v2` (aplicado en Supabase)

**Carpetas vacías eliminadas:**
- `src/features/dishes/` (vacía)
- `src/stores/` (vacía)

---

## Sprint 2 — Sistema de Notificaciones ✅

**Qué se implementó:**
- Tabla `eventos_sistema` (fuente del evento: tabla, id, tipo)
- Tabla `notificaciones` (usuario_id, titulo, mensaje, tipo, estado, leido_en)
- Trigger `trg_stock_bajo` — al actualizar `stock_actual` a ≤ 20% del stock mínimo, crea un evento
- Trigger `trg_consolidado_listo` — al aprobar un consolidado, crea evento de notificación
- RPC `distribuir_notificaciones(evento_id)` — crea notificaciones para usuarios relevantes

**Frontend:**
- `src/features/notifications/` (feature completa en FSD)
  - `services/notificationsService.js` — CRUD + suscripción realtime vía `supabase.channel()`
  - `hooks/useNotifications.js` — carga notificaciones no leídas, polling 30s, realtime
  - `components/BellIcon.jsx` — campanita con badge rojo (pulsa si crítico)
  - `components/NotificationCenter.jsx` — panel desplegable con lista + "marcar todas"
  - `index.js` — exports públicos

**Integraciones:**
- `Navbar.jsx` — importa y renderiza `<BellIcon />` en el header

---

## Sprint 3 — Dashboard Admin con KPIs ✅

**Qué se implementó:**
- `src/features/admin/hooks/useAdminKPIs.js` — 6 queries paralelas:
  1. Pedidos hoy
  2. Ciclos activos
  3. Solicitudes pendientes
  4. Facturas semana actual
  5. Stock crítico (items ≤ 20% mínimo)
  6. Valor total inventario (stock_actual × costo_promedio)

**Cambios en AdminDashboard.jsx:**
- Nueva pestaña "Resumen" como tab inicial
- Componente `TabResumen` con 6 tarjetas KPI en grid
- `<RecommendationWidget>` embebido en el resumen

---

## Sprint 4 — Motor de Recomendaciones de Compra ✅

**SQL:** RPC `recomendar_compra()` — calcula urgencia de compra por materia prima:
- `URGENTE`: stock ≤ 10% del mínimo
- `ALTA`: stock ≤ 50% del mínimo
- `MEDIA`: stock ≤ 80% del mínimo
- `OK`: stock suficiente

**Frontend:**
- `src/features/recommendations/` (feature FSD)
  - `hooks/useRecommendations.js`
  - `components/RecommendationWidget.jsx` — tabla con badges URGENTE/ALTA/MEDIA
  - `index.js`

**Integraciones:**
- AdminDashboard → `TabResumen` (via `useAdminKPIs`)
- ProyeccionSemanal → pestaña proyeccion

---

## Sprint 5 — Módulo de Presupuesto ✅

**SQL:**
- Tabla `presupuestos` (mes, total_presupuesto, notas, creado_por)
- Tabla `presupuesto_items` (categoria, monto_presupuestado, monto_real)
- RPC `calcular_gasto_real_mes(p_mes DATE)` — suma gasto real desde facturas del mes

**Frontend:**
- `src/features/presupuesto/` (feature FSD)
  - `services/presupuestoService.js`
  - `hooks/usePresupuesto.js`
  - `components/FormPresupuesto.jsx` — modal con picker de mes y desglose por categoría
  - `components/DashboardPresupuesto.jsx` — KPIs, barra de progreso, alerta ≥80%
  - `index.js`

**Router:** case `"presupuesto"` → `<DashboardPresupuesto />`

**Navbar:** item "Presupuesto" añadido para `administrador` y `jefe_de_planta`

---

## Sprint 6 — Mejoras Operacionales ✅

### Auto-save de borrador de pedido
- `src/features/food-orders/store/usePedidoStore.js` — wrapeado con `persist` middleware de Zustand
- Persiste en `localStorage` key `pedido-draft-v1`: items, fechaPedido, servicioPedido, operacionActual, pacientes
- `PedidoServicioForm.jsx` — badge "Borrador guardado" cuando hay items con cantidad > 0

### Copiar ciclo como plantilla
- `src/features/menu-cycles/services/ciclosService.js` — método `copiarCiclo(cicloOrigenId, nuevoNombre, nuevaFechaInicio)`:
  - Copia estructura completa: dias × servicios → componentes → gramajes
- `ChefDashboard.jsx` — botón "Plantilla" reemplaza "Duplicar", abre modal con:
  - Campo "Nombre del nuevo ciclo"
  - Campo "Fecha de inicio"
  - Muestra spinner mientras copia

### Exportar consolidado a Excel
- `src/shared/lib/exportService.js` — helper `exportToExcel(data, filename, sheetName)`
- `npm install xlsx` — librería instalada
- `ConsolidadoSupervisor.jsx` — botón "Excel" en el header exporta los pedidos del día filtrado

---

## Sprint 7 — Seguridad RLS ✅

**Migración `sprint7_rls_security_v2`** aplicada en Supabase:

| Tabla | RLS | Política |
|-------|-----|---------|
| `pedidos_servicio` | ✅ | Read/Write todos los autenticados |
| `ciclos_menu` | ✅ | Read/Write todos los autenticados |
| `notificaciones` | ✅ | SELECT/UPDATE solo `usuario_id = auth.uid()` |
| `presupuestos` | ✅ | Read/Write todos los autenticados |
| `presupuesto_items` | ✅ | Read/Write todos los autenticados |

> Las políticas actuales son permisivas para usuarios autenticados. En producción se pueden refinar por rol usando `auth.jwt() ->> 'role'`.

---

## Resumen de archivos creados

```
src/features/notifications/
  services/notificationsService.js
  hooks/useNotifications.js
  components/BellIcon.jsx
  components/NotificationCenter.jsx
  index.js

src/features/recommendations/
  hooks/useRecommendations.js
  components/RecommendationWidget.jsx
  index.js

src/features/presupuesto/
  services/presupuestoService.js
  hooks/usePresupuesto.js
  components/FormPresupuesto.jsx
  components/DashboardPresupuesto.jsx
  index.js

src/features/admin/hooks/useAdminKPIs.js
src/shared/lib/exportService.js
docs/SPRINTS.md
```

## Archivos modificados clave

| Archivo | Cambio |
|---------|--------|
| `src/shared/ui/Navbar.jsx` | + BellIcon, + Presupuesto tabs |
| `src/features/admin/components/AdminDashboard.jsx` | + Tab Resumen con KPIs |
| `src/features/planta/components/ProyeccionSemanal.jsx` | + RecommendationWidget |
| `src/router/rolerouter.jsx` | + case presupuesto |
| `src/features/food-orders/store/usePedidoStore.js` | + persist middleware |
| `src/features/food-orders/components/PedidoServicioForm.jsx` | + badge borrador |
| `src/features/menu-cycles/services/ciclosService.js` | + copiarCiclo() |
| `src/features/menu-cycles/components/ChefDashboard.jsx` | + Copiar Plantilla modal |
| `src/features/food-orders/components/ConsolidadoSupervisor.jsx` | + Export Excel |
