import { supabase } from "./supabase";

// Funciones para proveedores
export async function listProveedores() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProveedor({ nombre, nit }) {
  const { data, error } = await supabase
    .from("proveedores")
    .insert([{ nombre, nit }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProveedor(id, { nombre, nit }) {
  const { data, error } = await supabase
    .from("proveedores")
    .update({ nombre, nit })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProveedor(id) {
  const { error } = await supabase.from("proveedores").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// Funciones para solicitudes
export async function listSolicitudes() {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(`
      *,
      proveedor:proveedores(nombre, nit),
      created_by_user:users_profiles!solicitudes_created_by_fkey(nombre),
      approved_by_user:users_profiles!solicitudes_approved_by_fkey(nombre)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSolicitud({ proveedor_id, items, observaciones }, userId) {
  const { data: solicitud, error: solicitudError } = await supabase
    .from("solicitudes")
    .insert([{ proveedor_id, estado: 'pendiente', created_by: userId, observaciones }])
    .select()
    .single();
  if (solicitudError) throw solicitudError;

  // Insertar items
  const itemsData = items.map(item => ({
    solicitud_id: solicitud.id,
    catalogo_producto_id: item.id,
    cantidad_solicitada: item.cantidad,
    unidad: item.unidad,
    observaciones: item.observaciones
  }));
  const { error: itemsError } = await supabase.from("solicitud_items").insert(itemsData);
  if (itemsError) throw itemsError;

  return solicitud;
}

export async function updateSolicitudEstado(id, estado, approvedBy) {
  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado, approved_by: approvedBy })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Funciones para productos (actualizado para usar tabla intermedia proveedor_productos)
export async function listProductos(proveedorId) {
  const { data, error } = await supabase
    .from("proveedor_productos")
    .select(`
      catalogo_productos (*)
    `)
    .eq("proveedor_id", proveedorId);
  if (error) throw error;
  return data.map(item => item.catalogo_productos);  // Devuelve los productos asociados
}

// Nueva función: Asociar un producto a un proveedor
export async function asociarProductoAProveedor(proveedorId, productoId) {
  const { data, error } = await supabase
    .from("proveedor_productos")
    .insert([{ proveedor_id: proveedorId, catalogo_producto_id: productoId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Nueva función: Desasociar un producto de un proveedor
export async function desasociarProductoDeProveedor(proveedorId, productoId) {
  const { error } = await supabase
    .from("proveedor_productos")
    .delete()
    .eq("proveedor_id", proveedorId)
    .eq("catalogo_producto_id", productoId);
  if (error) throw error;
  return true;
}

// Nueva función: Listar todos los productos (para asociar manualmente si es necesario)
export async function listAllProductos() {
  const { data, error } = await supabase
    .from("catalogo_productos")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

// Funciones para facturas
export async function listFacturas() {
  const { data, error } = await supabase
    .from("facturas")
    .select(`
      *,
      proveedor:proveedores(nombre, nit),
      solicitud:solicitudes(id, estado),
      created_by_user:users_profiles!facturas_created_by_fkey(nombre)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFactura({ solicitud_id, proveedor_id, numero_factura, fecha_factura, items, pdf_url }, userId) {
  const valor_total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  const { data: factura, error: facturaError } = await supabase
    .from("facturas")
    .insert([{ solicitud_id, proveedor_id, numero_factura, fecha_factura, valor_total, pdf_url, created_by: userId }])
    .select()
    .single();
  if (facturaError) throw facturaError;

  // Insertar items
  const itemsData = items.map(item => ({
    factura_id: factura.id,
    catalogo_producto_id: item.id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario
  }));
  const { error: itemsError } = await supabase.from("factura_items").insert(itemsData);
  if (itemsError) throw itemsError;

  return factura;
}