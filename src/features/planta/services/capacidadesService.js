// src/features/planta/services/capacidadesService.js
// Servicio para gestionar la capacidad promedio de raciones por servicio/unidad.
// Tabla: servicios_unidad (columnas nuevas: capacidad_promedio, capacidad_descripcion)

import { supabase } from '@/shared/api';

/**
 * Obtiene todas las filas de servicios_unidad con su operacion y capacidad_promedio.
 * Retorna resultados ordenados por operación y luego por servicio.
 *
 * @returns {Promise<Array>} Lista de { id, servicio, capacidad_promedio, capacidad_descripcion,
 *                                       hora_limite, activo, operacion_id, operacion_nombre }
 */
export async function getCapacidadesPorOperacion() {
  const { data, error } = await supabase
    .from('servicios_unidad')
    .select(`
      id,
      servicio,
      hora_limite,
      activo,
      capacidad_promedio,
      capacidad_descripcion,
      operacion_id,
      operaciones ( id, nombre, codigo )
    `)
    .eq('activo', true)
    .order('operacion_id')
    .order('servicio');

  if (error) throw error;

  // Aplanar el join para facilitar el uso en componentes
  return (data || []).map((row) => ({
    id: row.id,
    servicio: row.servicio,
    hora_limite: row.hora_limite,
    activo: row.activo,
    capacidad_promedio: row.capacidad_promedio ?? 0,
    capacidad_descripcion: row.capacidad_descripcion ?? '',
    operacion_id: row.operacion_id,
    operacion_nombre: row.operaciones?.nombre ?? '',
    operacion_codigo: row.operaciones?.codigo ?? '',
  }));
}

/**
 * Obtiene la capacidad promedio total por operación (suma de todos los servicios activos).
 * Útil como fallback en ProyeccionSemanal cuando no hay historial suficiente.
 *
 * @returns {Promise<Object>} Mapa { operacion_id: capacidad_total }
 */
export async function getCapacidadesPorOperacionAgrupadas() {
  const { data, error } = await supabase
    .from('servicios_unidad')
    .select('operacion_id, capacidad_promedio')
    .eq('activo', true);

  if (error) throw error;

  const mapa = {};
  for (const row of data || []) {
    const opId = row.operacion_id;
    mapa[opId] = (mapa[opId] || 0) + (row.capacidad_promedio || 0);
  }
  return mapa;
}

/**
 * Actualiza la capacidad promedio (y opcionalmente la descripción) de un servicio/unidad.
 *
 * @param {string} servicioUnidadId - UUID del registro en servicios_unidad
 * @param {number} capacidadPromedio - Nuevo valor de raciones promedio por día
 * @param {string} [descripcion] - Descripción/nota opcional
 * @returns {Promise<void>}
 */
export async function updateCapacidad(servicioUnidadId, capacidadPromedio, descripcion) {
  const update = { capacidad_promedio: capacidadPromedio };
  if (descripcion !== undefined) update.capacidad_descripcion = descripcion;

  const { error } = await supabase
    .from('servicios_unidad')
    .update(update)
    .eq('id', servicioUnidadId);

  if (error) throw error;
}
