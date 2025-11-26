// src/services/profiles.js
import { supabase } from "../lib/supabase";

// Obtener usuarios sin rol (pendientes) - VERSIÓN CORREGIDA
export const getPendingUsers = async () => {
  try {
    console.log("🔍 Buscando usuarios pendientes...");
    
    const { data, error, count } = await supabase
      .from("users_profiles")
      .select(`
        id, 
        nombre, 
        email,
        created_at,
        rol_id,
        roles!inner(nombre)
      `, { count: 'exact' })
      .is("rol_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error en getPendingUsers:", error);
      // Si es error de RLS, intentar sin el join
      if (error.code === '42501') {
        console.log("🔄 Intentando sin join...");
        const { data: simpleData, error: simpleError } = await supabase
          .from("users_profiles")
          .select("id, nombre, email, created_at, rol_id")
          .is("rol_id", null)
          .order("created_at", { ascending: false });
          
        if (simpleError) {
          throw simpleError;
        }
        console.log("🟢 Usuarios pendientes encontrados (sin join):", simpleData?.length);
        return { data: simpleData, error: null };
      }
      throw error;
    }

    console.log("🟢 Usuarios pendientes encontrados:", data?.length);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Excepción en getPendingUsers:", error);
    return { data: null, error };
  }
};

// Asignar rol a un usuario (admin) - VERSIÓN CORREGIDA
export const assignRole = async (userId, roleId) => {
  try {
    console.log("🟡 Asignando rol:", { userId, roleId });
    
    const { data, error } = await supabase
      .from("users_profiles")
      .update({ 
        rol_id: roleId,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error en assignRole:", error);
      
      // Si es error de permisos, mostrar mensaje específico
      if (error.code === '42501') {
        throw new Error("No tienes permisos para asignar roles");
      }
      throw error;
    }

    console.log("🟢 Rol asignado exitosamente:", data);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Excepción en assignRole:", error);
    return { data: null, error };
  }
};