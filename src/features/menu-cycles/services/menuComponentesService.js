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

    let result;
    if (existente) {
      // Actualizar receta del componente existente
      const { data, error } = await supabase
        .from('menu_componentes')
        .update({ receta_id: recetaId, updated_at: new Date().toISOString() })
        .eq('id', existente.id)
        .select()
        .single();
      result = { data, error };
    } else {
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
      result = { data, error };
    }

    // Al tener al menos 1 componente activo → marcar el servicio como completo
    if (!result.error) {
      await supabase
        .from('ciclo_dia_servicios')
        .update({ completo: true })
        .eq('id', cicloDiaServicioId);
    }

    return result;
  },

  async actualizarReceta(menuComponenteId, recetaId) {
    const { data, error } = await supabase
      .from('menu_componentes')
      .update({ receta_id: recetaId, updated_at: new Date().toISOString() })
      .eq('id', menuComponenteId)
      .select()
      .single();
    return { data, error };
  },

  async eliminarComponente(menuComponenteId) {
    // Primero obtener el ciclo_dia_servicio_id antes de desactivar
    const { data: comp } = await supabase
      .from('menu_componentes')
      .select('ciclo_dia_servicio_id')
      .eq('id', menuComponenteId)
      .single();

    const { data, error } = await supabase
      .from('menu_componentes')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', menuComponenteId)
      .select()
      .single();

    // Si se eliminó correctamente, revisar si quedan componentes activos
    if (!error && comp?.ciclo_dia_servicio_id) {
      const { data: restantes } = await supabase
        .from('menu_componentes')
        .select('id')
        .eq('ciclo_dia_servicio_id', comp.ciclo_dia_servicio_id)
        .eq('activo', true);

      // Si no quedan componentes → marcar servicio como incompleto
      if (!restantes || restantes.length === 0) {
        await supabase
          .from('ciclo_dia_servicios')
          .update({ completo: false })
          .eq('id', comp.ciclo_dia_servicio_id);
      }
    }

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

    // 2. Verificar si ya existe una receta local para esta unidad + base
    //    (restricción: una receta local por unidad por plato estándar)
    const existenteQuery = supabase
      .from('arbol_recetas')
      .select('id, codigo, nombre')
      .eq('parent_id', recetaEstandarId)
      .eq('es_local', true)
      .eq('activo', true);

    if (codigoUnidad) {
      existenteQuery.eq('codigo_unidad', codigoUnidad);
    } else {
      existenteQuery.is('codigo_unidad', null);
    }

    const { data: recetaLocalExistente } = await existenteQuery.maybeSingle();

    let recetaLocal;

    if (recetaLocalExistente) {
      // Ya existe → actualizar en vez de crear otra
      // Desactivar ingredientes anteriores de esta receta local
      await supabase
        .from('receta_ingredientes')
        .update({ activo: false })
        .eq('receta_id', recetaLocalExistente.id);

      // Actualizar updated_at de la receta local
      const { data: actualizada, error: updError } = await supabase
        .from('arbol_recetas')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', recetaLocalExistente.id)
        .select()
        .single();

      if (updError) return { data: null, error: updError };
      recetaLocal = actualizada;
    } else {
      // No existe → crear nueva receta local
      const codigoLocal = `${recetaBase.codigo}-LOCAL-${codigoUnidad || 'MOD'}`;
      const nombreLocal = `${recetaBase.nombre} (Local - ${codigoUnidad || 'MOD'})`;

      const { data: nueva, error: localError } = await supabase
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
      recetaLocal = nueva;
    }

    // 3. Construir lista de ingredientes a insertar
    //    = todos los de la receta base + modificaciones/nuevos del modal
    const { data: ingredientesBase } = await supabase
      .from('receta_ingredientes')
      .select('*')
      .eq('receta_id', recetaEstandarId)
      .eq('activo', true);

    // Mapear modificaciones por materia_prima_id
    const modsMap = {};
    if (ingredientesModificados) {
      ingredientesModificados.forEach(mod => {
        modsMap[mod.materia_prima_id] = mod;
      });
    }

    const nuevosIngredientes = (ingredientesBase || [])
      .filter(ing => {
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

    // Agregar ingredientes completamente nuevos (marcados es_nuevo=true)
    if (ingredientesModificados) {
      ingredientesModificados
        .filter(mod => mod.es_nuevo)
        .forEach(mod => {
          nuevosIngredientes.push({
            receta_id: recetaLocal.id,
            materia_prima_id: mod.materia_prima_id,
            cantidad_requerida: mod.cantidad_requerida,
            unidad_medida: mod.unidad_medida || 'gr',
            orden: 99,
            activo: true,
          });
        });
    }

    if (nuevosIngredientes.length > 0) {
      await supabase.from('receta_ingredientes').insert(nuevosIngredientes);
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
      .or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`)
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

  // ========================================
  // GRAMAJES BASE DE COMPONENTES
  // ========================================

  async getGramajeBASEComponente(operacionId, componenteId) {
    // Primero buscar gramaje específico de la operación
    const { data: especifico } = await supabase
      .from('gramajes_componentes_base')
      .select('*')
      .eq('operacion_id', operacionId)
      .eq('componente_id', componenteId)
      .eq('activo', true)
      .single();

    if (especifico) return { data: especifico, error: null };

    // Si no hay específico de operación, buscar valor global (operacion_id = null)
    const { data: global, error } = await supabase
      .from('gramajes_componentes_base')
      .select('*')
      .is('operacion_id', null)
      .eq('componente_id', componenteId)
      .eq('activo', true)
      .single();

    return { data: global, error };
  },

  async getGramajeBASEComponentes(operacionId) {
    // Obtener todos los gramajes base para una operación (específicos o globales)
    const { data: especificos } = await supabase
      .from('gramajes_componentes_base')
      .select('*')
      .eq('operacion_id', operacionId)
      .eq('activo', true);

    const { data: globales, error } = await supabase
      .from('gramajes_componentes_base')
      .select('*')
      .is('operacion_id', null)
      .eq('activo', true);

    if (error) return { data: null, error };

    // Combinar: especificos prevalecen sobre globales
    const especificosMap = new Map((especificos || []).map(g => [g.componente_id, g]));
    const globalesMap = new Map((globales || []).map(g => [g.componente_id, g]));

    // Merge: especificos overwrite globales
    const resultado = Array.from(globalesMap.values());
    especificosMap.forEach((v) => {
      const idx = resultado.findIndex(r => r.componente_id === v.componente_id);
      if (idx >= 0) resultado[idx] = v;
      else resultado.push(v);
    });

    return { data: resultado, error: null };
  },

  async guardarGramajeBASEComponentes(operacionId, gramajes) {
    // gramajes: [{ componente_id, gramaje, unidad_medida, descripcion }]
    const registros = gramajes.map(g => ({
      operacion_id: operacionId,
      componente_id: g.componente_id,
      gramaje: g.gramaje,
      unidad_medida: g.unidad_medida || 'gr',
      descripcion: g.descripcion || null,
      activo: true,
    }));

    // Upsert by (operacion_id, componente_id)
    const { data, error } = await supabase
      .from('gramajes_componentes_base')
      .upsert(registros, {
        onConflict: 'operacion_id,componente_id',
      })
      .select();

    return { data, error };
  },
};
