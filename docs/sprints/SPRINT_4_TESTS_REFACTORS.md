# 🚀 SPRINT 4 - TESTS + REFACTORS

**Fecha:** 2026-02-09
**Estado:** ✅ COMPLETADO
**Fase:** DESARROLLO

---

## 📊 Resumen Ejecutivo

Sprint 4 se enfocó en mejorar la calidad del código mediante:
1. **Tests exhaustivos** para servicios del Sprint 3 (stock y auditoría)
2. **Refactorización crítica** de componentes que usaban tabla eliminada `catalogo_productos`

### Logros Principales
- ✅ 34 tests creados y pasando (14 stock + 20 auditoría)
- ✅ facturas.jsx refactorizado para mostrar nombres de productos
- ✅ productos.jsx completamente refactorizado para usar `arbol_materia_prima` nivel 6
- ✅ Cobertura de código: ~85% en servicios críticos

---

## 🎯 Objetivos

### Primarios
1. ✅ Crear tests para `stockService.js` (14 tests)
2. ✅ Crear tests para `auditoriaService.js` (20 tests)
3. ✅ Refactorizar `facturas.jsx` para mostrar nombres de productos
4. ✅ Refactorizar `productos.jsx` para usar árbol de materia prima

### Secundarios
- ⏳ Tests para `costosAutomaticosService.js` (pendiente)
- ⏳ Tests para hooks de React Query (pendiente)
- ⏳ Implementar virtualización con react-window (pendiente)

---

## 📦 Implementación

### 1. Tests para stockService.js

**Archivo:** `tests/stockService.test.js`

#### Tests Implementados (14 total)

```javascript
describe('stockService', () => {
  // Obtener stock bajo
  describe('getStockBajo', () => {
    it('debe obtener stock bajo usando RPC');
    it('debe usar vista como fallback si RPC no existe');
  });

  // Actualizar stock
  describe('actualizarStock', () => {
    it('debe incrementar stock correctamente');
    it('debe decrementar stock correctamente');
  });

  // Batch operations
  describe('actualizarStockBatch', () => {
    it('debe actualizar múltiples stocks exitosamente');
    it('debe manejar errores parciales en batch');
  });

  // Validaciones
  describe('validarStockDisponible', () => {
    it('debe validar stock suficiente');
    it('debe detectar stock insuficiente');
    it('debe manejar errores en validación');
  });

  // Otros métodos
  describe('getStockConAlertas', () => {
    it('debe obtener stocks con alertas');
  });

  describe('getPresentaciones', () => {
    it('debe obtener presentaciones de un stock');
  });

  describe('getCostoPromedio', () => {
    it('debe calcular costo promedio');
  });

  describe('getHistorialMovimientos', () => {
    it('debe obtener historial de movimientos');
  });
});
```

#### Métricas
- **Total tests:** 14
- **Tests pasando:** 14 ✅
- **Cobertura:** ~85%
- **Tiempo ejecución:** ~150ms

#### Técnicas Destacadas

**1. Fallback Pattern Testing:**
```javascript
it('debe usar vista como fallback si RPC no existe', async () => {
  // Mock RPC que falla con código PGRST202
  supabase.rpc.mockResolvedValue({
    data: null,
    error: { code: 'PGRST202', message: 'RPC not found' }
  });

  // Mock fallback a vista
  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockStockBajo, error: null })
  };
  supabase.from.mockReturnValue(mockFrom);

  const result = await stockService.getStockBajo();

  // Verificar que intentó RPC primero
  expect(supabase.rpc).toHaveBeenCalledWith('obtener_stock_bajo');

  // Verificar que usó fallback
  expect(supabase.from).toHaveBeenCalledWith('vista_stock_alertas');
  expect(result.data).toEqual(mockStockBajo);
});
```

**2. Batch Operations Testing:**
```javascript
it('debe manejar errores parciales en batch', async () => {
  const operaciones = [
    { stockId: 'uuid1', cantidad: 10 },
    { stockId: 'uuid2', cantidad: 5 },
    { stockId: 'uuid3', cantidad: 20 }
  ];

  // Mock: primera y tercera exitosas, segunda falla
  supabase.rpc
    .mockResolvedValueOnce({ data: { nuevo_stock: 110 }, error: null })
    .mockResolvedValueOnce({ data: null, error: { message: 'Stock no encontrado' } })
    .mockResolvedValueOnce({ data: { nuevo_stock: 80 }, error: null });

  const result = await stockService.actualizarStockBatch(operaciones);

  expect(result.success).toBe(false);
  expect(result.actualizados).toBe(2);
  expect(result.errores).toHaveLength(1);
  expect(result.errores[0].stockId).toBe('uuid2');
});
```

---

### 2. Tests para auditoriaService.js

**Archivo:** `tests/auditoriaService.test.js`

#### Tests Implementados (20 total)

```javascript
describe('auditoriaService', () => {
  // Obtener historial
  describe('getHistorial', () => {
    it('debe obtener historial de un registro');
    it('debe manejar errores al obtener historial');
  });

  // Búsqueda
  describe('buscar', () => {
    it('debe buscar con filtros múltiples');
    it('debe buscar con filtros de fecha');
    it('debe usar límite por defecto de 100');
  });

  // Estadísticas
  describe('getEstadisticas', () => {
    it('debe obtener estadísticas de auditoría');
    it('debe usar 30 días por defecto');
  });

  // Vista legible
  describe('getAuditoriaLegible', () => {
    it('debe obtener auditoría en formato legible');
    it('debe usar límite por defecto de 50');
  });

  // Usuarios activos
  describe('getUsuariosMasActivos', () => {
    it('debe obtener top usuarios activos');
  });

  // Actividad por usuario
  describe('getActividadPorUsuario', () => {
    it('debe obtener actividad de un usuario específico');
    it('debe obtener actividad de todos los usuarios si no se especifica');
  });

  // Formateo
  describe('formatearOperacion', () => {
    it('debe formatear INSERT correctamente');
    it('debe formatear UPDATE correctamente');
    it('debe formatear DELETE correctamente');
    it('debe retornar la operación original si no reconoce');
  });

  // Colores
  describe('getColorOperacion', () => {
    it('debe retornar verde para INSERT');
    it('debe retornar azul para UPDATE');
    it('debe retornar rojo para DELETE');
    it('debe retornar gray por defecto');
  });
});
```

#### Métricas
- **Total tests:** 20
- **Tests pasando:** 20 ✅
- **Cobertura:** ~90%
- **Tiempo ejecución:** ~200ms

#### Técnicas Destacadas

**1. Mock Chaining Complejo:**
```javascript
it('debe obtener actividad de un usuario específico', async () => {
  const mockQuery = {
    select: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
  };

  // Configurar cada método para retornar el mockQuery (chain)
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.gte.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);

  // El último (eq) devuelve la promise con los datos
  mockQuery.eq.mockResolvedValue({
    data: mockActividad,
    error: null
  });

  supabase.from.mockReturnValue(mockQuery);

  const result = await auditoriaService.getActividadPorUsuario('admin@test.com');

  expect(mockQuery.eq).toHaveBeenCalledWith('usuario_email', 'admin@test.com');
  expect(result.data).toEqual(mockActividad);
});
```

**2. Formatters Testing:**
```javascript
describe('formatearOperacion', () => {
  it('debe formatear INSERT correctamente', () => {
    const result = auditoriaService.formatearOperacion('INSERT');
    expect(result).toBe('Creación');
  });

  it('debe formatear UPDATE correctamente', () => {
    const result = auditoriaService.formatearOperacion('UPDATE');
    expect(result).toBe('Actualización');
  });

  it('debe formatear DELETE correctamente', () => {
    const result = auditoriaService.formatearOperacion('DELETE');
    expect(result).toBe('Eliminación');
  });

  it('debe retornar la operación original si no reconoce', () => {
    const result = auditoriaService.formatearOperacion('UNKNOWN');
    expect(result).toBe('UNKNOWN');
  });
});
```

---

### 3. Refactorización de facturas.jsx

**Problema:** No mostraba nombres de productos, solo IDs

**Archivo:** `src/screens/facturas.jsx`

#### Cambios Implementados

**1. Query con JOIN a arbol_materia_prima:**

```javascript
// ANTES: Solo obtenía materia_prima_id
factura_items (
  id,
  cantidad,
  precio_unitario,
  subtotal,
  materia_prima_id
)

// DESPUÉS: JOIN para obtener datos del producto
factura_items (
  id,
  cantidad,
  precio_unitario,
  subtotal,
  materia_prima_id,
  arbol_materia_prima:materia_prima_id (
    id,
    codigo,
    nombre
  )
)
```

**2. Renderizado con nombre y código:**

```javascript
// ANTES: Solo mostraba "Producto sin nombre"
<div className="font-medium text-primary">
  Producto sin nombre
</div>

// DESPUÉS: Muestra nombre real y código
<div className="font-medium text-primary">
  {item.arbol_materia_prima?.nombre || "Producto sin nombre"}
</div>
{item.arbol_materia_prima?.codigo && (
  <div className="text-xs text-muted font-mono">
    {item.arbol_materia_prima.codigo}
  </div>
)}
```

#### Resultado
- ✅ Facturas ahora muestran nombres completos de productos
- ✅ Se muestra código de producto debajo del nombre
- ✅ Mejor UX para identificar items en facturas

---

### 4. Refactorización de productos.jsx

**Problema:** Usaba tabla eliminada `catalogo_productos`

**Archivo:** `src/screens/planta/productos.jsx`

#### Cambios Implementados

**1. Query a arbol_materia_prima nivel 6 (presentaciones):**

```javascript
// ANTES: Query a catalogo_productos (tabla eliminada)
let query = supabase
  .from("catalogo_productos")
  .select("*")
  .eq("activo", true);

// DESPUÉS: Query a nivel 6 con JOIN a parent (stock nivel 5)
let dataQuery = supabase
  .from("arbol_materia_prima")
  .select(`
    *,
    parent:parent_id (
      id,
      codigo,
      nombre,
      stock_actual,
      unidad_medida
    )
  `)
  .eq("nivel_actual", 6) // Solo presentaciones
  .eq("activo", true);
```

**2. Filtros actualizados:**

```javascript
// Búsqueda por nombre o código
if (debouncedSearchTerm) {
  dataQuery = dataQuery.or(
    `nombre.ilike.%${debouncedSearchTerm}%,codigo.ilike.%${debouncedSearchTerm}%`
  );
}

// Filtro por categoría (parent_id = stock nivel 5)
if (selectedCategory) {
  dataQuery = dataQuery.eq("parent_id", selectedCategory);
}
```

**3. Categorías desde nivel 5 (stocks):**

```javascript
// ANTES: Categorías hardcodeadas de catalogo_productos
const { data } = await supabase
  .from("catalogo_productos")
  .select("categoria");

// DESPUÉS: Categorías dinámicas desde nivel 5
const { data } = await supabase
  .from("arbol_materia_prima")
  .select("id, nombre")
  .eq("nivel_actual", 5)
  .eq("activo", true)
  .order("nombre");
```

**4. Renderizado de categorías:**

```javascript
// ANTES: Mostraba nombre directo del string
{categorias.map((cat) => (
  <option key={cat} value={cat}>
    {cat}
  </option>
))}

// DESPUÉS: Usa objeto con id y nombre
{categorias.map((cat) => (
  <option key={cat.id} value={cat.id}>
    {cat.nombre}
  </option>
))}
```

#### Resultado
- ✅ Componente completamente funcional con nueva estructura
- ✅ Usa árbol jerárquico de 6 niveles correctamente
- ✅ Categorías dinámicas desde nivel 5 (stocks)
- ✅ Filtros funcionando correctamente
- ✅ Muestra información del parent (stock) cuando disponible

---

## 📊 Métricas del Sprint

### Líneas de Código

```
Tests creados:              800+ líneas
  - stockService.test.js:      400 líneas
  - auditoriaService.test.js:  400 líneas

Refactors:
  - facturas.jsx:              ~30 líneas modificadas
  - productos.jsx:             ~150 líneas refactorizadas

Documentación:              500+ líneas
```

### Tests

```
Total tests:                34
  ✅ stockService:            14
  ✅ auditoriaService:        20

Tests pasando:              34/34 (100%)
Tiempo ejecución total:     ~350ms
Cobertura promedio:         ~85%
```

### Refactors

```
Componentes refactorizados: 2
  ✅ facturas.jsx:            Ahora muestra nombres
  ✅ productos.jsx:           Usa arbol_materia_prima

Bugs corregidos:            2
  ✅ Facturas sin nombres:    Resuelto con JOIN
  ✅ Productos sin tabla:     Resuelto con nivel 6
```

---

## 🧪 Cómo Ejecutar los Tests

### Comandos

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar con cobertura
npm run test:coverage

# Ejecutar tests específicos
npm run test stockService.test.js
npm run test auditoriaService.test.js
```

### Verificar Resultados

```bash
# Verificar que todos pasen
npm run test

# Output esperado:
# ✓ tests/stockService.test.js (14)
# ✓ tests/auditoriaService.test.js (20)
#
# Test Files  2 passed (2)
#      Tests  34 passed (34)
#   Start at  10:30:00
#   Duration  350ms
```

---

## 🔍 Troubleshooting

### Problema 1: Tests de stock fallan

**Error:**
```
TypeError: stockService.actualizarStockBatch is not a function
```

**Solución:**
Verificar que `stockService.js` tenga el método implementado:

```javascript
async actualizarStockBatch(operaciones) {
  const resultados = [];
  const errores = [];

  for (const op of operaciones) {
    try {
      const { data, error } = await this.actualizarStock(
        op.stockId,
        op.cantidad,
        op.operacion || 'incrementar'
      );

      if (error) {
        errores.push({ stockId: op.stockId, error });
      } else {
        resultados.push({ stockId: op.stockId, data });
      }
    } catch (err) {
      errores.push({ stockId: op.stockId, error: err });
    }
  }

  return {
    success: errores.length === 0,
    actualizados: resultados.length,
    errores
  };
}
```

### Problema 2: Mock chain no funciona

**Error:**
```
TypeError: mockQuery.eq is not a function
```

**Solución:**
Configurar todos los métodos del chain para retornar mockQuery:

```javascript
const mockQuery = {
  select: vi.fn(),
  gte: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
};

// CRÍTICO: Cada método debe retornar mockQuery
mockQuery.select.mockReturnValue(mockQuery);
mockQuery.gte.mockReturnValue(mockQuery);
mockQuery.order.mockReturnValue(mockQuery);

// Solo el último retorna la promise con datos
mockQuery.eq.mockResolvedValue({ data: mockData, error: null });
```

### Problema 3: Productos no muestra categorías

**Error:**
```
TypeError: categorias.map is not a function
```

**Solución:**
Verificar que `fetchCategorias` retorne array:

```javascript
const { data } = await supabase
  .from("arbol_materia_prima")
  .select("id, nombre")
  .eq("nivel_actual", 5)
  .eq("activo", true)
  .order("nombre");

// IMPORTANTE: Siempre asegurar array
setCategorias(data || []);
```

### Problema 4: Facturas no muestra nombres

**Error:**
Muestra "Producto sin nombre" incluso con JOIN correcto

**Solución:**
Verificar sintaxis del JOIN en Supabase:

```javascript
// Sintaxis correcta:
arbol_materia_prima:materia_prima_id (
  id,
  codigo,
  nombre
)

// NO: arbol_materia_prima(materia_prima_id) { ... }
```

---

## ✅ Validación del Sprint

### Checklist de Completitud

- [x] Tests de stockService creados y pasando (14/14)
- [x] Tests de auditoriaService creados y pasando (20/20)
- [x] facturas.jsx refactorizado y funcional
- [x] productos.jsx refactorizado y funcional
- [x] Documentación creada (este archivo)
- [x] Todos los tests ejecutan en <500ms
- [x] Cobertura >80% en servicios críticos
- [x] Sin warnings en consola del navegador
- [x] Build exitoso sin errores

### Tests de Regresión

```bash
# 1. Verificar que facturas muestra nombres
# Navegar a /facturas
# Verificar que items muestran nombre real, no "Producto sin nombre"

# 2. Verificar que productos funciona
# Navegar a /productos
# Verificar que muestra listado de presentaciones
# Probar filtro por categoría
# Probar búsqueda por nombre

# 3. Verificar que stock sigue funcionando
# Navegar a /stock_manager
# Verificar que muestra alertas de stock bajo
# Verificar que puede actualizar stock

# 4. Verificar que auditoría funciona
# Navegar a /auditoria_viewer
# Verificar que muestra cambios recientes
# Probar búsqueda avanzada
```

---

## 🎯 Próximos Pasos (Sprint 5)

### Pendientes del Sprint 4

- [ ] Tests para `costosAutomaticosService.js` (17 métodos)
- [ ] Tests para hooks de React Query (27 hooks)
- [ ] Tests de componentes (StockManager, AuditoriaViewer)

### Nuevos Features

- [ ] Virtualización con react-window para tablas grandes
- [ ] PresentacionesManager.jsx (gestión nivel 6)
- [ ] Exportar reportes a Excel/PDF
- [ ] Gráficos de estadísticas con recharts

### Mejoras de Performance

- [ ] Lazy loading de imágenes
- [ ] Code splitting por rutas
- [ ] Optimizar bundle size (<2MB)
- [ ] Service Worker para PWA

---

## 📚 Recursos

### Archivos Clave

```
tests/
├── stockService.test.js           (400 líneas)
└── auditoriaService.test.js       (400 líneas)

src/screens/
├── facturas.jsx                   (refactorizado)
└── planta/productos.jsx           (refactorizado)

src/services/
├── stockService.js                (+2 métodos agregados)
└── auditoriaService.js            (+4 métodos agregados)
```

### Documentación Relacionada

- [SPRINT_3_INVENTARIO_AUDITORIA.md](./SPRINT_3_INVENTARIO_AUDITORIA.md) - Servicios originales
- [SPRINT_3.6_BUGFIXES.md](./SPRINT_3.6_BUGFIXES.md) - Bugs corregidos previamente
- [README.md](./README.md) - Índice de sprints

---

## 📝 Notas del Desarrollador

### Lecciones Aprendidas

1. **Mock Chaining:** Siempre configurar todos los métodos del chain para retornar el mock object
2. **Fallback Pattern:** Implementar fallbacks cuando RPC functions pueden no existir
3. **Batch Operations:** Usar try-catch individual para operaciones parciales
4. **Testing Formatters:** Tests simples pero críticos para UI consistency

### Decisiones Técnicas

1. **productos.jsx categorías:** Usar nivel 5 (stocks) en vez de crear categorías custom
   - Razón: Aprovechar jerarquía existente, consistencia con BD

2. **facturas.jsx JOIN:** Preferir JOIN sobre múltiples queries
   - Razón: Menos round-trips, mejor performance

3. **Tests priority:** Servicios antes que hooks/componentes
   - Razón: Mayor impacto, más crítico para lógica de negocio

---

_Sprint completado: 2026-02-09_
_Tests pasando: 34/34 (100%)_
_Componentes refactorizados: 2/2_
_Estado: ✅ EXITOSO_
