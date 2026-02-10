import { supabase } from '@/shared/api';
import { supabaseRequest } from "../lib/supabaseRequest";

export async function getProductosByProveedor(proveedorId) {
  const data = await supabaseRequest(
    supabase
      .from("proveedor_productos")
      .select(`
        id,
        catalogo_producto_id,
        catalogo_productos (
          id,
          nombre,
          categoria,
          codigo_arbol
        )
      `)
      .eq("proveedor_id", proveedorId)
      .order("nombre", { ascending: true, foreignTable: "catalogo_productos" })
  );

  return data.map(r => ({
    id: r.catalogo_productos.id,
    nombre: r.catalogo_productos.nombre,
    categoria: r.catalogo_productos.categoria,
    codigo_arbol: r.catalogo_productos.codigo_arbol
  }));
}
