# Sprint C — Módulo Económico Completo

**Estado:** ✅ Completado
**Fecha:** 2026-03-05
**Bundle principal:** 1,221 kB (baseline Sprint B: 1,190 kB, delta: +31 kB)

---

## Objetivo

Completar el módulo económico añadiendo tres funcionalidades que la BD ya soportaba pero
la UI no exponía:

1. **C1 — Costos por Unidad:** Vista filtrable de cuántas raciones se han servido y cuánto
   han costado por operación y servicio en un período dado.
2. **C2 — Varianza de Presupuesto:** Tabla comparativa "Presupuestado vs Real" con progreso
   visual por categoría + botón "Auto-estimar desde histórico".
3. **C3 — Cierre de Costos Mensual:** Informe de fin de mes que consolida facturas, producción
   real y gasto por categoría, con exportación a PDF.

---

## C1 — Pantalla "Costos por Unidad"

### Problema

La BD tenía todos los datos necesarios (`pedidos_servicio`, `pedido_items_servicio`,
`arbol_recetas.costo_porcion`) pero no existía ninguna pantalla que los mostrara agrupados
por operación.

**Complicación encontrada:** `pedido_items_servicio.menu_componente_id` es NULL en todos
los registros actuales — los ítems se almacenan por `tipo_dieta_id`, no por componente de
menú. Por eso la función SQL v1 (con INNER JOIN) retornaba vacío. Se resolvió con LEFT JOINs
y una CASE WHEN para el costo.

### SQL aplicado

**Migración `fn_costos_por_unidad` (v1 — descartada, retornaba vacío por INNER JOINs):**
Reemplazada inmediatamente por v2.

**Migración `fn_costos_por_unidad_v2`:**
```sql
CREATE OR REPLACE FUNCTION calcular_costos_por_unidad(
  p_fecha_inicio DATE,
  p_fecha_fin    DATE
)
RETURNS TABLE (
  operacion_id     UUID,
  operacion_nombre TEXT,
  servicio         TEXT,
  total_raciones   BIGINT,
  costo_estimado   NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    ps.operacion_id,
    o.nombre                                                       AS operacion_nombre,
    ps.servicio,
    COALESCE(SUM(pis.cantidad), 0)::BIGINT                         AS total_raciones,
    COALESCE(SUM(
      CASE
        WHEN pis.menu_componente_id IS NOT NULL
          THEN pis.cantidad::NUMERIC * COALESCE(ar.costo_porcion, 0)
        ELSE 0
      END
    ), 0)                                                          AS costo_estimado
  FROM pedidos_servicio        ps
  JOIN operaciones             o   ON o.id  = ps.operacion_id
  JOIN pedido_items_servicio   pis ON pis.pedido_id = ps.id
  LEFT JOIN menu_componentes   mc  ON mc.id  = pis.menu_componente_id
  LEFT JOIN arbol_recetas      ar  ON ar.id  = mc.receta_id
  WHERE ps.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND ps.estado != 'borrador'
  GROUP BY ps.operacion_id, o.nombre, ps.servicio
  ORDER BY o.nombre, ps.servicio;
$$;
```

**Verificación:**
```
operacion_nombre | servicio  | total_raciones | costo_estimado
Archroma         | desayuno  | 46             | 0
Brune            | desayuno  | 38             | 0
Ventas           | cena      | 29             | 0
Ventas           | desayuno  | 16             | 0
```
Las raciones son correctas. El costo = 0 es esperado hasta que se vincule `menu_componente_id`
en los ítems de pedido.

### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/services/costosPorUnidadService.js` | Wrapper de la RPC |
| `src/features/admin/hooks/useCostosPorUnidad.js` | Hook React Query (staleTime: 5 min) |
| `src/features/admin/components/CostosPorUnidad.jsx` | Pantalla completa |

**`costosPorUnidadService.js`:**
```js
import { supabase } from '@/shared/api';

export async function getCostosPorUnidad(fechaInicio, fechaFin) {
  const { data, error } = await supabase.rpc('calcular_costos_por_unidad', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
  });
  if (error) throw error;
  return data || [];
}
```

**`CostosPorUnidad.jsx` — funcionalidades:**
- Selector de mes (`<input type="month">`) + filtro de servicio (dropdown)
- KPI cards: operaciones únicas, total raciones, costo estimado total
- Filas colapsables por operación con detalle por servicio
- Banner de aviso cuando `costo_estimado = 0` (datos pendientes de vinculación)

### Modificaciones a archivos existentes

**`src/features/admin/index.js`:**
```diff
+ export { default as CostosPorUnidad } from './components/CostosPorUnidad';
```

---

## C2 — Varianza de Presupuesto en `DashboardPresupuesto`

### Problema

El módulo de presupuesto tenía UI completa y la RPC `calcular_gasto_real_mes` funcionando,
pero la tabla solo mostraba el gasto real sin compararlo contra lo presupuestado. Tampoco
había forma de arrancar rápido con un presupuesto realista.

### Modificaciones en `DashboardPresupuesto.jsx`

**Imports añadidos:**
```js
import { Sparkles } from 'lucide-react';
import { presupuestoService } from '../services/presupuestoService';
import { notify } from '@/shared/lib/notifier';
```

**Helper `getMesAnterior(mes)`:**
```js
function getMesAnterior(mes) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

**Nueva tabla de varianza** (reemplaza "Gasto por categoría"):
```
Categoría | Presupuestado | Real | Diferencia | Avance
─────────────────────────────────────────────────────
Proteínas |    $500,000   | $430,000 | -$70,000 🟢 | ████░ 86%
Verduras  |    $200,000   | $220,000 | +$20,000 🔴 | ██████ 110%
```
- Barra de progreso en Tailwind con colores: verde < 80%, amarillo 80–100%, rojo > 100%
- Diferencia positiva = sobrepresupuesto (rojo), negativa = ahorro (verde)

**Botón "Auto-estimar":**
- Solo visible cuando no existe presupuesto para el mes seleccionado
- Llama `presupuestoService.getGastoReal(mesAnterior)`
- Crea un objeto `presupuestoAuto` sintético con `presupuesto_items` tomados del histórico
- Abre `FormPresupuesto` con esos valores pre-cargados (aprovecha que el form acepta
  `presupuesto.presupuesto_items` para inicializar su estado — sin cambios al form)

---

## C3 — Pantalla "Cierre de Costos Mensual"

### Objetivo

Vista de cierre que consolida en una sola pantalla:
1. Las facturas del mes (compras realizadas)
2. Los consolidados de producción (lo que realmente se produjo)
3. El gasto por categoría (RPC existente)

### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/features/presupuesto/hooks/useCierreCostos.js` | 3 queries paralelas con `useQueries` |
| `src/features/presupuesto/components/CierreCostosMensual.jsx` | Pantalla de cierre |

**`useCierreCostos.js` — queries paralelas:**
```js
export function useCierreCostos(mes) {
  const [y, m] = mes ? mes.split('-').map(Number) : [null, null];
  const inicio = mes ? `${y}-${String(m).padStart(2,'0')}-01` : null;
  const fin    = mes ? `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}` : null;

  const results = useQueries({
    queries: [
      { queryKey: ['cierre-facturas', mes],
        queryFn: () => getFacturasMes(inicio, fin), enabled: !!mes },
      { queryKey: ['cierre-consolidados', mes],
        queryFn: () => getConsolidadosMes(inicio, fin), enabled: !!mes },
      { queryKey: ['cierre-gasto-real', mes],
        queryFn: () => presupuestoService.getGastoReal(mes), enabled: !!mes },
    ],
  });
  // retorna { facturas, consolidados, gastoReal, isLoading, errors }
}
```

**`CierreCostosMensual.jsx` — estructura:**
- Selector de mes
- KPI cards: N° facturas, total compras ($), raciones producidas, consolidados finalizados
- `<Seccion>` colapsable con badge de totales:
  - **Compras**: tabla facturas (N°, proveedor, fecha, estado, valor)
  - **Producción Real**: tabla consolidados (fecha, servicio, estado, porciones)
  - **Gasto por Categoría**: tabla gastoReal (categoría, N° facturas, gasto, %)
- **Exportar PDF** con import dinámico:
  ```js
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  ```

### Modificaciones a archivos existentes

**`src/features/presupuesto/index.js`:**
```diff
+ export { default as CierreCostosMensual } from './components/CierreCostosMensual';
+ export { useCierreCostos } from './hooks/useCierreCostos';
```

---

## Integración en Router y Navbar

### `src/router/rolerouter.jsx`

**Imports añadidos:**
```diff
- import { AdminDashboard, AdminRequests, AnalisisCostos, Nomina } from "@/features/admin";
+ import { AdminDashboard, AdminRequests, AnalisisCostos, Nomina, CostosPorUnidad } from "@/features/admin";

- import { DashboardPresupuesto, CierreCostosMensual } from "@/features/presupuesto";
+ import { DashboardPresupuesto, CierreCostosMensual } from "@/features/presupuesto";
```

**Cases añadidos:**
```js
case "cierre_costos":
  return <CierreCostosMensual />;
case "costos_unidad":
  return <CostosPorUnidad />;
```

### `src/shared/ui/Navbar.jsx`

**Tabs añadidos en rol `administrador`:**
```js
{ label: "Costos por Unidad", name: "costos_unidad",  icon: icons.management },
{ label: "Cierre de Costos",  name: "cierre_costos",  icon: icons.invoices   },
```

**Tab añadido en rol `jefe_de_planta`:**
```js
{ label: "Cierre de Costos", name: "cierre_costos", icon: icons.invoices },
```

---

## Verificación

### Build
```
✓ built in 30.93s
Bundle principal: 1,221 kB (Sprint B baseline: 1,190 kB, delta: +31 kB)
```
Sin errores de compilación. Los warnings de chunks son pre-existentes (exceljs, vendor-charts).

### Funcional
- **C1:** Admin puede ver tabla de costos por unidad filtrando por mes y servicio.
  Raciones reales se muestran correctamente. Costo = 0 mientras no se vincule
  `menu_componente_id` en ítems de pedido (aviso mostrado en UI).
- **C2:** DashboardPresupuesto muestra varianza por categoría. Sin presupuesto → valores
  en 0 (esperado). Botón "Auto-estimar" pre-carga valores del mes anterior.
- **C3:** CierreCostosMensual consolida facturas + consolidados + gasto real en un solo
  informe. Exportación PDF funcional vía import dinámico.

---

## Archivos Modificados / Creados

| Tipo | Archivo |
|------|---------|
| 🆕 Nuevo | `src/features/admin/services/costosPorUnidadService.js` |
| 🆕 Nuevo | `src/features/admin/hooks/useCostosPorUnidad.js` |
| 🆕 Nuevo | `src/features/admin/components/CostosPorUnidad.jsx` |
| 🆕 Nuevo | `src/features/presupuesto/hooks/useCierreCostos.js` |
| 🆕 Nuevo | `src/features/presupuesto/components/CierreCostosMensual.jsx` |
| ✏️ Modificado | `src/features/admin/index.js` |
| ✏️ Modificado | `src/features/presupuesto/index.js` |
| ✏️ Modificado | `src/features/presupuesto/components/DashboardPresupuesto.jsx` |
| ✏️ Modificado | `src/router/rolerouter.jsx` |
| ✏️ Modificado | `src/shared/ui/Navbar.jsx` |
| 🗄️ SQL | Migración `fn_costos_por_unidad_v2` aplicada en Supabase |
