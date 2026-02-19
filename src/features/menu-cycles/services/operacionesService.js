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
    // Query única: operaciones + ciclos activos + días del ciclo (1 round-trip en vez de N+1)
    const { data, error } = await supabase
      .from('operaciones')
      .select(`
        *,
        ciclos_menu (
          id, nombre, estado, dia_actual_ciclo, fecha_inicio, validado, created_at,
          ciclo_dia_servicios (numero_dia, servicio, completo)
        )
      `)
      .eq('activo', true)
      .eq('ciclos_menu.activo', true)
      .order('nombre');

    if (error) return { data: null, error };

    // Calcular progreso y estado de días en memoria (sin más queries)
    const resultado = (data || []).map((op) => {
      // ciclos_menu puede tener 0, 1 o más ciclos activos — tomar el más reciente
      const ciclos = (op.ciclos_menu || []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      const cicloRaw = ciclos[0] ?? null;

      if (!cicloRaw) {
        // eslint-disable-next-line no-unused-vars
        const { ciclos_menu, ...opSinCiclos } = op;
        return { ...opSinCiclos, cicloActivo: null, progreso: null };
      }

      const dias = cicloRaw.ciclo_dia_servicios || [];

      // Agrupar por numero_dia para el mini-calendario PRIMERO
      const diasMap = {};
      dias.forEach((d) => {
        if (!diasMap[d.numero_dia]) {
          diasMap[d.numero_dia] = { numero_dia: d.numero_dia, servicios: [], completo: true };
        }
        diasMap[d.numero_dia].servicios.push({ servicio: d.servicio, completo: d.completo });
        if (!d.completo) diasMap[d.numero_dia].completo = false;
      });

      // Calcular totales basados en DÍAS ÚNICOS (no filas día×servicio)
      // Fix: antes dias.length = 21 días × 4 servicios = 84 para Alcalá → ahora 21
      const totalDias = Object.keys(diasMap).length;
      const completos = Object.values(diasMap).filter((d) => d.completo).length;
      const progresoPct = totalDias > 0 ? Math.round((completos / totalDias) * 100) : 0;

      // eslint-disable-next-line no-unused-vars
      const { ciclo_dia_servicios, ...cicloBase } = cicloRaw;
      const cicloActivo = {
        ...cicloBase,
        diasCompletos: completos,
        diasTotales: totalDias,
        progreso: progresoPct,
        diasData: Object.values(diasMap),
      };

      const progreso = totalDias > 0
        ? { total: totalDias, completos, porcentaje: progresoPct }
        : null;

      // eslint-disable-next-line no-unused-vars
      const { ciclos_menu, ...opBase } = op;
      return { ...opBase, cicloActivo, progreso };
    });

    return { data: resultado, error: null };
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
