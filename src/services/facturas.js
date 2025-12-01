// src/services/facturas.js
import { supabase } from "../lib/supabase";

/**
 * Obtener facturas
 */
export const getFacturas = async () => {
  const { data, error } = await supabase
    .from("facturas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Crear factura
 */
export const crearFactura = async (factura) => {
  const { data, error } = await supabase
    .from("facturas")
    .insert([factura])
    .select()
    .single();

  if (error) throw error;
  return data;
};
