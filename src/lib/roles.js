import { supabase } from "./supabase";

export async function listRoles() {
  const { data, error } = await supabase.from("roles").select("id, nombre").order("id");
  if (error) {
    console.error("Error listando roles:", error);
    return [];
  }
  return data || [];
}
