// src/services/solicitudes.js
import { supabase } from "../lib/supabase";

/**
 * Crear encabezado de solicitud
 */
export async function crearSolicitud({ proveedor_id, created_by, email_creador, observaciones = "" }) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert([
      {
        proveedor_id,
        created_by,
        email_creador,   // 👈 NUEVO CAMPO
        observaciones
      }
    ])
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
export async function getSolicitudes() {
  let { data, error } = await supabase
    .from("solicitudes")
    .select(`
  id,
  estado,
  proveedor_id,
  fecha_solicitud,
  created_by,
  observaciones,
  proveedores:proveedor_id(id,nombre),
  solicitud_items(
    id,
    cantidad_solicitada,
    unidad,
    estado_item,
    observaciones,
    motivo_rechazo,
    catalogo_productos(
      id,
      nombre,
      categoria,
      codigo_arbol
    )
  )
`)


  if (error) {
    console.error("❌ ERROR en getSolicitudes:", error);
    return [];
  }

  // ⭐ ORDENAR DESPUÉS DE RECIBIRLAS
  const prioridad = {
    pendiente: 1,
    pendiente_auxiliar: 2,
    aprobado_auxiliar: 3,
    aprobado_compras: 4,
    comprado: 5,
  };

  data.sort((a, b) => {
    const pa = prioridad[a.estado] || 99;
    const pb = prioridad[b.estado] || 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.fecha_solicitud) - new Date(b.fecha_solicitud);
  });

  return data;
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

/**
 * Obtiene todas las solicitudes pendientes para el rol Auxiliar de Compras
 */
export async function getSolicitudesPendientes() {
  try {
    const { data, error } = await supabase
      .from("solicitudes")
      .select(`
        id,
        estado,
        fecha_solicitud,
        observaciones,
        email_creador,

        proveedor:proveedores (
          id,
          nombre
        ),

        items:solicitud_items (
          id,
          cantidad_solicitada,
          unidad,
          estado_item,
          observaciones,
          motivo_rechazo,

          catalogo_producto:catalogo_productos (
            id,
            nombre,
            categoria,
            codigo_arbol
          )
        )
      `)
      .eq("estado", "pendiente")
      .order("fecha_solicitud", { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error("❌ ERROR en getSolicitudesPendientes:", err);
    return [];
  }
}