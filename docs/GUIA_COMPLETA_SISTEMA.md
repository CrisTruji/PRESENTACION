# 🎓 GUÍA COMPLETA DEL SISTEMA

Esta guía te ayudará a entender cada archivo del proyecto y cómo se conectan.

---

## 📁 ESTRUCTURA DEL PROYECTO

```
C:\PRESENTACION\
│
├── 📂 src/                          # Código fuente
│   ├── 📂 lib/                      # Configuraciones
│   │   ├── supabaseClient.js        # Cliente de Supabase (conexión BD)
│   │   └── queryClient.js           # Cliente de TanStack Query (cache)
│   │
│   ├── 📂 services/                 # Lógica de negocio
│   │   ├── BaseArbolService.js      # Clase base CRUD
│   │   ├── stockService.js          # Lógica de stock
│   │   ├── auditoriaService.js      # Lógica de auditoría
│   │   └── costosAutomaticosService.js
│   │
│   ├── 📂 hooks/                    # Custom hooks React Query
│   │   ├── useStock.js              # Hooks de stock
│   │   ├── useAuditoria.js          # Hooks de auditoría
│   │   └── useCostosAutomaticos.js  # Hooks de costos
│   │
│   ├── 📂 stores/                   # Estado global (Zustand)
│   │   └── useArbolRecetasStore.js  # Store del árbol de recetas
│   │
│   ├── 📂 components/               # Componentes React
│   │   ├── navbar.jsx               # Barra de navegación
│   │   ├── stock/
│   │   │   └── StockManager.jsx     # Dashboard de stock
│   │   └── auditoria/
│   │       └── AuditoriaViewer.jsx  # Visor de auditoría
│   │
│   ├── 📂 screens/                  # Páginas principales
│   │   ├── facturas.jsx             # Gestión de facturas
│   │   ├── planta/
│   │   │   └── productos.jsx        # Gestión de productos
│   │   └── admin/
│   │       └── vincular_presentaciones.jsx
│   │
│   ├── 📂 router/                   # Enrutamiento
│   │   └── rolerouter.jsx           # Router basado en roles
│   │
│   ├── main.jsx                     # Punto de entrada React
│   └── App.jsx                      # Componente raíz
│
├── 📂 tests/                        # Tests
│   ├── stockService.test.js         # Tests de stockService
│   └── auditoriaService.test.js     # Tests de auditoriaService
│
├── 📂 docs/                         # Documentación
│   ├── sprints/                     # Documentación por sprint
│   │   ├── README.md
│   │   ├── SPRINT_1_CIMIENTOS_PERFORMANCE.md
│   │   ├── SPRINT_2_CALIDAD_CODIGO.md
│   │   ├── SPRINT_3_INVENTARIO_AUDITORIA.md
│   │   ├── SPRINT_3.5_ENLACE_RUTAS.md
│   │   ├── SPRINT_3.6_BUGFIXES.md
│   │   └── SPRINT_4_TESTS_REFACTORS.md
│   └── GUIA_COMPLETA_SISTEMA.md     # Este archivo
│
├── package.json                     # Dependencias y scripts
├── vite.config.js                   # Configuración de Vite
└── vitest.config.js                 # Configuración de Vitest
```

---

## 🔍 ARCHIVOS CLAVE EXPLICADOS

### 1️⃣ CONFIGURACIÓN INICIAL

#### `src/lib/supabaseClient.js`
**¿Qué hace?** Crea la conexión con Supabase (tu base de datos).

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Analogía:** Es como configurar tu WiFi - lo haces una vez y todos lo usan.

**Cuándo se usa:** TODOS los services lo importan para hablar con la BD.

---

#### `src/lib/queryClient.js`
**¿Qué hace?** Configura TanStack Query (el sistema de cache).

```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // Cache válido por 5 minutos
      cacheTime: 10 * 60 * 1000,     // Guardar en memoria 10 minutos
      retry: 1,                       // Reintentar 1 vez si falla
      refetchOnWindowFocus: false,   // No refrescar al cambiar de ventana
    },
  },
});
```

**Analogía:** Es como configurar cuánto tiempo guarda Google las búsquedas.

**Cuándo se usa:** En `main.jsx` para envolver toda la app.

---

### 2️⃣ SERVICES (Lógica de Negocio)

#### `src/services/BaseArbolService.js`
**¿Qué hace?** Clase base con operaciones CRUD genéricas.

```javascript
export class BaseArbolService {
  constructor(tableName = 'arbol_materia_prima') {
    this.tableName = tableName;
  }

  // Obtener por nivel
  async getByNivel(nivel, activo = true) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('nivel_actual', nivel);

    if (activo !== null) {
      query = query.eq('activo', activo);
    }

    const { data, error } = await query.order('nombre');
    return { data, error };
  }

  // Obtener por ID
  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  // Crear registro
  async create(insertData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    return { data, error };
  }

  // Actualizar registro
  async update(id, updateData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Eliminar registro (soft delete)
  async delete(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }
}
```

**Analogía:** Es como una plantilla de Word que reutilizas para crear documentos similares.

**Herencia:** Otros services extienden esta clase para heredar estos métodos.

---

#### `src/services/stockService.js`
**¿Qué hace?** Lógica específica de gestión de stock.

**Métodos principales:**
1. `getStockBajo()` - Obtener stocks con alerta
2. `actualizarStock()` - Incrementar/decrementar stock
3. `actualizarStockBatch()` - Actualizar múltiples stocks
4. `validarStockDisponible()` - Verificar si hay suficiente stock
5. `getPresentaciones()` - Obtener presentaciones de un stock
6. `getCostoPromedio()` - Calcular costo promedio

**Ejemplo de método con fallback:**

```javascript
async getStockBajo() {
  // Plan A: Intentar con RPC
  let { data, error } = await supabase.rpc('obtener_stock_bajo');

  // Plan B: Si RPC no existe, usar vista
  if (error && error.code === 'PGRST202') {
    console.warn('[StockService] RPC no existe, usando vista');
    const result = await supabase
      .from('vista_stock_alertas')
      .select('*')
      .in('estado_stock', ['CRÍTICO', 'BAJO'])
      .order('estado_stock', { ascending: false });

    data = result.data;
    error = result.error;
  }

  return { data, error };
}
```

**¿Por qué fallback?** Porque el RPC puede no existir en la BD (fue creado después).

---

#### `src/services/auditoriaService.js`
**¿Qué hace?** Lógica de consulta de auditoría (historial de cambios).

**Métodos principales:**
1. `getHistorial()` - Historial de un registro específico
2. `buscar()` - Búsqueda con filtros complejos
3. `getEstadisticas()` - Estadísticas de cambios
4. `formatearOperacion()` - INSERT → "Creación"
5. `getColorOperacion()` - Colores para UI

**Ejemplo de búsqueda con filtros:**

```javascript
async buscar(filtros = {}) {
  let query = supabase
    .from('auditoria_sistema')
    .select('*');

  // Filtro por tabla
  if (filtros.tabla_nombre) {
    query = query.eq('tabla_nombre', filtros.tabla_nombre);
  }

  // Filtro por operación
  if (filtros.operacion) {
    query = query.eq('operacion', filtros.operacion);
  }

  // Filtro por usuario
  if (filtros.usuario_email) {
    query = query.eq('usuario_email', filtros.usuario_email);
  }

  // Filtro por rango de fechas
  if (filtros.fecha_desde) {
    query = query.gte('created_at', filtros.fecha_desde);
  }
  if (filtros.fecha_hasta) {
    query = query.lte('created_at', filtros.fecha_hasta);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(filtros.limite || 100);

  return { data, error };
}
```

---

### 3️⃣ HOOKS (React Query)

#### `src/hooks/useStock.js`
**¿Qué hace?** Custom hooks que encapsulan lógica de React Query para stock.

**8 hooks principales:**

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../services/stockService';

// 1. Hook para obtener stock bajo
export function useStockBajo() {
  return useQuery({
    queryKey: ['stock-bajo'],
    queryFn: stockService.getStockBajo,
    staleTime: 2 * 60 * 1000, // Cache 2 minutos
  });
}

// 2. Hook para obtener stock con alertas
export function useStockConAlertas() {
  return useQuery({
    queryKey: ['stock-alertas'],
    queryFn: stockService.getStockConAlertas,
    staleTime: 2 * 60 * 1000,
  });
}

// 3. Hook para actualizar stock
export function useActualizarStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockId, cantidad, operacion }) =>
      stockService.actualizarStock(stockId, cantidad, operacion),

    onSuccess: () => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries(['stock-bajo']);
      queryClient.invalidateQueries(['stock-alertas']);
    },
  });
}

// 4. Hook para obtener presentaciones
export function usePresentaciones(stockId) {
  return useQuery({
    queryKey: ['presentaciones', stockId],
    queryFn: () => stockService.getPresentaciones(stockId),
    enabled: !!stockId, // Solo ejecutar si stockId existe
  });
}

// 5. Hook para obtener costo promedio
export function useCostoPromedio(stockId) {
  return useQuery({
    queryKey: ['costo-promedio', stockId],
    queryFn: () => stockService.getCostoPromedio(stockId),
    enabled: !!stockId,
  });
}

// 6. Hook para historial de movimientos
export function useHistorialMovimientos(stockId, limite = 20) {
  return useQuery({
    queryKey: ['historial-movimientos', stockId, limite],
    queryFn: () => stockService.getHistorialMovimientos(stockId, limite),
    enabled: !!stockId,
  });
}

// 7. Hook para actualizar batch
export function useActualizarStockBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (operaciones) =>
      stockService.actualizarStockBatch(operaciones),

    onSuccess: () => {
      queryClient.invalidateQueries(['stock']);
    },
  });
}

// 8. Hook para validar stock disponible
export function useValidarStockDisponible() {
  return useMutation({
    mutationFn: ({ stockId, cantidadRequerida }) =>
      stockService.validarStockDisponible(stockId, cantidadRequerida),
  });
}
```

**Uso en componentes:**

```javascript
function MiComponente() {
  // Leer datos
  const { data: stockBajo, isLoading, error } = useStockBajo();

  // Modificar datos
  const actualizarStock = useActualizarStock();

  const handleClick = () => {
    actualizarStock.mutate({
      stockId: 'abc-123',
      cantidad: 10,
      operacion: 'incrementar'
    });
  };

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {stockBajo?.map(item => (
        <div key={item.id}>
          {item.nombre}: {item.stock_actual}
          <button onClick={handleClick}>+10</button>
        </div>
      ))}
    </div>
  );
}
```

---

#### `src/hooks/useAuditoria.js`
**¿Qué hace?** Custom hooks para consultas de auditoría.

**8 hooks principales:**

```javascript
// 1. Historial de un registro
export function useHistorialRegistro(tablaId, limite = 50) {
  return useQuery({
    queryKey: ['auditoria-historial', tablaId, limite],
    queryFn: () => auditoriaService.getHistorial(tablaId, limite),
    enabled: !!tablaId,
  });
}

// 2. Búsqueda con filtros
export function useBuscarAuditoria(filtros) {
  return useQuery({
    queryKey: ['auditoria-busqueda', filtros],
    queryFn: () => auditoriaService.buscar(filtros),
  });
}

// 3. Estadísticas
export function useEstadisticasAuditoria(dias = 30) {
  return useQuery({
    queryKey: ['auditoria-estadisticas', dias],
    queryFn: () => auditoriaService.getEstadisticas(dias),
    staleTime: 10 * 60 * 1000, // Cache 10 minutos
  });
}

// 4. Historial reciente
export function useHistorialReciente(limite = 50) {
  return useQuery({
    queryKey: ['auditoria-reciente', limite],
    queryFn: () => auditoriaService.getHistorialReciente(limite),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

// 5. Usuarios más activos
export function useUsuariosMasActivos(limite = 10, dias = 30) {
  return useQuery({
    queryKey: ['auditoria-usuarios-activos', limite, dias],
    queryFn: () => auditoriaService.getUsuariosMasActivos(limite, dias),
  });
}

// 6. Auditoría legible
export function useAuditoriaLegible(limite = 50) {
  return useQuery({
    queryKey: ['auditoria-legible', limite],
    queryFn: () => auditoriaService.getAuditoriaLegible(limite),
  });
}

// 7. Actividad por usuario
export function useActividadPorUsuario(usuarioEmail, dias = 30) {
  return useQuery({
    queryKey: ['auditoria-actividad-usuario', usuarioEmail, dias],
    queryFn: () => auditoriaService.getActividadPorUsuario(usuarioEmail, dias),
    enabled: !!usuarioEmail,
  });
}

// 8. Cambios por tabla
export function useCambiosPorTabla(tablaNombre, limite = 50) {
  return useQuery({
    queryKey: ['auditoria-cambios-tabla', tablaNombre, limite],
    queryFn: () => auditoriaService.getCambiosPorTabla(tablaNombre, limite),
    enabled: !!tablaNombre,
  });
}
```

---

### 4️⃣ STORES (Estado Global)

#### `src/stores/useArbolRecetasStore.js`
**¿Qué hace?** Gestiona el estado de navegación del árbol de recetas.

```javascript
import { create } from 'zustand';

export const useArbolRecetasStore = create((set, get) => ({
  // ============ ESTADO ============

  // Nivel 1: Materia Prima Base
  nivel1Items: [],
  selectedNivel1: null,
  isLoadingNivel1: false,

  // Nivel 2: Proveedores
  nivel2Items: [],
  selectedNivel2: null,
  isLoadingNivel2: false,

  // Nivel 3: Recetas
  nivel3Items: [],
  selectedNivel3: null,
  isLoadingNivel3: false,

  // ============ ACCIONES ============

  // Cargar nivel 1
  loadNivel1: async () => {
    set({ isLoadingNivel1: true });
    try {
      const { data } = await supabase
        .from('arbol_materia_prima')
        .select('*')
        .eq('nivel_actual', 1)
        .eq('activo', true)
        .order('nombre');

      set({ nivel1Items: data || [], isLoadingNivel1: false });
    } catch (error) {
      set({ isLoadingNivel1: false });
    }
  },

  // Seleccionar nivel 1
  setSelectedNivel1: (item) => {
    set({
      selectedNivel1: item,
      nivel2Items: [],
      selectedNivel2: null,
      nivel3Items: [],
      selectedNivel3: null,
    });

    if (item) {
      get().loadNivel2(item.id);
    }
  },

  // Cargar nivel 2 (hijos del nivel 1 seleccionado)
  loadNivel2: async (parentId) => {
    set({ isLoadingNivel2: true });
    try {
      const { data } = await supabase
        .from('arbol_materia_prima')
        .select('*')
        .eq('parent_id', parentId)
        .eq('nivel_actual', 2)
        .eq('activo', true)
        .order('nombre');

      set({ nivel2Items: data || [], isLoadingNivel2: false });
    } catch (error) {
      set({ isLoadingNivel2: false });
    }
  },

  // Seleccionar nivel 2
  setSelectedNivel2: (item) => {
    set({
      selectedNivel2: item,
      nivel3Items: [],
      selectedNivel3: null,
    });

    if (item) {
      get().loadNivel3(item.id);
    }
  },

  // Cargar nivel 3
  loadNivel3: async (parentId) => {
    set({ isLoadingNivel3: true });
    try {
      const { data } = await supabase
        .from('arbol_materia_prima')
        .select('*')
        .eq('parent_id', parentId)
        .eq('nivel_actual', 3)
        .eq('activo', true)
        .order('nombre');

      set({ nivel3Items: data || [], isLoadingNivel3: false });
    } catch (error) {
      set({ isLoadingNivel3: false });
    }
  },

  // Limpiar todo
  reset: () => {
    set({
      nivel1Items: [],
      selectedNivel1: null,
      nivel2Items: [],
      selectedNivel2: null,
      nivel3Items: [],
      selectedNivel3: null,
    });
  },
}));
```

**Uso en componentes:**

```javascript
function ArbolNavigation() {
  const {
    nivel1Items,
    selectedNivel1,
    loadNivel1,
    setSelectedNivel1,
  } = useArbolRecetasStore();

  useEffect(() => {
    loadNivel1(); // Cargar al montar
  }, []);

  return (
    <div>
      <h3>Materia Prima</h3>
      {nivel1Items.map(item => (
        <button
          key={item.id}
          onClick={() => setSelectedNivel1(item)}
          className={selectedNivel1?.id === item.id ? 'active' : ''}
        >
          {item.nombre}
        </button>
      ))}
    </div>
  );
}
```

---

### 5️⃣ COMPONENTES

#### `src/components/stock/StockManager.jsx`
**¿Qué hace?** Dashboard completo de gestión de stock.

**Características:**
1. Estadísticas de stock (total, crítico, bajo, normal)
2. Tabla con stock y alertas
3. Filtros por categoría y búsqueda
4. Modal para actualizar stock
5. Auto-refresh cada 2 minutos para stock crítico

**Estructura:**

```javascript
export default function StockManager() {
  // ========== HOOKS ==========
  const { data: stockAlertas, isLoading } = useStockConAlertas();
  const actualizarStock = useActualizarStock();

  // ========== ESTADO LOCAL ==========
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // ========== FILTRADO ==========
  const stocksFiltrados = useMemo(() => {
    let filtered = stockAlertas || [];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(s => s.categoria === selectedCategory);
    }

    return filtered;
  }, [stockAlertas, searchTerm, selectedCategory]);

  // ========== ESTADÍSTICAS ==========
  const stats = useMemo(() => {
    const total = stockAlertas?.length || 0;
    const critico = stockAlertas?.filter(s => s.estado === 'CRÍTICO').length || 0;
    const bajo = stockAlertas?.filter(s => s.estado === 'BAJO').length || 0;
    const normal = total - critico - bajo;

    return { total, critico, bajo, normal };
  }, [stockAlertas]);

  // ========== HANDLERS ==========
  const handleActualizar = async (cantidad, operacion) => {
    await actualizarStock.mutateAsync({
      stockId: selectedStock.id,
      cantidad,
      operacion
    });

    setShowModal(false);
    setSelectedStock(null);
  };

  // ========== RENDER ==========
  return (
    <div className="stock-manager">
      {/* Estadísticas */}
      <div className="stats-grid">
        <StatCard label="Total" value={stats.total} icon={<Package />} />
        <StatCard label="Crítico" value={stats.critico} icon={<AlertTriangle />} color="red" />
        <StatCard label="Bajo" value={stats.bajo} icon={<TrendingDown />} color="yellow" />
        <StatCard label="Normal" value={stats.normal} icon={<CheckCircle />} color="green" />
      </div>

      {/* Filtros */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {/* opciones */}
        </select>
      </div>

      {/* Tabla */}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {stocksFiltrados.map(stock => (
            <tr key={stock.id}>
              <td>{stock.nombre}</td>
              <td>{stock.stock_actual}</td>
              <td>{stock.stock_minimo}</td>
              <td>
                <Badge color={getBadgeColor(stock.estado)}>
                  {stock.estado}
                </Badge>
              </td>
              <td>
                <button onClick={() => {
                  setSelectedStock(stock);
                  setShowModal(true);
                }}>
                  Actualizar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3>Actualizar Stock: {selectedStock?.nombre}</h3>
          {/* formulario */}
        </Modal>
      )}
    </div>
  );
}
```

---

#### `src/components/auditoria/AuditoriaViewer.jsx`
**¿Qué hace?** Visor de auditoría con 3 vistas.

**3 Vistas:**
1. **Cambios Recientes:** Timeline de últimos 50 cambios
2. **Búsqueda Avanzada:** Filtros por tabla, operación, usuario, fechas
3. **Estadísticas:** Gráficos y métricas

**Estructura:**

```javascript
export default function AuditoriaViewer() {
  // ========== HOOKS ==========
  const { data: historialReciente } = useHistorialReciente(50);
  const { data: estadisticas } = useEstadisticasAuditoria(30);

  // ========== ESTADO ==========
  const [vistaActual, setVistaActual] = useState('recientes');
  const [expandedId, setExpandedId] = useState(null);

  // ========== RENDER ==========
  return (
    <div className="auditoria-viewer">
      {/* Tabs */}
      <div className="tabs">
        <button
          className={vistaActual === 'recientes' ? 'active' : ''}
          onClick={() => setVistaActual('recientes')}
        >
          Cambios Recientes
        </button>
        <button
          className={vistaActual === 'busqueda' ? 'active' : ''}
          onClick={() => setVistaActual('busqueda')}
        >
          Búsqueda Avanzada
        </button>
        <button
          className={vistaActual === 'estadisticas' ? 'active' : ''}
          onClick={() => setVistaActual('estadisticas')}
        >
          Estadísticas
        </button>
      </div>

      {/* Vista Recientes */}
      {vistaActual === 'recientes' && (
        <div className="timeline">
          {historialReciente?.map(cambio => (
            <div key={cambio.id} className="timeline-item">
              <div className="timeline-marker" style={{ backgroundColor: getColor(cambio.operacion) }} />
              <div className="timeline-content">
                <div className="header">
                  <span className="operacion">{formatOperacion(cambio.operacion)}</span>
                  <span className="fecha">{formatFecha(cambio.created_at)}</span>
                </div>
                <div className="details">
                  <span>{cambio.tabla_nombre}</span>
                  <span>por {cambio.usuario_email}</span>
                </div>
                <button onClick={() => setExpandedId(expandedId === cambio.id ? null : cambio.id)}>
                  {expandedId === cambio.id ? 'Ocultar' : 'Ver detalles'}
                </button>

                {/* Detalles expandibles */}
                {expandedId === cambio.id && (
                  <div className="diff">
                    <div className="antes">
                      <h4>Antes:</h4>
                      <pre>{JSON.stringify(cambio.datos_anteriores, null, 2)}</pre>
                    </div>
                    <div className="despues">
                      <h4>Después:</h4>
                      <pre>{JSON.stringify(cambio.datos_nuevos, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista Búsqueda */}
      {vistaActual === 'busqueda' && (
        <BusquedaAvanzada />
      )}

      {/* Vista Estadísticas */}
      {vistaActual === 'estadisticas' && (
        <EstadisticasPanel datos={estadisticas} />
      )}
    </div>
  );
}
```

---

### 6️⃣ SCREENS (Páginas)

#### `src/screens/facturas.jsx`
**¿Qué hace?** Gestión de facturas con items.

**Refactorización Sprint 4:**
```javascript
// ANTES: Solo mostraba materia_prima_id
<div>{item.materia_prima_id}</div>

// DESPUÉS: JOIN para mostrar nombre
const { data: facturaCompleta } = await supabase
  .from('facturas')
  .select(`
    *,
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
  `)
  .eq('id', facturaId)
  .single();

// Renderizar
<div>
  <div className="font-medium">
    {item.arbol_materia_prima?.nombre || "Producto sin nombre"}
  </div>
  {item.arbol_materia_prima?.codigo && (
    <div className="text-xs font-mono">
      {item.arbol_materia_prima.codigo}
    </div>
  )}
</div>
```

---

#### `src/screens/planta/productos.jsx`
**¿Qué hace?** Gestión de productos (presentaciones nivel 6).

**Refactorización Sprint 4:**
```javascript
// ANTES: Usaba catalogo_productos (tabla eliminada)
const { data } = await supabase
  .from('catalogo_productos')
  .select('*');

// DESPUÉS: Usa arbol_materia_prima nivel 6
const { data } = await supabase
  .from('arbol_materia_prima')
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
  .eq('nivel_actual', 6)  // Solo presentaciones
  .eq('activo', true);

// Categorías dinámicas desde nivel 5
const { data: categorias } = await supabase
  .from('arbol_materia_prima')
  .select('id, nombre')
  .eq('nivel_actual', 5)  // Stocks como categorías
  .eq('activo', true)
  .order('nombre');
```

---

### 7️⃣ ROUTER

#### `src/router/rolerouter.jsx`
**¿Qué hace?** Enruta componentes según el rol del usuario.

```javascript
const components = {
  // Admin
  stock_manager: StockManager,
  auditoria_viewer: AuditoriaViewer,

  // Planta
  productos: Productos,

  // Todos
  facturas: Facturas,
};

export function RoleRouter() {
  const { user } = useAuth();
  const [componentName] = useSearchParams();

  const Component = components[componentName] || NotFound;

  // Verificar permisos
  if (!canAccess(user.role, componentName)) {
    return <Forbidden />;
  }

  return <Component />;
}
```

---

### 8️⃣ TESTS

#### `tests/stockService.test.js`
**¿Qué hace?** Prueba todos los métodos de stockService.

**14 tests:**
1. ✅ getStockBajo con RPC
2. ✅ getStockBajo con fallback a vista
3. ✅ actualizarStock incremento
4. ✅ actualizarStock decremento
5. ✅ actualizarStockBatch exitoso
6. ✅ actualizarStockBatch con errores parciales
7. ✅ validarStockDisponible con stock suficiente
8. ✅ validarStockDisponible con stock insuficiente
9. ✅ getStockConAlertas
10. ✅ getPresentaciones
11. ✅ getCostoPromedio
12. ✅ getHistorialMovimientos
13. ✅ Manejo de errores
14. ✅ Edge cases

**Ejemplo de test con mock chaining:**
```javascript
it('debe obtener presentaciones de un stock', async () => {
  const mockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  mockQuery.order.mockResolvedValue({
    data: [{ id: '1', nombre: 'Bolsa 500g' }],
    error: null
  });

  supabase.from.mockReturnValue(mockQuery);

  const result = await stockService.getPresentaciones('stock-123');

  expect(mockQuery.eq).toHaveBeenCalledWith('parent_id', 'stock-123');
  expect(mockQuery.eq).toHaveBeenCalledWith('nivel_actual', 6);
  expect(result.data).toHaveLength(1);
});
```

---

#### `tests/auditoriaService.test.js`
**¿Qué hace?** Prueba todos los métodos de auditoriaService.

**20 tests:**
1-8. ✅ Métodos de consulta (historial, búsqueda, estadísticas, etc.)
9-12. ✅ Formatters (formatearOperacion, getColorOperacion)
13-16. ✅ Filtros complejos
17-20. ✅ Edge cases y manejo de errores

---

### 9️⃣ CONFIGURACIÓN

#### `package.json`
**¿Qué hace?** Define dependencias y scripts.

```json
{
  "scripts": {
    "dev": "vite",              // Servidor desarrollo
    "build": "vite build",       // Build producción
    "preview": "vite preview",   // Preview build
    "test": "vitest",            // Ejecutar tests
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.3.1",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "lucide-react": "^0.307.0"
  },
  "devDependencies": {
    "vite": "^5.0.8",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2"
  }
}
```

---

#### `vite.config.js`
**¿Qué hace?** Configuración de Vite (build tool).

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

#### `vitest.config.js`
**¿Qué hace?** Configuración de Vitest (testing).

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
});
```

---

## 🔗 FLUJO COMPLETO DE DATOS

### Ejemplo: Usuario actualiza stock

```
1. USUARIO hace click en botón "+10"
   ↓
2. COMPONENTE StockManager.jsx
   handleActualizar() ejecuta
   ↓
3. HOOK useActualizarStock()
   mutation.mutate({ stockId, cantidad, operacion })
   ↓
4. SERVICE stockService.js
   actualizarStock(stockId, cantidad, operacion)
   ↓
5. SUPABASE CLIENT supabaseClient.js
   supabase.rpc('actualizar_stock', params)
   ↓
6. HTTP REQUEST
   POST /rest/v1/rpc/actualizar_stock
   ↓
7. POSTGRESQL DATABASE
   FUNCTION actualizar_stock() ejecuta
   UPDATE arbol_materia_prima SET stock_actual = stock_actual + 10
   ↓
8. TRIGGER trg_recalcular_costos_receta
   Automáticamente recalcula costos afectados
   ↓
9. TRIGGER trg_auditoria_sistema
   Registra cambio en tabla auditoria_sistema
   ↓
10. HTTP RESPONSE
    { nuevo_stock: 110 }
    ↓
11. HOOK onSuccess
    queryClient.invalidateQueries(['stock-bajo'])
    ↓
12. REACT QUERY
    Detecta cache invalidado → refresca automáticamente
    ↓
13. COMPONENTE
    Recibe datos actualizados → re-renderiza
    ↓
14. UI
    Usuario ve nuevo stock: 110 unidades
```

---

## 📖 GLOSARIO DE TÉRMINOS

| Término | Definición | Analogía |
|---------|-----------|----------|
| **Service** | Clase que encapsula lógica de negocio | Mensajero entre frontend y backend |
| **Hook** | Función que encapsula lógica de React | Atajo de teclado para una tarea |
| **Store** | Estado global compartido (Zustand) | Pizarra compartida en oficina |
| **Query** | Petición de lectura de datos | Buscar en Google |
| **Mutation** | Petición de modificación de datos | Editar un documento |
| **Cache** | Datos guardados temporalmente | Recordar búsquedas recientes |
| **Invalidation** | Marcar cache como obsoleto | Borrar búsquedas guardadas |
| **RPC** | Función de PostgreSQL llamada remotamente | Pedir comida a domicilio |
| **Trigger** | Código que se ejecuta automáticamente | Alarma que se activa sola |
| **Vista (View)** | Query SQL guardada como tabla | Filtro de Instagram predefinido |
| **Mock** | Simulación de dependencia en tests | Doble de acción en películas |
| **Fallback** | Plan B cuando algo falla | Rueda de repuesto del carro |
| **Jerarquía** | Estructura de árbol padre-hijo | Árbol genealógico |
| **Nivel** | Posición en la jerarquía (1-6) | Piso de un edificio |
| **Parent** | Registro padre en jerarquía | Padre en árbol genealógico |
| **Child** | Registro hijo en jerarquía | Hijo en árbol genealógico |

---

## ✅ CHECKLIST DE COMPRENSIÓN

Usa esta lista para verificar tu entendimiento:

### Nivel Básico
- [ ] Entiendo qué es React y para qué sirve
- [ ] Entiendo qué es Supabase (PostgreSQL + API)
- [ ] Entiendo la estructura de 6 niveles del árbol
- [ ] Puedo explicar qué hace un Service
- [ ] Puedo explicar qué hace un Hook

### Nivel Intermedio
- [ ] Entiendo cómo funciona TanStack Query
- [ ] Entiendo la diferencia entre useQuery y useMutation
- [ ] Entiendo qué es Zustand y cuándo usarlo
- [ ] Entiendo qué son RPC functions y por qué usarlas
- [ ] Entiendo el patrón de Fallback

### Nivel Avanzado
- [ ] Puedo crear un nuevo Service desde cero
- [ ] Puedo crear nuevos Custom Hooks
- [ ] Entiendo cómo funciona la invalidación de cache
- [ ] Entiendo cómo escribir tests con mocks
- [ ] Puedo explicar el flujo completo de datos

### Nivel Experto
- [ ] Puedo diseñar nuevas features desde arquitectura
- [ ] Puedo optimizar queries y cache strategies
- [ ] Puedo debuggear problemas complejos
- [ ] Puedo escribir tests de integración
- [ ] Puedo enseñar estos conceptos a otros

---

## 📚 RECURSOS ADICIONALES

### Documentación Oficial
- React: https://react.dev/
- TanStack Query: https://tanstack.com/query/latest
- Supabase: https://supabase.com/docs
- Zustand: https://github.com/pmndrs/zustand
- Vitest: https://vitest.dev/

### Tutoriales Recomendados
- TanStack Query para principiantes
- Patrones de diseño en React
- Testing en React con Vitest
- PostgreSQL Triggers y Functions

---

_Este documento es tu guía completa para entender el sistema._
_Úsalo como referencia cuando tengas dudas sobre cualquier concepto._
_¡Ahora estás listo para dominar el código!_ 🚀
