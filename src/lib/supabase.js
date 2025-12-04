import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

/**
 * Obtener todos los perfiles con información básica
 * Nueva función para compatibilidad
 */
export async function getAllProfiles() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        nombre,
        email,
        estado,
        created_at,
        updated_at,
        roles:rol (
          id,
          nombre
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error obteniendo perfiles:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Excepción en getAllProfiles:", error);
    return [];
  }
}

/**
 * Obtener un perfil específico por ID
 */
export async function getProfileById(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        roles:rol (
          id,
          nombre,
          descripcion
        )
      `)
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error);
    throw error;
  }
}

/**
 * Buscar perfiles por término
 */
export async function searchProfiles(searchTerm) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        nombre,
        email,
        estado,
        created_at,
        roles:rol (
          nombre
        )
      `)
      .or(`nombre.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("❌ Error buscando perfiles:", error);
    return [];
  }
}