// src/services/productos.js
import { supabase } from "../lib/supabase";

/**
 * Obtener productos
 */
export const getProductos = async () => {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre");

  if (error) throw error;
  return data;
};

/**
 * Crear producto
 */
export const crearProducto = async (producto) => {
  const { data, error } = await supabase
    .from("productos")
    .insert([producto])
    .select()
    .single();

  if (error) throw error;
  return data;
};
