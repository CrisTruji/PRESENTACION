// ========================================
// ChatWindow — Ventana de mensajes de una conversación activa
// Funcionalidades:
//   · Header clickeable → abre PanelInfoChat (archivos / imágenes / enlaces)
//   · Buscador de mensajes (lupa en header)
//   · Soporte de archivos adjuntos via InputMensaje
// ========================================
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useMensajes }   from '../hooks/useMensajes';
import MensajeBurbuja    from './MensajeBurbuja';
import InputMensaje      from './InputMensaje';
import PanelInfoChat     from './PanelInfoChat';

function formatRol(rol) {
  if (!rol) return 'Empleado';
  return rol.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ChatWindow({ conversacionId, otroUsuario, onVolver }) {
  const { mensajes, isLoading, enviando, enviarMensaje, ultimoVistoOtro } =
    useMensajes(conversacionId);

  const endRef        = useRef(null);
  const searchRef     = useRef(null);
  const resultRefs    = useRef([]);

  const [infoPanelAbierto, setInfoPanelAbierto] = useState(false);
  const [busquedaAbierta,  setBusquedaAbierta]  = useState(false);
  const [textoBusqueda,    setTextoBusqueda]     = useState('');
  const [resultadoActual,  setResultadoActual]   = useState(0);

  // Scroll al último mensaje cuando llega uno nuevo (solo si no hay búsqueda activa)
  useEffect(() => {
    if (!busquedaAbierta) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, busquedaAbierta]);

  // Focus en el input de búsqueda al abrirlo
  useEffect(() => {
    if (busquedaAbierta) setTimeout(() => searchRef.current?.focus(), 50);
    else setTextoBusqueda('');
  }, [busquedaAbierta]);

  // Índices de mensajes que coinciden con la búsqueda
  const indicesCoincidentes = useMemo(() => {
    if (!textoBusqueda.trim()) return [];
    const q = textoBusqueda.toLowerCase();
    return mensajes
      .map((m, i) => {
        // Ignorar mensajes de archivo para la búsqueda de texto
        try { const p = JSON.parse(m.contenido); if (p._tipo === 'archivo') return null; } catch (_) {}
        return m.contenido?.toLowerCase().includes(q) ? i : null;
      })
      .filter((i) => i !== null);
  }, [textoBusqueda, mensajes]);

  // Scroll al resultado actual
  useEffect(() => {
    if (!indicesCoincidentes.length) return;
    const idx = indicesCoincidentes[resultadoActual];
    resultRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [resultadoActual, indicesCoincidentes]);

  const irAlAnterior = () =>
    setResultadoActual((p) => (p - 1 + indicesCoincidentes.length) % indicesCoincidentes.length);
  const irAlSiguiente = () =>
    setResultadoActual((p) => (p + 1) % indicesCoincidentes.length);

  const cerrarBusqueda = () => { setBusquedaAbierta(false); setTextoBusqueda(''); setResultadoActual(0); };

  const nombreMostrar = otroUsuario?.nombre || otroUsuario?.email || 'Compañero';
  const inicial       = nombreMostrar.charAt(0).toUpperCase();

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-surface)', flexShrink: 0,
      }}>
        {/* Volver */}
        <button onClick={onVolver} aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '4px', borderRadius: '6px', flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>

        {/* Avatar + nombre (clickeable → abre info panel) */}
        <button onClick={() => setInfoPanelAbierto(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', textAlign: 'left', transition: 'background 0.15s' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.875rem', flexShrink: 0 }}>
            {inicial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nombreMostrar}
            </p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              {formatRol(otroUsuario?.rol)}
            </p>
          </div>
        </button>

        {/* Botón lupa */}
        <button onClick={() => setBusquedaAbierta((v) => !v)}
          title="Buscar mensajes"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: busquedaAbierta ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: '6px', borderRadius: '6px', display: 'flex', flexShrink: 0 }}>
          <Search size={17} />
        </button>
      </div>

      {/* ── Barra de búsqueda (se despliega bajo el header) ── */}
      {busquedaAbierta && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              ref={searchRef}
              type="text"
              value={textoBusqueda}
              onChange={(e) => { setTextoBusqueda(e.target.value); setResultadoActual(0); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.shiftKey ? irAlAnterior() : irAlSiguiente(); } if (e.key === 'Escape') cerrarBusqueda(); }}
              placeholder="Buscar en la conversación…"
              style={{ width: '100%', paddingLeft: '30px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', border: '1px solid var(--color-border)', borderRadius: '16px', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Contador y navegación */}
          {textoBusqueda && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              {indicesCoincidentes.length > 0
                ? `${resultadoActual + 1}/${indicesCoincidentes.length}`
                : 'Sin resultados'}
            </span>
          )}
          {indicesCoincidentes.length > 1 && (
            <>
              <button onClick={irAlAnterior} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', fontSize: '1rem', lineHeight: 1 }}>↑</button>
              <button onClick={irAlSiguiente} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', fontSize: '1rem', lineHeight: 1 }}>↓</button>
            </>
          )}
          <button onClick={cerrarBusqueda} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '2px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Cuerpo: hilo de mensajes ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--color-bg-app)' }}>
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
          const anterior      = mensajes[idx - 1];
          const mostrarNombre = !anterior || anterior.remitente_id !== mensaje.remitente_id;
          const esResultado   = indicesCoincidentes.includes(idx);
          const esActual      = esResultado && indicesCoincidentes[resultadoActual] === idx;

          return (
            <div key={mensaje.id} ref={(el) => (resultRefs.current[idx] = el)}
              style={esActual ? { borderRadius: '12px', outline: '2px solid var(--color-primary)', outlineOffset: '2px' } : {}}>
              <MensajeBurbuja
                mensaje={mensaje}
                mostrarNombre={mostrarNombre}
                ultimoVistoOtro={ultimoVistoOtro}
                resaltarTexto={esResultado ? textoBusqueda : ''}
              />
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {/* ── Footer: input ── */}
      <InputMensaje
        onEnviar={enviarMensaje}
        disabled={enviando}
        conversacionId={conversacionId}
      />

      {/* ── Panel de info del contacto (slide-in desde la derecha) ── */}
      {infoPanelAbierto && (
        <PanelInfoChat
          otroUsuario={otroUsuario}
          mensajes={mensajes}
          onCerrar={() => setInfoPanelAbierto(false)}
        />
      )}
    </div>
  );
}
