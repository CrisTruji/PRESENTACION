import { supabase } from "@/shared/api";

// Roles que solo el administrador puede asignar internamente;
// no aparecen como opción durante el auto-registro.
const ROLES_SOLO_ADMIN = ["administrador", "nomina", "usuario"];

/**
 * Lista los roles que un usuario puede solicitar al registrarse.
 * Excluye roles de uso exclusivo del administrador.
 */
export async function listRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select("id, nombre, descripcion")
    .not("nombre", "in", `(${ROLES_SOLO_ADMIN.join(",")})`)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error listando roles:", error);
    return [];
  }
  return data || [];
}
