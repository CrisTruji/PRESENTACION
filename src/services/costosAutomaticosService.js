// ========================================
// COSTOS AUTOMÁTICOS SERVICE - Sprint 3
// Servicio para gestionar triggers y recálculo de costos
// ========================================
// Fecha: 2026-02-06

import { supabase } from '../lib/supabase';

/**
 * Servicio para gestión de costos automáticos
 * Usa triggers de BD y RPCs para recálculo
 */
export const costosAutomaticosService = {

  // ========================================
  // RECÁLCULO DE COSTOS
  // ========================================

  /**
   * Recalcular todas las recetas usando RPC
   * Operación pesada - usar con precaución
   * @returns {Promise<{data, error}>}
   */
  async recalcularTodasRecetas() {
    const { data, error } = await supabase.rpc('recalcular_todas_recetas');

    if (error) return { data: null, error };

    return {
      data: {
        recetas_actualizadas: data[0]?.recetas_actualizadas || 0,
        tiempo_ms: data[0]?.tiempo_ms || 0,
        tiempo_segundos: ((data[0]?.tiempo_ms || 0) / 1000).toFixed(2)
      },
      error: null
    };
  },

  /**
   * Recalcular solo recetas con cambios pendientes usando RPC
   * @returns {Promise<{data, error}>}
   */
  async recalcularRecetasPendientes() {
    const { data, error } = await supabase.rpc('recalcular_recetas_pendientes');

    if (error) return { data: null, error };

    return {
      data: {
        recetas_actualizadas: data[0]?.recetas_actualizadas || 0,
        tiempo_ms: data[0]?.tiempo_ms || 0,
        tiempo_segundos: ((data[0]?.tiempo_ms || 0) / 1000).toFixed(2)
      },
      error: null
    };
  },

  /**
   * Simular cambio de precio sin aplicarlo usando RPC
   * @param {string} materiaPrimaId - UUID de materia prima
   * @param {number} nuevoPrecio - Nuevo precio a simular
   * @returns {Promise<{data, error}>}
   */
  async simularCambioPrecio(materiaPrimaId, nuevoPrecio) {
    const { data, error } = await supabase.rpc('simular_cambio_precio', {
      p_materia_prima_id: materiaPrimaId,
      p_nuevo_precio: nuevoPrecio
    });

    if (error) return { data: null, error };

    // Ordenar por impacto absoluto descendente
    const dataOrdenada = data.sort((a, b) =>
      Math.abs(b.diferencia) - Math.abs(a.diferencia)
    );

    return { data: dataOrdenada, error: null };
  },

  // ========================================
  // CONSULTAS DE ESTADO
  // ========================================

  /**
   * Obtener recetas con costos pendientes usando vista
   * @param {number} limite - Límite de registros (default: 50)
   * @returns {Promise<{data, error}>}
   */
  async getRecetasCostosPendientes(limite = 50) {
    const { data, error } = await supabase
      .from('recetas_costos_pendientes')
      .select('*')
      .order('diferencia', { ascending: false })
      .limit(limite);

    return { data, error };
  },

  /**
   * Contar recetas con cambios pendientes
   * @returns {Promise<{data, error}>}
   */
  async contarRecetasPendientes() {
    const { count, error } = await supabase
      .from('arbol_recetas')
      .select('*', { count: 'exact', head: true })
      .eq('cambios_pendientes', true)
      .eq('activo', true);

    return { data: count, error };
  },

  /**
   * Obtener impacto de cambio de precio usando vista
   * @param {string} materiaPrimaId - UUID de materia prima (opcional)
   * @param {number} minimoRecetas - Mínimo de recetas afectadas (default: 1)
   * @returns {Promise<{data, error}>}
   */
  async getImpactoCambioPrecio(materiaPrimaId = null, minimoRecetas = 1) {
    let query = supabase
      .from('impacto_cambio_precio')
      .select('*')
      .gte('recetas_afectadas', minimoRecetas)
      .order('recetas_afectadas', { ascending: false });

    if (materiaPrimaId) {
      query = query.eq('materia_prima_id', materiaPrimaId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Obtener materias primas más usadas
   * @param {number} limite - Top N materias primas
   * @returns {Promise<{data, error}>}
   */
  async getMateriasPrimasMasUsadas(limite = 20) {
    const { data, error } = await supabase
      .from('impacto_cambio_precio')
      .select('*')
      .order('recetas_afectadas', { ascending: false })
      .limit(limite);

    return { data, error };
  },

  // ========================================
  // ANÁLISIS DE COSTOS
  // ========================================

  /**
   * Obtener recetas con mayor variación de costo
   * @param {number} limite - Límite de registros
   * @returns {Promise<{data, error}>}
   */
  async getRecetasMayorVariacion(limite = 20) {
    const { data, error } = await supabase
      .from('recetas_costos_pendientes')
      .select('*')
      .order('diferencia', { ascending: false })
      .limit(limite);

    if (error) return { data: null, error };

    // Calcular porcentaje de cambio
    const conPorcentaje = data.map(receta => ({
      ...receta,
      porcentaje_cambio: receta.costo_actual > 0
        ? ((receta.diferencia / receta.costo_actual) * 100).toFixed(2)
        : 0
    }));

    return { data: conPorcentaje, error: null };
  },

  /**
   * Obtener estadísticas de costos
   * @returns {Promise<{data, error}>}
   */
  async getEstadisticasCostos() {
    // Obtener recetas pendientes
    const { data: pendientes, error: errorPendientes } = await this.getRecetasCostosPendientes(1000);

    if (errorPendientes) return { data: null, error: errorPendientes };

    // Calcular estadísticas
    const stats = {
      total_pendientes: pendientes.length,
      diferencia_total: pendientes.reduce((sum, r) => sum + Math.abs(r.diferencia || 0), 0),
      diferencia_promedio: pendientes.length > 0
        ? (pendientes.reduce((sum, r) => sum + Math.abs(r.diferencia || 0), 0) / pendientes.length).toFixed(2)
        : 0,
      aumentos: pendientes.filter(r => r.diferencia > 0).length,
      disminuciones: pendientes.filter(r => r.diferencia < 0).length,
      sin_cambio: pendientes.filter(r => r.diferencia === 0).length,
      mayor_aumento: pendientes.reduce((max, r) => r.diferencia > max ? r.diferencia : max, 0),
      mayor_disminucion: pendientes.reduce((min, r) => r.diferencia < min ? r.diferencia : min, 0)
    };

    return { data: stats, error: null };
  },

  /**
   * Comparar costos actual vs nuevo
   * @param {string} recetaId - UUID de la receta
   * @returns {Promise<{data, error}>}
   */
  async compararCostos(recetaId) {
    // Obtener receta actual
    const { data: receta, error: errorReceta } = await supabase
      .from('arbol_recetas')
      .select('id, codigo, nombre, costo_calculado, cambios_pendientes')
      .eq('id', recetaId)
      .single();

    if (errorReceta) return { data: null, error: errorReceta };

    // Obtener ingredientes con precios actuales
    const { data: ingredientes, error: errorIng } = await supabase
      .from('receta_ingredientes')
      .select(`
        id,
        cantidad_requerida,
        materia_prima:materia_prima_id (
          id,
          codigo,
          nombre,
          costo_promedio
        )
      `)
      .eq('receta_id', recetaId)
      .eq('activo', true);

    if (errorIng) return { data: null, error: errorIng };

    // Calcular costo nuevo
    const costoNuevo = ingredientes.reduce((sum, ing) => {
      const cantidad = ing.cantidad_requerida || 0;
      const costo = ing.materia_prima?.costo_promedio || 0;
      return sum + (cantidad * costo);
    }, 0);

    const diferencia = costoNuevo - (receta.costo_calculado || 0);
    const porcentajeCambio = receta.costo_calculado > 0
      ? ((diferencia / receta.costo_calculado) * 100).toFixed(2)
      : 0;

    return {
      data: {
        receta: {
          id: receta.id,
          codigo: receta.codigo,
          nombre: receta.nombre
        },
        costo_actual: parseFloat((receta.costo_calculado || 0).toFixed(2)),
        costo_nuevo: parseFloat(costoNuevo.toFixed(2)),
        diferencia: parseFloat(diferencia.toFixed(2)),
        porcentaje_cambio: parseFloat(porcentajeCambio),
        cambios_pendientes: receta.cambios_pendientes,
        ingredientes_count: ingredientes.length,
        ingredientes: ingredientes.map(ing => ({
          id: ing.id,
          cantidad: ing.cantidad_requerida,
          materia_prima: ing.materia_prima?.nombre,
          costo_unitario: ing.materia_prima?.costo_promedio,
          costo_total: (ing.cantidad_requerida || 0) * (ing.materia_prima?.costo_promedio || 0)
        }))
      },
      error: null
    };
  },

  // ========================================
  // OPERACIONES BATCH
  // ========================================

  /**
   * Actualizar precios de materias primas y recalcular afectadas
   * @param {Array} actualizaciones - Array de {materia_prima_id, nuevo_precio}
   * @returns {Promise<{data, error}>}
   */
  async actualizarPreciosBatch(actualizaciones) {
    const resultados = [];
    const errores = [];

    for (const { materia_prima_id, nuevo_precio } of actualizaciones) {
      // Actualizar precio
      const { error: errorUpdate } = await supabase
        .from('arbol_materia_prima')
        .update({
          costo_promedio: nuevo_precio,
          updated_at: new Date().toISOString()
        })
        .eq('id', materia_prima_id);

      if (errorUpdate) {
        errores.push({ materia_prima_id, error: errorUpdate });
      } else {
        resultados.push({ materia_prima_id, nuevo_precio });
      }
    }

    // Recalcular recetas afectadas
    if (resultados.length > 0) {
      await this.recalcularRecetasPendientes();
    }

    return {
      data: {
        actualizados: resultados.length,
        fallidos: errores.length,
        resultados,
        errores: errores.length > 0 ? errores : null
      },
      error: null
    };
  },

  // ========================================
  // UTILIDADES
  // ========================================

  /**
   * Validar que materia prima existe
   * @param {string} materiaPrimaId - UUID de materia prima
   * @returns {Promise<boolean>}
   */
  async validarMateriaPrima(materiaPrimaId) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('id')
      .eq('id', materiaPrimaId)
      .eq('activo', true)
      .single();

    return !error && data !== null;
  },

  /**
   * Formatear diferencia de costo
   * @param {number} diferencia - Diferencia en costo
   * @returns {string} Texto formateado con símbolo
   */
  formatearDiferencia(diferencia) {
    const simbolo = diferencia > 0 ? '+' : '';
    return `${simbolo}$${diferencia.toFixed(2)}`;
  },

  /**
   * Obtener color para diferencia
   * @param {number} diferencia - Diferencia en costo
   * @returns {string} Clase CSS
   */
  getColorDiferencia(diferencia) {
    if (diferencia > 0) return 'text-red-600';
    if (diferencia < 0) return 'text-green-600';
    return 'text-gray-600';
  },

  /**
   * Obtener icono para diferencia
   * @param {number} diferencia - Diferencia en costo
   * @returns {string} Emoji
   */
  getIconoDiferencia(diferencia) {
    if (diferencia > 0) return '📈'; // Aumento
    if (diferencia < 0) return '📉'; // Disminución
    return '➖'; // Sin cambio
  }
};
