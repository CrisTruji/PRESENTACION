// src/features/inventory/components/Inventario.jsx
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
  Warehouse,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Minus,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers de color / estado
// ─────────────────────────────────────────────────────────────
const getEstadoColor = (estado) => {
  switch (estado) {
    case 'normal':  return 'text-success bg-success/10 border-success/20';
    case 'bajo':    return 'text-warning bg-warning/10 border-warning/20';
    case 'agotado': return 'text-error   bg-error/10   border-error/20';
    case 'exceso':  return 'text-primary bg-primary/10 border-primary/20';
    default:        return 'text-muted   bg-muted/10   border-muted/20';
  }
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case 'normal':  return 'Normal';
    case 'bajo':    return 'Bajo';
    case 'agotado': return 'Agotado';
    case 'exceso':  return 'Exceso';
    default:        return estado;
  }
};

// Borde izquierdo coloreado por estado
const getRowBorderClass = (estado) => {
  switch (estado) {
    case 'agotado': return 'border-l-4 border-l-error   bg-error/[0.02]';
    case 'bajo':    return 'border-l-4 border-l-warning bg-warning/[0.02]';
    case 'exceso':  return 'border-l-4 border-l-primary bg-primary/[0.02]';
    case 'normal':  return 'border-l-4 border-l-success';
    default:        return 'border-l-4 border-l-transparent';
  }
};

// Icono representativo de estado
const EstadoIcon = ({ estado, size = 14 }) => {
  switch (estado) {
    case 'agotado': return <AlertCircle size={size} className="text-error" />;
    case 'bajo':    return <AlertTriangle size={size} className="text-warning" />;
    case 'exceso':  return <TrendingUp size={size} className="text-primary" />;
    case 'normal':  return <CheckCircle2 size={size} className="text-success" />;
    default:        return <Minus size={size} className="text-muted" />;
  }
};

// ─────────────────────────────────────────────────────────────
// BarraStock — barra visual de nivel de inventario
// ─────────────────────────────────────────────────────────────
function BarraStock({ actual, minimo, maximo, unidad, estado }) {
  const refMax = maximo
    ? maximo
    : minimo
    ? minimo * 3
    : actual > 0
    ? actual * 2
    : 100;

  const pct    = Math.min(100, Math.max(0, Math.round((actual / refMax) * 100)));
  const minPct = minimo ? Math.min(100, Math.round((minimo / refMax) * 100)) : null;

  const barColor = {
    agotado: 'bg-error',
    bajo:    'bg-warning',
    exceso:  'bg-primary',
    normal:  'bg-success',
  }[estado] ?? 'bg-success';

  return (
    <div className="min-w-[130px]">
      {/* Número principal */}
      <div className="flex items-baseline justify-between gap-1 mb-1">
        <span className="font-semibold tabular-nums">
          {(actual || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          <span className="text-muted text-xs font-normal ml-1">{unidad}</span>
        </span>
        {minimo && (
          <span className="text-[10px] text-muted whitespace-nowrap">
            mín&nbsp;{minimo}
          </span>
        )}
      </div>

      {/* Barra */}
      <div className="relative w-full bg-base h-2 rounded-full overflow-visible">
        {/* Marcador del mínimo */}
        {minPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-warning/70 z-10 rounded-full"
            style={{ left: `${minPct}%` }}
            title={`Mínimo: ${minimo}`}
          />
        )}
        {/* Relleno */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Labels min/max si existen */}
      {minimo && maximo && (
        <div className="flex justify-between text-[9px] text-muted mt-0.5 px-0.5">
          <span>0</span>
          <span>mín {minimo}</span>
          <span>máx {maximo}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MovimientoCard — tarjeta visual para cada movimiento
// ─────────────────────────────────────────────────────────────
function MovimientoCard({ mov, index }) {
  const esEntrada = mov.tipo_movimiento === 'entrada';
  const delta     = (mov.stock_posterior ?? 0) - (mov.stock_anterior ?? 0);
  const fecha     = new Date(mov.created_at);

  // Mini barra comparativa antes/después
  const refMax    = Math.max(mov.stock_anterior ?? 0, mov.stock_posterior ?? 0, 1);
  const pctAntes  = Math.min(100, Math.round(((mov.stock_anterior ?? 0) / refMax) * 100));
  const pctDespues= Math.min(100, Math.round(((mov.stock_posterior ?? 0) / refMax) * 100));

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        esEntrada
          ? 'border-success/20 bg-success/5'
          : 'border-error/20 bg-error/5'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Icono */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          esEntrada ? 'bg-success/15' : 'bg-error/15'
        }`}
      >
        {esEntrada
          ? <ArrowUp size={15} className="text-success" />
          : <ArrowDown size={15} className="text-error" />
        }
      </div>

      {/* Delta grande */}
      <div className="w-20 text-right flex-shrink-0">
        <span className={`text-base font-bold tabular-nums ${esEntrada ? 'text-success' : 'text-error'}`}>
          {esEntrada ? '+' : ''}{delta.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Mini barra antes → después */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          {/* Barra antes */}
          <div className="flex-1 bg-base h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-muted/40 rounded-full" style={{ width: `${pctAntes}%` }} />
          </div>
          <ArrowRight size={10} className="text-muted flex-shrink-0" />
          {/* Barra después */}
          <div className="flex-1 bg-base h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${esEntrada ? 'bg-success' : 'bg-error'}`}
              style={{ width: `${pctDespues}%` }}
            />
          </div>
        </div>

        {/* Presentación + fecha */}
        <div className="text-xs text-muted truncate">
          {mov.presentacion?.nombre || 'Ajuste directo'}
          {mov.cantidad_presentacion
            ? ` · ${mov.cantidad_presentacion} unid.`
            : ''}
        </div>
      </div>

      {/* Stock ant → post + hora */}
      <div className="text-right flex-shrink-0 text-xs">
        <div className="tabular-nums">
          <span className="text-muted">{(mov.stock_anterior ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
          <span className="mx-1 text-muted">→</span>
          <span className="font-semibold">{(mov.stock_posterior ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="text-muted">
          {fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          {' '}
          {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function Inventario() {
  const [loading, setLoading]           = useState(true);
  const [productos, setProductos]       = useState([]);
  const [resumen, setResumen]           = useState(null);
  const [filtroTipo, setFiltroTipo]     = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda]         = useState('');
  const [ordenCampo, setOrdenCampo]     = useState('nombre');
  const [ordenDir, setOrdenDir]         = useState('asc');

  // Modal de detalle
  const [modalProducto, setModalProducto]   = useState(null);
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => { cargarInventario(); }, []);

  async function cargarInventario() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('arbol_materia_prima')
        .select(`
          id, codigo, nombre, tipo_rama,
          stock_actual, stock_minimo, stock_maximo,
          unidad_stock, costo_promedio, maneja_stock, activo, parent_id
        `)
        .eq('nivel_actual', 5)
        .eq('activo', true)
        .eq('maneja_stock', true)
        .order('nombre');

      if (error) throw error;

      const productosConValores = (data || []).map(p => ({
        ...p,
        valor_inventario: (p.stock_actual || 0) * (p.costo_promedio || 0),
        estado_stock: calcularEstadoStock(p),
      }));

      setProductos(productosConValores);

      setResumen({
        total_productos: productosConValores.length,
        valor_total:     productosConValores.reduce((s, p) => s + p.valor_inventario, 0),
        bajo_stock:      productosConValores.filter(p => p.estado_stock === 'bajo').length,
        sin_stock:       productosConValores.filter(p => p.estado_stock === 'agotado').length,
        exceso:          productosConValores.filter(p => p.estado_stock === 'exceso').length,
      });
    } catch (err) {
      console.error('Error cargando inventario:', err);
      notify.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  }

  function calcularEstadoStock(p) {
    const stock = p.stock_actual || 0;
    if (stock === 0)                                  return 'agotado';
    if (p.stock_minimo && stock < p.stock_minimo)     return 'bajo';
    if (p.stock_maximo && stock > p.stock_maximo)     return 'exceso';
    return 'normal';
  }

  // Filtrar + ordenar
  const productosOrdenados = [...productos]
    .filter(p => {
      if (filtroTipo   !== 'todos' && p.tipo_rama    !== filtroTipo)    return false;
      if (filtroEstado !== 'todos' && p.estado_stock !== filtroEstado)  return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        return p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t);
      }
      return true;
    })
    .sort((a, b) => {
      let vA = a[ordenCampo];
      let vB = b[ordenCampo];
      if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB?.toLowerCase() ?? ''; }
      return ordenDir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

  function handleOrden(campo) {
    if (ordenCampo === campo) setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrdenCampo(campo); setOrdenDir('asc'); }
  }

  async function verDetalle(producto) {
    setModalProducto(producto);
    setCargandoDetalle(true);
    try {
      const [{ data: presentaciones }, { data: movimientos }] = await Promise.all([
        supabase
          .from('arbol_materia_prima')
          .select('id, codigo, nombre, contenido_unidad, unidad_contenido')
          .eq('parent_id', producto.id)
          .eq('nivel_actual', 6)
          .eq('activo', true),
        supabase
          .from('movimientos_inventario')
          .select(`
            id, tipo_movimiento,
            cantidad_presentacion, cantidad_unidad_base,
            stock_anterior, stock_posterior,
            costo_unitario, created_at,
            presentacion:presentacion_id (nombre)
          `)
          .eq('producto_id', producto.id)
          .order('created_at', { ascending: false })
          .limit(15),
      ]);
      setDetalleProducto({ presentaciones: presentaciones || [], movimientos: movimientos || [] });
    } catch (err) {
      console.error('Error cargando detalle:', err);
      notify.error('Error al cargar detalle');
    } finally {
      setCargandoDetalle(false);
    }
  }

  const OrdenIcon = ({ campo }) =>
    ordenCampo !== campo ? null :
    ordenDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;

  if (loading) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4" />
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

        {/* ── Header ── */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title flex items-center gap-3">
                <Warehouse size={28} className="text-primary" />
                Inventario de Materia Prima
              </h1>
              <p className="section-subtitle">Control de stock y costos de productos</p>
            </div>
            <button onClick={cargarInventario} className="btn btn-outline flex items-center gap-2">
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {/* ── Resumen ── */}
        {resumen && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Total Productos</p>
                  <p className="text-2xl font-bold">{resumen.total_productos}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package size={20} className="text-primary" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Valor Inventario</p>
                  <p className="text-lg font-bold text-success">
                    ${resumen.valor_total.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                  <DollarSign size={20} className="text-success" />
                </div>
              </div>
            </div>

            {/* Agotado */}
            <div className={`card p-4 ${resumen.sin_stock > 0 ? 'ring-1 ring-error/40' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Agotados</p>
                  <p className={`text-2xl font-bold ${resumen.sin_stock > 0 ? 'text-error' : 'text-muted'}`}>
                    {resumen.sin_stock}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${resumen.sin_stock > 0 ? 'bg-error/15 animate-pulse' : 'bg-muted/10'}`}>
                  <AlertTriangle size={20} className={resumen.sin_stock > 0 ? 'text-error' : 'text-muted'} />
                </div>
              </div>
            </div>

            {/* Bajo stock */}
            <div className={`card p-4 ${resumen.bajo_stock > 0 ? 'ring-1 ring-warning/40' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Bajo Stock</p>
                  <p className={`text-2xl font-bold ${resumen.bajo_stock > 0 ? 'text-warning' : 'text-muted'}`}>
                    {resumen.bajo_stock}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${resumen.bajo_stock > 0 ? 'bg-warning/15' : 'bg-muted/10'}`}>
                  <TrendingDown size={20} className={resumen.bajo_stock > 0 ? 'text-warning' : 'text-muted'} />
                </div>
              </div>
            </div>

            {/* Exceso */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Exceso</p>
                  <p className={`text-2xl font-bold ${resumen.exceso > 0 ? 'text-primary' : 'text-muted'}`}>
                    {resumen.exceso ?? 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="text"
                placeholder="Buscar nombre o código..."
                className="form-input pl-10"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <select className="form-input pl-10" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="todos">Todos los tipos</option>
                <option value="produccion">Producción</option>
                <option value="entregable">Entregables</option>
                <option value="desechable">Desechables</option>
              </select>
            </div>

            <div className="relative">
              <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <select className="form-input pl-10" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="normal">Normal</option>
                <option value="bajo">Bajo stock</option>
                <option value="agotado">Agotado</option>
                <option value="exceso">Exceso</option>
              </select>
            </div>

            <div className="flex items-center justify-end">
              <span className="badge badge-primary">{productosOrdenados.length} productos</span>
            </div>
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell cursor-pointer hover:bg-app" onClick={() => handleOrden('codigo')}>
                    <div className="flex items-center gap-1">Código <OrdenIcon campo="codigo" /></div>
                  </th>
                  <th className="table-header-cell cursor-pointer hover:bg-app" onClick={() => handleOrden('nombre')}>
                    <div className="flex items-center gap-1">Producto <OrdenIcon campo="nombre" /></div>
                  </th>
                  <th className="table-header-cell">Tipo</th>
                  <th className="table-header-cell cursor-pointer hover:bg-app" onClick={() => handleOrden('stock_actual')}>
                    <div className="flex items-center gap-1">Nivel de Stock <OrdenIcon campo="stock_actual" /></div>
                  </th>
                  <th className="table-header-cell text-center">Estado</th>
                  <th className="table-header-cell cursor-pointer hover:bg-app text-right" onClick={() => handleOrden('costo_promedio')}>
                    <div className="flex items-center justify-end gap-1">Costo Prom. <OrdenIcon campo="costo_promedio" /></div>
                  </th>
                  <th className="table-header-cell cursor-pointer hover:bg-app text-right" onClick={() => handleOrden('valor_inventario')}>
                    <div className="flex items-center justify-end gap-1">Valor <OrdenIcon campo="valor_inventario" /></div>
                  </th>
                  <th className="table-header-cell text-center">Detalle</th>
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
                  productosOrdenados.map(producto => (
                    <tr
                      key={producto.id}
                      className={`table-row ${getRowBorderClass(producto.estado_stock)}`}
                    >
                      {/* Código */}
                      <td className="table-cell">
                        <span className="font-mono text-sm text-primary">{producto.codigo}</span>
                      </td>

                      {/* Nombre */}
                      <td className="table-cell">
                        <div className="font-medium">{producto.nombre}</div>
                      </td>

                      {/* Tipo */}
                      <td className="table-cell">
                        <span className="badge badge-outline text-xs capitalize">{producto.tipo_rama}</span>
                      </td>

                      {/* ── Barra de stock ── */}
                      <td className="table-cell">
                        <BarraStock
                          actual={producto.stock_actual || 0}
                          minimo={producto.stock_minimo}
                          maximo={producto.stock_maximo}
                          unidad={producto.unidad_stock}
                          estado={producto.estado_stock}
                        />
                      </td>

                      {/* Estado con icono */}
                      <td className="table-cell text-center">
                        <span className={`badge border inline-flex items-center gap-1 ${getEstadoColor(producto.estado_stock)} ${producto.estado_stock === 'agotado' ? 'animate-pulse' : ''}`}>
                          <EstadoIcon estado={producto.estado_stock} size={12} />
                          {getEstadoLabel(producto.estado_stock)}
                        </span>
                      </td>

                      {/* Costo promedio */}
                      <td className="table-cell text-right">
                        {producto.costo_promedio
                          ? <span className="font-medium">${producto.costo_promedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>

                      {/* Valor inventario */}
                      <td className="table-cell text-right">
                        <span className="font-semibold text-success">
                          ${producto.valor_inventario.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Ver detalle */}
                      <td className="table-cell text-center">
                        <button
                          onClick={() => verDetalle(producto)}
                          className="btn btn-icon btn-outline"
                          title="Ver movimientos"
                        >
                          <Activity size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Modal de detalle ── */}
        {modalProducto && (
          <DetalleProductoModal
            producto={modalProducto}
            detalle={detalleProducto}
            cargando={cargandoDetalle}
            onClose={() => { setModalProducto(null); setDetalleProducto(null); }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal de detalle
// ─────────────────────────────────────────────────────────────
function DetalleProductoModal({ producto, detalle, cargando, onClose }) {
  const ultimoMov   = detalle?.movimientos?.[0];
  const tendencia   = ultimoMov
    ? (ultimoMov.tipo_movimiento === 'entrada' ? 'up' : 'down')
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="card-header border-b border-base">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Database size={22} className="text-primary" />
                {producto.nombre}
              </h2>
              <p className="text-muted font-mono text-sm">{producto.codigo}</p>
            </div>
            <button onClick={onClose} className="btn btn-icon btn-outline">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Cards de resumen ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Stock actual (con barra) */}
            <div className={`rounded-lg p-4 border-l-4 col-span-2 ${getRowBorderClass(producto.estado_stock)} border border-base`}>
              <p className="text-xs text-muted mb-2">Nivel de Stock</p>
              <BarraStock
                actual={producto.stock_actual || 0}
                minimo={producto.stock_minimo}
                maximo={producto.stock_maximo}
                unidad={producto.unidad_stock}
                estado={producto.estado_stock}
              />
            </div>

            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-xs text-muted mb-1">Estado</p>
              <span className={`badge border inline-flex items-center gap-1 ${getEstadoColor(producto.estado_stock)}`}>
                <EstadoIcon estado={producto.estado_stock} />
                {getEstadoLabel(producto.estado_stock)}
              </span>
              {tendencia && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted">
                  {tendencia === 'up'
                    ? <TrendingUp size={12} className="text-success" />
                    : <TrendingDown size={12} className="text-error" />
                  }
                  Último mov.
                </div>
              )}
            </div>

            <div className="bg-surface border border-base rounded-base p-4">
              <p className="text-xs text-muted mb-1">Valor Inventario</p>
              <p className="text-lg font-bold text-success">
                ${producto.valor_inventario.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              </p>
              {producto.costo_promedio && (
                <p className="text-xs text-muted mt-1">
                  Costo: ${producto.costo_promedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {cargando ? (
            <div className="py-12 text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
              <p className="text-muted">Cargando historial...</p>
            </div>
          ) : detalle && (
            <>
              {/* ── Presentaciones ── */}
              {detalle.presentaciones.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
                    <Package size={16} className="text-primary" />
                    Presentaciones ({detalle.presentaciones.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {detalle.presentaciones.map(pres => (
                      <div key={pres.id} className="bg-surface border border-base rounded-base p-3">
                        <div className="font-medium text-sm">{pres.nombre}</div>
                        <div className="text-xs text-muted">Código: {pres.codigo}</div>
                        <div className="text-xs text-primary mt-1">
                          {pres.contenido_unidad} {pres.unidad_contenido}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Historial de movimientos ── */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Activity size={16} className="text-primary" />
                  Últimos Movimientos
                  {detalle.movimientos.length > 0 && (
                    <span className="text-xs text-muted font-normal">
                      ({detalle.movimientos.length})
                    </span>
                  )}
                </h3>

                {detalle.movimientos.length === 0 ? (
                  <p className="text-muted text-sm p-4 bg-surface rounded-base text-center">
                    No hay movimientos registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detalle.movimientos.map((mov, i) => (
                      <MovimientoCard key={mov.id} mov={mov} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer border-t border-base">
          <button onClick={onClose} className="btn btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
