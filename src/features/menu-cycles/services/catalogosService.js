// ========================================
// CATALOGOS SERVICE - Tipos de Dieta + Componentes
// ========================================

import { supabase } from '@/shared/api';

export const catalogosService = {

  // ========================================
  // TIPOS DE DIETA
  // ========================================

  async getTiposDieta() {
    const { data, error } = await supabase
      .from('tipos_dieta')
      .select('*')
      .eq('activo', true)
      .order('orden');
    return { data, error };
  },

  async getTiposDietaPorCategoria(categoria) {
    const { data, error } = await supabase
      .from('tipos_dieta')
      .select('*')
      .eq('categoria', categoria)
      .eq('activo', true)
      .order('orden');
    return { data, error };
  },

  // ========================================
  // COMPONENTES DE PLATO
  // ========================================

  async getComponentesPlato() {
    const { data, error } = await supabase
      .from('componentes_plato')
      .select('*')
      .eq('activo', true)
      .order('orden');
    return { data, error };
  },

  async crearComponente(datos) {
    const { data, error } = await supabase
      .from('componentes_plato')
      .insert({
        codigo: datos.codigo,
        nombre: datos.nombre,
        orden: datos.orden || 99,
        es_fijo: false,
      })
      .select()
      .single();
    return { data, error };
  },
};
