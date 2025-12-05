import { supabase } from "../lib/supabase";

/**
 * Crea solicitud (encabezado), retorna registro creado
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
 * Inserta items en solicitud (varios)
 * items: [{ catalogo_producto_id, cantidad_solicitada, unidad, observaciones }]
 */
export async function agregarItemsSolicitud(solicitud_id, items) {
  const payload = items.map((i) => ({
    solicitud_id,
    catalogo_producto_id: i.catalogo_producto_id,
    cantidad_solicitada: i.cantidad_solicitada,
    unidad: i.unidad || "und",
    observaciones: i.observaciones || null
  }));

  const { data, error } = await supabase
    .from("solicitud_items")
    .insert(payload);

  if (error) throw error;
  return data;
}
/**
 * Obtiene todas las solicitudes creadas por un usuario específico
 */
export async function getSolicitudesByUser(userId) {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      proveedor_id,
      created_by,
      estado,
      created_at,
      proveedores ( nombre )
    `)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
