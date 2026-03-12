# Sprint L — Bugfixes Consolidado de Producción

**Fecha:** 2026-03-11
**Rama:** main
**Estado:** Completado

---

## Objetivo

Corregir los bugs encontrados en el flujo de consolidado de producción tras el análisis de la sesión.

---

## Archivos Modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/features/food-orders/services/consolidadoService.js` | Bug fix crítico |
| `src/features/food-orders/components/ConsolidadoSupervisor.jsx` | Bug fix + UX |

---

## Bugs Corregidos

### Bug L-01 — RPC `descontar_stock_consolidado` sin verificación de error (CRÍTICO)

**Archivo:** `consolidadoService.js` → método `marcarPreparado()`
**Severidad:** ALTA — causaba inconsistencia de inventario

**Problema:**
```javascript
// ANTES (bug): El error del RPC se ignoraba silenciosamente
await supabase.rpc('descontar_stock_consolidado', { p_consolidado_id: consolidadoId });
// El consolidado se marcaba "completado" aunque el RPC fallara
```

**Solución:**
```javascript
// DESPUÉS (fix): Se verifica el error y se detiene si el RPC falla
const { error: rpcError } = await supabase
  .rpc('descontar_stock_consolidado', { p_consolidado_id: consolidadoId });

if (rpcError) {
  console.error('Error al descontar stock:', rpcError);
  return { data: null, error: rpcError };
}
// Solo se marca completado si el descuento de stock fue exitoso
```

**Impacto:** El stock ahora NO se marca completado si el RPC de descuento falla. El usuario verá el error en pantalla gracias al manejo en `handleMarcarPreparado()`.

---

### Bug L-02 — `window.confirm()` para re-generación de consolidado aprobado (MODERADO)

**Archivo:** `ConsolidadoSupervisor.jsx` → función `handleConsolidar()`
**Severidad:** BAJA-MEDIA — UX bloqueante, no moderno

**Problema:**
```javascript
// ANTES (bug): Dialog nativo bloqueante
if (!window.confirm('El consolidado ya fue aprobado...')) return;
```

**Solución:**
- Agregado estado `confirmarRegenerar`
- La función `handleConsolidar` ahora abre un modal propio cuando el estado es `aprobado`
- Extraída función `ejecutarConsolidar(forzar)` para evitar duplicación
- Agregado modal con diseño coherente al sistema (igual que el modal de aprobación)

---

### Bug L-03 — Clase CSS `text-muted` inválida (BAJO)

**Archivo:** `ConsolidadoSupervisor.jsx` — líneas 524 y 604
**Severidad:** BAJA — texto posiblemente no visible en algunos temas

**Problema:**
```jsx
// ANTES: clase no definida en el design system
className="text-muted"
```

**Solución:**
```jsx
// DESPUÉS: clase correcta del design system
className="text-text-muted"
```

---

## Notas Técnicas

- El manejo de errores del `marcarPreparado` en el componente ya estaba correctamente implementado — el fix solo fue en el servicio.
- La función `generarHojaProduccion()` en el PDF service no tiene try-catch interno, pero el call site (`handleExportarHojaProduccion`) ya lo maneja correctamente. No se modificó para no sobre-ingenierizar.
- El fallback JS de `getIngredientesTotales()` retorna array vacío en error — comportamiento intencionado para degradación suave cuando el RPC no está disponible.

---

## Recomendación de Commit

Los 3 bugs están relacionados con el mismo flujo. Se puede hacer un único commit:

```
fix(food-orders): corregir bugs críticos en consolidado de producción

- marcarPreparado: verificar error del RPC antes de actualizar estado
- ConsolidadoSupervisor: reemplazar window.confirm con modal propio
- ConsolidadoSupervisor: corregir clases CSS text-muted → text-text-muted
```
