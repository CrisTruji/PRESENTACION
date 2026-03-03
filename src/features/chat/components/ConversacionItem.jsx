// ========================================
// ConversacionItem — Fila de conversación en la lista del panel
// Muestra avatar, nombre, rol, preview del último mensaje y badge de no leídos
// ========================================
import React from 'react';
import { useChatStore } from '../store/useChatStore';

function formatTiempo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function formatRol(rol) {
  if (!rol) return '';
  return rol.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ConversacionItem({ conversacion, miUserId, onAbrir }) {
  const { mensajesNoLeidos } = useChatStore();
  const { id, otroUsuario, ultimoMensaje } = conversacion;
  const noLeidos = mensajesNoLeidos[id] ?? conversacion.noLeidos ?? 0;

  const nombreMostrar = otroUsuario?.nombre || otroUsuario?.email || 'Usuario';
  const inicial = nombreMostrar.charAt(0).toUpperCase();

  // Genera preview legible: si el contenido es JSON de archivo muestra el nombre,
  // si es texto plano lo trunca normalmente.
  function previewMensaje(contenido) {
    if (!contenido) return 'Sin mensajes aún';
    try {
      const p = JSON.parse(contenido);
      if (p._tipo === 'archivo') {
        const esImagen = p.mimeType?.startsWith('image/');
        return esImagen ? `📷 ${p.nombre || 'Imagen'}` : `📎 ${p.nombre || 'Archivo'}`;
      }
    } catch (_) {}
    return contenido.length > 40 ? contenido.slice(0, 40) + '…' : contenido;
  }

  let preview = 'Sin mensajes aún';
  if (ultimoMensaje) {
    const esMio  = ultimoMensaje.remitente_id === miUserId;
    const texto  = previewMensaje(ultimoMensaje.contenido);
    preview = esMio ? `Tú: ${texto}` : texto;
  }

  return (
    <button
      onClick={() => onAbrir(conversacion)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', background: 'none', border: 'none',
        borderBottom: '1px solid var(--color-border-light)',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      {/* Avatar */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        background: 'var(--color-primary)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '600', fontSize: '1rem', flexShrink: 0,
      }}>
        {inicial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Nombre + hora */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
          <span style={{ fontWeight: noLeidos > 0 ? '600' : '500', fontSize: '0.875rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            {nombreMostrar}
          </span>
          <span style={{ fontSize: '0.6875rem', color: noLeidos > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0, marginLeft: '8px' }}>
            {formatTiempo(ultimoMensaje?.creado_en)}
          </span>
        </div>

        {/* Rol */}
        {otroUsuario?.rol && (
          <p style={{ margin: '0 0 2px 0', fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatRol(otroUsuario.rol)}
          </p>
        )}

        {/* Preview + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: noLeidos > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)', fontWeight: noLeidos > 0 ? '500' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {preview}
          </span>
          {noLeidos > 0 && (
            <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', background: 'var(--color-primary)', color: 'white', fontSize: '0.6875rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}>
              {noLeidos > 9 ? '9+' : noLeidos}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
