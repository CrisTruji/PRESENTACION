// ========================================
// VIRTUALIZED TABLE - Sprint 6.5
// Componente reutilizable con react-window para tablas grandes
// ========================================

import React from 'react';
import { FixedSizeList } from 'react-window';

/**
 * Componente de tabla virtualizada para listas grandes
 *
 * @param {Array} data - Array de datos a mostrar
 * @param {Array} columns - Configuración de columnas
 * @param {number} rowHeight - Altura de cada fila (default: 60)
 * @param {number} tableHeight - Altura total de la tabla (default: 600)
 * @param {Function} onRowClick - Callback al hacer click en una fila
 * @param {string} emptyMessage - Mensaje cuando no hay datos
 */
export default function VirtualizedTable({
  data = [],
  columns = [],
  rowHeight = 60,
  tableHeight = 600,
  onRowClick,
  emptyMessage = 'No hay datos para mostrar',
  className = '',
}) {
  // Renderizar una fila individual
  const Row = ({ index, style }) => {
    const item = data[index];

    return (
      <div
        style={style}
        className={`flex items-center border-b border-border hover:bg-surface transition-colors ${
          onRowClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onRowClick && onRowClick(item)}
      >
        {columns.map((column, colIndex) => {
          const value = column.accessor ? column.accessor(item) : item[column.key];

          return (
            <div
              key={colIndex}
              className={`px-4 py-3 ${column.className || ''}`}
              style={{
                width: column.width || `${100 / columns.length}%`,
                textAlign: column.align || 'left',
              }}
            >
              {column.render ? column.render(value, item) : value}
            </div>
          );
        })}
      </div>
    );
  };

  // Si no hay datos
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-surface border border-border rounded-lg ${className}`}
        style={{ height: tableHeight }}
      >
        <div className="text-center text-muted">
          <p className="text-lg">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex bg-bg border-b border-border sticky top-0 z-10">
        {columns.map((column, index) => (
          <div
            key={index}
            className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider"
            style={{
              width: column.width || `${100 / columns.length}%`,
              textAlign: column.align || 'left',
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <FixedSizeList
        height={tableHeight - 45} // Restar altura del header
        itemCount={data.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={5} // Pre-renderizar 5 filas extra para scroll suave
      >
        {Row}
      </FixedSizeList>

      {/* Footer con contador */}
      <div className="px-4 py-2 bg-bg border-t border-border text-sm text-muted text-center">
        Mostrando {data.length} {data.length === 1 ? 'registro' : 'registros'}
      </div>
    </div>
  );
}

/**
 * Hook para configurar columnas fácilmente
 *
 * Ejemplo de uso:
 * const columns = useTableColumns([
 *   { key: 'nombre', header: 'Nombre', width: '30%' },
 *   { key: 'stock', header: 'Stock', width: '20%', align: 'right' },
 *   {
 *     key: 'actions',
 *     header: 'Acciones',
 *     width: '15%',
 *     render: (_, item) => <button onClick={() => edit(item)}>Editar</button>
 *   }
 * ]);
 */
export function useTableColumns(columnsConfig) {
  return React.useMemo(() => columnsConfig, [JSON.stringify(columnsConfig)]);
}
