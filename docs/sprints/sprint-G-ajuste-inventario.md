# Sprint G — Inventario: Ajustes con Motivo + Historial de Movimientos

**Fecha:** 2026-03-06
**Estado:** ✅ Completado
**Build:** ✅ Sin errores

---

## Problema resuelto

El `StockManager` permitía incrementar, decrementar o establecer stock sin registrar *por qué* cambió.
Los movimientos en la base de datos no tenían contexto (merma, pérdida, ajuste físico, etc.).
Tampoco existía ninguna pantalla para consultar el historial de movimientos de un ingrediente específico.

---

## Hallazgos de investigación

### Incompatibilidad de tipos en BD
- `arbol_materia_prima.id` → **UUID**
- `movimientos_inventario.producto_id` → **BIGINT**
- La función `actualizar_stock` recibe `p_stock_id UUID` pero **no insertaba** en `movimientos_inventario`
- Solución: crear nueva tabla `ajustes_stock_manual` con `producto_id UUID`

---

## Archivos modificados / creados

| Archivo | Acción |
|---------|--------|
| Supabase BD (migración `sprint_g_ajuste_inventario`) | ALTER TABLE + CREATE TABLE + UPDATE FUNCTION |
| `src/features/inventory/services/stockService.js` | Actualizado `actualizarStock` + nuevo `getHistorialMovimientos` |
| `src/features/inventory/hooks/useStock.js` | Actualizado `useActualizarStock` + nuevo `useHistorialMovimientos` |
| `src/features/inventory/index.js` | Export `useHistorialMovimientos` |
| `src/features/inventory/components/StockManager.jsx` | Motivo + notas en modal + botón historial |
| `src/features/inventory/components/HistorialMovimientos.jsx` | NUEVO — drawer de historial |

---

## G1 — Migración SQL

### Cambios en `movimientos_inventario`
```sql
ALTER TABLE movimientos_inventario
  ADD COLUMN IF NOT EXISTS motivo TEXT;
```

### Nueva tabla `ajustes_stock_manual`
```sql
CREATE TABLE IF NOT EXISTS ajustes_stock_manual (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id    UUID NOT NULL REFERENCES arbol_materia_prima(id),
  tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN ('incrementar','decrementar','establecer')),
  cantidad       NUMERIC NOT NULL,
  stock_anterior NUMERIC,
  stock_posterior NUMERIC,
  motivo         TEXT,
  notas          TEXT,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE ajustes_stock_manual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ajustes_select_all" ON ajustes_stock_manual
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ajustes_insert_roles" ON ajustes_stock_manual
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles WHERE id = auth.uid()
      AND rol IN ('administrador','almacenista','jefe_de_planta')
    )
  );
```

### Función `actualizar_stock` actualizada
```sql
CREATE OR REPLACE FUNCTION public.actualizar_stock(
  p_stock_id  UUID,
  p_cantidad  NUMERIC,
  p_operacion VARCHAR DEFAULT 'incrementar',
  p_motivo    TEXT    DEFAULT NULL,
  p_notas     TEXT    DEFAULT NULL,
  p_user_id   UUID    DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, nuevo_stock NUMERIC, mensaje TEXT)
```
- Acepta `p_motivo`, `p_notas`, `p_user_id` (todos opcionales con DEFAULT NULL)
- Después de actualizar `stock_actual`, INSERT en `ajustes_stock_manual`

---

## G3 — stockService.js

### `actualizarStock` (actualizado)
```js
async actualizarStock(stockId, cantidad, operacion = 'incrementar', motivo = null, notas = null) {
  return supabaseRequest(
    supabase.rpc('actualizar_stock', {
      p_stock_id:  stockId,
      p_cantidad:  cantidad,
      p_operacion: operacion,
      p_motivo:    motivo,
      p_notas:     notas,
    })
  );
}
```

### `getHistorialMovimientos` (nuevo)
- Consulta paralela de dos fuentes:
  1. `ajustes_stock_manual` — ajustes manuales (UUID-based, fuente primaria)
  2. `movimientos_inventario` — entradas de facturas (intentado, puede estar vacío por tipo mismatch)
- Normaliza y unifica en formato común: `{ id, fecha, tipo, motivo, notas, cantidad, stock_anterior, stock_posterior, origen }`
- Ordena por fecha descendente, límite 100 registros

---

## G3b — useStock.js

### `useActualizarStock` (actualizado)
```js
mutationFn: ({ stockId, cantidad, operacion, motivo, notas }) =>
  stockService.actualizarStock(stockId, cantidad, operacion, motivo, notas),
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['stock'] });
  queryClient.invalidateQueries({ queryKey: ['historial-movimientos'] });
}
```

### `useHistorialMovimientos` (nuevo)
```js
export function useHistorialMovimientos(materiaPrimaId, fechaDesde, fechaHasta) {
  return useQuery({
    queryKey: ['historial-movimientos', materiaPrimaId, fechaDesde, fechaHasta],
    queryFn:  () => stockService.getHistorialMovimientos(materiaPrimaId, fechaDesde, fechaHasta),
    select:   (response) => response.data,
    enabled:  !!materiaPrimaId,
    staleTime: 30_000,
  });
}
```

---

## G2 — StockManager.jsx

### Nuevos imports
```js
import { ..., ClipboardList } from 'lucide-react';
import HistorialMovimientos from './HistorialMovimientos';
```

### `MOTIVOS_AJUSTE` (constante)
```js
const MOTIVOS_AJUSTE = [
  { value: 'merma',              label: 'Merma' },
  { value: 'perdida',            label: 'Pérdida' },
  { value: 'vencimiento',        label: 'Vencimiento' },
  { value: 'ajuste_fisico',      label: 'Ajuste físico' },
  { value: 'consumo_produccion', label: 'Consumo producción' },
  { value: 'otro',               label: 'Otro' },
];
```

### Nuevos estados
```js
const [motivo,       setMotivo]       = useState('');
const [notas,        setNotas]        = useState('');
const [historialItem, setHistorialItem] = useState(null);
```

### Validación motivo (antes de mutate)
```js
if ((operacion === 'decrementar' || operacion === 'establecer') && !motivo) {
  notify.error('Selecciona un motivo para este ajuste');
  return;
}
```

### Campos agregados al modal
- **Select "Motivo"** — visible solo cuando `operacion === 'decrementar' || operacion === 'establecer'`
- **Textarea "Notas"** — opcional, siempre visible

### Botón historial en `FilaStock`
- Icono `ClipboardList` junto al botón "Actualizar"
- `onClick={() => onHistorial(item)` abre el drawer

### Drawer al final del componente
```jsx
{historialItem && (
  <HistorialMovimientos
    item={historialItem}
    onClose={() => setHistorialItem(null)}
  />
)}
```

---

## G4 — HistorialMovimientos.jsx (nuevo)

Drawer lateral que muestra el historial de movimientos de un ingrediente.

### Estructura visual
```
┌──────────────────────────────────────────────┐
│ 📋 Nombre del ingrediente     [COD-001]   [X] │
│ Últimos: [7 días] [30 días] [90 días]  [Excel]│
│ Stock actual: 25.5 kg  │ Mínimo: 5  │ Movs: 8│
├──────────────────────────────────────────────┤
│ ↑ Entrada   +12 kg (13.5 → 25.5)   Factura  │
│   07/03/26 08:00                     #F-0042  │
│ ↓ Salida    −5 kg  (30 → 25)        Merma   │
│   06/03/26 14:30   Ajuste manual             │
│ = Ajuste    =25 kg (0 → 25)                  │
│   01/03/26 09:15   Ajuste físico             │
└──────────────────────────────────────────────┘
```

### Color coding
| Tipo | Color |
|------|-------|
| entrada | 🟢 verde |
| salida | 🔴 rojo |
| ajuste | 🟡 ámbar |

### Funcionalidades
- **Filtro de rango:** 7 / 30 / 90 días (toggle de botones)
- **Resumen:** Stock actual, stock mínimo, cantidad de movimientos
- **Lista:** Fecha, tipo con ícono, cantidad con signo (+ / −), stock anterior → posterior, motivo (tag), origen
- **Export Excel:** Botón "Excel" usando `exportarExcel()` de `@/features/informes/services/exportador`
- **Estado vacío:** Mensaje descriptivo cuando no hay movimientos en el rango

---

## Verificación

```
✓ built in 56.39s
```

### Pruebas manuales recomendadas

1. **Ajuste con motivo obligatorio:**
   - Abrir StockManager → Decrementar stock de cualquier ingrediente
   - Intentar guardar sin seleccionar motivo → debe aparecer toast de error
   - Seleccionar "Merma" → guardar → verificar en Supabase tabla `ajustes_stock_manual`

2. **Notas opcionales:**
   - Incrementar stock (sin motivo requerido) con y sin notas → ambos deben funcionar

3. **Historial:**
   - Clic en ícono 📋 de cualquier ingrediente
   - Verificar que el drawer se abre con el nombre correcto
   - Cambiar entre 7/30/90 días → los datos deben actualizarse
   - Verificar que ajustes manuales aparecen con motivo correcto

4. **Export Excel:**
   - Con movimientos cargados → clic en "Excel" → debe descargarse archivo `.xlsx`
   - Sin movimientos → botón Excel debe estar deshabilitado

---

## Notas técnicas

- **Fuente dual de datos:** El historial combina `ajustes_stock_manual` (UUID, primaria) y `movimientos_inventario` (intenta, puede estar vacío). En el futuro, cuando `movimientos_inventario` se migre a UUID, ambas fuentes estarán disponibles.
- **staleTime 30s:** El historial no se refresca continuamente para evitar queries innecesarios; se invalida automáticamente después de cada ajuste de stock.
- **Motivo en modo "establecer":** También requiere motivo para tener trazabilidad de por qué se corrigió el stock a un valor específico.
