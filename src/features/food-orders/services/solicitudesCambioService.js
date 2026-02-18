// ========================================
// SOLICITUDES CAMBIO SERVICE
// CRUD solicitudes_cambio_menu
// ========================================

import { supabase } from '@/shared/api';

export const solicitudesCambioService = {

  async getPendientes() {
    const { data, error } = await supabase
      .from('solicitudes_cambio_menu')
      .select(`
        *,
        pedidos_servicio (operacion_id, fecha, servicio, operaciones(nombre)),
        menu_componentes (componentes_plato(nombre), arbol_recetas(nombre)),
        arbol_recetas!solicitudes_cambio_menu_receta_solicitada_id_fkey (nombre)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async getPorPedido(pedidoId) {
    const { data, error } = await supabase
      .from('solicitudes_cambio_menu')
      .select('*, menu_componentes(componentes_plato(nombre))')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async crear(datos) {
    const { data, error } = await supabase
      .from('solicitudes_cambio_menu')
      .insert({
        pedido_id: datos.pedido_id,
        menu_componente_id: datos.menu_componente_id,
        receta_solicitada_id: datos.receta_solicitada_id || null,
        motivo: datos.motivo,
      })
      .select()
      .single();

    return { data, error };
  },

  async aprobar(solicitudId, aprobadoPor, respuesta = null) {
    const { data, error } = await supabase
      .from('solicitudes_cambio_menu')
      .update({
        estado: 'aprobada',
        aprobado_por: aprobadoPor,
        respuesta,
        fecha_decision: new Date().toISOString(),
      })
      .eq('id', solicitudId)
      .select()
      .single();

    return { data, error };
  },

  async rechazar(solicitudId, aprobadoPor, respuesta) {
    const { data, error } = await supabase
      .from('solicitudes_cambio_menu')
      .update({
        estado: 'rechazada',
        aprobado_por: aprobadoPor,
        respuesta,
        fecha_decision: new Date().toISOString(),
      })
      .eq('id', solicitudId)
      .select()
      .single();

    return { data, error };
  },
};
