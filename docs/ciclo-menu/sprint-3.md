# Sprint 3 — Ciclos Menú: Árbol mejorado + Selector de variantes locales

**Fecha:** 2026-03-09
**Estado:** Completado

---

## Resumen

1. **SelectorReceta simplificado** — Solo muestra recetas estándar. Las variantes locales ya no aparecen en el picker de recetas.
2. **PanelIngredientes con selector de variantes** — En el tab "Ingredientes", ahora aparece un pill-selector para cambiar entre la receta estándar y sus variantes locales. Al seleccionar, se actualiza el menú componente automáticamente.
3. **Árbol de Recetas mejorado** — Búsqueda server-side (corrige el bug de >1000 recetas), al expandir una receta se muestran sus variantes locales y sus ingredientes en secciones visuales diferenciadas.

---

## Cambios Detallados

### 1. SelectorReceta simplificado

- Eliminada la sección "Recetas locales de tu unidad" pre-cargada
- Eliminada la dependencia `useRecetasLocalesOperacion` y prop `codigoUnidad`
- `buscarRecetas` ahora filtra `.eq('es_local', false)` para excluir locales de los resultados de búsqueda
- Interfaz más limpia: solo buscador + resultados estándar

### 2. PanelIngredientes — selector de variantes

Nuevo selector visual cuando una receta tiene variantes locales:

```
⭐ Variantes locales disponibles
[Estándar] [⭐ eiren] [⭐ carval] ...
```

- `recetaBaseId`: si la receta actual es local → usa `data.parent_id`; si es estándar → usa `data.id`
- Hook nuevo: `useVariantesLocalesReceta(recetaBaseId)` → busca `arbol_recetas WHERE parent_id=X AND es_local=true`
- Al seleccionar: llama `useActualizarReceta` + `actualizarRecetaDeComponente` (store action nueva) para actualizar el store sin recargar
- El selector se muestra si `tieneVariantes || data?.es_local` (tanto si estás en la estándar con locales, como si estás en una local)

### 3. Árbol de Recetas — mejoras

**Bug corregido: búsqueda devuelve "Sin resultados"**
- Causa: `getRecetasNivel2()` sin límite explícito → PostgREST retorna máximo 1000 filas; con 1860 recetas estándar, las del código "3.06..." quedaban fuera
- Fix: `.limit(2000)` en `getRecetasNivel2()`
- Fix adicional: búsqueda ahora es **server-side** (`buscarEstandar(termino)`) en vez de filtro en memoria

**Solo recetas estándar en root**
- `getRecetasNivel2()` agrega `.eq('es_local', false)` para excluir recetas locales del árbol raíz
- Las locales aparecen anidadas dentro de su receta padre cuando se expande

**Al expandir una receta → 2 secciones visuales:**
1. 🌟 **Variantes Locales** (fondo ámbar): lista de variantes con nombre, código y costo
2. 🧪 **Ingredientes** (fondo azul): lista con nombre, código de materia prima, cantidad y unidad

**Badge de locales**: las recetas que ya tienen variantes muestran un badge "⭐ N locales" en la fila del árbol.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/menu-cycles/components/SelectorReceta.jsx` | Simplificado; sin locales; solo búsqueda estándar |
| `src/features/menu-cycles/components/CicloEditor.jsx` | Eliminado prop `codigoUnidad` de SelectorReceta |
| `src/features/menu-cycles/components/PanelIngredientes.jsx` | Nuevo selector de variantes locales |
| `src/features/menu-cycles/services/menuComponentesService.js` | `buscarRecetas` con `es_local=false`; nuevo `getVariantesLocalesReceta` |
| `src/features/menu-cycles/hooks/useMenuComponentes.js` | Nuevo `useVariantesLocalesReceta` |
| `src/features/menu-cycles/store/useCicloEditorStore.js` | Nueva acción `actualizarRecetaDeComponente` |
| `src/features/products/services/arbolRecetasService.js` | `getRecetasNivel2` con `es_local=false` + `limit(2000)`; nuevo `buscarEstandar`; nuevo `getLocalesDeReceta` |
| `src/features/products/components/ArbolRecetas.jsx` | Reescrito: búsqueda server-side, expand muestra locales+ingredientes, badge de locales |
| `src/features/products/components/NodoArbol.jsx` | No modificado (lógica movida a ArbolRecetas) |

---

## Verificación

1. **SelectorReceta**: buscar "jugo de corozo" → debe mostrar solo "Jugo De Corozo" (estándar), NO la variante local
2. **PanelIngredientes**: seleccionar un componente con receta local → ver pill selector → cambiar entre estándar/local → ingredientes deben actualizarse
3. **Árbol búsqueda**: buscar "3.06.01.002" → debe encontrar "Jugo De Corozo"
4. **Árbol expandir**: expandir "Jugo De Corozo" → ver sección "Variantes Locales" con "Jugo De Corozo [Eiren]" y sección "Ingredientes"
5. **Badge locales**: "Jugo De Corozo" debe mostrar badge "⭐ 1 local" en el árbol
