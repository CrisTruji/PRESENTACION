// ========================================
// ZUSTAND STORE - Ciclo Editor UI State
// ========================================

import { create } from 'zustand';

export const useCicloEditorStore = create((set, get) => ({
  // ========================================
  // STATE
  // ========================================
  cicloSeleccionado: null,
  operacionSeleccionada: null,
  diaSeleccionado: 1,
  servicioSeleccionado: null,
  componenteSeleccionado: null,
  panelActivo: 'calendario', // 'calendario' | 'gramajes' | 'ingredientes'
  modalNuevoCiclo: false,
  modalRecetaLocal: false,
  modalGramajeBASE: false,

  // ========================================
  // ACTIONS - Seleccion
  // ========================================
  seleccionarOperacion: (operacion) => set({
    operacionSeleccionada: operacion,
    cicloSeleccionado: null,
    diaSeleccionado: 1,
    servicioSeleccionado: null,
    componenteSeleccionado: null,
    panelActivo: 'calendario',
  }),

  seleccionarCiclo: (ciclo) => set({
    cicloSeleccionado: ciclo,
    diaSeleccionado: 1,
    servicioSeleccionado: null,
    componenteSeleccionado: null,
    panelActivo: 'calendario',
  }),

  seleccionarDia: (dia) => set({
    diaSeleccionado: dia,
    componenteSeleccionado: null,
  }),

  seleccionarServicio: (servicio) => set({
    servicioSeleccionado: servicio,
    componenteSeleccionado: null,
  }),

  seleccionarComponente: (componente) => set({
    componenteSeleccionado: componente,
    panelActivo: 'gramajes',
  }),

  // ========================================
  // ACTIONS - Paneles
  // ========================================
  cambiarPanel: (panel) => set({ panelActivo: panel }),

  // ========================================
  // ACTIONS - Modales
  // ========================================
  abrirModalNuevoCiclo: () => set({ modalNuevoCiclo: true }),
  cerrarModalNuevoCiclo: () => set({ modalNuevoCiclo: false }),
  abrirModalRecetaLocal: () => set({ modalRecetaLocal: true }),
  cerrarModalRecetaLocal: () => set({ modalRecetaLocal: false }),
  abrirModalGramajeBASE: () => set({ modalGramajeBASE: true }),
  cerrarModalGramajeBASE: () => set({ modalGramajeBASE: false }),

  // ========================================
  // RESET
  // ========================================
  reset: () => set({
    cicloSeleccionado: null,
    operacionSeleccionada: null,
    diaSeleccionado: 1,
    servicioSeleccionado: null,
    componenteSeleccionado: null,
    panelActivo: 'calendario',
    modalNuevoCiclo: false,
    modalRecetaLocal: false,
    modalGramajeBASE: false,
  }),
}));
