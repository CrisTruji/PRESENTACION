// ========================================
// ChatWindow — Ventana de mensajes de una conversación activa
// ========================================
import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMensajes } from '../hooks/useMensajes';
import MensajeBurbuja from './MensajeBurbuja';
import InputMensaje from './InputMensaje';

function formatRol(rol) {
  if (!rol) return 'Empleado';
  return rol.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ChatWindow({ conversacionId, otroUsuario, onVolver }) {
  const { mensajes, isLoading, enviando, enviarMensaje, ultimoVistoOtro } =
    useMensajes(conversacionId);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const nombreMostrar = otroUsuario?.nombre || otroUsuario?.email || 'Compañero';
  const inicial = nombreMostrar.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-surface)', flexShrink: 0,
      }}>
        <button
          onClick={onVolver}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--color-primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '600', fontSize: '0.9rem', flexShrink: 0,
        }}>
          {inicial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nombreMostrar}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formatRol(otroUsuario?.rol)}
          </p>
        </div>
      </div>

      {/* Cuerpo: hilo de mensajes */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        background: 'var(--color-bg-app)',
      }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="spinner" />
          </div>
        )}

        {!isLoading && mensajes.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', paddingTop: '40px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>¡Saluda a {nombreMostrar}! 👋</p>
          </div>
        )}

        {mensajes.map((mensaje, idx) => {
          const anterior = mensajes[idx - 1];
          const mostrarNombre = !anterior || anterior.remitente_id !== mensaje.remitente_id;
          return (
            <MensajeBurbuja
              key={mensaje.id}
              mensaje={mensaje}
              mostrarNombre={mostrarNombre}
              ultimoVistoOtro={ultimoVistoOtro}
            />
          );
        })}

        <div ref={endRef} />
      </div>

      {/* Footer: input */}
      <InputMensaje onEnviar={enviarMensaje} disabled={enviando} />
    </div>
  );
}
