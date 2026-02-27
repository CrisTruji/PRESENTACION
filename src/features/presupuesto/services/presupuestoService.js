// ========================================
// PRESUPUESTO SERVICE
// ========================================

import { supabase } from '@/shared/api';

export const presupuestoService = {
  async getPresupuestoMes(mes) {
    const mesInicio = mes + '-01';
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*, presupuesto_items(*)')
      .eq('mes', mesInicio)
      .maybeSingle();
    return { data, error };
  },

  async crearPresupuesto({ mes, presupuestado, notas, creado_por, items = [] }) {
    const mesInicio = mes + '-01';
    const { data, error } = await supabase
      .from('presupuestos')
      .insert({ mes: mesInicio, presupuestado, notas, creado_por })
      .select()
      .single();
    if (error) return { data: null, error };

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('presupuesto_items')
        .insert(items.map((i) => ({ presupuesto_id: data.id, ...i })));
      if (itemsError) return { data, error: itemsError };
    }
    return { data, error: null };
  },

  async actualizarPresupuesto(id, { presupuestado, notas, items = [] }) {
    const { data, error } = await supabase
      .from('presupuestos')
      .update({ presupuestado, notas, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };

    // Reemplazar items
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id);
    if (items.length > 0) {
      await supabase
        .from('presupuesto_items')
        .insert(items.map((i) => ({ presupuesto_id: id, ...i })));
    }
    return { data, error: null };
  },

  async getGastoReal(mes) {
    const mesDate = mes + '-01';
    const { data, error } = await supabase
      .rpc('calcular_gasto_real_mes', { p_mes: mesDate });
    return { data, error };
  },
};
