// ========================================
// OPERACIONES SERVICE
// CRUD para operaciones (agrupaciones de unidades)
// ========================================

import { supabase } from '@/shared/api';

export const operacionesService = {

  async getAll() {
    const { data, error } = await supabase
      .from('operaciones')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    return { data, error };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('operaciones')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async getConCicloActivo() {
    // Trae operaciones con su ciclo activo (si existe)
    const { data: operaciones, error: opError } = await supabase
      .from('operaciones')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (opError) return { data: null, error: opError };

    // Para cada operacion, buscar ciclo activo
    const resultados = await Promise.all(
      operaciones.map(async (op) => {
        const { data: ciclos } = await supabase
          .from('ciclos_menu')
          .select('id, nombre, estado, dia_actual_ciclo, fecha_inicio, validado, created_at')
          .eq('operacion_id', op.id)
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(1);

        const cicloActivo = ciclos && ciclos.length > 0 ? ciclos[0] : null;

        // Si hay ciclo, obtener progreso
        let progreso = null;
        if (cicloActivo) {
          const { data: dias } = await supabase
            .from('ciclo_dia_servicios')
            .select('completo')
            .eq('ciclo_id', cicloActivo.id);

          if (dias && dias.length > 0) {
            const completos = dias.filter(d => d.completo).length;
            progreso = {
              total: dias.length,
              completos,
              porcentaje: Math.round((completos / dias.length) * 100),
            };
          }
        }

        return { ...op, cicloActivo, progreso };
      })
    );

    return { data: resultados, error: null };
  },

  async crear(datos) {
    const { data, error } = await supabase
      .from('operaciones')
      .insert({
        codigo: datos.codigo,
        nombre: datos.nombre,
        unidad_medica_codigo: datos.unidad_medica_codigo || null,
        cantidad_ciclos: datos.cantidad_ciclos,
        tipo_operacion: datos.tipo_operacion || 'ciclico',
      })
      .select()
      .single();
    return { data, error };
  },

  async actualizar(id, datos) {
    const { data, error } = await supabase
      .from('operaciones')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};
