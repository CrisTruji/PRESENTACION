// ========================================
// HOOKS - Consolidado de Produccion
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consolidadoService } from '../services/consolidadoService';

export function useConsolidadoPorFecha(fecha, servicio) {
  return useQuery({
    queryKey: ['consolidado', 'fecha', fecha, servicio],
    queryFn: () => consolidadoService.getConsolidadoPorFecha(fecha, servicio),
    select: (response) => response.data,
    enabled: !!fecha && !!servicio,
  });
}

export function useConsolidado(consolidadoId) {
  return useQuery({
    queryKey: ['consolidado', consolidadoId],
    queryFn: () => consolidadoService.getConsolidado(consolidadoId),
    select: (response) => response.data,
    enabled: !!consolidadoId,
  });
}

export function useVistaRecetas(consolidadoId) {
  return useQuery({
    queryKey: ['consolidado', 'recetas', consolidadoId],
    queryFn: () => consolidadoService.getVistaRecetas(consolidadoId),
    select: (response) => response.data,
    enabled: !!consolidadoId,
  });
}

export function useIngredientesTotales(consolidadoId) {
  return useQuery({
    queryKey: ['consolidado', 'ingredientes', consolidadoId],
    queryFn: () => consolidadoService.getIngredientesTotales(consolidadoId),
    select: (response) => response.data,
    enabled: !!consolidadoId,
  });
}

export function useCambiosRealizados(consolidadoId) {
  return useQuery({
    queryKey: ['consolidado', 'cambios', consolidadoId],
    queryFn: () => consolidadoService.getCambiosRealizados(consolidadoId),
    select: (response) => response.data,
    enabled: !!consolidadoId,
  });
}

export function useConsolidar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fecha, servicio }) =>
      consolidadoService.consolidar(fecha, servicio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidado'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useSustituirReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consolidadoId, recetaOriginalId, recetaNuevaId, motivo, supervisorId }) =>
      consolidadoService.sustituirReceta(consolidadoId, recetaOriginalId, recetaNuevaId, motivo, supervisorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consolidado', variables.consolidadoId] });
      queryClient.invalidateQueries({ queryKey: ['consolidado', 'recetas', variables.consolidadoId] });
      queryClient.invalidateQueries({ queryKey: ['consolidado', 'ingredientes', variables.consolidadoId] });
    },
  });
}

export function useAprobarConsolidado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consolidadoId, supervisorId }) =>
      consolidadoService.aprobarConsolidado(consolidadoId, supervisorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidado'] });
    },
  });
}

export function useMarcarPreparado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (consolidadoId) =>
      consolidadoService.marcarPreparado(consolidadoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidado'] });
    },
  });
}
