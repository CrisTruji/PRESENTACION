// src/features/admin/hooks/useCostosPorUnidad.js

import { useQuery } from '@tanstack/react-query';
import { getCostosPorUnidad } from '../services/costosPorUnidadService';

/**
 * Hook que carga costos por unidad para el rango de fechas dado.
 *
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaFin    - 'YYYY-MM-DD'
 */
export function useCostosPorUnidad(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['costos-por-unidad', fechaInicio, fechaFin],
    queryFn:  () => getCostosPorUnidad(fechaInicio, fechaFin),
    enabled:  !!(fechaInicio && fechaFin),
    staleTime: 5 * 60 * 1000,
  });
}
