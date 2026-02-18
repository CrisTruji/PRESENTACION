// ========================================
// HOOK COMPARTIDO - Unidades Medicas
// ========================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';

export function useUnidadesMedicas() {
  return useQuery({
    queryKey: ['unidades-medicas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades_medicas')
        .select('codigo, nombre_comercial, ciudad, activo')
        .eq('activo', true)
        .order('nombre_comercial');
      return { data, error };
    },
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}
