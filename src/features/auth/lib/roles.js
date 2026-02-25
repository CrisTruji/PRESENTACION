import { supabase } from "@/shared/api";

export async function listRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select("id, nombre")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error listando roles:", error);
    return [];
  }
  return data || [];
}
