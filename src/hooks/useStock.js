// ========================================
// HOOKS DE STOCK - Sprint 3
// React Query hooks para gestión de stock
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../services/stockService';

/**
 * Hook para obtener stock con alertas
 * Incluye jerarquía completa y estado de stock
 */
export function useStockConAlertas() {
  return useQuery({
    queryKey: ['stock', 'alertas'],
    queryFn: () => stockService.getStockConAlertas(),
    select: (response) => response.data,
  });
}

/**
 * Hook para obtener stock bajo (crítico)
 * Actualiza cada 2 minutos automáticamente
 */
export function useStockBajo() {
  return useQuery({
    queryKey: ['stock', 'bajo'],
    queryFn: () => stockService.getStockBajo(),
    select: (response) => response.data,
    refetchInterval: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para obtener presentaciones de un stock
 */
export function usePresentaciones(stockId, options = {}) {
  return useQuery({
    queryKey: ['presentaciones', stockId],
    queryFn: () => stockService.getPresentaciones(stockId),
    select: (response) => response.data,
    enabled: !!stockId, // Solo ejecutar si hay stockId
    ...options,
  });
}

/**
 * Hook para obtener costo promedio de materia prima
 */
export function useCostoPromedio(materiaPrimaId, meses = 3) {
  return useQuery({
    queryKey: ['costo-promedio', materiaPrimaId, meses],
    queryFn: () => stockService.getCostoPromedio(materiaPrimaId, meses),
    select: (response) => response.data,
    enabled: !!materiaPrimaId,
  });
}

/**
 * Hook para actualizar stock (mutation)
 * Invalida cache de stock después de actualizar
 */
export function useActualizarStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockId, cantidad, operacion }) =>
      stockService.actualizarStock(stockId, cantidad, operacion),
    onSuccess: (response) => {
      // Invalidar queries relacionadas con stock
      queryClient.invalidateQueries({ queryKey: ['stock'] });

      // Si hay alerta, mostrarla
      if (response.data?.mensaje) {
        console.log('[Stock]', response.data.mensaje);
      }
    },
    onError: (error) => {
      console.error('[Stock] Error actualizando:', error);
    },
  });
}

/**
 * Hook para actualizar múltiples stocks en batch
 */
export function useActualizarStockBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (operaciones) => stockService.actualizarStockBatch(operaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

/**
 * Hook para validar disponibilidad de stock antes de operación
 */
export function useValidarStock(stockId, cantidadRequerida) {
  return useQuery({
    queryKey: ['stock', 'validar', stockId, cantidadRequerida],
    queryFn: () => stockService.validarStockDisponible(stockId, cantidadRequerida),
    select: (response) => response.data,
    enabled: !!stockId && cantidadRequerida > 0,
    staleTime: 0, // Siempre validar en tiempo real
  });
}
