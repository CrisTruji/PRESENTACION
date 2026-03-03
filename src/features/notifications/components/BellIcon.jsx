// ========================================
// BellIcon - Botón campanita con badge
// El panel se renderiza via portal al body para garantizar
// que siempre aparezca por encima de cualquier elemento.
// ========================================

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

export default function BellIcon() {
  const [open, setOpen]       = useState(false);
  const [pos,  setPos]        = useState({ top: 0, right: 0 });
  const btnRef                = useRef(null);
  const panelRef              = useRef(null);
  const { notifications, unreadCount, hasCritical, markRead, markAllRead } = useNotifications();

  // Calcular posición del panel relativa al botón
  const calcularPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top:   rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (
        btnRef.current   && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleToggle = () => {
    calcularPos();
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '6px', borderRadius: '8px',
          color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Notificaciones"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            minWidth: '16px', height: '16px', padding: '0 4px',
            borderRadius: '8px', background: 'var(--color-error, #ef4444)',
            color: 'white', fontSize: '0.625rem', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            animation: hasCritical ? 'pulse 1.5s infinite' : 'none',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal: renderiza el panel directamente en el body,
          por encima de absolutamente todo */}
      {open && createPortal(
        <NotificationCenter
          ref={panelRef}
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setOpen(false)}
          style={{ top: pos.top, right: pos.right }}
        />,
        document.body
      )}
    </>
  );
}
