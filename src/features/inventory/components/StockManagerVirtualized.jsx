// ========================================
// STOCK MANAGER VIRTUALIZADO - Sprint 6.5
// Versión con react-window para listas grandes (>100 items)
// ========================================

import React, { useState } from 'react';
import { useStockConAlertas, useStockBajo, useActualizarStock } from '@/features/inventory';
import VirtualizedTable, { useTableColumns } from '@/shared/ui/VirtualizedTable';

const StockManagerVirtualized = () => {
  const [vistaActual, setVistaActual] = useState('alertas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Queries
  const {
    data: stockConAlertas,
    isLoading: cargandoTodo,
    refetch: refrescarTodo,
  } = useStockConAlertas();

  const {
    data: stockBajo,
    isLoading: cargandoBajo,
  } = useStockBajo();

  // Mutation
  const actualizarStockMutation = useActualizarStock();

  // Modal state
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [operacion, setOperacion] = useState('incrementar');

  // ========================================
  // HANDLERS
  // ========================================
  const handleAbrirModal = (item) => {
    setItemSeleccionado(item);
    setCantidad('');
    setOperacion('incrementar');
    setModalAbierto(true);
  };

  const handleActualizarStock = async () => {
    if (!cantidad || isNaN(cantidad) || parseFloat(cantidad) <= 0) {
      alert('Ingresa una cantidad válida');
      return;
    }

    try {
      await actualizarStockMutation.mutateAsync({
        stockId: itemSeleccionado.id,
        cantidad: parseFloat(cantidad),
        operacion,
      });

      setModalAbierto(false);
      alert('Stock actualizado correctamente');
    } catch (error) {
      alert('Error al actualizar stock: ' + error.message);
    }
  };

  // ========================================
  // FILTRADO
  // ========================================
  const itemsFiltrados = React.useMemo(() => {
    if (!stockConAlertas) return [];

    let items = stockConAlertas;

    // Filtrar por búsqueda
    if (busqueda.length >= 2) {
      items = items.filter(
        (item) =>
          item.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
          item.codigo?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      items = items.filter((item) => item.estado_stock === filtroEstado);
    }

    return items;
  }, [stockConAlertas, busqueda, filtroEstado]);

  // ========================================
  // CONFIGURACIÓN DE COLUMNAS
  // ========================================
  const columns = useTableColumns([
    {
      key: 'estado',
      header: 'Estado',
      width: '12%',
      render: (_, item) => (
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            item.estado_stock === 'CRÍTICO'
              ? 'bg-red-100 text-red-700'
              : item.estado_stock === 'BAJO'
              ? 'bg-yellow-100 text-yellow-700'
              : item.estado_stock === 'EXCESO'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {item.estado_stock}
        </span>
      ),
    },
    {
      key: 'codigo',
      header: 'Código',
      width: '12%',
      render: (_, item) => (
        <span className="font-mono text-sm text-muted">
          {item.codigo}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      width: '25%',
      render: (_, item) => (
        <span className="text-primary font-medium">
          {item.nombre}
        </span>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      width: '15%',
      render: (_, item) => (
        <span className="text-sm text-muted">
          {item.categoria_nombre || 'N/A'}
        </span>
      ),
    },
    {
      key: 'stock_actual',
      header: 'Stock Actual',
      width: '12%',
      align: 'right',
      render: (_, item) => (
        <span className="font-medium">
          {item.stock_actual} {item.unidad_medida}
        </span>
      ),
    },
    {
      key: 'stock_minimo',
      header: 'Stock Mínimo',
      width: '12%',
      align: 'right',
      render: (_, item) => (
        <span className="text-muted">
          {item.stock_minimo} {item.unidad_medida}
        </span>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      width: '12%',
      align: 'right',
      render: (_, item) => (
        <span className="font-medium text-green-600">
          ${(item.valor_inventario || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '10%',
      align: 'center',
      render: (_, item) => (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Evitar que se dispare onRowClick
            handleAbrirModal(item);
          }}
          className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark text-sm transition-colors"
        >
          Actualizar
        </button>
      ),
    },
  ]);

  // ========================================
  // ESTADÍSTICAS
  // ========================================
  const stats = React.useMemo(() => {
    const items = vistaActual === 'alertas' ? stockBajo : stockConAlertas;
    if (!items) return { total: 0, critico: 0, bajo: 0, normal: 0 };

    return {
      total: items.length,
      critico: items.filter((i) => i.estado_stock === 'CRÍTICO').length,
      bajo: items.filter((i) => i.estado_stock === 'BAJO').length,
      normal: items.filter((i) => i.estado_stock === 'NORMAL').length,
    };
  }, [stockBajo, stockConAlertas, vistaActual]);

  // Datos a mostrar en la tabla
  const dataActual = vistaActual === 'alertas' ? stockBajo : itemsFiltrados;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 bg-surface border-b border-border">
        <h1 className="text-3xl font-bold text-primary mb-2">
          📦 Gestión de Stock (Virtualizado)
        </h1>
        <p className="text-muted">
          Versión optimizada con react-window para listas grandes
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 p-6">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-muted">Total Items</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-red-600">{stats.critico}</div>
          <div className="text-sm text-muted">Críticos</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-yellow-600">{stats.bajo}</div>
          <div className="text-sm text-muted">Bajos</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
          <div className="text-sm text-muted">Normales</div>
        </div>
      </div>

      {/* Controles */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActual('alertas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                vistaActual === 'alertas'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted border border-border'
              }`}
            >
              ⚠️ Alertas ({stockBajo?.length || 0})
            </button>
            <button
              onClick={() => setVistaActual('todo')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                vistaActual === 'todo'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted border border-border'
              }`}
            >
              📋 Todo el Stock
            </button>
          </div>

          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
            />
          </div>

          {/* Filtro de estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-bg text-primary"
          >
            <option value="todos">Todos los estados</option>
            <option value="CRÍTICO">Críticos</option>
            <option value="BAJO">Bajos</option>
            <option value="NORMAL">Normales</option>
            <option value="EXCESO">Exceso</option>
          </select>

          {/* Botón refrescar */}
          <button
            onClick={() => refrescarTodo()}
            className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-bg transition-colors"
            title="Refrescar datos"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tabla Virtualizada */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        {(vistaActual === 'alertas' && cargandoBajo) || (vistaActual === 'todo' && cargandoTodo) ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted">Cargando stock...</p>
            </div>
          </div>
        ) : (
          <VirtualizedTable
            data={dataActual || []}
            columns={columns}
            rowHeight={60}
            tableHeight={window.innerHeight - 400} // Ajustar a la altura disponible
            emptyMessage="No hay items que coincidan con los filtros"
            onRowClick={(item) => console.log('Click en fila:', item)}
          />
        )}
      </div>

      {/* Modal de actualización */}
      {modalAbierto && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold text-primary mb-4">Actualizar Stock</h3>

            <div className="mb-4 p-3 bg-bg rounded border border-border">
              <p className="text-sm text-muted">
                <strong className="text-primary">{itemSeleccionado.nombre}</strong>
              </p>
              <p className="text-xs text-muted mt-1">
                Stock actual: {itemSeleccionado.stock_actual} {itemSeleccionado.unidad_medida}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Operación
              </label>
              <select
                value={operacion}
                onChange={(e) => setOperacion(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
              >
                <option value="incrementar">➕ Incrementar (Entrada)</option>
                <option value="decrementar">➖ Decrementar (Salida)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Cantidad
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                placeholder="Ej: 50"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleActualizarStock}
                disabled={actualizarStockMutation.isLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {actualizarStockMutation.isLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagerVirtualized;
