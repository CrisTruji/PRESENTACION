// src/services/solicitudes.js
import { supabase } from "../lib/supabase";

/* =======================================================
   📌 1. OBTENER SOLICITUDES POR USUARIO
   ======================================================= */
export async function getSolicitudesByUser(userId) {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      created_at,
      proveedores ( id, nombre )
    `)
    .eq("usuario_id", userId)
    .order("created_at", { ascending: false });

  if (error) console.error("❌ Error getSolicitudesByUser:", error);
  return { data, error };
}

/* =======================================================
   📌 2. OBTENER SOLICITUDES PENDIENTES PARA AUXILIAR
   ======================================================= */
export async function getPendingSolicitudes() {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      created_at,
      proveedores ( id, nombre )
    `)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) console.error("❌ Error getPendingSolicitudes:", error);
  return { data, error };
}

/* =======================================================
   📌 3. OBTENER SOLICITUD POR ID (detalle + productos)
   ======================================================= */
export async function getSolicitudById(id) {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      comentario_admin,
      comentario_auxiliar,
      proveedores ( id, nombre ),
      detalle:solicitud_detalle (
        id,
        cantidad,
        estado,
        comentario,
        productos (
          id,
          nombre,
          categoria
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) console.error("❌ Error getSolicitudById:", error);
  return { data, error };
}

/* =======================================================
   📌 4. ACTUALIZAR ESTADO DE UNA SOLICITUD
   ======================================================= */
export async function updateSolicitudEstado(id, estado, comentario_admin = null, comentario_auxiliar = null) {
  const { data, error } = await supabase
    .from("solicitudes")
    .update({
      estado,
      comentario_admin,
      comentario_auxiliar
    })
    .eq("id", id);

  if (error) console.error("❌ Error updateSolicitudEstado:", error);
  return { data, error };
}

/* =======================================================
   📌 5. ACTUALIZAR ESTADO DE UN PRODUCTO DE LA SOLICITUD
   ======================================================= */
export async function updateProductoEstado(detalleId, estado, comentario = null) {
  const { data, error } = await supabase
    .from("solicitud_detalle")
    .update({
      estado,
      comentario
    })
    .eq("id", detalleId);

  if (error) console.error("❌ Error updateProductoEstado:", error);
  return { data, error };
}

/* =======================================================
   📌 6. CREAR SOLICITUD (para jefe de planta)
   ======================================================= */
export async function createSolicitud({ proveedorId, usuarioId, productos }) {
  // 1. Crear solicitud
  const { data: solicitud, error: err1 } = await supabase
    .from("solicitudes")
    .insert({
      proveedor_id: proveedorId,
      usuario_id: usuarioId,
      estado: "pendiente",
      comentario_admin: null,
      comentario_auxiliar: null
    })
    .select()
    .single();

  if (err1) {
    console.error("❌ Error creando solicitud:", err1);
    return { error: err1 };
  }

  const solicitudId = solicitud.id;

  // 2. Crear items
  const detalleInsert = productos.map(p => ({
    solicitud_id: solicitudId,
    producto_id: p.id,
    cantidad: p.cantidad,
    estado: "autorizado", // por defecto
    comentario: null
  }));

  const { error: err2 } = await supabase
    .from("solicitud_detalle")
    .insert(detalleInsert);

  if (err2) {
    console.error("❌ Error creando detalle:", err2);
    return { error: err2 };
  }

  return { data: solicitud };
}

/* =======================================================
   📌 7. AGREGAR ITEMS A UNA SOLICITUD (faltante)
   ======================================================= */
export async function agregarItemsSolicitud(solicitudId, items) {
  const detalleInsert = items.map(p => ({
    solicitud_id: solicitudId,
    producto_id: p.id,
    cantidad: p.cantidad,
    estado: "autorizado",
    comentario: null
  }));

  const { data, error } = await supabase
    .from("solicitud_detalle")
    .insert(detalleInsert);

  if (error) console.error("❌ Error agregarItemsSolicitud:", error);
  return { data, error };
}

/* =======================================================
   📌 8. AUXILIAR APRUEBA PRODUCTO
   ======================================================= */
export async function autorizarItem(itemId) {
  const { data, error } = await supabase
    .from("solicitud_detalle")
    .update({ estado: "verificado" })
    .eq("id", itemId);

  if (error) console.error("❌ Error autorizarItem:", error);
  return { data, error };
}

/* =======================================================
   📌 9. AUXILIAR DEVUELVE PRODUCTO
   ======================================================= */
export async function devolverItem(itemId, motivo) {
  const { data, error } = await supabase
    .from("solicitud_detalle")
    .update({
      estado: "devuelto",
      comentario: motivo
    })
    .eq("id", itemId);

  if (error) console.error("❌ Error devolverItem:", error);
  return { data, error };
}
