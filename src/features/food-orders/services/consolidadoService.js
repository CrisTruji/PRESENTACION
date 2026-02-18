// ========================================
// CONSOLIDADO SERVICE
// Consolidacion de pedidos + vistas + stock
// ========================================

import { supabase } from '@/shared/api';

export const consolidadoService = {

  // ========================================
  // CONSOLIDAR
  // ========================================

  async consolidar(fecha, servicio) {
    const { data, error } = await supabase
      .rpc('consolidar_pedidos_servicio', {
        p_fecha: fecha,
        p_servicio: servicio,
      });

    return { data, error };
  },

  // ========================================
  // LECTURA
  // ========================================

  async getConsolidadoPorFecha(fecha, servicio) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .select(`
        *,
        consolidado_items (
          *,
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento),
          componentes_plato (codigo, nombre)
        )
      `)
      .eq('fecha', fecha)
      .eq('servicio', servicio)
      .maybeSingle();

    return { data, error };
  },

  async getConsolidado(consolidadoId) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .select(`
        *,
        consolidado_items (
          *,
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento),
          componentes_plato (codigo, nombre)
        )
      `)
      .eq('id', consolidadoId)
      .single();

    return { data, error };
  },

  // ========================================
  // VISTAS
  // ========================================

  async getVistaRecetas(consolidadoId) {
    const { data, error } = await supabase
      .from('consolidado_items')
      .select(`
        *,
        arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento),
        componentes_plato (codigo, nombre)
      `)
      .eq('consolidado_id', consolidadoId)
      .order('componentes_plato(orden)');

    return { data, error };
  },

  async getIngredientesTotales(consolidadoId) {
    // Obtener items del consolidado
    const { data: items, error: itemsError } = await supabase
      .from('consolidado_items')
      .select('receta_id, cantidad_total')
      .eq('consolidado_id', consolidadoId);

    if (itemsError) return { data: null, error: itemsError };

    // Para cada receta, obtener ingredientes y calcular totales
    const ingredientesMap = {};

    for (const item of items) {
      const { data: ingredientes } = await supabase
        .from('receta_ingredientes')
        .select('*, arbol_materia_prima(id, codigo, nombre, unidad_medida, stock_actual, stock_minimo)')
        .eq('receta_id', item.receta_id)
        .eq('activo', true);

      if (!ingredientes) continue;

      const { data: receta } = await supabase
        .from('arbol_recetas')
        .select('rendimiento')
        .eq('id', item.receta_id)
        .single();

      const rendimiento = receta?.rendimiento || 1;
      const factor = item.cantidad_total / rendimiento;

      ingredientes.forEach(ing => {
        const mpId = ing.materia_prima_id;
        if (!ingredientesMap[mpId]) {
          ingredientesMap[mpId] = {
            materia_prima_id: mpId,
            nombre: ing.arbol_materia_prima?.nombre || 'Desconocido',
            codigo: ing.arbol_materia_prima?.codigo || '',
            unidad_medida: ing.arbol_materia_prima?.unidad_medida || ing.unidad_medida,
            stock_actual: ing.arbol_materia_prima?.stock_actual || 0,
            stock_minimo: ing.arbol_materia_prima?.stock_minimo || 0,
            total_requerido: 0,
          };
        }
        ingredientesMap[mpId].total_requerido += ing.cantidad_requerida * factor;
      });
    }

    // Calcular estado de stock
    const resultado = Object.values(ingredientesMap).map(ing => ({
      ...ing,
      total_requerido: Math.round(ing.total_requerido * 100) / 100,
      diferencia: Math.round((ing.stock_actual - ing.total_requerido) * 100) / 100,
      estado_stock: ing.stock_actual >= ing.total_requerido ? 'SUFICIENTE' : 'INSUFICIENTE',
    }));

    resultado.sort((a, b) => {
      if (a.estado_stock === 'INSUFICIENTE' && b.estado_stock !== 'INSUFICIENTE') return -1;
      if (a.estado_stock !== 'INSUFICIENTE' && b.estado_stock === 'INSUFICIENTE') return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    return { data: resultado, error: null };
  },

  // ========================================
  // ACCIONES DEL SUPERVISOR
  // ========================================

  async sustituirReceta(consolidadoId, recetaOriginalId, recetaNuevaId, motivo, supervisorId) {
    // Registrar cambio
    const { error: cambioError } = await supabase
      .from('cambios_menu_supervisor')
      .insert({
        consolidado_id: consolidadoId,
        receta_original_id: recetaOriginalId,
        receta_nueva_id: recetaNuevaId,
        motivo,
        supervisor_id: supervisorId,
      });

    if (cambioError) return { data: null, error: cambioError };

    // Actualizar item del consolidado
    const { data, error } = await supabase
      .from('consolidado_items')
      .update({ receta_id: recetaNuevaId })
      .eq('consolidado_id', consolidadoId)
      .eq('receta_id', recetaOriginalId)
      .select();

    return { data, error };
  },

  async aprobarConsolidado(consolidadoId, supervisorId) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .update({
        estado: 'aprobado',
        supervisor_id: supervisorId,
        fecha_aprobacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consolidadoId)
      .select()
      .single();

    return { data, error };
  },

  async marcarPreparado(consolidadoId) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .update({
        estado: 'completado',
        fecha_preparacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consolidadoId)
      .select()
      .single();

    // TODO: Descontar stock automaticamente via RPC
    return { data, error };
  },

  // ========================================
  // CAMBIOS REALIZADOS
  // ========================================

  async getCambiosRealizados(consolidadoId) {
    const { data, error } = await supabase
      .from('cambios_menu_supervisor')
      .select(`
        *,
        arbol_recetas!cambios_menu_supervisor_receta_original_id_fkey (nombre),
        arbol_recetas!cambios_menu_supervisor_receta_nueva_id_fkey (nombre)
      `)
      .eq('consolidado_id', consolidadoId)
      .order('created_at', { ascending: false });

    return { data, error };
  },
};
