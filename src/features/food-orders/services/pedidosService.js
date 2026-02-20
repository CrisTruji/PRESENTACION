// ========================================
// PEDIDOS SERVICE
// CRUD pedidos_servicio + items + pacientes
// ========================================

import { supabase } from '@/shared/api';

export const pedidosService = {

  // ========================================
  // PEDIDOS
  // ========================================

  async getPedidoDelDia(operacionId, fecha, servicio) {
    const { data, error } = await supabase
      .from('pedidos_servicio')
      .select(`
        *,
        pedido_items_servicio (*, tipos_dieta(*)),
        pedido_pacientes (*, tipos_dieta(*))
      `)
      .eq('operacion_id', operacionId)
      .eq('fecha', fecha)
      .eq('servicio', servicio)
      .maybeSingle();

    return { data, error };
  },

  async getPedidosPorFecha(fecha, servicio = null) {
    let query = supabase
      .from('pedidos_servicio')
      .select(`
        *,
        operaciones(codigo, nombre, tipo_operacion),
        pedido_items_servicio(
          id, cantidad, opcion_seleccionada,
          tipos_dieta(codigo, nombre, categoria),
          menu_componentes(
            id,
            componentes_plato(codigo, nombre, orden),
            arbol_recetas(id, codigo, nombre),
            opciones_carta
          )
        )
      `)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false });

    if (servicio) query = query.eq('servicio', servicio);

    const { data, error } = await query;
    return { data, error };
  },

  async crearPedido(datos) {
    // Calcular dia del ciclo via RPC
    const { data: diaCiclo, error: rpcError } = await supabase
      .rpc('calcular_dia_ciclo', {
        p_operacion_id: datos.operacion_id,
        p_fecha: datos.fecha,
      });

    if (rpcError || diaCiclo === null) {
      return {
        data: null,
        error: rpcError || { message: 'No hay ciclo activo para esta operacion' },
      };
    }

    const { data, error } = await supabase
      .from('pedidos_servicio')
      .insert({
        operacion_id: datos.operacion_id,
        fecha: datos.fecha,
        servicio: datos.servicio,
        dia_ciclo_calculado: diaCiclo,
        estado: 'borrador',
        observaciones: datos.observaciones || null,
      })
      .select()
      .single();

    return { data, error };
  },

  async enviarPedido(pedidoId) {
    // Obtener pedido con hora limite
    const { data: pedido } = await supabase
      .from('pedidos_servicio')
      .select('*, operaciones(id)')
      .eq('id', pedidoId)
      .single();

    if (!pedido) return { data: null, error: { message: 'Pedido no encontrado' } };

    // Verificar hora limite
    const { data: servUnidad } = await supabase
      .from('servicios_unidad')
      .select('hora_limite')
      .eq('operacion_id', pedido.operacion_id)
      .eq('servicio', pedido.servicio)
      .maybeSingle();

    const ahora = new Date();
    let enviadoEnHora = true;

    if (servUnidad?.hora_limite) {
      const [h, m] = servUnidad.hora_limite.split(':');
      const limite = new Date();
      limite.setHours(parseInt(h), parseInt(m), 0, 0);
      enviadoEnHora = ahora <= limite;
    }

    const { data, error } = await supabase
      .from('pedidos_servicio')
      .update({
        estado: 'enviado',
        hora_envio: ahora.toISOString(),
        enviado_en_hora: enviadoEnHora,
        puede_editar: false,
        updated_at: ahora.toISOString(),
      })
      .eq('id', pedidoId)
      .select()
      .single();

    return { data, error };
  },

  // ========================================
  // ITEMS (cantidades por dieta)
  // ========================================

  async guardarItems(pedidoId, items) {
    // items: [{ tipo_dieta_id, cantidad, gramaje_aplicado, observaciones }]
    // Eliminar items existentes y reemplazar
    await supabase
      .from('pedido_items_servicio')
      .delete()
      .eq('pedido_id', pedidoId);

    if (!items || items.length === 0) return { data: [], error: null };

    const registros = items
      .filter(item => item.cantidad > 0)
      .map(item => ({
        pedido_id: pedidoId,
        tipo_dieta_id: item.tipo_dieta_id,
        cantidad: item.cantidad,
        gramaje_aplicado: item.gramaje_aplicado || null,
        menu_componente_id: item.menu_componente_id || null,
        opcion_seleccionada: item.opcion_seleccionada || null,
        observaciones: item.observaciones || null,
      }));

    const { data, error } = await supabase
      .from('pedido_items_servicio')
      .insert(registros)
      .select();

    return { data, error };
  },

  // ========================================
  // PACIENTES (solo Alcala/Presentes)
  // ========================================

  async guardarPacientes(pedidoId, pacientes) {
    // Eliminar existentes y reemplazar
    await supabase
      .from('pedido_pacientes')
      .delete()
      .eq('pedido_id', pedidoId);

    if (!pacientes || pacientes.length === 0) return { data: [], error: null };

    const registros = pacientes.map(p => ({
      pedido_id: pedidoId,
      nombre: p.nombre,
      identificacion: p.identificacion,
      cuarto: p.cuarto,
      tipo_dieta_id: p.tipo_dieta_id,
      alergias: p.alergias || null,
      observaciones: p.observaciones || null,
    }));

    const { data, error } = await supabase
      .from('pedido_pacientes')
      .insert(registros)
      .select();

    return { data, error };
  },

  // ========================================
  // MENU DEL DIA (para la unidad)
  // ========================================

  async getMenuDelDia(operacionId, fecha) {
    // 1. Calcular dia del ciclo
    const { data: diaCiclo } = await supabase
      .rpc('calcular_dia_ciclo', {
        p_operacion_id: operacionId,
        p_fecha: fecha,
      });

    if (!diaCiclo) return { data: null, error: { message: 'No hay ciclo activo' } };

    // 2. Obtener ciclo activo (maybeSingle evita error si hay 0 o >1 resultados)
    const { data: ciclos } = await supabase
      .from('ciclos_menu')
      .select('id, nombre')
      .eq('operacion_id', operacionId)
      .eq('activo', true)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
      .limit(1);

    const ciclo = ciclos?.[0] ?? null;
    if (!ciclo) return { data: null, error: null };

    // 3. Obtener componentes del dia
    const { data: dias, error } = await supabase
      .from('ciclo_dia_servicios')
      .select(`
        *,
        menu_componentes (
          *,
          componentes_plato (*),
          arbol_recetas (id, codigo, nombre, costo_porcion)
        )
      `)
      .eq('ciclo_id', ciclo.id)
      .eq('numero_dia', diaCiclo)
      .order('servicio');

    return {
      data: {
        ciclo,
        diaCiclo,
        fecha,
        servicios: dias || [],
      },
      error,
    };
  },
};
