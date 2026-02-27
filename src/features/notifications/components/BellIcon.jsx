// ========================================
// BellIcon - Botón campanita con badge
// ========================================

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

export default function BellIcon() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, hasCritical, markRead, markAllRead } = useNotifications();
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-app transition-colors"
        title="Notificaciones"
      >
        <Bell
          className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : 'text-muted'}`}
        />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-error ${hasCritical ? 'animate-pulse' : ''}`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationCenter
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
