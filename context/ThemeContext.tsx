import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppTheme, ThemeColors } from '@/constants/theme';

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

  // Let it initialize with system scheme, but manual toggle overrides it
  useEffect(() => {
    if (systemScheme) {
      setThemeState(systemScheme);
    }
  }, [systemScheme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
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
