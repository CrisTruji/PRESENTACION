// ========================================
// useChatNotifications — Listener global de mensajes en tiempo real.
// Se monta una sola vez en Navbar. Muestra toasts estilo WhatsApp
// cuando llega un mensaje y el chat está cerrado o en otra conversación.
// Usa createElement (no JSX) para poder vivir en un archivo .js puro.
// ========================================
import { useEffect, useRef, useCallback } from 'react';
import { createElement }  from 'react';
import { toast }          from 'sonner';
import { useAuth }        from '@/features/auth';
import { chatService }    from '../services/chatService';
import { useChatStore }   from '../store/useChatStore';

export function useChatNotifications() {
  const { user } = useAuth();
  const { isOpen, conversacionActivaId, incrementarNoLeidos, abrirConversacion } = useChatStore();

  // Refs para leer el estado actual dentro de callbacks de Realtime
  const isOpenRef    = useRef(isOpen);
  const convActivaRef = useRef(conversacionActivaId);
  const canalRef     = useRef(null);

  useEffect(() => { isOpenRef.current = isOpen; },              [isOpen]);
  useEffect(() => { convActivaRef.current = conversacionActivaId; }, [conversacionActivaId]);

  // ── Toast estilo WhatsApp ─────────────────────────────
  const mostrarChatToast = useCallback((mensaje, nombreRemitente) => {
    const preview = mensaje.contenido?.length > 65
      ? mensaje.contenido.slice(0, 65) + '…'
      : mensaje.contenido;
    const inicial = nombreRemitente?.charAt(0)?.toUpperCase() || '?';

    toast.custom(
      (t) => createElement('button', {
        onClick: () => { abrirConversacion(mensaje.conversacion_id); toast.dismiss(t); },
        style: {
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)', padding: '12px 16px', width: '320px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', cursor: 'pointer', textAlign: 'left',
        },
      },
        // Avatar
        createElement('div', {
          style: {
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--color-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '600', fontSize: '1rem', flexShrink: 0,
          },
        }, inicial),
        // Cuerpo
        createElement('div', { style: { flex: 1, minWidth: 0 } },
          createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' } },
            createElement('span', { style: { fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-primary)' } }, nombreRemitente || 'Mensaje nuevo'),
            createElement('span', { style: { fontSize: '0.7rem', color: 'var(--color-text-muted)' } }, 'Ahora'),
          ),
          createElement('p', {
            style: { fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          }, preview),
        ),
      ),
      { duration: 5000, position: 'bottom-right' },
    );
  }, [abrirConversacion]);

  // ── Suscripción global ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const iniciarSuscripcion = async () => {
      const { data: convIds, error } = await chatService.getMisConversacionIds(user.id);
      if (error || !convIds?.length || !mounted) return;

      canalRef.current = chatService.suscribirMensajesGlobales(convIds, async (nuevoMensaje) => {
        if (nuevoMensaje.remitente_id === user.id) return;
        if (isOpenRef.current && convActivaRef.current === nuevoMensaje.conversacion_id) return;

        incrementarNoLeidos(nuevoMensaje.conversacion_id);

        // Buscar nombre del remitente para el toast
        let nombreRemitente = 'Compañero';
        try {
          const { supabase } = await import('@/shared/api');
          const { data: perfil } = await supabase
            .from('profiles').select('nombre').eq('id', nuevoMensaje.remitente_id).single();
          if (perfil?.nombre) nombreRemitente = perfil.nombre;
        } catch (_) { /* fallback silencioso */ }

        mostrarChatToast(nuevoMensaje, nombreRemitente);
      });
    };

    iniciarSuscripcion();

    return () => {
      mounted = false;
      chatService.desuscribir(canalRef.current);
      canalRef.current = null;
    };
  }, [user?.id, incrementarNoLeidos, mostrarChatToast]);
}
