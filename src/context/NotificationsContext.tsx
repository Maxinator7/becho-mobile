import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { conversationId?: string | null; listingId?: string; offerId?: string; count?: number } | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  refresh: () => void;
}

const POLL_MS = 20_000;
const NotificationsContext = createContext<NotificationsContextValue>({ unreadCount: 0, refresh: () => {} });

/** Where tapping a notification should go: [screen, params]. */
export function notificationTarget(n: AppNotification): [string, object | undefined] {
  if (n.data?.conversationId) return ['ChatDetail', { conversationId: n.data.conversationId }];
  if (n.data?.listingId) return ['ProductDetails', { listingId: n.data.listingId }];
  return ['Home', undefined];
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await fetchApi<{ unreadCount: number }>('/notifications/unread-count');
    if (res.success && res.data) setUnreadCount(res.data.unreadCount);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    void refresh();
    // Poll only while the app is in the foreground.
    let timer: ReturnType<typeof setInterval> | null = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
        timer ??= setInterval(refresh, POLL_MS);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [user, refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh: () => void refresh() }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
