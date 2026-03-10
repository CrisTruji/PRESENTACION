# Sprint 2 — Ciclos Menú: Correcciones y Recetas Locales Visibles

**Fecha:** 2026-03-09
**Estado:** Completado

---

## Resumen

Correcciones y mejoras al flujo de configuración de ciclos de menú (`src/features/menu-cycles/`):

1. **Fix BuscadorMateriaPrima** — Se eliminó el filtro `.like('codigo', '3%')` incorrecto que impedía buscar ingredientes en ModalRecetaLocal. El filtro de código '3' solo aplica a recetas (SelectorReceta), NO a ingredientes.
2. **Fix codigoUnidad** — Se corrigió el origen de `codigoUnidad`: antes usaba `cicloSeleccionado?.operacion?.codigo` (siempre `undefined`), ahora usa `operacionSeleccionada?.codigo` desde el store.
3. **Nomenclatura con nombre de unidad** — Las recetas locales ahora incluyen el **nombre** de la operación en su título, no solo el código. Ej: `Arroz con Pollo [Colegio San Juan]`.
4. **Recetas locales visibles** — En SelectorReceta, al abrir sin búsqueda, se muestran automáticamente las recetas locales de la unidad activa bajo la sección "Recetas locales de tu unidad".

---

## Cambios Detallados

### 1. Fix BuscadorMateriaPrima (ModalRecetaLocal.jsx)

**Problema:** El filtro `.like('codigo', '3%')` se había agregado erroneamente al query de ingredientes, bloqueando búsquedas como "papa" que no tienen código comenzando en '3'.

**Solución:** Eliminado el filtro del query de `BuscadorMateriaPrima`. La búsqueda de ingredientes no debe restringirse por código.

```js
// ANTES (roto):
.eq('nivel_actual', 5)
.like('codigo', '3%')   // ← INCORRECTO aquí

// DESPUÉS (correcto):
.eq('nivel_actual', 5)
// sin filtro de código para ingredientes
```

---

### 2. Fix codigoUnidad (ModalRecetaLocal.jsx)

**Problema:** `cicloSeleccionado?.operacion?.codigo` siempre era `undefined` porque `cicloSeleccionado` es el objeto de ciclo (no tiene propiedad `operacion`). Esto causaba que `codigoUnidad = null` siempre, generando recetas locales sin unidad asignada.

**Solución:** Cambiar al campo correcto del store.

```js
// ANTES (roto):
const { cerrarModalRecetaLocal, cicloSeleccionado } = useCicloEditorStore();
const codigoUnidad = cicloSeleccionado?.operacion?.codigo || null; // siempre null

// DESPUÉS (correcto):
const { cerrarModalRecetaLocal, operacionSeleccionada } = useCicloEditorStore();
const codigoUnidad = operacionSeleccionada?.codigo || null;
const operacionNombre = operacionSeleccionada?.nombre || null;
```

---

### 3. Nomenclatura con nombre de unidad

**Servicio:** `menuComponentesService.crearRecetaLocal` ahora acepta `operacionNombre` (4° parámetro).

```js
// ANTES:
const nombreLocal = `${recetaBase.nombre} (Local - ${codigoUnidad || 'MOD'})`;
// Ejemplo: "Arroz con Pollo (Local - OP-5)"

// DESPUÉS:
const etiquetaUnidad = operacionNombre || codigoUnidad || 'MOD';
const nombreLocal = `${recetaBase.nombre} [${etiquetaUnidad}]`;
// Ejemplo: "Arroz con Pollo [Colegio San Juan]"
```

El código de la receta sigue siendo `{codigo_base}-LOCAL-{codigoUnidad}` (sin cambios, es un identificador técnico).

---

### 4. Recetas Locales Visibles en SelectorReceta

**Nuevo servicio:** `menuComponentesService.getRecetasLocalesOperacion(codigoUnidad)`
- Retorna todas las recetas locales activas para la unidad dada (`es_local=true`, `codigo_unidad=X`)

**Nuevo hook:** `useRecetasLocalesOperacion(codigoUnidad)`

**SelectorReceta** actualizado:
- Acepta prop `codigoUnidad`
- Al abrir **sin búsqueda**: muestra sección "⭐ Recetas locales de tu unidad" con las recetas locales pre-cargadas
- Al **buscar**: muestra resultados normales (búsqueda sigue filtrando por `codigo like '3%'`, locales incluidas ya que su código empieza en '3')
- Badge "Local" visible en cada receta local

**CicloEditor** pasa `codigoUnidad={operacionSeleccionada?.codigo}` a SelectorReceta.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/menu-cycles/components/ModalRecetaLocal.jsx` | Eliminado filtro código '3%' de BuscadorMateriaPrima; fix codigoUnidad → operacionSeleccionada; pass operacionNombre a mutate |
| `src/features/menu-cycles/services/menuComponentesService.js` | crearRecetaLocal acepta operacionNombre; nomenclatura actualizada; +getRecetasLocalesOperacion |
| `src/features/menu-cycles/hooks/useMenuComponentes.js` | useCrearRecetaLocal pasa operacionNombre; +useRecetasLocalesOperacion |
| `src/features/menu-cycles/components/SelectorReceta.jsx` | Acepta codigoUnidad; sección de locales pre-cargadas; componente RecetaItem extraído |
| `src/features/menu-cycles/components/CicloEditor.jsx` | operacionSeleccionada desde store; pasa codigoUnidad a SelectorReceta |

---

## Verificación

1. **BuscadorMateriaPrima**: escribir "papa" en ModalRecetaLocal → debe mostrar resultados
2. **codigoUnidad correcto**: crear receta local → revisar en `arbol_recetas` que `codigo_unidad` tenga el código de la operación (no null)
3. **Nomenclatura**: nueva receta local debe llamarse `Nombre Base [Nombre Operación]`
4. **Recetas locales visibles**: abrir SelectorReceta → debe aparecer sección "Recetas locales de tu unidad" con las locales de la operación antes de buscar
