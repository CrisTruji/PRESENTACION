// ========================================
// HOOK - Tipos de Dieta (Keralty)
// ========================================

import { useQuery } from '@tanstack/react-query';
import { catalogosService } from '../services/catalogosService';

export function useTiposDieta() {
  return useQuery({
    queryKey: ['tipos-dieta'],
    queryFn: () => catalogosService.getTiposDieta(),
    select: (response) => response.data,
    staleTime: 30 * 60 * 1000, // 30 min - raramente cambia
  });
}

export function useTiposDietaPorCategoria(categoria) {
  return useQuery({
    queryKey: ['tipos-dieta', categoria],
    queryFn: () => catalogosService.getTiposDietaPorCategoria(categoria),
    select: (response) => response.data,
    enabled: !!categoria,
    staleTime: 30 * 60 * 1000,
  });
}
