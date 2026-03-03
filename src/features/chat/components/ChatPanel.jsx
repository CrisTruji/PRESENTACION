// ========================================
// ChatPanel — Panel flotante principal del chat
// Tres vistas: lista de conversaciones | nuevo chat | hilo de mensajes
// ========================================
import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Plus }  from 'lucide-react';
import { useChatStore }            from '../store/useChatStore';
import { useConversaciones }       from '../hooks/useConversaciones';
import { useAuth }                 from '@/features/auth';
import ConversacionItem            from './ConversacionItem';
import ChatWindow                  from './ChatWindow';
import NuevoChat                   from './NuevoChat';

export function ChatPanel() {
  const { isOpen, cerrarChat, conversacionActivaId } = useChatStore();
  const { user } = useAuth();
  const { conversaciones, usuarios, isLoading, iniciarConversacion, cargarConversaciones } =
    useConversaciones();

  const [vista,             setVista]             = useState('lista');
  const [creando,           setCreando]           = useState(false);
  const [otroUsuarioActivo, setOtroUsuarioActivo] = useState(null);
  const panelRef = useRef(null);

  // Cuando el store tiene una conversación activa → ir a vista chat
  useEffect(() => {
    if (conversacionActivaId) setVista('chat');
  }, [conversacionActivaId]);

  // Al abrir el panel: solo resetear vista, NO recargar datos
  // (los datos ya se cargan al montar el hook — ver useConversaciones)
  useEffect(() => {
    if (isOpen && !conversacionActivaId) {
      setVista('lista');
      setOtroUsuarioActivo(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer click fuera del panel.
  // EXCEPCIÓN: si hay un visor de imagen abierto (data-visor-abierto en el body)
  // no cerramos el chat — el click es para interactuar con el visor.
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      // El visor usa portal al body → su contenido está fuera del panelRef.
      // Lo identificamos por el atributo que VisorImagen pone en el body.
      if (document.body.dataset.visorAbierto === '1') return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        cerrarChat();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen, cerrarChat]);

  if (!isOpen) return null;

  // ── Handlers ──────────────────────────────────────────

  const handleSeleccionarUsuario = async (otroUserId) => {
    // Guardar perfil ANTES de la llamada async para que ChatWindow lo tenga de inmediato
    setOtroUsuarioActivo(usuarios.find((u) => u.id === otroUserId) || null);
    setCreando(true);
    await iniciarConversacion(otroUserId);
    setCreando(false);
  };

  const handleAbrirConversacion = (conv) => {
    setOtroUsuarioActivo(conv.otroUsuario || null);
    useChatStore.getState().abrirConversacion(conv.id);
  };

  const handleVolverALista = () => {
    setVista('lista');
    setOtroUsuarioActivo(null);
    useChatStore.getState().volverALista();
    // Refrescar lista sin spinner para que refleje el último mensaje y no leídos
    cargarConversaciones(true);
  };

  // ── Estilos compartidos para botones del header ───────
  const btnStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-text-muted)', padding: '6px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', transition: 'all 0.15s ease',
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div ref={panelRef} style={{
      position: 'fixed', top: '56px', right: '16px',
      width: '360px', height: 'calc(100vh - 72px)', maxHeight: '600px',
      zIndex: 1050, display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>

      {/* Spinner mientras se crea la conversación */}
      {creando && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-muted)' }}>
          <div className="spinner" />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Abriendo conversación…</p>
        </div>
      )}

      {/* Vista: hilo de mensajes */}
      {!creando && vista === 'chat' && conversacionActivaId && (
        <ChatWindow
          conversacionId={conversacionActivaId}
          otroUsuario={otroUsuarioActivo}
          onVolver={handleVolverALista}
        />
      )}

      {/* Vista: selector de nuevo chat */}
      {!creando && vista === 'nuevo' && (
        <NuevoChat
          usuarios={usuarios}
          onSeleccionar={handleSeleccionarUsuario}
          onVolver={() => setVista('lista')}
        />
      )}

      {/* Vista: lista de conversaciones */}
      {!creando && vista === 'lista' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                Mensajes
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setVista('nuevo')} style={btnStyle} title="Nueva conversación"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              ><Plus size={18} /></button>
              <button
                onClick={cerrarChat} style={btnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              ><X size={18} /></button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                <div className="spinner" />
              </div>
            )}
            {!isLoading && conversaciones.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', color: 'var(--color-text-muted)', gap: '10px' }}>
                <MessageCircle size={36} style={{ opacity: 0.2 }} />
                <p style={{ margin: 0, fontSize: '0.875rem', textAlign: 'center' }}>Aún no tienes conversaciones.</p>
                <p style={{ margin: 0, fontSize: '0.8rem', textAlign: 'center' }}>
                  Haz click en <strong style={{ color: 'var(--color-primary)' }}>+</strong> para chatear con un compañero.
                </p>
              </div>
            )}
            {!isLoading && conversaciones.map((conv) => (
              <ConversacionItem
                key={conv.id}
                conversacion={conv}
                miUserId={user?.id}
                onAbrir={handleAbrirConversacion}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
