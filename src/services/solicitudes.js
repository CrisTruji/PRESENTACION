// src/services/solicitudes.js
import { supabase } from "../lib/supabase";

/**
 * Crear encabezado de solicitud
 */
export async function crearSolicitud({ proveedor_id, created_by, observaciones = "" }) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert([{ proveedor_id, created_by, observaciones }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Agregar items a solicitud
 */
export async function agregarItemsSolicitud(solicitud_id, items) {
  const payload = items.map((i) => ({
    solicitud_id,
    catalogo_producto_id: i.catalogo_producto_id,
    cantidad_solicitada: i.cantidad_solicitada,
    unidad: i.unidad || "und",
    observaciones: i.observaciones || null
  }));

  const { data, error } = await supabase.from("solicitud_items").insert(payload);
  if (error) throw error;
  return data;
}

/**
 * Obtener solicitudes filtradas (por creador, por estado, etc.)
 */
export async function getSolicitudes({ created_by } = {}) {
  let q = supabase
    .from("solicitudes")
    .select(`
      id,
      proveedor_id,
      estado,
      fecha_solicitud,
      created_by,
      proveedor:proveedores ( id, nombre )
    `)
    .order("created_at", { ascending: false });

  if (created_by) q = q.eq("created_by", created_by);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener items de una solicitud
 */
export async function getItemsBySolicitud(solicitud_id) {
  const { data, error } = await supabase
    .from("solicitud_items")
    .select(`
      id,
      solicitud_id,
      cantidad_solicitada,
      unidad,
      observaciones,
      catalogo_producto:catalogo_productos ( id, nombre, categoria )
    `)
    .eq("solicitud_id", solicitud_id);

  if (error) throw error;
  return data || [];
}


/**
 * Actualizar estado de una solicitud
 */
export async function actualizarEstadoSolicitud(solicitud_id, nuevoEstado) {
  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado: nuevoEstado })
    .eq("id", solicitud_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
/**
 * Obtener una solicitud con todos sus items relacionados
 */
export async function getSolicitudConItems(solicitud_id) {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      proveedor_id,
      estado,
      fecha_solicitud,
      created_by,
      proveedor:proveedores ( id, nombre, telefono, correo ),
      items:solicitud_items (
        id,
        cantidad_solicitada,
        unidad,
        observaciones,
        catalogo_producto:catalogo_productos ( id, nombre, categoria )
      )
    `)
    .eq("id", solicitud_id)
    .single();

  if (error) throw error;
  return data;
}

