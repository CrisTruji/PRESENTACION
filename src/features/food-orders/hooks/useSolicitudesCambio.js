// ========================================
// HOOKS - Solicitudes de Cambio de Menu
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { solicitudesCambioService } from '../services/solicitudesCambioService';

export function useSolicitudesPendientes() {
  return useQuery({
    queryKey: ['solicitudes-cambio', 'pendientes'],
    queryFn: () => solicitudesCambioService.getPendientes(),
    select: (response) => response.data,
  });
}

export function useSolicitudesPorPedido(pedidoId) {
  return useQuery({
    queryKey: ['solicitudes-cambio', 'pedido', pedidoId],
    queryFn: () => solicitudesCambioService.getPorPedido(pedidoId),
    select: (response) => response.data,
    enabled: !!pedidoId,
  });
}

export function useCrearSolicitudCambio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => solicitudesCambioService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-cambio'] });
    },
  });
}

export function useAprobarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ solicitudId, aprobadoPor, respuesta }) =>
      solicitudesCambioService.aprobar(solicitudId, aprobadoPor, respuesta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-cambio'] });
    },
  });
}

export function useRechazarSolicitud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ solicitudId, aprobadoPor, respuesta }) =>
      solicitudesCambioService.rechazar(solicitudId, aprobadoPor, respuesta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes-cambio'] });
    },
  });
}
