// src/services/solicitudes.js
import { supabase } from "../lib/supabase";

/* ============================================================
   CREAR SOLICITUD
   ============================================================ */
export async function crearSolicitud({ proveedor_id, created_by, email_creador, observaciones = "" }) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert([
      {
        proveedor_id,
        created_by,
        email_creador,
        observaciones
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ============================================================
   AGREGAR ITEMS A SOLICITUD
   ============================================================ */
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

/* ============================================================
   OBTENER TODAS LAS SOLICITUDES
   ============================================================ */
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
    `);

  if (error) {
    console.error("❌ ERROR en getSolicitudes:", error);
    return [];
  }

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

/* ============================================================
   ITEMS DE UNA SOLICITUD
   ============================================================ */
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

/* ============================================================
   ACTUALIZAR ESTADO SOLICITUD
   ============================================================ */
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

/* ============================================================
   OBTENER SOLICITUD COMPLETA CON ITEMS
   ============================================================ */
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

/* ============================================================
   PENDIENTES PARA JEFE PLANTA
   ============================================================ */
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
          id, nombre
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
    console.error("❌ ERROR getSolicitudesPendientes:", err);
    return [];
  }
}

/* ============================================================
   PENDIENTES PARA AUXILIAR
   ============================================================ */
export async function getSolicitudesPendientesAuxiliar() {
  try {
    const { data, error } = await supabase
      .from("solicitudes")
      .select(`
        id,
        estado,
        fecha_solicitud,
        observaciones,
        proveedor_id,
        email_creador,
        proveedores(id, nombre),
        solicitud_items(
          id,
          cantidad_solicitada,
          unidad,
          estado_item,
          observaciones,
          motivo_rechazo,
          catalogo_productos(id, nombre, categoria, codigo_arbol)
        )
      `)
      .order("estado", { ascending: true })
      .order("fecha_solicitud", { ascending: true });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ ERROR getSolicitudesPendientesAuxiliar:", err);
    return [];
  }
}

/* ============================================================
   ACCIONES DEL AUXILIAR
   ============================================================ */
export async function marcarItemRevisado(idItem) {
  return await supabase
    .from("solicitud_items")
    .update({ estado_item: "revisado_auxiliar" })
    .eq("id", idItem);
}

export async function aprobarItemAuxiliar(idItem) {
  return await supabase
    .from("solicitud_items")
    .update({ estado_item: "aprobado_auxiliar", motivo_rechazo: null })
    .eq("id", idItem);
}

export async function rechazarItemAuxiliar(idItem, motivo) {
  return await supabase
    .from("solicitud_items")
    .update({
      estado_item: "rechazado_auxiliar",
      motivo_rechazo: motivo
    })
    .eq("id", idItem);
}

export async function cerrarRevisionAuxiliar(idSolicitud) {
  const { data: items, error } = await supabase
    .from("solicitud_items")
    .select("estado_item")
    .eq("solicitud_id", idSolicitud);

  if (error) throw error;

  const hayRechazados = items.some(i => i.estado_item === "rechazado_auxiliar");
  const todosAprobados = items.every(i => i.estado_item === "aprobado_auxiliar");

  let nuevoEstado = "revisada_auxiliar";

  if (hayRechazados) nuevoEstado = "devuelta_jefe_planta";
  else if (todosAprobados) nuevoEstado = "aprobada_auxiliar";

  return await supabase
    .from("solicitudes")
    .update({ estado: nuevoEstado })
    .eq("id", idSolicitud);
}

/**
 * CLAVE: OBTENER_SOLICITUD_POR_ID
 * Obtiene una solicitud con proveedor e ítems relacionados
 */
export async function getSolicitudById(solicitud_id) {

  // CLAVE: SELECT_SIN_COMENTARIOS
  const selectQuery = `
    id,
    estado,
    fecha_solicitud,
    observaciones,
    email_creador,

    proveedor:proveedores (
      id,
      nombre,
      nit
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
  `;

  const { data, error } = await supabase
    .from("solicitudes")
    .select(selectQuery)
    .eq("id", solicitud_id)
    .single();

  // CLAVE: MANEJO_ERROR_SUPABASE
  if (error) {
    console.error("❌ Error al obtener solicitud:", error);
    throw error;
  }

  return data;
}


/**
 * CLAVE: OBTENER_SOLICITUDES_POR_ROL
 */
export async function getSolicitudesPorRol(rol) {

  let estadosPermitidos = [];

  // CLAVE: REGLAS_VISIBILIDAD
  if (rol === "auxiliar_de_compras") {
    estadosPermitidos = ["pendiente"];
  }

  if (rol === "jefe_de_compras") {
    estadosPermitidos = ["aprobado_auxiliar"];
  }

  if (rol === "jefe_de_planta") {
    estadosPermitidos = ["rechazada_auxiliar"];
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .select("id, estado, fecha_solicitud")
    .in("estado", estadosPermitidos)
    .order("fecha_solicitud", { ascending: false });

  if (error) throw error;
  return data;
}
