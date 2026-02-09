// src/stores/useArbolRecetasStore.js
// Store Zustand para Árbol de Recetas
// Centraliza estado y elimina props drilling

import { create } from 'zustand';
import { arbolRecetasService } from '../services/arbolRecetasService';

/**
 * Store global para gestión del Árbol de Recetas
 *
 * Beneficios:
 * - Elimina 14 useState en ArbolRecetas.jsx
 * - Elimina props drilling (de 9 props a 2 en NodoReceta)
 * - Estado persiste entre navegaciones
 * - DevTools para debugging
 *
 * Uso:
 *   const { conectores, cargarArbol } = useArbolRecetasStore();
 */
export const useArbolRecetasStore = create((set, get) => ({

  // ========================================
  // ESTADO
  // ========================================

  // Datos del árbol
  conectores: [],           // Array de recetas nivel 1
  expandidos: new Set(),    // Set de IDs expandidos
  hijosMap: new Map(),      // Map: parentId -> [hijos]

  // Estado de carga
  cargando: false,
  error: null,
  totalRecetas: 0,

  // Búsqueda
  busqueda: '',
  resultadosBusqueda: [],
  buscando: false,

  // Modal
  modalAbierto: false,
  recetaSeleccionada: null,
  modoModal: 'ver',         // 'ver' | 'editar' | 'crear'
  padreParaCrear: null,

  // ========================================
  // ACCIONES: Carga de Datos
  // ========================================

  /**
   * Cargar árbol completo desde BD
   * Se ejecuta en mount de ArbolRecetas
   */
  cargarArbol: async () => {
    set({ cargando: true, error: null });

    try {
      // Cargar conectores y conteo en paralelo
      const [conectoresRes, conteoRes] = await Promise.all([
        arbolRecetasService.getConectores(),
        arbolRecetasService.contarPorNivel(2)
      ]);

      if (conectoresRes.error) {
        throw new Error(conectoresRes.error.message);
      }

      set({
        conectores: conectoresRes.data || [],
        totalRecetas: conteoRes.data || 0,
        cargando: false,
        error: null
      });

      console.log(`[Store] Árbol cargado: ${conectoresRes.data?.length || 0} conectores`);

    } catch (err) {
      console.error('[Store] Error cargando árbol:', err);
      set({
        error: 'Error al cargar el árbol de recetas',
        cargando: false,
        conectores: []
      });
    }
  },

  /**
   * Toggle expandir/contraer nodo
   * Carga hijos si es la primera vez que se expande (lazy loading)
   */
  toggleNodo: async (nodoId) => {
    const { expandidos, hijosMap } = get();
    const nuevoExpandidos = new Set(expandidos);

    // Si ya está expandido, contraer
    if (nuevoExpandidos.has(nodoId)) {
      nuevoExpandidos.delete(nodoId);
      set({ expandidos: nuevoExpandidos });
      return;
    }

    // Si no está expandido, expandir
    nuevoExpandidos.add(nodoId);
    set({ expandidos: nuevoExpandidos });

    // Si aún no se cargaron los hijos, cargarlos (lazy loading)
    if (!hijosMap.has(nodoId)) {
      try {
        const { data, error } = await arbolRecetasService.getHijos(nodoId);

        if (error) {
          console.error('[Store] Error cargando hijos:', error);
          return;
        }

        const nuevoMap = new Map(hijosMap);
        nuevoMap.set(nodoId, data || []);
        set({ hijosMap: nuevoMap });

        console.log(`[Store] Hijos cargados para nodo ${nodoId}: ${data?.length || 0} hijos`);

      } catch (err) {
        console.error('[Store] Error inesperado cargando hijos:', err);
      }
    }
  },

  /**
   * Buscar recetas por término
   * Se ejecuta con debounce desde useEffect en componente
   */
  buscarRecetas: async (termino) => {
    set({ busqueda: termino, buscando: true });

    // Si término muy corto, limpiar resultados
    if (termino.length < 2) {
      set({ resultadosBusqueda: [], buscando: false });
      return;
    }

    try {
      const { data, error } = await arbolRecetasService.buscarRecetas(termino);

      if (error) {
        console.error('[Store] Error buscando:', error);
        set({ resultadosBusqueda: [], buscando: false });
        return;
      }

      set({ resultadosBusqueda: data || [], buscando: false });
      console.log(`[Store] Búsqueda "${termino}": ${data?.length || 0} resultados`);

    } catch (err) {
      console.error('[Store] Error inesperado en búsqueda:', err);
      set({ resultadosBusqueda: [], buscando: false });
    }
  },

  // ========================================
  // ACCIONES: Modal
  // ========================================

  /**
   * Abrir modal en modo específico
   * @param {'ver'|'editar'|'crear'} modo
   * @param {Object|null} receta - Receta a ver/editar (null para crear)
   * @param {Object|null} padre - Nodo padre (solo para crear)
   */
  abrirModal: (modo, receta = null, padre = null) => {
    set({
      modalAbierto: true,
      modoModal: modo,
      recetaSeleccionada: receta,
      padreParaCrear: padre
    });
  },

  /**
   * Cerrar modal y opcionalmente refrescar árbol
   * @param {boolean} refrescar - Si true, refresca el árbol después de cerrar
   */
  cerrarModal: async (refrescar = false) => {
    set({
      modalAbierto: false,
      recetaSeleccionada: null,
      padreParaCrear: null,
      modoModal: 'ver'
    });

    if (refrescar) {
      console.log('[Store] Refrescando árbol después de cerrar modal');
      await get().refrescar();
    }
  },

  // ========================================
  // ACCIONES: Utilidades
  // ========================================

  /**
   * Refrescar árbol completo
   * Limpia estado de expansión y búsqueda
   */
  refrescar: async () => {
    console.log('[Store] Refrescando árbol completo');
    set({
      expandidos: new Set(),
      hijosMap: new Map(),
      busqueda: '',
      resultadosBusqueda: [],
      error: null
    });
    await get().cargarArbol();
  },

  /**
   * Limpiar búsqueda
   */
  limpiarBusqueda: () => {
    set({
      busqueda: '',
      resultadosBusqueda: [],
      buscando: false
    });
  },

  /**
   * Resetear store completo
   * Útil para logout o cambio de contexto
   */
  reset: () => {
    set({
      conectores: [],
      expandidos: new Set(),
      hijosMap: new Map(),
      cargando: false,
      error: null,
      totalRecetas: 0,
      busqueda: '',
      resultadosBusqueda: [],
      buscando: false,
      modalAbierto: false,
      recetaSeleccionada: null,
      modoModal: 'ver',
      padreParaCrear: null
    });
  }
}));

// Exportar hook personalizado para debugging
export const useArbolRecetasDebug = () => {
  const store = useArbolRecetasStore();

  console.log('[Store Debug]', {
    conectores: store.conectores.length,
    expandidos: store.expandidos.size,
    hijosMap: store.hijosMap.size,
    cargando: store.cargando,
    busqueda: store.busqueda,
    resultados: store.resultadosBusqueda.length
  });

  return store;
};

export default useArbolRecetasStore;
