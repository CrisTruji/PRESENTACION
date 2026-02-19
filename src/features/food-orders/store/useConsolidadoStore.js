// ========================================
// ZUSTAND STORE - Consolidado Supervisor UI State
// ========================================

import { create } from 'zustand';

export const useConsolidadoStore = create((set, get) => ({
  // ========================================
  // STATE
  // ========================================
  vistaActiva: 'recetas',  // 'recetas' | 'unidades' | 'ingredientes'
  filtroFecha: new Date().toISOString().split('T')[0],
  filtroServicio: 'almuerzo',
  filtroUnidad: null,       // operacion_id | null = todas las unidades
  consolidadoActual: null,
  solicitudesPendientes: [],
  alertasStock: [],
  recetaSustituyendo: null,  // { recetaOriginalId, consolidadoId }

  // ========================================
  // ACTIONS - Vistas
  // ========================================
  cambiarVista: (vista) => set({ vistaActiva: vista }),

  // ========================================
  // ACTIONS - Filtros
  // ========================================
  setFiltroFecha: (fecha) => set({
    filtroFecha: fecha,
    consolidadoActual: null,
  }),

  setFiltroServicio: (servicio) => set({
    filtroServicio: servicio,
    consolidadoActual: null,
  }),

  setFiltroUnidad: (operacionId) => set({
    filtroUnidad: operacionId,
  }),

  // ========================================
  // ACTIONS - Consolidado
  // ========================================
  setConsolidado: (consolidado) => set({ consolidadoActual: consolidado }),

  // ========================================
  // ACTIONS - Solicitudes
  // ========================================
  setSolicitudes: (solicitudes) => set({ solicitudesPendientes: solicitudes }),

  // ========================================
  // ACTIONS - Alertas Stock
  // ========================================
  setAlertas: (alertas) => set({ alertasStock: alertas }),

  // ========================================
  // ACTIONS - Sustitucion
  // ========================================
  iniciarSustitucion: (recetaOriginalId, consolidadoId) => set({
    recetaSustituyendo: { recetaOriginalId, consolidadoId },
  }),

  cancelarSustitucion: () => set({ recetaSustituyendo: null }),

  // ========================================
  // COMPUTED
  // ========================================
  getAlertasInsuficientes: () => {
    return get().alertasStock.filter((a) => a.estado_stock === 'INSUFICIENTE');
  },

  getCantidadSolicitudes: () => {
    return get().solicitudesPendientes.length;
  },

  // ========================================
  // RESET
  // ========================================
  reset: () => set({
    vistaActiva: 'recetas',
    filtroFecha: new Date().toISOString().split('T')[0],
    filtroServicio: 'almuerzo',
    filtroUnidad: null,
    consolidadoActual: null,
    solicitudesPendientes: [],
    alertasStock: [],
    recetaSustituyendo: null,
  }),
}));
