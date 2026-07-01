import { useAppTheme } from '@/context/ThemeContext';
import { DigitalCard, updateDigitalCard } from '@/services/digitalCardService';
import { Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Lato_700Bold } from '@expo-google-fonts/lato';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Roboto_700Bold } from '@expo-google-fonts/roboto';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProfileCard, type ProfileCardData } from '../_components/ProfileCard';
import ColorPickerModal from '@/components/ui/ColorPickerModal';

type SelectedFontLabel = 'Inter' | 'Roboto' | 'Playfair' | 'Lato';

const FONT_LABEL_TO_FAMILY: Record<SelectedFontLabel, string> = {
  Inter: 'Inter_800ExtraBold',
  Roboto: 'Roboto_700Bold',
  Playfair: 'PlayfairDisplay_700Bold',
  Lato: 'Lato_700Bold',
};

type TemplateId = 'classic' | 'modern' | 'luxury' | 'minimal' | 'bold';

const TEMPLATES: {
  id: TemplateId;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
    { id: 'classic', label: 'Classic', description: 'Clean & Pro', icon: 'domain' },
    { id: 'modern', label: 'Modern', description: 'Sleek Visuals', icon: 'format-list-checks' },
    { id: 'luxury', label: 'Luxury', description: 'Premium Feel', icon: 'diamond-stone' },
    { id: 'minimal', label: 'Minimal', description: 'Less is More', icon: 'circle-outline' },
    { id: 'bold', label: 'Bold', description: 'High Impact', icon: 'lightning-bolt' },
  ];

const ACCENT_COLORS = [
  '#0B2341', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', '#22c55e', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#db2777', '#d946ef', '#8b5cf6', '#6366f1', '#64748b', '#000000'
] as const;

const FONT_OPTIONS: {
  label: SelectedFontLabel;
  tag: string;
  fontFamily: string;
}[] = [
    { label: 'Inter', tag: 'Sans-Serif', fontFamily: 'Inter_800ExtraBold' },
    { label: 'Roboto', tag: 'Geometric', fontFamily: 'Roboto_700Bold' },
    { label: 'Playfair', tag: 'Serif', fontFamily: 'PlayfairDisplay_700Bold' },
    { label: 'Lato', tag: 'Humanist', fontFamily: 'Lato_700Bold' },
  ];

interface ThemesColorSectionProps {
  onSectionChange?: (section: string) => void;
  cards?: DigitalCard[];
  activeCardId?: string | null;
  setActiveCardId?: (id: string | null) => void;
  activeCard: DigitalCard;
  accessToken: string | null;
  refetch: () => Promise<any>;
  saveTrigger: number;
}

export function ThemesColorSection({
  onSectionChange,
  activeCard,
  accessToken,
  refetch,
  saveTrigger
}: ThemesColorSectionProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors);

  const getTemplateId = (t?: string): TemplateId => {
    const normalized = t?.toLowerCase();
    if (normalized === 'classic' || normalized === 'modern' || normalized === 'luxury' || normalized === 'minimal' || normalized === 'bold') {
      return normalized as TemplateId;
    }
    return 'modern';
  };

  const getFontLabel = (f?: string): SelectedFontLabel => {
    const normalized = f?.toLowerCase();
    if (normalized === 'roboto') return 'Roboto';
    if (normalized === 'playfair') return 'Playfair';
    if (normalized === 'lato') return 'Lato';
    return 'Inter';
  };

  const getInitialColors = (cardColor?: string): string[] => {
    const base: string[] = [...ACCENT_COLORS];
    if (cardColor && !base.some(c => c.toUpperCase() === cardColor.toUpperCase())) {
      base.push(cardColor.toUpperCase());
    }
    return base;
  };

  const [template, setTemplate] = useState<TemplateId>(getTemplateId(activeCard?.template ?? undefined));
  const [accentColor, setAccentColor] = useState<string>(activeCard?.card_color || ACCENT_COLORS[0]);
  const [customAccentColors, setCustomAccentColors] = useState<string[]>(() => getInitialColors(activeCard?.card_color));
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedFontLabel, setSelectedFontLabel] = useState<SelectedFontLabel>(getFontLabel(activeCard?.font ?? undefined));
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const profileUrl = activeCard ? `https://staging.zien.ai/card/${activeCard.id}` : undefined;

  const [fontsLoaded] = useFonts({
    Inter_800ExtraBold,
    Roboto_700Bold,
    PlayfairDisplay_700Bold,
    Lato_700Bold,
  });

  // Track previous saveTrigger
  const lastSaveTrigger = useRef(saveTrigger);

  // Sync state when activeCard changes
  useEffect(() => {
    setTemplate(getTemplateId(activeCard.template ?? undefined));
    const newColor = activeCard.card_color || ACCENT_COLORS[0];
    setAccentColor(newColor);
    setSelectedFontLabel(getFontLabel(activeCard.font ?? undefined));
    setCustomAccentColors(prev => {
      if (newColor && !prev.some(c => c.toUpperCase() === newColor.toUpperCase())) {
        return [...prev, newColor.toUpperCase()];
      }
      return prev;
    });
  }, [activeCard]);

  // Handle save trigger
  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
      lastSaveTrigger.current = saveTrigger;
    }
  }, [saveTrigger]);

  const handleSave = async () => {
    if (!accessToken || !activeCard) return;
    setIsSaving(true);
    try {
      await updateDigitalCard(accessToken, String(activeCard.id), {
        template: template,
        card_color: accentColor,
        font: selectedFontLabel.toLowerCase(), // Send lowercase to backend
      });
      await refetch();
      Alert.alert('Success', 'Themes and colors updated successfully.');
    } catch (error: any) {
      console.error('Save failed:', error);
      Alert.alert('Error', error.message || 'Failed to update themes.');
    } finally {
      setIsSaving(false);
    }
  };

  const mapToCardData = (card: DigitalCard): ProfileCardData => ({
    fullName: card.name || card.profile_name || '',
    title: card.title || '',
    legalRole: card.role || '',
    license: card.license || '',
    company: card.company_name || '',
    address: card.address || '',
    phone: card.phone || '',
    email: card.email || '',
    website: card.website || '',
    instagram: card.instagram || '',
    linkedin: card.linkedin || '',
    facebook: card.facebook || '',
    tiktok: card.tiktok || '',
  });

  if (!activeCard) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="card-bulleted-off-outline" size={36} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No Card Found</Text>
        <Text style={styles.emptySub}>
          Please create your first digital business card from the Dashboard to customize its themes and colors.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.emptyGoBtn, pressed && { opacity: 0.9 }]}
          onPress={() => onSectionChange?.('/(main)/zien-card')}>
          <Text style={styles.emptyGoBtnText}>Go to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const cardData = mapToCardData(activeCard);

  const selectedFontFamily = fontsLoaded ? FONT_LABEL_TO_FAMILY[selectedFontLabel] : undefined;
  const activeLabelColor = isDark && (['#0B2D3E', '#0B2341', '#0F172A'].includes(accentColor)) ? '#FFFFFF' : accentColor;

  return (
    <View style={styles.main}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Collapsible Card Preview Accordion */}
        <Pressable
          style={styles.accordionHeader}
          onPress={() => setIsPreviewExpanded(!isPreviewExpanded)}>
          <View style={styles.accordionLeft}>
            <MaterialCommunityIcons
              name="card-bulleted-outline"
              size={20}
              color={colors.accentTeal}
            />
            <Text style={styles.accordionTitle}>
              {isPreviewExpanded ? "Hide Card Preview" : "Preview Digital Card"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isPreviewExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>

        {isPreviewExpanded && (
          <View style={styles.previewWrap}>
            <View style={styles.cardWrap}>
              <ProfileCard
                card={cardData}
                accentColor={accentColor}
                template={template}
                avatarUri={activeCard.image || undefined}
                companyLogoUri={activeCard.logo || undefined}
                headingFontFamily={selectedFontFamily}
                bodyFontFamily={selectedFontFamily}
                cardUrl={profileUrl}
              />
            </View>
          </View>
        )}

        {/* Select Template */}
        <Text style={styles.sectionTitle}>Select Template</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templateRow}
          style={styles.templateScroll}>
          {TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              style={[
                styles.templateChip,
                template === t.id && [
                  styles.templateChipActive,
                  { borderColor: activeLabelColor },
                ],
              ]}
              onPress={() => setTemplate(t.id)}>
              <View style={styles.templateIconWrap}>
                <MaterialCommunityIcons
                  name={t.icon}
                  size={22}
                  color={template === t.id ? activeLabelColor : '#5B6B7A'}
                />
              </View>
              <Text
                style={[
                  styles.templateLabel,
                  template === t.id && { color: activeLabelColor },
                ]}
                numberOfLines={1}>
                {t.label}
              </Text>
              <Text style={styles.templateDesc} numberOfLines={1}>
                {t.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Accent Color */}
        <Text style={styles.sectionTitle}>Accent Color</Text>
        <View style={styles.colorRow}>
          {customAccentColors.map((hex) => (
            <Pressable
              key={hex}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex },
                accentColor.toUpperCase() === hex.toUpperCase() && [
                  styles.colorSwatchSelected,
                  { borderColor: isDark && hex === '#0B2341' ? '#FFFFFF' : hex },
                ],
              ]}
              onPress={() => setAccentColor(hex)}>
              {accentColor.toUpperCase() === hex.toUpperCase() && (
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          ))}
          <Pressable
            style={styles.addColorBtn}
            onPress={() => setColorPickerVisible(true)}>
            <Text style={styles.addColorBtnText}>+</Text>
          </Pressable>
        </View>

        {/* Typography */}
        <Text style={styles.sectionTitle}>Typography</Text>
        {FONT_OPTIONS.map((opt) => {
          const isSelected = selectedFontLabel === opt.label;
          return (
            <Pressable
              key={opt.label}
              style={[
                styles.fontRowSingle,
                isSelected && [
                  styles.fontRowActive,
                  { borderColor: accentColor },
                ],
              ]}
              onPress={() => setSelectedFontLabel(opt.label as SelectedFontLabel)}>
              <View style={styles.fontColSingle}>
                <Text
                  style={[
                    styles.fontLabelSingle,
                    isSelected && { color: accentColor },
                    fontsLoaded && { fontFamily: opt.fontFamily },
                  ]}>
                  {opt.label}
                </Text>
                <Text style={styles.fontTag}>{opt.tag}</Text>
              </View>
              {isSelected && (
                <View style={[styles.fontCheck, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.savingText}>Saving changes...</Text>
        </View>
      )}

      <ColorPickerModal
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
        initialColor={accentColor}
        onSelectColor={(color) => {
          const cleaned = color.toUpperCase();
          setAccentColor(cleaned);
          setCustomAccentColors(prev => {
            if (!prev.some(c => c.toUpperCase() === cleaned)) {
              return [...prev, cleaned];
            }
            return prev;
          });
        }}
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  main: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
  topSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accentTeal,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  topSaveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  previewWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  templateScroll: { marginHorizontal: -18, marginBottom: 24 },
  templateRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  templateChip: {
    width: 110,
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
  },
  templateChipActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  templateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  templateDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
    marginBottom: 24,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {},
  addColorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addColorBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  fontRowSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 12,
  },
  fontRowActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
  },
  fontColSingle: {
    flex: 1,
  },
  fontLabelSingle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fontTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  fontCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  savingText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyGoBtn: {
    backgroundColor: colors.accentTeal,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyGoBtnText: {
    color: '#0B2D3E',
    fontWeight: '900',
    fontSize: 14,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
