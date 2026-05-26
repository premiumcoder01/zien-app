import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import GradientButton from './GradientButton';
import OutlineButton from './OutlineButton';

type ColorPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  initialColor: string;
  onSelectColor: (color: string) => void;
};

// Conversions
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

const PRESETS = [
  '#0B2D3E', '#0D9488', '#F97316', '#8B5CF6', '#10B981', '#DC2626',
  '#2563EB', '#0F172A', '#0891B2', '#D97706', '#BE185D', '#4F46E5',
  '#15803D', '#0369A1', '#C2410C', '#475569', '#57534E', '#1E3A8A'
];

export default function ColorPickerModal({
  visible,
  onClose,
  initialColor,
  onSelectColor,
}: ColorPickerModalProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(90);
  const [lightness, setLightness] = useState(50);
  const [hexInput, setHexInput] = useState(initialColor);

  useEffect(() => {
    if (visible && initialColor) {
      const parsed = hexToHsl(initialColor);
      setHue(parsed.h);
      setSaturation(parsed.s);
      setLightness(parsed.l);
      setHexInput(initialColor.toUpperCase());
    }
  }, [visible, initialColor]);

  const currentColor = hslToHex(hue, saturation, lightness);

  const handleHueChange = (value: number) => {
    setHue(value);
    const updated = hslToHex(value, saturation, lightness);
    setHexInput(updated);
  };

  const handleLightnessChange = (value: number) => {
    setLightness(value);
    const updated = hslToHex(hue, saturation, value);
    setHexInput(updated);
  };

  const handleHexChange = (text: string) => {
    let clean = text.toUpperCase();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setHexInput(clean);

    // Validate standard hex colors (#FFF or #FFFFFF)
    const isValid = /^#[0-9A-F]{3}$|^#[0-9A-F]{6}$/.test(clean);
    if (isValid) {
      const parsed = hexToHsl(clean);
      setHue(parsed.h);
      setSaturation(parsed.s);
      setLightness(parsed.l);
    }
  };

  const applyColor = () => {
    onSelectColor(currentColor);
    onClose();
  };

  const selectPreset = (color: string) => {
    const parsed = hexToHsl(color);
    setHue(parsed.h);
    setSaturation(parsed.s);
    setLightness(parsed.l);
    setHexInput(color);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Accent Color Picker</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Color Sphere Preview */}
            <View style={styles.previewContainer}>
              <View style={[styles.colorSphere, { backgroundColor: currentColor }]} />
              <View style={styles.hexInputWrap}>
                <TextInput
                  style={styles.hexInput}
                  value={hexInput}
                  onChangeText={handleHexChange}
                  placeholder="#000000"
                  placeholderTextColor={colors.textMuted}
                  maxLength={7}
                  autoCapitalize="characters"
                />
                <MaterialCommunityIcons name="palette-outline" size={16} color={colors.accentTeal} style={styles.paletteIcon} />
              </View>
            </View>

            {/* Curated Palette Presets */}
            <Text style={styles.sectionLabel}>CURATED PALETTES</Text>
            <View style={styles.presetsGrid}>
              {PRESETS.map((color) => {
                const isSelected = currentColor.toUpperCase() === color.toUpperCase();
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.presetCircle,
                      { backgroundColor: color },
                      isSelected && styles.presetCircleSelected,
                    ]}
                    onPress={() => selectPreset(color)}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Sliders */}
            <Text style={styles.sectionLabel}>FINE-TUNE HUE</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.gradientWrapper}>
                <LinearGradient
                  colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBar}
                />
                <Slider
                  style={styles.sliderOver}
                  minimumValue={0}
                  maximumValue={360}
                  value={hue}
                  onValueChange={handleHueChange}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor={currentColor}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>LIGHTNESS (BRIGHTNESS)</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.gradientWrapper}>
                <LinearGradient
                  colors={['#000000', hslToHex(hue, saturation, 50), '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBar}
                />
                <Slider
                  style={styles.sliderOver}
                  minimumValue={10}
                  maximumValue={90}
                  value={lightness}
                  onValueChange={handleLightnessChange}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor={currentColor}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actions}>
            <OutlineButton
              title="Cancel"
              onPress={onClose}
              style={styles.cancelBtn}
              textStyle={styles.actionBtnText}
            />
            <GradientButton
              title="Select Color"
              onPress={applyColor}
              style={styles.selectBtn}
              textStyle={styles.actionBtnText}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxWidth: 360,
      maxHeight: '90%',
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      paddingBottom: 16,
    },
    previewContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    colorSphere: {
      width: 72,
      height: 72,
      borderRadius: 36,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
      marginBottom: 12,
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    hexInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBorder + '20',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      width: 140,
      height: 40,
    },
    hexInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      padding: 0,
    },
    paletteIcon: {
      marginLeft: 4,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 10,
    },
    presetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
      justifyContent: 'flex-start',
    },
    presetCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    presetCircleSelected: {
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    },
    sliderContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    gradientWrapper: {
      height: 40,
      justifyContent: 'center',
    },
    gradientBar: {
      height: 12,
      borderRadius: 6,
      position: 'absolute',
      left: 0,
      right: 0,
    },
    sliderOver: {
      width: '100%',
      height: 40,
      ...Platform.select({
        web: {
          outlineWidth: 0,
        },
      }),
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelBtn: {
      flex: 1,
      height: 54,
      paddingVertical: 0,
    },
    selectBtn: {
      flex: 1,
      height: 54,
    },
    actionBtnText: {
      fontSize: 13,
    },
  });
