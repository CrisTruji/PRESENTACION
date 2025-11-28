import { supabase } from "../lib/supabase";

// Crear solicitud
export async function crearSolicitud({ proveedor_id, created_by, observaciones }) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert([
      {
        proveedor_id,
        created_by,
        observaciones,
        estado: "pendiente",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Crear items de solicitud
export async function crearSolicitudItem(item) {
  const { data, error } = await supabase
    .from("solicitud_items")
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Obtener catalogo de productos
export async function obtenerCatalogoProductos() {
  const { data, error } = await supabase
    .from("catalogo_productos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data;
}

// Obtener proveedores
export async function obtenerProveedores() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*");

  if (error) throw error;
  return data;
}
