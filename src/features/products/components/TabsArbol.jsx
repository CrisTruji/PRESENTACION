import React from 'react';

/**
 * Componente de tabs para cambiar entre tipos de árbol
 * Producción (1.1), Entregables (1.2), Desechables (1.3)
 */
const TabsArbol = ({ tipoSeleccionado, onTabChange }) => {

  const tabs = [
    {
      id: 'produccion',
      label: 'Producción',
      icono: '🏭',
      codigo: '1.1',
      descripcion: 'Productos para cocina'
    },
    {
      id: 'entregable',
      label: 'Entregables',
      icono: '📦',
      codigo: '1.2',
      descripcion: 'Adicionales sin transformar'
    },
    {
      id: 'desechable',
      label: 'Desechables',
      icono: '🧹',
      codigo: '1.3',
      descripcion: 'Productos de aseo y desechables'
    }
  ];

  return (
    <div className="border-b bg-gray-50 px-4">
      <div className="flex space-x-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-3 text-sm font-medium rounded-t-lg transition-colors
              flex items-center space-x-2
              ${tipoSeleccionado === tab.id
                ? 'bg-white text-blue-600 border-t-2 border-x border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
          >
            <span className="text-lg">{tab.icono}</span>
            <span>{tab.label}</span>
            <span className="text-xs text-gray-400">({tab.codigo})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabsArbol;
