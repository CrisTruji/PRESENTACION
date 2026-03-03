// ========================================
// VisorImagen — Lightbox para imágenes del chat
// Renderiza via portal sobre todo el contenido.
// Mientras está abierto, pone data-visor-abierto="1" en el body
// para que ChatPanel no cierre el chat al hacer click.
// ========================================
import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

export default function VisorImagen({ src, nombre, onCerrar }) {
  // Cerrar con Escape + señalizar al ChatPanel que el visor está abierto
  useEffect(() => {
    document.body.dataset.visorAbierto = '1';
    document.body.style.overflow = 'hidden';

    function handleKey(e) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      // Limpiar con un tick de delay: el mousedown que cierra el visor
      // y el mousedown listener del ChatPanel son el MISMO evento.
      // Si borramos el flag antes de que ChatPanel lo lea, el chat se cierra.
      // Con setTimeout(0) el flag sigue activo cuando ChatPanel evalúa el evento.
      setTimeout(() => {
        delete document.body.dataset.visorAbierto;
      }, 0);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [onCerrar]);

  const handleDescargar = useCallback(() => {
    const a = document.createElement('a');
    a.href = src;
    a.download = nombre || 'imagen';
    a.click();
  }, [src, nombre]);

  return createPortal(
    // Click en el fondo oscuro → cerrar visor (NO el chat)
    <div
      onMouseDown={onCerrar}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {/* Barra superior */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: '500', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombre || 'Imagen'}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <BtnVisor onClick={handleDescargar} title="Descargar"><Download size={18} /></BtnVisor>
          <BtnVisor onClick={onCerrar} title="Cerrar (Esc)"><X size={18} /></BtnVisor>
        </div>
      </div>

      {/* Imagen — click en ella NO cierra nada */}
      <img
        src={src}
        alt={nombre || 'Imagen'}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          cursor: 'default',
          animation: 'slideIn 0.18s ease',
        }}
      />

      <p style={{ position: 'absolute', bottom: '16px', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: 0, pointerEvents: 'none' }}>
        Click fuera de la imagen o Esc para cerrar
      </p>
    </div>,
    document.body
  );
}

function BtnVisor({ onClick, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
    >
      {children}
    </button>
  );
}
