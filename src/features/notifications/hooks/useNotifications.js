// ========================================
// useNotifications - Hook de notificaciones en tiempo real
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsService } from '../services/notificationsService';
import { useAuth } from '@/features/auth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef(null);
  const pollRef = useRef(null);

  const loadUnread = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data } = await notificationsService.getUnread(user.id);
    if (data) setNotifications(data);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    loadUnread();

    // Suscripción real-time
    channelRef.current = notificationsService.subscribeToNew(user.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    // Polling de respaldo cada 30s
    pollRef.current = setInterval(loadUnread, 30000);

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [user?.id, loadUnread]);

  const markRead = useCallback(async (id) => {
    await notificationsService.markRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    await notificationsService.markAllRead(user.id);
    setNotifications([]);
  }, [user?.id]);

  const unreadCount = notifications.length;
  const hasCritical = notifications.some((n) => n.tipo === 'stock_bajo' || n.severidad === 'critical');

  return { notifications, unreadCount, hasCritical, isLoading, markRead, markAllRead, reload: loadUnread };
}
