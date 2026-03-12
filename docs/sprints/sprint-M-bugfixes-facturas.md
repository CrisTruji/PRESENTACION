# Sprint M — Bugfixes Sistema de Facturas

**Fecha:** 2026-03-11
**Rama:** main
**Estado:** Completado

---

## Objetivo

Corregir los bugs y problemas de diseño identificados durante el análisis del sistema de facturas (ver `DOCUMENTACION_FACTURAS.md`). Se priorizaron los bugs que afectan la visibilidad de errores al usuario y el rendimiento de consultas.

---

## Archivos Modificados

| Archivo | Tipo de cambio |
|---------|----------------|
| `src/features/warehouse/services/facturasService.js` | Bug fix crítico (F01) + Optimización (F04) |
| `src/features/warehouse/components/RecepcionFactura.jsx` | Bug fix (F01) + UX (F02) |
| `src/features/warehouse/components/Facturas.jsx` | Bug fix (F03) + Feature (F06) |
| `src/features/warehouse/index.js` | Exportar funciones faltantes |

---

## Bugs Corregidos

### Bug M-01 — `registrarRecepcionFactura` reporta éxito aunque el stock falle (CRÍTICO)

**Archivos:** `facturasService.js` + `RecepcionFactura.jsx`
**Severidad:** ALTA — el usuario veía "Stock actualizado para X productos" aunque el RPC fallara

**Problema:**
```javascript
// ANTES: stockResult era null si el RPC fallaba, pero el mensaje decía lo contrario
return {
  success: true,
  mensaje: `Recepción registrada. Stock actualizado para ${itemsConPresentacion.length} productos.`
  // ↑ MENTIRA cuando stockError ocurrió
};
```

**Solución:**
- Agrega variables `stockFallido` y `stockErrorMsg` para rastrear el resultado del RPC
- Marca la factura como `completado` cuando el stock sí se procesa (antes quedaba en `pendiente`)
- Agrega campos `stock_error` y `stock_error_msg` al objeto retornado
- El mensaje ahora refleja la realidad: error indica que se puede reintentar desde Facturas

```javascript
// DESPUÉS: El return distingue entre éxito y fallo de stock
return {
  success: true,
  stock_error: stockFallido,       // ← NUEVO
  stock_error_msg: stockErrorMsg,  // ← NUEVO
  mensaje: stockFallido
    ? `Recepción registrada. El stock NO se actualizó. Puede reintentar desde Facturas.`
    : `Recepción registrada. Stock actualizado para ${n} producto(s).`
};
```

**En `RecepcionFactura.jsx`:** El handler `guardarRecepcion()` ahora usa `notify.warning()` cuando `resultado.stock_error === true` en lugar de `notify.success()` con mensaje falso.

---

### Bug M-02 — Sin aviso cuando items no tienen presentación vinculada (MODERADO)

**Archivo:** `RecepcionFactura.jsx` — `DetalleModal` (sección resumen)
**Severidad:** MEDIA — el usuario no sabía qué productos NO actualizarían stock

**Solución:** Se agrega un aviso de advertencia en el resumen del modal cuando hay items sin `presentacion_id` y el proveedor sí tiene presentaciones configuradas:

```jsx
{presentacionesProveedor.length > 0 &&
  itemsRecepcion.length > itemsConPresentacion.length && (
  <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-base text-sm text-warning">
    <AlertTriangle size={16} className="inline mr-1" />
    {itemsRecepcion.length - itemsConPresentacion.length} producto(s) sin presentación asignada
    — su stock NO se actualizará. Asigna presentación en la tabla si corresponde.
  </div>
)}
```

---

### Bug M-03 — `marcarEstadoPago` en service es código muerto (BAJO)

**Archivos:** `warehouse/index.js` + `Facturas.jsx`
**Severidad:** BAJA — duplicación de lógica, sin impacto funcional inmediato

**Problema:** `Facturas.jsx` llamaba a `supabase` directamente para cambiar el estado de pago, ignorando la función `marcarEstadoPago` del service que hace exactamente lo mismo.

**Solución:**
1. Se exporta `marcarEstadoPago` y `getResumenPagosPendientes` desde `warehouse/index.js`
2. `Facturas.jsx` importa y usa `marcarEstadoPago` del service en `aplicarCambioPago()`

---

### Bug M-04 — N+1 queries en `getPresentacionesPorProveedor` (PERFORMANCE)

**Archivo:** `facturasService.js`
**Severidad:** MEDIA — generaba 1 + N queries DB (una por cada presentación del proveedor)

**Problema:**
```javascript
// ANTES: Promise.all con .map = 1 query por presentación
const presentacionesConProducto = await Promise.all(
  (data || []).map(async (item) => {
    const { data: producto } = await supabase
      .from('arbol_materia_prima')
      .eq('id', item.presentacion.parent_id)
      .single(); // ← Una query por item
  })
);
```

**Solución:** 2 queries totales en lugar de N+1:
1. Query 1: Obtiene todas las presentaciones del proveedor
2. Recolecta todos los `parent_id` únicos en un `Set`
3. Query 2: Obtiene todos los productos padre en una sola llamada con `.in('id', parentIds)`
4. Combina los resultados en memoria con `map()`

```javascript
// DESPUÉS: Solo 2 queries para cualquier número de presentaciones
const parentIds = [...new Set(items.filter(i => i.presentacion?.parent_id).map(i => i.presentacion.parent_id))];

const { data: productos } = await supabase
  .from('arbol_materia_prima')
  .select('id, codigo, nombre, unidad_stock, costo_promedio, stock_actual')
  .in('id', parentIds); // ← Una sola query para todos

return items.map(item => ({
  ...item,
  producto: productosMap[item.presentacion?.parent_id] || null
}));
```

---

## Feature Agregada

### Feature M-F06 — Botón "Reintentar Stock" en Facturas (DISEÑO-F06)

**Archivo:** `Facturas.jsx`
**Descripción:** Las facturas con `estado_procesamiento === 'error'` ahora muestran:
1. **Badge de estado** bajo el número de factura (color rojo para error, ámbar para pendiente)
2. **Botón de reintento** (ícono `RefreshCw` ámbar) en la columna de acciones
3. Al hacer clic, llama a `reintentarProcesamientoStock(facturaId)` del service
4. Si el reintento tiene éxito, actualiza el badge a verde ("Stock OK") en la UI sin recargar

**Constante `PROC_META`** agregada para los badges de estado de procesamiento (similar a `PAGO_META` para pagos):
- `pendiente` → ámbar
- `completado` → verde (solo visible en el badge — el botón no aparece)
- `error` → rojo + botón de reintento
- `procesando` → azul + spinner

---

## Notas Técnicas

- `getResumenPagosPendientes` también se exporta desde `warehouse/index.js` para uso futuro
- El botón de reintento tiene estado de loading por factura individual (`loadingRetry === factura.id`)
- El badge de `completado` no se muestra en la tabla (solo errores/pendientes son relevantes para el usuario)
- La validación del catch block en `handleReintentarStock` recarga los datos para mostrar el estado real si el reintento falla

---

## Recomendación de Commit

```
fix(warehouse): corregir bugs críticos en sistema de facturas

- registrarRecepcionFactura: exponer stock_error en retorno y marcar
  factura como completado cuando el stock sí se procesa
- RecepcionFactura: manejar stock_error con notify.warning en lugar
  de success falso
- RecepcionFactura: aviso visual cuando items no tienen presentación
  vinculada (BUG-F02)
- Facturas: usar marcarEstadoPago del service (eliminar lógica duplicada)
- Facturas: badge de estado_procesamiento + botón Reintentar Stock
- getPresentacionesPorProveedor: reemplazar N+1 con 2 queries (IN)
- warehouse/index.js: exportar marcarEstadoPago y getResumenPagosPendientes
```
