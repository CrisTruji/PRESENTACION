// ========================================
// MensajeBurbuja — Burbuja de mensaje con checks de estado al estilo WhatsApp
// Estados: enviando (reloj) | fallido (X) | enviado (✓) | entregado (✓✓) | leído (✓✓ color)
// ========================================
import React from 'react';
import { useAuth } from '@/features/auth';

function formatHora(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function ChecksEstado({ estado }) {
  if (estado === 'enviando') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (estado === 'fallido') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="No se pudo enviar">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (estado === 'enviado') {
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ opacity: 0.6 }}>
        <polyline points="1,5 4,8 9,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (estado === 'entregado') {
    return (
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ opacity: 0.6 }}>
        <polyline points="1,5 4,8 9,2"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="5,5 8,8 13,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (estado === 'leido') {
    return (
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <polyline points="1,5 4,8 9,2"  stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="5,5 8,8 13,2" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

function calcularEstado(mensaje, ultimoVistoOtro) {
  if (mensaje._optimista) return 'enviando';
  if (mensaje._fallido)   return 'fallido';
  if (!ultimoVistoOtro)   return 'enviado';

  const fechaMensaje = new Date(mensaje.creado_en);
  if (ultimoVistoOtro > fechaMensaje) return 'leido';

  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000);
  if (ultimoVistoOtro > cincoMinAtras) return 'entregado';

  return 'enviado';
}

export default function MensajeBurbuja({ mensaje, mostrarNombre, ultimoVistoOtro }) {
  const { user } = useAuth();
  const esMio = mensaje.remitente_id === user?.id;
  const nombreRemitente = mensaje.remitente?.nombre || 'Usuario';
  const estado = esMio ? calcularEstado(mensaje, ultimoVistoOtro) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: esMio ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>

      {!esMio && mostrarNombre && (
        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '3px', paddingLeft: '4px' }}>
          {nombreRemitente}
        </span>
      )}

      <div style={{
        maxWidth: '75%',
        padding: '7px 11px 7px 12px',
        borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: esMio ? 'var(--color-primary)' : 'var(--color-bg-surface)',
        color: esMio ? 'white' : 'var(--color-text-primary)',
        border: esMio ? 'none' : '1px solid var(--color-border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        opacity: mensaje._optimista ? 0.75 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', wordBreak: 'break-word' }}>
          {mensaje.contenido}
        </p>

        {/* Pie: hora + checks */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px' }}>
          <span style={{ fontSize: '0.6875rem', opacity: 0.7, color: esMio ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)', lineHeight: 1 }}>
            {mensaje._optimista ? 'Enviando…' : formatHora(mensaje.creado_en)}
          </span>
          {esMio && (
            <span style={{ color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
              <ChecksEstado estado={estado} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
