import React, { useState, useEffect } from 'react';
import { arbolRecetasService } from '../../services/arbolRecetasService';
import NodoReceta from './NodoReceta';
import ModalReceta from './ModalReceta';

/**
 * Componente principal del Arbol de Recetas
 * Visualizacion jerarquica con CRUD completo
 * Estructura: Conectores (Nivel 1) -> Recetas (Nivel 2)
 */
const ArbolRecetas = () => {
  const [conectores, setConectores] = useState([]);
  const [expandidos, setExpandidos] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);
  const [totalRecetas, setTotalRecetas] = useState(0);

  // Modal state
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);
  const [modoModal, setModoModal] = useState('ver');
  const [padreParaCrear, setPadreParaCrear] = useState(null);

  // Mapa de hijos (lazy loading)
  const [hijosMap, setHijosMap] = useState(new Map());

  useEffect(() => {
    cargarArbol();
  }, []);

  // Busqueda con debounce
  useEffect(() => {
    if (busqueda.length < 2) {
      setResultadosBusqueda([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      const { data } = await arbolRecetasService.buscarRecetas(busqueda);
      setResultadosBusqueda(data || []);
      setBuscando(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarArbol = async () => {
    setCargando(true);
    setError(null);

    try {
      const [conectoresRes, conteoRes] = await Promise.all([
        arbolRecetasService.getConectores(),
        arbolRecetasService.contarPorNivel(2)
      ]);

      if (conectoresRes.error) throw conectoresRes.error;

      setConectores(conectoresRes.data || []);
      setTotalRecetas(conteoRes.data || 0);
    } catch (err) {
      console.error('Error cargando arbol:', err);
      setError('Error al cargar el arbol de recetas');
    } finally {
      setCargando(false);
    }
  };

  const toggleNodo = async (nodoId) => {
    const nuevoExpandidos = new Set(expandidos);

    if (nuevoExpandidos.has(nodoId)) {
      nuevoExpandidos.delete(nodoId);
    } else {
      nuevoExpandidos.add(nodoId);

      if (!hijosMap.has(nodoId)) {
        const { data } = await arbolRecetasService.getHijos(nodoId);
        const nuevoMap = new Map(hijosMap);
        nuevoMap.set(nodoId, data || []);
        setHijosMap(nuevoMap);
      }
    }

    setExpandidos(nuevoExpandidos);
  };

  const handleVer = (receta) => {
    setRecetaSeleccionada(receta);
    setModoModal('ver');
    setModalAbierto(true);
  };

  const handleEditar = (receta) => {
    setRecetaSeleccionada(receta);
    setModoModal('editar');
    setModalAbierto(true);
  };

  const handleCrear = (padre) => {
    setPadreParaCrear(padre);
    setRecetaSeleccionada(null);
    setModoModal('crear');
    setModalAbierto(true);
  };

  const handleDuplicar = async (receta) => {
    const nuevoNombre = prompt('Nombre para la nueva variante:', `${receta.nombre} (Variante)`);
    if (!nuevoNombre) return;

    try {
      const { error } = await arbolRecetasService.duplicarReceta(receta.id, nuevoNombre);
      if (error) throw error;
      await cargarArbol();
      setHijosMap(new Map());
      setExpandidos(new Set());
    } catch (err) {
      console.error('Error duplicando:', err);
      alert('Error al duplicar la receta');
    }
  };

  const handleEliminar = async (recetaId) => {
    if (!confirm('Esta seguro de eliminar esta receta? Esta accion no se puede deshacer.')) return;

    try {
      const { error } = await arbolRecetasService.eliminarReceta(recetaId);
      if (error) throw error;
      await cargarArbol();
      setHijosMap(new Map());
      setExpandidos(new Set());
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar la receta');
    }
  };

  const handleCerrarModal = (refrescar = false) => {
    setModalAbierto(false);
    setRecetaSeleccionada(null);
    setPadreParaCrear(null);

    if (refrescar) {
      cargarArbol();
      setHijosMap(new Map());
    }
  };

  const refrescar = () => {
    setExpandidos(new Set());
    setHijosMap(new Map());
    setBusqueda('');
    setResultadosBusqueda([]);
    cargarArbol();
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
              onChange={(e) => setBusqueda(e.target.value)}
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
                expandido={expandidos.has(conector.id)}
                hijos={hijosMap.get(conector.id) || []}
                hijosMap={hijosMap}
                expandidos={expandidos}
                onToggle={toggleNodo}
                onVer={handleVer}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onCrearHijo={handleCrear}
                onDuplicar={handleDuplicar}
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
