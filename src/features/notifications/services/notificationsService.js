// ========================================
// NOTIFICATIONS SERVICE
// ========================================

import { supabase } from '@/shared/api';

export const notificationsService = {
  async getUnread(userId) {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', userId)
      .eq('estado', 'sin_leer')
      .order('creado_en', { ascending: false })
      .limit(50);
    return { data, error };
  },

  async markRead(id) {
    const { data, error } = await supabase
      .from('notificaciones')
      .update({ estado: 'leido', leido_en: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async markAllRead(userId) {
    const { error } = await supabase
      .from('notificaciones')
      .update({ estado: 'leido', leido_en: new Date().toISOString() })
      .eq('usuario_id', userId)
      .eq('estado', 'sin_leer');
    return { error };
  },

  subscribeToNew(userId, callback) {
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
    return channel;
  },
};
