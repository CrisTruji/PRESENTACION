import React, { useEffect } from 'react';
import { useArbolRecetasStore } from '../../stores/useArbolRecetasStore';
import NodoReceta from './NodoReceta';
import ModalReceta from './ModalReceta';

/**
 * Componente principal del Arbol de Recetas
 * REFACTORIZADO: Usa Zustand store (elimina 14 useState)
 * Estructura: Conectores (Nivel 1) -> Recetas (Nivel 2) -> Locales (Nivel 3)
 */
const ArbolRecetas = () => {
  // ========================================
  // ZUSTAND STORE (reemplaza 14 useState)
  // ========================================
  const {
    // Estado
    conectores,
    cargando,
    busqueda,
    resultadosBusqueda,
    buscando,
    error,
    totalRecetas,
    modalAbierto,
    recetaSeleccionada,
    modoModal,
    padreParaCrear,

    // Acciones
    cargarArbol,
    buscarRecetas,
    abrirModal,
    cerrarModal,
    limpiarBusqueda,
    refrescar
  } = useArbolRecetasStore();

  // Cargar árbol en mount
  useEffect(() => {
    cargarArbol();
  }, [cargarArbol]);

  // Búsqueda con debounce
  useEffect(() => {
    if (busqueda.length < 2) {
      limpiarBusqueda();
      return;
    }

    const timer = setTimeout(() => {
      buscarRecetas(busqueda);
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda, buscarRecetas, limpiarBusqueda]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleVer = (receta) => {
    abrirModal('ver', receta);
  };

  const handleBusquedaChange = (e) => {
    useArbolRecetasStore.setState({ busqueda: e.target.value });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Barra de herramientas */}
      <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Busqueda */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={handleBusquedaChange}
              placeholder="Buscar recetas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                         focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {buscando && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3">
            <button
              onClick={refrescar}
              className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700
                         hover:bg-gray-300 dark:hover:bg-gray-600
                         text-gray-700 dark:text-gray-200 font-medium
                         transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>
        </div>

        {/* Resultados de busqueda */}
        {resultadosBusqueda.length > 0 && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-xl border dark:border-gray-600 max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {resultadosBusqueda.length} resultado(s) encontrado(s)
            </p>
            <div className="space-y-2">
              {resultadosBusqueda.map(receta => (
                <div
                  key={receta.id}
                  onClick={() => handleVer(receta)}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-600
                             hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{receta.nivel_actual === 1 ? '📁' : '📋'}</span>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{receta.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{receta.codigo}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                    Nivel {receta.nivel_actual}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arbol */}
      <div className="flex-1 overflow-y-auto p-4">
        {cargando ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Cargando arbol de recetas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : conectores.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📭</span>
            <p className="text-gray-500 dark:text-gray-400">No hay recetas en el arbol</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conectores.map(conector => (
              <NodoReceta
                key={conector.id}
                nodo={conector}
                nivel={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer con estadisticas */}
      <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{conectores.length} conectores | {totalRecetas} recetas totales</span>
          <span className="text-xs">Ultima actualizacion: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalReceta
          receta={recetaSeleccionada}
          padre={padreParaCrear}
          modo={modoModal}
          onCerrar={handleCerrarModal}
        />
      )}
    </div>
  );
};

export default ArbolRecetas;
