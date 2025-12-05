import { supabase } from "../lib/supabase";

/**
 * Obtener productos relacionados a un proveedor usando la tabla intermedia
 * Retorna array de { id, nombre, categoria }
 */
export async function getProductosByProveedor(proveedorId) {
  const { data, error } = await supabase
    .from("proveedor_productos")
    .select(`
      catalogo_producto_id,
      catalogo_productos (
        id,
        nombre,
        categoria
      )
    `)
    .eq("proveedor_id", proveedorId)
    /* .order("catalogo_productos.nombre", { ascending: true }); */

  if (error) throw error;

  // Normalizar a lista de productos
  return (data || []).map((r) => ({
    id: r.catalogo_productos.id,
    nombre: r.catalogo_productos.nombre,
    categoria: r.catalogo_productos.categoria
  }));
}
