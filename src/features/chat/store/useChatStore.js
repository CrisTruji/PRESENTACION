// ========================================
// useChatStore — Estado global del chat con Zustand
// ========================================
import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  isOpen:              false,
  conversacionActivaId: null,
  mensajesNoLeidos:    {},

  abrirChat:    () => set({ isOpen: true }),
  cerrarChat:   () => set({ isOpen: false, conversacionActivaId: null }),
  volverALista: () => set({ conversacionActivaId: null }),
  abrirConversacion: (id) => set((s) => ({
    isOpen: true,
    conversacionActivaId: id,
    // Limpiar badge al abrir la conversación
    mensajesNoLeidos: (() => {
      const next = { ...s.mensajesNoLeidos };
      delete next[id];
      return next;
    })(),
  })),

  incrementarNoLeidos: (conversacionId) =>
    set((s) => ({
      mensajesNoLeidos: {
        ...s.mensajesNoLeidos,
        [conversacionId]: (s.mensajesNoLeidos[conversacionId] || 0) + 1,
      },
    })),

  resetearNoLeidos: (conversacionId) =>
    set((s) => {
      const next = { ...s.mensajesNoLeidos };
      delete next[conversacionId];
      return { mensajesNoLeidos: next };
    }),

  getTotalNoLeidos: () =>
    Object.values(get().mensajesNoLeidos).reduce((a, b) => a + b, 0),
}));
