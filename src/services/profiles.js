import { supabase } from "../lib/supabase";
import { supabaseRequest } from "../lib/supabaseRequest"; // He agregado esta linea

/**
 * Obtener usuarios pendientes (basado en estado 'pendiente')
 * Manteniendo el nombre getPendingUsers para compatibilidad
 */
export const getPendingUsers = async () => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .select(`
        *,
        roles:rol (
          id,
          nombre,
          descripcion
        )
      `)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
  );

  return data || [];
};

/**
 * Obtener TODOS los roles disponibles
 * Nueva función para el dashboard
 */
export const getAllRoles = async () => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("roles")
      .select("*")
      .order("nombre", { ascending: true })
  );

  return data || [];
};

/**
 * Asigna un rol a un usuario y actualiza su estado a 'activo'
 * Manteniendo el mismo nombre y parámetros
 */
export const assignRole = async (userId, newRole) => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .update({
        rol: newRole,
        estado: "activo",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()
  );

  console.log("✅ Rol actualizado y usuario activado:", data);
  return data;
};

/**
 * Rechazar usuario (marcar como 'rechazado')
 * Nueva función para el dashboard
 */
export const rejectUser = async (userId) => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .update({
        estado: "rechazado",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()
  );

  console.log("✅ Usuario rechazado:", data);
  return data;
};

/**
 * Obtener estadísticas de usuarios
 * Nueva función para el dashboard
 */
export const getUserStats = async () => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .select("estado, created_at")
  );

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    total: data.length,
    pending: data.filter(u => u.estado === "pendiente").length,
    active: data.filter(u => u.estado === "activo").length,
    rejected: data.filter(u => u.estado === "rechazado").length,
    today: data.filter(
      u => u.created_at && u.created_at.startsWith(today)
    ).length
  };

  return stats;
};

/**
 * Función original que usa el campo 'rol' para compatibilidad
 * Puedes mantenerla si otras partes la usan
 */
export const getPendingUsersByRol = async () => {
  return supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .select("*")
      .eq("rol", "usuario")
      .order("created_at", { ascending: true })
  );
};

/**
 * Obtener usuarios activos
 */
export const getActiveUsers = async () => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
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
      .order("nombre", { ascending: true })
  );

  return data || [];
};

/**
 * Actualizar perfil de usuario (nombre, email, rol)
 */
export const updateUserProfile = async (userId, updates) => {
  const data = await supabaseRequest( // He agregado esta linea
    supabase
      .from("profiles")
      .update({
        nombre: updates.nombre,
        email: updates.email,
        rol: updates.rol,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()
  );

  console.log("✅ Perfil actualizado:", data);
  return data;
};

/**
 * Desactivar usuario (cambiar estado a 'inactivo')
 */
export const deactivateUser = async (userId) => {
  const data = await supabaseRequest(
    supabase
      .from("profiles")
      .update({
        estado: "inactivo",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()
  );

  console.log("✅ Usuario desactivado:", data);
  return data;
};

/**
 * Eliminar usuario por completo
 * ¡CUIDADO! Esta acción es permanente
 */
export const deleteUser = async (userId) => {
  const data = await supabaseRequest(
    supabase
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select()
      .single()
  );

  console.log("⚠️ Usuario eliminado:", data);
  return data;
};
