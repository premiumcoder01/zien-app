import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { disconnectSocialAccount, getSocialAccounts } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E1306C', bgColor: '#FDF2F8' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2', bgColor: '#EFF6FF' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', bgColor: '#F0F9FF' },
  { id: 'tiktok', name: 'TikTok', icon: 'music-note', color: '#000000', bgColor: '#F8FAFC' },
];

export default function AccountsScreen() {
  const { theme, colors } = useAppTheme();
  const styles = getStyles(colors, theme);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  // Fetch social accounts
  const { data: connectedAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => getSocialAccounts(accessToken || ''),
    enabled: !!accessToken,
  });

  // Disconnect social account mutation
  const disconnectMutation = useMutation({
    mutationFn: (accountId: number) => disconnectSocialAccount(accessToken || '', accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      setEditAccount(null);
      Alert.alert('Success', 'Social account disconnected successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to disconnect social account.');
    },
  });

  // Modal States
  const [activeAccount, setActiveAccount] = useState<typeof SOCIAL_PLATFORMS[0] | null>(null);
  const [editAccount, setEditAccount] = useState<{ platform: typeof SOCIAL_PLATFORMS[0]; apiAccount: any } | null>(null);

  const handleAccountPress = (account: typeof SOCIAL_PLATFORMS[0]) => {
    setActiveAccount(account);
  };

  const handleDisconnectPress = (platform: typeof SOCIAL_PLATFORMS[0], apiAccount: any) => {
    setEditAccount({ platform, apiAccount });
  };

  const closeAccountModal = () => {
    setActiveAccount(null);
    setLinkedinHandle('');
  };

  const [linkedinHandle, setLinkedinHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!activeAccount) return;
    setIsConnecting(true);
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      if (activeAccount.id === 'linkedin') {
        if (!linkedinHandle.trim()) {
          Alert.alert('Error', 'Please enter your LinkedIn handle.');
          setIsConnecting(false);
          return;
        }

        const timestamp = Date.now();
        const payload = {
          platform: 'LinkedIn',
          account_name: linkedinHandle.trim(),
          platform_account_id: `mock_${timestamp}`,
          access_token: `mock_token_${timestamp}`,
        };

        const url = `https://staging-api.zien.ai/api/solo/social/accounts`;
        console.log(`[LinkedIn Connect] Posting to: ${url} with payload:`, payload);
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        console.log(`[LinkedIn Connect] Response Status Code: ${response.status}`);
        const data = await response.json();
        console.log('[LinkedIn Connect] Response Data:', data);

        if (response.ok && data.success) {
          queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
          Alert.alert('Success', 'LinkedIn connected successfully.');
          closeAccountModal();
        } else {
          Alert.alert('Error', data.message || 'Failed to connect LinkedIn.');
        }
      } else {
        const url = `https://staging-api.zien.ai/api/solo/social/oauth/${activeAccount.id}/url`;
        console.log(`[OAuth] Fetching: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });
        console.log(`[OAuth] Response Status Code: ${response.status}`);
        const data = await response.json();
        console.log("[OAuth] Response Data:", data);
        if (data && data.url) {
          await Linking.openURL(data.url);
        } else {
          Alert.alert('Error', `Failed to retrieve connection URL (Status: ${response.status}).`);
        }
        closeAccountModal();
      }
    } catch (error) {
      console.error('Failed to get OAuth URL:', error);
      Alert.alert('Error', 'Failed to initiate authentication flow.');
      closeAccountModal();
    } finally {
      setIsConnecting(false);
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
          subtitle="Manage your connected accounts."
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Social Channels Card */}
        <View style={[styles.proCard, { borderTopWidth: 4, borderTopColor: '#0F172A', maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="cellphone" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Social Channels</Text>
          </View>

          {accountsLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : (
            <View style={styles.accountsList}>
              {SOCIAL_PLATFORMS.map((platform) => {
                const apiAccount = connectedAccounts?.find(
                  (acc: any) => acc.platform.toLowerCase() === platform.id.toLowerCase()
                );
                const isConnected = !!apiAccount;
                const displayName = isConnected ? (apiAccount.account_name || 'Connected') : 'Not connected';

                return (
                  <View key={platform.id} style={styles.accountRow}>
                    <View style={[styles.accountIconBox, { backgroundColor: platform.bgColor }]}>
                      <MaterialCommunityIcons name={platform.icon as any} size={22} color={platform.color} />
                    </View>

                    <View style={styles.accountTextContent}>
                      <Text style={styles.accountRowName} numberOfLines={1}>{platform.name}</Text>
                      <Text style={styles.accountRowHandle} numberOfLines={1}>{displayName}</Text>
                    </View>

                    <View style={styles.accountRowRight}>
                      {isConnected ? (
                        <View style={[
                          styles.connectedRightContainer,
                          SCREEN_WIDTH < 480 && { flexDirection: 'column', alignItems: 'flex-end', gap: 4 }
                        ]}>
                          <Text style={styles.connectedLabel}>CONNECTED</Text>
                          <Pressable
                            style={({ pressed }) => [
                              styles.disconnectBtn,
                              pressed && { opacity: 0.8 },
                            ]}
                            onPress={() => handleDisconnectPress(platform, apiAccount)}>
                            <Text style={styles.disconnectBtnText}>Disconnect</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={({ pressed }) => [
                            styles.connectBtn,
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => handleAccountPress(platform)}>
                          <Text style={styles.connectBtnText}>Connect</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

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

            {activeAccount?.id === 'linkedin' ? (
              <View style={styles.linkedinForm}>
                <Text style={styles.inputLabel}>Enter your LinkedIn Handle</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="@username"
                  placeholderTextColor={colors.textMuted}
                  value={linkedinHandle}
                  onChangeText={setLinkedinHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                <View style={styles.partnerBanner}>
                  <MaterialCommunityIcons name="check" size={16} color={theme === 'dark' ? '#34D399' : '#15803D'} style={{ marginRight: 6 }} />
                  <Text style={styles.partnerText}>Zien is a verified partner of LinkedIn</Text>
                </View>
              </View>
            ) : (
              <View style={styles.permissionsBox}>
                <View style={styles.permissionsHeader}>
                  <MaterialCommunityIcons name="shield-outline" size={18} color={theme === 'dark' ? '#FFFFFF' : '#0F172A'} />
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
            )}

            <Pressable
              style={[styles.continueBtn, isConnecting && { opacity: 0.7 }]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              <Text style={styles.continueBtnText}>
                {isConnecting ? 'Connecting...' : activeAccount?.id === 'linkedin' ? 'Authorize Zien' : `Continue to ${activeAccount?.name} Login`}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelLinkBtn} onPress={closeAccountModal}>
              <Text style={styles.cancelLinkText}>
                {activeAccount?.id === 'linkedin' ? 'Go Back' : 'Cancel'}
              </Text>
            </Pressable>

          </View>
          <Pressable style={styles.flex1} onPress={closeAccountModal} />
        </View>
      </Modal>

      {/* Edit Account Modal */}
      <Modal visible={!!editAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.flex1} onPress={() => setEditAccount(null)} />
          <View style={styles.editModalContent}>

            {/* Header */}
            <View style={styles.editModalHeader}>
              <View style={[styles.platformIconContainerSmall, { backgroundColor: editAccount?.platform?.bgColor }]}>
                <MaterialCommunityIcons name={editAccount?.platform?.icon as any} size={22} color={editAccount?.platform?.color} />
              </View>
              <Text style={styles.editModalTitle}>Edit {editAccount?.platform?.name.toLowerCase()}</Text>
              <Pressable onPress={() => setEditAccount(null)} style={styles.editModalCloseBtn}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Account Details */}
            <View style={styles.accountDetailsRow}>
              <Text style={styles.detailsLabel}>Account Name: </Text>
              <Text style={styles.detailsValue}>{editAccount?.apiAccount?.account_name || 'Connected'}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.editModalButtonsRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditAccount(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.disconnectAccountBtn, disconnectMutation.isPending && { opacity: 0.7 }]}
                onPress={() => editAccount?.apiAccount?.id && disconnectMutation.mutate(editAccount.apiAccount.id)}
                disabled={disconnectMutation.isPending}
              >
                <Text style={styles.disconnectAccountBtnText}>
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect Account'}
                </Text>
              </Pressable>
            </View>

          </View>
          <Pressable style={styles.flex1} onPress={() => setEditAccount(null)} />
        </View>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any, theme: string) {
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
      backgroundColor: colors.cardBackground,
      padding: SCREEN_WIDTH < 480 ? 16 : 24,
      borderRadius: 16,
      overflow: 'hidden',
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
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },

    accountsList: {
      gap: 16,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: SCREEN_WIDTH < 480 ? 10 : 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
    },
    accountIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
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
    loaderContainer: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectedRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    connectedLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0D9488',
      letterSpacing: 0.3,
    },
    disconnectBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#FEE2E2',
      minWidth: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#EF4444',
    },
    connectBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme === 'dark' ? colors.textPrimary : '#0F172A',
      minWidth: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme === 'dark' ? colors.cardBackground : '#FFFFFF',
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

    flex1: { flex: 1 },
    connectModalContent: {
      backgroundColor: colors.cardBackground,
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
      color: colors.textPrimary,
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    connectModalSubtitle: {
      fontSize: 14,
      color: theme === 'dark' ? colors.textSecondary : '#64748B',
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '500',
    },
    permissionsBox: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      color: colors.textPrimary,
    },
    permissionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      paddingRight: 8,
    },
    permissionDot: {
      fontSize: 14,
      color: theme === 'dark' ? colors.textSecondary : '#64748B',
      marginRight: 8,
      marginTop: -2,
    },
    permissionText: {
      fontSize: 13,
      color: theme === 'dark' ? colors.textSecondary : '#64748B',
      fontWeight: '500',
      lineHeight: 18,
    },
    continueBtn: {
      width: '100%',
      backgroundColor: theme === 'dark' ? colors.textPrimary : '#0F172A',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    continueBtnText: {
      color: theme === 'dark' ? colors.cardBackground : '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    cancelLinkBtn: {
      paddingVertical: 8,
    },
    cancelLinkText: {
      color: theme === 'dark' ? colors.textSecondary : '#64748B',
      fontSize: 15,
      fontWeight: '700',
    },
    editModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 10,
    },
    editModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    platformIconContainerSmall: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    editModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
    },
    editModalCloseBtn: {
      padding: 4,
    },
    accountDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 28,
    },
    detailsLabel: {
      fontSize: 14,
      color: theme === 'dark' ? colors.textSecondary : '#64748B',
      fontWeight: '500',
    },
    detailsValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    editModalButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackgroundSoft,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    disconnectAccountBtn: {
      flex: 1.5,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectAccountBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#EF4444',
    },
    linkedinForm: {
      width: '100%',
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    textInput: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surfaceSoft,
    },
    partnerBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4',
      padding: 12,
      borderRadius: 10,
      gap: 8,
      marginTop: 16,
      width: '100%',
    },
    partnerText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme === 'dark' ? '#34D399' : '#15803D',
    },
  });
}
