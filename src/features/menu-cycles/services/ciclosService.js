// ========================================
// CICLOS SERVICE
// CRUD ciclos_menu + ciclo_dia_servicios
// ========================================

import { supabase } from '@/shared/api';
import { SERVICIOS } from '@/shared/types/menu';

export const ciclosService = {

  // ========================================
  // LECTURA
  // ========================================

  async getCiclosActivos(operacionId) {
    const { data, error } = await supabase
      .from('ciclos_menu')
      .select('*')
      .eq('operacion_id', operacionId)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getCicloCompleto(cicloId) {
    // Obtener ciclo base
    const { data: ciclo, error: cicloError } = await supabase
      .from('ciclos_menu')
      .select('*, operaciones(*)')
      .eq('id', cicloId)
      .single();

    if (cicloError) return { data: null, error: cicloError };

    // Obtener todos los dias+servicios con sus componentes
    const { data: dias, error: diasError } = await supabase
      .from('ciclo_dia_servicios')
      .select(`
        *,
        menu_componentes (
          *,
          componentes_plato (*),
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento)
        )
      `)
      .eq('ciclo_id', cicloId)
      .order('numero_dia')
      .order('servicio');

    if (diasError) return { data: null, error: diasError };

    return {
      data: { ...ciclo, dias: dias || [] },
      error: null,
    };
  },

  async getProgresoCiclo(cicloId) {
    const { data, error } = await supabase
      .from('ciclo_dia_servicios')
      .select('numero_dia, servicio, completo')
      .eq('ciclo_id', cicloId);

    if (error) return { data: null, error };

    const total = data.length;
    const completos = data.filter(d => d.completo).length;

    // Agrupar por dia para mini-calendario
    const diasMap = {};
    data.forEach(d => {
      if (!diasMap[d.numero_dia]) {
        diasMap[d.numero_dia] = { dia: d.numero_dia, servicios: [], completo: true };
      }
      diasMap[d.numero_dia].servicios.push({
        servicio: d.servicio,
        completo: d.completo,
      });
      if (!d.completo) diasMap[d.numero_dia].completo = false;
    });

    return {
      data: {
        total,
        completos,
        porcentaje: total > 0 ? Math.round((completos / total) * 100) : 0,
        dias: Object.values(diasMap),
      },
      error: null,
    };
  },

  // ========================================
  // CREACION
  // ========================================

  async crearCiclo(operacionId, nombre, fechaInicio, diaActual = 1) {
    // 1. Obtener cantidad de ciclos de la operacion
    const { data: operacion, error: opError } = await supabase
      .from('operaciones')
      .select('cantidad_ciclos')
      .eq('id', operacionId)
      .single();

    if (opError) return { data: null, error: opError };

    // 2. Crear ciclo
    const { data: ciclo, error: cicloError } = await supabase
      .from('ciclos_menu')
      .insert({
        operacion_id: operacionId,
        nombre,
        fecha_inicio: fechaInicio,
        dia_actual_ciclo: diaActual,
        estado: 'borrador',
      })
      .select()
      .single();

    if (cicloError) return { data: null, error: cicloError };

    // 3. Generar dias x servicios principales (desayuno, almuerzo, cena, onces)
    const serviciosPrincipales = ['desayuno', 'almuerzo', 'cena', 'onces'];
    const registrosDias = [];

    for (let dia = 1; dia <= operacion.cantidad_ciclos; dia++) {
      for (const servicio of serviciosPrincipales) {
        registrosDias.push({
          ciclo_id: ciclo.id,
          numero_dia: dia,
          servicio,
          completo: false,
        });
      }
    }

    const { error: diasError } = await supabase
      .from('ciclo_dia_servicios')
      .insert(registrosDias);

    if (diasError) return { data: null, error: diasError };

    return { data: ciclo, error: null };
  },

  // ========================================
  // ACTUALIZACION
  // ========================================

  async actualizarDiaActual(cicloId, dia) {
    const { data, error } = await supabase
      .from('ciclos_menu')
      .update({ dia_actual_ciclo: dia, updated_at: new Date().toISOString() })
      .eq('id', cicloId)
      .select()
      .single();
    return { data, error };
  },

  async activarCiclo(cicloId) {
    // Verificar que todos los dias tengan al menos 1 componente
    const { data: dias } = await supabase
      .from('ciclo_dia_servicios')
      .select('id, numero_dia, servicio, completo')
      .eq('ciclo_id', cicloId);

    const incompletos = dias?.filter(d => !d.completo) || [];

    if (incompletos.length > 0) {
      return {
        data: null,
        error: {
          message: `Hay ${incompletos.length} servicios sin completar`,
          detalles: incompletos,
        },
      };
    }

    // Desactivar ciclos anteriores de la misma operacion
    const { data: ciclo } = await supabase
      .from('ciclos_menu')
      .select('operacion_id')
      .eq('id', cicloId)
      .single();

    if (ciclo) {
      await supabase
        .from('ciclos_menu')
        .update({ estado: 'finalizado', activo: false, updated_at: new Date().toISOString() })
        .eq('operacion_id', ciclo.operacion_id)
        .eq('estado', 'activo');
    }

    // Activar este ciclo
    const { data, error } = await supabase
      .from('ciclos_menu')
      .update({
        estado: 'activo',
        validado: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cicloId)
      .select()
      .single();

    return { data, error };
  },

  async copiarDia(cicloId, diaOrigen, diaDestino) {
    // Obtener componentes del dia origen para todos los servicios
    const { data: diasOrigen } = await supabase
      .from('ciclo_dia_servicios')
      .select('id, servicio, menu_componentes(*)')
      .eq('ciclo_id', cicloId)
      .eq('numero_dia', diaOrigen);

    if (!diasOrigen || diasOrigen.length === 0) {
      return { data: null, error: { message: 'Dia origen sin datos' } };
    }

    // Para cada servicio del dia origen, copiar componentes al destino
    for (const diaOrig of diasOrigen) {
      // Buscar el dia destino correspondiente
      const { data: diasDest } = await supabase
        .from('ciclo_dia_servicios')
        .select('id')
        .eq('ciclo_id', cicloId)
        .eq('numero_dia', diaDestino)
        .eq('servicio', diaOrig.servicio)
        .single();

      if (!diasDest) continue;

      // Eliminar componentes existentes del destino
      await supabase
        .from('menu_componentes')
        .delete()
        .eq('ciclo_dia_servicio_id', diasDest.id);

      // Copiar componentes
      if (diaOrig.menu_componentes && diaOrig.menu_componentes.length > 0) {
        const nuevosComponentes = diaOrig.menu_componentes.map(mc => ({
          ciclo_dia_servicio_id: diasDest.id,
          componente_id: mc.componente_id,
          receta_id: mc.receta_id,
          orden: mc.orden,
          opciones_carta: mc.opciones_carta,
        }));

        await supabase.from('menu_componentes').insert(nuevosComponentes);
      }
    }

    return { data: { copiado: true, origen: diaOrigen, destino: diaDestino }, error: null };
  },

  // ========================================
  // SERVICIOS DE UN DIA
  // ========================================

  async getDiaServicios(cicloId, numeroDia) {
    const { data, error } = await supabase
      .from('ciclo_dia_servicios')
      .select(`
        *,
        menu_componentes (
          *,
          componentes_plato (*),
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento)
        )
      `)
      .eq('ciclo_id', cicloId)
      .eq('numero_dia', numeroDia)
      .order('servicio');

    return { data, error };
  },

  async marcarDiaCompleto(cicloDiaServicioId, completo = true) {
    const { data, error } = await supabase
      .from('ciclo_dia_servicios')
      .update({ completo })
      .eq('id', cicloDiaServicioId)
      .select()
      .single();
    return { data, error };
  },
};
