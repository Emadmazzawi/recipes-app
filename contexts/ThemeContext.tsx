import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme, Appearance, StyleSheet } from 'react-native';

export const LIGHT_COLORS = {
  bg: '#ffffff',
  surface: '#fff6f1',
  surfaceDeep: '#ffe8da',
  card: '#ffffff',
  cardDeep: '#fff8f4',
  elevated: '#f2d0be',

  primary: '#e8411a',
  primaryLight: '#ff6b35',
  primaryGlow: 'rgba(232, 65, 26, 0.22)',
  primaryTint: 'rgba(232, 65, 26, 0.10)',
  primaryTintDark: 'rgba(232, 65, 26, 0.06)',

  textPrimary: '#1a0800',
  textSecondary: '#6b4030',
  textMuted: '#b07a65',
  textFaint: '#d4b0a0',

  border: 'rgba(232, 65, 26, 0.14)',
  borderSubtle: 'rgba(232, 65, 26, 0.08)',
  borderWhite: 'rgba(0, 0, 0, 0.07)',

  success: '#16a34a',
  error: '#dc2626',
  errorTint: 'rgba(220, 38, 38, 0.08)',
  purple: '#7c3aed',
  purpleTint: 'rgba(124, 58, 237, 0.09)',
  
  isDark: false,
};

export const DARK_COLORS = {
  bg: '#0f0a08',
  surface: '#1a110d',
  surfaceDeep: '#2b1c15',
  card: '#140d0a',
  cardDeep: '#1f140f',
  elevated: '#3b251c',

  primary: '#ff6b35', // Slightly lighter for dark mode readability
  primaryLight: '#ff8a5c',
  primaryGlow: 'rgba(255, 107, 53, 0.22)',
  primaryTint: 'rgba(255, 107, 53, 0.15)',
  primaryTintDark: 'rgba(255, 107, 53, 0.25)',

  textPrimary: '#ffffff',
  textSecondary: '#e0c7bc',
  textMuted: '#a38476',
  textFaint: '#6b5145',

  border: 'rgba(255, 107, 53, 0.25)',
  borderSubtle: 'rgba(255, 107, 53, 0.15)',
  borderWhite: 'rgba(255, 255, 255, 0.1)',

  success: '#22c55e',
  error: '#ef4444',
  errorTint: 'rgba(239, 68, 68, 0.15)',
  purple: '#8b5cf6',
  purpleTint: 'rgba(139, 92, 246, 0.15)',
  
  isDark: true,
};

type ThemeColors = typeof LIGHT_COLORS;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  theme: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LIGHT_COLORS,
  isDark: false,
  setTheme: () => {},
  theme: 'system',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');

  const isDark = themePreference === 'system' ? systemColorScheme === 'dark' : themePreference === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark, setTheme: setThemePreference, theme: themePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export function useStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styleCreator: (colors: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => styleCreator(colors), [colors, styleCreator]);
}
