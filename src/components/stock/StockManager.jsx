// ========================================
// STOCK MANAGER - Sprint 3
// Dashboard de gestión de stock con alertas
// ========================================

import React, { useState } from 'react';
import { useStockConAlertas, useStockBajo, useActualizarStock } from '../../hooks/useStock';

const StockManager = () => {
  const [vistaActual, setVistaActual] = useState('alertas'); // 'alertas' | 'todo'
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'CRITICO' | 'BAJO' | 'NORMAL'

  // Queries
  const {
    data: stockConAlertas,
    isLoading: cargandoTodo,
    error: errorTodo,
    refetch: refrescarTodo,
  } = useStockConAlertas();

  const {
    data: stockBajo,
    isLoading: cargandoBajo,
    error: errorBajo,
  } = useStockBajo();

  // Mutation para actualizar stock
  const actualizarStockMutation = useActualizarStock();

  // Estado local para modal de actualización
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
  // FILTRADO Y BÚSQUEDA
  // ========================================

  const itemsFiltrados = React.useMemo(() => {
    if (!stockConAlertas) return [];

    let items = stockConAlertas;

    // Filtrar por búsqueda
    if (busqueda.length >= 2) {
      items = items.filter(
        (item) =>
          item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          item.codigo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      items = items.filter((item) => item.estado_stock === filtroEstado);
    }

    return items;
  }, [stockConAlertas, busqueda, filtroEstado]);

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  const stats = React.useMemo(() => {
    if (!stockConAlertas) return null;

    return {
      total: stockConAlertas.length,
      criticos: stockConAlertas.filter((i) => i.estado_stock === 'CRÍTICO').length,
      bajos: stockConAlertas.filter((i) => i.estado_stock === 'BAJO').length,
      exceso: stockConAlertas.filter((i) => i.estado_stock === 'EXCESO').length,
      normal: stockConAlertas.filter((i) => i.estado_stock === 'NORMAL').length,
      valorTotal: stockConAlertas.reduce((sum, i) => sum + (i.valor_inventario || 0), 0),
    };
  }, [stockConAlertas]);

  // ========================================
  // RENDER: Estados de carga/error
  // ========================================

  if (cargandoTodo && vistaActual === 'todo') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (errorTodo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar stock</p>
          <button
            onClick={refrescarTodo}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: Interfaz principal
  // ========================================

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header con estadísticas */}
      <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              📦 Gestión de Stock
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sistema de control de inventario
            </p>
          </div>

          <button
            onClick={refrescarTodo}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
          >
            🔄 Refrescar
          </button>
        </div>

        {/* Tarjetas de estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow border-l-4 border-red-500">
              <p className="text-xs text-red-700 dark:text-red-300 mb-1">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticos}</p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">Bajos</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.bajos}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Exceso</p>
              <p className="text-2xl font-bold text-blue-600">{stats.exceso}</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
              <p className="text-xs text-green-700 dark:text-green-300 mb-1">Valor Total</p>
              <p className="text-xl font-bold text-green-600">
                ${stats.valorTotal.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de herramientas */}
      <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActual('alertas')}
              className={`px-4 py-2 rounded-lg ${
                vistaActual === 'alertas'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              ⚠️ Alertas ({stockBajo?.length || 0})
            </button>
            <button
              onClick={() => setVistaActual('todo')}
              className={`px-4 py-2 rounded-lg ${
                vistaActual === 'todo'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg"
            />
          </div>

          {/* Filtro de estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg"
          >
            <option value="todos">Todos los estados</option>
            <option value="CRÍTICO">Críticos</option>
            <option value="BAJO">Bajos</option>
            <option value="NORMAL">Normales</option>
            <option value="EXCESO">Exceso</option>
          </select>
        </div>
      </div>

      {/* Tabla de stock */}
      <div className="flex-1 overflow-y-auto p-4">
        {vistaActual === 'alertas' && cargandoBajo ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                  Stock Actual
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                  Stock Mínimo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300">
                  Valor
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {(vistaActual === 'alertas' ? stockBajo : itemsFiltrados)?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                    {item.codigo}
                  </td>
                  <td className="px-4 py-3 text-gray-800 dark:text-white">{item.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.categoria_nombre || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {item.stock_actual} {item.unidad_medida}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {item.stock_minimo} {item.unidad_medida}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    ${(item.valor_inventario || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAbrirModal(item)}
                      className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                    >
                      Actualizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Empty state */}
        {itemsFiltrados?.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📦</span>
            <p className="text-gray-500 dark:text-gray-400">No hay items que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Modal de actualización */}
      {modalAbierto && itemSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Actualizar Stock</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{itemSeleccionado.nombre}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Stock actual: {itemSeleccionado.stock_actual} {itemSeleccionado.unidad_medida}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Operación</label>
              <select
                value={operacion}
                onChange={(e) => setOperacion(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="incrementar">Incrementar (+)</option>
                <option value="decrementar">Decrementar (-)</option>
                <option value="establecer">Establecer cantidad exacta</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Cantidad</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg"
                disabled={actualizarStockMutation.isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleActualizarStock}
                disabled={actualizarStockMutation.isLoading}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
              >
                {actualizarStockMutation.isLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager;
