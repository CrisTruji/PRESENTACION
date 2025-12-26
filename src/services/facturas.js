// src/services/facturas.js
import { supabase } from "../lib/supabase";
import { ESTADOS_SOLICITUD } from "../lib/estados";

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
        catalogo_productos (
          id,
          nombre,
          categoria,
          codigo_arbol
        )
      )
    `)
    .eq("estado", ESTADOS_SOLICITUD.COMPRADO)
    .order("fecha_solicitud", { ascending: false });

  // Filtro opcional por proveedor
  if (filtros.proveedor_id) {
    query = query.eq("proveedor_id", filtros.proveedor_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error getSolicitudesCompradas:", error);
    throw error;
  }

  return data || [];
}

/* ============================================================
   OBTENER LISTA DE PROVEEDORES CON SOLICITUDES PENDIENTES
   ============================================================ */
export async function getProveedoresConSolicitudesPendientes() {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      proveedor_id,
      proveedores (
        id,
        nombre
      )
    `)
    .eq("estado", ESTADOS_SOLICITUD.COMPRADO);

  if (error) {
    console.error("❌ Error getProveedores:", error);
    return [];
  }

  // Obtener proveedores únicos
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
   REGISTRAR RECEPCIÓN DE FACTURA
   ============================================================ */
export async function registrarRecepcionFactura(datos) {
  const { 
    solicitud_id,
    proveedor_id, // ← NECESARIO
    numero_factura,
    fecha_factura,
    pdf_url,
    items, // Array con { item_id, cantidad_recibida, precio_unitario, observacion }
    total_factura
  } = datos;

  // Validaciones
  if (!solicitud_id || !numero_factura || !fecha_factura || !proveedor_id) {
    throw new Error("Faltan datos obligatorios");
  }

  if (!items || items.length === 0) {
    throw new Error("Debe registrar al menos un producto");
  }

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // 1. Crear el registro de factura
    const { data: factura, error: errorFactura } = await supabase
      .from("facturas")
      .insert([{
        solicitud_id,
        proveedor_id, // ← AGREGADO
        numero_factura,
        fecha_factura,
        fecha_recepcion: new Date().toISOString().split('T')[0],
        valor_total: total_factura,
        pdf_url: pdf_url || null,
        created_by: user?.id,
        recibido_por: user?.id,
        estado_recepcion: determinarEstadoRecepcion(items)
      }])
      .select()
      .single();

    if (errorFactura) throw errorFactura;

    // 2. Crear los items de la factura
    const factura_items = items.map(item => ({
      factura_id: factura.id,
      catalogo_producto_id: item.catalogo_producto_id,
      cantidad: item.cantidad_recibida, // Lo que realmente llegó
      cantidad_recibida: item.cantidad_recibida, // Redundante pero útil para reportes
      precio_unitario: item.precio_unitario,
      observacion_recepcion: item.observacion || null
      // subtotal se calcula automáticamente: cantidad * precio_unitario
    }));

    const { error: errorItems } = await supabase
      .from("factura_items")
      .insert(factura_items);

    if (errorItems) throw errorItems;

    // 3. Actualizar estado de la solicitud
    const nuevoEstado = determinarEstadoRecepcion(items) === 'recibido_completo'
      ? ESTADOS_SOLICITUD.FINALIZADO
      : 'recibido_parcial';

    const { error: errorSolicitud } = await supabase
      .from("solicitudes")
      .update({ estado: nuevoEstado })
      .eq("id", solicitud_id);

    if (errorSolicitud) throw errorSolicitud;

    return {
      success: true,
      factura_id: factura.id,
      mensaje: "Recepción registrada correctamente"
    };

  } catch (error) {
    console.error("❌ Error registrarRecepcionFactura:", error);
    throw error;
  }
}

/* ============================================================
   SUBIR PDF DE FACTURA
   ============================================================ */
export async function subirPDFFactura(file, solicitud_id) {
  if (!file) {
    throw new Error("No se proporcionó ningún archivo");
  }

  // Validar tipo de archivo
  if (file.type !== 'application/pdf') {
    throw new Error("El archivo debe ser un PDF");
  }

  // Validar tamaño (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El archivo no debe superar los 5MB");
  }

  // Nombre único para el archivo
  const timestamp = Date.now();
  const fileName = `factura_${solicitud_id}_${timestamp}.pdf`;
  
  const BUCKET_NAME = 'facturas-pdf'; // ← Bucket existente y funcional

  try {
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("❌ Error de Supabase Storage:", error);
      throw new Error(error.message);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log("✅ PDF subido correctamente:", urlData.publicUrl);

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl
    };

  } catch (error) {
    console.error("❌ Error al subir PDF:", error);
    throw error;
  }
}

/* ============================================================
   UTILIDADES
   ============================================================ */

function determinarEstadoRecepcion(items) {
  const todoCompleto = items.every(
    item => item.cantidad_recibida >= item.cantidad_solicitada
  );

  const algunFaltante = items.some(
    item => item.cantidad_recibida < item.cantidad_solicitada
  );

  if (todoCompleto) return 'recibido_completo';
  if (algunFaltante) return 'recibido_parcial';
  return 'pendiente';
}

/* ============================================================
   OBTENER FACTURAS REGISTRADAS
   ============================================================ */
export async function getFacturasRegistradas(filtros = {}) {
  let query = supabase
    .from("facturas")
    .select(`
      id,
      numero_factura,
      fecha_factura,
      fecha_recepcion,
      valor_total,
      estado_recepcion,
      solicitudes (
        id,
        proveedores (
          nombre
        )
      ),
      factura_items (
        cantidad,
        precio_unitario,
        subtotal,
        catalogo_productos (
          nombre
        )
      )
    `)
    .order("fecha_recepcion", { ascending: false });

  if (filtros.fecha_desde) {
    query = query.gte("fecha_recepcion", filtros.fecha_desde);
  }

  if (filtros.fecha_hasta) {
    query = query.lte("fecha_recepcion", filtros.fecha_hasta);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error getFacturasRegistradas:", error);
    return [];
  }

  return data || [];
}