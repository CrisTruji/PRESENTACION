// src/services/costosRecetasService.js
import { supabase } from '../lib/supabase';

/**
 * Servicio para calcular costos de recetas basándose en el árbol de materia prima
 */
export const costosRecetasService = {

  /**
   * Calcular costo de una receta usando el RPC de Supabase
   * @param {number} recetaId - ID de la receta
   * @returns {Promise<{data, error}>}
   */
  async calcularCostoReceta(recetaId) {
    const { data, error } = await supabase.rpc('calcular_costo_receta', {
      p_receta_id: recetaId
    });

    return { data, error };
  },

  /**
   * Obtener desglose de costos de ingredientes de una receta
   * @param {number} recetaId - ID de la receta
   * @returns {Promise<{data, error}>}
   */
  async getDesgloseCostosReceta(recetaId) {
    // Obtener ingredientes de la receta con costos del producto
    const { data: ingredientes, error } = await supabase
      .from('receta_ingredientes')
      .select(`
        id,
        cantidad,
        unidad,
        producto:producto_id (
          id,
          codigo,
          nombre,
          costo_promedio,
          unidad_stock
        )
      `)
      .eq('receta_id', recetaId);

    if (error) return { data: null, error };

    // Calcular costo por ingrediente
    const desglose = (ingredientes || []).map(ing => {
      const costoUnitario = ing.producto?.costo_promedio || 0;
      const costoTotal = ing.cantidad * costoUnitario;

      return {
        ingrediente_id: ing.id,
        producto_id: ing.producto?.id,
        producto_codigo: ing.producto?.codigo,
        producto_nombre: ing.producto?.nombre,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        unidad_stock: ing.producto?.unidad_stock,
        costo_unitario: costoUnitario,
        costo_total: costoTotal
      };
    });

    // Calcular totales
    const costoTotalReceta = desglose.reduce((sum, item) => sum + item.costo_total, 0);
    const ingredientesConCosto = desglose.filter(item => item.costo_unitario > 0).length;
    const ingredientesSinCosto = desglose.filter(item => item.costo_unitario === 0).length;

    return {
      data: {
        desglose,
        resumen: {
          costo_total: costoTotalReceta,
          total_ingredientes: desglose.length,
          ingredientes_con_costo: ingredientesConCosto,
          ingredientes_sin_costo: ingredientesSinCosto,
          porcentaje_costeado: desglose.length > 0
            ? ((ingredientesConCosto / desglose.length) * 100).toFixed(1)
            : 0
        }
      },
      error: null
    };
  },

  /**
   * Obtener costos de múltiples recetas
   * @param {number[]} recetaIds - Array de IDs de recetas
   * @returns {Promise<{data, error}>}
   */
  async getCostosMultiplesRecetas(recetaIds) {
    const resultados = await Promise.all(
      recetaIds.map(async (id) => {
        const { data, error } = await this.calcularCostoReceta(id);
        return {
          receta_id: id,
          costo: data,
          error: error?.message || null
        };
      })
    );

    return {
      data: resultados,
      error: null
    };
  },

  /**
   * Obtener recetas con sus costos ordenadas por costo
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<{data, error}>}
   */
  async getRecetasConCostos(filtros = {}) {
    // Obtener todas las recetas activas
    let query = supabase
      .from('recetas')
      .select(`
        id,
        codigo,
        nombre,
        descripcion,
        porciones,
        tiempo_preparacion,
        tipo_receta,
        activo
      `)
      .eq('activo', true);

    if (filtros.tipo_receta) {
      query = query.eq('tipo_receta', filtros.tipo_receta);
    }

    if (filtros.busqueda) {
      query = query.or(`nombre.ilike.%${filtros.busqueda}%,codigo.ilike.%${filtros.busqueda}%`);
    }

    const { data: recetas, error } = await query.order('nombre');

    if (error) return { data: null, error };

    // Calcular costo para cada receta
    const recetasConCostos = await Promise.all(
      (recetas || []).map(async (receta) => {
        const { data: costoData } = await this.calcularCostoReceta(receta.id);
        return {
          ...receta,
          costo_total: costoData || 0,
          costo_por_porcion: receta.porciones > 0
            ? (costoData || 0) / receta.porciones
            : 0
        };
      })
    );

    // Ordenar por costo si se especifica
    if (filtros.ordenar_por_costo) {
      recetasConCostos.sort((a, b) => {
        return filtros.orden_descendente
          ? b.costo_total - a.costo_total
          : a.costo_total - b.costo_total;
      });
    }

    return { data: recetasConCostos, error: null };
  },

  /**
   * Obtener historial de costos de una receta (basado en historial de precios de ingredientes)
   * @param {number} recetaId - ID de la receta
   * @param {number} meses - Meses hacia atrás (default: 3)
   * @returns {Promise<{data, error}>}
   */
  async getHistorialCostosReceta(recetaId, meses = 3) {
    // Obtener ingredientes de la receta
    const { data: ingredientes, error: errorIng } = await supabase
      .from('receta_ingredientes')
      .select('producto_id, cantidad')
      .eq('receta_id', recetaId);

    if (errorIng) return { data: null, error: errorIng };

    const productosIds = (ingredientes || []).map(i => i.producto_id);

    if (productosIds.length === 0) {
      return { data: [], error: null };
    }

    // Obtener historial de precios de los productos
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - meses);

    const { data: historial, error: errorHist } = await supabase
      .from('historial_precios')
      .select('producto_id, precio_unitario, created_at')
      .in('producto_id', productosIds)
      .gte('created_at', fechaDesde.toISOString())
      .order('created_at', { ascending: true });

    if (errorHist) return { data: null, error: errorHist };

    return { data: historial, error: null };
  },

  /**
   * Comparar costos de recetas
   * @param {number[]} recetaIds - Array de IDs de recetas a comparar
   * @returns {Promise<{data, error}>}
   */
  async compararCostosRecetas(recetaIds) {
    const comparaciones = await Promise.all(
      recetaIds.map(async (id) => {
        const { data: receta } = await supabase
          .from('recetas')
          .select('id, codigo, nombre, porciones')
          .eq('id', id)
          .single();

        const { data: desglose } = await this.getDesgloseCostosReceta(id);

        return {
          receta,
          desglose: desglose?.desglose || [],
          resumen: desglose?.resumen || null
        };
      })
    );

    return { data: comparaciones, error: null };
  },

  /**
   * Obtener ingredientes más costosos de una receta
   * @param {number} recetaId - ID de la receta
   * @param {number} limite - Cantidad de ingredientes a retornar
   * @returns {Promise<{data, error}>}
   */
  async getIngredientesMasCostosos(recetaId, limite = 5) {
    const { data: desglose } = await this.getDesgloseCostosReceta(recetaId);

    if (!desglose) return { data: [], error: null };

    const ordenados = [...desglose.desglose]
      .sort((a, b) => b.costo_total - a.costo_total)
      .slice(0, limite);

    return { data: ordenados, error: null };
  },

  /**
   * Calcular impacto de cambio de precio en una receta
   * @param {number} recetaId - ID de la receta
   * @param {number} productoId - ID del producto que cambió de precio
   * @param {number} nuevoPrecio - Nuevo precio del producto
   * @returns {Promise<{data, error}>}
   */
  async calcularImpactoCambioPrecio(recetaId, productoId, nuevoPrecio) {
    const { data: desglose } = await this.getDesgloseCostosReceta(recetaId);

    if (!desglose) return { data: null, error: { message: 'No se pudo obtener desglose' } };

    const ingrediente = desglose.desglose.find(i => i.producto_id === productoId);

    if (!ingrediente) {
      return {
        data: null,
        error: { message: 'El producto no es ingrediente de esta receta' }
      };
    }

    const costoAnterior = ingrediente.costo_total;
    const costoNuevo = ingrediente.cantidad * nuevoPrecio;
    const diferencia = costoNuevo - costoAnterior;
    const porcentajeCambio = costoAnterior > 0
      ? ((diferencia / costoAnterior) * 100).toFixed(2)
      : 0;

    const costoRecetaAnterior = desglose.resumen.costo_total;
    const costoRecetaNuevo = costoRecetaAnterior + diferencia;

    return {
      data: {
        ingrediente: ingrediente.producto_nombre,
        costo_anterior: costoAnterior,
        costo_nuevo: costoNuevo,
        diferencia,
        porcentaje_cambio: parseFloat(porcentajeCambio),
        costo_receta_anterior: costoRecetaAnterior,
        costo_receta_nuevo: costoRecetaNuevo,
        impacto_en_receta: ((diferencia / costoRecetaAnterior) * 100).toFixed(2)
      },
      error: null
    };
  }
};
