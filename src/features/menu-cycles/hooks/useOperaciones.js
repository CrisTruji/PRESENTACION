// ========================================
// HOOK - Operaciones
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionesService } from '../services/operacionesService';

export function useOperaciones() {
  return useQuery({
    queryKey: ['operaciones'],
    queryFn: () => operacionesService.getAll(),
    select: (response) => response.data,
  });
}

export function useOperacionesConCiclo() {
  return useQuery({
    queryKey: ['operaciones', 'con-ciclo'],
    queryFn: () => operacionesService.getConCicloActivo(),
    select: (response) => response.data,
  });
}

export function useOperacion(id) {
  return useQuery({
    queryKey: ['operaciones', id],
    queryFn: () => operacionesService.getById(id),
    select: (response) => response.data,
    enabled: !!id,
  });
}

export function useCrearOperacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => operacionesService.crear(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}
