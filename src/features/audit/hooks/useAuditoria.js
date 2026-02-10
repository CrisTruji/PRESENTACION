// ========================================
// HOOKS DE AUDITORÍA - Sprint 3
// React Query hooks para consultas de auditoría
// ========================================

import { useQuery } from '@tanstack/react-query';
import { auditoriaService } from '../services/auditoriaService';

/**
 * Hook para obtener historial completo de un registro
 * @param {string} tabla - Nombre de la tabla
 * @param {string} registroId - UUID del registro
 */
export function useHistorialRegistro(tabla, registroId) {
  return useQuery({
    queryKey: ['auditoria', 'historial', tabla, registroId],
    queryFn: () => auditoriaService.getHistorial(tabla, registroId),
    select: (response) => response.data,
    enabled: !!tabla && !!registroId,
  });
}

/**
 * Hook para obtener historial de una receta específica
 * Shortcut para tabla arbol_recetas
 */
export function useHistorialReceta(recetaId) {
  return useHistorialRegistro('arbol_recetas', recetaId);
}

/**
 * Hook para obtener historial de materia prima
 * Shortcut para tabla arbol_materia_prima
 */
export function useHistorialMateriaPrima(materiaPrimaId) {
  return useHistorialRegistro('arbol_materia_prima', materiaPrimaId);
}

/**
 * Hook para buscar en auditoría con filtros
 * @param {Object} filtros - Filtros de búsqueda
 */
export function useBuscarAuditoria(filtros = {}) {
  return useQuery({
    queryKey: ['auditoria', 'buscar', filtros],
    queryFn: () => auditoriaService.buscar(filtros),
    select: (response) => response.data,
    keepPreviousData: true, // Mantener datos previos mientras carga nuevos
    enabled: Object.keys(filtros).length > 0, // Solo buscar si hay filtros
  });
}

/**
 * Hook para obtener estadísticas de auditoría
 * @param {number} dias - Número de días hacia atrás
 */
export function useEstadisticasAuditoria(dias = 30) {
  return useQuery({
    queryKey: ['auditoria', 'estadisticas', dias],
    queryFn: () => auditoriaService.getEstadisticas(dias),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener auditoría legible (últimos cambios)
 * @param {number} limite - Límite de resultados
 */
export function useAuditoriaLegible(limite = 50) {
  return useQuery({
    queryKey: ['auditoria', 'legible', limite],
    queryFn: () => auditoriaService.getAuditoriaLegible(limite),
    select: (response) => response.data,
    refetchInterval: 30 * 1000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para obtener resumen de auditoría por día
 */
export function useResumenAuditoria() {
  return useQuery({
    queryKey: ['auditoria', 'resumen'],
    queryFn: () => auditoriaService.getResumenAuditoria(),
    select: (response) => response.data,
  });
}

/**
 * Hook para obtener actividad por usuario
 */
export function useActividadUsuario(usuarioEmail = null) {
  return useQuery({
    queryKey: ['auditoria', 'usuario', usuarioEmail],
    queryFn: () => auditoriaService.getActividadPorUsuario(usuarioEmail),
    select: (response) => response.data,
    enabled: !!usuarioEmail, // Solo si hay usuario
  });
}

/**
 * Hook para obtener usuarios más activos
 * @param {number} limite - Top N usuarios
 */
export function useUsuariosMasActivos(limite = 10) {
  return useQuery({
    queryKey: ['auditoria', 'usuarios-activos', limite],
    queryFn: () => auditoriaService.getUsuariosMasActivos(limite),
    select: (response) => response.data,
  });
}

/**
 * Hook para obtener cambios recientes con filtro de tabla
 * @param {string} tabla - Nombre de tabla (opcional)
 * @param {number} horas - Últimas N horas (default: 24)
 */
export function useCambiosRecientes(tabla = null, horas = 24) {
  const fechaDesde = new Date(Date.now() - horas * 60 * 60 * 1000);

  return useQuery({
    queryKey: ['auditoria', 'cambios-recientes', tabla, horas],
    queryFn: () =>
      auditoriaService.buscar({
        tabla,
        fecha_desde: fechaDesde.toISOString(),
        limite: 100,
      }),
    select: (response) => response.data,
    refetchInterval: 60 * 1000, // Refrescar cada minuto
  });
}
