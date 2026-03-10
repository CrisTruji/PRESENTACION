# Sprint 1 — Ciclos Menú: Filtros, Entregables y Recetas Locales

**Fecha:** 2026-03-09
**Estado:** Completado

---

## Resumen

Mejoras al módulo de configuración de ciclos de menú (`src/features/menu-cycles/`):

1. **Filtro Código 3%** — BuscadorMateriaPrima solo muestra ingredientes cuyo `codigo` empieza con '3'
2. **Materia Prima Entregable** — Nuevo panel para gestionar ítems que se sirven sin transformación (bebidas, frutas, etc.) con cálculo económico y descuento de stock
3. **Receta Local — Pre-carga** — Al abrir ModalRecetaLocal se verifica si ya existe una variante local para la unidad activa y se cargan esos ingredientes en lugar de los estándar
4. **DB Constraints** — Índices UNIQUE en `arbol_recetas` (1 local por unidad) y `menu_entregables` (1 entregable por materia prima por servicio)

---

## Cambios Detallados

### 1. Filtro BuscadorMateriaPrima

**Archivo:** `src/features/menu-cycles/components/ModalRecetaLocal.jsx`

Agregado filtro `.like('codigo', '3%')` al query de BuscadorMateriaPrima. Sólo se muestran materias primas de nivel 5 (productos con stock) cuyo código empiece con '3'.

---

### 2. Materia Prima Entregable

#### DB
```sql
CREATE TABLE menu_entregables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_dia_servicio_id UUID NOT NULL REFERENCES ciclo_dia_servicios(id) ON DELETE CASCADE,
  materia_prima_id BIGINT NOT NULL REFERENCES arbol_materia_prima(id),
  cantidad_por_servicio NUMERIC(10,3) NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(20),
  costo_unitario NUMERIC(10,4) DEFAULT 0,
  costo_total NUMERIC(10,4) DEFAULT 0,
  stock_descontado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- UNIQUE: 1 entregable por materia prima por servicio (activo)
CREATE UNIQUE INDEX idx_menu_entregables_unique
  ON menu_entregables(ciclo_dia_servicio_id, materia_prima_id) WHERE activo = true;
```

#### Servicio (`menuComponentesService.js`)
- `getEntregables(cicloDiaServicioId)` — lista con join a arbol_materia_prima
- `upsertEntregable(cicloDiaServicioId, materiaPrimaId, cantidad, unidadMedida)` — crea/actualiza, calcula costo automáticamente
- `descontarStockEntregable(entregableId)` — descuenta `cantidad_por_servicio` de `arbol_materia_prima.stock_actual`, marca `stock_descontado=true`
- `eliminarEntregable(entregableId)` — soft delete (`activo=false`)

#### Hooks (`useMenuComponentes.js`)
- `useEntregables(cicloDiaServicioId)`
- `useUpsertEntregable()`
- `useDescontarStockEntregable()`
- `useEliminarEntregable()`

#### Componente (`PanelEntregables.jsx`) — NUEVO
- `BuscadorEntregable`: busca `arbol_materia_prima` con `tipo_rama='entregable'` y `nivel_actual=5`
- Tabla con: nombre, cantidad/servicio (editable), unidad, costo unitario, costo total, stock (OK/Insuficiente), acciones
- Botón "Stock": descuenta inventario (confirma si stock insuficiente)
- Costo total del servicio visible en encabezado
- Alerta si hay entregables pendientes de descuento de stock

#### CicloEditor (`CicloEditor.jsx`)
- Nuevo tab **📦 Entregables** en el editor de ciclos
- Al seleccionar el tab, renderiza `PanelEntregablesContent` pasando `cicloDiaServicioId`

---

### 3. Pre-carga Receta Local Existente

**Archivo:** `src/features/menu-cycles/components/ModalRecetaLocal.jsx`

Al abrir el modal con una receta estándar:
1. Se llama `menuComponentesService.getRecetaLocalExistente(recetaBaseId, codigoUnidad)`
2. Si existe local → se pre-cargan SUS ingredientes (no los de la estándar)
3. Si no existe → se cargan los ingredientes de la receta estándar como punto de partida
4. Banner informativo indica cuándo se cargó desde una versión local previa

Función nueva en el servicio:
```js
getRecetaLocalExistente(recetaEstandarId, codigoUnidad)
// Busca arbol_recetas WHERE parent_id=X AND es_local=true AND codigo_unidad=Y
// Si existe, llama getRecetaConIngredientes() de esa receta local
```

---

### 4. UNIQUE Constraint Recetas Locales

```sql
CREATE UNIQUE INDEX idx_arbol_recetas_local_unique
  ON arbol_recetas(parent_id, codigo_unidad)
  WHERE es_local = true AND activo = true;
```
Garantiza 1 sola receta local activa por (receta_padre, unidad) a nivel DB.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/menu-cycles/components/ModalRecetaLocal.jsx` | Filtro codigo 3%; pre-carga receta local existente |
| `src/features/menu-cycles/services/menuComponentesService.js` | +getRecetaLocalExistente, +getEntregables, +upsertEntregable, +descontarStockEntregable, +eliminarEntregable |
| `src/features/menu-cycles/hooks/useMenuComponentes.js` | +useEntregables, +useUpsertEntregable, +useDescontarStockEntregable, +useEliminarEntregable |
| `src/features/menu-cycles/components/CicloEditor.jsx` | Tab Entregables + PanelEntregablesContent |

## Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/features/menu-cycles/components/PanelEntregables.jsx` | Panel completo de entregables |

## Migraciones DB

| Migración | Descripción |
|-----------|-------------|
| `create_menu_entregables_and_recetas_local_unique` | Tabla menu_entregables + UNIQUE idx arbol_recetas locales |
