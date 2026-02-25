import { supabase } from '@/shared/api';
import { supabaseRequest } from '@/shared/api';

/**
 * Obtener usuarios pendientes (basado en estado 'pendiente')
 */
export const getPendingUsers = async () => {
  const data = await supabaseRequest(
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
 */
export const getAllRoles = async () => {
  const data = await supabaseRequest(
    supabase
      .from("roles")
      .select("*")
      .order("nombre", { ascending: true })
  );

  return data || [];
};

/**
 * Asigna un rol a un usuario y actualiza su estado a 'activo'
 */
export const assignRole = async (userId, newRole) => {
  const data = await supabaseRequest(
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
 */
export const rejectUser = async (userId) => {
  const data = await supabaseRequest(
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
 */
export const getUserStats = async () => {
  const data = await supabaseRequest(
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

export const getPendingUsersByRol = async () => {
  return supabaseRequest(
    supabase
      .from("profiles")
      .select("*")
      .eq("rol", "usuario")
      .order("created_at", { ascending: true })
  );
};

export const getActiveUsers = async () => {
  const data = await supabaseRequest(
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

export const updateUserProfile = async (userId, updates) => {
  const data = await supabaseRequest(
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
