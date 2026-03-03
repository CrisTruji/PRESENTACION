// ========================================
// InputMensaje — Textarea autoexpandible para escribir mensajes
// Enter envía, Shift+Enter hace salto de línea
// ========================================
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function InputMensaje({ onEnviar, disabled }) {
  const [texto, setTexto] = useState('');
  const textareaRef = useRef(null);

  // Autoajustar altura del textarea según contenido
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [texto]);

  const handleEnviar = () => {
    if (!texto.trim() || disabled) return;
    onEnviar(texto);
    setTexto('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: '8px',
      padding: '12px 16px', borderTop: '1px solid var(--color-border)',
      background: 'var(--color-bg-surface)', flexShrink: 0,
    }}>
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje…"
        disabled={disabled}
        rows={1}
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--color-border)',
          borderRadius: '20px', padding: '8px 14px', fontSize: '0.875rem',
          background: 'var(--color-bg-app)', color: 'var(--color-text-primary)',
          outline: 'none', lineHeight: '1.5', maxHeight: '120px',
          overflowY: 'auto', fontFamily: 'inherit',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
        onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; }}
      />
      <button
        onClick={handleEnviar}
        disabled={!texto.trim() || disabled}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: texto.trim() && !disabled ? 'var(--color-primary)' : 'var(--color-border)',
          border: 'none', cursor: texto.trim() && !disabled ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.15s ease',
        }}
        aria-label="Enviar mensaje"
      >
        <Send size={16} color="white" />
      </button>
    </div>
  );
}
