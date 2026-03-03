// ========================================
// CHAT SERVICE
// Todas las operaciones con Supabase para el módulo de chat empresarial.
// Solo chats 1-a-1 (sin grupos por diseño empresarial).
// ========================================

import { supabase } from '@/shared/api';

export const chatService = {

  // =====================================================
  // 📋 USUARIOS
  // =====================================================

  /**
   * Obtiene todos los usuarios activos (excepto el propio).
   * profiles.rol es UUID → join con roles para traer el nombre legible.
   */
  async getUsuariosEmpresa(miUserId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, email, rol_info:roles(nombre)')
      .eq('estado', 'activo')
      .neq('id', miUserId)
      .order('nombre', { ascending: true });

    if (error) return { data: null, error };

    return {
      data: (data || []).map((u) => ({
        id:     u.id,
        nombre: u.nombre,
        email:  u.email,
        rol:    u.rol_info?.nombre || null,
      })),
      error: null,
    };
  },

  // =====================================================
  // 💬 CONVERSACIONES
  // =====================================================

  /**
   * Obtiene todas las conversaciones del usuario con queries planas
   * (sin joins anidados que rompen el schema cache de PostgREST).
   */
  async getConversaciones(userId) {
    // 1. Participaciones del usuario
    const { data: participaciones, error: errPart } = await supabase
      .from('chat_participantes')
      .select('conversacion_id, ultimo_visto')
      .eq('usuario_id', userId);

    if (errPart || !participaciones?.length) return { data: [], error: errPart };
    const convIds = participaciones.map((p) => p.conversacion_id);

    // 2. Datos de las conversaciones
    const { data: convs, error: errConvs } = await supabase
      .from('chat_conversaciones')
      .select('id, creado_en')
      .in('id', convIds);
    if (errConvs) return { data: [], error: errConvs };

    // 3. El otro participante de cada conversación
    const { data: otrosParticipantes, error: errOtros } = await supabase
      .from('chat_participantes')
      .select('conversacion_id, usuario_id')
      .in('conversacion_id', convIds)
      .neq('usuario_id', userId);
    if (errOtros) return { data: [], error: errOtros };

    // 4. Perfiles con nombre del rol
    const otrosIds = [...new Set(otrosParticipantes.map((p) => p.usuario_id))];
    let perfiles = [];
    if (otrosIds.length > 0) {
      const { data: pd, error: ep } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol_info:roles(nombre)')
        .in('id', otrosIds);
      if (ep) return { data: [], error: ep };
      perfiles = (pd || []).map((u) => ({
        id: u.id, nombre: u.nombre, email: u.email,
        rol: u.rol_info?.nombre || null,
      }));
    }

    // 5. Último mensaje de cada conversación
    const { data: ultimosMensajes, error: errMsg } = await supabase
      .from('chat_mensajes')
      .select('id, conversacion_id, contenido, creado_en, remitente_id')
      .in('conversacion_id', convIds)
      .order('creado_en', { ascending: false });
    if (errMsg) return { data: [], error: errMsg };

    // 6. Ensamblar
    const resultado = convs.map((conv) => {
      const miPart   = participaciones.find((p) => p.conversacion_id === conv.id);
      const otroPart = otrosParticipantes.find((p) => p.conversacion_id === conv.id);
      const perfil   = otroPart ? perfiles.find((p) => p.id === otroPart.usuario_id) : null;
      return {
        ultimo_visto: miPart?.ultimo_visto || null,
        conversacion: {
          id: conv.id,
          creado_en: conv.creado_en,
          mensajes: ultimosMensajes.filter((m) => m.conversacion_id === conv.id),
          participantes: otroPart ? [{ usuario_id: otroPart.usuario_id, perfil }] : [],
        },
      };
    });

    return { data: resultado, error: null };
  },

  /**
   * Crea o retoma conversación usando RPC SECURITY DEFINER
   * (evita el 403 por RLS durante INSERT...RETURNING).
   */
  async obtenerOCrearConversacion(miId, otroId) {
    const { data, error } = await supabase
      .rpc('crear_conversacion_directa', { p_usuario1: miId, p_usuario2: otroId });
    if (error) return { conversacionId: null, error };
    return { conversacionId: data || null, error: null };
  },

  // =====================================================
  // ✉️ MENSAJES
  // =====================================================

  /**
   * Carga el historial. Join de perfiles en query separada
   * (evita PGRST200 por FK hint faltante en schema cache).
   */
  async getMensajes(conversacionId, limit = 50) {
    const { data: mensajes, error: errMsg } = await supabase
      .from('chat_mensajes')
      .select('id, contenido, creado_en, editado_en, tipo, remitente_id')
      .eq('conversacion_id', conversacionId)
      .order('creado_en', { ascending: true })
      .limit(limit);

    if (errMsg) return { data: null, error: errMsg };
    if (!mensajes?.length) return { data: [], error: null };

    const ids = [...new Set(mensajes.map((m) => m.remitente_id))];
    const { data: perfiles, error: ep } = await supabase
      .from('profiles').select('id, nombre, email').in('id', ids);
    if (ep) return { data: null, error: ep };

    const map = Object.fromEntries((perfiles || []).map((p) => [p.id, p]));
    return {
      data: mensajes.map((m) => ({ ...m, remitente: map[m.remitente_id] || null })),
      error: null,
    };
  },

  /** Inserta un mensaje sin join (evita PGRST200). El perfil se adjunta desde el cliente. */
  async enviarMensaje({ conversacionId, remitenteId, contenido, perfilRemitente }) {
    const { data: msg, error } = await supabase
      .from('chat_mensajes')
      .insert({
        conversacion_id: conversacionId,
        remitente_id:    remitenteId,
        contenido:       contenido.trim(),
        tipo:            'texto',
      })
      .select('id, contenido, creado_en, tipo, remitente_id')
      .single();

    if (error) return { data: null, error };
    return { data: { ...msg, remitente: perfilRemitente || { id: remitenteId } }, error: null };
  },

  // =====================================================
  // 👁️ VISTO
  // =====================================================

  async actualizarUltimoVisto(conversacionId, userId) {
    await supabase
      .from('chat_participantes')
      .update({ ultimo_visto: new Date().toISOString() })
      .eq('conversacion_id', conversacionId)
      .eq('usuario_id', userId);
  },

  // =====================================================
  // 🔔 REALTIME
  // =====================================================

  suscribirMensajes(conversacionId, callback) {
    return supabase
      .channel(`chat-mensajes-${conversacionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_mensajes',
        filter: `conversacion_id=eq.${conversacionId}`,
      }, (p) => callback(p.new))
      .subscribe();
  },

  suscribirMensajesGlobales(conversacionIds, callback) {
    if (!conversacionIds?.length) return null;
    return supabase
      .channel(`chat-global-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_mensajes',
        filter: `conversacion_id=in.(${conversacionIds.join(',')})`,
      }, (p) => callback(p.new))
      .subscribe();
  },

  desuscribir(channel) {
    if (channel) supabase.removeChannel(channel);
  },

  async getMisConversacionIds(userId) {
    const { data, error } = await supabase
      .from('chat_participantes').select('conversacion_id').eq('usuario_id', userId);
    if (error) return { data: null, error };
    return { data: data.map((p) => p.conversacion_id), error: null };
  },
};
