import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: obtener productos por proveedor desde tabla pivote proveedor_productos
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

  return (data || []).map((item) => item.catalogo_productos);
}

// Obtener TODOS los proveedores
export async function getAllProviders() {
  try {
    const { data, error } = await supabase
      .from("proveedores")
      .select("id, nombre, nit, created_at")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("❌ Error obteniendo proveedores:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Excepción en getAllProviders:", error);
    return [];
  }
}

// Crear una nueva solicitud
export async function createSolicitud(solicitudData) {
  try {
    const { data, error } = await supabase
      .from("solicitudes")
      .insert([solicitudData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error creando solicitud:", error);
    throw error;
  }
}

// Crear items de solicitud
export async function createSolicitudItems(items) {
  try {
    const { data, error } = await supabase
      .from("solicitud_items")
      .insert(items)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error creando items de solicitud:", error);
    throw error;
  }
}
