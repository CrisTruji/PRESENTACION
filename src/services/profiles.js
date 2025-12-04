import { supabase } from "../lib/supabase";

/**
 * Obtener usuarios pendientes (basado en estado 'pendiente')
 * Manteniendo el nombre getPendingUsers para compatibilidad
 */
export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        roles:rol (
          id,
          nombre,
          descripcion
        )
      `)
      .eq("estado", "pendiente")  // Cambiado: usar 'estado' en lugar de 'rol'
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error("❌ Error al obtener usuarios pendientes:", error);
    throw error;
  }
};

/**
 * Obtener TODOS los roles disponibles
 * Nueva función para el dashboard
 */
export const getAllRoles = async () => {
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error("❌ Error al obtener roles:", error);
    throw error;
  }
};

/**
 * Asigna un rol a un usuario y actualiza su estado a 'activo'
 * Manteniendo el mismo nombre y parámetros
 */
export const assignRole = async (userId, newRole) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        rol: newRole,
        estado: 'activo',  // Añadido: actualizar estado a activo
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Rol actualizado y usuario activado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error asignando rol:", error);
    throw error;
  }
};

/**
 * Rechazar usuario (marcar como 'rechazado')
 * Nueva función para el dashboard
 */
export const rejectUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        estado: 'rechazado',
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Usuario rechazado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error rechazando usuario:", error);
    throw error;
  }
};

/**
 * Obtener estadísticas de usuarios
 * Nueva función para el dashboard
 */
export const getUserStats = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("estado, created_at");

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      total: data.length,
      pending: data.filter(u => u.estado === 'pendiente').length,
      active: data.filter(u => u.estado === 'activo').length,
      rejected: data.filter(u => u.estado === 'rechazado').length,
      today: data.filter(u => 
        u.created_at && u.created_at.startsWith(today)
      ).length
    };

    return stats;

  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    throw error;
  }
};

/**
 * Función original que usa el campo 'rol' para compatibilidad
 * Puedes mantenerla si otras partes la usan
 */
export const getPendingUsersByRol = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("rol", "usuario")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data;

  } catch (error) {
    console.error("❌ Error al obtener usuarios pendientes por rol:", error);
    throw error;
  }
};
/**
 * Obtener usuarios activos
 */
export const getActiveUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        roles:rol (
          id,
          nombre,
          descripcion
        )
      `)
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error("❌ Error al obtener usuarios activos:", error);
    throw error;
  }
};

/**
 * Actualizar perfil de usuario (nombre, email, rol)
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        nombre: updates.nombre,
        email: updates.email,
        rol: updates.rol,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Perfil actualizado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error actualizando perfil:", error);
    throw error;
  }
};

/**
 * Desactivar usuario (cambiar estado a 'inactivo')
 */
export const deactivateUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        estado: 'inactivo',
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Usuario desactivado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error desactivando usuario:", error);
    throw error;
  }
};

/**
 * Eliminar usuario por completo
 * ¡CUIDADO! Esta acción es permanente
 */
export const deleteUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("⚠️ Usuario eliminado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error eliminando usuario:", error);
    throw error;
  }
};