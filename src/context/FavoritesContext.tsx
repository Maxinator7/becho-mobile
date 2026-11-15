import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { fetchApi } from '../api/client';
import { useAuth } from './AuthContext';

interface FavoritesContextValue {
  ids: Set<string>;
  isFavorite: (listingId: string) => boolean;
  /** Saves or unsaves a listing. Returns false when the user is signed out (caller should open Login). */
  toggle: (listingId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  ids: new Set(),
  isFavorite: () => false,
  toggle: async () => false,
  refresh: async () => {},
});

/** Saved ads (GET /favorites, POST /favorites/:listingId toggles). */
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await fetchApi<{ id: string }[]>('/favorites');
    if (res.success && res.data) setIds(new Set(res.data.map((l) => l.id)));
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
    else setIds(new Set());
  }, [user, refresh]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!user) return false;
      const wasSaved = ids.has(listingId);
      // Optimistic update; rolled back if the request fails.
      const apply = (saved: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      apply(!wasSaved);
      const res = await fetchApi<{ favorited: boolean }>(`/favorites/${listingId}`, { method: 'POST' });
      if (res.success && res.data) apply(res.data.favorited);
      else {
        apply(wasSaved);
        Alert.alert('Could not update saved ads', res.error?.message || 'Please try again.');
      }
      return true;
    },
    [user, ids]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, isFavorite: (id) => ids.has(id), toggle, refresh }),
    [ids, toggle, refresh]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
