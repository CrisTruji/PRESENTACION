// ========================================
// useConversaciones — Lista de chats y función para iniciar uno nuevo
// ========================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth }        from '@/features/auth';
import { chatService }    from '../services/chatService';
import { useChatStore }   from '../store/useChatStore';

export function useConversaciones() {
  const { user }              = useAuth();
  const { abrirConversacion } = useChatStore();

  const [conversaciones, setConversaciones] = useState([]);
  const [usuarios,       setUsuarios]       = useState([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState(null);

  // Cache de perfiles para conversaciones recién creadas (antes del primer reload)
  const perfilesCache = useRef({});

  // ── Cargar conversaciones ──────────────────────────────
  // silencioso=true → refresca datos sin activar el spinner.
  // Se usa cuando ya hay datos cargados y solo queremos actualizar en background.
  const cargarConversaciones = useCallback(async (silencioso = false) => {
    if (!user?.id) return;

    // Solo mostrar spinner si no hay datos previos o si se pide explícitamente
    if (!silencioso) setIsLoading(true);
    setError(null);

    const { data, error: err } = await chatService.getConversaciones(user.id);

    if (err) {
      console.error('[Chat] Error cargando conversaciones:', err);
      setError(err.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      const procesadas = data
        .map((p) => {
          const conv = p.conversacion;
          if (!conv) return null;

          const otroParticipante = conv.participantes?.find(
            (part) => part.usuario_id !== user.id
          );

          if (otroParticipante?.perfil) {
            perfilesCache.current[conv.id] = otroParticipante.perfil;
          }

          const mensajesOrdenados = [...(conv.mensajes || [])].sort(
            (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
          );
          const ultimoMensaje = mensajesOrdenados[0] || null;

          const ultimoVistoTs = p.ultimo_visto ? new Date(p.ultimo_visto) : null;
          const noLeidos = ultimoVistoTs
            ? conv.mensajes.filter(
                (m) => m.remitente_id !== user.id && new Date(m.creado_en) > ultimoVistoTs
              ).length
            : 0;

          return {
            id:          conv.id,
            creadoEn:    conv.creado_en,
            otroUsuario: otroParticipante?.perfil || null,
            ultimoMensaje,
            noLeidos,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const fa = a.ultimoMensaje?.creado_en || a.creadoEn;
          const fb = b.ultimoMensaje?.creado_en || b.creadoEn;
          return new Date(fb) - new Date(fa);
        });

      setConversaciones(procesadas);
    }

    setIsLoading(false);
  }, [user?.id]);

  // ── Cargar usuarios de la empresa ─────────────────────
  const cargarUsuarios = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: err } = await chatService.getUsuariosEmpresa(user.id);
    if (!err && data) setUsuarios(data);
  }, [user?.id]);

  // Carga inicial al montar — solo ocurre una vez
  useEffect(() => {
    cargarConversaciones();
    cargarUsuarios();
  }, [cargarConversaciones, cargarUsuarios]);

  // ── Iniciar o retomar conversación ────────────────────
  const iniciarConversacion = useCallback(async (otroUserId) => {
    if (!user?.id) return;

    const { conversacionId, error: err } =
      await chatService.obtenerOCrearConversacion(user.id, otroUserId);

    if (err) {
      console.error('[Chat] Error iniciando conversación:', err);
      return;
    }

    if (conversacionId) {
      const perfilOtro = usuarios.find((u) => u.id === otroUserId);
      if (perfilOtro) perfilesCache.current[conversacionId] = perfilOtro;

      // Refrescar silenciosamente: sin spinner, el usuario ya está en la vista chat
      cargarConversaciones(true);
      abrirConversacion(conversacionId);
    }
  }, [user?.id, usuarios, cargarConversaciones, abrirConversacion]);

  return {
    conversaciones,
    usuarios,
    isLoading,
    error,
    cargarConversaciones,
    iniciarConversacion,
  };
}
