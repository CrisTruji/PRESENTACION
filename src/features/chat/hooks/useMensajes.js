// ========================================
// useMensajes — Historial, Realtime, envío y estado de lectura (checks)
// ========================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth }      from '@/features/auth';
import { chatService }  from '../services/chatService';
import { supabase }     from '@/shared/api';

export function useMensajes(conversacionId) {
  const { user, profile }  = useAuth();
  const [mensajes,         setMensajes]         = useState([]);
  const [isLoading,        setIsLoading]        = useState(false);
  const [enviando,         setEnviando]         = useState(false);
  const [ultimoVistoOtro,  setUltimoVistoOtro]  = useState(null);

  const canalMensajesRef      = useRef(null);
  const canalParticipantesRef = useRef(null);

  // ── Cargar historial ──────────────────────────────────
  const cargarMensajes = useCallback(async () => {
    if (!conversacionId) return;
    setIsLoading(true);
    const { data, error } = await chatService.getMensajes(conversacionId);
    if (error) console.error('[Chat] Error cargando mensajes:', error);
    else setMensajes(data || []);
    setIsLoading(false);
  }, [conversacionId]);

  // ── Cargar ultimo_visto del otro participante ─────────
  const cargarUltimoVistoOtro = useCallback(async () => {
    if (!conversacionId || !user?.id) return;
    const { data, error } = await supabase
      .from('chat_participantes')
      .select('usuario_id, ultimo_visto')
      .eq('conversacion_id', conversacionId)
      .neq('usuario_id', user.id)
      .single();
    if (!error && data?.ultimo_visto) setUltimoVistoOtro(new Date(data.ultimo_visto));
  }, [conversacionId, user?.id]);

  // ── Suscripciones Realtime ────────────────────────────
  useEffect(() => {
    if (!conversacionId) {
      setMensajes([]);
      setUltimoVistoOtro(null);
      return;
    }

    cargarMensajes();
    cargarUltimoVistoOtro();
    if (user?.id) chatService.actualizarUltimoVisto(conversacionId, user.id);

    // Canal 1: mensajes nuevos
    canalMensajesRef.current = chatService.suscribirMensajes(
      conversacionId,
      (nuevoMensaje) => {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === nuevoMensaje.id)) return prev;
          return [...prev, { ...nuevoMensaje, remitente: null }];
        });
        if (user?.id) chatService.actualizarUltimoVisto(conversacionId, user.id);
      }
    );

    // Canal 2: cambios en ultimo_visto → actualiza checks en tiempo real
    canalParticipantesRef.current = supabase
      .channel(`chat-visto-${conversacionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_participantes',
        filter: `conversacion_id=eq.${conversacionId}`,
      }, (payload) => {
        if (payload.new?.usuario_id !== user?.id) {
          setUltimoVistoOtro(new Date(payload.new.ultimo_visto));
        }
      })
      .subscribe();

    return () => {
      chatService.desuscribir(canalMensajesRef.current);
      supabase.removeChannel(canalParticipantesRef.current);
      canalMensajesRef.current      = null;
      canalParticipantesRef.current = null;
    };
  }, [conversacionId, user?.id, cargarMensajes, cargarUltimoVistoOtro]);

  // ── Enviar mensaje con actualización optimista ────────
  const enviarMensaje = useCallback(async (contenido) => {
    if (!contenido?.trim() || !conversacionId || !user?.id) return;
    setEnviando(true);

    const tempId      = `temp-${Date.now()}`;
    const perfilPropio = {
      id:     user.id,
      nombre: profile?.nombre || user.email || 'Tú',
      email:  user.email || '',
    };

    // Mensaje optimista inmediato
    setMensajes((prev) => [...prev, {
      id:           tempId,
      contenido:    contenido.trim(),
      creado_en:    new Date().toISOString(),
      remitente_id: user.id,
      remitente:    perfilPropio,
      tipo:         'texto',
      _optimista:   true,
    }]);

    const { data, error } = await chatService.enviarMensaje({
      conversacionId,
      remitenteId:     user.id,
      contenido,
      perfilRemitente: perfilPropio,
    });

    if (error) {
      console.error('[Chat] Error enviando mensaje:', error);
      // Marcar como fallido (muestra X roja en la burbuja)
      setMensajes((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, _optimista: false, _fallido: true } : m)
      );
    } else if (data) {
      // Reemplazar optimista con mensaje real de la DB
      setMensajes((prev) => prev.map((m) => m.id === tempId ? data : m));
    }

    setEnviando(false);
  }, [conversacionId, user?.id, user?.email, profile?.nombre]);

  return { mensajes, isLoading, enviando, enviarMensaje, ultimoVistoOtro };
}
