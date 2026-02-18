// ========================================
// HOOKS - Pedido Pacientes (Alcala/Presentes)
// ========================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosService } from '../services/pedidosService';

export function useGuardarPacientes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pedidoId, pacientes }) =>
      pedidosService.guardarPacientes(pedidoId, pacientes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos', 'dia'] });
    },
  });
}
