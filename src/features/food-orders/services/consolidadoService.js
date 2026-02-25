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
        arbol_recetas (
          id, codigo, nombre, costo_porcion, rendimiento,
          receta_ingredientes (
            id, cantidad_requerida, unidad_medida,
            arbol_materia_prima (id, nombre, codigo, costo_promedio, unidad_stock)
          )
        ),
        componentes_plato (codigo, nombre, orden),
        menu_componentes (
          id,
          gramajes_componente_menu (
            gramaje, unidad_medida, excluir,
            tipos_dieta (id, codigo, nombre)
          )
        )
      `)
      .eq('consolidado_id', consolidadoId)
      .order('created_at', { ascending: true });

    // Sort in JS by componente orden
    if (data) {
      data.sort((a, b) => {
        const oa = a.componentes_plato?.orden ?? 99;
        const ob = b.componentes_plato?.orden ?? 99;
        return oa - ob;
      });
    }

    return { data, error };
  },

  async getIngredientesTotales(consolidadoId) {
    // Try the server-side RPC first (fix_sprint_c.sql must be applied)
    const { data, error } = await supabase
      .rpc('get_ingredientes_totales', { p_consolidado_id: consolidadoId });

    // If RPC exists and succeeded, return its result
    if (!error) return { data, error };

    // Fallback: if RPC doesn't exist (PGRST202 / 404) or fails,
    // calculate ingredients in JS from consolidado_items + receta_ingredientes
    console.warn('get_ingredientes_totales RPC not found, using JS fallback. Apply fix_sprint_c.sql.');

    const { data: items, error: itemsError } = await supabase
      .from('consolidado_items')
      .select('receta_id, cantidad_total, arbol_recetas(rendimiento)')
      .eq('consolidado_id', consolidadoId);

    if (itemsError || !items || items.length === 0) {
      return { data: [], error: itemsError };
    }

    // Collect all unique receta_ids
    const recetaIds = [...new Set(items.map(i => i.receta_id))];

    const { data: ingredientes, error: ingError } = await supabase
      .from('receta_ingredientes')
      .select('receta_id, cantidad_requerida, unidad_medida, arbol_materia_prima(id, codigo, nombre, unidad_medida, stock_actual, stock_minimo)')
      .in('receta_id', recetaIds)
      .eq('activo', true);

    if (ingError || !ingredientes) return { data: [], error: ingError };

    // Aggregate by materia_prima
    const mpMap = {};
    for (const ing of ingredientes) {
      const mp = ing.arbol_materia_prima;
      if (!mp) continue;
      const item = items.find(i => i.receta_id === ing.receta_id);
      const rendimiento = item?.arbol_recetas?.rendimiento || 1;
      const cantidadTotal = item?.cantidad_total || 0;
      const requerido = ing.cantidad_requerida * (cantidadTotal / rendimiento);

      if (!mpMap[mp.id]) {
        mpMap[mp.id] = {
          materia_prima_id: mp.id,
          nombre: mp.nombre,
          codigo: mp.codigo,
          unidad_medida: mp.unidad_medida,
          stock_actual: mp.stock_actual || 0,
          stock_minimo: mp.stock_minimo || 0,
          total_requerido: 0,
        };
      }
      mpMap[mp.id].total_requerido += requerido;
    }

    const resultado = Object.values(mpMap).map(mp => {
      const diferencia = parseFloat((mp.stock_actual - mp.total_requerido).toFixed(2));
      return {
        ...mp,
        total_requerido: parseFloat(mp.total_requerido.toFixed(2)),
        diferencia,
        estado_stock: diferencia >= 0 ? 'SUFICIENTE' : 'INSUFICIENTE',
      };
    });

    resultado.sort((a, b) => {
      if (a.estado_stock !== b.estado_stock) return a.estado_stock === 'INSUFICIENTE' ? -1 : 1;
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
    // Descontar stock de materias primas antes de marcar como preparado
    await supabase.rpc('descontar_stock_consolidado', { p_consolidado_id: consolidadoId });

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

  // ========================================
  // BÚSQUEDA DE ALTERNATIVAS (para modal de sustitución)
  // ========================================

  async buscarRecetasAlternativas(termino = '', componenteId = null) {
    // Buscar recetas del mismo componente (nivel 3 en arbol_recetas)
    let query = supabase
      .from('arbol_recetas')
      .select(`
        id, codigo, nombre, costo_porcion, rendimiento,
        receta_ingredientes (
          cantidad_requerida, activo,
          arbol_materia_prima (
            id, nombre, stock_actual, unidad_medida
          )
        )
      `)
      .eq('activo', true)
      .in('nivel_actual', [2, 3])
      .eq('receta_ingredientes.activo', true);

    if (termino && termino.length >= 2) {
      query = query.ilike('nombre', `%${termino}%`);
    }

    if (componenteId) {
      // Filtrar por recetas asociadas a ese componente en menu_componentes
      const { data: recetasComp } = await supabase
        .from('menu_componentes')
        .select('receta_id')
        .eq('componente_id', componenteId)
        .eq('activo', true);

      const ids = (recetasComp || []).map((r) => r.receta_id).filter(Boolean);
      if (ids.length > 0) {
        query = query.in('id', ids);
      }
    }

    const { data, error } = await query.order('nombre').limit(20);

    if (error || !data) return { data: [], error };

    // Calcular viabilidad de stock para cada receta
    const resultado = data.map((receta) => {
      const ingredientes = receta.receta_ingredientes || [];
      let stockOk = true;
      const detalle = ingredientes.map((ing) => {
        const mp = ing.arbol_materia_prima;
        if (!mp) return null;
        const stockSuficiente = (mp.stock_actual || 0) >= ing.cantidad_requerida;
        if (!stockSuficiente) stockOk = false;
        return {
          nombre: mp.nombre,
          stock_actual: mp.stock_actual || 0,
          requerido: ing.cantidad_requerida,
          unidad_medida: mp.unidad_medida,
          suficiente: stockSuficiente,
        };
      }).filter(Boolean);

      return {
        id: receta.id,
        codigo: receta.codigo,
        nombre: receta.nombre,
        costo_porcion: receta.costo_porcion,
        stock_ok: stockOk,
        ingredientes: detalle,
      };
    });

    // Ordenar: primero las que tienen stock OK
    resultado.sort((a, b) => {
      if (a.stock_ok && !b.stock_ok) return -1;
      if (!a.stock_ok && b.stock_ok) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    return { data: resultado, error: null };
  },

  // ========================================
  // OPERACIONES (para selector de unidad)
  // ========================================

  async getOperaciones() {
    const { data, error } = await supabase
      .from('operaciones')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('nombre');
    return { data, error };
  },

  // ========================================
  // CICLO ACTIVO POR OPERACIÓN (para modal ciclo completo)
  // ========================================

  async getCicloActivoPorOperacion(operacionId) {
    const { data, error } = await supabase
      .from('ciclos_menu')
      .select('id, nombre, estado, fecha_inicio, dia_actual_ciclo')
      .eq('operacion_id', operacionId)
      .eq('activo', true)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error };
  },

  // ========================================
  // HORARIOS POR UNIDAD (servicios_unidad)
  // ========================================

  async getServiciosUnidad(operacionId = null) {
    let query = supabase
      .from('servicios_unidad')
      .select('*, operaciones(id, codigo, nombre)')
      .eq('activo', true)
      .order('servicio');

    if (operacionId) {
      query = query.eq('operacion_id', operacionId);
    }

    const { data, error } = await query;
    return { data, error };
  },
};
