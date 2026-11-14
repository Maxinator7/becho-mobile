import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  overlay: string;
  bubbleOther: string;
}

const dark: Colors = {
  bg: '#090d16',
  surface: '#131b2e',
  surface2: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  primary: '#6366f1',
  primarySoft: 'rgba(99,102,241,0.15)',
  onPrimary: '#ffffff',
  success: '#22c55e',
  successSoft: 'rgba(34,197,94,0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.12)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  inputBg: '#1e293b',
  inputBorder: 'rgba(255,255,255,0.12)',
  placeholder: '#6b7280',
  overlay: 'rgba(0,0,0,0.6)',
  bubbleOther: '#1f2937',
};

const light: Colors = {
  bg: '#f5f7fb',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  border: 'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(15,23,42,0.18)',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#5f6b7f',
  primary: '#4f46e5',
  primarySoft: 'rgba(79,70,229,0.10)',
  onPrimary: '#ffffff',
  success: '#047857',
  successSoft: 'rgba(5,150,105,0.10)',
  warning: '#b45309',
  warningSoft: 'rgba(180,83,9,0.10)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220,38,38,0.08)',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  placeholder: '#94a3b8',
  overlay: 'rgba(15,23,42,0.45)',
  bubbleOther: '#e2e8f0',
};

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'becho.theme';

interface ThemeContextValue {
  colors: Colors;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: dark,
  scheme: 'dark',
  preference: 'system',
  cyclePreference: () => {},
});

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreference(saved);
      })
      .catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === 'light' ? light : dark,
      scheme,
      preference,
      cyclePreference: () => {
        const next = NEXT[preference];
        setPreference(next);
        SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/** Builds a StyleSheet from the current colours; rebuilt only when the theme changes. */
export function useThemedStyles<T>(factory: (c: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
