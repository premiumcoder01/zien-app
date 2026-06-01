import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = Math.min(SCREEN_WIDTH - 60, 260);

type LinkItem = {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
};

const INITIAL_LINKS: LinkItem[] = [
  { id: '1', title: 'Featured Property: Malibu Villa', type: 'Listing', enabled: true },
  { id: '2', title: 'Book a Strategy Call', type: 'Calendar', enabled: true },
  { id: '3', title: 'Download My Q1 Market Report', type: 'Lead Magnet', enabled: true },
  { id: '4', title: 'YouTube Walkthroughs', type: 'Video', enabled: false },
];

const THEMES = [
  { id: 'glass', label: 'Glass' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'dark-oasis', label: 'Dark Oasis' },
  { id: 'neon-print', label: 'Neon Print' },
];

type ThemePreviewStyle = {
  screenBg: string[];
  screenBgSolid?: string;
  avatarBg: string;
  nameColor: string;
  titleColor: string;
  linkBtnBg: string;
  linkBtnBorder: string;
  linkBtnText: string;
  linkBtnIcon: string;
  footerBorder: string;
  footerIcon: string;
  useGradient: boolean;
};

const THEME_PREVIEW: Record<string, ThemePreviewStyle> = {
  glass: {
    useGradient: true,
    screenBg: ['#E8F0F8', '#D4E2F0', '#E0EAF4'],
    screenBgSolid: '#E0EAF4',
    avatarBg: 'rgba(255,255,255,0.85)',
    nameColor: '#0B2D3E',
    titleColor: '#5B6B7A',
    linkBtnBg: 'rgba(255,255,255,0.75)',
    linkBtnBorder: 'rgba(255,255,255,0.95)',
    linkBtnText: '#0B2D3E',
    linkBtnIcon: '#0a2341',
    footerBorder: 'rgba(11,45,62,0.12)',
    footerIcon: '#0a2341',
  },
  minimal: {
    useGradient: false,
    screenBg: ['#FAFAFA'],
    screenBgSolid: '#FAFAFA',
    avatarBg: '#E4EAF2',
    nameColor: '#0B2D3E',
    titleColor: '#5B6B7A',
    linkBtnBg: '#FFFFFF',
    linkBtnBorder: '#E4EAF2',
    linkBtnText: '#0B2D3E',
    linkBtnIcon: '#5B6B7A',
    footerBorder: '#EEF2F7',
    footerIcon: '#9CA3AF',
  },
  'dark-oasis': {
    useGradient: true,
    screenBg: ['#0F172A', '#1E293B', '#0F172A'],
    screenBgSolid: '#111D31',
    avatarBg: 'rgba(255,255,255,0.15)',
    nameColor: '#FFFFFF',
    titleColor: 'rgba(255,255,255,0.8)',
    linkBtnBg: 'rgba(255,255,255,0.12)',
    linkBtnBorder: 'rgba(255,255,255,0.2)',
    linkBtnText: '#FFFFFF',
    linkBtnIcon: '#7DD3FC',
    footerBorder: 'rgba(255,255,255,0.1)',
    footerIcon: 'rgba(255,255,255,0.6)',
  },
  'neon-print': {
    useGradient: true,
    screenBg: ['#0B0B0F', '#1a0a2e', '#0B0B0F'],
    screenBgSolid: '#0B0B0F',
    avatarBg: 'rgba(255,255,255,0.08)',
    nameColor: '#FFFFFF',
    titleColor: '#A78BFA',
    linkBtnBg: 'transparent',
    linkBtnBorder: '#C084FC',
    linkBtnText: '#E9D5FF',
    linkBtnIcon: '#C084FC',
    footerBorder: 'rgba(168,85,247,0.3)',
    footerIcon: '#C084FC',
  },
};

function getPreviewTheme(themeId: string): ThemePreviewStyle {
  return THEME_PREVIEW[themeId] ?? THEME_PREVIEW.minimal;
}

const IPHONE_FRAME_WIDTH = PREVIEW_WIDTH + 24;
const IPHONE_CORNER = 40;

function PhonePreview({
  themeId,
  previewWidth,
  activeLinks,
}: {
  themeId: string;
  previewWidth: number;
  activeLinks: LinkItem[];
}) {
  const t = getPreviewTheme(themeId);
  const isGradient = t.useGradient && t.screenBg.length > 1;

  const screenContent = (
    <View style={styles.previewContentContainer}>
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: t.avatarBg }]} />
        <Text style={[styles.profileName, { color: t.nameColor }]}>JORDAN SMITH</Text>
        <Text style={[styles.profileTitle, { color: t.titleColor }]}>
          Luxury Real Estate Broker
        </Text>
      </View>
      <View style={styles.linkButtons}>
        {activeLinks.map((link) => (
          <View
            key={link.id}
            style={[
              styles.previewLinkBtn,
              {
                backgroundColor: t.linkBtnBg,
                borderWidth: 1,
                borderColor: t.linkBtnBorder,
              },
            ]}>
            <Text
              style={[styles.previewLinkBtnText, { color: t.linkBtnText }]}
              numberOfLines={1}>
              {link.title}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.previewFooterAction}>
        <View style={[styles.footerIcons, { borderTopColor: t.footerBorder }]}>
          <MaterialCommunityIcons name="instagram" size={18} color={t.footerIcon} />
          <MaterialCommunityIcons name="twitter" size={18} color={t.footerIcon} />
          <MaterialCommunityIcons name="link-variant" size={18} color={t.footerIcon} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.phoneFrame, { width: IPHONE_FRAME_WIDTH }]}>
      <View style={styles.phoneScreenOuter}>
        <View style={[styles.phoneScreenInner, { width: previewWidth, height: 520 }]}>
          {isGradient ? (
            <LinearGradient
              colors={t.screenBg as any}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: t.screenBgSolid ?? t.screenBg[0] }]} />
          )}
          {screenContent}
        </View>
      </View>
      {/* Notch */}
      <View style={styles.notchContainer}>
        <View style={styles.notch} />
      </View>
    </View>
  );
}

export default function BioLinkCustomizerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>(INITIAL_LINKS);
  const [theme, setTheme] = useState('glass');

  const toggleLink = (id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  const activeLinks = links.filter((l) => l.enabled);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#CFDCE7', '#E0ECF4', '#F4F0EE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0B2D3E" />
          </Pressable>

          <View style={styles.headerTexts}>
            <Text style={styles.appTitle}>Bio-Link Customizer</Text>
            <Text style={styles.appSubtitle}>Your digital business card for all social touchpoints.</Text>
          </View>
        </View>


      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.discardBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={18} color="#0B2D3E" />
          <Text style={styles.discardBtnText}>Discard</Text>
        </Pressable>
        <Pressable style={styles.publishBtn}>
          <Text style={styles.publishBtnText}>Publish Link</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Section */}
        <View style={styles.previewContainer}>
          <PhonePreview themeId={theme} previewWidth={PREVIEW_WIDTH} activeLinks={activeLinks} />
          <Text style={styles.publicUrl}>Public URL: zien.ai/becker</Text>
        </View>

        {/* Editor Section */}
        <View style={styles.editorCard}>
          <Text style={styles.editorTitle}>Active Links</Text>
          <View style={styles.linksList}>
            {links.map((link) => (
              <View key={link.id} style={styles.linkItem}>
                <MaterialCommunityIcons name="drag-vertical" size={20} color="#CBD5E1" />
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkType}>{link.type}</Text>
                </View>
                <Switch
                  value={link.enabled}
                  onValueChange={() => toggleLink(link.id)}
                  trackColor={{ false: '#E2E8F0', true: '#0D9488' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
          <Pressable style={styles.addLinkBtn}>
            <MaterialCommunityIcons name="plus" size={18} color="#0B2D3E" />
            <Text style={styles.addLinkText}>Add New Link or Component</Text>
          </Pressable>
        </View>

        {/* Theme Selector */}
        <View style={styles.themeSection}>
          <Text style={styles.editorTitle}>Visual Theme</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeList}>
            {THEMES.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.themeBtn, theme === t.id && styles.themeBtnActive]}
                onPress={() => setTheme(t.id)}
              >
                <Text style={[styles.themeBtnText, theme === t.id && styles.themeBtnTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10

  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: "flex-end",
    paddingHorizontal: 20
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2D3E',
  },
  publishBtn: {
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTexts: {
    gap: 4,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B2D3E',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#5B6B7A',
    fontWeight: '500',
    flexWrap: "wrap"
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  phoneFrame: {
    backgroundColor: '#1E293B',
    borderRadius: IPHONE_CORNER,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 10,
    position: 'relative',
  },
  phoneScreenOuter: {
    overflow: 'hidden',
    borderRadius: IPHONE_CORNER - 12,
    backgroundColor: '#000',
  },
  phoneScreenInner: {
    overflow: 'hidden',
    position: 'relative',
  },
  notchContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  notch: {
    width: 90,
    height: 24,
    backgroundColor: '#000',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  previewContentContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  profileTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  linkButtons: {
    width: '100%',
    gap: 12,
    flex: 1,
  },
  previewLinkBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLinkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewFooterAction: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerIcons: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    width: '60%',
    justifyContent: 'center',
  },
  publicUrl: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  // Editor
  editorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B2D3E',
    marginBottom: 16,
  },
  linksList: {
    gap: 12,
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
    marginBottom: 2,
  },
  linkType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  addLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
  },
  themeSection: {
    marginBottom: 40,
  },
  themeList: {
    gap: 10,
    paddingRight: 20,
  },
  themeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10, // Pill shape but slightly more squared as per new trends or stick to pill
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  themeBtnActive: {
    backgroundColor: '#0B2D3E',
    borderColor: '#0B2D3E',
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  themeBtnTextActive: {
    color: '#FFFFFF',
  },
});
