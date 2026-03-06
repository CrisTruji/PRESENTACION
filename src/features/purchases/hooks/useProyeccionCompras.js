// ========================================
// useProyeccionCompras
// Hook React Query para proyección de compras
// ========================================

import { useQuery } from '@tanstack/react-query';
import { getProyeccionCompras } from '../services/proyeccionComprasService';

/**
 * @param {number} diasAdelante - Cuántos días proyectar (7, 14 o 30)
 */
export function useProyeccionCompras(diasAdelante = 7) {
  return useQuery({
    queryKey: ['proyeccion-compras', diasAdelante],
    queryFn: async () => {
      const { data, error } = await getProyeccionCompras(diasAdelante);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos — los datos de menú cambian poco
  });
}
