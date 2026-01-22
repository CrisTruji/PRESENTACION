import React, { useState, useEffect } from 'react';

/**
 * Componente de búsqueda y filtros para el árbol
 * Implementa debounce para optimizar búsquedas
 */
const BuscadorArbol = ({
  busqueda,
  onBusquedaChange,
  filtros,
  onFiltrosChange,
  tipoSeleccionado
}) => {

  const [terminoLocal, setTerminoLocal] = useState(busqueda);

  /**
   * Implementar debounce para búsqueda
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (terminoLocal !== busqueda) {
        onBusquedaChange(terminoLocal);
      }
    }, 400); // 400ms de debounce

    return () => clearTimeout(timer);
  }, [terminoLocal]);

  /**
   * Sincronizar con prop busqueda (cuando se limpia externamente)
   */
  useEffect(() => {
    setTerminoLocal(busqueda);
  }, [busqueda]);

  /**
   * Manejar cambio en filtro de categoría
   */
  const handleCategoriaChange = (e) => {
    const categoria = e.target.value;
    onFiltrosChange({
      ...filtros,
      categoria: categoria || null
    });
  };

  /**
   * Manejar cambio en filtro de stock bajo
   */
  const handleStockBajoChange = (e) => {
    const stockBajo = e.target.value === 'true';
    onFiltrosChange({
      ...filtros,
      stock_bajo: e.target.value ? stockBajo : null
    });
  };

  /**
   * Limpiar filtros
   */
  const limpiarFiltros = () => {
    setTerminoLocal('');
    onBusquedaChange('');
    onFiltrosChange({});
  };

  return (
    <div className="p-4 bg-white border-b">
      <div className="flex items-center space-x-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={terminoLocal}
            onChange={(e) => setTerminoLocal(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro de Categoría */}
        <div className="w-48">
          <select
            value={filtros.categoria || ''}
            onChange={handleCategoriaChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {/* TODO: Cargar categorías dinámicamente desde BD */}
            <option value="proteinas">Proteínas</option>
            <option value="lacteos">Lácteos</option>
            <option value="frutas">Frutas y Verduras</option>
            <option value="granos">Granos</option>
          </select>
        </div>

        {/* Filtro de Stock Bajo */}
        <div className="w-40">
          <select
            value={filtros.stock_bajo === true ? 'true' : filtros.stock_bajo === false ? 'false' : ''}
            onChange={handleStockBajoChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todo el stock</option>
            <option value="true">Stock bajo</option>
            <option value="false">Stock OK</option>
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {(terminoLocal || Object.keys(filtros).length > 0) && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Indicador de búsqueda activa */}
      {terminoLocal && terminoLocal.length >= 3 && (
        <div className="mt-2 text-sm text-gray-500">
          Buscando: <span className="font-medium">{terminoLocal}</span>
        </div>
      )}
    </div>
  );
};

export default BuscadorArbol;
