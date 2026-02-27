// ========================================
// NotificationCenter - Panel de notificaciones
// ========================================

import React from 'react';
import { X, Bell, Package, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useRouter } from '@/router';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function TipoIcon({ tipo }) {
  switch (tipo) {
    case 'stock_bajo':
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'consolidado_listo':
      return <CheckCircle className="w-4 h-4 text-success" />;
    default:
      return <Info className="w-4 h-4 text-primary" />;
  }
}

export default function NotificationCenter({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  const { navigate } = useRouter();

  const handleClick = (notif) => {
    onMarkRead(notif.id);
    onClose();
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-card border z-50"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-primary">Notificaciones</span>
          {notifications.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-error text-white font-bold">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Marcar todas
            </button>
          )}
          <button onClick={onClose} className="text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-8 h-8 text-muted mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted">Sin notificaciones nuevas</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className="w-full text-left px-4 py-3 hover:bg-app transition-colors border-b flex gap-3 items-start"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="mt-0.5 shrink-0">
                <TipoIcon tipo={notif.tipo} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{notif.titulo}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.mensaje}</p>
                <p className="text-xs text-muted mt-1">{formatTime(notif.creado_en)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          className="px-4 py-2 text-center border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs text-muted">{notifications.length} notificación{notifications.length !== 1 ? 'es' : ''} sin leer</span>
        </div>
      )}
    </div>
  );
}
