import { ExternalLink } from '@/components/external-link';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const CARD_PROFILE_URL = 'https://zien.codesmile.in/card/card-default-01/';



export type ProfileCardData = {
  fullName: string;
  title: string;
  legalRole: string;
  license: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  linkedin: string;
  facebook: string;
  tiktok: string;
};

export const DEFAULT_PROFILE_CARD: ProfileCardData = {
  fullName: 'Becker Samarraie',
  title: 'Team Lead',
  legalRole: 'REALTOR',
  license: 'DRE #01928374',
  company: 'HomeSmart',
  address: 'Beverly Hills, CA',
  phone: '(310) 555-0123',
  email: 'becker@homesmart.com',
  website: 'https://homesmart.com',
  instagram: 'https://instagram.com/becker_homesmart',
  linkedin: 'https://linkedin.com/in/becker-samarraie',
  facebook: '',
  tiktok: '',
};

export type CardFontPairing = 'inter' | 'playfair';

/** Card layout template: modern (default), classic, luxury, minimal, or bold (two-tone, overlapping avatar). */
export type CardTemplate = 'modern' | 'classic' | 'luxury' | 'minimal' | 'bold';

type ProfileCardProps = {
  card: ProfileCardData;
  avatarUri?: string;
  companyLogoUri?: string;
  /** URL encoded in the QR code; when scanned, opens in browser. */
  cardUrl?: string;
  /** Accent color for header/background and key text (default #0B2D3E). */
  accentColor?: string;
  /** Layout template: modern (default), classic, luxury, minimal, or bold. */
  template?: CardTemplate;
  /** Font pairing: inter (sans) or playfair (serif headings). Used when heading/body font families are not provided. */
  fontPairing?: CardFontPairing;
  /** Loaded font family name for headings. When set, overrides fontPairing for headings. */
  headingFontFamily?: string;
  /** Loaded font family name for body text. When set, overrides fontPairing for body. */
  bodyFontFamily?: string;
};

const DEFAULT_ACCENT = '#0B2D3E';

export function ProfileCard({
  card,
  avatarUri,
  companyLogoUri,
  cardUrl = CARD_PROFILE_URL,
  accentColor = DEFAULT_ACCENT,
  template = 'modern',
  fontPairing = 'inter',
  headingFontFamily,
  bodyFontFamily,
}: ProfileCardProps) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const isDark = theme === 'dark';



  const DEFAULT_SHADOWS = ['#0B2D3E', '#0B2341', '#0F172A'];
  const activeAccent = (accentColor === DEFAULT_ACCENT || DEFAULT_SHADOWS.includes(accentColor)) && isDark ? '#FFFFFF' : accentColor;

  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  const flipToBack = () => {
    Animated.spring(flipAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start(() => setIsFlipped(true));
  };

  const flipToFront = () => {
    Animated.spring(flipAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start(() => setIsFlipped(false));
  };

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const openPhone = () => Linking.openURL(`tel:${card.phone.replace(/\D/g, '')}`);
  const openEmail = () => Linking.openURL(`mailto:${card.email}`);

  const headingFont =
    headingFontFamily ??
    (fontPairing === 'playfair' ? (Platform.OS === 'ios' ? 'Georgia' : 'serif') : undefined);
  const bodyFont =
    bodyFontFamily ??
    (fontPairing === 'playfair' ? (Platform.OS === 'ios' ? 'Georgia' : 'serif') : undefined);

  const isClassic = template === 'classic';
  const isLuxury = template === 'luxury';
  const isMinimal = template === 'minimal';
  const isBold = template === 'bold';

  const [firstName, ...rest] = (card.fullName || 'Anonymous').split(' ');
  const lastName = rest.join(' ') || '';
  const initials = ((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase() || '?';

  const renderAvatar = (style: any, isBoldTemplate = false) => {
    if (avatarUri?.trim()) {
      return (
        <Image
          source={{ uri: avatarUri.trim() }}
          style={style}
          contentFit="cover"
        />
      );
    }
    return (
      <View style={[style, styles.initialsAvatar, { backgroundColor: isBoldTemplate ? 'rgba(255,255,255,0.2)' : activeAccent + '20' }]}>
        <Text style={[styles.initialsText, { color: isBoldTemplate ? '#FFFFFF' : activeAccent }]}>
          {initials}
        </Text>
      </View>
    );
  };

  const infoPlaceholder = 'Not Provided';
  const getVal = (val?: string) => (val?.trim() ? val : infoPlaceholder);
  const isAlt = (val?: string) => !val?.trim();

  return (
    <View style={styles.container}>
      {/* Front face: Modern, Classic, or Luxury */}
      <Animated.View
        style={[
          styles.face,
          styles.front,
          isClassic && [styles.frontClassic, { backgroundColor: accentColor }],
          isLuxury && [styles.frontLuxury, { backgroundColor: accentColor }],
          isMinimal && styles.frontMinimal,
          isBold && styles.frontBold,
          { transform: [{ perspective: 1200 }, { rotateY: frontRotateY }] },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}>
        {isClassic ? (
          <View style={styles.classicFrontInner}>
            <View style={styles.classicTopRow}>
              <View style={styles.classicIconLeft}>
                {companyLogoUri?.trim() ? (
                  <Image
                    source={{ uri: companyLogoUri.trim() }}
                    style={styles.companyLogo}
                    contentFit="contain"
                  />
                ) : (
                  <MaterialCommunityIcons name="atom" size={24} color="#FFFFFF" />
                )}
              </View>
              <Pressable style={styles.classicFlipBtn} onPress={flipToBack} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.classicBody}>
              <View style={styles.classicAvatarWrap}>
                {renderAvatar(styles.avatar)}
              </View>
              <Text style={[styles.classicName, headingFont ? { fontFamily: headingFont } : undefined]} numberOfLines={1}>{getVal(card.fullName)}</Text>
              {!!card.title?.trim() && (
                <Text style={[styles.classicTitle, headingFont ? { fontFamily: headingFont } : undefined]}>{card.title.toUpperCase()}</Text>
              )}
              {!!card.title?.trim() && <View style={styles.classicLine} />}
              {!!card.phone?.trim() && (
                <Pressable style={styles.classicContactRow} onPress={openPhone}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.classicContactText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.phone}</Text>
                </Pressable>
              )}
              {!!card.email?.trim() && (
                <Pressable style={styles.classicContactRow} onPress={openEmail}>
                  <MaterialCommunityIcons name="email-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.classicContactText, bodyFont ? { fontFamily: bodyFont } : undefined]} numberOfLines={1}>{card.email}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : isLuxury ? (
          <View style={styles.luxuryFrontInner}>
            <View style={styles.luxuryCurveOverlay} />
            <View style={styles.luxuryTopRow}>
              <View style={styles.luxuryAvatarWrap}>
                {renderAvatar(styles.avatar)}
              </View>
              <Pressable style={styles.luxuryFlipBtn} onPress={flipToBack} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>
            <View style={styles.luxuryNameBlock}>
              <Text style={[styles.luxuryName, headingFont ? { fontFamily: headingFont } : undefined]} numberOfLines={1}>{getVal(card.fullName)}</Text>
              {!!card.title?.trim() && (
                <Text style={[styles.luxuryTitle, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.title}</Text>
              )}
            </View>
            <View style={styles.luxuryContactBlock}>
              {!!card.phone?.trim() && (
                <Pressable style={styles.luxuryContactBtn} onPress={openPhone}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.luxuryContactText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.phone}</Text>
                </Pressable>
              )}
              {!!card.email?.trim() && (
                <Pressable style={styles.luxuryContactBtn} onPress={openEmail}>
                  <MaterialCommunityIcons name="email-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.luxuryContactText, bodyFont ? { fontFamily: bodyFont } : undefined]} numberOfLines={1}>{card.email}</Text>
                </Pressable>
              )}
            </View>
            {!!card.company?.trim() && (
              <View style={styles.luxuryFooter}>
                {companyLogoUri?.trim() ? (
                  <Image source={{ uri: companyLogoUri.trim() }} style={styles.luxuryCompanyLogo} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="atom" size={20} color="rgba(255,255,255,0.9)" />
                )}
                <Text style={[styles.luxuryCompanyName, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.company.toUpperCase()}</Text>
              </View>
            )}
          </View>
        ) : isMinimal ? (
          <View style={styles.minimalFrontInner}>
            <Pressable style={styles.minimalFlipBtn} onPress={flipToBack} hitSlop={12}>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#9AA7B6" />
            </Pressable>
            <View style={styles.minimalBody}>
              <View style={[styles.minimalAvatarWrap, { borderColor: accentColor }]}>
                {renderAvatar(styles.avatar)}
              </View>
              <View style={[styles.minimalNameBlock, { borderColor: activeAccent }]}>
                <Text style={[styles.minimalFirstName, { color: activeAccent }, headingFont ? { fontFamily: headingFont } : undefined]}>{firstName || 'User'}</Text>
                <Text style={[styles.minimalLastName, { color: activeAccent }, headingFont ? { fontFamily: headingFont } : undefined]}>{lastName}</Text>
              </View>
              {!!card.title?.trim() && (
                <Text style={[styles.minimalTitle, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.title.toUpperCase()}</Text>
              )}
              {!!card.title?.trim() && <View style={styles.minimalLine} />}
              <View style={styles.minimalIconRow}>
                {!!card.phone?.trim() && (
                  <Pressable onPress={openPhone} style={styles.minimalIconBtn}>
                    <MaterialCommunityIcons name="phone-outline" size={22} color="#9AA7B6" />
                  </Pressable>
                )}
                {!!card.email?.trim() && (
                  <Pressable onPress={openEmail} style={styles.minimalIconBtn}>
                    <MaterialCommunityIcons name="email-outline" size={22} color="#9AA7B6" />
                  </Pressable>
                )}
                {!!card.website?.trim() && (
                  <ExternalLink href={card.website} style={styles.minimalIconBtn}>
                    <MaterialCommunityIcons name="web" size={22} color="#9AA7B6" />
                  </ExternalLink>
                )}
              </View>
            </View>
          </View>
        ) : isBold ? (
          <View style={styles.boldFrontInner}>
            <View style={[styles.boldTop, { backgroundColor: accentColor }]}>
              <Pressable style={styles.boldFlipBtn} onPress={flipToBack} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
              </Pressable>
              <View style={styles.boldNameBlock}>
                <Text style={[styles.boldFirstName, headingFont ? { fontFamily: headingFont } : undefined]}>{firstName}</Text>
                <Text style={[styles.boldLastName, headingFont ? { fontFamily: headingFont } : undefined]}>{lastName}</Text>
              </View>
              <View style={[styles.boldAvatarWrap, { borderColor: 'rgba(255,255,255,0.9)' }]}>
                {renderAvatar(styles.boldAvatar, true)}
              </View>
            </View>
            <View style={styles.boldBottom}>
              {!!card.title?.trim() && (
                <Text style={[styles.boldTitle, headingFont ? { fontFamily: headingFont } : undefined]}>{card.title.toUpperCase()}</Text>
              )}
              {!!card.title?.trim() && <View style={styles.boldLine} />}
              {!!card.phone?.trim() && (
                <Pressable onPress={openPhone}>
                  <Text style={[styles.boldContactText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.phone}</Text>
                </Pressable>
              )}
              {!!card.email?.trim() && (
                <Pressable onPress={openEmail}>
                  <Text style={[styles.boldContactText, bodyFont ? { fontFamily: bodyFont } : undefined]} numberOfLines={1}>{card.email}</Text>
                </Pressable>
              )}
              {!!card.company?.trim() && (
                <Text style={[styles.boldContactText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.company}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.frontInner}>
            <View style={[styles.frontTop, { backgroundColor: accentColor }]}>
              <View style={styles.iconLeft}>
                {companyLogoUri?.trim() ? (
                  <Image source={{ uri: companyLogoUri.trim() }} style={styles.companyLogo} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="atom" size={22} color="#FFFFFF" />
                )}
              </View>
              <Pressable style={styles.flipBtnRight} onPress={flipToBack} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-right" size={20} color={accentColor} />
              </Pressable>
            </View>
            <View style={styles.frontBody}>
              <View style={styles.avatarWrap}>
                {renderAvatar(styles.avatar)}
              </View>
              <Text style={[styles.name, { color: activeAccent }, headingFont ? { fontFamily: headingFont } : undefined]} numberOfLines={1}>{getVal(card.fullName)}</Text>
              {!!card.title?.trim() && (
                <Text style={[styles.role, { color: activeAccent }, headingFont ? { fontFamily: headingFont } : undefined]}>{card.title}</Text>
              )}
              {(() => {
                const hasRole = !!card.legalRole?.trim();
                const hasLicense = !!card.license?.trim();
                if (!hasRole && !hasLicense) return null;
                return (
                  <Text style={[styles.license, bodyFont ? { fontFamily: bodyFont } : undefined]}>
                    {hasRole && hasLicense ? `${card.legalRole} • ${card.license}` : (card.legalRole || card.license)}
                  </Text>
                );
              })()}
              {!!card.phone?.trim() && (
                <Pressable style={styles.contactField} onPress={openPhone}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color="#7B8794" />
                  <Text style={[styles.contactFieldText, { color: activeAccent }, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.phone}</Text>
                </Pressable>
              )}
              {!!card.email?.trim() && (
                <Pressable style={styles.contactField} onPress={openEmail}>
                  <MaterialCommunityIcons name="email-outline" size={18} color="#7B8794" />
                  <Text style={[styles.contactFieldText, { color: activeAccent }, bodyFont ? { fontFamily: bodyFont } : undefined]} numberOfLines={1}>{card.email}</Text>
                </Pressable>
              )}
              <View style={styles.socialRow}>
                {!!card.website?.trim() && (
                  <ExternalLink href={card.website} style={styles.socialLink}>
                    <MaterialCommunityIcons name="web" size={20} color="#7B8794" />
                  </ExternalLink>
                )}
                {!!card.instagram?.trim() && (
                  <ExternalLink href={card.instagram} style={styles.socialLink}>
                    <MaterialCommunityIcons name="instagram" size={20} color="#7B8794" />
                  </ExternalLink>
                )}
                {!!card.linkedin?.trim() && (
                  <ExternalLink href={card.linkedin} style={styles.socialLink}>
                    <MaterialCommunityIcons name="linkedin" size={20} color="#7B8794" />
                  </ExternalLink>
                )}
                {!!card.facebook?.trim() && (
                  <ExternalLink href={card.facebook} style={styles.socialLink}>
                    <MaterialCommunityIcons name="facebook" size={20} color="#7B8794" />
                  </ExternalLink>
                )}
                {!!card.tiktok?.trim() && (
                  <ExternalLink href={card.tiktok} style={styles.socialLink}>
                    <MaterialCommunityIcons name="music-note" size={20} color="#7B8794" />
                  </ExternalLink>
                )}
              </View>
              <View style={styles.frontBottom}>
                <View style={styles.metaCol}>
                  {!!card.company?.trim() && (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="home-outline" size={14} color="#5B6B7A" />
                      <Text style={[styles.metaText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.company}</Text>
                    </View>
                  )}
                  {!!card.address?.trim() && (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color="#5B6B7A" />
                      <Text style={[styles.metaText, bodyFont ? { fontFamily: bodyFont } : undefined]}>{card.address}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.smallQrBox}>
                  <QRCode value={cardUrl} size={44} color={accentColor} backgroundColor="#F7FBFF" />
                </View>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[
          styles.face,
          styles.back,
          (isClassic || isLuxury) && [styles.backClassic, { backgroundColor: accentColor }],
          { transform: [{ perspective: 1200 }, { rotateY: backRotateY }] },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}>
        <View style={[styles.backInner, (isClassic || isLuxury) && styles.backInnerClassic]}>
          {!isClassic && !isLuxury && !isMinimal && !isBold && <View style={[styles.backTopLine, { backgroundColor: accentColor }]} />}
          <Pressable style={[styles.backBtn, (isClassic || isLuxury) && styles.backBtnClassic]} onPress={flipToFront} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={(isClassic || isLuxury) ? '#FFFFFF' : activeAccent} />
          </Pressable>
          <Text style={[styles.backTitle, { color: (isClassic || isLuxury) ? '#FFFFFF' : activeAccent }, headingFont ? { fontFamily: headingFont } : undefined]}>Scan to Connect</Text>
          <Text style={[styles.backSub, (isClassic || isLuxury) && styles.backSubClassic, bodyFont ? { fontFamily: bodyFont } : undefined]}>Instant access to your profile.</Text>
          <View style={[styles.backQr, (isClassic || isLuxury) && styles.backQrClassic]}>
            <QRCode value={cardUrl} size={200} color={accentColor} backgroundColor="#FFFFFF" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 320,
    minHeight: 500,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  front: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.cardShadowColor || '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  frontInner: {
    flex: 1,
    minHeight: 500,
  },
  frontTop: {
    height: 100,
    backgroundColor: '#0B2D3E', // Keep accent or theme card static overlay if defined
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  companyLogo: {
    width: 36,
    height: 36,
  },
  flipBtnRight: {
    position: 'absolute',
    right: 16,
    top: 17,
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.cardBackground,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.cardBorder,
    marginTop: -30,
    backgroundColor: colors.cardBackground,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 24,
    fontWeight: '900',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  role: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'left',
    marginTop: 6,
    letterSpacing: 1.2,
  },
  license: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 14,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  contactFieldText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialLink: {
    padding: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  frontBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  metaCol: { flex: 1 },
  smallQrBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backInner: {
    flex: 1,
    minHeight: 500,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  backTopLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 56,
    marginBottom: 6,
  },
  backSub: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  backQr: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Classic template
  frontClassic: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  classicFrontInner: {
    flex: 1,
    minHeight: 500,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  classicTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  classicIconLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  classicFlipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  classicBody: {
    flex: 1,
    paddingTop: 12,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  classicAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
  },
  classicName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  classicTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.4,
    marginTop: 6,
    opacity: 0.95,
  },
  classicLine: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginVertical: 16,
  },
  classicContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  classicContactText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backClassic: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backInnerClassic: {
    paddingTop: 24,
  },
  backBtnClassic: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backSubClassic: {
    color: 'rgba(255,255,255,0.9)',
  },
  backQrClassic: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  // Luxury template
  frontLuxury: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  luxuryFrontInner: {
    flex: 1,
    minHeight: 500,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  luxuryCurveOverlay: {
    position: 'absolute',
    top: 0,
    left: -40,
    right: -40,
    height: 135,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderBottomRightRadius: 140,
  },
  luxuryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  luxuryAvatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  luxuryFlipBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  luxuryNameBlock: {
    marginBottom: 20,
  },
  luxuryName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  luxuryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  luxuryContactBlock: {
    gap: 10,
    marginBottom: 24,
  },
  luxuryContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  luxuryContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  luxuryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
  },
  luxuryCompanyLogo: {
    width: 28,
    height: 28,
  },
  luxuryCompanyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  // Minimal template
  frontMinimal: {},
  minimalFrontInner: {
    flex: 1,
    minHeight: 500,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: colors.cardBackground,
  },
  minimalFlipBtn: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  minimalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  minimalAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 16,
  },
  minimalNameBlock: {
    alignItems: 'center',
    marginBottom: 6,
  },
  minimalFirstName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  minimalLastName: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  minimalTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9AA7B6',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  minimalLine: {
    width: 48,
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 18,
  },
  minimalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  minimalIconBtn: {
    padding: 8,
  },
  // Bold template
  frontBold: {},
  boldFrontInner: {
    flex: 1,
    minHeight: 500,
    overflow: 'hidden',
  },
  boldTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    minHeight: 200,
  },
  boldFlipBtn: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  boldNameBlock: {
    flex: 1,
    paddingRight: 100,
    paddingTop: 8,
  },
  boldFirstName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  boldLastName: {
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  boldAvatarWrap: {
    position: 'absolute',
    right: 16,
    top: 56,
    width: 100,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  boldAvatar: {
    width: '100%',
    height: '100%',
  },
  boldBottom: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 20,
  },
  boldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.2,
  },
  boldLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 14,
  },
  boldContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
});

export { ProfileCard as default };
