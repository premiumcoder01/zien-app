import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlanKey = 'starter' | 'elite' | 'professional' | 'team' | 'brokerage';

type PlanFeature = {
  icon: string;
  highlight: string;
  suffix: string;
};

const PLAN_FEATURES: Record<PlanKey, PlanFeature[]> = {
  starter: [
    { icon: 'lightning-bolt-outline', highlight: '500', suffix: ' Platform Credits' },
    { icon: 'account-group-outline', highlight: '1', suffix: ' Authorized Seats' },
    { icon: 'database-outline', highlight: 'Standard', suffix: ' CRM Sync' },
  ],
  professional: [
    { icon: 'lightning-bolt-outline', highlight: '2,500', suffix: ' Platform Credits' },
    { icon: 'account-group-outline', highlight: '2', suffix: ' Authorized Seats' },
    { icon: 'database-outline', highlight: 'Enriched', suffix: ' CRM Tools' },
  ],
  elite: [
    { icon: 'lightning-bolt-outline', highlight: '1,200', suffix: ' Platform Credits' },
    { icon: 'account-group-outline', highlight: '1', suffix: ' Authorized Seats' },
    { icon: 'database-outline', highlight: 'CRM', suffix: ' Auto-Sync' },
  ],
  team: [
    { icon: 'lightning-bolt-outline', highlight: '10,000', suffix: ' Platform Credits' },
    { icon: 'account-group-outline', highlight: '10', suffix: ' Authorized Seats' },
    { icon: 'database-outline', highlight: 'Full Sync', suffix: ' Engine' },
  ],
  brokerage: [
    { icon: 'lightning-bolt-outline', highlight: 'Custom', suffix: ' Platform Credits' },
    { icon: 'account-group-outline', highlight: 'Unlimited', suffix: ' Authorized Seats' },
    { icon: 'database-outline', highlight: 'Enterprise', suffix: ' Data Architecture' },
  ],
};

function InnerModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const innerStyles = getInnerStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={innerStyles.overlay}>
        <Pressable style={innerStyles.backdrop} onPress={onClose} />
        <View style={innerStyles.card}>{children}</View>
      </View>
    </Modal>
  );
}

function getInnerStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(11, 45, 62, 0.5)',
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
  });
}

type PlanModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function PlanModal({ visible, onClose }: PlanModalProps) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<Exclude<PlanKey, 'team'> | null>(null);

  const windowWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(280, windowWidth - 18 * 2 - 12);
  const isNarrow = windowWidth < 400;

  const plans = useMemo(
    () =>
      [
        { key: 'starter' as const, label: 'STARTER', price: '$29.95', unit: '/mo', cta: { label: 'Upgrade', tone: 'dark' as const } },
        { key: 'elite' as const, label: 'ELITE', price: '$59.95', unit: '/mo', cta: { label: 'Upgrade', tone: 'dark' as const } },
        { key: 'professional' as const, label: 'PROFESSIONAL', price: '$99.95', unit: '/mo', cta: { label: 'Upgrade', tone: 'dark' as const } },
        { key: 'team' as const, label: 'TEAM', price: '$249.95', unit: '/mo', cta: { label: 'Active', tone: 'disabled' as const }, isCurrent: true },
      ] as const,
    []
  );

  const scrollX = useRef(new Animated.Value(0)).current;

  const openDowngradeConfirm = (plan: Exclude<PlanKey, 'team'>) => {
    setPendingPlan(plan);
    setIsDowngradeModalOpen(true);
  };

  const closeDowngradeConfirm = () => {
    setIsDowngradeModalOpen(false);
    setPendingPlan(null);
  };

  const confirmDowngrade = () => {
    setIsDowngradeModalOpen(false);
    requestAnimationFrame(() => setIsSuccessModalOpen(true));
  };

  const backToBilling = () => {
    setIsSuccessModalOpen(false);
    setPendingPlan(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.background, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Enterprise Scale</Text>
            <Text style={styles.subtitle}>
              Select the technical tier that matches your brokerage velocity.
            </Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Animated.ScrollView
          horizontal={!isNarrow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.planScroller,
            isNarrow && styles.planScrollerVertical,
            !isNarrow && { paddingHorizontal: 40 }
          ]}
          style={isNarrow ? undefined : styles.planScrollView}
          snapToInterval={!isNarrow ? cardWidth + 16 : undefined}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {plans.map((p, index) => {
            const isCurrent = 'isCurrent' in p && p.isCurrent === true;
            const features = PLAN_FEATURES[p.key];

            // Parallax interpolation
            const inputRange = [
              (index - 1) * (cardWidth + 16),
              index * (cardWidth + 16),
              (index + 1) * (cardWidth + 16),
            ];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.92, 1, 0.92],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={p.key}
                style={[
                  styles.planCard,
                  !isNarrow && { width: cardWidth, minWidth: cardWidth },
                  isCurrent && styles.planCardCurrent,
                  !isNarrow && { transform: [{ scale }], opacity }
                ]}
              >
                {isCurrent && (
                  <View style={styles.currentPill}>
                    <Text style={styles.currentPillText}>CURRENT TIER</Text>
                  </View>
                )}
                <Text style={[styles.planTier, isCurrent && styles.planTierCurrent]}>{p.label}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{p.price}</Text>
                  {p.unit ? <Text style={styles.planUnit}>{p.unit}</Text> : null}
                </View>
                <View style={styles.featureList}>
                  {features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <View style={styles.featureIconWrap}>
                        <MaterialCommunityIcons name={f.icon as any} size={18} color="#0a2341" />
                      </View>
                      <Text style={styles.featureText} numberOfLines={2}>
                        <Text style={styles.featureHighlight}>{f.highlight}</Text>
                        {f.suffix}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  disabled={p.cta.tone === 'disabled' && isCurrent}
                  style={[
                    styles.planCta,
                    p.cta.tone === 'dark' && !isCurrent && styles.planCtaDark,
                    p.cta.tone === 'disabled' && styles.planCtaDisabled,
                    isCurrent && styles.planCtaActive,
                  ]}
                  onPress={() => {
                    if (isCurrent) return;
                    // Logic to handle upgrade/downgrade
                  }}
                >
                  <Text
                    style={[
                      styles.planCtaText,
                      p.cta.tone === 'dark' && !isCurrent && styles.planCtaTextDark,
                      p.cta.tone === 'disabled' && styles.planCtaTextDisabled,
                      isCurrent && styles.planCtaTextActive,
                    ]}
                  >
                    {p.cta.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.ScrollView>

        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.accentTeal} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Plan changes</Text>
            <Text style={styles.noteText}>
              Your current plan is locked. Downgrades apply at the next billing cycle.
            </Text>
          </View>
        </View>
      </LinearGradient>

      <InnerModal visible={isDowngradeModalOpen} onClose={closeDowngradeConfirm}>
        <View style={styles.modalBody}>
          <View style={styles.warningIcon}>
            <MaterialCommunityIcons name="alert" size={24} color="#B45309" />
          </View>
          <Text style={styles.confirmTitle}>Downgrade Pending</Text>
          <Text style={styles.confirmBody}>
            You are moving to{' '}
            <Text style={styles.confirmBodyBold}>
              {pendingPlan === 'starter' ? 'Starter' : 'Professional'}
            </Text>
            . On the next billing date, your limits will be reduced and custom branding will be
            disabled.
          </Text>
        </View>
        <View style={styles.confirmActions}>
          <Pressable style={styles.confirmOutline} onPress={closeDowngradeConfirm}>
            <Text style={styles.confirmOutlineText}>Discard</Text>
          </Pressable>
          <Pressable style={styles.confirmPrimary} onPress={confirmDowngrade}>
            <Text style={styles.confirmPrimaryText}>Confirm</Text>
          </Pressable>
        </View>
      </InnerModal>

      <InnerModal visible={isSuccessModalOpen} onClose={backToBilling}>
        <View style={styles.modalBody}>
          <View style={styles.sparkleIcon}>
            <MaterialCommunityIcons name="check-circle" size={36} color={colors.accentTeal} />
          </View>
          <Text style={styles.successTitle}>Plan updated</Text>
          <Text style={styles.successBody}>
            Your resource allocation has been successfully modified.
          </Text>
          <Pressable style={styles.primaryButton} onPress={backToBilling}>
            <Text style={styles.primaryButtonText}>Back to Billing</Text>
          </Pressable>
        </View>
      </InnerModal>
    </Modal>
  );
}

function getStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    background: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      gap: 16,
    },
    headerText: { flex: 1 },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
      fontWeight: '500',
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planScrollView: { flexGrow: 0 },
    planScroller: {
      paddingHorizontal: 18,
      paddingBottom: 8,
      gap: 16,
    },
    planScrollerVertical: { flexDirection: 'column', paddingBottom: 16 },
    planCard: {
      borderRadius: 22,
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      gap: 16,
      overflow: 'hidden',
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    planCardCurrent: {
      borderColor: colors.accentDark,
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    currentPill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentDark,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    currentPillText: {
      color: colors.textOnAccent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    planTier: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    planTierCurrent: { color: colors.textPrimary },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    planPrice: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    planUnit: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 2,
    },
    featureList: { gap: 14 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.cardBackgroundSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 18,
    },
    featureHighlight: { fontWeight: '800', color: colors.textPrimary },
    planCta: {
      marginTop: 4,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    planCtaDark: { backgroundColor: '#0B2D3E', borderColor: '#0B2D3E' },
    planCtaActive: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, borderWidth: 1 },
    planCtaDisabled: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
    planCtaText: { fontSize: 14, fontWeight: '900' },
    planCtaTextDark: { color: '#FFFFFF' },
    planCtaTextActive: { color: colors.textPrimary },
    planCtaTextDisabled: { color: colors.textSecondary },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      marginHorizontal: 18,
      marginTop: 8,
      marginBottom: 24,
      padding: 18,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    noteContent: { flex: 1 },
    noteTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    noteText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, lineHeight: 19 },
    primaryButton: {
      backgroundColor: colors.accentDark,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 16,
      alignSelf: 'stretch',
    },
    primaryButtonText: { color: colors.textOnAccent, fontWeight: '800', fontSize: 14 },
    modalBody: { alignItems: 'center', gap: 12 },
    warningIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: '#FFF7ED',
      borderWidth: 1,
      borderColor: '#FED7AA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
    confirmBody: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    confirmBodyBold: { fontWeight: '900', color: colors.textPrimary },
    confirmActions: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
    confirmOutline: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.cardBorder,
    },
    confirmOutlineText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    confirmPrimary: { flex: 1, backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    confirmPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    sparkleIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.cardBackgroundSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
    successBody: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  });
}
