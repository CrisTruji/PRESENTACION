// ========================================
// ZUSTAND STORE - Pedido de Servicio UI State
// ========================================

import { create } from 'zustand';

export const usePedidoStore = create((set, get) => ({
  // ========================================
  // STATE
  // ========================================
  operacionActual: null,
  fechaPedido: new Date().toISOString().split('T')[0],
  servicioPedido: null,
  pedidoActual: null,
  menuDelDia: null,
  items: [],        // [{ tipo_dieta_id, cantidad, gramaje_aplicado, observaciones }]
  pacientes: [],    // [{ nombre, identificacion, cuarto, tipo_dieta_id, alergias, observaciones }]
  horaLimite: null,
  puedeEditar: true,
  modoEdicion: false,

  // ========================================
  // ACTIONS - Configuracion
  // ========================================
  setOperacion: (operacion) => set({
    operacionActual: operacion,
    pedidoActual: null,
    menuDelDia: null,
    items: [],
    pacientes: [],
  }),

  setFecha: (fecha) => set({
    fechaPedido: fecha,
    pedidoActual: null,
    menuDelDia: null,
    items: [],
    pacientes: [],
  }),

  setServicio: (servicio) => set({
    servicioPedido: servicio,
    pedidoActual: null,
    items: [],
    pacientes: [],
  }),

  // ========================================
  // ACTIONS - Pedido
  // ========================================
  setPedido: (pedido) => set({
    pedidoActual: pedido,
    puedeEditar: pedido?.puede_editar ?? true,
    modoEdicion: false,
  }),

  setMenuDelDia: (menu) => set({ menuDelDia: menu }),
  setHoraLimite: (hora) => set({ horaLimite: hora }),
  toggleEdicion: () => set((state) => ({ modoEdicion: !state.modoEdicion })),

  // ========================================
  // ACTIONS - Items (cantidades por dieta)
  // ========================================
  setItems: (items) => set({ items }),

  actualizarItem: (tipoDietaId, campo, valor) => set((state) => {
    const nuevosItems = state.items.map((item) =>
      item.tipo_dieta_id === tipoDietaId
        ? { ...item, [campo]: valor }
        : item
    );
    return { items: nuevosItems };
  }),

  inicializarItems: (tiposDieta) => set({
    items: tiposDieta.map((td) => ({
      tipo_dieta_id: td.id,
      cantidad: 0,
      gramaje_aplicado: null,
      observaciones: null,
    })),
  }),

  // ========================================
  // ACTIONS - Pacientes
  // ========================================
  setPacientes: (pacientes) => set({ pacientes }),

  agregarPaciente: (paciente) => set((state) => ({
    pacientes: [...state.pacientes, paciente],
  })),

  actualizarPaciente: (index, campo, valor) => set((state) => {
    const nuevos = [...state.pacientes];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    return { pacientes: nuevos };
  }),

  eliminarPaciente: (index) => set((state) => ({
    pacientes: state.pacientes.filter((_, i) => i !== index),
  })),

  // ========================================
  // COMPUTED
  // ========================================
  getTotalPorciones: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  },

  getTotalPacientes: () => {
    return get().pacientes.length;
  },

  // ========================================
  // RESET
  // ========================================
  reset: () => set({
    operacionActual: null,
    fechaPedido: new Date().toISOString().split('T')[0],
    servicioPedido: null,
    pedidoActual: null,
    menuDelDia: null,
    items: [],
    pacientes: [],
    horaLimite: null,
    puedeEditar: true,
    modoEdicion: false,
  }),
}));
