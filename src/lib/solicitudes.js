// src/services/solicitudes.js
import { supabase } from "../lib/supabase";


export async function listSolicitudes() {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      fecha_solicitud,
      proveedor:proveedor_id ( id, nombre ),
      created_by
    `)
    .order("id", { ascending: false });

  if (error) throw error;

  return data;
}


export const createSolicitud = async ({ proveedor_id, created_by, items = [], observaciones = "" }) => {
  const { data: sData, error: sError } = await supabase
    .from("solicitudes")
    .insert([{ proveedor_id, created_by, observaciones }])
    .select()
    .single();
  if (sError) return { error: sError };

  const solicitudId = sData.id;
  // insertar items
  const payload = items.map((it) => ({
    solicitud_id: solicitudId,
    catalogo_producto_id: it.catalogo_producto_id,
    cantidad_solicitada: it.cantidad,
    unidad: it.unidad || "u",
    observaciones: it.observaciones || null
  }));
  const { data: itemsData, error: itemsError } = await supabase.from("solicitud_items").insert(payload).select();
  if (itemsError) return { error: itemsError };
  return { data: { solicitud: sData, items: itemsData } };
};


export const getPendingSolicitudes = async () => {
  const { data, error } = await supabase
    .from("solicitudes")
    .select("id, proveedor_id, estado, fecha_solicitud, created_by, observaciones, created_at, proveedores(nombre)")
    .eq("estado", "pendiente");
  return { data, error };
};

export const getSolicitudById = async (id) => {
  const { data, error } = await supabase
    .from("solicitudes")
    .select("id, proveedor_id, estado, fecha_solicitud, created_by, observaciones, solicitud_items(*), proveedores(*)")
    .eq("id", id)
    .maybeSingle();
  return { data, error };
};

export const updateSolicitudEstado = async (id, estado, actorId = null, note = "") => {
  const { data, error } = await supabase.from("solicitudes").update({ estado }).eq("id", id).select();
  if (error) return { error };
  // registrar historial
  await supabase.from("solicitud_historial").insert([{ solicitud_id: id, actor: actorId, accion: `Cambio de estado a ${estado}`, nota: note }]);
  return { data };
};
export const getSolicitudesByUser = async (userId) => {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      fecha_solicitud,
      proveedor:proveedor_id ( id, nombre ),
      observaciones,
      created_by
    `)
    .eq("created_by", userId)
    .order("id", { ascending: false });

  return { data, error };
};

