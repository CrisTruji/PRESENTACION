import { supabase } from '@/shared/api';

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
      .order('codigo')
      .limit(5000);

    return { data, error };
  },

  /**
   * Obtener categorías nivel 3 de un tipo de rama
   * @param {string} tipo_rama - produccion, entregable, desechable
   * @returns {Promise<{data, error}>}
   */
  async getCategoriasNivel3(tipo_rama) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('tipo_rama', tipo_rama)
      .eq('nivel_actual', 3)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  },

  /**
   * Contar productos nivel 5 por tipo de rama
   * @param {string} tipo_rama - produccion, entregable, desechable
   * @returns {Promise<{data, error}>}
   */
  async contarProductosPorTipo(tipo_rama) {
    const { count, error } = await supabase
      .from('arbol_materia_prima')
      .select('*', { count: 'exact', head: true })
      .eq('tipo_rama', tipo_rama)
      .eq('nivel_actual', 5)
      .eq('activo', true);

    return { data: count, error };
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
  },

  // ============================================================
  // MÉTODOS DE STOCK E INVENTARIO
  // ============================================================

  /**
   * Actualizar stock de un producto (nivel 5) desde factura
   * Usa el RPC actualizar_stock_desde_factura para actualización atómica
   * @param {number} facturaId - ID de la factura
   * @returns {Promise<{data, error}>}
   */
  async actualizarStockDesdeFactura(facturaId) {
    const { data, error } = await supabase.rpc('actualizar_stock_desde_factura', {
      p_factura_id: facturaId
    });

    return { data, error };
  },

  /**
   * Obtener movimientos de inventario de un producto
   * @param {number} productoId - ID del producto nivel 5
   * @param {number} limite - Cantidad de registros (default: 50)
   * @returns {Promise<{data, error}>}
   */
  async getMovimientosInventario(productoId, limite = 50) {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select(`
        *,
        presentacion:presentacion_id(codigo, nombre, contenido_unidad, unidad_contenido),
        factura:factura_id(numero_factura, fecha_factura)
      `)
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(limite);

    return { data, error };
  },

  /**
   * Obtener productos con stock bajo (por debajo del mínimo)
   * @param {string} tipo_rama - Filtrar por tipo (opcional)
   * @returns {Promise<{data, error}>}
   */
  async getProductosStockBajo(tipo_rama = null) {
    let query = supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('nivel_actual', 5)
      .eq('activo', true)
      .eq('maneja_stock', true)
      .not('stock_minimo', 'is', null);

    if (tipo_rama) {
      query = query.eq('tipo_rama', tipo_rama);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    // Filtrar productos donde stock_actual < stock_minimo
    const productosBajos = data.filter(p =>
      p.stock_actual !== null &&
      p.stock_minimo !== null &&
      p.stock_actual < p.stock_minimo
    );

    return { data: productosBajos, error: null };
  },

  /**
   * Obtener resumen de stock por tipo de rama
   * @param {string} tipo_rama - produccion, entregable, desechable
   * @returns {Promise<{data, error}>}
   */
  async getResumenStockPorTipo(tipo_rama) {
    const { data, error } = await supabase
      .from('arbol_materia_prima')
      .select('id, codigo, nombre, stock_actual, stock_minimo, stock_maximo, unidad_stock, costo_promedio')
      .eq('nivel_actual', 5)
      .eq('tipo_rama', tipo_rama)
      .eq('activo', true)
      .eq('maneja_stock', true)
      .order('nombre');

    return { data, error };
  },

  /**
   * Calcular valor total del inventario
   * @param {string} tipo_rama - Filtrar por tipo (opcional)
   * @returns {Promise<{data, error}>}
   */
  async calcularValorInventario(tipo_rama = null) {
    let query = supabase
      .from('arbol_materia_prima')
      .select('stock_actual, costo_promedio')
      .eq('nivel_actual', 5)
      .eq('activo', true)
      .eq('maneja_stock', true);

    if (tipo_rama) {
      query = query.eq('tipo_rama', tipo_rama);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    const valorTotal = data.reduce((total, producto) => {
      const stock = producto.stock_actual || 0;
      const costo = producto.costo_promedio || 0;
      return total + (stock * costo);
    }, 0);

    return {
      data: {
        valor_total: valorTotal,
        productos_count: data.length
      },
      error: null
    };
  },

  /**
   * Obtener presentación por ID con datos del producto padre
   * @param {number} presentacionId - ID de la presentación (nivel 6)
   * @returns {Promise<{data, error}>}
   */
  async getPresentacionConProducto(presentacionId) {
    const { data: presentacion, error: errorPres } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('id', presentacionId)
      .eq('nivel_actual', 6)
      .single();

    if (errorPres) return { data: null, error: errorPres };

    // Obtener producto padre (nivel 5)
    const { data: producto, error: errorProd } = await supabase
      .from('arbol_materia_prima')
      .select('*')
      .eq('id', presentacion.parent_id)
      .single();

    if (errorProd) return { data: null, error: errorProd };

    return {
      data: {
        presentacion,
        producto
      },
      error: null
    };
  },

  /**
   * Buscar presentaciones disponibles para un proveedor
   * @param {number} proveedorId - ID del proveedor
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<{data, error}>}
   */
  async buscarPresentacionesParaProveedor(proveedorId, termino = '') {
    // Obtener presentaciones ya vinculadas
    const { data: vinculadas } = await supabase
      .from('proveedor_presentaciones')
      .select('presentacion_id')
      .eq('proveedor_id', proveedorId)
      .eq('activo', true);

    const idsVinculados = (vinculadas || []).map(v => v.presentacion_id);

    // Buscar presentaciones nivel 6
    let query = supabase
      .from('arbol_materia_prima')
      .select(`
        id,
        codigo,
        nombre,
        contenido_unidad,
        unidad_contenido,
        parent_id
      `)
      .eq('nivel_actual', 6)
      .eq('activo', true);

    if (termino && termino.length >= 2) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    const { data, error } = await query.order('nombre').limit(50);

    if (error) return { data: null, error };

    // Filtrar las ya vinculadas y agregar info del padre
    const disponibles = data.filter(p => !idsVinculados.includes(p.id));

    return { data: disponibles, error: null };
  }
};
