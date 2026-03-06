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
 * Asigna un rol a un usuario.
 * Llama a la Edge Function assign-role que actualiza tanto app_metadata
 * (para que el JWT cambie de inmediato al refrescar sesión) como la tabla profiles.
 *
 * @param {string} userId  - UUID del usuario en auth.users / profiles
 * @param {string} roleId  - UUID del rol en la tabla roles
 * @param {string} roleName - Nombre del rol (ej: "chef", "almacenista")
 */
export const assignRole = async (userId, roleId, roleName) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-role`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, roleId, roleName }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error asignando rol");

  console.log("✅ Rol asignado y app_metadata actualizado:", json);
  return json;
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
