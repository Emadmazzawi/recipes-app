import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme, Appearance, StyleSheet } from 'react-native';

export const LIGHT_COLORS = {
  bg: '#f9fafb',
  surface: '#ffffff',
  surfaceDeep: '#f3f4f6',
  card: '#ffffff',
  cardDeep: '#f9fafb',
  elevated: '#e5e7eb',

  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryGlow: 'rgba(59, 130, 246, 0.22)',
  primaryTint: 'rgba(59, 130, 246, 0.10)',
  primaryTintDark: 'rgba(59, 130, 246, 0.06)',

  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',

  border: '#e5e7eb',
  borderSubtle: '#f3f4f6',
  borderWhite: 'rgba(0, 0, 0, 0.07)',

  success: '#10b981',
  error: '#ef4444',
  errorTint: 'rgba(239, 68, 68, 0.08)',
  purple: '#8b5cf6',
  purpleTint: 'rgba(139, 92, 246, 0.09)',
  
  isDark: false,
};

export const DARK_COLORS = {
  bg: '#111827',
  surface: '#1f2937',
  surfaceDeep: '#374151',
  card: '#1f2937',
  cardDeep: '#111827',
  elevated: '#4b5563',

  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryGlow: 'rgba(59, 130, 246, 0.22)',
  primaryTint: 'rgba(59, 130, 246, 0.15)',
  primaryTintDark: 'rgba(59, 130, 246, 0.25)',

  textPrimary: '#f9fafb',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  textFaint: '#6b7280',

  border: '#374151',
  borderSubtle: '#1f2937',
  borderWhite: 'rgba(255, 255, 255, 0.1)',

  success: '#10b981',
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
