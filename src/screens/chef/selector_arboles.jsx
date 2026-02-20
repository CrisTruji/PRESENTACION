import React, { useState } from 'react';
import { ArbolMateriaPrima, ArbolPlatos, ArbolRecetas } from '@/features/products';

/**
 * Selector principal de los 4 árboles del sistema
 * Diseño moderno con cards interactivas
 */
const SelectorArboles = () => {
  const [arbolSeleccionado, setArbolSeleccionado] = useState(null);

  const arboles = [
    {
      id: 'materia_prima',
      nombre: 'Materia Prima',
      descripcion: 'Gestión de ingredientes, productos y presentaciones para la cocina',
      icono: '🥬',
      iconoAlt: '🌿',
      gradiente: 'from-emerald-500 via-green-500 to-teal-600',
      bgHover: 'hover:shadow-emerald-500/25',
      borderColor: 'border-emerald-400',
      stats: { label: 'Productos', icon: '📦' },
      disponible: true
    },
    {
      id: 'platos',
      nombre: 'Platos',
      descripcion: 'Catálogo de preparaciones y productos finales organizados por categoría',
      icono: '🍽️',
      iconoAlt: '🍳',
      gradiente: 'from-blue-500 via-indigo-500 to-purple-600',
      bgHover: 'hover:shadow-blue-500/25',
      borderColor: 'border-blue-400',
      stats: { label: 'Platos', icon: '🥘' },
      disponible: true
    },
    {
      id: 'recetas',
      nombre: 'Recetas',
      descripcion: 'Recetas estándar con ingredientes y variantes locales personalizables',
      icono: '📋',
      iconoAlt: '📖',
      gradiente: 'from-orange-500 via-amber-500 to-yellow-600',
      bgHover: 'hover:shadow-orange-500/25',
      borderColor: 'border-orange-400',
      stats: { label: 'Recetas', icon: '👨‍🍳' },
      disponible: true
    },
    {
      id: 'servicios',
      nombre: 'Servicios',
      descripcion: 'Configuración de servicios, horarios y entregas programadas',
      icono: '🚚',
      iconoAlt: '📅',
      gradiente: 'from-purple-500 via-violet-500 to-fuchsia-600',
      bgHover: 'hover:shadow-purple-500/25',
      borderColor: 'border-purple-400',
      stats: { label: 'Servicios', icon: '⏰' },
      disponible: false
    }
  ];

  // Si hay un árbol seleccionado, mostrar ese árbol
  if (arbolSeleccionado) {
    const arbolActual = arboles.find(a => a.id === arbolSeleccionado);

    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header con botón volver */}
        <div className={`bg-gradient-to-r ${arbolActual.gradiente} px-6 py-4 shadow-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setArbolSeleccionado(null)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30
                           text-white rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Volver</span>
              </button>
              <div className="h-8 w-px bg-white/30"></div>
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{arbolActual.icono}</span>
                <div>
                  <h1 className="text-xl font-bold text-white">{arbolActual.nombre}</h1>
                  <p className="text-white/80 text-sm">{arbolActual.descripcion}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido del árbol */}
        <div className="flex-1 overflow-hidden">
          {arbolSeleccionado === 'materia_prima' && <ArbolMateriaPrima />}
          {arbolSeleccionado === 'platos'        && <ArbolPlatos />}
          {arbolSeleccionado === 'recetas'       && <ArbolRecetas />}
          {arbolSeleccionado === 'servicios' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md">
                <div className="text-8xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                  Próximamente
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  El módulo de Servicios está en desarrollo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista del selector de árboles
  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl
                          bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-6">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">
            Gestión de Árboles
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Administra la estructura jerárquica de tu sistema. Selecciona un árbol para ver,
            editar, agregar o eliminar elementos.
          </p>
        </div>

        {/* Grid de árboles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {arboles.map((arbol, index) => (
            <div
              key={arbol.id}
              onClick={() => arbol.disponible && setArbolSeleccionado(arbol.id)}
              className={`
                group relative overflow-hidden rounded-3xl transition-all duration-500
                ${arbol.disponible
                  ? `cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl ${arbol.bgHover}`
                  : 'cursor-not-allowed opacity-60'
                }
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Fondo con gradiente */}
              <div className={`absolute inset-0 bg-gradient-to-br ${arbol.gradiente} opacity-90`}></div>

              {/* Patrón decorativo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 transform translate-x-32 -translate-y-32">
                  <div className="w-full h-full rounded-full bg-white"></div>
                </div>
                <div className="absolute bottom-0 left-0 w-48 h-48 transform -translate-x-24 translate-y-24">
                  <div className="w-full h-full rounded-full bg-white"></div>
                </div>
              </div>

              {/* Contenido */}
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  {/* Icono principal */}
                  <div className="flex items-center justify-center w-20 h-20 rounded-2xl
                                  bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <span className="text-5xl group-hover:hidden">{arbol.icono}</span>
                    <span className="text-5xl hidden group-hover:block">{arbol.iconoAlt}</span>
                  </div>

                  {/* Badge de disponibilidad */}
                  {!arbol.disponible && (
                    <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                      Próximamente
                    </span>
                  )}
                </div>

                {/* Título y descripción */}
                <h2 className="text-3xl font-bold text-white mb-3">
                  {arbol.nombre}
                </h2>
                <p className="text-white/80 text-lg leading-relaxed mb-6">
                  {arbol.descripcion}
                </p>

                {/* Footer con acción */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white/70">
                    <span className="text-xl">{arbol.stats.icon}</span>
                    <span className="font-medium">{arbol.stats.label}</span>
                  </div>

                  {arbol.disponible && (
                    <div className="flex items-center space-x-2 text-white font-semibold
                                    group-hover:translate-x-2 transition-transform duration-300">
                      <span>Explorar</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Efecto hover */}
              {arbol.disponible && (
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
              )}
            </div>
          ))}
        </div>

        {/* Info footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            💡 Tip: Cada árbol permite agregar, editar y eliminar elementos de forma jerárquica
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectorArboles;
