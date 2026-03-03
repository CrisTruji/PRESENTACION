// ========================================
// STOCK MANAGER — Dashboard de gestión con alertas
// ========================================

import React, { useState } from 'react';
import {
  useStockConAlertas,
  useStockBajo,
  useActualizarStock,
} from '@/features/inventory';
import notify from '@/shared/lib/notifier';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  X,
  Activity,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const ESTADO_META = {
  'CRÍTICO': { label: 'Crítico',  barColor: 'bg-error',   textColor: 'text-error',   badgeCls: 'bg-error/10   text-error   border-error/30',   rowBorder: 'border-l-4 border-l-error   bg-error/[0.03]'   },
  'BAJO':    { label: 'Bajo',     barColor: 'bg-warning', textColor: 'text-warning', badgeCls: 'bg-warning/10 text-warning border-warning/30', rowBorder: 'border-l-4 border-l-warning bg-warning/[0.02]' },
  'EXCESO':  { label: 'Exceso',   barColor: 'bg-primary', textColor: 'text-primary', badgeCls: 'bg-primary/10 text-primary border-primary/30', rowBorder: 'border-l-4 border-l-primary bg-primary/[0.02]' },
  'NORMAL':  { label: 'Normal',   barColor: 'bg-success', textColor: 'text-success', badgeCls: 'bg-success/10 text-success border-success/30', rowBorder: 'border-l-4 border-l-success'                    },
};

const estadoMeta = (e) => ESTADO_META[e] ?? ESTADO_META['NORMAL'];

// ─────────────────────────────────────────────────────────────
// BarraStock — nivel visual entre 0 y max
// ─────────────────────────────────────────────────────────────
function BarraStock({ actual, minimo, maximo, unidad, estado }) {
  const refMax  = maximo || (minimo ? minimo * 3 : actual > 0 ? actual * 2 : 100);
  const pct     = Math.min(100, Math.max(0, Math.round((actual / refMax) * 100)));
  const minPct  = minimo ? Math.min(100, Math.round((minimo / refMax) * 100)) : null;
  const { barColor } = estadoMeta(estado);

  return (
    <div className="min-w-[130px]">
      {/* Número */}
      <div className="flex items-baseline justify-between gap-1 mb-1">
        <span className="font-semibold tabular-nums text-sm">
          {(actual ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-gray-400 ml-1">{unidad}</span>
        </span>
        {minimo && (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">mín {minimo}</span>
        )}
      </div>

      {/* Barra */}
      <div className="relative w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-visible">
        {minPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-yellow-400/80 z-10 rounded-full"
            style={{ left: `${minPct}%` }}
            title={`Mínimo: ${minimo}`}
          />
        )}
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Faltan X — solo para crítico/bajo */}
      {(estado === 'CRÍTICO' || estado === 'BAJO') && minimo && actual < minimo && (
        <div className="text-[10px] text-error mt-0.5 font-medium">
          Faltan {(minimo - actual).toLocaleString('es-ES', { maximumFractionDigits: 2 })} {unidad}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FilaStock — fila de tabla con destacado visual
// ─────────────────────────────────────────────────────────────
function FilaStock({ item, onActualizar }) {
  const meta = estadoMeta(item.estado_stock);

  return (
    <tr className={`transition-colors hover:brightness-95 dark:hover:brightness-110 ${meta.rowBorder}`}>
      {/* Estado */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${meta.badgeCls} ${item.estado_stock === 'CRÍTICO' ? 'animate-pulse' : ''}`}>
          {item.estado_stock === 'CRÍTICO' && <AlertCircle size={11} />}
          {item.estado_stock === 'BAJO'    && <AlertTriangle size={11} />}
          {item.estado_stock === 'EXCESO'  && <TrendingUp size={11} />}
          {item.estado_stock === 'NORMAL'  && <CheckCircle2 size={11} />}
          {meta.label}
        </span>
      </td>

      {/* Código */}
      <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
        {item.codigo}
      </td>

      {/* Nombre */}
      <td className="px-4 py-3 text-gray-800 dark:text-white font-medium">
        {item.nombre}
      </td>

      {/* Categoría */}
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {item.categoria_nombre || '—'}
      </td>

      {/* ── Barra de nivel ── */}
      <td className="px-4 py-3">
        <BarraStock
          actual={item.stock_actual ?? 0}
          minimo={item.stock_minimo}
          maximo={item.stock_maximo}
          unidad={item.unidad_medida}
          estado={item.estado_stock}
        />
      </td>

      {/* Valor */}
      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
        ${(item.valor_inventario ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
      </td>

      {/* Actualizar */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onActualizar(item)}
          className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm transition-colors"
        >
          Actualizar
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// StockManager — componente principal
// ─────────────────────────────────────────────────────────────
const StockManager = () => {
  const [vistaActual, setVistaActual]   = useState('alertas');
  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Queries
  const { data: stockConAlertas, isLoading: cargandoTodo, error: errorTodo, refetch: refrescarTodo } = useStockConAlertas();
  const { data: stockBajo, isLoading: cargandoBajo } = useStockBajo();
  const actualizarStockMutation = useActualizarStock();

  // Modal de actualización
  const [modalAbierto, setModalAbierto]       = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [cantidad, setCantidad]               = useState('');
  const [operacion, setOperacion]             = useState('incrementar');

  // ── Handlers ──
  const handleAbrirModal = (item) => {
    setItemSeleccionado(item);
    setCantidad('');
    setOperacion('incrementar');
    setModalAbierto(true);
  };

  const handleActualizarStock = async () => {
    if (!cantidad || isNaN(cantidad) || parseFloat(cantidad) <= 0) {
      notify.error('Ingresa una cantidad válida mayor a 0');
      return;
    }
    try {
      const result = await actualizarStockMutation.mutateAsync({
        stockId: itemSeleccionado.id,
        cantidad: parseFloat(cantidad),
        operacion,
      });
      const rpcData = Array.isArray(result?.data) ? result.data[0] : result?.data;
      if (rpcData && !rpcData.success) {
        notify.error(rpcData.mensaje || 'Error al actualizar stock');
        return;
      }
      setModalAbierto(false);
      notify.success(rpcData?.mensaje || 'Stock actualizado correctamente');
    } catch (err) {
      notify.error('Error al actualizar stock: ' + err.message);
    }
  };

  // ── Filtrado ──
  const itemsFiltrados = React.useMemo(() => {
    if (!stockConAlertas) return [];
    let items = stockConAlertas;
    if (busqueda.length >= 2) {
      items = items.filter(i =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codigo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    if (filtroEstado !== 'todos') {
      items = items.filter(i => i.estado_stock === filtroEstado);
    }
    return items;
  }, [stockConAlertas, busqueda, filtroEstado]);

  // ── Estadísticas ──
  const stats = React.useMemo(() => {
    if (!stockConAlertas) return null;
    return {
      total:      stockConAlertas.length,
      criticos:   stockConAlertas.filter(i => i.estado_stock === 'CRÍTICO').length,
      bajos:      stockConAlertas.filter(i => i.estado_stock === 'BAJO').length,
      exceso:     stockConAlertas.filter(i => i.estado_stock === 'EXCESO').length,
      normal:     stockConAlertas.filter(i => i.estado_stock === 'NORMAL').length,
      valorTotal: stockConAlertas.reduce((s, i) => s + (i.valor_inventario || 0), 0),
    };
  }, [stockConAlertas]);

  const itemsVista = vistaActual === 'alertas' ? stockBajo : itemsFiltrados;
  const cargando   = vistaActual === 'alertas' ? cargandoBajo : cargandoTodo;

  // ── Preview de nuevo stock en modal ──
  const previewStock = (() => {
    if (!itemSeleccionado || !cantidad || isNaN(cantidad)) return null;
    const cant = parseFloat(cantidad);
    const actual = itemSeleccionado.stock_actual ?? 0;
    switch (operacion) {
      case 'incrementar': return actual + cant;
      case 'decrementar': return Math.max(0, actual - cant);
      case 'establecer':  return cant;
      default:            return null;
    }
  })();

  // ── Error state ──
  if (errorTodo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error al cargar stock</p>
          <button onClick={refrescarTodo} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">

      {/* ── Header + estadísticas ── */}
      <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Package className="text-orange-500" size={26} />
              Gestión de Stock
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Control de inventario en tiempo real
            </p>
          </div>
          <button
            onClick={refrescarTodo}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Refrescar
          </button>
        </div>

        {/* ── Tarjetas de estadísticas mejoradas ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            </div>

            {/* Críticos — animado si hay */}
            <div className={`p-4 rounded-xl shadow-sm border ${stats.criticos > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600'}`}>
              <p className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                {stats.criticos > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block" />}
                Críticos
              </p>
              <p className={`text-2xl font-bold ${stats.criticos > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {stats.criticos}
              </p>
            </div>

            {/* Bajos */}
            <div className={`p-4 rounded-xl shadow-sm border ${stats.bajos > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600'}`}>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Bajos</p>
              <p className={`text-2xl font-bold ${stats.bajos > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {stats.bajos}
              </p>
            </div>

            {/* Exceso */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
              <p className="text-xs text-blue-500 mb-1">Exceso</p>
              <p className={`text-2xl font-bold ${stats.exceso > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                {stats.exceso}
              </p>
            </div>

            {/* Normal */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
              <p className="text-xs text-green-600 mb-1">Normal</p>
              <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
            </div>

            {/* Valor total */}
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
              <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                <DollarSign size={11} />
                Valor Total
              </p>
              <p className="text-lg font-bold text-green-600">
                ${stats.valorTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Barra de herramientas ── */}
      <div className="px-6 py-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setVistaActual('alertas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
              vistaActual === 'alertas'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
            }`}
          >
            <AlertTriangle size={14} />
            Alertas
            {(stockBajo?.length ?? 0) > 0 && (
              <span className={`text-xs rounded-full px-1.5 font-bold ${vistaActual === 'alertas' ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}`}>
                {stockBajo.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setVistaActual('todo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
              vistaActual === 'todo'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
            }`}
          >
            <Activity size={14} />
            Todo el Stock
          </button>
        </div>

        {/* Búsqueda */}
        <div className="flex-1 max-w-xs relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-9 pr-4 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>

        {/* Filtro estado (solo en vista todo) */}
        {vistaActual === 'todo' && (
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="todos">Todos los estados</option>
            <option value="CRÍTICO">Críticos</option>
            <option value="BAJO">Bajos</option>
            <option value="NORMAL">Normales</option>
            <option value="EXCESO">Exceso</option>
          </select>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : (itemsVista?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Package size={52} className="mb-4 opacity-40" />
            <p>No hay items que coincidan</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Nivel de Stock</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {itemsVista.map(item => (
                <FilaStock key={item.id} item={item} onActualizar={handleAbrirModal} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal de actualización ── */}
      {modalAbierto && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header del modal */}
            <div className={`px-6 pt-5 pb-4 border-b dark:border-gray-700 border-l-4 ${estadoMeta(itemSeleccionado.estado_stock).rowBorder}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    Actualizar Stock
                  </h3>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                    {itemSeleccionado.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Barra actual */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2">Stock actual</p>
                <BarraStock
                  actual={itemSeleccionado.stock_actual ?? 0}
                  minimo={itemSeleccionado.stock_minimo}
                  maximo={itemSeleccionado.stock_maximo}
                  unidad={itemSeleccionado.unidad_medida}
                  estado={itemSeleccionado.estado_stock}
                />
              </div>

              {/* Operación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Operación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'incrementar', label: 'Sumar',    icon: <Plus size={14} />,  cls: 'border-green-400 bg-green-50  text-green-700  dark:bg-green-900/30 dark:text-green-300' },
                    { v: 'decrementar', label: 'Restar',   icon: <Minus size={14} />, cls: 'border-red-400   bg-red-50    text-red-700    dark:bg-red-900/30   dark:text-red-300'   },
                    { v: 'establecer',  label: 'Fijar',    icon: <Activity size={14} />, cls: 'border-blue-400  bg-blue-50   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300'  },
                  ].map(op => (
                    <button
                      key={op.v}
                      onClick={() => setOperacion(op.v)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        operacion === op.v ? op.cls : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {op.icon}
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cantidad <span className="text-gray-400 font-normal">({itemSeleccionado.unidad_medida})</span>
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-lg font-semibold"
                  autoFocus
                />
              </div>

              {/* Preview del nuevo stock */}
              {previewStock !== null && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1.5">Resultado esperado</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 tabular-nums">
                      {(itemSeleccionado.stock_actual ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                    </span>
                    {operacion === 'incrementar' && <ArrowUp size={14} className="text-green-500" />}
                    {operacion === 'decrementar' && <ArrowDown size={14} className="text-red-500" />}
                    {operacion === 'establecer'  && <Activity size={14} className="text-blue-500" />}
                    <span className="text-lg font-bold tabular-nums">
                      {previewStock.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-gray-400">{itemSeleccionado.unidad_medida}</span>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-colors"
                  disabled={actualizarStockMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActualizarStock}
                  disabled={actualizarStockMutation.isPending || !cantidad}
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {actualizarStockMutation.isPending ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager;
