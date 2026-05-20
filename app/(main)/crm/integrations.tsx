import { PageHeader } from '@/components/ui/PageHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IntegrationStatus = 'AVAILABLE' | 'CONNECTED' | 'COMING SOON';

interface Integration {
  id: string;
  name: string;
  category: string;
  desc: string;
  status: IntegrationStatus;
  icon: any;
  buttonLabel: string;
  gradient: string[];
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', desc: 'Deep bi-directional sync with Salesforce CRM for enterprise teams.', status: 'AVAILABLE', icon: 'cloud-outline', buttonLabel: 'Connect Now', gradient: ['#00A1E0', '#0070D2'] },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', desc: 'Automatically push leads and track marketing activity in HubSpot.', status: 'AVAILABLE', icon: 'database-outline', buttonLabel: 'Connect Now', gradient: ['#FF7A59', '#FF5C35'] },
  { id: 'mailchimp', name: 'Mailchimp', category: 'Email Marketing', desc: 'Sync your contact segments directly to Mailchimp audiences.', status: 'CONNECTED', icon: 'email-outline', buttonLabel: 'Manage', gradient: ['#FFE01B', '#F0C808'] },
  { id: 'gmail', name: 'Gmail', category: 'Email', desc: 'Send emails directly from ZIEN using your Gmail account.', status: 'AVAILABLE', icon: 'email-outline', buttonLabel: 'Connect Now', gradient: ['#EA4335', '#D93025'] },
  { id: 'slack', name: 'Slack', category: 'Communication', desc: 'Get real-time notifications for leads and deals in your Slack workspace.', status: 'AVAILABLE', icon: 'message-outline', buttonLabel: 'Connect Now', gradient: ['#4A154B', '#611F69'] },
  { id: 'gcal', name: 'Google Calendar', category: 'Calendar', desc: 'Sync appointments and schedule meetings directly from ZIEN.', status: 'CONNECTED', icon: 'calendar-blank-outline', buttonLabel: 'Manage', gradient: ['#4285F4', '#1A73E8'] },
  { id: 'zoom', name: 'Zoom', category: 'Video Conferencing', desc: 'Create and manage Zoom meetings for property tours and consultations.', status: 'AVAILABLE', icon: 'video-outline', buttonLabel: 'Connect Now', gradient: ['#2D8CFF', '#0B5CFF'] },
  { id: 'docusign', name: 'DocuSign', category: 'Documents', desc: 'Send contracts and documents for electronic signature.', status: 'AVAILABLE', icon: 'file-document-outline', buttonLabel: 'Connect Now', gradient: ['#FFCE00', '#F5B800'] },
  { id: 'stripe', name: 'Stripe', category: 'Payments', desc: 'Process payments and manage billing for your real estate services.', status: 'COMING SOON', icon: 'currency-usd', buttonLabel: 'Request Access', gradient: ['#635BFF', '#5046E5'] },
  { id: 'twilio', name: 'Twilio', category: 'SMS', desc: 'Send SMS notifications and automate text message campaigns.', status: 'AVAILABLE', icon: 'cellphone', buttonLabel: 'Connect Now', gradient: ['#F22F46', '#D91A32'] },
  { id: 'zapier', name: 'Zapier', category: 'Automation', desc: 'Connect ZIEN to 5,000+ apps with custom automation workflows.', status: 'AVAILABLE', icon: 'cog-outline', buttonLabel: 'Connect Now', gradient: ['#FF4A00', '#E04400'] },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication', desc: 'Collaborate with your team and get notifications in Microsoft Teams.', status: 'COMING SOON', icon: 'account-group-outline', buttonLabel: 'Request Access', gradient: ['#5B5FC7', '#4B4FB5'] },
];

export default function IntegrationsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const connectedCount = integrations.filter(i => i.status === 'CONNECTED').length;
  const availableCount = integrations.filter(i => i.status === 'AVAILABLE').length;

  const handleConnect = (id: string, name: string) => {
    setConnectingId(id);
    setTimeout(() => {
      setIntegrations(prev => prev.map(int =>
        int.id === id
          ? { ...int, status: 'CONNECTED' as const, buttonLabel: 'Manage' }
          : int
      ));
      setConnectingId(null);
      Alert.alert('Success', `${name} has been connected successfully.`);
    }, 2000);
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="Integrations"
        subtitle="Connect Zien to your existing software stack and streamline your workflow."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#0BA0B2' }]} />
            <Text style={styles.statValue}>{connectedCount}</Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#1B5E9A' }]} />
            <Text style={styles.statValue}>{availableCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={styles.statValue}>{integrations.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Integration Cards */}
        <View style={styles.cardsGrid}>
          {integrations.map((int) => {
            const isComingSoon = int.status === 'COMING SOON';
            const isConnected = int.status === 'CONNECTED';
            const isConnecting = connectingId === int.id;

            return (
              <View
                key={int.id}
                style={[
                  styles.intCard,
                  isConnected && styles.intCardConnected,
                  isComingSoon && styles.intCardComingSoon,
                ]}
              >
                <View style={styles.intCardHeader}>
                  <LinearGradient
                    colors={isComingSoon ? ['#94A3B8', '#78909C'] : [...int.gradient] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.intIconWrap, isComingSoon && { opacity: 0.5 }]}
                  >
                    <MaterialCommunityIcons name={int.icon} size={22} color="#FFFFFF" />
                  </LinearGradient>

                  <View style={[
                    styles.statusBadge,
                    isConnected && styles.statusBadgeConnected,
                    isComingSoon && styles.statusBadgeComingSoon
                  ]}>
                    {isConnected && <View style={styles.connectedPulse} />}
                    <Text style={[
                      styles.statusBadgeText,
                      isConnected && styles.statusBadgeTextConnected,
                      isComingSoon && styles.statusBadgeTextComingSoon
                    ]}>
                      {int.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.intMetaGroup}>
                  <Text style={[styles.intName, isComingSoon && { opacity: 0.5 }]} numberOfLines={1}>{int.name}</Text>
                  <Text style={styles.intCategory}>{int.category}</Text>
                </View>

                <Text style={[styles.intDesc, isComingSoon && { opacity: 0.45 }]} numberOfLines={2}>{int.desc}</Text>

                <Pressable
                  onPress={() => {
                    if (int.status === 'AVAILABLE') handleConnect(int.id, int.name);
                  }}
                  disabled={isComingSoon || isConnecting}
                  style={({ pressed }) => [
                    styles.intActionBtn,
                    isConnected && styles.intActionBtnConnected,
                    isComingSoon && styles.intActionBtnDisabled,
                    pressed && !isComingSoon && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : isConnected ? (
                    <View style={styles.connectedBtnInner}>
                      <MaterialCommunityIcons name="check-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.intActionBtnText}>{int.buttonLabel}</Text>
                    </View>
                  ) : (
                    <Text style={[
                      styles.intActionBtnText,
                      isComingSoon && styles.intActionBtnTextDisabled,
                    ]}>
                      {int.buttonLabel}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: 24 + insets.bottom },
          pressed && { transform: [{ scale: 0.92 }] }
        ]}
        onPress={() => setRequestModalVisible(true)}
      >
        <LinearGradient
          colors={['#0BA0B2', '#1B5E9A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      {/* Request Integration Modal */}
      <Modal
        visible={requestModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.background, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Request Integration</Text>
                <Text style={styles.modalSubtitle}>
                  Don't see the integration you need? Let us know and we'll prioritize it for development.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtnSmall, pressed && { opacity: 0.7 }]}
                onPress={() => setRequestModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>INTEGRATION NAME *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Asana, Trello, Monday.com"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>YOUR EMAIL *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your@email.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>WHY DO YOU NEED THIS? (Optional)</Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Tell us how this integration would help your workflow..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelActionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setRequestModalVisible(false)}
              >
                <Text style={styles.cancelActionBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.submitActionBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                onPress={() => setRequestModalVisible(false)}
              >
                <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitActionBtnText}>Submit Request</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 6 },

    // ── Stats Banner ──
    statsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.cardBorder,
    },

    // ── Cards Grid ──
    cardsGrid: {
      gap: 14,
      paddingBottom: 80,
    },
    intCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 3,
    },
    intCardConnected: {
      borderColor: 'rgba(11, 160, 178, 0.25)',
      shadowColor: '#0BA0B2',
      shadowOpacity: 0.08,
    },
    intCardComingSoon: {
      borderColor: colors.cardBorder,
      opacity: 0.85,
    },
    intCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    intIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      gap: 5,
    },
    statusBadgeConnected: {
      backgroundColor: 'rgba(11, 160, 178, 0.1)',
    },
    statusBadgeComingSoon: {
      backgroundColor: 'rgba(148, 163, 184, 0.06)',
    },
    connectedPulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#0BA0B2',
    },
    statusBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    statusBadgeTextConnected: { color: '#0BA0B2' },
    statusBadgeTextComingSoon: { color: colors.inputPlaceholder },
    intMetaGroup: {
      marginBottom: 8,
    },
    intName: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    intCategory: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 2,
    },
    intDesc: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 16,
      fontWeight: '500',
    },
    intActionBtn: {
      height: 42,
      borderRadius: 12,
      backgroundColor: '#0B2D3E',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    intActionBtnConnected: {
      backgroundColor: '#0BA0B2',
    },
    intActionBtnDisabled: {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
    },
    connectedBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    intActionBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    intActionBtnTextDisabled: { color: colors.inputPlaceholder },

    // ── FAB ──
    fab: {
      position: 'absolute',
      right: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      shadowColor: '#0BA0B2',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 10,
      zIndex: 999,
    },
    fabGradient: {
      flex: 1,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Modal ──
    modalContent: {
      flex: 1,
      padding: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
    },
    modalTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.6,
    },
    modalSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 12,
      lineHeight: 22,
    },
    closeBtnSmall: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginLeft: 16,
    },
    fieldItem: {
      marginBottom: 24,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.8,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    inputWrap: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      height: 54,
      justifyContent: 'center',
    },
    textAreaWrap: {
      height: 120,
      paddingVertical: 14,
    },
    textInput: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    textArea: {
      height: '100%',
    },
    modalFooterActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelActionBtn: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cancelActionBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    submitActionBtn: {
      flex: 1.5,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    submitActionBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}