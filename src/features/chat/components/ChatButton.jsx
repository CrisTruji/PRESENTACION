// ========================================
// ChatButton — Ícono de chat en el Navbar con badge de no leídos
// ========================================
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

export function ChatButton() {
  const { isOpen, abrirChat, cerrarChat, getTotalNoLeidos } = useChatStore();
  const total = getTotalNoLeidos();

  return (
    <button
      onClick={() => (isOpen ? cerrarChat() : abrirChat())}
      style={{
        position: 'relative', background: 'none', border: 'none',
        cursor: 'pointer', padding: '6px', borderRadius: '8px',
        color: 'var(--color-text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      aria-label="Chat"
      title="Mensajes"
    >
      <MessageCircle size={22} />
      {total > 0 && (
        <span style={{
          position: 'absolute', top: '2px', right: '2px',
          minWidth: '16px', height: '16px', padding: '0 4px',
          borderRadius: '8px', background: 'var(--color-primary)',
          color: 'white', fontSize: '0.625rem', fontWeight: '700',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  );
}
