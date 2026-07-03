import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppTheme, ThemeColors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  branding: { theme_color: string | null; text_color: string | null } | null;
  setBranding: (branding: { theme_color: string | null; text_color: string | null } | null) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(systemScheme || 'light');
  const [branding, setBranding] = useState<{ theme_color: string | null; text_color: string | null } | null>(null);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        } else if (systemScheme) {
          setThemeState(systemScheme);
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      }
    };
    loadSavedTheme();
  }, [systemScheme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('app_theme', next).catch((e) =>
        console.warn('Failed to save theme preference:', e)
      );
      return next;
    });
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem('app_theme', mode).catch((e) =>
      console.warn('Failed to save theme preference:', e)
    );
  };

  const baseColors = AppTheme[theme];
  
  const colors = React.useMemo(() => {
    if (!branding) return baseColors;
    const themeColor = branding.theme_color;
    const textColor = branding.text_color;

    const overridden = { ...baseColors };
    if (themeColor) {
      overridden.accentTeal = themeColor;
      overridden.accent = themeColor;
      overridden.link = themeColor;
      overridden.brandGradient = [themeColor, themeColor] as any;
    }
    if (textColor) {
      overridden.gradientButtonText = textColor;
      overridden.textOnAccent = textColor;
    }
    return overridden;
  }, [baseColors, branding]);

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, branding, setBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
