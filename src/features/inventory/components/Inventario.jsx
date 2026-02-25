// src/screens/admin/inventario.jsx
// Pantalla para visualizar el inventario de productos
import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';
import {
  Package,
  Search,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  Database,
  BarChart3,
  Loader2,
  CheckCircle,
  AlertCircle,
  Warehouse
} from 'lucide-react';

export default function Inventario() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ordenCampo, setOrdenCampo] = useState('nombre');
  const [ordenDir, setOrdenDir] = useState('asc');

  // Modal de detalle
  const [modalProducto, setModalProducto] = useState(null);
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    cargarInventario();
  }, []);

  async function cargarInventario() {
    setLoading(true);
    try {
      // Obtener productos nivel 5 que manejan stock
      const { data, error } = await supabase
        .from('arbol_materia_prima')
        .select(`
          id,
          codigo,
          nombre,
          tipo_rama,
          stock_actual,
          stock_minimo,
          stock_maximo,
          unidad_stock,
          costo_promedio,
          maneja_stock,
          activo,
          parent_id
        `)
        .eq('nivel_actual', 5)
        .eq('activo', true)
        .eq('maneja_stock', true)
        .order('nombre');

      if (error) throw error;

      // Calcular valores adicionales
      const productosConValores = (data || []).map(p => ({
        ...p,
        valor_inventario: (p.stock_actual || 0) * (p.costo_promedio || 0),
        estado_stock: calcularEstadoStock(p)
      }));

      setProductos(productosConValores);

      // Calcular resumen
      const totalProductos = productosConValores.length;
      const valorTotal = productosConValores.reduce((sum, p) => sum + p.valor_inventario, 0);
      const bajoStock = productosConValores.filter(p => p.estado_stock === 'bajo').length;
      const sinStock = productosConValores.filter(p => p.estado_stock === 'agotado').length;

      setResumen({
        total_productos: totalProductos,
        valor_total: valorTotal,
        bajo_stock: bajoStock,
        sin_stock: sinStock
      });

      notify.success(`Cargados ${totalProductos} productos`);
    } catch (error) {
      console.error('Error cargando inventario:', error);
      notify.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  }

  function calcularEstadoStock(producto) {
    const stock = producto.stock_actual || 0;
    if (stock === 0) return 'agotado';
    if (producto.stock_minimo && stock < producto.stock_minimo) return 'bajo';
    if (producto.stock_maximo && stock > producto.stock_maximo) return 'exceso';
    return 'normal';
  }

  // Filtrar productos
  const productosFiltrados = productos.filter(p => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && p.tipo_rama !== filtroTipo) return false;

    // Filtro por estado
    if (filtroEstado !== 'todos' && p.estado_stock !== filtroEstado) return false;

    // Filtro por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(termino) ||
        p.codigo.toLowerCase().includes(termino)
      );
    }

    return true;
  });

  // Ordenar
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    let valA = a[ordenCampo];
    let valB = b[ordenCampo];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB?.toLowerCase() || '';
    }

    if (ordenDir === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  function handleOrden(campo) {
    if (ordenCampo === campo) {
      setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenCampo(campo);
      setOrdenDir('asc');
    }
  }

  async function verDetalle(producto) {
    setModalProducto(producto);
    setCargandoDetalle(true);

    try {
      // Obtener presentaciones
      const { data: presentaciones } = await supabase
        .from('arbol_materia_prima')
        .select('id, codigo, nombre, contenido_unidad, unidad_contenido')
        .eq('parent_id', producto.id)
        .eq('nivel_actual', 6)
        .eq('activo', true);

      // Obtener últimos movimientos
      const { data: movimientos } = await supabase
        .from('movimientos_inventario')
        .select(`
          id,
          tipo_movimiento,
          cantidad_presentacion,
          cantidad_unidad_base,
          stock_anterior,
          stock_posterior,
          costo_unitario,
          costo_promedio_anterior,
          costo_promedio_posterior,
          created_at,
          presentacion:presentacion_id (nombre)
        `)
        .eq('producto_id', producto.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setDetalleProducto({
        presentaciones: presentaciones || [],
        movimientos: movimientos || []
      });
    } catch (error) {
      console.error('Error cargando detalle:', error);
      notify.error('Error al cargar detalle');
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarModal() {
    setModalProducto(null);
    setDetalleProducto(null);
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'normal': return 'text-success bg-success/10 border-success/20';
      case 'bajo': return 'text-warning bg-warning/10 border-warning/20';
      case 'agotado': return 'text-error bg-error/10 border-error/20';
      case 'exceso': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted bg-muted/10 border-muted/20';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'normal': return 'Normal';
      case 'bajo': return 'Bajo';
      case 'agotado': return 'Agotado';
      case 'exceso': return 'Exceso';
      default: return estado;
    }
  };

  if (loading) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-secondary">Cargando inventario...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title flex items-center gap-3">
                <Warehouse size={28} className="text-primary" />
                Inventario de Materia Prima
              </h1>
              <p className="section-subtitle">
                Control de stock y costos de productos
              </p>
            </div>
            <button
              onClick={cargarInventario}
              className="btn btn-outline flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Resumen */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Productos */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Productos</p>
                  <p className="text-2xl font-bold">{resumen.total_productos}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package size={24} className="text-primary" />
                </div>
              </div>
            </div>

            {/* Valor Total */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Valor Inventario</p>
                  <p className="text-2xl font-bold text-success">
                    ${resumen.valor_total.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <DollarSign size={24} className="text-success" />
                </div>
              </div>
            </div>

            {/* Bajo Stock */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Bajo Stock</p>
                  <p className="text-2xl font-bold text-warning">{resumen.bajo_stock}</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <TrendingDown size={24} className="text-warning" />
                </div>
              </div>
            </div>

            {/* Sin Stock */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Sin Stock</p>
                  <p className="text-2xl font-bold text-error">{resumen.sin_stock}</p>
                </div>
                <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-error" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                className="form-input pl-10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Filtro por tipo */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <select
                className="form-input pl-10"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos los tipos</option>
                <option value="produccion">Producción</option>
                <option value="entregable">Entregables</option>
                <option value="desechable">Desechables</option>
              </select>
            </div>

            {/* Filtro por estado */}
            <div className="relative">
              <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <select
                className="form-input pl-10"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="normal">Normal</option>
                <option value="bajo">Bajo stock</option>
                <option value="agotado">Agotado</option>
                <option value="exceso">Exceso</option>
              </select>
            </div>

            {/* Contador */}
            <div className="flex items-center justify-end">
              <span className="badge badge-primary">
                {productosOrdenados.length} productos
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleOrden('codigo')}
                  >
                    <div className="flex items-center gap-1">
                      Código
                      {ordenCampo === 'codigo' && (
                        ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleOrden('nombre')}
                  >
                    <div className="flex items-center gap-1">
                      Producto
                      {ordenCampo === 'nombre' && (
                        ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th className="table-header-cell">Tipo</th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app text-right"
                    onClick={() => handleOrden('stock_actual')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Stock
                      {ordenCampo === 'stock_actual' && (
                        ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th className="table-header-cell text-center">Estado</th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app text-right"
                    onClick={() => handleOrden('costo_promedio')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo Prom.
                      {ordenCampo === 'costo_promedio' && (
                        ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app text-right"
                    onClick={() => handleOrden('valor_inventario')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Valor
                      {ordenCampo === 'valor_inventario' && (
                        ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th className="table-header-cell text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <Package size={48} className="mx-auto mb-4 text-muted opacity-50" />
                      <p className="text-muted">No se encontraron productos</p>
                    </td>
                  </tr>
                ) : (
                  productosOrdenados.map((producto) => (
                    <tr key={producto.id} className="table-row">
                      <td className="table-cell">
                        <span className="font-mono text-sm text-primary">{producto.codigo}</span>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium">{producto.nombre}</div>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-outline text-xs capitalize">
                          {producto.tipo_rama}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div>
                          <span className="font-semibold">
                            {(producto.stock_actual || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted ml-1">{producto.unidad_stock}</span>
                        </div>
                        {producto.stock_minimo && (
                          <div className="text-xs text-muted">
                            Mín: {producto.stock_minimo}
                          </div>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge border ${getEstadoColor(producto.estado_stock)}`}>
                          {getEstadoLabel(producto.estado_stock)}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        {producto.costo_promedio ? (
                          <span className="font-medium">
                            ${producto.costo_promedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <span className="font-semibold text-success">
                          ${producto.valor_inventario.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => verDetalle(producto)}
                          className="btn btn-icon btn-outline"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de detalle */}
        {modalProducto && (
          <DetalleProductoModal
            producto={modalProducto}
            detalle={detalleProducto}
            cargando={cargandoDetalle}
            onClose={cerrarModal}
            getEstadoColor={getEstadoColor}
            getEstadoLabel={getEstadoLabel}
          />
        )}
      </div>
    </div>
  );
}

// Modal de detalle de producto
function DetalleProductoModal({ producto, detalle, cargando, onClose, getEstadoColor, getEstadoLabel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Database size={24} className="text-primary" />
                {producto.nombre}
              </h2>
              <p className="text-muted font-mono">{producto.codigo}</p>
            </div>
            <button onClick={onClose} className="btn btn-icon btn-outline">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Resumen del producto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-sm text-muted mb-1">Stock Actual</p>
              <p className="text-2xl font-bold">
                {(producto.stock_actual || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                <span className="text-sm font-normal text-muted ml-1">{producto.unidad_stock}</span>
              </p>
            </div>
            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-sm text-muted mb-1">Estado</p>
              <span className={`badge border ${getEstadoColor(producto.estado_stock)}`}>
                {getEstadoLabel(producto.estado_stock)}
              </span>
            </div>
            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-sm text-muted mb-1">Costo Promedio</p>
              <p className="text-2xl font-bold text-primary">
                ${(producto.costo_promedio || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-sm text-muted mb-1">Valor en Inventario</p>
              <p className="text-2xl font-bold text-success">
                ${producto.valor_inventario.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {cargando ? (
            <div className="py-12 text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
              <p className="text-muted">Cargando detalle...</p>
            </div>
          ) : detalle && (
            <>
              {/* Presentaciones */}
              <div className="mb-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Package size={18} className="text-primary" />
                  Presentaciones ({detalle.presentaciones.length})
                </h3>
                {detalle.presentaciones.length === 0 ? (
                  <p className="text-muted text-sm p-4 bg-surface rounded-base">
                    Este producto no tiene presentaciones configuradas
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detalle.presentaciones.map(pres => (
                      <div key={pres.id} className="bg-surface border border-base rounded-base p-3">
                        <div className="font-medium">{pres.nombre}</div>
                        <div className="text-sm text-muted">
                          Código: {pres.codigo}
                        </div>
                        <div className="text-sm text-primary mt-1">
                          Contenido: {pres.contenido_unidad} {pres.unidad_contenido}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Últimos movimientos */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  Últimos Movimientos
                </h3>
                {detalle.movimientos.length === 0 ? (
                  <p className="text-muted text-sm p-4 bg-surface rounded-base">
                    No hay movimientos registrados
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Fecha</th>
                          <th className="table-header-cell">Tipo</th>
                          <th className="table-header-cell">Presentación</th>
                          <th className="table-header-cell text-right">Cantidad</th>
                          <th className="table-header-cell text-right">Stock Ant.</th>
                          <th className="table-header-cell text-right">Stock Post.</th>
                          <th className="table-header-cell text-right">Costo Unit.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.movimientos.map(mov => (
                          <tr key={mov.id} className="table-row">
                            <td className="table-cell">
                              <div className="text-sm">
                                {new Date(mov.created_at).toLocaleDateString('es-ES')}
                              </div>
                              <div className="text-xs text-muted">
                                {new Date(mov.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className={`badge ${mov.tipo_movimiento === 'entrada' ? 'badge-success' : 'badge-error'}`}>
                                {mov.tipo_movimiento}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="text-sm">{mov.presentacion?.nombre || '—'}</div>
                              {mov.cantidad_presentacion && (
                                <div className="text-xs text-muted">
                                  {mov.cantidad_presentacion} unid.
                                </div>
                              )}
                            </td>
                            <td className="table-cell text-right">
                              <span className={mov.tipo_movimiento === 'entrada' ? 'text-success' : 'text-error'}>
                                {mov.tipo_movimiento === 'entrada' ? '+' : '-'}
                                {mov.cantidad_unidad_base?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="table-cell text-right text-muted">
                              {mov.stock_anterior?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="table-cell text-right font-medium">
                              {mov.stock_posterior?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="table-cell text-right">
                              ${mov.costo_unitario?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer">
          <button onClick={onClose} className="btn btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
