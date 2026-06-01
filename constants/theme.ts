/**
 * Central theme: colors and design tokens for the app.
 * Use these everywhere so styling is consistent and easy to change.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

/** Legacy light/dark scheme (tabs, icons). */
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#1A242F',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export interface ThemeVariables {
  backgroundGradient: readonly string[];
  brandGradient: readonly string[];
  cardBackground: string;
  cardBackgroundSoft: string;
  surfaceMuted: string;
  surfaceLight: string;
  cardShadowColor: string;
  cardShadowOpacity: number;
  cardShadowRadius: number;
  cardShadowOffset: { width: number; height: number };
  cardBorderRadius: number;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDivider: string;
  textOnDark: string;
  link: string;
  accent: string;
  borderLight: string;
  borderInput: string;
  divider: string;
  inputBackground: string;
  inputPlaceholder: string;
  outlineButtonBorder: string;
  outlineButtonBackground: string;
  outlineButtonText: string;
  socialButtonBackground: string;
  socialButtonBorder: string;
  socialButtonText: string;
  gradientButtonText: string;
  iconMuted: string;
  iconPrimary: string;
  accentTeal: string;
  accentBlue: string;
  accentDark: string;
  accentGreen: string;
  statAccents: readonly string[];
  cardBorder: string;
  cardBackgroundSemi: string;
  surfaceSoft: string;
  surfaceIcon: string;
  drawerBorder: string;
  rowBorder: string;
  badgeHotBg: string;
  badgeHotBorder: string;
  badgeNewBg: string;
  badgeNewBorder: string;
  badgeMutedBg: string;
  badgeMutedBorder: string;
  textHot: string;
  textOnAccent: string;
  darkCardOverlay: string;
  darkCardButtonBorder: string;
  darkCardTextMuted: string;
  danger: string;
  dangerBorder: string;
  dangerBg: string;
  screenPadding: number;
  cardPaddingH: number;
  cardPaddingV: number;
  inputBorderRadius: number;
  buttonBorderRadius: number;
}

/** Auth & shared screen palette – use dynamically across auth and other screens. */
export const LightTheme: ThemeVariables = {
  // Background & gradients
  backgroundGradient: ['#D8E9F6', '#F1F6FB', '#F5E6DB'],
  /** Dark teal (left) → light teal (right) – matches reference. */
  brandGradient: ['#0b2341', '#00a7b5'],

  // Surfaces
  cardBackground: '#FFFFFF',
  cardBackgroundSoft: '#F7FBFF',
  surfaceMuted: '#EEF3F8',
  surfaceLight: '#E3EAF2',
  cardShadowColor: '#000000',
  cardShadowOpacity: 0.08,
  cardShadowRadius: 16,
  cardShadowOffset: { width: 0, height: 10 },
  cardBorderRadius: 26,

  // Text
  textPrimary: '#0B2D3E',
  textSecondary: '#5B6B7A',
  textMuted: '#6A7B8C',
  textDivider: '#8A98A8',
  textOnDark: '#FFFFFF',

  // Links & accents
  link: '#00a7b5',
  accent: '#00a7b5',

  // Borders & dividers
  borderLight: '#E1E8F0',
  borderInput: '#D5E2F1',
  divider: '#D9E3EE',

  // Input
  inputBackground: '#EAF2FF',
  inputPlaceholder: '#9AA7B6',

  // Buttons
  outlineButtonBorder: '#D1DCE9',
  outlineButtonBackground: '#FFFFFF',
  outlineButtonText: '#2A3C4B',
  socialButtonBackground: '#FFFFFF',
  socialButtonBorder: '#E1E8F0',
  socialButtonText: '#2A3C4B',
  gradientButtonText: '#FFFFFF',

  // Icons (semantic)
  iconMuted: '#5B6B7A',
  iconPrimary: '#2A3C4B',

  // Main app / Dashboard
  accentTeal: '#0a2341',
  accentBlue: '#1B5E9A',
  accentDark: '#0B2D3E',
  accentGreen: '#16A34A',
  statAccents: ['#0a2341', '#1B5E9A', '#0B2D3E', '#16A34A'],
  cardBorder: '#E4EAF2',
  cardBackgroundSemi: 'rgba(255, 255, 255, 0.92)',
  surfaceSoft: '#F7FAFE',
  surfaceIcon: '#F1F5FA',
  drawerBorder: '#D6DEE8',
  rowBorder: '#EEF2F7',
  badgeHotBg: '#FFE8E8',
  badgeHotBorder: '#FFD0D0',
  badgeNewBg: '#E8F8FF',
  badgeNewBorder: '#CDEEFF',
  badgeMutedBg: '#F1F5FA',
  badgeMutedBorder: '#E4EAF2',
  textHot: '#D24A4A',
  textOnAccent: '#FFFFFF',
  darkCardOverlay: 'rgba(255,255,255,0.08)',
  darkCardButtonBorder: 'rgba(255,255,255,0.14)',
  darkCardTextMuted: 'rgba(234, 242, 255, 0.75)',

  // Danger / destructive
  danger: '#DC2626',
  dangerBorder: '#FECACA',
  dangerBg: '#FEF2F2',

  // Spacing / layout
  screenPadding: 20,
  cardPaddingH: 20,
  cardPaddingV: 28,
  inputBorderRadius: 12,
  buttonBorderRadius: 14,
};

export const DarkThemeColors: ThemeVariables = {
  // Background & gradients
  backgroundGradient: ['#1A242F', '#161F29', '#1A242F'],
  brandGradient: ['#0b2341', '#00a7b5'],

  // Surfaces
  cardBackground: '#1A242F',
  cardBackgroundSoft: '#222F3D',
  surfaceMuted: '#2A384A',
  surfaceLight: '#324256',
  cardShadowColor: '#000000',
  cardShadowOpacity: 0.2,
  cardShadowRadius: 16,
  cardShadowOffset: { width: 0, height: 10 },
  cardBorderRadius: 26,

  // Text
  textPrimary: '#ECF2F8',
  textSecondary: '#A0B4C6',
  textMuted: '#7A91A5',
  textDivider: '#4E6173',
  textOnDark: '#FFFFFF',

  // Links & accents
  link: '#00a7b5',
  accent: '#00a7b5',

  // Borders & dividers
  borderLight: '#2C3B4B',
  borderInput: '#34465A',
  divider: '#324254',

  // Input
  inputBackground: '#243141',
  inputPlaceholder: '#698197',

  // Buttons
  outlineButtonBorder: '#34465A',
  outlineButtonBackground: '#1A242F',
  outlineButtonText: '#ECF2F8',
  socialButtonBackground: '#1A242F',
  socialButtonBorder: '#34465A',
  socialButtonText: '#ECF2F8',
  gradientButtonText: '#FFFFFF',

  // Icons (semantic)
  iconMuted: '#7A91A5',
  iconPrimary: '#ECF2F8',

  // Main app / Dashboard
  accentTeal: '#0a2341',
  accentBlue: '#1B5E9A',
  accentDark: '#F0F5F9',
  accentGreen: '#16A34A',
  statAccents: ['#0a2341', '#1B5E9A', '#F0F5F9', '#16A34A'],
  cardBorder: '#273646',
  cardBackgroundSemi: 'rgba(26, 36, 47, 0.92)',
  surfaceSoft: '#151D26',
  surfaceIcon: '#222F3D',
  drawerBorder: '#273646',
  rowBorder: '#222F3C',
  badgeHotBg: 'rgba(220, 38, 38, 0.15)',
  badgeHotBorder: '#DC2626',
  badgeNewBg: 'rgba(11, 160, 178, 0.15)',
  badgeNewBorder: '#0a2341',
  badgeMutedBg: '#2A384A',
  badgeMutedBorder: '#273646',
  textHot: '#FF4545',
  textOnAccent: '#FFFFFF',
  darkCardOverlay: 'rgba(255,255,255,0.04)',
  darkCardButtonBorder: 'rgba(255,255,255,0.08)',
  darkCardTextMuted: 'rgba(234, 242, 255, 0.65)',

  // Danger / destructive
  danger: '#DC2626',
  dangerBorder: '#FECACA',
  dangerBg: 'rgba(220, 38, 38, 0.1)',

  // Spacing / layout
  screenPadding: 20,
  cardPaddingH: 20,
  cardPaddingV: 28,
  inputBorderRadius: 12,
  buttonBorderRadius: 14,
};

export type ThemeColors = ThemeVariables;

export const AppTheme = {
  light: LightTheme,
  dark: DarkThemeColors,
};

// Leave backward-compatible object for now to prevent breaking instantly
export const Theme = LightTheme;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Consolas, monospace",
  },
});
