import ColorPickerModal from '@/components/ui/ColorPickerModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONNECTED_ACCOUNTS = [
  { id: 'instagram', name: 'Instagram', handle: 'Not connected', status: 'DISCONNECTED' as const, action: 'Connect', icon: 'instagram', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', handle: 'Not connected', status: 'DISCONNECTED' as const, action: 'Connect', icon: 'facebook', color: '#1877F2' },
  { id: 'linkedin', name: 'LinkedIn', handle: 'Not connected', status: 'DISCONNECTED' as const, action: 'Connect', icon: 'linkedin', color: '#0A66C2' },
  { id: 'tiktok', name: 'TikTok', handle: 'Not connected', status: 'DISCONNECTED' as const, action: 'Connect', icon: 'music-note', color: '#000000' },
];

const AUTO_RULES = [
  { key: 'property_live', label: 'Auto-post when property goes live', value: true },
  { key: 'open_house', label: 'Auto-post 24h before open house', value: true },
  { key: 'price_drop', label: 'Auto-post when price drops', value: false },
  { key: 'repost', label: 'Re-post high performing assets weekly', value: true },
];

export default function AccountsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hashtags, setHashtags] = useState('#RealEstate #LuxuryLiving #ZienAI');
  const [brandColor, setBrandColor] = useState('#0B2341');
  const [watermark, setWatermark] = useState(true);
  const [rules, setRules] = useState(() =>
    AUTO_RULES.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {} as Record<string, boolean>)
  );

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeAccount, setActiveAccount] = useState<typeof CONNECTED_ACCOUNTS[0] | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Connected');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const setRule = (key: string, value: boolean) => setRules((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    setShowSuccessModal(true);
  };

  const handleAccountPress = (account: typeof CONNECTED_ACCOUNTS[0]) => {
    const statusMap: Record<string, string> = {
      'CONNECTED': 'Connected',
      'DISCONNECTED': 'Disconnected',
      'PENDING VERIFY': 'Pending Verify'
    };
    setSelectedStatus(statusMap[account.status] || 'Connected');
    setActiveAccount(account);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const closeAccountModal = () => {
    setActiveAccount(null);
    setShowStatusPicker(false);
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!activeAccount) return;
    setIsConnecting(true);
    try {
      const response = await fetch(`https://staging.zien.ai/api/solo/social/oauth/facebook/url`);
      const data = await response.json();
      console.log(data, "vishal")
      if (data && data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('Failed to get OAuth URL:', error);
    } finally {
      setIsConnecting(false);
      closeAccountModal();
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>

      <View style={styles.headerRow}>
        <PageHeader
          title="Account Settings"
          subtitle="Manage your connected accounts and automation preferences."
          onBack={() => router.back()}
          rightIcon="content-save"
          onRightPress={handleSave}
          rightIconColor={colors.textPrimary}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.gridContainer}>
          <View style={styles.leftColumn}>
            {/* Social Channels Card */}
            <View style={[styles.proCard, { borderTopWidth: 4, borderTopColor: '#0F172A', borderRadius: 0 }]}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="cellphone" size={20} color={colors.textPrimary} />
                <Text style={styles.sectionTitle}>Social Channels</Text>
              </View>
              <View style={styles.accountsList}>
                {CONNECTED_ACCOUNTS.map((acc, index) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => handleAccountPress(acc)}
                    style={({ pressed }) => [
                      styles.accountRow,
                      pressed && { opacity: 0.8 },
                    ]}>
                    <View style={styles.accountIconBox}>
                      <MaterialCommunityIcons name={acc.icon as any} size={22} color={acc.color} />
                    </View>

                    <View style={styles.accountTextContent}>
                      <Text style={styles.accountRowName} numberOfLines={1}>{acc.name}</Text>
                      <Text style={styles.accountRowHandle} numberOfLines={1}>{acc.handle}</Text>
                    </View>

                    <View style={styles.accountRowRight}>
                      <View style={styles.manageBtn}>
                        <Text style={styles.manageBtnText}>{acc.action}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Auto-Publishing Rules Card */}
            <View style={styles.proCard}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.textPrimary} />
                <Text style={styles.sectionTitle}>Auto-Publishing Rules</Text>
              </View>
              <View style={styles.rulesList}>
                {AUTO_RULES.map((r) => (
                  <View key={r.key} style={styles.premiumRuleItem}>
                    <Text style={styles.premiumRuleLabel}>{r.label}</Text>
                    <Switch
                      value={rules[r.key] ?? r.value}
                      onValueChange={(v) => setRule(r.key, v)}
                      trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E2E8F0"
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rightColumn}>
            {/* Brand Assets Card */}
            <View style={styles.proCard}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="palette-outline" size={20} color={colors.textPrimary} />
                <Text style={styles.sectionTitle}>Brand Assets</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Default Hashtags</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={hashtags}
                    onChangeText={setHashtags}
                    placeholder="#RealEstate #LuxuryLiving"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Brand Primary Color</Text>
                <View style={styles.colorPickerContainer}>
                  <Pressable onPress={() => setShowColorPicker(true)}>
                    <View style={[styles.colorBox, { backgroundColor: brandColor }]} />
                  </Pressable>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <TextInput
                      style={[styles.input, styles.colorInput]}
                      value={brandColor}
                      onChangeText={setBrandColor}
                      placeholder="#0B2341"
                      placeholderTextColor="#94A3B8"
                      onPressIn={() => setShowColorPicker(true)}
                      showSoftInputOnFocus={false}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.toggleRowPremium}>
                <Text style={styles.toggleTitle}>Auto-Watermark Media</Text>
                <Switch
                  value={watermark}
                  onValueChange={setWatermark}
                  trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E2E8F0"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Settings Saved</Text>
            <Text style={styles.modalsubtitle}>Your social media and automation preferences have been successfully updated.</Text>
            <Pressable style={styles.modalBtn} onPress={closeSuccessModal}>
              <Text style={styles.modalBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Connect Account Modal */}
      <Modal visible={!!activeAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.flex1} onPress={closeAccountModal} />
          <View style={styles.connectModalContent}>

            <View style={[styles.platformIconContainerLarge, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons name={activeAccount?.icon as any} size={32} color={activeAccount?.color || colors.textPrimary} />
            </View>

            <Text style={styles.connectModalTitle}>Connect {activeAccount?.name}</Text>
            <Text style={styles.connectModalSubtitle}>Authorize Zien to manage your posts and analytics.</Text>

            <View style={styles.permissionsBox}>
              <View style={styles.permissionsHeader}>
                <MaterialCommunityIcons name="shield-outline" size={18} color="#0F172A" />
                <Text style={styles.permissionsTitle}>Permissions Requested</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionDot}>•</Text>
                <Text style={styles.permissionText}>Read profile information and media</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionDot}>•</Text>
                <Text style={styles.permissionText}>Create and publish posts on your behalf</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionDot}>•</Text>
                <Text style={styles.permissionText}>Access audience insights and engagement metrics</Text>
              </View>
            </View>

            <Pressable
              style={[styles.continueBtn, isConnecting && { opacity: 0.7 }]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              <Text style={styles.continueBtnText}>
                {isConnecting ? 'Connecting...' : `Continue to ${activeAccount?.name} Login`}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelLinkBtn} onPress={closeAccountModal}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </Pressable>

          </View>
          <Pressable style={styles.flex1} onPress={closeAccountModal} />
        </View>
      </Modal>

      <ColorPickerModal
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        initialColor={brandColor}
        onSelectColor={setBrandColor}
      />
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    headerRow: {
      position: 'relative',
      zIndex: 10,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12 },

    gridContainer: {
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      gap: 24,
    },
    leftColumn: {
      flex: Platform.OS === 'web' ? 1.5 : 1,
      gap: 24,
    },
    rightColumn: {
      flex: 1,
      gap: 24,
    },
    saveChangesBtn: {
      backgroundColor: '#0F172A',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    saveChangesBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // Pro Card Styles
    proCard: {
      backgroundColor: '#FFFFFF',
      padding: 24,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: '#0F172A',
      letterSpacing: -0.4,
    },

    accountsList: {
      gap: 16,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 12,
    },
    accountIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#FFF0F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountTextContent: {
      flex: 1,
      marginLeft: 12,
    },
    accountRowName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    accountRowHandle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 1,
    },
    accountRowRight: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 6,
      marginLeft: 8,
    },
    manageBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#0F172A',
      minWidth: 90,
      alignItems: 'center',
    },
    manageBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFF',
    },

    // Field Groups
    fieldGroup: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 8,
      marginLeft: 4,
    },
    inputWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    colorPickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    colorBox: {
      width: 48,
      height: 48,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    colorInput: {
      flex: 1,
    },
    toggleRowPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    toggleTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },

    // Rules List
    rulesList: {
      gap: 16,
    },
    premiumRuleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    premiumRuleLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
      flex: 1,
      marginRight: 16,
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 32,
      padding: 32,
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 20 },
      shadowRadius: 40,
      elevation: 15,
    },
    successIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: '#0a2341',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: '#0a2341',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
    },
    modalTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 14,
      letterSpacing: -0.5,
    },
    modalsubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
      fontWeight: '500',
    },
    modalBtn: {
      backgroundColor: colors.accentTeal,
      width: '100%',
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
    },
    modalBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800'
    },

    flex1: { flex: 1 },
    connectModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 32,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      elevation: 20,
    },
    platformIconContainerLarge: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    connectModalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#0F172A',
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    connectModalSubtitle: {
      fontSize: 14,
      color: '#64748B',
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '500',
    },
    permissionsBox: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 16,
      padding: 20,
      marginBottom: 28,
    },
    permissionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    permissionsTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },
    permissionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      paddingRight: 8,
    },
    permissionDot: {
      fontSize: 14,
      color: '#64748B',
      marginRight: 8,
      marginTop: -2,
    },
    permissionText: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '500',
      lineHeight: 18,
    },
    continueBtn: {
      width: '100%',
      backgroundColor: '#0F172A',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    continueBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    cancelLinkBtn: {
      paddingVertical: 8,
    },
    cancelLinkText: {
      color: '#64748B',
      fontSize: 15,
      fontWeight: '700',
    }
  });
}
