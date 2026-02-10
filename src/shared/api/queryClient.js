// ========================================
// TANSTACK QUERY CLIENT - Sprint 3
// Configuración centralizada para cache y queries
// ========================================

import { QueryClient } from '@tanstack/react-query';

/**
 * Query Client con configuración optimizada
 *
 * Configuración:
 * - staleTime: 5 minutos (datos considerados frescos)
 * - retry: 1 intento (evitar múltiples reintentos en dev)
 * - refetchOnWindowFocus: false (evitar refetch automático)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
