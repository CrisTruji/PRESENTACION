import { supabase } from '../lib/supabase';

/**
 * Servicio para gestionar el Árbol de Platos
 * Estructura: 5 niveles jerárquicos
 * Nivel 1: Raíz (PLATOS)
 * Nivel 2: Categorías (PROTEÍNAS, ACOMPAÑAMIENTOS, etc.)
 * Nivel 3: Subcategorías (CARNE DE RES, POLLO, etc.)
 * Nivel 4: Grupos (Albondigas, Bisteck, etc.)
 * Nivel 5: Variantes (Albondigas en salsa napolitana, etc.)
 */
export const arbolPlatosService = {

  /**
   * Obtener raíz del árbol (nivel 1)
   */
  async getRaiz() {
    const { data, error } = await supabase
      .from('arbol_platos')
      .select('*')
      .eq('nivel_actual', 1)
      .eq('activo', true)
      .single();

    return { data, error };
  },

  /**
   * Obtener hijos de un nodo
   */
  async getHijos(parentId) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .select('*')
      .eq('parent_id', parentId)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener categorías nivel 2 (primer nivel visible)
   */
  async getCategoriasNivel2() {
    const { data, error } = await supabase
      .from('arbol_platos')
      .select('*')
      .eq('nivel_actual', 2)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener nodo por ID
   */
  async getNodoPorId(id) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  /**
   * Obtener nodo por código
   */
  async getNodoPorCodigo(codigo) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .select('*')
      .eq('codigo', codigo)
      .single();

    return { data, error };
  },

  /**
   * Buscar platos
   */
  async buscarPlatos(termino, filtros = {}) {
    let query = supabase
      .from('arbol_platos')
      .select('*')
      .eq('activo', true);

    if (termino && termino.length >= 2) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    if (filtros.nivel_actual) {
      query = query.eq('nivel_actual', filtros.nivel_actual);
    }

    if (filtros.solo_hojas) {
      query = query.eq('es_hoja', true);
    }

    const { data, error } = await query.order('codigo').limit(50);
    return { data, error };
  },

  /**
   * Contar platos por nivel
   */
  async contarPorNivel(nivel) {
    const { count, error } = await supabase
      .from('arbol_platos')
      .select('*', { count: 'exact', head: true })
      .eq('nivel_actual', nivel)
      .eq('activo', true);

    return { data: count, error };
  },

  /**
   * Contar platos hoja (finales)
   */
  async contarPlatosFinales() {
    const { count, error } = await supabase
      .from('arbol_platos')
      .select('*', { count: 'exact', head: true })
      .eq('es_hoja', true)
      .eq('activo', true);

    return { data: count, error };
  },

  /**
   * Crear nuevo nodo
   */
  async crearNodo(datos) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .insert(datos)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar nodo
   */
  async actualizarNodo(id, datos) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Eliminar nodo (soft delete)
   */
  async eliminarNodo(id) {
    const { data, error } = await supabase
      .from('arbol_platos')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Generar siguiente código para un padre
   */
  async generarSiguienteCodigo(parentId, nivelActual) {
    // Obtener hijos existentes
    const { data: hijos } = await this.getHijos(parentId);
    const { data: padre } = await this.getNodoPorId(parentId);

    if (!padre) return null;

    // Encontrar el siguiente número
    let maxNum = 0;
    if (hijos && hijos.length > 0) {
      hijos.forEach(hijo => {
        const partes = hijo.codigo.split('.');
        const ultimaParte = partes[partes.length - 1];
        const num = parseInt(ultimaParte, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
    }

    const siguienteNum = (maxNum + 1).toString().padStart(nivelActual === 5 ? 2 : 2, '0');
    return `${padre.codigo}.${siguienteNum}`;
  },

  /**
   * Obtener recetas asociadas a un plato
   */
  async getRecetasDelPlato(platoId) {
    const { data, error } = await supabase
      .from('arbol_recetas')
      .select('*')
      .eq('plato_id', platoId)
      .eq('activo', true)
      .order('nivel_actual, codigo');

    return { data, error };
  }
};
