// ========================================
// HOOKS - Pedidos de Servicio
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '../services/pedidosService';

export function usePedidoDelDia(operacionId, fecha, servicio) {
  return useQuery({
    queryKey: ['pedidos', 'dia', operacionId, fecha, servicio],
    queryFn: () => pedidosService.getPedidoDelDia(operacionId, fecha, servicio),
    select: (response) => response.data,
    enabled: !!operacionId && !!fecha && !!servicio,
  });
}

export function usePedidosPorFecha(fecha, servicio = null) {
  return useQuery({
    queryKey: ['pedidos', 'fecha', fecha, servicio],
    queryFn: () => pedidosService.getPedidosPorFecha(fecha, servicio),
    select: (response) => response.data,
    enabled: !!fecha,
  });
}

export function useMenuDelDia(operacionId, fecha) {
  return useQuery({
    queryKey: ['pedidos', 'menu', operacionId, fecha],
    queryFn: () => pedidosService.getMenuDelDia(operacionId, fecha),
    select: (response) => response.data,
    enabled: !!operacionId && !!fecha,
  });
}

export function useCrearPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => pedidosService.crearPedido(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useEnviarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pedidoId) => pedidosService.enviarPedido(pedidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

export function useGuardarItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pedidoId, items }) =>
      pedidosService.guardarItems(pedidoId, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'dia'] });
    },
  });
}
