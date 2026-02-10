// src/services/BaseArbolService.js
// Servicio base para operaciones CRUD en tablas de árbol
// Elimina 240+ líneas de código duplicado

import { supabase } from '@/shared/api';

/**
 * Clase base para servicios de árboles jerárquicos
 * Proporciona operaciones CRUD comunes para todas las tablas de árbol
 *
 * Uso:
 *   class ArbolRecetasService extends BaseArbolService {
 *     constructor() {
 *       super('arbol_recetas');
 *     }
 *   }
 */
export class BaseArbolService {
  /**
   * @param {string} tableName - Nombre de la tabla en Supabase
   */
  constructor(tableName) {
    if (!tableName) {
      throw new Error('BaseArbolService requiere nombre de tabla');
    }
    this.tableName = tableName;
  }

  // ========================================
  // OPERACIONES DE LECTURA
  // ========================================

  /**
   * Obtener todos los hijos de un nodo (lazy loading)
   * Usado constantemente en UI para expandir nodos
   */
  async getHijos(parentId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('parent_id', parentId)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  }

  /**
   * Obtener nodo por ID
   */
  async getPorId(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Obtener nodo por código
   */
  async getPorCodigo(codigo) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('codigo', codigo)
      .single();

    return { data, error };
  }

  /**
   * Buscar nodos por término
   * @param {string} termino - Texto a buscar en nombre/código
   * @param {Object} filtros - Filtros adicionales (nivel_actual, tipo_rama, etc.)
   * @param {number} limite - Máximo de resultados (default: 50)
   */
  async buscar(termino, filtros = {}, limite = 50) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('activo', true);

    // Búsqueda ILIKE (case-insensitive) en nombre y código
    if (termino && termino.length >= 2) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    // Aplicar filtros adicionales
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.order('codigo').limit(limite);
    return { data, error };
  }

  /**
   * Contar registros por nivel
   */
  async contarPorNivel(nivel) {
    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('nivel_actual', nivel)
      .eq('activo', true);

    return { data: count, error };
  }

  // ========================================
  // OPERACIONES DE ESCRITURA
  // ========================================

  /**
   * Crear nuevo nodo
   * @param {Object} datos - Datos del nodo a crear
   */
  async crear(datos) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(datos)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Actualizar nodo existente
   * Agrega automáticamente updated_at timestamp
   * @param {string} id - UUID del nodo
   * @param {Object} datos - Campos a actualizar
   */
  async actualizar(id, datos) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        ...datos,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Eliminar nodo (soft delete)
   * NO elimina físicamente, solo marca como inactivo
   * @param {string} id - UUID del nodo
   */
  async eliminar(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        activo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // ========================================
  // UTILIDADES
  // ========================================

  /**
   * Validar que un código no exista ya
   * @param {string} codigo - Código a validar
   * @param {string|null} excludeId - ID a excluir de la búsqueda (útil en edición)
   */
  async validarCodigoUnico(codigo, excludeId = null) {
    let query = supabase
      .from(this.tableName)
      .select('id')
      .eq('codigo', codigo);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      return { esUnico: false, error };
    }

    return {
      esUnico: !data || data.length === 0,
      error: null
    };
  }

  /**
   * Obtener ruta completa desde raíz hasta nodo
   * @param {string} nodoId - UUID del nodo
   * @returns {Promise<{data: Array, error: any}>} - Array de nodos desde raíz hasta el nodo
   */
  async getRutaCompleta(nodoId) {
    const ruta = [];
    let nodoActual = nodoId;
    let contador = 0;
    const maxNiveles = 10; // Prevenir loops infinitos

    try {
      while (nodoActual && contador < maxNiveles) {
        const { data: nodo, error } = await this.getPorId(nodoActual);

        if (error || !nodo) break;

        ruta.unshift(nodo); // Agregar al inicio
        nodoActual = nodo.parent_id;
        contador++;
      }

      return { data: ruta, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

export default BaseArbolService;
