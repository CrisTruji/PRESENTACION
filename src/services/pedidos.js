// src/services/pedidos.js
import { supabase } from "../lib/supabase";

/**
 * Crear pedido (encabezado)
 * payload: { solicitud_id, proveedor_id, created_by }
 */
export async function crearPedido({ solicitud_id, proveedor_id, created_by }) {
  const { data, error } = await supabase
    .from("pedidos")
    .insert([{ solicitud_id, proveedor_id, created_by }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Agregar items a pedido
 * items: [{ catalogo_producto_id, cantidad, precio_unitario }]
 */
export async function agregarItemsPedido(pedido_id, items) {
  const payload = items.map(i => ({
    pedido_id,
    catalogo_producto_id: i.catalogo_producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario || null
  }));

  const { data, error } = await supabase
    .from("pedido_items")
    .insert(payload);

  if (error) throw error;
  return data;
}
