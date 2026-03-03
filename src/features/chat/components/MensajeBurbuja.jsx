// ========================================
// MensajeBurbuja — Burbuja de mensaje con soporte de archivos adjuntos
// Tipos de contenido:
//   · texto plano
//   · archivo (JSON con _tipo:'archivo') → imagen abre visor interno, otros descargan
// Checks de estado: enviando · fallido · enviado · entregado · leído
// ========================================
import React, { useState } from 'react';
import { useAuth }          from '@/features/auth';
import { FileText, Download } from 'lucide-react';
import VisorImagen           from './VisorImagen';

// ── Helpers ──────────────────────────────────────────────

function formatHora(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parsearArchivo(contenido) {
  try { const p = JSON.parse(contenido); if (p._tipo === 'archivo') return p; } catch (_) {}
  return null;
}

function TextoResaltado({ texto, resaltar }) {
  if (!resaltar) return <>{texto}</>;
  const regex  = new RegExp(`(${resaltar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const partes = texto.split(regex);
  return (
    <>
      {partes.map((parte, i) =>
        regex.test(parte)
          ? <mark key={i} style={{ background: 'rgba(255,220,0,0.5)', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>{parte}</mark>
          : parte
      )}
    </>
  );
}

// ── Checks de estado ─────────────────────────────────────

function ChecksEstado({ estado }) {
  if (estado === 'enviando') return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
  if (estado === 'fallido') return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="No se pudo enviar">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
  if (estado === 'enviado') return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ opacity: 0.6 }}>
      <polyline points="1,5 4,8 9,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (estado === 'entregado') return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ opacity: 0.6 }}>
      <polyline points="1,5 4,8 9,2"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5,5 8,8 13,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (estado === 'leido') return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
      <polyline points="1,5 4,8 9,2"  stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5,5 8,8 13,2" stroke="#53bdeb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return null;
}

function calcularEstado(mensaje, ultimoVistoOtro) {
  if (mensaje._optimista) return 'enviando';
  if (mensaje._fallido)   return 'fallido';
  if (!ultimoVistoOtro)   return 'enviado';
  const fechaMensaje  = new Date(mensaje.creado_en);
  if (ultimoVistoOtro > fechaMensaje) return 'leido';
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000);
  if (ultimoVistoOtro > cincoMinAtras) return 'entregado';
  return 'enviado';
}

// ── Contenido del mensaje ─────────────────────────────────

function ContenidoMensaje({ mensaje, esMio, resaltarTexto }) {
  const [visorAbierto, setVisorAbierto] = useState(false);
  const archivo = parsearArchivo(mensaje.contenido);

  // Texto plano
  if (!archivo) {
    return (
      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', wordBreak: 'break-word' }}>
        <TextoResaltado texto={mensaje.contenido || ''} resaltar={resaltarTexto} />
      </p>
    );
  }

  const esImagen = archivo.mimeType?.startsWith('image/');

  const captionColor = esMio ? 'rgba(255,255,255,0.9)' : 'var(--color-text-primary)';

  // Imagen → thumbnail clickeable que abre el visor interno
  if (esImagen) {
    return (
      <>
        <button
          onClick={() => setVisorAbierto(true)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'zoom-in', display: 'block' }}
          title="Ver imagen"
        >
          <img
            src={archivo.url}
            alt={archivo.nombre}
            style={{ maxWidth: '220px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', display: 'block', transition: 'opacity 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          />
        </button>

        {/* Caption (texto escrito junto al archivo) */}
        {archivo.caption && (
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem', lineHeight: '1.5', wordBreak: 'break-word', color: captionColor }}>
            {archivo.caption}
          </p>
        )}

        {visorAbierto && (
          <VisorImagen src={archivo.url} nombre={archivo.nombre} onCerrar={() => setVisorAbierto(false)} />
        )}
      </>
    );
  }

  // Archivo genérico (PDF, Word, Excel, etc.) → descarga directa
  return (
    <>
      <a
        href={archivo.url}
        target="_blank"
        rel="noopener noreferrer"
        download={archivo.nombre}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '2px 0' }}
      >
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0, background: esMio ? 'rgba(255,255,255,0.2)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={20} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '500', color: esMio ? 'white' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {archivo.nombre}
          </p>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.7, color: esMio ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
            {formatBytes(archivo.tamanio)}
          </p>
        </div>
        <Download size={16} style={{ flexShrink: 0, color: esMio ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }} />
      </a>

      {/* Caption debajo del archivo */}
      {archivo.caption && (
        <p style={{ margin: '6px 0 0', fontSize: '0.875rem', lineHeight: '1.5', wordBreak: 'break-word', color: captionColor }}>
          {archivo.caption}
        </p>
      )}
    </>
  );
}

// ── Componente principal ──────────────────────────────────

export default function MensajeBurbuja({ mensaje, mostrarNombre, ultimoVistoOtro, resaltarTexto }) {
  const { user }        = useAuth();
  const esMio           = mensaje.remitente_id === user?.id;
  const nombreRemitente = mensaje.remitente?.nombre || 'Usuario';
  const estado          = esMio ? calcularEstado(mensaje, ultimoVistoOtro) : null;
  const esArchivo       = !!parsearArchivo(mensaje.contenido);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: esMio ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>

      {!esMio && mostrarNombre && (
        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '3px', paddingLeft: '4px' }}>
          {nombreRemitente}
        </span>
      )}

      <div style={{
        maxWidth: esArchivo ? '240px' : '75%',
        padding: esArchivo ? '8px 10px' : '7px 11px 7px 12px',
        borderRadius: esMio ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: esMio ? 'var(--color-primary)' : 'var(--color-bg-surface)',
        color: esMio ? 'white' : 'var(--color-text-primary)',
        border: esMio ? 'none' : '1px solid var(--color-border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        opacity: mensaje._optimista ? 0.75 : 1,
        transition: 'opacity 0.2s ease',
      }}>
        <ContenidoMensaje mensaje={mensaje} esMio={esMio} resaltarTexto={resaltarTexto} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
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
