import React from 'react';

/**
 * Componente recursivo para renderizar cada nodo del árbol
 * Maneja la visualización jerárquica y las acciones por nivel
 */
const NodoArbol = ({
  nodo,
  nivel,
  expandido,
  hijos = [],
  hijosMap,
  expandidos,
  onToggle,
  onRefresh
}) => {

  /**
   * Obtener icono según el nivel del nodo
   */
  const getIcono = () => {
    switch (nodo.nivel_actual) {
      case 1: return '📦'; // Raíz
      case 2:
        // Según tipo de rama
        if (nodo.tipo_rama === 'produccion') return '🏭';
        if (nodo.tipo_rama === 'entregable') return '📦';
        if (nodo.tipo_rama === 'desechable') return '🧹';
        return '📁';
      case 3: return '📁'; // Categoría
      case 4: return '📁'; // Subcategoría
      case 5: return '📦'; // Producto
      case 6: return '📄'; // Presentación
      default: return '📁';
    }
  };

  /**
   * Obtener indicador de stock
   */
  const getIndicadorStock = () => {
    if (!nodo.maneja_stock || nodo.nivel_actual !== 5) return null;

    const { stock_actual, stock_minimo, stock_maximo } = nodo;

    if (stock_actual <= stock_minimo) {
      return {
        color: 'red',
        label: '⚠️ Bajo',
        className: 'bg-red-50 border-l-4 border-red-500'
      };
    } else if (stock_actual >= stock_maximo) {
      return {
        color: 'orange',
        label: '⚠️ Alto',
        className: 'bg-orange-50 border-l-4 border-orange-500'
      };
    } else {
      return {
        color: 'green',
        label: '✅ OK',
        className: 'bg-green-50 border-l-4 border-green-500'
      };
    }
  };

  /**
   * Formatear cantidad con unidad
   */
  const formatearCantidad = (cantidad, unidad) => {
    if (!cantidad || !unidad) return '';
    return `${cantidad.toLocaleString('es-CO')} ${unidad}`;
  };

  /**
   * Formatear precio
   */
  const formatearPrecio = (precio) => {
    if (!precio) return '';
    return `$${precio.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Determinar si el nodo tiene hijos
   */
  const tieneHijos = nodo.nivel_actual < 6; // Los niveles 1-5 pueden tener hijos

  /**
   * Renderizar información específica según nivel
   */
  const renderizarInfo = () => {
    // Nivel 5: Producto (con stock)
    if (nodo.nivel_actual === 5 && nodo.maneja_stock) {
      const indicador = getIndicadorStock();
      const cantidadPresentaciones = hijos.length;

      return (
        <div className="ml-8 mt-1 text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              Stock: <span className="font-medium">{formatearCantidad(nodo.stock_actual, nodo.unidad_stock)}</span>
            </span>
            {indicador && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                indicador.color === 'red' ? 'bg-red-100 text-red-700' :
                indicador.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                {indicador.label}
              </span>
            )}
          </div>
          {nodo.costo_promedio && (
            <div className="text-gray-500 mt-1">
              Costo promedio: {formatearPrecio(nodo.costo_promedio)}/{nodo.unidad_stock}
            </div>
          )}
          {cantidadPresentaciones > 0 && (
            <div className="text-gray-500 mt-1">
              {cantidadPresentaciones} {cantidadPresentaciones === 1 ? 'presentación' : 'presentaciones'}
            </div>
          )}
        </div>
      );
    }

    // Nivel 6: Presentación
    if (nodo.nivel_actual === 6) {
      return (
        <div className="ml-8 mt-1 text-sm text-gray-500">
          Contenido: {formatearCantidad(nodo.contenido_unidad, nodo.unidad_contenido)}
        </div>
      );
    }

    return null;
  };

  /**
   * Renderizar botones de acción según nivel
   */
  const renderizarBotones = () => {
    // Nivel 1 y 2: no tienen botones
    if (nodo.nivel_actual <= 2) return null;

    return (
      <div className="flex items-center space-x-2">
        <button
          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Abrir modal de detalle
            console.log('Ver detalle:', nodo);
          }}
        >
          Ver
        </button>
        <button
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Abrir modal de edición
            console.log('Editar:', nodo);
          }}
        >
          Editar
        </button>
      </div>
    );
  };

  /**
   * Estilo de indentación según nivel
   */
  const indentacion = nivel * 20;

  /**
   * Clase de stock (si aplica)
   */
  const indicador = getIndicadorStock();
  const claseStock = indicador ? indicador.className : '';

  return (
    <div className="nodo-arbol">
      {/* Nodo principal */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${claseStock}`}
        style={{ paddingLeft: `${indentacion + 12}px` }}
        onClick={() => tieneHijos && onToggle(nodo.id)}
      >
        <div className="flex items-center space-x-3 flex-1">
          {/* Icono expandir/colapsar */}
          {tieneHijos && (
            <span className="text-gray-400 text-sm">
              {expandido ? '▼' : '▶'}
            </span>
          )}

          {/* Icono del nodo */}
          <span className="text-xl">{getIcono()}</span>

          {/* Código y nombre */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm text-gray-500">{nodo.codigo}</span>
              <span className="font-medium text-gray-800">{nodo.nombre}</span>
            </div>
            {renderizarInfo()}
          </div>
        </div>

        {/* Botones de acción */}
        {renderizarBotones()}
      </div>

      {/* Hijos (recursivo) */}
      {expandido && tieneHijos && hijos.length > 0 && (
        <div className="mt-1">
          {hijos.map(hijo => (
            <NodoArbol
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              expandido={expandidos.has(hijo.id)}
              hijos={hijosMap.get(hijo.id) || []}
              hijosMap={hijosMap}
              expandidos={expandidos}
              onToggle={onToggle}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Mensaje si está expandido pero no tiene hijos */}
      {expandido && tieneHijos && hijos.length === 0 && (
        <div className="ml-12 mt-2 text-sm text-gray-400 italic" style={{ paddingLeft: `${indentacion + 20}px` }}>
          Sin elementos
        </div>
      )}
    </div>
  );
};

export default NodoArbol;
