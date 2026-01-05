import { supabase } from "../lib/supabase";
import { supabaseRequest } from "../lib/supabaseRequest"; // He agregado esta linea

export async function crearPedido({ solicitud_id, proveedor_id, created_by }) {
  return supabaseRequest( // He agregado esta linea
    supabase
      .from("pedidos")
      .insert([{ solicitud_id, proveedor_id, created_by }])
      .select()
      .single()
  );
}

export async function agregarItemsPedido(pedido_id, items) {
  const payload = items.map(i => ({
    pedido_id,
    catalogo_producto_id: i.catalogo_producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario || null
  }));

  return supabaseRequest( // He agregado esta linea
    supabase.from("pedido_items").insert(payload)
  );
}
