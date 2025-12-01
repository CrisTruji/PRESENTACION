// src/services/solicitudes.js


// 🔹 Crear solicitud (solo la solicitud)
export async function crearSolicitud(data) {
  try {
    console.log("Solicitud creada:", data);

    return {
      ok: true,
      message: "Solicitud creada correctamente",
      solicitud: {
        id: Date.now(),
        ...data,
      },
    };
  } catch (error) {
    console.error("Error creando solicitud:", error);
    throw error;
  }
}

// 🔹 Crear ítem dentro de una solicitud
export async function crearSolicitudItem(solicitudId, item) {
  try {
    console.log("Ítem creado para solicitud:", solicitudId, item);

    return {
      ok: true,
      message: "Ítem agregado correctamente",
      item: {
        id: Date.now(),
        solicitudId,
        ...item,
      },
    };
  } catch (error) {
    console.error("Error creando ítem:", error);
    throw error;
  }
}

// 🔹 Obtener todas las solicitudes
export async function getSolicitudes() {
  try {
    return [
      { id: 1, estado: "pendiente", descripcion: "Compra de materiales" },
      { id: 2, estado: "aprobado_auxiliar", descripcion: "Herramientas de trabajo" },
    ];
  } catch (error) {
    console.error("Error obteniendo solicitudes:", error);
    throw error;
  }
}

// 🔹 Catálogo de productos (versión básica)
export async function obtenerCatalogoProductos() {
  try {
    return [
      { id: 1, nombre: "Guantes", unidad: "pares" },
      { id: 2, nombre: "Casco de seguridad", unidad: "unidad" },
      { id: 3, nombre: "Tornillos 1/2", unidad: "bolsa" },
      { id: 4, nombre: "Máscara soldador", unidad: "unidad" }
    ];
  } catch (error) {
    console.error("Error obteniendo catálogo:", error);
    throw error;
  }
}
// 🔹 Lista básica de proveedores
export async function obtenerProveedores() {
  try {
    return [
      { id: 1, nombre: "Proveedor A", contacto: "contactoA@correo.com" },
      { id: 2, nombre: "Proveedor B", contacto: "contactoB@correo.com" },
      { id: 3, nombre: "Ferretería Bogotá", contacto: "ferreteria@bogota.com" }
    ];
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    throw error;
  }
}

// 🔹 Obtener solicitudes filtradas por usuario (mock)
export async function getSolicitudesByUser(userId) {
  try {
    // Por ahora devolvemos mock de ejemplo
    return [
      { id: 1, estado: "pendiente", descripcion: "Compra de materiales", created_by: userId },
      { id: 3, estado: "rechazado", descripcion: "Reposición de equipo", created_by: userId },
    ];
  } catch (error) {
    console.error("Error obteniendo solicitudes del usuario:", error);
    throw error;
  }
}

