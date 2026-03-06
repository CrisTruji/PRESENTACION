# Sprint J — Proyección Automática de Compras

**Fecha:** 2026-03-06
**Estado:** ✅ Completado
**Build:** ✅ Sin errores (29.04s)

---

## Problema resuelto

Las solicitudes de compra eran 100% manuales. El jefe de compras no tenía visibilidad
de qué ingredientes necesitaba comprar basándose en el menú planificado vs. el stock actual.
Dependía de su memoria o revisión manual del inventario.

---

## Solución implementada

Nueva pantalla **Proyección de Compras** accesible desde `jefe_de_compras` y `jefe_de_planta`.
Calcula automáticamente los ingredientes necesarios para los próximos 7/14/30 días
recorriendo los ciclos de menú activos y comparando con el stock disponible.

### Flujo

```
ciclos_menu activos
  ↓
Para cada día futuro → número de día en ciclo → ciclo_dia_servicios
  ↓
menu_componentes → recetas → receta_ingredientes.cantidad_requerida × capacidad_promedio
  ↓
Comparar con arbol_materia_prima.stock_actual
  ↓
Mostrar déficit + prioridad (crítico / bajo / ok)
  ↓
[Exportar CSV] o [Crear solicitud → CrearSolicitud.jsx]
```

---

## Archivos modificados/creados

| Archivo | Acción |
|---------|--------|
| Supabase BD (migración `sprint_j_calcular_necesidades_compra_v3_fix_ambiguity`) | NUEVA función SQL |
| `src/features/purchases/services/proyeccionComprasService.js` | NUEVO |
| `src/features/purchases/hooks/useProyeccionCompras.js` | NUEVO |
| `src/features/purchases/components/ProyeccionCompras.jsx` | NUEVO |
| `src/features/purchases/index.js` | MODIFICADO — export ProyeccionCompras |
| `src/router/rolerouter.jsx` | MODIFICADO — import + case "proyeccion_compras" |
| `src/shared/ui/Navbar.jsx` | MODIFICADO — entrada en jefe_de_compras (pos 2) y jefe_de_planta |
| `src/lib/supabaseRequest.js` | CORREGIDO — `\n` literal al final del archivo |

---

## J1 — Función SQL `calcular_necesidades_compra(p_dias_adelante INT)`

### Firma y columnas retornadas
```sql
CREATE FUNCTION calcular_necesidades_compra(p_dias_adelante INT DEFAULT 7)
RETURNS TABLE(
  materia_prima_id   BIGINT,
  codigo             TEXT,
  nombre             TEXT,
  unidad_medida      TEXT,
  cantidad_requerida NUMERIC,   -- total necesario para los próximos X días
  stock_actual       NUMERIC,   -- stock en arbol_materia_prima
  deficit            NUMERIC,   -- stock_actual - cantidad_requerida (negativo = falta)
  costo_estimado     NUMERIC,   -- déficit × costo_promedio
  prioridad          TEXT,      -- 'critico' | 'bajo' | 'ok'
  fuente             TEXT       -- 'menu' | 'stock_minimo'
)
```

### Lógica en dos partes

**Parte 1 — Proyección de menú (`fuente = 'menu'`):**
- Ciclos activos (`ciclos_menu.activo = true`) con longitud dinámica via `MAX(numero_dia)`
- Para cada día futuro en [0, p_dias_adelante): calcula `numero_dia_ciclo = ((dia_actual + offset - 1) % duracion) + 1`
- LEFT JOIN a `servicios_unidad` para obtener capacidad (COALESCE a 1 si no hay dato)
- Suma `receta_ingredientes.cantidad_requerida × capacidad_promedio`
- Excluye días donde ya existe un pedido enviado (no borrador)

**Parte 2 — Stock mínimo (`fuente = 'stock_minimo'`):**
- Ingredientes donde `stock_actual < stock_minimo`
- Solo si NO aparecen ya en la proyección de menú
- `cantidad_total = stock_minimo * 2 - stock_actual`

**Clasificación prioridad:**
```
stock_actual <= 0              → critico
stock_actual < requerido * 20% → critico
stock_actual < requerido       → bajo
stock_actual >= requerido      → ok
```

### Correcciones vs. borrador inicial
| Campo | Borrador | Corrección aplicada |
|-------|----------|---------------------|
| Columna cantidad | `ri.cantidad` | `ri.cantidad_requerida` (nombre real en BD) |
| Filtro ciclos activos | `cm.estado = 'activo'` | `cm.activo = true` (campo real en BD) |
| Join servicios_unidad | INNER JOIN | LEFT JOIN + COALESCE(capacidad, 1) |
| Longitud ciclo | hardcoded 14 | `MAX(cds.numero_dia)` dinámico |
| Unidad de medida | `unidad_base` | `COALESCE(unidad_medida, unidad_stock, '')` |
| Columna extra | — | `costo_estimado` + `fuente` |
| Función SQL | LANGUAGE plpgsql (ambigüedad columnas) | LANGUAGE sql (sin variables ambiguas) |

---

## J2 — Servicio y Hook

### `proyeccionComprasService.js`
```js
export async function getProyeccionCompras(diasAdelante = 7) {
  return supabaseRequest(
    supabase.rpc('calcular_necesidades_compra', { p_dias_adelante: diasAdelante })
  );
}
```

### `useProyeccionCompras.js`
```js
export function useProyeccionCompras(diasAdelante = 7) {
  return useQuery({
    queryKey: ['proyeccion-compras', diasAdelante],
    queryFn: async () => {
      const { data, error } = await getProyeccionCompras(diasAdelante);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,  // 10 min
  });
}
```

---

## J3 — ProyeccionCompras.jsx

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  Proyección de Compras    [7 días | 14 días | 30 días] [↺] [CSV]│
│  Basado en ciclos de menú activos vs. stock actual               │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ N crítico│  │ N bajo   │  │ N suficiente │  │ $Costo est.│  │
│  └──────────┘  └──────────┘  └──────────────┘  └────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ Prioridad │ Ingrediente   │ Ud  │ Necesario │ Stock │ Déficit  │ Costo est. │ Fuente │
│ 🔴 Crítico│ Pollo pecho   │  g  │ 10,000.00 │ 80.00 │-9,920.00 │ $...       │ Menú   │
│ 🟡 Bajo   │ Arroz blanco  │  g  │   200.00  │ 80.00 │  -120.00 │ $...       │ Menú   │
│ 🟢 Ok     │ Aceite        │  mL │   100.00  │500.00 │  +400.00 │    —       │ Menú   │
└──────────────────────────────────────────────────────────────────┘
     N ingredientes requieren reposición — $Costo total    [Crear solicitud →]
```

### Funcionalidades
- Selector de días con botones (7/14/30) — recalcula al cambiar
- Botón refrescar con spinner animado durante fetch
- Export CSV: genera archivo `proyeccion-compras-Ndias.csv` con BOM UTF-8
- Tabla con badge de prioridad (rojo/amarillo/verde), código en monospace
- Columna "Fuente" distingue `Menú` vs `Stock min.` con badge de color
- Estado vacío: mensaje de stock suficiente
- Footer CTA: navega a `crear_solicitud` (pantalla existente)

### Componente auxiliar `StatCard`
Props: `label`, `value`, `color` ('error'|'warning'|'success'|'primary'), `icon`, `desc`, `small`

---

## J4 — Router + Navbar

### `rolerouter.jsx`
```jsx
// Import (grupo purchases):
import { ..., ProyeccionCompras } from "@/features/purchases";

// Case:
case "proyeccion_compras":
  return <ProyeccionCompras />;
```

### `Navbar.jsx` — `jefe_de_compras`
```js
jefe_de_compras: [
  { label: "Gestión de Compras",    name: "gestion_compras",    icon: icons.management },
  { label: "Proyección de Compras", name: "proyeccion_compras", icon: icons.consolidado }, // ← NUEVO
  { label: "Solicitudes",           name: "solicitudes_planta", icon: icons.requests },
  { label: "Facturas",              name: "facturas",           icon: icons.invoices },
],
```

### `Navbar.jsx` — `jefe_de_planta`
```js
{ label: "Proyección MP",      name: "proyeccion_semanal",  icon: icons.management },
{ label: "Proyección Compras", name: "proyeccion_compras",  icon: icons.consolidado }, // ← NUEVO
```

---

## Corrección adicional: `src/lib/supabaseRequest.js`

El archivo tenía un `\n` literal al final (caracteres `\` + `n`) causando error de Rollup
("Expected unicode escape"). Estaba presente antes del Sprint J; se detectó durante el build.

```js
// Antes (corrupto):
export { supabaseRequest } from '@/shared/api';\n

// Después (correcto):
export { supabaseRequest } from '@/shared/api';
```

---

## Verificación

```
✓ built in 29.04s
```

### SQL directo
```sql
-- Ver proyección a 7 días
SELECT codigo, nombre, unidad_medida, cantidad_requerida, stock_actual, deficit, prioridad, fuente
FROM calcular_necesidades_compra(7)
ORDER BY deficit ASC
LIMIT 20;

-- Verificar con 30 días
SELECT COUNT(*) AS total,
       COUNT(CASE WHEN prioridad='critico' THEN 1 END) AS criticos,
       SUM(costo_estimado) AS costo_total
FROM calcular_necesidades_compra(30);
```

### Pruebas manuales recomendadas

1. **Acceso desde jefe_de_compras**: verificar que "Proyección de Compras" aparece en el sidebar (posición 2)
2. **Acceso desde jefe_de_planta**: verificar que aparece tras "Proyección MP"
3. **Selector de días**: cambiar de 7 a 14 y 30 días y ver que la tabla se recalcula
4. **Export CSV**: descargar y verificar que abre correctamente en Excel con caracteres correctos
5. **Estado vacío**: si no hay ciclos activos o todo está bien stocked, debe mostrar el mensaje de stock suficiente
6. **Botón Crear solicitud**: debe navegar a la pantalla de CrearSolicitud

---

## Notas técnicas

- **`LANGUAGE sql` vs `LANGUAGE plpgsql`**: La función usa SQL puro para evitar la ambigüedad entre las variables de retorno (como `materia_prima_id`) y los alias de columna en las CTEs. PL/pgSQL genera conflicto con variables de la cláusula RETURNS TABLE.
- **LEFT JOIN en servicios_unidad**: Permite proyectar ingredientes aunque no todos los servicios tengan `servicios_unidad` configurado. COALESCE(capacidad, 1) asegura que la cantidad no sea cero.
- **Longitud dinámica del ciclo**: `MAX(numero_dia)` evita asumir ciclos de 14 días — funciona con cualquier longitud.
- **Doble fuente**: `fuente='menu'` tiene prioridad; `fuente='stock_minimo'` es fallback para ingredientes bajo mínimo que no están en ningún menú activo.
- **Export CSV con BOM**: `'\uFEFF'` al inicio del blob asegura que Excel detecte UTF-8 correctamente para caracteres especiales (tildes, ñ).
