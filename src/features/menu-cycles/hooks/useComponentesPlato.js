// ========================================
// HOOK - Componentes de Plato
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogosService } from '../services/catalogosService';

export function useComponentesPlato() {
  return useQuery({
    queryKey: ['componentes-plato'],
    queryFn: () => catalogosService.getComponentesPlato(),
    select: (response) => response.data,
    staleTime: 30 * 60 * 1000,
  });
}

export function useCrearComponente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => catalogosService.crearComponente(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['componentes-plato'] });
    },
  });
}
