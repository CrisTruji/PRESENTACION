// src/features/admin/services/costosPorUnidadService.js
// Wrapper del RPC calcular_costos_por_unidad

import { supabase } from '@/shared/api';

/**
 * Llama la RPC calcular_costos_por_unidad y devuelve los resultados.
 *
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaFin    - 'YYYY-MM-DD'
 * @returns {Promise<Array>}   Lista de { operacion_id, operacion_nombre, servicio,
 *                                         total_raciones, costo_estimado }
 */
export async function getCostosPorUnidad(fechaInicio, fechaFin) {
  const { data, error } = await supabase.rpc('calcular_costos_por_unidad', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin:    fechaFin,
  });
  if (error) throw error;
  return data || [];
}
