// ========================================
// STOCK SERVICE - Sprint 3
// Servicio para gestión de stock usando RPCs de BD
// ========================================
// Fecha: 2026-02-06

import { supabase } from '../lib/supabase';

/**
 * Servicio dedicado para gestión de stock (niveles 5 y 6)
 * Usa RPCs de BD para operaciones optimizadas
 */
export const stockService = {

  // ========================================
  // OPERACIONES DE STOCK (Nivel 5)
  // ========================================

  /**
   * Actualizar stock usando RPC con validaciones
   * @param {string} stockId - UUID del stock (nivel 5)
   * @param {number} cantidad - Cantidad a incrementar/decrementar
   * @param {string} operacion - 'incrementar', 'decrementar', o 'establecer'
   * @returns {Promise<{data, error}>}
   */
  async actualizarStock(stockId, cantidad, operacion = 'incrementar') {
    const { data, error } = await supabase.rpc('actualizar_stock', {
      p_stock_id: stockId,
      p_cantidad: cantidad,
      p_operacion: operacion
    });

    return { data, error };
  },

  /**
   * Obtener alertas de stock bajo usando vista optimizada
   * FALLBACK: Si RPC no existe, usa vista directamente
   * @returns {Promise<{data, error}>}
   */
  async getStockBajo() {
    // Intentar RPC primero
    let { data, error } = await supabase.rpc('obtener_stock_bajo');

    // Si RPC no existe, usar vista directamente
    if (error && error.code === 'PGRST202') {
      console.warn('[StockService] RPC obtener_stock_bajo no existe, usando vista');
      const result = await supabase
        .from('vista_stock_alertas')
        .select('*')
        .in('estado_stock', ['CRÍTICO', 'BAJO'])
        .order('estado_stock', { ascending: false });

      data = result.data;
      error = result.error;
    }

    return { data, error };
  },

  /**
   * Calcular costo promedio de materia prima (últimos N meses)
   * @param {string} materiaPrimaId - UUID de materia prima
   * @param {number} meses - Cantidad de meses (default: 3)
   * @returns {Promise<{data, error}>}
   */
  async getCostoPromedio(materiaPrimaId, meses = 3) {
    const { data, error } = await supabase.rpc('calcular_costo_promedio', {
      p_materia_prima_id: materiaPrimaId,
      p_meses: meses
    });

    return { data, error };
  },

  /**
   * Obtener stock con alertas usando vista
   * @param {string} estadoStock - 'CRÍTICO', 'BAJO', 'EXCESO', 'NORMAL'
   * @param {string} categoriaId - UUID de categoría (opcional)
   * @returns {Promise<{data, error}>}
   */
  async getStockConAlertas(estadoStock = null, categoriaId = null) {
    let query = supabase
      .from('vista_stock_alertas')
      .select('*')
      .order('estado_stock');

    if (estadoStock) {
      query = query.eq('estado_stock', estadoStock);
    }

    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Obtener stock por categoría
   * @param {string} categoriaId - UUID de categoría
   * @returns {Promise<{data, error}>}
   */
  async getStockPorCategoria(categoriaId) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('parent_id', categoriaId)
      .eq('nivel_actual', 5)
      .eq('activo', true)
      .order('nombre');

    return { data, error };
  },

  /**
   * Actualizar stock batch (múltiples items)
   * @param {Array} operaciones - Array de {stock_id, cantidad, operacion}
   * @returns {Promise<{data, error, results}>}
   */
  async actualizarStockBatch(operaciones) {
    const results = [];
    const errors = [];

    for (const op of operaciones) {
      const { data, error } = await this.actualizarStock(
        op.stock_id,
        op.cantidad,
        op.operacion || 'incrementar'
      );

      if (error) {
        errors.push({ stock_id: op.stock_id, error });
      } else {
        results.push(data);
      }
    }

    return {
      data: results,
      error: errors.length > 0 ? errors : null,
      total: operaciones.length,
      exitosos: results.length,
      fallidos: errors.length
    };
  },

  // ========================================
  // PRESENTACIONES (Nivel 6)
  // ========================================

  /**
   * Obtener presentaciones de un stock usando vista
   * @param {string} stockId - UUID del stock (nivel 5)
   * @returns {Promise<{data, error}>}
   */
  async getPresentaciones(stockId) {
    const { data, error } = await supabase
      .from('vista_presentaciones')
      .select('*')
      .eq('stock_id', stockId)
      .order('presentacion');

    return { data, error };
  },

  /**
   * Obtener presentación por código de barras
   * @param {string} codigoBarra - Código de barras
   * @returns {Promise<{data, error}>}
   */
  async getPresentacionPorCodigoBarra(codigoBarra) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('codigo_barra', codigoBarra)
      .eq('nivel_actual', 6)
      .eq('activo', true)
      .single();

    return { data, error };
  },

  /**
   * Crear presentación
   * @param {Object} datos - Datos de la presentación
   * @returns {Promise<{data, error}>}
   */
  async crearPresentacion(datos) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .insert({
        ...datos,
        nivel_actual: 6,
        activo: true
      })
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar presentación
   * @param {string} id - UUID de la presentación
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<{data, error}>}
   */
  async actualizarPresentacion(id, datos) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .update({
        ...datos,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('nivel_actual', 6)
      .select()
      .single();

    return { data, error };
  },

  // ========================================
  // REPORTES Y ESTADÍSTICAS
  // ========================================

  /**
   * Obtener resumen de stock por categoría
   * @param {string} categoriaId - UUID de categoría (null = todas)
   * @returns {Promise<{data, error}>}
   */
  async getResumenStock(categoriaId = null) {
    let query = supabase
      .from('vista_stock_alertas')
      .select('*');

    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Calcular estadísticas
    const resumen = {
      total_items: data.length,
      stock_critico: data.filter(item => item.estado_stock === 'CRÍTICO').length,
      stock_bajo: data.filter(item => item.estado_stock === 'BAJO').length,
      stock_exceso: data.filter(item => item.estado_stock === 'EXCESO').length,
      stock_normal: data.filter(item => item.estado_stock === 'NORMAL').length,
      valor_inventario_total: data.reduce((sum, item) => sum + (item.valor_inventario || 0), 0)
    };

    return { data: resumen, error: null };
  },

  /**
   * Obtener items que necesitan reabastecimiento
   * @param {number} limite - Cantidad máxima de items
   * @returns {Promise<{data, error}>}
   */
  async getItemsParaReabastecer(limite = 50) {
    const { data, error } = await supabase
      .from('vista_stock_alertas')
      .select('*')
      .in('estado_stock', ['CRÍTICO', 'BAJO'])
      .order('cantidad_reabastecer', { ascending: false })
      .limit(limite);

    return { data, error };
  },

  /**
   * Calcular valor total de inventario
   * @param {string} categoriaId - UUID de categoría (opcional)
   * @returns {Promise<{data, error}>}
   */
  async getValorInventario(categoriaId = null) {
    let query = supabase
      .from('vista_stock_alertas')
      .select('valor_inventario, stock_actual, costo_promedio');

    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    const valorTotal = data.reduce((sum, item) => sum + (item.valor_inventario || 0), 0);
    const cantidadTotal = data.reduce((sum, item) => sum + (item.stock_actual || 0), 0);

    return {
      data: {
        valor_total: parseFloat(valorTotal.toFixed(2)),
        cantidad_total: parseFloat(cantidadTotal.toFixed(2)),
        items_count: data.length,
        valor_promedio_por_item: data.length > 0 ? parseFloat((valorTotal / data.length).toFixed(2)) : 0
      },
      error: null
    };
  },

  // ========================================
  // VALIDACIONES
  // ========================================

  /**
   * Validar datos de stock (nivel 5)
   * @param {Object} datos - Datos a validar
   * @returns {Object} {valido: boolean, errores: string[]}
   */
  validarStock(datos) {
    const errores = [];

    if (!datos.codigo || datos.codigo.trim() === '') {
      errores.push('El código es requerido');
    }

    if (!datos.nombre || datos.nombre.trim() === '') {
      errores.push('El nombre es requerido');
    }

    if (!datos.unidad_medida) {
      errores.push('La unidad de medida es requerida');
    }

    if (datos.stock_minimo !== undefined && datos.stock_minimo < 0) {
      errores.push('El stock mínimo no puede ser negativo');
    }

    if (datos.stock_maximo !== undefined && datos.stock_maximo < 0) {
      errores.push('El stock máximo no puede ser negativo');
    }

    if (
      datos.stock_minimo !== undefined &&
      datos.stock_maximo !== undefined &&
      datos.stock_maximo < datos.stock_minimo
    ) {
      errores.push('El stock máximo debe ser mayor o igual al stock mínimo');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  },

  /**
   * Validar datos de presentación (nivel 6)
   * @param {Object} datos - Datos a validar
   * @returns {Object} {valido: boolean, errores: string[]}
   */
  validarPresentacion(datos) {
    const errores = [];

    if (!datos.codigo || datos.codigo.trim() === '') {
      errores.push('El código es requerido');
    }

    if (!datos.nombre || datos.nombre.trim() === '') {
      errores.push('El nombre es requerido');
    }

    if (!datos.presentacion) {
      errores.push('La descripción de la presentación es requerida');
    }

    if (!datos.cantidad_por_unidad || datos.cantidad_por_unidad <= 0) {
      errores.push('La cantidad por unidad debe ser mayor a 0');
    }

    if (datos.precio_unitario !== undefined && datos.precio_unitario < 0) {
      errores.push('El precio unitario no puede ser negativo');
    }

    if (!datos.parent_id) {
      errores.push('Debe estar vinculada a un stock (parent_id requerido)');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
};
