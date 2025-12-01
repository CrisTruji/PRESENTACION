// src/services/proveedores.js

// 🔹 Obtener todos los proveedores
export async function getProveedores() {
  try {
    // Simulación por ahora — reemplaza por tu API real
    return [
      { id: 1, nombre: "Proveedor A", contacto: "a@correo.com" },
      { id: 2, nombre: "Proveedor B", contacto: "b@correo.com" },
      { id: 3, nombre: "Proveedor C", contacto: "c@correo.com" },
    ];
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    throw error;
  }
}

// 🔹 Crear proveedor
export async function crearProveedor(data) {
  try {
    console.log("Proveedor creado:", data);

    return {
      ok: true,
      message: "Proveedor creado correctamente",
      proveedor: { id: Date.now(), ...data },
    };
  } catch (error) {
    console.error("Error creando proveedor:", error);
    throw error;
  }
}

// 🔹 Actualizar proveedor
export async function actualizarProveedor(id, data) {
  try {
    console.log("Proveedor actualizado:", id, data);

    return {
      ok: true,
      message: "Proveedor actualizado correctamente",
      proveedor: { id, ...data },
    };
  } catch (error) {
    console.error("Error actualizando proveedor:", error);
    throw error;
  }
}

// 🔹 Eliminar proveedor
export async function eliminarProveedor(id) {
  try {
    console.log("Proveedor eliminado:", id);

    return {
      ok: true,
      message: "Proveedor eliminado correctamente",
    };
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    throw error;
  }
}
