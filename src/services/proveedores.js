import { supabase } from "../lib/supabase";

export async function getProveedores() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data || [];
}
