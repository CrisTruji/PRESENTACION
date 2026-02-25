import { supabase } from '@/shared/api';
import { supabaseRequest } from "@/shared/api";

export async function getProveedores() {
  return supabaseRequest( // He agregado esta linea
    supabase
      .from("proveedores")
      .select("id, nombre")
      .order("nombre", { ascending: true })
  );
}
