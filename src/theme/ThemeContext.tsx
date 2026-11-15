import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';

/** Colour tokens — see docs/design-system.md ("Colour tokens — marketplace & mobile"). */
export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  /** Dark promo cards and other "inverted" surfaces. */
  surfaceDeep: string;
  onSurfaceDeep: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  /** Indigo used for links, selected chip text and accents on light backgrounds. */
  primaryText: string;
  primarySoft: string;
  primarySoftBorder: string;
  onPrimary: string;
  success: string;
  successFill: string;
  successSoft: string;
  successSoftBorder: string;
  warning: string;
  warningSoft: string;
  warningSoftBorder: string;
  danger: string;
  dangerSoft: string;
  dangerSoftBorder: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  overlay: string;
  bubbleOther: string;
  /** Selected chip (city chips, tabs): slate-900 in light, indigo in dark. */
  chipSelected: string;
  onChipSelected: string;
  /** "Deal" buttons: dark slate in light mode, green in dark mode. */
  strongButton: string;
}

const light: Colors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surface2: '#F1F5F9',
  surfaceDeep: '#0F172A',
  onSurfaceDeep: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#4F46E5',
  primaryText: '#4338CA',
  primarySoft: '#EEF2FF',
  primarySoftBorder: '#C7D2FE',
  onPrimary: '#FFFFFF',
  success: '#047857',
  successFill: '#059669',
  successSoft: '#ECFDF5',
  successSoftBorder: '#A7F3D0',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  warningSoftBorder: '#FDE68A',
  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  dangerSoftBorder: '#FECDD3',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  placeholder: '#94A3B8',
  overlay: 'rgba(15,23,42,0.45)',
  bubbleOther: '#FFFFFF',
  chipSelected: '#0F172A',
  onChipSelected: '#FFFFFF',
  strongButton: '#0F172A',
};

const dark: Colors = {
  bg: '#0B0F19',
  surface: '#161F30',
  surface2: '#1E293B',
  surfaceDeep: '#070A12',
  onSurfaceDeep: '#F1F5F9',
  border: 'rgba(39,53,77,0.7)',
  borderStrong: '#334155',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#6366F1',
  primaryText: '#818CF8',
  primarySoft: 'rgba(99,102,241,0.15)',
  primarySoftBorder: 'rgba(129,140,248,0.4)',
  onPrimary: '#FFFFFF',
  success: '#34D399',
  successFill: '#059669',
  successSoft: 'rgba(2,44,34,0.9)',
  successSoftBorder: 'rgba(16,185,129,0.4)',
  warning: '#FBBF24',
  warningSoft: 'rgba(120,53,15,0.35)',
  warningSoftBorder: 'rgba(251,191,36,0.35)',
  danger: '#FB7185',
  dangerSoft: 'rgba(136,19,55,0.35)',
  dangerSoftBorder: 'rgba(251,113,133,0.35)',
  inputBg: '#111827',
  inputBorder: '#334155',
  placeholder: '#64748B',
  overlay: 'rgba(0,0,0,0.6)',
  bubbleOther: '#1E293B',
  chipSelected: '#6366F1',
  onChipSelected: '#FFFFFF',
  strongButton: '#059669',
};

/** Font families loaded in App.tsx (Inter for UI, Plus Jakarta Sans for headings). */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heading: 'PlusJakartaSans_700Bold',
  headingX: 'PlusJakartaSans_800ExtraBold',
} as const;

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'becho.theme';

interface ThemeContextValue {
  colors: Colors;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  scheme: 'light',
  preference: 'system',
  setPreference: () => {},
  cyclePreference: () => {},
});

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPref(saved);
      })
      .catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPref(next);
      storage.setItem(STORAGE_KEY, next).catch(() => {});
    };
    return {
      colors: scheme === 'light' ? light : dark,
      scheme,
      preference,
      setPreference,
      cyclePreference: () => setPreference(NEXT[preference]),
    };
  }, [scheme, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/** Builds a StyleSheet from the current colours; rebuilt only when the theme changes. */
export function useThemedStyles<T>(factory: (c: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
