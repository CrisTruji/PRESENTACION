import { supabase } from '../lib/supabase';

/**
 * Servicio para gestionar el Árbol de Materia Prima
 * Maneja la jerarquía de 6 niveles con productos y presentaciones
 */
export const arbolMateriaPrimaService = {

  /**
   * Obtener raíz del árbol (nivel 1)
   * @returns {Promise<{data, error}>}
   */
  async getRaiz() {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('nivel_actual', 1)
      .single();

    return { data, error };
  },

  /**
   * Obtener hijos de un nodo
   * @param {number} parentId - ID del nodo padre
   * @returns {Promise<{data, error}>}
   */
  async getHijos(parentId) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('parent_id', parentId)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener nodos por nivel y tipo
   * @param {number} nivel_actual - Nivel del árbol (1-6)
   * @param {string} tipo_rama - produccion, entregable, desechable
   * @returns {Promise<{data, error}>}
   */
  async getNodosPorTipo(nivel_actual, tipo_rama) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('nivel_actual', nivel_actual)
      .eq('tipo_rama', tipo_rama)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener producto por código
   * @param {string} codigo - Código del producto
   * @returns {Promise<{data, error}>}
   */
  async getProductoPorCodigo(codigo) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('codigo', codigo)
      .single();

    return { data, error };
  },

  /**
   * Buscar productos por término y filtros
   * @param {string} termino - Término de búsqueda
   * @param {Object} filtros - Filtros adicionales
   * @returns {Promise<{data, error}>}
   */
  async buscarProductos(termino, filtros = {}) {
    let query = supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('activo', true);

    // Búsqueda por término
    if (termino && termino.length >= 3) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    // Filtro por tipo de rama
    if (filtros.tipo_rama) {
      query = query.eq('tipo_rama', filtros.tipo_rama);
    }

    // Filtro por nivel
    if (filtros.nivel_actual) {
      query = query.eq('nivel_actual', filtros.nivel_actual);
    }

    // Filtro por stock bajo
    if (filtros.stock_bajo) {
      query = query.eq('maneja_stock', true)
                   .filter('stock_actual', 'lt', supabase.raw('stock_minimo'));
    }

    const { data, error } = await query.order('codigo').limit(50);

    return { data, error };
  },

  /**
   * Obtener producto por ID
   * @param {number} id - ID del producto
   * @returns {Promise<{data, error}>}
   */
  async getProductoPorId(id) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  /**
   * Obtener presentaciones de un producto (nivel 6)
   * @param {number} productoId - ID del producto nivel 5
   * @returns {Promise<{data, error}>}
   */
  async getPresentaciones(productoId) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('parent_id', productoId)
      .eq('nivel_actual', 6)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Obtener stock actual de un producto
   * @param {number} productoId - ID del producto
   * @returns {Promise<{data, error}>}
   */
  async getStock(productoId) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('stock_actual, unidad_stock, stock_minimo, stock_maximo')
      .eq('id', productoId)
      .eq('maneja_stock', true)
      .single();

    return { data, error };
  },

  /**
   * Obtener historial de precios de un producto
   * @param {number} productoId - ID del producto
   * @param {number} meses - Cantidad de meses a consultar (default: 3)
   * @returns {Promise<{data, error}>}
   */
  async getHistorialPrecios(productoId, meses = 3) {
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - meses);

    const { data, error } = await supabase
      .from('historial_precios')
      .select(`
        *,
        factura:factura_id(numero_factura, fecha_factura),
        presentacion:presentacion_id(codigo, nombre, contenido_unidad, unidad_contenido)
      `)
      .eq('producto_id', productoId)
      .gte('created_at', fechaDesde.toISOString())
      .order('created_at', { ascending: false });

    return { data, error };
  },

  /**
   * Obtener precio promedio de un producto (últimos 3 meses)
   * @param {number} productoId - ID del producto
   * @returns {Promise<{data, error}>}
   */
  async getPrecioPromedio(productoId) {
    const fechaDesde = new Date();
    fechaDesde.setMonth(fechaDesde.getMonth() - 3);

    const { data, error } = await supabase
      .rpc('calcular_precio_promedio', {
        p_producto_id: productoId,
        p_fecha_desde: fechaDesde.toISOString()
      });

    return { data, error };
  },

  /**
   * Crear nodo en el árbol
   * @param {Object} datos - Datos del nodo
   * @returns {Promise<{data, error}>}
   */
  async crearNodo(datos) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .insert(datos)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar nodo
   * @param {number} id - ID del nodo
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<{data, error}>}
   */
  async actualizarNodo(id, datos) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Eliminar nodo (soft delete)
   * @param {number} id - ID del nodo
   * @returns {Promise<{data, error}>}
   */
  async eliminarNodo(id) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Obtener árbol completo de un tipo (con todos los niveles)
   * @param {string} tipo_rama - produccion, entregable, desechable
   * @returns {Promise<{data, error}>}
   */
  async getArbolCompleto(tipo_rama) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('tipo_rama', tipo_rama)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Validar que datos sean correctos para el nivel
   * @param {number} nivel - Nivel del nodo
   * @param {Object} datos - Datos a validar
   * @returns {Object} {valido: boolean, errores: string[]}
   */
  validarNivel(nivel, datos) {
    const errores = [];

    // Validaciones comunes
    if (!datos.codigo || datos.codigo.trim() === '') {
      errores.push('El código es requerido');
    }

    if (!datos.nombre || datos.nombre.trim() === '') {
      errores.push('El nombre es requerido');
    }

    // Validaciones específicas por nivel
    if (nivel === 5) {
      // Nivel 5: Producto (maneja stock)
      if (!datos.unidad_stock) {
        errores.push('La unidad de stock es requerida para productos');
      }

      if (datos.stock_minimo !== undefined && datos.stock_minimo < 0) {
        errores.push('El stock mínimo no puede ser negativo');
      }

      if (datos.stock_maximo !== undefined && datos.stock_minimo !== undefined) {
        if (datos.stock_maximo < datos.stock_minimo) {
          errores.push('El stock máximo no puede ser menor que el stock mínimo');
        }
      }
    }

    if (nivel === 6) {
      // Nivel 6: Presentación
      if (!datos.contenido_unidad || datos.contenido_unidad <= 0) {
        errores.push('El contenido de la unidad debe ser mayor a 0');
      }

      if (!datos.unidad_contenido) {
        errores.push('La unidad de contenido es requerida');
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  },

  /**
   * Validar unidad de stock
   * @param {string} unidad - Unidad a validar
   * @returns {boolean}
   */
  validarUnidadStock(unidad) {
    const unidadesValidas = ['g', 'ml', 'und', 'kg', 'L'];
    return unidadesValidas.includes(unidad);
  },

  /**
   * Validar coherencia de presentación con producto padre
   * @param {Object} presentacion - Datos de la presentación
   * @param {Object} padre - Datos del producto padre
   * @returns {Object} {valido: boolean, errores: string[]}
   */
  validarContenidoPresentacion(presentacion, padre) {
    const errores = [];

    if (!padre.maneja_stock) {
      errores.push('El producto padre no maneja stock');
    }

    if (presentacion.unidad_contenido !== padre.unidad_stock) {
      errores.push(`La unidad de contenido (${presentacion.unidad_contenido}) debe coincidir con la unidad de stock del padre (${padre.unidad_stock})`);
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
};
