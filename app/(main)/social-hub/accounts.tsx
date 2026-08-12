import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { disconnectSocialAccount, getSocialAccounts } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E1306C', bgColor: '#FDF2F8' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2', bgColor: '#EFF6FF' },
  { id: 'tiktok', name: 'TikTok', icon: 'music-note', color: '#000000', bgColor: '#F8FAFC' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', bgColor: '#F0F9FF', isComingSoon: true },
];


export default function AccountsScreen() {
  const { theme, colors } = useAppTheme();
  const styles = getStyles(colors, theme);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  // ── Data fetching ──
  const {
    data: connectedAccounts,
    isLoading: accountsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => getSocialAccounts(accessToken || ''),
    enabled: !!accessToken,
    staleTime: 30_000,        // treat data as fresh for 30s
    retry: 2,
  });

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // ── Disconnect mutation ──
  const disconnectMutation = useMutation({
    mutationFn: (accountId: number) => disconnectSocialAccount(accessToken || '', accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      setEditAccount(null);
      Alert.alert('Disconnected', 'Social account disconnected successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to disconnect social account.');
    },
  });

  // ── Modal state ──
  const [activeAccount, setActiveAccount] = useState<typeof SOCIAL_PLATFORMS[0] | null>(null);
  const [editAccount, setEditAccount] = useState<{ platform: typeof SOCIAL_PLATFORMS[0]; apiAccount: any } | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // ── Polling refs kept minimal — only used for cleanup on WebView close ──
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Cleanup on WebView close
  useEffect(() => {
    if (!showWebView) {
      stopPolling();
    }
    return () => stopPolling();
  }, [showWebView, stopPolling]);

  // ── OAuth callback: extract code from redirect URL and exchange with backend ──
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  const handleOAuthCallback = useCallback(async (callbackUrl: string) => {
    if (!accessToken || !connectingPlatform) return;

    let code: string | null = null;
    try {
      // Extract ?code= from the redirect URL
      const urlObj = new URL(callbackUrl);
      code = urlObj.searchParams.get('code');
    } catch {
      // URL constructor may fail on some RN environments — fall back to regex
      const match = callbackUrl.match(/[?&]code=([^&]+)/);
      code = match ? decodeURIComponent(match[1]) : null;
    }

    if (!code) {
      // Check for error params from OAuth provider
      const errorMatch = callbackUrl.match(/[?&]error=([^&]+)/);
      const errorReason = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Unknown error';
      stopPolling();
      setShowWebView(false);
      setConnectingPlatform(null);
      Alert.alert('Connection Failed', `Facebook returned an error: ${errorReason}. Please try again.`);
      return;
    }

    // We have a code — close WebView immediately for good UX
    stopPolling();
    setShowWebView(false);
    setIsExchangingCode(true);

    try {
      // Determine backend provider name (instagram uses facebook OAuth)
      const provider = connectingPlatform === 'instagram' ? 'facebook' : connectingPlatform;
      setConnectingPlatform(null);

      const response = await fetch(
        `https://api.zien.ai/api/solo/social/oauth/${provider}/callback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ code }),
        }
      );

      const data = await response.json();

      if (response.ok && (data.success !== false)) {
        // Refresh account list from server
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        Alert.alert(
          'Connected',
          data.message || `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully.`
        );
      } else {
        throw new Error(data.message || `Server returned ${response.status}`);
      }
    } catch (err: any) {
      console.error('[OAuth Callback] Exchange failed:', err);
      Alert.alert('Connection Failed', err.message || 'Failed to complete authentication. Please try again.');
    } finally {
      setIsExchangingCode(false);
    }
  }, [accessToken, connectingPlatform, queryClient, stopPolling]);

  // ── WebView navigation handler ──
  const handleNavigationStateChange = useCallback((navState: any) => {
    const url: string = navState.url || '';
    console.log(url)

    // Detect when Facebook redirects back to our callback URL
    if (url.includes('/social/settings/callback') || url.includes('social/oauth') && url.includes('code=')) {
      handleOAuthCallback(url);
    }
  }, [handleOAuthCallback]);

  // ── Modal helpers ──
  const [linkedinHandle, setLinkedinHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleAccountPress = useCallback((account: typeof SOCIAL_PLATFORMS[0]) => {
    setActiveAccount(account);
  }, []);

  const handleDisconnectPress = useCallback((platform: typeof SOCIAL_PLATFORMS[0], apiAccount: any) => {
    setEditAccount({ platform, apiAccount });
  }, []);

  const closeAccountModal = useCallback(() => {
    setActiveAccount(null);
    setLinkedinHandle('');
  }, []);

  // ── OAuth connect flow ──
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

        const response = await fetch('https://api.zien.ai/api/solo/social/accounts', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
          Alert.alert('Connected', 'LinkedIn connected successfully.');
          closeAccountModal();
        } else {
          Alert.alert('Error', data.message || 'Failed to connect LinkedIn.');
        }
      } else {
        const provider = activeAccount.id === 'instagram' ? 'facebook' : activeAccount.id;
        const response = await fetch(
          `https://api.zien.ai/api/solo/social/oauth/${provider}/url`,
          { method: 'GET', headers }
        );
        const data = await response.json();

        if (data?.url) {
          setConnectingPlatform(activeAccount.id);
          setOauthUrl(data.url);
          setShowWebView(true);
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !accountsLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accentTeal}
            colors={[colors.accentTeal]}
          />
        }>

        {/* Section Header */}
        <View style={styles.sectionHeaderPremium}>
          <Text style={styles.sectionTitlePremium}>Connected Channels</Text>
          <Text style={styles.sectionSubtitlePremium}>
            Link your brand profiles to automate content generation and sharing.
          </Text>
        </View>

        {accountsLoading ? (
          <View style={styles.loaderContainerPremium}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.loaderTextPremium}>Retrieving channels...</Text>
          </View>
        ) : (
          <View style={styles.platformsContainer}>
            {SOCIAL_PLATFORMS.map((platform) => {
              const apiAccount = connectedAccounts?.find(
                (acc: any) => acc.platform.toLowerCase() === platform.id.toLowerCase()
              );
              const isConnected = !!apiAccount;
              const displayName = isConnected ? (apiAccount.account_name || 'Connected') : 'Not connected';

              const isInstagram = platform.id === 'instagram';
              const isFacebook = platform.id === 'facebook';
              const isLinkedin = platform.id === 'linkedin';

              let cardBg = colors.cardBackground;
              let cardBorder = colors.cardBorder;

              if (isConnected) {
                if (theme === 'dark') {
                  cardBg = isInstagram ? '#200A13' : isFacebook ? '#091524' : isLinkedin ? '#071624' : '#121214';
                  cardBorder = isInstagram ? 'rgba(225, 48, 108, 0.3)' : isFacebook ? 'rgba(24, 119, 242, 0.3)' : isLinkedin ? 'rgba(10, 102, 194, 0.3)' : 'rgba(255,255,255,0.15)';
                } else {
                  cardBg = isInstagram ? '#FFF0F5' : isFacebook ? '#F0F6FF' : isLinkedin ? '#F0F9FF' : '#F8FAFC';
                  cardBorder = isInstagram ? 'rgba(225, 48, 108, 0.2)' : isFacebook ? 'rgba(24, 119, 242, 0.2)' : isLinkedin ? 'rgba(10, 102, 194, 0.2)' : 'rgba(0,0,0,0.08)';
                }
              }

              return (
                <View
                  key={platform.id}
                  style={[
                    styles.platformCardPremium,
                    { backgroundColor: cardBg, borderColor: cardBorder }
                  ]}
                >
                  {/* Brand Icon Box */}
                  {isConnected ? (
                    <LinearGradient
                      colors={isInstagram ? ['#833AB4', '#FD1D1D', '#F77737'] :
                        isFacebook ? ['#1877F2', '#166FE5'] :
                          isLinkedin ? ['#0A66C2', '#0077B5'] :
                            ['#1E1E1E', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.accountIconBoxPremium}
                    >
                      <MaterialCommunityIcons name={platform.icon as any} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.accountIconBoxPremiumDefault, { backgroundColor: colors.surfaceSoft }]}>
                      <MaterialCommunityIcons name={platform.icon as any} size={22} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Content Section */}
                  <View style={styles.accountTextContentPremium}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.accountRowNamePremium} numberOfLines={1}>{platform.name}</Text>
                      {platform.isComingSoon && (
                        <View style={styles.comingSoonPill}>
                          <Text style={styles.comingSoonPillText}>Coming Soon</Text>
                        </View>
                      )}
                    </View>

                    {/* Connection status badge */}
                    <View style={styles.statusBadgeRow}>
                      <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : colors.textMuted + '60' }]} />
                      <Text style={[styles.accountRowHandlePremium, { color: isConnected ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.accountRowRightPremium}>
                    {isConnected ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.disconnectBtnCard,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => handleDisconnectPress(platform, apiAccount)}
                      >
                        <Text style={styles.disconnectBtnCardText}>Disconnect</Text>
                      </Pressable>
                    ) : platform.isComingSoon ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.waitlistBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => Alert.alert('Coming Soon', 'LinkedIn integration is coming soon! You will be notified once available.')}
                      >
                        <Text style={styles.waitlistBtnText}>Waitlist</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.connectBtnPremiumWrapper,
                          pressed && { opacity: 0.8 },
                        ]}
                        onPress={() => handleAccountPress(platform)}
                      >
                        <LinearGradient
                          colors={isInstagram ? ['#E1306C', '#FD1D1D', '#F77737'] :
                            isFacebook ? ['#1877F2', '#166FE5'] :
                              isLinkedin ? ['#0A66C2', '#0077B5'] :
                                ['#18181B', '#09090B']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.connectBtnPremiumGradient}
                        >
                          <Text style={styles.connectBtnPremiumText}>Connect</Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
      {/* Disconnect Confirmation Modal */}
      <Modal visible={!!editAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.flex1} onPress={() => setEditAccount(null)} />
          <View style={styles.disconnectModalContent}>

            {/* Header row: red X icon + title */}
            <View style={styles.disconnectModalHeader}>
              <View style={styles.disconnectIconBox}>
                <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
              </View>
              <Text style={styles.disconnectModalTitle}>Disconnect Account</Text>
            </View>

            {/* Body text */}
            <Text style={styles.disconnectModalBody}>
              Are you sure you want to disconnect this account? You will no longer be able to publish posts or view analytics for it unless you reconnect it.
            </Text>

            {/* Buttons */}
            <View style={styles.disconnectModalBtns}>
              <Pressable
                style={({ pressed }) => [styles.disconnectCancelBtn, pressed && { opacity: 0.75 }]}
                onPress={() => setEditAccount(null)}
              >
                <Text style={styles.disconnectCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.disconnectConfirmBtn,
                  disconnectMutation.isPending && { opacity: 0.7 },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => editAccount?.apiAccount?.id && disconnectMutation.mutate(editAccount.apiAccount.id)}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.disconnectConfirmText}>Yes, Disconnect</Text>
                )}
              </Pressable>
            </View>

          </View>
          <Pressable style={styles.flex1} onPress={() => setEditAccount(null)} />
        </View>
      </Modal>

      {/* OAuth WebView Modal */}
      <Modal visible={showWebView} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingTop: Math.max(insets.top, 20) }}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Connect Channel</Text>
            <Pressable onPress={() => { stopPolling(); setShowWebView(false); setConnectingPlatform(null); }} style={styles.closeWebViewButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {!!oauthUrl && (
            <WebView
              source={{ uri: oauthUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState={true}
              incognito={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={colors.accentTeal} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Code-exchange loading overlay */}
      <Modal visible={isExchangingCode} transparent animationType="fade">
        <View style={styles.exchangeOverlay}>
          <View style={styles.exchangeCard}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.exchangeTitle}>Completing connection...</Text>
            <Text style={styles.exchangeSubtitle}>Verifying your account with the server.</Text>
          </View>
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

    sectionHeaderPremium: {
      maxWidth: 600,
      width: '100%',
      alignSelf: 'center',
      marginBottom: 20,
      marginTop: 10,
    },
    sectionTitlePremium: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    sectionSubtitlePremium: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      lineHeight: 16,
    },
    loaderContainerPremium: {
      paddingVertical: 80,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loaderTextPremium: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    platformsContainer: {
      gap: 2,
    },
    platformCardPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      maxWidth: 600,
      width: '100%',
      alignSelf: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    accountIconBoxPremium: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountIconBoxPremiumDefault: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountTextContentPremium: {
      flex: 1,
      marginLeft: 14,
      gap: 3,
    },
    accountRowNamePremium: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    statusBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    accountRowHandlePremium: {
      fontSize: 12,
      fontWeight: '700',
    },
    accountRowRightPremium: {
      marginLeft: 10,
    },
    manageBtnPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
    },
    manageBtnTextPremium: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    disconnectBtnCard: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(239,68,68,0.35)',
      backgroundColor: 'rgba(239,68,68,0.08)',
    },
    disconnectBtnCardText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#EF4444',
    },
    connectBtnPremiumWrapper: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    connectBtnPremiumGradient: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 90,
    },
    connectBtnPremiumText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    comingSoonPill: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    comingSoonPillText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: '#D97706',
    },
    waitlistBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 84,
    },
    waitlistBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
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

    // ── Disconnect Confirmation Modal ──
    disconnectModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 28,
      width: '100%',
      maxWidth: 420,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      elevation: 16,
    },
    disconnectModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    disconnectIconBox: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    disconnectModalBody: {
      fontSize: 14,
      fontWeight: '500',
      color: theme === 'dark' ? colors.textSecondary : '#4B5563',
      lineHeight: 22,
      marginBottom: 28,
    },
    disconnectModalBtns: {
      flexDirection: 'row',
      gap: 12,
    },
    disconnectCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    disconnectCancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    disconnectConfirmBtn: {
      flex: 1.4,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectConfirmText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
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
    webViewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    webViewTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    closeWebViewButton: {
      padding: 6,
    },
    webViewLoading: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    exchangeOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    exchangeCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 36,
      alignItems: 'center',
      gap: 14,
      width: '100%',
      maxWidth: 320,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    exchangeTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    exchangeSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
