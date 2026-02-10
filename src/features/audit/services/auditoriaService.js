// ========================================
// AUDITORÍA SERVICE - Sprint 3
// Servicio para consultas de auditoría usando RPCs de BD
// ========================================
// Fecha: 2026-02-06

import { supabase } from '@/shared/api';

/**
 * Servicio para consultar auditoría de cambios
 * Trazabilidad completa de INSERT, UPDATE, DELETE
 */
export const auditoriaService = {

  // ========================================
  // CONSULTAS DE AUDITORÍA
  // ========================================

  /**
   * Obtener historial completo de un registro usando RPC
   * @param {string} tabla - Nombre de la tabla
   * @param {string} registroId - UUID del registro
   * @returns {Promise<{data, error}>}
   */
  async getHistorial(tabla, registroId) {
    const { data, error } = await supabase.rpc('obtener_historial_registro', {
      p_tabla: tabla,
      p_registro_id: registroId
    });

    return { data, error };
  },

  /**
   * Buscar en auditoría con filtros usando RPC
   * @param {Object} filtros - Filtros de búsqueda
   * @param {string} filtros.tabla - Nombre de tabla (opcional)
   * @param {string} filtros.operacion - INSERT, UPDATE, DELETE (opcional)
   * @param {string} filtros.usuario_email - Email del usuario (opcional)
   * @param {Date} filtros.fecha_desde - Fecha desde (opcional, default: 30 días atrás)
   * @param {Date} filtros.fecha_hasta - Fecha hasta (opcional, default: ahora)
   * @param {number} filtros.limite - Límite de resultados (default: 100)
   * @returns {Promise<{data, error}>}
   */
  async buscar(filtros = {}) {
    const fechaDesde = filtros.fecha_desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaHasta = filtros.fecha_hasta || new Date();

    const { data, error } = await supabase.rpc('buscar_auditoria', {
      p_tabla: filtros.tabla || null,
      p_operacion: filtros.operacion || null,
      p_usuario_email: filtros.usuario_email || null,
      p_fecha_desde: fechaDesde.toISOString(),
      p_fecha_hasta: fechaHasta.toISOString(),
      p_limite: filtros.limite || 100
    });

    return { data, error };
  },

  /**
   * Obtener estadísticas de auditoría usando RPC
   * @param {number} dias - Cantidad de días a analizar (default: 30)
   * @returns {Promise<{data, error}>}
   */
  async getEstadisticas(dias = 30) {
    const { data, error } = await supabase.rpc('estadisticas_auditoria', {
      p_dias: dias
    });

    return { data, error };
  },

  /**
   * Obtener auditoría legible usando vista
   * @param {number} limite - Cantidad de registros (default: 50)
   * @param {number} offset - Offset para paginación (default: 0)
   * @returns {Promise<{data, error}>}
   */
  async getAuditoriaLegible(limite = 50, offset = 0) {
    const { data, error } = await supabase
      .from('auditoria_legible')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limite - 1);

    return { data, error };
  },

  /**
   * Obtener resumen de auditoría usando vista
   * @param {number} dias - Últimos N días (default: 30)
   * @returns {Promise<{data, error}>}
   */
  async getResumen(dias = 30) {
    const fechaDesde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('auditoria_resumen')
      .select('*')
      .gte('primera_operacion', fechaDesde.toISOString())
      .order('dia', { ascending: false });

    return { data, error };
  },

  /**
   * Obtener actividad por usuario usando vista
   * @param {string} usuarioEmail - Email del usuario (opcional)
   * @param {number} dias - Últimos N días (default: 7)
   * @returns {Promise<{data, error}>}
   */
  async getActividadPorUsuario(usuarioEmail = null, dias = 7) {
    const fechaDesde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('auditoria_por_usuario')
      .select('*')
      .gte('ultima_actividad', fechaDesde.toISOString())
      .order('hora', { ascending: false });

    if (usuarioEmail) {
      query = query.ilike('usuario_email', `%${usuarioEmail}%`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // ========================================
  // AUDITORÍA POR TABLA ESPECÍFICA
  // ========================================

  /**
   * Obtener auditoría de recetas
   * @param {string} recetaId - UUID de la receta (opcional)
   * @param {number} limite - Límite de registros
   * @returns {Promise<{data, error}>}
   */
  async getAuditoriaRecetas(recetaId = null, limite = 50) {
    const filtros = {
      tabla: 'arbol_recetas',
      limite
    };

    if (recetaId) {
      // Si hay ID específico, usar getHistorial
      return this.getHistorial('arbol_recetas', recetaId);
    }

    return this.buscar(filtros);
  },

  /**
   * Obtener auditoría de ingredientes
   * @param {string} recetaId - UUID de la receta
   * @param {number} limite - Límite de registros
   * @returns {Promise<{data, error}>}
   */
  async getAuditoriaIngredientes(recetaId = null, limite = 50) {
    const filtros = {
      tabla: 'receta_ingredientes',
      limite
    };

    if (recetaId) {
      return this.getHistorial('receta_ingredientes', recetaId);
    }

    return this.buscar(filtros);
  },

  /**
   * Obtener auditoría de materia prima
   * @param {string} materiaPrimaId - UUID de materia prima (opcional)
   * @param {number} limite - Límite de registros
   * @returns {Promise<{data, error}>}
   */
  async getAuditoriaMateriaPrima(materiaPrimaId = null, limite = 50) {
    const filtros = {
      tabla: 'arbol_materia_prima',
      limite
    };

    if (materiaPrimaId) {
      return this.getHistorial('arbol_materia_prima', materiaPrimaId);
    }

    return this.buscar(filtros);
  },

  // ========================================
  // ANÁLISIS Y REPORTES
  // ========================================

  /**
   * Obtener cambios recientes (últimas 24 horas)
   * @param {string} tabla - Tabla específica (opcional)
   * @returns {Promise<{data, error}>}
   */
  async getCambiosRecientes(tabla = null) {
    const fechaDesde = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.buscar({
      tabla,
      fecha_desde: fechaDesde,
      limite: 100
    });
  },

  /**
   * Obtener usuarios más activos
   * @param {number} dias - Últimos N días
   * @param {number} limite - Top N usuarios
   * @returns {Promise<{data, error}>}
   */
  async getUsuariosMasActivos(dias = 7, limite = 10) {
    const fechaDesde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('auditoria_por_usuario')
      .select('usuario_email, total_operaciones')
      .gte('ultima_actividad', fechaDesde.toISOString())
      .order('total_operaciones', { ascending: false })
      .limit(limite);

    if (error) return { data: null, error };

    // Agrupar por usuario y sumar operaciones
    const usuariosMap = {};
    data.forEach(item => {
      if (!usuariosMap[item.usuario_email]) {
        usuariosMap[item.usuario_email] = 0;
      }
      usuariosMap[item.usuario_email] += item.total_operaciones || 0;
    });

    const usuariosActivos = Object.entries(usuariosMap)
      .map(([email, total]) => ({ usuario_email: email, total_operaciones: total }))
      .sort((a, b) => b.total_operaciones - a.total_operaciones)
      .slice(0, limite);

    return { data: usuariosActivos, error: null };
  },

  /**
   * Obtener tablas más modificadas
   * @param {number} dias - Últimos N días
   * @returns {Promise<{data, error}>}
   */
  async getTablasMasModificadas(dias = 30) {
    const fechaDesde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('auditoria_resumen')
      .select('tabla, total_operaciones')
      .gte('primera_operacion', fechaDesde.toISOString());

    if (error) return { data: null, error };

    // Agrupar por tabla
    const tablasMap = {};
    data.forEach(item => {
      if (!tablasMap[item.tabla]) {
        tablasMap[item.tabla] = 0;
      }
      tablasMap[item.tabla] += item.total_operaciones || 0;
    });

    const tablas = Object.entries(tablasMap)
      .map(([tabla, total]) => ({ tabla, total_operaciones: total }))
      .sort((a, b) => b.total_operaciones - a.total_operaciones);

    return { data: tablas, error: null };
  },

  /**
   * Comparar dos versiones de un registro
   * @param {string} tabla - Nombre de la tabla
   * @param {string} registroId - UUID del registro
   * @param {string} auditId1 - ID de auditoría versión 1
   * @param {string} auditId2 - ID de auditoría versión 2
   * @returns {Promise<{data, error}>}
   */
  async compararVersiones(tabla, registroId, auditId1, auditId2) {
    // Obtener ambas versiones
    const { data: historial, error } = await this.getHistorial(tabla, registroId);

    if (error) return { data: null, error };

    const version1 = historial.find(h => h.id === auditId1);
    const version2 = historial.find(h => h.id === auditId2);

    if (!version1 || !version2) {
      return {
        data: null,
        error: { message: 'Una o ambas versiones no encontradas' }
      };
    }

    // Calcular diferencias
    const cambios = version1.cambios || {};
    const keys = Object.keys(cambios);

    const diferencias = keys.map(key => ({
      campo: key,
      version1: cambios[key]?.anterior,
      version2: cambios[key]?.nuevo
    }));

    return {
      data: {
        version1: {
          id: version1.id,
          operacion: version1.operacion,
          usuario: version1.usuario_email,
          fecha: version1.created_at
        },
        version2: {
          id: version2.id,
          operacion: version2.operacion,
          usuario: version2.usuario_email,
          fecha: version2.created_at
        },
        diferencias
      },
      error: null
    };
  },

  // ========================================
  // UTILIDADES
  // ========================================

  /**
   * Formatear fecha para auditoría
   * @param {string} isoDate - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
  formatearFecha(isoDate) {
    const fecha = new Date(isoDate);
    return fecha.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * Obtener icono para tipo de operación
   * @param {string} operacion - INSERT, UPDATE, DELETE
   * @returns {string} Emoji
   */
  getIconoOperacion(operacion) {
    const iconos = {
      INSERT: '➕',
      UPDATE: '✏️',
      DELETE: '🗑️'
    };
    return iconos[operacion] || '📝';
  },

  /**
   * Obtener color para tipo de operación
   * @param {string} operacion - INSERT, UPDATE, DELETE
   * @returns {string} Color
   */
  getColorOperacion(operacion) {
    const colores = {
      INSERT: 'green',
      UPDATE: 'blue',
      DELETE: 'red'
    };
    return colores[operacion] || 'gray';
  },

  /**
   * Formatear operación en español
   * @param {string} operacion - INSERT, UPDATE, DELETE
   * @returns {string} Operación formateada
   */
  formatearOperacion(operacion) {
    const formatos = {
      INSERT: 'Creación',
      UPDATE: 'Actualización',
      DELETE: 'Eliminación'
    };
    return formatos[operacion] || operacion;
  },

  /**
   * Obtener auditoría legible (últimos cambios)
   * @param {number} limite - Límite de resultados
   * @returns {Promise<{data, error}>}
   */
  async getAuditoriaLegible(limite = 50) {
    const { data, error} = await supabase
      .from('auditoria_legible')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    return { data, error };
  },

  /**
   * Obtener actividad por usuario
   * @param {string} usuarioEmail - Email del usuario (null = todos)
   * @returns {Promise<{data, error}>}
   */
  async getActividadPorUsuario(usuarioEmail = null) {
    let query = supabase
      .from('auditoria_por_usuario')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (usuarioEmail) {
      query = query.eq('usuario_email', usuarioEmail);
    }

    const { data, error } = await query;
    return { data, error };
  }
};
