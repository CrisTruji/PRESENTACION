# Sprint D — Notificaciones Automáticas

**Estado:** ✅ Completado
**Fecha:** 2026-03-05
**Bundle principal:** 1,222 kB (baseline Sprint C: 1,221 kB, delta: +1 kB)

---

## Objetivo

Activar y completar el sistema de notificaciones en tiempo real. Toda la infraestructura
(triggers, tabla `notificaciones`, UI de campanita) ya existía pero había un **eslabón roto**:
la función `distribuir_notificaciones()` nunca se invocaba automáticamente, por lo que los
eventos en `eventos_sistema` jamás llegaban a `notificaciones`.

---

## Arquitectura auditada (pre-sprint)

```
Evento de negocio
   ↓  (trigger EXISTENTE en BD)
eventos_sistema     ← trg_stock_bajo ✅   trg_consolidado_listo ✅
   ↓  ← ESLABÓN ROTO — distribuir_notificaciones() nunca se llamaba
notificaciones      ← tabla vacía a pesar de 1 evento acumulado
   ↓  (realtime + polling 30s — EXISTENTE)
BellIcon + NotificationCenter  ← UI 100% completa ✅
```

**Descubrimiento crítico:** `distribuir_notificaciones()` usaba
`raw_user_meta_data->>'role'` para filtrar usuarios, pero los roles están en
`raw_app_meta_data->>'role'`. Por eso, aunque se hubiera llamado, habría distribuido 0
notificaciones.

---

## D0 — Cerrar el pipeline

### Migraciones SQL

**`auto_distribuir_notificaciones`** — trigger automático en `eventos_sistema`:
```sql
-- Wrapper que invoca la distribución en cada INSERT
CREATE OR REPLACE FUNCTION public.fn_auto_distribuir()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM distribuir_notificaciones();
  RETURN NULL;
END;
$$;

-- FOR EACH STATEMENT: una sola llamada sin importar cuántas filas inserta el evento
DROP TRIGGER IF EXISTS trg_auto_distribuir ON public.eventos_sistema;
CREATE TRIGGER trg_auto_distribuir
AFTER INSERT ON public.eventos_sistema
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_auto_distribuir();
```

**`fix_distribuir_notificaciones_app_meta`** — corrección de campo de rol + soporte para
`presupuesto_critico`:
```sql
CREATE OR REPLACE FUNCTION public.distribuir_notificaciones()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_evento  RECORD;
  v_usuario RECORD;
  v_url     TEXT;
  v_titulo  TEXT;
  v_roles   TEXT[];
  v_count   INTEGER := 0;
BEGIN
  FOR v_evento IN
    SELECT e.* FROM eventos_sistema e
    WHERE NOT EXISTS (SELECT 1 FROM notificaciones n WHERE n.evento_id = e.id LIMIT 1)
    ORDER BY e.creado_en
  LOOP
    v_titulo := CASE v_evento.tipo
      WHEN 'stock_bajo'          THEN 'Stock Bajo'
      WHEN 'consolidado_listo'   THEN 'Consolidado Listo'
      WHEN 'presupuesto_critico' THEN 'Presupuesto Crítico'
      ELSE                            'Aviso del sistema' END;

    v_url := CASE v_evento.tipo
      WHEN 'stock_bajo'          THEN '/inventario'
      WHEN 'consolidado_listo'   THEN '/consolidado'
      WHEN 'presupuesto_critico' THEN '/presupuesto'
      ELSE NULL END;

    -- Roles destinatarios por tipo de evento
    v_roles := CASE v_evento.tipo
      WHEN 'presupuesto_critico' THEN ARRAY['administrador']
      ELSE ARRAY['jefe_de_planta','supervisor_produccion','administrador','almacenista'] END;

    -- CORRECCIÓN: raw_app_meta_data (no raw_user_meta_data)
    FOR v_usuario IN
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'role' = ANY(v_roles)
    LOOP
      INSERT INTO notificaciones(usuario_id, evento_id, titulo, mensaje, tipo, accion_url)
      VALUES (v_usuario.id, v_evento.id, v_titulo, v_evento.descripcion, v_evento.tipo, v_url)
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;
```

**Verificación inmediata:** Al ejecutar `SELECT distribuir_notificaciones()` tras la corrección,
el evento acumulado se distribuyó a **4 notificaciones** (los 4 usuarios administrador existentes).

---

## D1 — Triggers de stock y consolidado

No requirieron cambios. Con el pipeline completo por D0:
- `trg_stock_bajo` (AFTER UPDATE `arbol_materia_prima`) → ya funciona end-to-end
- `trg_consolidado_listo` (AFTER INSERT `consolidados_produccion`) → ya funciona end-to-end

---

## D2 — Presupuesto crítico

### Migración SQL `fn_presupuesto_critico`

```sql
CREATE OR REPLACE FUNCTION public.fn_notif_presupuesto_critico(p_mes TEXT)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_presupuestado NUMERIC;
  v_gasto_total   NUMERIC;
  v_porcentaje    NUMERIC;
BEGIN
  SELECT COALESCE(SUM(pi.monto_presupuestado), 0) INTO v_presupuestado
    FROM presupuesto_items pi JOIN presupuestos p ON p.id = pi.presupuesto_id
   WHERE TO_CHAR(p.mes, 'YYYY-MM') = p_mes;

  IF v_presupuestado = 0 THEN
    RETURN jsonb_build_object('notificado', false, 'razon', 'sin_presupuesto');
  END IF;

  SELECT COALESCE(SUM(gr.gasto_total), 0) INTO v_gasto_total
    FROM calcular_gasto_real_mes(p_mes) AS gr;

  v_porcentaje := (v_gasto_total / v_presupuestado) * 100;

  -- Solo notifica si >= 80% Y no se ha notificado en este mes calendario
  IF v_porcentaje >= 80 AND NOT EXISTS (
    SELECT 1 FROM eventos_sistema
     WHERE tipo = 'presupuesto_critico'
       AND datos_contexto->>'mes' = p_mes
       AND creado_en >= date_trunc('month', NOW())
  ) THEN
    INSERT INTO eventos_sistema(tipo, severidad, descripcion, datos_contexto)
    VALUES (
      'presupuesto_critico',
      CASE WHEN v_porcentaje >= 100 THEN 'critical' ELSE 'warning' END,
      FORMAT('Presupuesto al %.0f%% — %s', v_porcentaje, p_mes),
      jsonb_build_object('mes', p_mes, 'porcentaje', v_porcentaje,
                         'presupuestado', v_presupuestado, 'gasto_total', v_gasto_total)
    );
    -- trg_auto_distribuir se dispara automáticamente al hacer el INSERT
    RETURN jsonb_build_object('notificado', true, 'porcentaje', v_porcentaje);
  END IF;

  RETURN jsonb_build_object('notificado', false, 'porcentaje', v_porcentaje);
END;
$$;
```

### `DashboardPresupuesto.jsx` — cambios

```diff
- import React, { useState } from 'react';
+ import React, { useState, useEffect } from 'react';

  import notify from '@/shared/lib/notifier';
+ import { supabase } from '@/shared/api';

  // Dentro del componente:
+ // Verificar automáticamente si el presupuesto supera el 80% al cargar
+ useEffect(() => {
+   if (presupuesto && gastoReal.length > 0) {
+     // Fire-and-forget: la BD crea el evento y el trigger distribuye a los admins
+     supabase.rpc('fn_notif_presupuesto_critico', { p_mes: mes });
+   }
+ }, [presupuesto?.id, gastoReal.length, mes]);
```

**Flujo completo D2:**
```
DashboardPresupuesto carga → useEffect llama fn_notif_presupuesto_critico(mes)
  → Si gasto >= 80%: INSERT en eventos_sistema
    → trg_auto_distribuir se dispara
      → distribuir_notificaciones() inserta en notificaciones (solo para administrador)
        → useNotifications (realtime o polling 30s) recibe la notificación
          → BellIcon se actualiza con el aviso
```

---

## D3 — Operaciones sin pedido hoy

### Migración SQL `fn_verificar_pedidos_dia`

```sql
CREATE OR REPLACE FUNCTION public.verificar_pedidos_del_dia()
RETURNS TABLE(operacion_id UUID, nombre TEXT, falta_en TEXT[])
LANGUAGE sql STABLE AS $$
  SELECT
    o.id,
    o.nombre,
    ARRAY_AGG(DISTINCT su.servicio ORDER BY su.servicio) AS falta_en
  FROM operaciones o
  JOIN servicios_unidad su ON su.operacion_id = o.id AND su.activo = true
  WHERE o.activo = true
    AND NOT EXISTS (
      SELECT 1 FROM pedidos_servicio ps
       WHERE ps.operacion_id = o.id
         AND ps.servicio      = su.servicio
         AND ps.fecha         = CURRENT_DATE
         AND ps.estado       != 'borrador'
    )
  GROUP BY o.id, o.nombre
  ORDER BY o.nombre;
$$;
```

### `useAdminKPIs.js` — query 7 añadida

```diff
  // 7. Operaciones sin pedido hoy
+ {
+   queryKey: ['kpi-sin-pedido-hoy'],
+   queryFn: async () => {
+     const { data } = await supabase.rpc('verificar_pedidos_del_dia');
+     return data || [];
+   },
+   staleTime: 5 * 60 * 1000,
+ },

  const [..., sinPedido] = results;

  return {
    ...
+   sinPedidoHoy: sinPedido.data?.length ?? 0,
+   operacionesSinPedido: sinPedido.data ?? [],
    ...
  };
```

### `AdminDashboard.jsx` — banner en `TabResumen`

```diff
  const {
    pedidosHoy, ...,
+   sinPedidoHoy, operacionesSinPedido, isLoading
  } = useAdminKPIs();

  // KPI "Pedidos Hoy" en amarillo si hay operaciones sin pedido
- bg: 'bg-primary/10 text-primary',
+ bg: sinPedidoHoy > 0 ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary',

  // Banner sobre la grilla de KPIs:
+ {sinPedidoHoy > 0 && (
+   <div className="p-4 rounded-xl flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800">
+     <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-yellow-600" />
+     <div className="text-sm">
+       <span className="font-semibold">
+         {sinPedidoHoy} {sinPedidoHoy === 1 ? 'operación' : 'operaciones'} sin pedido hoy:
+       </span>{' '}
+       {operacionesSinPedido.map((op, i) => (
+         <span key={op.operacion_id}>
+           {op.nombre}
+           {op.falta_en?.length > 0 && (
+             <span className="text-yellow-600 text-xs ml-1">({op.falta_en.join(', ')})</span>
+           )}
+           {i < operacionesSinPedido.length - 1 ? ', ' : ''}
+         </span>
+       ))}
+     </div>
+   </div>
+ )}
```

---

## Resumen de cambios en BD

| Objeto | Tipo | Acción |
|--------|------|--------|
| `fn_auto_distribuir` | Función trigger | **Nueva** |
| `trg_auto_distribuir` | Trigger en `eventos_sistema` | **Nuevo** |
| `distribuir_notificaciones` | Función | **Actualizada** (campo rol + tipo presupuesto_critico) |
| `fn_notif_presupuesto_critico` | Función RPC | **Nueva** |
| `verificar_pedidos_del_dia` | Función RPC (STABLE) | **Nueva** |

---

## Verificación

### Pipeline de notificaciones (D0)

```sql
-- Antes de sprint D: 0 notificaciones
SELECT COUNT(*) FROM notificaciones; -- → 0

-- Tras aplicar migraciones y llamar distribuir_notificaciones():
SELECT COUNT(*) FROM notificaciones; -- → 4 (1 evento × 4 admins)
```

### Build
```
✓ built in 41.97s
Bundle principal: 1,222 kB (Sprint C baseline: 1,221 kB, delta: +1 kB)
```
Sin errores de compilación.

---

## Archivos Modificados / Creados

| Tipo | Archivo |
|------|---------|
| 🗄️ SQL | Migración `auto_distribuir_notificaciones` (fn_auto_distribuir + trigger) |
| 🗄️ SQL | Migración `fix_distribuir_notificaciones_app_meta` (corrección campo rol) |
| 🗄️ SQL | Migración `fn_presupuesto_critico` (fn_notif_presupuesto_critico) |
| 🗄️ SQL | Migración `fn_verificar_pedidos_dia` (verificar_pedidos_del_dia) |
| ✏️ Modificado | `src/features/presupuesto/components/DashboardPresupuesto.jsx` |
| ✏️ Modificado | `src/features/admin/hooks/useAdminKPIs.js` |
| ✏️ Modificado | `src/features/admin/components/AdminDashboard.jsx` |
