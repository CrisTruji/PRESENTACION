// src/services/solicitudes.js
import { supabase } from "../lib/supabase";
import {
  ESTADOS_SOLICITUD,
  ESTADOS_ITEM,
  ESTADOS_POR_ROL,
  determinarProximoEstado,
  todosItemsRevisados,
  rechazosConMotivo
} from "../lib/estados";

/* ============================================================
   CREAR SOLICITUD
   ============================================================ */
export async function crearSolicitud({ 
  proveedor_id, 
  created_by, 
  email_creador, 
  observaciones = "" 
}) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert([{
      proveedor_id,
      created_by,
      email_creador,
      observaciones,
      estado: ESTADOS_SOLICITUD.PENDIENTE
    }])
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
    observaciones: i.observaciones || null,
    estado_item: ESTADOS_ITEM.PENDIENTE
  }));

  const { data, error } = await supabase
    .from("solicitud_items")
    .insert(payload);
    
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

  // Ordenar por prioridad de estado
  const prioridad = {
    [ESTADOS_SOLICITUD.PENDIENTE]: 1,
    [ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR]: 2,
    [ESTADOS_SOLICITUD.APROBADO_AUXILIAR]: 3,
    [ESTADOS_SOLICITUD.APROBADO_COMPRAS]: 4,
    [ESTADOS_SOLICITUD.COMPRADO]: 5,
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
   OBTENER SOLICITUD POR ID
   ============================================================ */
export async function getSolicitudById(solicitud_id) {
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
        nombre,
        nit
      ),
      solicitud_items (
        id,
        cantidad_solicitada,
        unidad,
        estado_item,
        observaciones,
        motivo_rechazo,
        catalogo_productos (
          id,
          nombre,
          categoria,
          codigo_arbol
        )
      )
    `)
    .eq("id", solicitud_id)
    .single();

  if (error) {
    console.error("❌ Error al obtener solicitud:", error);
    throw error;
  }

  return data;
}

/* ============================================================
   OBTENER SOLICITUDES POR ROL
   ============================================================ */
export async function getSolicitudesPorRol(rol) {
  const estadosPermitidos = ESTADOS_POR_ROL[rol] || [];
  
  if (estadosPermitidos.length === 0) {
    console.warn(`⚠️ Rol "${rol}" no tiene estados definidos`);
    return [];
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      id,
      estado,
      fecha_solicitud,
      observaciones,
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
    .in("estado", estadosPermitidos)
    .order("fecha_solicitud", { ascending: false });

  if (error) {
    console.error("❌ Error getSolicitudesPorRol:", error);
    return [];
  }

  return data || [];
}

/* ============================================================
   OBTENER SOLICITUDES PENDIENTES PARA AUXILIAR
   ============================================================ */
export async function getSolicitudesPendientesAuxiliar() {
  return getSolicitudesPorRol('auxiliar_de_compras');
}

/* ============================================================
   OBTENER SOLICITUDES PENDIENTES PARA JEFE DE PLANTA
   ============================================================ */
export async function getSolicitudesPendientes() {
  return getSolicitudesPorRol('jefe_de_planta');
}

/* ============================================================
   APROBAR ITEM INDIVIDUAL (AUXILIAR)
   ============================================================ */
export async function aprobarItemAuxiliar(itemId) {
  const { error } = await supabase
    .from("solicitud_items")
    .update({ 
      estado_item: ESTADOS_ITEM.APROBADO_AUXILIAR,
      motivo_rechazo: null
    })
    .eq("id", itemId);

  if (error) throw error;
  return true;
}

/* ============================================================
   APROBAR MÚLTIPLES ITEMS (AUXILIAR)
   ============================================================ */
export async function aprobarItemsAuxiliar(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error("Debes proporcionar al menos un item para aprobar");
  }

  const { error } = await supabase
    .from("solicitud_items")
    .update({ 
      estado_item: ESTADOS_ITEM.APROBADO_AUXILIAR,
      motivo_rechazo: null
    })
    .in("id", itemIds);

  if (error) throw error;
  return true;
}

/* ============================================================
   RECHAZAR ITEM INDIVIDUAL (AUXILIAR)
   ============================================================ */
export async function rechazarItemAuxiliar(itemId, motivo) {
  if (!motivo?.trim()) {
    throw new Error("El motivo de rechazo es obligatorio");
  }

  const { error } = await supabase
    .from("solicitud_items")
    .update({
      estado_item: ESTADOS_ITEM.RECHAZADO_AUXILIAR,
      motivo_rechazo: motivo.trim()
    })
    .eq("id", itemId);

  if (error) throw error;
  return true;
}

/* ============================================================
   RECHAZAR MÚLTIPLES ITEMS (AUXILIAR)
   ============================================================ */
export async function rechazarItemsAuxiliar(itemIds, motivo) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error("Debes proporcionar al menos un item para rechazar");
  }

  if (!motivo?.trim()) {
    throw new Error("El motivo de rechazo es obligatorio");
  }

  const { error } = await supabase
    .from("solicitud_items")
    .update({
      estado_item: ESTADOS_ITEM.RECHAZADO_AUXILIAR,
      motivo_rechazo: motivo.trim()
    })
    .in("id", itemIds);

  if (error) throw error;
  return true;
}

/* ============================================================
   CERRAR REVISIÓN (AUXILIAR)
   ============================================================ */
export async function cerrarRevisionAuxiliar(solicitudId) {
  // 1. Obtener todos los ítems de la solicitud
  const { data: items, error: errorItems } = await supabase
    .from("solicitud_items")
    .select("id, estado_item, motivo_rechazo")
    .eq("solicitud_id", solicitudId);

  if (errorItems) throw errorItems;

  // 2. Validar que todos los ítems estén revisados
  if (!todosItemsRevisados(items)) {
    throw new Error(
      "No puedes cerrar la revisión: hay ítems sin revisar"
    );
  }

  // 3. Validar que los rechazos tengan motivo
  if (!rechazosConMotivo(items)) {
    throw new Error(
      "Todos los ítems rechazados deben tener un motivo"
    );
  }

  // 4. Determinar el próximo estado
  const nuevoEstado = determinarProximoEstado(items);

  // 5. Actualizar el estado de la solicitud
  const { error: errorUpdate } = await supabase
    .from("solicitudes")
    .update({ estado: nuevoEstado })
    .eq("id", solicitudId);

  if (errorUpdate) throw errorUpdate;

  // 6. Registrar en historial
  await registrarHistorial(solicitudId, nuevoEstado, "Revisión cerrada por auxiliar");

  return { 
    success: true, 
    nuevoEstado,
    mensaje: nuevoEstado === ESTADOS_SOLICITUD.APROBADO_AUXILIAR
      ? "Solicitud aprobada y enviada a jefe de compras"
      : "Solicitud devuelta a jefe de planta para correcciones"
  };
}

/* ============================================================
   ACTUALIZAR ESTADO SOLICITUD (GENÉRICO)
   ============================================================ */
export async function actualizarEstadoSolicitud(
  solicitud_id, 
  nuevoEstado, 
  comentario = null
) {
  // Validar que el estado existe
  if (!Object.values(ESTADOS_SOLICITUD).includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado: nuevoEstado })
    .eq("id", solicitud_id)
    .select()
    .single();

  if (error) throw error;

  // Registrar en historial si hay comentario
  if (comentario) {
    await registrarHistorial(solicitud_id, nuevoEstado, comentario);
  }

  return data;
}

/* ============================================================
   REGISTRAR HISTORIAL
   ============================================================ */
async function registrarHistorial(solicitudId, accion, nota) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("solicitud_historial").insert([{
    solicitud_id: solicitudId,
    actor: user?.id || null,
    accion,
    nota
  }]);
}

/* ============================================================
   OBTENER ITEMS DE UNA SOLICITUD
   ============================================================ */
export async function getItemsBySolicitud(solicitud_id) {
  const { data, error } = await supabase
    .from("solicitud_items")
    .select(`
      id,
      solicitud_id,
      cantidad_solicitada,
      unidad,
      estado_item,
      observaciones,
      motivo_rechazo,
      catalogo_producto:catalogo_productos ( id, nombre, categoria )
    `)
    .eq("solicitud_id", solicitud_id);

  if (error) throw error;
  return data || [];
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
        estado_item,
        observaciones,
        motivo_rechazo,
        catalogo_producto:catalogo_productos ( id, nombre, categoria )
      )
    `)
    .eq("id", solicitud_id)
    .single();

  if (error) throw error;
  return data;
}

/* ============================================================
   ACTUALIZAR ITEM (JEFE DE PLANTA)
   ============================================================ */
export async function actualizarItem(itemId, datos) {
  const { error } = await supabase
    .from("solicitud_items")
    .update({
      cantidad_solicitada: datos.cantidad_solicitada,
      unidad: datos.unidad,
      observaciones: datos.observaciones || null
    })
    .eq("id", itemId);

  if (error) throw error;
  return true;
}

/* ============================================================
   ELIMINAR ITEM (JEFE DE PLANTA)
   ============================================================ */
export async function eliminarItem(itemId) {
  const { error } = await supabase
    .from("solicitud_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
  return true;
}

/* ============================================================
   REENVIAR SOLICITUD (JEFE DE PLANTA)
   ============================================================ */
export async function reenviarSolicitud(solicitudId) {
  // 1. Obtener los ítems actuales
  const { data: items, error: errorItems } = await supabase
    .from("solicitud_items")
    .select("id, estado_item")
    .eq("solicitud_id", solicitudId);

  if (errorItems) throw errorItems;

  if (items.length === 0) {
    throw new Error("La solicitud debe tener al menos un producto");
  }

  // 2. Resetear estado de todos los ítems a pendiente
  const { error: errorReset } = await supabase
    .from("solicitud_items")
    .update({ 
      estado_item: ESTADOS_ITEM.PENDIENTE,
      motivo_rechazo: null
    })
    .eq("solicitud_id", solicitudId);

  if (errorReset) throw errorReset;

  // 3. Cambiar estado de la solicitud a pendiente
  const { error: errorSolicitud } = await supabase
    .from("solicitudes")
    .update({ estado: ESTADOS_SOLICITUD.PENDIENTE })
    .eq("id", solicitudId);

  if (errorSolicitud) throw errorSolicitud;

  // 4. Registrar en historial
  await registrarHistorial(
    solicitudId, 
    ESTADOS_SOLICITUD.PENDIENTE, 
    "Solicitud corregida y reenviada por jefe de planta"
  );

  return { 
    success: true, 
    mensaje: "Solicitud reenviada correctamente"
  };
}