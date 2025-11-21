import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Obtener productos por proveedor usando la tabla pivote
export async function getProductsByProvider(proveedorId) {
  const { data, error } = await supabase
    .from("proveedor_productos")
    .select(`
      id,
      catalogo_productos (
        id,
        nombre,
        codigo_arbol,
        categoria
      )
    `)
    .eq("proveedor_id", proveedorId);

  if (error) {
    console.error("Error consultando productos:", error);
    return [];
  }

  // Normalizar los datos para que sea más fácil consumirlos
  return data.map((item) => item.catalogo_productos);
}

