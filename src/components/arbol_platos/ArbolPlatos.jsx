import React, { useState, useEffect } from 'react';
import { arbolPlatosService } from '../../services/arbolPlatosService';
import NodoPlato from './NodoPlato';
import ModalPlato from './ModalPlato';

/**
 * Componente principal del Árbol de Platos
 * Visualización jerárquica con CRUD completo
 */
const ArbolPlatos = () => {
  const [arbolData, setArbolData] = useState([]);
  const [expandidos, setExpandidos] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);
  const [totalPlatos, setTotalPlatos] = useState(0);

  // Modal state
  const [modalAbierto, setModalAbierto] = useState(false);
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [modoModal, setModoModal] = useState('ver'); // 'ver', 'editar', 'crear'
  const [padreParaCrear, setPadreParaCrear] = useState(null);

  // Mapa de hijos (lazy loading)
  const [hijosMap, setHijosMap] = useState(new Map());

  useEffect(() => {
    cargarArbol();
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (busqueda.length < 2) {
      setResultadosBusqueda([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      const { data } = await arbolPlatosService.buscarPlatos(busqueda);
      setResultadosBusqueda(data || []);
      setBuscando(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarArbol = async () => {
    setCargando(true);
    setError(null);

    try {
      const [categoriasRes, conteoRes] = await Promise.all([
        arbolPlatosService.getCategoriasNivel2(),
        arbolPlatosService.contarPlatosFinales()
      ]);

      if (categoriasRes.error) throw categoriasRes.error;

      setArbolData(categoriasRes.data || []);
      setTotalPlatos(conteoRes.data || 0);
    } catch (err) {
      console.error('Error cargando árbol:', err);
      setError('Error al cargar el árbol de platos');
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
        const { data } = await arbolPlatosService.getHijos(nodoId);
        const nuevoMap = new Map(hijosMap);
        nuevoMap.set(nodoId, data || []);
        setHijosMap(nuevoMap);
      }
    }

    setExpandidos(nuevoExpandidos);
  };

  const handleVer = (plato) => {
    setPlatoSeleccionado(plato);
    setModoModal('ver');
    setModalAbierto(true);
  };

  const handleEditar = (plato) => {
    setPlatoSeleccionado(plato);
    setModoModal('editar');
    setModalAbierto(true);
  };

  const handleCrear = (padre) => {
    setPadreParaCrear(padre);
    setPlatoSeleccionado(null);
    setModoModal('crear');
    setModalAbierto(true);
  };

  const handleEliminar = async (platoId) => {
    if (!confirm('¿Está seguro de eliminar este plato? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await arbolPlatosService.eliminarNodo(platoId);
      if (error) throw error;

      // Refrescar
      await cargarArbol();
      setHijosMap(new Map());
      setExpandidos(new Set());
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar el plato');
    }
  };

  const handleCerrarModal = (refrescar = false) => {
    setModalAbierto(false);
    setPlatoSeleccionado(null);
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
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar platos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {buscando && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
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

        {/* Resultados de búsqueda */}
        {resultadosBusqueda.length > 0 && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-xl border dark:border-gray-600 max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {resultadosBusqueda.length} resultado(s) encontrado(s)
            </p>
            <div className="space-y-2">
              {resultadosBusqueda.map(plato => (
                <div
                  key={plato.id}
                  onClick={() => handleVer(plato)}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-600
                             hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{plato.es_hoja ? '🥘' : '📁'}</span>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{plato.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{plato.codigo}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    Nivel {plato.nivel_actual}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Árbol */}
      <div className="flex-1 overflow-y-auto p-4">
        {cargando ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Cargando árbol de platos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : arbolData.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📭</span>
            <p className="text-gray-500 dark:text-gray-400">No hay platos en el árbol</p>
          </div>
        ) : (
          <div className="space-y-1">
            {arbolData.map(nodo => (
              <NodoPlato
                key={nodo.id}
                nodo={nodo}
                nivel={0}
                expandido={expandidos.has(nodo.id)}
                hijos={hijosMap.get(nodo.id) || []}
                hijosMap={hijosMap}
                expandidos={expandidos}
                onToggle={toggleNodo}
                onVer={handleVer}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onCrearHijo={handleCrear}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{arbolData.length} categorías | {totalPlatos} platos finales</span>
          <span className="text-xs">Última actualización: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalPlato
          plato={platoSeleccionado}
          padre={padreParaCrear}
          modo={modoModal}
          onCerrar={handleCerrarModal}
        />
      )}
    </div>
  );
};

export default ArbolPlatos;
