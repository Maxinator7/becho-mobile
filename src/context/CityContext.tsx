import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { ServiceArea, getServiceAreas } from '../utils/catalog';

const STORAGE_KEY = 'becho.city';

interface CityContextValue {
  /** null = all cities. */
  area: ServiceArea | null;
  setArea: (area: ServiceArea | null) => void;
}

const CityContext = createContext<CityContextValue>({ area: null, setArea: () => {} });

/** The city the buyer is browsing (Home and Explore share it); remembered across launches. */
export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [area, setAreaState] = useState<ServiceArea | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem(STORAGE_KEY).catch(() => null);
      if (!saved) return;
      const match = (await getServiceAreas()).find((a) => a.id === saved);
      if (match) setAreaState(match);
    })();
  }, []);

  const value = useMemo<CityContextValue>(
    () => ({
      area,
      setArea: (next) => {
        setAreaState(next);
        (next ? storage.setItem(STORAGE_KEY, next.id) : storage.deleteItem(STORAGE_KEY)).catch(() => {});
      },
    }),
    [area]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
};

export const useCity = () => useContext(CityContext);
