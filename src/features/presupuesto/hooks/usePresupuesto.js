// ========================================
// usePresupuesto - Hooks del módulo de presupuesto
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { presupuestoService } from '../services/presupuestoService';

export function usePresupuestoMes(mes) {
  return useQuery({
    queryKey: ['presupuesto-mes', mes],
    queryFn: () => presupuestoService.getPresupuestoMes(mes),
    select: (res) => res.data,
    enabled: !!mes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGastoReal(mes) {
  return useQuery({
    queryKey: ['gasto-real-mes', mes],
    queryFn: () => presupuestoService.getGastoReal(mes),
    select: (res) => res.data || [],
    enabled: !!mes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrearPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => presupuestoService.crearPresupuesto(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['presupuesto-mes', variables.mes] });
    },
  });
}

export function useActualizarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => presupuestoService.actualizarPresupuesto(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuesto-mes'] });
    },
  });
}
