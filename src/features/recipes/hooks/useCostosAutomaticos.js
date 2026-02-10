// ========================================
// HOOKS DE COSTOS AUTOMÁTICOS - Sprint 3
// React Query hooks para gestión de triggers y recálculo de costos
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costosAutomaticosService } from '../services/costosAutomaticosService';

/**
 * Hook para obtener recetas con costos pendientes
 * @param {number} limite - Límite de recetas
 */
export function useRecetasCostosPendientes(limite = 50) {
  return useQuery({
    queryKey: ['costos', 'pendientes', limite],
    queryFn: () => costosAutomaticosService.getRecetasCostosPendientes(limite),
    select: (response) => response.data,
    refetchInterval: 60 * 1000, // Refrescar cada minuto
  });
}

/**
 * Hook para contar recetas pendientes
 */
export function useContarRecetasPendientes() {
  return useQuery({
    queryKey: ['costos', 'pendientes', 'count'],
    queryFn: () => costosAutomaticosService.contarRecetasPendientes(),
    select: (response) => response.data,
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para obtener impacto de cambio de precio de materia prima
 * @param {string} materiaPrimaId - UUID de materia prima (opcional)
 * @param {number} minimoRecetas - Mínimo de recetas afectadas
 */
export function useImpactoCambioPrecio(materiaPrimaId = null, minimoRecetas = 1) {
  return useQuery({
    queryKey: ['costos', 'impacto', materiaPrimaId, minimoRecetas],
    queryFn: () =>
      costosAutomaticosService.getImpactoCambioPrecio(materiaPrimaId, minimoRecetas),
    select: (response) => response.data,
    enabled: !!materiaPrimaId, // Solo ejecutar si hay ID
  });
}

/**
 * Hook para obtener materias primas más usadas
 * @param {number} limite - Top N materias primas
 */
export function useMateriasPrimasMasUsadas(limite = 20) {
  return useQuery({
    queryKey: ['costos', 'materias-mas-usadas', limite],
    queryFn: () => costosAutomaticosService.getMateriasPrimasMasUsadas(limite),
    select: (response) => response.data,
  });
}

/**
 * Hook para recalcular todas las recetas (mutation)
 * ⚠️ Operación pesada - usar con precaución
 */
export function useRecalcularTodasRecetas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => costosAutomaticosService.recalcularTodasRecetas(),
    onSuccess: (response) => {
      console.log(
        `[Costos] Recalculadas ${response.data.recetas_actualizadas} recetas en ${response.data.tiempo_segundos}s`
      );

      // Invalidar todas las queries de costos
      queryClient.invalidateQueries({ queryKey: ['costos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
    },
    onError: (error) => {
      console.error('[Costos] Error recalculando todas las recetas:', error);
    },
  });
}

/**
 * Hook para recalcular solo recetas pendientes (mutation)
 * Más eficiente que recalcular todas
 */
export function useRecalcularRecetasPendientes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => costosAutomaticosService.recalcularRecetasPendientes(),
    onSuccess: (response) => {
      console.log(
        `[Costos] Recalculadas ${response.data.recetas_actualizadas} recetas pendientes en ${response.data.tiempo_segundos}s`
      );

      queryClient.invalidateQueries({ queryKey: ['costos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
    },
  });
}

/**
 * Hook para simular cambio de precio (sin aplicarlo)
 * @param {string} materiaPrimaId - UUID de materia prima
 * @param {number} nuevoPrecio - Precio a simular
 */
export function useSimularCambioPrecio() {
  return useMutation({
    mutationFn: ({ materiaPrimaId, nuevoPrecio }) =>
      costosAutomaticosService.simularCambioPrecio(materiaPrimaId, nuevoPrecio),
    onError: (error) => {
      console.error('[Costos] Error simulando cambio de precio:', error);
    },
  });
}

/**
 * Hook para obtener recetas con mayor variación de costo
 * @param {number} limite - Límite de recetas
 */
export function useRecetasMayorVariacion(limite = 20) {
  return useQuery({
    queryKey: ['costos', 'mayor-variacion', limite],
    queryFn: () => costosAutomaticosService.getRecetasMayorVariacion(limite),
    select: (response) => response.data,
  });
}

/**
 * Hook para obtener estadísticas de costos
 */
export function useEstadisticasCostos() {
  return useQuery({
    queryKey: ['costos', 'estadisticas'],
    queryFn: () => costosAutomaticosService.getEstadisticasCostos(),
    select: (response) => response.data,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para comparar costos actual vs nuevo de una receta
 * @param {string} recetaId - UUID de la receta
 */
export function useCompararCostos(recetaId) {
  return useQuery({
    queryKey: ['costos', 'comparar', recetaId],
    queryFn: () => costosAutomaticosService.compararCostos(recetaId),
    select: (response) => response.data,
    enabled: !!recetaId,
  });
}

/**
 * Hook para actualizar precios en batch (mutation)
 * @param {Array} actualizaciones - Array de {materia_prima_id, nuevo_precio}
 */
export function useActualizarPreciosBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actualizaciones) =>
      costosAutomaticosService.actualizarPreciosBatch(actualizaciones),
    onSuccess: (response) => {
      console.log(`[Costos] Actualizados ${response.data.actualizados} precios en batch`);

      queryClient.invalidateQueries({ queryKey: ['costos'] });
      queryClient.invalidateQueries({ queryKey: ['materia-prima'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
    },
  });
}
