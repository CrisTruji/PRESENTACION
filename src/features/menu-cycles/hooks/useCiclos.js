// ========================================
// HOOKS - Ciclos de Menu
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ciclosService } from '../services/ciclosService';

export function useCiclosActivos(operacionId) {
  return useQuery({
    queryKey: ['ciclos', 'activos', operacionId],
    queryFn: () => ciclosService.getCiclosActivos(operacionId),
    select: (response) => response.data,
    enabled: !!operacionId,
  });
}

export function useCicloCompleto(cicloId) {
  return useQuery({
    queryKey: ['ciclos', 'completo', cicloId],
    queryFn: () => ciclosService.getCicloCompleto(cicloId),
    select: (response) => response.data,
    enabled: !!cicloId,
  });
}

export function useProgresoCiclo(cicloId) {
  return useQuery({
    queryKey: ['ciclos', 'progreso', cicloId],
    queryFn: () => ciclosService.getProgresoCiclo(cicloId),
    select: (response) => response.data,
    enabled: !!cicloId,
  });
}

export function useDiaServicios(cicloId, numeroDia) {
  return useQuery({
    queryKey: ['ciclos', 'dia', cicloId, numeroDia],
    queryFn: () => ciclosService.getDiaServicios(cicloId, numeroDia),
    select: (response) => response.data,
    enabled: !!cicloId && !!numeroDia,
    // No retener datos del día anterior mientras carga el nuevo
    placeholderData: undefined,
  });
}

export function useCrearCiclo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ operacionId, nombre, fechaInicio, diaActual }) =>
      ciclosService.crearCiclo(operacionId, nombre, fechaInicio, diaActual),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}

export function useActivarCiclo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cicloId) => ciclosService.activarCiclo(cicloId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}

export function useCopiarDia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloId, diaOrigen, diaDestino }) =>
      ciclosService.copiarDia(cicloId, diaOrigen, diaDestino),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'completo', variables.cicloId] });
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'dia', variables.cicloId] });
    },
  });
}

export function useMarcarDiaCompleto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloDiaServicioId, completo }) =>
      ciclosService.marcarDiaCompleto(cicloDiaServicioId, completo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
    },
  });
}

export function useEliminarCiclo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cicloId) => ciclosService.eliminarCiclo(cicloId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}

export function useActivarServicio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloId, servicio }) => ciclosService.activarServicio(cicloId, servicio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}
