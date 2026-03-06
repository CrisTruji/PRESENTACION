# Sprint H — Estado de Pago de Facturas

**Fecha:** 2026-03-06
**Estado:** ✅ Completado
**Build:** ✅ Sin errores (53.24s)

---

## Problema resuelto

La tabla `facturas` solo tenía `estado_recepcion` y `estado_procesamiento`.
No existía forma de saber si una factura había sido pagada.
El área de compras no podía hacer seguimiento de pagos pendientes, ni filtrar
por estado para identificar cuánto dinero estaba pendiente de desembolso.

---

## Archivos modificados

| Archivo | Acción |
|---------|--------|
| Supabase BD (migración `sprint_h_estado_pago_facturas`) | ALTER TABLE facturas |
| `src/features/warehouse/services/facturasService.js` | Nuevas funciones `marcarEstadoPago` + `getResumenPagosPendientes` |
| `src/features/warehouse/components/Facturas.jsx` | Columna Pago + banner resumen + filtro + popover inline |

---

## H1 — Migración SQL

```sql
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente', 'pagada', 'en_disputa')),
  ADD COLUMN IF NOT EXISTS fecha_pago  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notas_pago  TEXT;

CREATE INDEX IF NOT EXISTS idx_facturas_estado_pago ON facturas(estado_pago);

UPDATE facturas SET estado_pago = 'pendiente' WHERE estado_pago IS NULL;
```

**Estados posibles:**
| Estado | Descripción |
|--------|-------------|
| `pendiente` | Default; la factura fue recibida pero aún no pagada |
| `pagada` | La factura fue cancelada; se registra `fecha_pago` automáticamente |
| `en_disputa` | Hay una discrepancia o reclamación con el proveedor |

---

## H2 — facturasService.js

### `marcarEstadoPago(facturaId, estadoPago, notasPago)`
```js
export async function marcarEstadoPago(facturaId, estadoPago, notasPago = null) {
  return supabaseRequest(
    supabase.from('facturas').update({
      estado_pago: estadoPago,
      fecha_pago: estadoPago === 'pagada' ? new Date().toISOString() : null,
      notas_pago: notasPago || null,
    }).eq('id', facturaId).select('id, estado_pago, fecha_pago, notas_pago').single()
  );
}
```
- Si `estadoPago === 'pagada'` → registra `fecha_pago = now()`
- Si cambia de 'pagada' a otro estado → borra `fecha_pago`

### `getResumenPagosPendientes()`
```js
export async function getResumenPagosPendientes() {
  // Retorna { count: number, total: number }
  // Total de facturas en estado 'pendiente' o 'en_disputa'
}
```

---

## H3 — Facturas.jsx

### Banner de alerta (encima de filtros)
```
⏰ 47 facturas pendientes de pago
   Total: $COP 8.450.000        [Ver pendientes →]
```
- Solo se muestra cuando `resumenPendiente.count > 0`
- El enlace "Ver pendientes →" activa automáticamente el filtro `estado_pago = pendiente`
- Se recarga después de cada cambio de estado de pago

### Filtro por estado de pago
- Cuarto select en la barra de filtros
- Opciones: Todos los pagos / Pendiente / Pagada / En disputa
- Icono `CreditCard` como indicador visual

### Columna "Pago" en la tabla
- Badge coloreado con estado:
  - 🟡 Pendiente — ámbar
  - 🟢 Pagada — verde
  - 🔴 En disputa — rojo
- Tooltip con notas si existen (`title={factura.notas_pago}`)
- Solo clickeable para roles: `administrador`, `jefe_de_compras`, `auxiliar_de_compras`

### Popover de edición inline (mismo patrón que romaneo)
Al hacer clic en el badge (si tiene permisos), la celda se transforma en:
```
[ Pendiente ] [ Pagada ] [ En disputa ]   ← selector de estado
[  Notas (opcional)...                ]   ← input de texto
[   ✓ Guardar   ] [   ✗ Cancelar   ]      ← acciones
```

### Lógica de permisos
```js
const puedeEditarPago =
  roleName === "administrador" ||
  roleName === "jefe_de_compras" ||
  roleName === "auxiliar_de_compras";
```

---

## Flujo completo

1. Almacenista recibe factura → `estado_pago` = `pendiente` (automático)
2. Compras ve la lista con badge ámbar en cada factura sin pagar
3. Compras hace clic en badge → selecciona `pagada` → escribe referencia pago (opcional) → Guardar
4. Badge cambia a verde; `fecha_pago` queda registrada en BD
5. Si hay disputa → selecciona `en_disputa` → badge rojo

---

## Verificación

```
✓ built in 53.24s
```

### Pruebas manuales recomendadas

1. **Banner de pendientes:** Abrir Facturas como administrador → si existen facturas, debe aparecer el banner con el conteo y total
2. **Filtro:** Seleccionar "Pendiente" en el nuevo select → tabla filtra solo facturas sin pagar
3. **Ver pendientes:** Clic en "Ver pendientes →" del banner → filtra automáticamente
4. **Cambiar estado:** Con rol `administrador`, clic en badge ámbar → selector de estado → elegir "Pagada" → Guardar → badge cambia a verde
5. **Con notas:** Registrar nota al pagar → verificar que el `title` del badge muestra la nota
6. **Sin permiso:** Con rol `almacenista`, el badge debe mostrarse pero no ser clickeable (sin cursor de pointer)
7. **BD:** Verificar en Supabase: `SELECT id, numero_factura, estado_pago, fecha_pago, notas_pago FROM facturas ORDER BY updated_at DESC LIMIT 5;`

---

## Notas técnicas

- La actualización del estado de pago se hace directamente con `supabase.update()` en el componente (no usa React Query) — consistente con el patrón existente del componente `Facturas.jsx`
- El resumen de pendientes (`cargarResumenPendiente`) ejecuta una query separada ligera (solo `valor_total`) que no interfiere con la paginación principal
- `fecha_pago` se asigna automáticamente cuando `estado_pago === 'pagada'` y se borra cuando se cambia a otro estado
- `colSpan` de filas vacías / loading actualizado de 6 a 7 para contemplar la nueva columna
