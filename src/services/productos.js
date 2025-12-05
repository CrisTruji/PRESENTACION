// /src/services/productos.js
import { supabase } from "../lib/supabase";

export async function getProductosByProveedor(proveedorId) {
  // Traemos los registros de la tabla puente y la relación catalogo_productos
  const { data, error } = await supabase
    .from("proveedor_productos")
    .select("catalogo_producto_id, catalogo_productos(id, nombre, categoria)")
    .eq("proveedor_id", proveedorId);

  if (error) throw error;

  // Mapear y filtrar (por si algún join retorna null) a solo los productos
  const productos = (data || [])
    .map((row) => row.catalogo_productos)
    .filter(Boolean);

  // Ordenar en cliente por nombre (localeCompare para acentos / ñ)
  productos.sort((a, b) => {
    const an = (a.nombre || "").toString();
    const bn = (b.nombre || "").toString();
    return an.localeCompare(bn, "es", { sensitivity: "base" });
  });

  return productos;
}
