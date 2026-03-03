// ========================================
// PanelInfoChat — Panel de información del contacto (estilo WhatsApp)
// Tres pestañas: Archivos · Imágenes · Enlaces
// Las imágenes abren VisorImagen interno (no pestaña nueva)
// ========================================
import React, { useState, useMemo } from 'react';
import { X, FileText, Image, Link, Download, ExternalLink } from 'lucide-react';
import VisorImagen from './VisorImagen';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parsearArchivo(contenido) {
  try { const p = JSON.parse(contenido); if (p._tipo === 'archivo') return p; } catch (_) {}
  return null;
}

function extraerEnlaces(texto) {
  return texto.match(/https?:\/\/[^\s]+/g) || [];
}

// ── Pestaña: Archivos ─────────────────────────────────────

function TabArchivos({ mensajes }) {
  const archivos = useMemo(() =>
    mensajes
      .map((m) => { const a = parsearArchivo(m.contenido); return a ? { ...a, fecha: m.creado_en } : null; })
      .filter((a) => a && !a.mimeType?.startsWith('image/')),
    [mensajes]
  );

  if (!archivos.length) return <Vacio icono={<FileText size={32} style={{ opacity: 0.25 }} />} texto="Sin archivos compartidos" />;

  return (
    <div>
      {archivos.map((a, i) => (
        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" download={a.nombre}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{formatBytes(a.tamanio)} · {formatFecha(a.fecha)}</p>
          </div>
          <Download size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </a>
      ))}
    </div>
  );
}

// ── Pestaña: Imágenes — usa VisorImagen interno ───────────

function TabImagenes({ mensajes }) {
  const [visor, setVisor] = useState(null); // { src, nombre }

  const imagenes = useMemo(() =>
    mensajes
      .map((m) => { const a = parsearArchivo(m.contenido); return a ? { ...a, fecha: m.creado_en } : null; })
      .filter((a) => a && a.mimeType?.startsWith('image/')),
    [mensajes]
  );

  if (!imagenes.length) return <Vacio icono={<Image size={32} style={{ opacity: 0.25 }} />} texto="Sin imágenes compartidas" />;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', padding: '2px' }}>
        {imagenes.map((img, i) => (
          <button
            key={i}
            onClick={() => setVisor({ src: img.url, nombre: img.nombre })}
            style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: '4px', display: 'block', padding: 0, border: 'none', cursor: 'zoom-in', background: 'none' }}
          >
            <img
              src={img.url}
              alt={img.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s', display: 'block' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </button>
        ))}
      </div>

      {visor && (
        <VisorImagen
          src={visor.src}
          nombre={visor.nombre}
          onCerrar={() => setVisor(null)}
        />
      )}
    </>
  );
}

// ── Pestaña: Enlaces ──────────────────────────────────────

function TabEnlaces({ mensajes }) {
  const enlaces = useMemo(() => {
    const result = [];
    mensajes.forEach((m) => {
      try { const p = JSON.parse(m.contenido); if (p._tipo) return; } catch (_) {}
      extraerEnlaces(m.contenido || '').forEach((url) => result.push({ url, fecha: m.creado_en }));
    });
    return result;
  }, [mensajes]);

  if (!enlaces.length) return <Vacio icono={<Link size={32} style={{ opacity: 0.25 }} />} texto="Sin enlaces compartidos" />;

  return (
    <div>
      {enlaces.map((e, i) => (
        <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}
          onMouseEnter={(el) => el.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(el) => el.currentTarget.style.background = 'none'}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-accent, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Link size={18} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.url}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{formatFecha(e.fecha)}</p>
          </div>
          <ExternalLink size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </a>
      ))}
    </div>
  );
}

function Vacio({ icono, texto }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: 'var(--color-text-muted)', gap: '10px' }}>
      {icono}
      <p style={{ margin: 0, fontSize: '0.875rem' }}>{texto}</p>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────

const TABS = [
  { key: 'archivos', label: 'Archivos', Icon: FileText },
  { key: 'imagenes', label: 'Imágenes', Icon: Image    },
  { key: 'enlaces',  label: 'Enlaces',  Icon: Link     },
];

export default function PanelInfoChat({ otroUsuario, mensajes, onCerrar }) {
  const [tabActiva, setTabActiva] = useState('archivos');

  const nombre  = otroUsuario?.nombre || otroUsuario?.email || 'Compañero';
  const inicial = nombre.charAt(0).toUpperCase();

  function formatRol(rol) {
    if (!rol) return 'Empleado';
    return rol.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg-surface)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.18s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Info del contacto</span>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '4px', borderRadius: '6px' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, gap: '6px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.4rem' }}>{inicial}</div>
        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>{nombre}</p>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: '500' }}>{formatRol(otroUsuario?.rol)}</p>
        {otroUsuario?.email && <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{otroUsuario.email}</p>}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTabActiva(key)}
            style={{ flex: 1, padding: '9px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tabActiva === key ? '2px solid var(--color-primary)' : '2px solid transparent', color: tabActiva === key ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '0.72rem', fontWeight: '500', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tabActiva === 'archivos' && <TabArchivos mensajes={mensajes} />}
        {tabActiva === 'imagenes' && <TabImagenes mensajes={mensajes} />}
        {tabActiva === 'enlaces'  && <TabEnlaces  mensajes={mensajes} />}
      </div>
    </div>
  );
}
