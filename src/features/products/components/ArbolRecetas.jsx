import React, { useState, useEffect } from 'react';
import { arbolRecetasService } from '@/features/products';
import NodoArbol from './NodoArbol';

/**
 * Componente principal del Árbol de Recetas
 * Estructura: Nivel 2 (recetas estándar) → Nivel 3 (recetas locales) → ingredientes
 */
const ArbolRecetas = () => {
  const [arbolData, setArbolData]       = useState([]);
  const [expandidos, setExpandidos]     = useState(new Set());
  const [hijosMap, setHijosMap]         = useState(new Map());
  const [cargando, setCargando]         = useState(true);
  const [busqueda, setBusqueda]         = useState('');
  const [error, setError]               = useState(null);
  const [totalRecetas, setTotalRecetas] = useState(0);

  useEffect(() => {
    cargarArbol();
  }, []);

  const cargarArbol = async () => {
    setCargando(true);
    setError(null);
    try {
      const [recetasRes, conteoRes] = await Promise.all([
        arbolRecetasService.getRecetasNivel2(),
        arbolRecetasService.contarPorNivel(2)
      ]);

      if (recetasRes.error) throw recetasRes.error;

      setArbolData(recetasRes.data || []);
      setTotalRecetas(conteoRes.data || 0);
    } catch (err) {
      console.error('Error al cargar árbol de recetas:', err);
      setError('Error al cargar el árbol de recetas');
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
        await cargarHijos(nodoId);
      }
    }

    setExpandidos(nuevoExpandidos);
  };

  const cargarHijos = async (parentId) => {
    try {
      const { data, error: err } = await arbolRecetasService.getHijos(parentId);
      if (err) throw err;
      const nuevoMap = new Map(hijosMap);
      nuevoMap.set(parentId, data || []);
      setHijosMap(nuevoMap);
    } catch (err) {
      console.error('Error al cargar hijos:', err);
    }
  };

  const refrescar = () => {
    setExpandidos(new Set());
    setHijosMap(new Map());
    setBusqueda('');
    cargarArbol();
  };

  const datosFiltrados = busqueda.length >= 2
    ? arbolData.filter(n =>
        n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.codigo.toLowerCase().includes(busqueda.toLowerCase())
      )
    : arbolData;

  const renderizarArbol = () => {
    if (cargando) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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

    if (datosFiltrados.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {busqueda.length >= 2
            ? `Sin resultados para "${busqueda}"`
            : 'No se encontraron recetas en este árbol'}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {datosFiltrados.map(nodo => (
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
        <h1 className="text-2xl font-bold text-gray-800">📋 Árbol de Recetas</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={refrescar}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>↻</span>
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Buscar receta o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Árbol */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderizarArbol()}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          {totalRecetas} {totalRecetas === 1 ? 'receta estándar' : 'recetas estándar'}
        </div>
      </div>
    </div>
  );
};

export default ArbolRecetas;
