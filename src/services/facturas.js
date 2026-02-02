// src/services/facturas.js
// ACTUALIZADO: Sin dependencia de catalogo_productos
import { supabase } from "../lib/supabase";
import { supabaseRequest } from "../lib/supabaseRequest";
import { ESTADOS_SOLICITUD } from "../lib/estados";

/* ============================================================
   HELPER: Determinar estado de recepción
   ============================================================ */
function determinarEstadoRecepcion(items) {
  const todoCompleto = items.every(
    item => item.cantidad_recibida >= item.cantidad_solicitada
  );
  return todoCompleto ? "recibido_completo" : "recibido_parcial";
}

/* ============================================================
   OBTENER SOLICITUDES COMPRADAS (Para recibir)
   ============================================================ */
export async function getSolicitudesCompradas(filtros = {}) {
  let query = supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      fecha_solicitud,
      observaciones,
      email_creador,
      codigo_unidad,
      proveedores (
        id,
        nombre,
        nit
      ),
      solicitud_items (
        id,
        cantidad_solicitada,
        unidad,
        estado_item,
        observaciones,
        presentacion_id,
        producto_arbol_id,
        arbol_materia_prima:producto_arbol_id (
          id,
          codigo,
          nombre
        ),
        presentacion:presentacion_id (
          id,
          codigo,
          nombre,
          contenido_unidad,
          unidad_contenido
        )
      )
    `)
    .eq("estado", ESTADOS_SOLICITUD.COMPRADO)
    .order("fecha_solicitud", { ascending: false });

  if (filtros.proveedor_id) {
    query = query.eq("proveedor_id", filtros.proveedor_id);
  }

  return supabaseRequest(query);
}

/* ============================================================
   OBTENER LISTA DE PROVEEDORES CON SOLICITUDES PENDIENTES
   ============================================================ */
export async function getProveedoresConSolicitudesPendientes() {
  const data = await supabaseRequest(
    supabase
      .from("solicitudes")
      .select(`
        proveedor_id,
        proveedores (
          id,
          nombre
        )
      `)
      .eq("estado", ESTADOS_SOLICITUD.COMPRADO)
  );

  const proveedoresUnicos = [];
  const idsVistos = new Set();

  data.forEach(item => {
    if (item.proveedores && !idsVistos.has(item.proveedores.id)) {
      idsVistos.add(item.proveedores.id);
      proveedoresUnicos.push(item.proveedores);
    }
  });

  return proveedoresUnicos;
}

/* ============================================================
   REGISTRAR RECEPCIÓN DE FACTURA CON ACTUALIZACIÓN DE STOCK
   ============================================================ */
export async function registrarRecepcionFactura(datos) {
  const {
    solicitud_id,
    proveedor_id,
    numero_factura,
    fecha_factura,
    pdf_url,
    items,
    total_factura,
    codigo_unidad
  } = datos;

  if (!solicitud_id || !numero_factura || !fecha_factura || !proveedor_id) {
    throw new Error("Faltan datos obligatorios");
  }

  if (!items || items.length === 0) {
    throw new Error("Debe registrar al menos un producto");
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Crear la factura
  const factura = await supabaseRequest(
    supabase
      .from("facturas")
      .insert([{
        solicitud_id,
        proveedor_id,
        codigo_unidad: codigo_unidad || null,
        numero_factura,
        fecha_factura,
        fecha_recepcion: new Date().toISOString().split('T')[0],
        valor_total: total_factura,
        pdf_url: pdf_url || null,
        created_by: user?.id,
        recibido_por: user?.id,
        estado_recepcion: determinarEstadoRecepcion(items),
        estado_procesamiento: 'pendiente',
        intentos_procesamiento: 0
      }])
      .select()
      .single()
  );

  // 2. Crear los items de factura con presentacion_id y producto_arbol_id
  const factura_items = items.map(item => ({
    factura_id: factura.id,
    producto_arbol_id: item.producto_arbol_id || null,
    presentacion_id: item.presentacion_id || null,
    cantidad: item.cantidad_recibida,
    cantidad_recibida: item.cantidad_recibida,
    precio_unitario: item.precio_unitario,
    observacion_recepcion: item.observacion || null
  }));

  await supabaseRequest(
    supabase.from("factura_items").insert(factura_items)
  );

  // 3. Actualizar stock usando el RPC procesar_factura_stock
  const itemsConPresentacion = items.filter(i => i.presentacion_id);
  let stockResult = null;

  if (itemsConPresentacion.length > 0) {
    try {
      const { data: stockData, error: stockError } = await supabase.rpc(
        'procesar_factura_stock',
        { p_factura_id: factura.id }
      );

      if (stockError) {
        console.error('Error actualizando stock:', stockError);
        // Marcar factura como pendiente de procesamiento
        await supabase
          .from("facturas")
          .update({
            estado_procesamiento: 'error',
            intentos_procesamiento: 1
          })
          .eq("id", factura.id);
      } else {
        stockResult = stockData;
        console.log('Stock actualizado:', stockData);
      }
    } catch (err) {
      console.error('Error en RPC de stock:', err);
    }
  }

  // 4. Actualizar estado de la solicitud
  const nuevoEstado =
    determinarEstadoRecepcion(items) === "recibido_completo"
      ? ESTADOS_SOLICITUD.FINALIZADO
      : "recibido_parcial";

  await supabaseRequest(
    supabase
      .from("solicitudes")
      .update({ estado: nuevoEstado })
      .eq("id", solicitud_id)
  );

  return {
    success: true,
    factura_id: factura.id,
    stock_actualizado: stockResult,
    items_con_presentacion: itemsConPresentacion.length,
    mensaje: itemsConPresentacion.length > 0
      ? `Recepción registrada. Stock actualizado para ${itemsConPresentacion.length} productos.`
      : "Recepción registrada correctamente"
  };
}

/* ============================================================
   OBTENER PRESENTACIONES VINCULADAS A UN PROVEEDOR
   ============================================================ */
export async function getPresentacionesPorProveedor(proveedorId) {
  const { data, error } = await supabase
    .from('proveedor_presentaciones')
    .select(`
      id,
      precio_referencia,
      codigo_proveedor,
      presentacion:presentacion_id (
        id,
        codigo,
        nombre,
        contenido_unidad,
        unidad_contenido,
        parent_id
      )
    `)
    .eq('proveedor_id', proveedorId)
    .eq('activo', true);

  if (error) throw error;

  // Obtener información del producto padre para cada presentación
  const presentacionesConProducto = await Promise.all(
    (data || []).map(async (item) => {
      if (item.presentacion?.parent_id) {
        const { data: producto } = await supabase
          .from('arbol_materia_prima')
          .select('id, codigo, nombre, unidad_stock, costo_promedio, stock_actual')
          .eq('id', item.presentacion.parent_id)
          .single();

        return {
          ...item,
          producto
        };
      }
      return item;
    })
  );

  return presentacionesConProducto;
}

/* ============================================================
   SUBIR PDF DE FACTURA
   ============================================================ */
export async function subirPDFFactura(file, solicitud_id) {
  if (!file) throw new Error("No se proporcionó ningún archivo");
  if (file.type !== "application/pdf") throw new Error("El archivo debe ser un PDF");
  if (file.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar los 5MB");

  const fileName = `factura_${solicitud_id}_${Date.now()}.pdf`;
  const BUCKET_NAME = "facturas-pdf";

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return {
    success: true,
    path: data.path,
    url: urlData.publicUrl
  };
}

/* ============================================================
   OBTENER FACTURAS CON DETALLE DE STOCK
   ============================================================ */
export async function getFacturasConStock(filtros = {}) {
  let query = supabase
    .from("facturas")
    .select(`
      id,
      numero_factura,
      fecha_factura,
      fecha_recepcion,
      valor_total,
      estado_recepcion,
      estado_procesamiento,
      proveedores (
        id,
        nombre
      ),
      factura_items (
        id,
        cantidad_recibida,
        precio_unitario,
        presentacion_id,
        producto_arbol_id,
        presentacion:presentacion_id (
          id,
          codigo,
          nombre,
          contenido_unidad,
          unidad_contenido
        )
      )
    `)
    .order("fecha_recepcion", { ascending: false });

  if (filtros.proveedor_id) {
    query = query.eq("proveedor_id", filtros.proveedor_id);
  }

  if (filtros.estado_procesamiento) {
    query = query.eq("estado_procesamiento", filtros.estado_procesamiento);
  }

  if (filtros.limit) {
    query = query.limit(filtros.limit);
  }

  return supabaseRequest(query);
}

/* ============================================================
   REINTENTAR PROCESAMIENTO DE STOCK
   ============================================================ */
export async function reintentarProcesamientoStock(facturaId) {
  // Incrementar intentos
  const { error: updateError } = await supabase
    .from("facturas")
    .update({
      estado_procesamiento: 'procesando'
    })
    .eq("id", facturaId);

  if (updateError) throw updateError;

  try {
    const { data, error } = await supabase.rpc(
      'procesar_factura_stock',
      { p_factura_id: facturaId }
    );

    if (error) {
      await supabase
        .from("facturas")
        .update({ estado_procesamiento: 'error' })
        .eq("id", facturaId);

      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error reintentando procesamiento:', err);
    throw err;
  }
}

/* ============================================================
   OBTENER MOVIMIENTOS DE INVENTARIO POR FACTURA
   ============================================================ */
export async function getMovimientosPorFactura(facturaId) {
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select(`
      id,
      tipo_movimiento,
      cantidad_presentacion,
      cantidad_unidad_base,
      costo_unitario,
      stock_anterior,
      stock_posterior,
      costo_promedio_anterior,
      costo_promedio_posterior,
      unidad,
      created_at,
      producto:producto_id (
        id,
        codigo,
        nombre,
        unidad_stock
      ),
      presentacion:presentacion_id (
        id,
        codigo,
        nombre,
        contenido_unidad,
        unidad_contenido
      )
    `)
    .eq('factura_id', facturaId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/* ============================================================
   OBTENER RESUMEN DE INVENTARIO
   ============================================================ */
export async function getResumenInventario(tipoRama = null) {
  const { data, error } = await supabase.rpc('resumen_inventario', {
    p_tipo_rama: tipoRama
  });

  if (error) throw error;
  return data;
}

/* ============================================================
   OBTENER STOCK DE UN PRODUCTO
   ============================================================ */
export async function getStockProducto(productoId) {
  const { data, error } = await supabase.rpc('obtener_stock_producto', {
    p_producto_id: productoId
  });

  if (error) throw error;
  return data;
}
