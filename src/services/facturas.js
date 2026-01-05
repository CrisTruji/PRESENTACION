// src/services/facturas.js
import { supabase } from "../lib/supabase";
import { supabaseRequest } from "../lib/supabaseRequest";
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
   REGISTRAR RECEPCIÓN DE FACTURA
   ============================================================ */
export async function registrarRecepcionFactura(datos) {
  const {
    solicitud_id,
    proveedor_id,
    numero_factura,
    fecha_factura,
    pdf_url,
    items,
    total_factura
  } = datos;

  if (!solicitud_id || !numero_factura || !fecha_factura || !proveedor_id) {
    throw new Error("Faltan datos obligatorios");
  }

  if (!items || items.length === 0) {
    throw new Error("Debe registrar al menos un producto");
  }

  const { data: { user } } = await supabase.auth.getUser();

  const factura = await supabaseRequest(
    supabase
      .from("facturas")
      .insert([{
        solicitud_id,
        proveedor_id,
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
      .single()
  );

  const factura_items = items.map(item => ({
    factura_id: factura.id,
    catalogo_producto_id: item.catalogo_producto_id,
    cantidad: item.cantidad_recibida,
    cantidad_recibida: item.cantidad_recibida,
    precio_unitario: item.precio_unitario,
    observacion_recepcion: item.observacion || null
  }));

  await supabaseRequest(
    supabase.from("factura_items").insert(factura_items)
  );

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
    mensaje: "Recepción registrada correctamente"
  };
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

  const { data, error } = await supabase.storage // storage NO usa supabaseRequest
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
