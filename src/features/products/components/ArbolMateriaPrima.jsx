import React, { useState, useEffect } from 'react';
import { arbolMateriaPrimaService } from '@/services/arbolMateriaPrimaService';
import TabsArbol from './TabsArbol';
import BuscadorArbol from './BuscadorArbol';
import NodoArbol from './NodoArbol';

/**
 * Componente principal del Árbol de Materia Prima
 * Maneja la visualización jerárquica de productos y presentaciones
 */
const ArbolMateriaPrima = () => {
  // Estado principal
  const [tipoSeleccionado, setTipoSeleccionado] = useState('produccion'); // produccion, entregable, desechable
  const [arbolData, setArbolData] = useState([]);
  const [expandidos, setExpandidos] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({});
  const [error, setError] = useState(null);
  const [totalProductos, setTotalProductos] = useState(0);

  // Mapa de hijos por padre (para carga lazy)
  const [hijosMap, setHijosMap] = useState(new Map());

  /**
   * Cargar árbol inicial al montar o cambiar tipo
   */
  useEffect(() => {
    cargarArbol();
  }, [tipoSeleccionado]);

  /**
   * Cargar datos del árbol según el tipo seleccionado
   * Obtiene los nodos nivel 3 (categorías) del tipo de rama seleccionado
   */
  const cargarArbol = async () => {
    setCargando(true);
    setError(null);

    try {
      // Obtener categorías nivel 3 y contar productos en paralelo
      const [categoriasRes, conteoRes] = await Promise.all([
        arbolMateriaPrimaService.getCategoriasNivel3(tipoSeleccionado),
        arbolMateriaPrimaService.contarProductosPorTipo(tipoSeleccionado)
      ]);

      if (categoriasRes.error) throw categoriasRes.error;

      setArbolData(categoriasRes.data || []);
      setTotalProductos(conteoRes.data || 0);
    } catch (err) {
      console.error('Error al cargar árbol:', err);
      setError('Error al cargar el árbol de materia prima');
    } finally {
      setCargando(false);
    }
  };

  /**
   * Toggle expandir/colapsar nodo
   * Carga los hijos si no están cargados
   */
  const toggleNodo = async (nodoId) => {
    const nuevoExpandidos = new Set(expandidos);

    if (nuevoExpandidos.has(nodoId)) {
      // Colapsar
      nuevoExpandidos.delete(nodoId);
    } else {
      // Expandir y cargar hijos si no están cargados
      nuevoExpandidos.add(nodoId);

      if (!hijosMap.has(nodoId)) {
        await cargarHijos(nodoId);
      }
    }

    setExpandidos(nuevoExpandidos);
  };

  /**
   * Cargar hijos de un nodo
   */
  const cargarHijos = async (parentId) => {
    try {
      const { data, error: err } = await arbolMateriaPrimaService.getHijos(parentId);

      if (err) throw err;

      const nuevoMap = new Map(hijosMap);
      nuevoMap.set(parentId, data || []);
      setHijosMap(nuevoMap);
    } catch (err) {
      console.error('Error al cargar hijos:', err);
    }
  };

  /**
   * Manejar cambio de tab
   */
  const handleTabChange = (nuevoTipo) => {
    setTipoSeleccionado(nuevoTipo);
    setExpandidos(new Set()); // Resetear expandidos
    setHijosMap(new Map()); // Limpiar caché de hijos
    setBusqueda('');
    setFiltros({});
  };

  /**
   * Manejar búsqueda
   */
  const handleBusqueda = (termino) => {
    setBusqueda(termino);
    // La búsqueda se maneja con debounce en BuscadorArbol
  };

  /**
   * Manejar cambio de filtros
   */
  const handleFiltrosChange = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
  };

  /**
   * Refrescar árbol
   */
  const refrescar = () => {
    setExpandidos(new Set());
    setHijosMap(new Map());
    setBusqueda('');
    setFiltros({});
    cargarArbol();
  };

  /**
   * Renderizar árbol
   */
  const renderizarArbol = () => {
    if (cargando) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Cargando árbol...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      );
    }

    if (arbolData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No se encontraron nodos en este árbol
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {arbolData.map(nodo => (
          <NodoArbol
            key={nodo.id}
            nodo={nodo}
            nivel={0}
            expandido={expandidos.has(nodo.id)}
            hijos={hijosMap.get(nodo.id) || []}
            hijosMap={hijosMap}
            expandidos={expandidos}
            onToggle={toggleNodo}
            onRefresh={refrescar}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-800">📦 Árbol de Materia Prima</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refrescar}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>↻</span>
            <span>Refrescar</span>
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabsArbol
        tipoSeleccionado={tipoSeleccionado}
        onTabChange={handleTabChange}
      />

      {/* Buscador */}
      <BuscadorArbol
        busqueda={busqueda}
        onBusquedaChange={handleBusqueda}
        filtros={filtros}
        onFiltrosChange={handleFiltrosChange}
        tipoSeleccionado={tipoSeleccionado}
      />

      {/* Árbol */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderizarArbol()}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {arbolData.length} {arbolData.length === 1 ? 'categoria' : 'categorias'} | {totalProductos} productos
          </span>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArbolMateriaPrima;
