import { supabase } from '../lib/supabase';

/**
 * Servicio para gestionar el Árbol de Recetas
 * Estructura: 2 niveles
 * Nivel 1: Conector (enlace con plato)
 * Nivel 2: Receta estándar o local
 */
export const arbolRecetasService = {

  /**
   * Obtener todas las recetas nivel 1 (conectores)
   */
  async getConectores() {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('nivel_actual', 1)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener todas las recetas nivel 2 (recetas reales)
   */
  async getRecetasNivel2() {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('nivel_actual', 2)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener hijos de un nodo (recetas de un conector)
   */
  async getHijos(parentId) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('parent_id', parentId)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener receta por ID
   */
  async getRecetaPorId(id) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  /**
   * Obtener receta por código
   */
  async getRecetaPorCodigo(codigo) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('codigo', codigo)
      .single();

    return { data, error };
  },

  /**
   * Obtener recetas de un plato específico
   */
  async getRecetasPorPlato(platoId) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('plato_id', platoId)
      .eq('activo', true)
      .order('nivel_actual, codigo');

    return { data, error };
  },

  /**
   * Buscar recetas
   */
  async buscarRecetas(termino, filtros = {}) {
    let query = supabase
      .from('arbol_recetas')
      .select('*')
      .eq('activo', true);

    if (termino && termino.length >= 2) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    if (filtros.nivel_actual) {
      query = query.eq('nivel_actual', filtros.nivel_actual);
    }

    const { data, error } = await query.order('codigo').limit(50);
    return { data, error };
  },

  /**
   * Obtener ingredientes de una receta
   */
  async getIngredientes(recetaId) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .select(`
        *,
        materia_prima:materia_prima_id (
          id, codigo, nombre
        )
      `)
      .eq('receta_id', recetaId)
      .order('orden');

    return { data, error };
  },

  /**
   * Contar recetas por nivel
   */
  async contarPorNivel(nivel) {
    const { count, error } = await supabase
      .from('arbol_recetas')
      .select('*', { count: 'exact', head: true })
      .eq('nivel_actual', nivel)
      .eq('activo', true);

    return { data: count, error };
  },

  /**
   * Crear nueva receta
   */
  async crearReceta(datos) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .insert(datos)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar receta
   */
  async actualizarReceta(id, datos) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Eliminar receta (soft delete)
   */
  async eliminarReceta(id) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Agregar ingrediente a receta
   */
  async agregarIngrediente(datos) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .insert(datos)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar ingrediente
   */
  async actualizarIngrediente(id, datos) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Eliminar ingrediente
   */
  async eliminarIngrediente(id) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  /**
   * Duplicar receta como variante
   */
  async duplicarReceta(recetaId, nuevoNombre) {
    // Obtener receta original
    const { data: original, error: errOriginal } = await this.getRecetaPorId(recetaId);
    if (errOriginal) return { data: null, error: errOriginal };

    // Generar código único
    const timestamp = Date.now().toString().slice(-4);
    const nuevoCodigo = `${original.codigo}.V${timestamp}`;

    // Crear nueva receta
    const nuevaReceta = {
      codigo: nuevoCodigo,
      nombre: nuevoNombre,
      descripcion: `Variante de: ${original.nombre}`,
      plato_id: original.plato_id,
      nivel_actual: original.nivel_actual,
      parent_id: original.parent_id,
      rendimiento: original.rendimiento,
      version: 1,
      activo: true
    };

    const { data: recetaCreada, error: errCrear } = await this.crearReceta(nuevaReceta);
    if (errCrear) return { data: null, error: errCrear };

    // Duplicar ingredientes
    const { data: ingredientes } = await this.getIngredientes(recetaId);
    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await this.agregarIngrediente({
          receta_id: recetaCreada.id,
          materia_prima_id: ing.materia_prima_id,
          cantidad_requerida: ing.cantidad_requerida,
          unidad_medida: ing.unidad_medida,
          orden: ing.orden
        });
      }
    }

    return { data: recetaCreada, error: null };
  }
};
