// ========================================
// useRecommendations - Motor de recomendaciones de compra
// ========================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';

export function useRecommendations(diasProyeccion = 7) {
  return useQuery({
    queryKey: ['recomendaciones-compra', diasProyeccion],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('recomendar_compra', {
        p_dias_proyeccion: diasProyeccion,
      });
      if (error) throw error;
      return (data || []).filter((r) => r.urgencia !== 'OK');
    },
    staleTime: 15 * 60 * 1000,
  });
}
