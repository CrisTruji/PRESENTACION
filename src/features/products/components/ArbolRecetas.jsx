import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Star, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import { arbolRecetasService } from '@/features/products';

/**
 * Componente principal del Árbol de Recetas
 * - Muestra recetas estándar (es_local=false)
 * - Al expandir: muestra variantes locales e ingredientes
 * - Búsqueda server-side para evitar límite de 1000 filas
 */
const ArbolRecetas = () => {
  const [arbolData, setArbolData]           = useState([]);
  const [expandidos, setExpandidos]         = useState(new Set());
  const [localesMap, setLocalesMap]         = useState(new Map());
  const [ingredientesMap, setIngredientesMap] = useState(new Map());
  const [cargandoExpand, setCargandoExpand] = useState(new Set());
  const [cargando, setCargando]             = useState(true);
  const [buscando, setBuscando]             = useState(false);
  const [busqueda, setBusqueda]             = useState('');
  const [error, setError]                   = useState(null);
  const [totalRecetas, setTotalRecetas]     = useState(0);
  const [modoSearch, setModoSearch]         = useState(false); // true = resultados de búsqueda

  useEffect(() => {
    cargarArbol();
  }, []);

  // Búsqueda debounced server-side
  useEffect(() => {
    if (busqueda.length < 2) {
      if (modoSearch) {
        setModoSearch(false);
        cargarArbol();
      }
      return;
    }
    const timer = setTimeout(() => ejecutarBusqueda(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarArbol = async () => {
    setCargando(true);
    setError(null);
    try {
      const [recetasRes, conteoRes] = await Promise.all([
        arbolRecetasService.getRecetasNivel2(),
        arbolRecetasService.contarPorNivel(2),
      ]);
      if (recetasRes.error) throw recetasRes.error;
      setArbolData(recetasRes.data || []);
      setTotalRecetas(conteoRes.data || 0);
      setModoSearch(false);
    } catch (err) {
      setError('Error al cargar el árbol de recetas');
    } finally {
      setCargando(false);
    }
  };

  const ejecutarBusqueda = async (termino) => {
    setBuscando(true);
    try {
      const { data } = await arbolRecetasService.buscarEstandar(termino, 60);
      setArbolData(data || []);
      setModoSearch(true);
    } finally {
      setBuscando(false);
    }
  };

  const toggleNodo = async (nodo) => {
    const id = nodo.id;
    const nuevoExpandidos = new Set(expandidos);

    if (nuevoExpandidos.has(id)) {
      nuevoExpandidos.delete(id);
    } else {
      nuevoExpandidos.add(id);
      // Cargar locales e ingredientes si aún no están
      if (!localesMap.has(id) || !ingredientesMap.has(id)) {
        setCargandoExpand(prev => new Set(prev).add(id));
        const [localesRes, ingsRes] = await Promise.all([
          arbolRecetasService.getLocalesDeReceta(id),
          arbolRecetasService.getIngredientes(id),
        ]);
        setLocalesMap(prev => new Map(prev).set(id, localesRes.data || []));
        setIngredientesMap(prev => new Map(prev).set(id, ingsRes.data || []));
        setCargandoExpand(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    }

    setExpandidos(nuevoExpandidos);
  };

  const refrescar = () => {
    setExpandidos(new Set());
    setLocalesMap(new Map());
    setIngredientesMap(new Map());
    setBusqueda('');
    cargarArbol();
  };

  const renderExpanded = (nodo) => {
    if (cargandoExpand.has(nodo.id)) {
      return (
        <div className="ml-10 py-3 flex items-center gap-2 text-sm text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
          Cargando...
        </div>
      );
    }

    const locales = localesMap.get(nodo.id) || [];
    const ingredientes = ingredientesMap.get(nodo.id) || [];

    return (
      <div className="ml-6 mr-2 mt-1 mb-2 rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
        {/* Sección: Variantes locales */}
        <div className="bg-amber-50 border-b border-amber-100">
          <div className="px-4 py-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Variantes Locales {locales.length > 0 ? `(${locales.length})` : '— Ninguna'}
            </span>
          </div>
          {locales.length > 0 && (
            <div className="divide-y divide-amber-100">
              {locales.map(local => (
                <div key={local.id} className="px-4 py-2 flex items-center justify-between bg-white hover:bg-amber-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-sm font-medium text-gray-800">{local.nombre}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{local.codigo}</div>
                  </div>
                  {local.costo_porcion && (
                    <span className="text-xs text-gray-500 font-mono">
                      ${Number(local.costo_porcion).toLocaleString('es-CO', { maximumFractionDigits: 0 })}/p
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección: Ingredientes */}
        <div>
          <div className="px-4 py-2 flex items-center gap-2 bg-blue-50 border-b border-blue-100">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Ingredientes {ingredientes.length > 0 ? `(${ingredientes.length})` : '— Sin registrar'}
            </span>
          </div>
          {ingredientes.length > 0 && (
            <div className="divide-y divide-gray-100">
              {ingredientes.map(ing => (
                <div key={ing.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm text-gray-700">
                      {ing.materia_prima?.nombre || ing.arbol_materia_prima?.nombre || '—'}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">
                      {ing.materia_prima?.codigo || ing.arbol_materia_prima?.codigo}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-gray-600">
                    {ing.cantidad_requerida} {ing.unidad_medida}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNodo = (nodo) => {
    const expandido = expandidos.has(nodo.id);
    const tieneLocales = (localesMap.get(nodo.id) || []).length > 0;

    return (
      <div key={nodo.id} className="nodo-arbol">
        <div
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => toggleNodo(nodo)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-gray-400 text-sm flex-shrink-0">
              {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <span className="text-lg flex-shrink-0">🏭</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-gray-400">{nodo.codigo}</span>
                <span className="font-medium text-gray-800 truncate">{nodo.nombre}</span>
                {tieneLocales && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 flex-shrink-0">
                    <Star className="w-3 h-3" />
                    {(localesMap.get(nodo.id) || []).length} local{(localesMap.get(nodo.id) || []).length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              {nodo.costo_porcion && (
                <div className="text-xs text-gray-400 mt-0.5">
                  ${Number(nodo.costo_porcion).toLocaleString('es-CO', { maximumFractionDigits: 0 })}/porción
                </div>
              )}
            </div>
          </div>
        </div>

        {expandido && renderExpanded(nodo)}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-800">📋 Árbol de Recetas</h1>
        <button
          onClick={refrescar}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      {/* Buscador */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar receta o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {buscando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
            </div>
          )}
        </div>
        {modoSearch && (
          <p className="mt-2 text-xs text-gray-500">
            {arbolData.length} resultado{arbolData.length !== 1 ? 's' : ''} para "{busqueda}"
            <button onClick={() => { setBusqueda(''); }} className="ml-2 text-orange-500 hover:underline">Limpiar</button>
          </p>
        )}
      </div>

      {/* Árbol */}
      <div className="flex-1 overflow-y-auto p-4">
        {cargando ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            <span className="ml-3 text-gray-600">Cargando árbol...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        ) : arbolData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {busqueda.length >= 2 ? `Sin resultados para "${busqueda}"` : 'No se encontraron recetas'}
          </div>
        ) : (
          <div className="space-y-1">
            {arbolData.map(nodo => renderNodo(nodo))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          {modoSearch
            ? `Mostrando ${arbolData.length} resultado${arbolData.length !== 1 ? 's' : ''} · ${totalRecetas} recetas estándar en total`
            : `${totalRecetas} recetas estándar`}
        </div>
      </div>
    </div>
  );
};

export default ArbolRecetas;
