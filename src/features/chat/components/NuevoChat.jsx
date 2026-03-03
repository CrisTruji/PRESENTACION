// ========================================
// NuevoChat — Selector de usuario para iniciar una conversación
// ========================================
import React, { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';

function formatRol(rol) {
  if (!rol) return 'Empleado';
  return rol.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function NuevoChat({ usuarios, onSeleccionar, onVolver }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rol?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button
          onClick={onVolver}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
          Nueva conversación
        </span>
      </div>

      {/* Buscador */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o cargo…"
            style={{
              width: '100%', paddingLeft: '30px', paddingRight: '10px',
              paddingTop: '7px', paddingBottom: '7px',
              border: '1px solid var(--color-border)', borderRadius: '20px',
              background: 'var(--color-bg-app)', color: 'var(--color-text-primary)',
              fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Lista de usuarios */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtrados.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Sin resultados
          </div>
        )}
        {filtrados.map((u) => {
          const nombre  = u.nombre || u.email || 'Usuario';
          const inicial = nombre.charAt(0).toUpperCase();
          return (
            <button
              key={u.id}
              onClick={() => onSeleccionar(u.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid var(--color-border-light)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              {/* Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'var(--color-primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '600', fontSize: '0.95rem', flexShrink: 0,
              }}>
                {inicial}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: '500', fontSize: '0.875rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nombre}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '500' }}>
                  {formatRol(u.rol)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
