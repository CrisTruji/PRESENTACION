import { supabase } from '../lib/supabase';

/**
 * Servicio para gestionar la vinculación entre proveedores y presentaciones
 * Las presentaciones son los nodos de nivel 6 del árbol de materia prima
 */
export const proveedorPresentacionesService = {

  /**
   * Obtener todas las presentaciones vinculadas a un proveedor
   * Incluye datos del producto padre (nivel 5) para contexto
   */
  async getPresentacionesByProveedor(proveedorId) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .select(`
        id,
        precio_referencia,
        codigo_proveedor,
        activo,
        presentacion:presentacion_id (
          id,
          codigo,
          nombre,
          contenido_unidad,
          unidad_contenido,
          nivel_actual,
          parent_id
        )
      `)
      .eq('proveedor_id', proveedorId)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Enriquecer con datos del producto padre (nivel 5)
    if (data && data.length > 0) {
      const parentIds = [...new Set(data.map(d => d.presentacion?.parent_id).filter(Boolean))];

      if (parentIds.length > 0) {
        const { data: productos } = await supabase
          .from('arbol_materia_prima')
          .select('id, codigo, nombre, unidad_stock, stock_actual, costo_promedio')
          .in('id', parentIds);

        const productosMap = new Map(productos?.map(p => [p.id, p]) || []);

        return {
          data: data.map(item => ({
            ...item,
            producto: productosMap.get(item.presentacion?.parent_id) || null
          })),
          error: null
        };
      }
    }

    return { data, error };
  },

  /**
   * Obtener todas las vinculaciones (para administración)
   */
  async getAll(filtros = {}) {
    let query = supabase
      .from('proveedor_presentaciones')
      .select(`
        id,
        precio_referencia,
        codigo_proveedor,
        activo,
        created_at,
        proveedor:proveedor_id (id, nombre, nit),
        presentacion:presentacion_id (
          id, codigo, nombre, contenido_unidad, unidad_contenido, parent_id
        )
      `)
      .order('created_at', { ascending: false });

    if (filtros.proveedor_id) {
      query = query.eq('proveedor_id', filtros.proveedor_id);
    }

    if (filtros.solo_activos !== false) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Vincular una presentación a un proveedor
   */
  async vincularPresentacion(proveedorId, presentacionId, precioReferencia = null, codigoProveedor = null) {
    // Verificar que la presentación es nivel 6
    const { data: presentacion, error: errorPres } = await supabase
      .from('arbol_materia_prima')
      .select('id, nivel_actual, nombre')
      .eq('id', presentacionId)
      .single();

    if (errorPres || !presentacion) {
      return { data: null, error: { message: 'Presentación no encontrada' } };
    }

    if (presentacion.nivel_actual !== 6) {
      return { data: null, error: { message: 'Solo se pueden vincular presentaciones (nivel 6)' } };
    }

    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .insert({
        proveedor_id: proveedorId,
        presentacion_id: presentacionId,
        precio_referencia: precioReferencia,
        codigo_proveedor: codigoProveedor,
        activo: true
      })
      .select()
      .single();

    return { data, error };
  },

  /**
   * Actualizar vinculación (precio de referencia, código proveedor)
   */
  async actualizarVinculacion(id, datos) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .update({
        ...datos,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Desvincular una presentación de un proveedor (soft delete)
   */
  async desvincularPresentacion(proveedorId, presentacionId) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('proveedor_id', proveedorId)
      .eq('presentacion_id', presentacionId)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Eliminar vinculación permanentemente
   */
  async eliminarVinculacion(id) {
    const { error } = await supabase
      .from('proveedor_presentaciones')
      .delete()
      .eq('id', id);

    return { error };
  },

  /**
   * Obtener proveedores que tienen una presentación específica
   */
  async getProveedoresByPresentacion(presentacionId) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .select(`
        id,
        precio_referencia,
        codigo_proveedor,
        proveedor:proveedor_id (id, nombre, nit, telefono, email)
      `)
      .eq('presentacion_id', presentacionId)
      .eq('activo', true);

    return { data, error };
  },

  /**
   * Buscar presentaciones disponibles para vincular
   * (nivel 6 que no están vinculadas al proveedor)
   */
  async buscarPresentacionesDisponibles(proveedorId, termino = '') {
    // Obtener IDs de presentaciones ya vinculadas
    const { data: vinculadas } = await supabase
      .from('proveedor_presentaciones')
      .select('presentacion_id')
      .eq('proveedor_id', proveedorId)
      .eq('activo', true);

    const idsVinculados = vinculadas?.map(v => v.presentacion_id) || [];

    // Buscar presentaciones nivel 6
    let query = supabase
      .from('arbol_materia_prima')
      .select(`
        id, codigo, nombre, contenido_unidad, unidad_contenido, parent_id
      `)
      .eq('nivel_actual', 6)
      .eq('activo', true)
      .order('nombre');

    if (termino && termino.length >= 2) {
      query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
    }

    if (idsVinculados.length > 0) {
      query = query.not('id', 'in', `(${idsVinculados.join(',')})`);
    }

    const { data, error } = await query.limit(50);

    if (error) return { data: null, error };

    // Enriquecer con datos del producto padre
    if (data && data.length > 0) {
      const parentIds = [...new Set(data.map(d => d.parent_id).filter(Boolean))];

      if (parentIds.length > 0) {
        const { data: productos } = await supabase
          .from('arbol_materia_prima')
          .select('id, codigo, nombre, unidad_stock')
          .in('id', parentIds);

        const productosMap = new Map(productos?.map(p => [p.id, p]) || []);

        return {
          data: data.map(item => ({
            ...item,
            producto: productosMap.get(item.parent_id) || null
          })),
          error: null
        };
      }
    }

    return { data, error };
  },

  /**
   * Verificar si una presentación está vinculada a un proveedor
   */
  async existeVinculacion(proveedorId, presentacionId) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .select('id, activo')
      .eq('proveedor_id', proveedorId)
      .eq('presentacion_id', presentacionId)
      .maybeSingle();

    return {
      existe: !!data,
      activo: data?.activo || false,
      vinculacion: data,
      error
    };
  },

  /**
   * Reactivar una vinculación desactivada
   */
  async reactivarVinculacion(proveedorId, presentacionId) {
    const { data, error } = await supabase
      .from('proveedor_presentaciones')
      .update({ activo: true, updated_at: new Date().toISOString() })
      .eq('proveedor_id', proveedorId)
      .eq('presentacion_id', presentacionId)
      .select()
      .single();

    return { data, error };
  }
};
