// src/services/solicitudes.js  (añadir)
import { supabase } from "../lib/supabase";

/**
 * Actualiza el estado de una solicitud
 */
export async function actualizarEstadoSolicitud(id, estado, nota = null) {
  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado, observaciones: nota })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtener solicitud por id (con sus items)
 */
export async function getSolicitudConItems(id) {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      proveedor_id,
      estado,
      fecha_solicitud,
      created_by,
      proveedor:proveedores ( id, nombre ),
      items:solicitud_items (
        id,
        catalogo_producto_id,
        cantidad_solicitada,
        unidad,
        observaciones,
        catalogo_productos ( id, nombre, categoria )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
