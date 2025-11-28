// src/services/profiles.js
import { supabase } from "../lib/supabase";

export const getPendingUsers = async () => {
  const { data, error } = await supabase
    .from("users_profiles")
    .select("id, nombre, email, created_at")
    .is("rol_id", null);
  return { data, error };
};

export const assignRole = async (userId, roleId) => {
  const { data, error } = await supabase
    .from("users_profiles")
    .update({ rol_id: roleId, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select();
  return { data, error };
};

export const getAllProfiles = async () => {
  const { data, error } = await supabase.from("users_profiles").select("id, nombre, email, rol_id, roles(nombre)");
  return { data, error };
};
