import React from 'react';

/**
 * Componente recursivo para renderizar nodos del árbol de platos
 * Soporta niveles 2-5 con iconos y acciones específicas
 */
const NodoPlato = ({
  nodo,
  nivel,
  expandido,
  hijos,
  hijosMap,
  expandidos,
  onToggle,
  onVer,
  onEditar,
  onEliminar,
  onCrearHijo
}) => {
  const tieneHijos = hijos.length > 0 || !nodo.es_hoja;
  const margenIzquierdo = nivel * 24;

  // Iconos por nivel
  const getIcono = () => {
    if (nodo.es_hoja) return '🥘';
    switch (nodo.nivel_actual) {
      case 2: return '📂'; // Categoría
      case 3: return '📁'; // Subcategoría
      case 4: return '📋'; // Grupo
      default: return '📄';
    }
  };

  // Colores por nivel
  const getColorBorde = () => {
    switch (nodo.nivel_actual) {
      case 2: return 'border-l-blue-500';
      case 3: return 'border-l-indigo-500';
      case 4: return 'border-l-purple-500';
      case 5: return 'border-l-pink-500';
      default: return 'border-l-gray-400';
    }
  };

  const getBgHover = () => {
    switch (nodo.nivel_actual) {
      case 2: return 'hover:bg-blue-50 dark:hover:bg-blue-900/20';
      case 3: return 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
      case 4: return 'hover:bg-purple-50 dark:hover:bg-purple-900/20';
      case 5: return 'hover:bg-pink-50 dark:hover:bg-pink-900/20';
      default: return 'hover:bg-gray-50 dark:hover:bg-gray-800';
    }
  };

  return (
    <div>
      {/* Nodo principal */}
      <div
        style={{ marginLeft: `${margenIzquierdo}px` }}
        className={`
          flex items-center justify-between p-3 rounded-xl mb-1
          border-l-4 ${getColorBorde()} ${getBgHover()}
          bg-white dark:bg-gray-800
          transition-all duration-200 group
        `}
      >
        {/* Lado izquierdo: Toggle + Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Botón expandir/colapsar */}
          {tieneHijos ? (
            <button
              onClick={() => onToggle(nodo.id)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                         rounded-lg bg-gray-100 dark:bg-gray-700
                         hover:bg-gray-200 dark:hover:bg-gray-600
                         transition-colors"
            >
              <svg
                className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200
                           ${expandido ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            </div>
          )}

          {/* Icono */}
          <span className="text-2xl flex-shrink-0">{getIcono()}</span>

          {/* Información del nodo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                {nodo.codigo}
              </span>
              <span className="font-semibold text-gray-800 dark:text-white truncate">
                {nodo.nombre}
              </span>
            </div>
            {nodo.descripcion && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {nodo.descripcion}
              </p>
            )}
          </div>

          {/* Badge de nivel */}
          <span className={`
            text-xs px-2 py-1 rounded-full font-medium flex-shrink-0
            ${nodo.es_hoja
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
          `}>
            {nodo.es_hoja ? 'Plato' : `Nivel ${nodo.nivel_actual}`}
          </span>
        </div>

        {/* Lado derecho: Acciones */}
        <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onVer(nodo)}
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            title="Ver detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onEditar(nodo)}
            className="p-2 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {!nodo.es_hoja && nodo.nivel_actual < 5 && (
            <button
              onClick={() => onCrearHijo(nodo)}
              className="p-2 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              title="Agregar hijo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEliminar(nodo.id)}
            className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hijos (recursivo) */}
      {expandido && hijos.length > 0 && (
        <div className="ml-2">
          {hijos.map(hijo => (
            <NodoPlato
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              expandido={expandidos.has(hijo.id)}
              hijos={hijosMap.get(hijo.id) || []}
              hijosMap={hijosMap}
              expandidos={expandidos}
              onToggle={onToggle}
              onVer={onVer}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onCrearHijo={onCrearHijo}
            />
          ))}
        </div>
      )}

      {/* Indicador de carga para hijos */}
      {expandido && !hijos.length && !nodo.es_hoja && (
        <div style={{ marginLeft: `${margenIzquierdo + 40}px` }} className="py-3">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodoPlato;
