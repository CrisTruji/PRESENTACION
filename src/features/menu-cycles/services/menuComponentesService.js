// ========================================
// MENU COMPONENTES SERVICE
// CRUD menu_componentes + gramajes
// ========================================

import { supabase } from '@/shared/api';

export const menuComponentesService = {

  // ========================================
  // COMPONENTES DE UN DIA/SERVICIO
  // ========================================

  async getComponentesDia(cicloDiaServicioId) {
    const { data, error } = await supabase
      .from('menu_componentes')
      .select(`
        *,
        componentes_plato (*),
        arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento, es_local, tipo_local)
      `)
      .eq('ciclo_dia_servicio_id', cicloDiaServicioId)
      .eq('activo', true)
      .order('orden');

    return { data, error };
  },

  async asignarComponente(cicloDiaServicioId, componenteId, recetaId, orden = 0) {
    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('menu_componentes')
      .select('id')
      .eq('ciclo_dia_servicio_id', cicloDiaServicioId)
      .eq('componente_id', componenteId)
      .eq('activo', true)
      .maybeSingle();

    if (existente) {
      // Actualizar receta del componente existente
      const { data, error } = await supabase
        .from('menu_componentes')
        .update({ receta_id: recetaId, updated_at: new Date().toISOString() })
        .eq('id', existente.id)
        .select()
        .single();
      return { data, error };
    }

    // Crear nuevo
    const { data, error } = await supabase
      .from('menu_componentes')
      .insert({
        ciclo_dia_servicio_id: cicloDiaServicioId,
        componente_id: componenteId,
        receta_id: recetaId,
        orden,
      })
      .select()
      .single();

    return { data, error };
  },

  async eliminarComponente(menuComponenteId) {
    const { data, error } = await supabase
      .from('menu_componentes')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', menuComponenteId)
      .select()
      .single();
    return { data, error };
  },

  // ========================================
  // GRAMAJES
  // ========================================

  async getGramajes(menuComponenteId) {
    const { data, error } = await supabase
      .from('gramajes_componente_menu')
      .select('*, tipos_dieta(*)')
      .eq('menu_componente_id', menuComponenteId)
      .order('tipos_dieta(orden)');

    return { data, error };
  },

  async guardarGramajes(menuComponenteId, gramajes) {
    // gramajes: [{ tipo_dieta_id, gramaje, unidad_medida, porcentaje_modificacion, excluir, observaciones }]
    const registros = gramajes.map(g => ({
      menu_componente_id: menuComponenteId,
      tipo_dieta_id: g.tipo_dieta_id,
      gramaje: g.gramaje || 0,
      unidad_medida: g.unidad_medida || 'gr',
      porcentaje_modificacion: g.porcentaje_modificacion || null,
      excluir: g.excluir || false,
      observaciones: g.observaciones || null,
    }));

    // Upsert: insertar o actualizar por (menu_componente_id, tipo_dieta_id)
    const { data, error } = await supabase
      .from('gramajes_componente_menu')
      .upsert(registros, {
        onConflict: 'menu_componente_id,tipo_dieta_id',
      })
      .select();

    return { data, error };
  },

  // ========================================
  // RECETAS LOCALES (usando arbol_recetas)
  // ========================================

  async crearRecetaLocal(recetaEstandarId, codigoUnidad, ingredientesModificados) {
    // 1. Obtener receta estandar
    const { data: recetaBase, error: recetaError } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('id', recetaEstandarId)
      .single();

    if (recetaError) return { data: null, error: recetaError };

    // 2. Crear copia como receta local
    const codigoLocal = `${recetaBase.codigo}-LOCAL-${codigoUnidad || 'MOD'}`;
    const nombreLocal = `${recetaBase.nombre} (Local)`;

    const { data: recetaLocal, error: localError } = await supabase
      .from('arbol_recetas')
      .insert({
        codigo: codigoLocal,
        nombre: nombreLocal,
        descripcion: `Variante local de ${recetaBase.nombre}`,
        plato_id: recetaBase.plato_id,
        nivel_actual: recetaBase.nivel_actual,
        parent_id: recetaEstandarId,
        codigo_unidad: codigoUnidad || null,
        rendimiento: recetaBase.rendimiento,
        tiempo_preparacion: recetaBase.tiempo_preparacion,
        instrucciones: recetaBase.instrucciones,
        es_local: true,
        tipo_local: 'MENU_LOCAL',
        activo: true,
      })
      .select()
      .single();

    if (localError) return { data: null, error: localError };

    // 3. Copiar ingredientes originales y aplicar modificaciones
    const { data: ingredientesBase } = await supabase
      .from('receta_ingredientes')
      .select('*')
      .eq('receta_id', recetaEstandarId)
      .eq('activo', true);

    if (ingredientesBase && ingredientesBase.length > 0) {
      // Mapear modificaciones por materia_prima_id
      const modsMap = {};
      if (ingredientesModificados) {
        ingredientesModificados.forEach(mod => {
          modsMap[mod.materia_prima_id] = mod;
        });
      }

      const nuevosIngredientes = ingredientesBase
        .filter(ing => {
          // Verificar si fue eliminado
          const mod = modsMap[ing.materia_prima_id];
          return !(mod && mod.eliminado);
        })
        .map(ing => {
          const mod = modsMap[ing.materia_prima_id];
          return {
            receta_id: recetaLocal.id,
            materia_prima_id: mod?.nueva_materia_prima_id || ing.materia_prima_id,
            cantidad_requerida: mod?.cantidad_requerida ?? ing.cantidad_requerida,
            unidad_medida: mod?.unidad_medida || ing.unidad_medida,
            orden: ing.orden,
            activo: true,
          };
        });

      // Agregar ingredientes nuevos
      if (ingredientesModificados) {
        ingredientesModificados
          .filter(mod => mod.es_nuevo)
          .forEach(mod => {
            nuevosIngredientes.push({
              receta_id: recetaLocal.id,
              materia_prima_id: mod.materia_prima_id,
              cantidad_requerida: mod.cantidad_requerida,
              unidad_medida: mod.unidad_medida,
              orden: 99,
              activo: true,
            });
          });
      }

      if (nuevosIngredientes.length > 0) {
        await supabase.from('receta_ingredientes').insert(nuevosIngredientes);
      }
    }

    return { data: recetaLocal, error: null };
  },

  // ========================================
  // BUSCAR RECETAS (para selector)
  // ========================================

  async buscarRecetas(termino, limite = 20) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('id, codigo, nombre, costo_porcion, rendimiento, es_local, tipo_local')
      .ilike('nombre', `%${termino}%`)
      .eq('activo', true)
      .limit(limite)
      .order('nombre');

    return { data, error };
  },

  async getRecetaConIngredientes(recetaId) {
    const { data: receta, error: recetaError } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('id', recetaId)
      .single();

    if (recetaError) return { data: null, error: recetaError };

    const { data: ingredientes, error: ingError } = await supabase
      .from('receta_ingredientes')
      .select('*, arbol_materia_prima(id, codigo, nombre, unidad_medida, stock_actual)')
      .eq('receta_id', recetaId)
      .eq('activo', true)
      .order('orden');

    if (ingError) return { data: null, error: ingError };

    return {
      data: { ...receta, ingredientes: ingredientes || [] },
      error: null,
    };
  },
};
