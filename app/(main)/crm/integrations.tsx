import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { DEFAULT_CRM_GROUPS, DEFAULT_CRM_TAGS, getCRMGroups, getCRMMeta, getCRMTags } from '@/services/crmService';
import {
  disconnectHubSpot,
  getHubSpotAuthUrl,
  getHubSpotStatus,
  getPipedriveAuthUrl,
  getPipedriveStatus,
  getZohoAuthUrl,
  getZohoStatus,
  HubSpotStatusResponse,
  triggerHubSpotSync,
  triggerIntegrationSync,
  updateHubSpotSettings,
  updateIntegrationSettings
} from '@/services/hubspotService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dismissBrowser, openAuthSessionAsync, openBrowserAsync } from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Linking,
  AppState,
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
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    desc: 'Automatically push leads and track marketing activity in HubSpot.',
    status: 'AVAILABLE',
    icon: 'hubspot',
    buttonLabel: 'Connect Now',
    gradient: ['#FF7A59', '#FF5C35'],
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    category: 'CRM',
    desc: 'Automatically sync contacts, deals, and tasks with Zoho CRM.',
    status: 'AVAILABLE',
    icon: 'view-grid-outline',
    buttonLabel: 'Connect Now',
    gradient: ['#E53935', '#FB8C00'],
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'CRM',
    desc: 'Automatically sync contacts, deals, and tasks with Pipedrive.',
    status: 'AVAILABLE',
    icon: 'play-circle-outline',
    buttonLabel: 'Connect Now',
    gradient: ['#00B660', '#008544'],
  },
];

export default function IntegrationsScreen() {
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ success?: string; error?: string }>();

  // ── Integrations list state ──
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [comingSoonModalVisible, setComingSoonModalVisible] = useState(false);
  const [comingSoonIntegration, setComingSoonIntegration] = useState<Integration | null>(null);

  // ── Integration loading states ──
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [pipedriveLoading, setPipedriveLoading] = useState(false);
  const [hubspotStatus, setHubspotStatus] = useState<any>(null);
  const [zohoStatus, setZohoStatus] = useState<any>(null);
  const [pipedriveStatus, setPipedriveStatus] = useState<any>(null);
  const [hubspotModalVisible, setHubspotModalVisible] = useState(false);
  const [managingIntegration, setManagingIntegration] = useState<Integration | null>(null);
  const [hubspotAuthUrl, setHubspotAuthUrl] = useState<string | null>(null);
  const [showHubspotWebView, setShowHubspotWebView] = useState(false);
  const [oauthModalTitle, setOauthModalTitle] = useState('Connect Integration');
  const [oauthIntegrationName, setOauthIntegrationName] = useState('Integration');
  const [syncPush, setSyncPush] = useState(false);
  const [syncPull, setSyncPull] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── CRM Meta for default group/tag pickers ──
  const [groups, setGroups] = useState<{ id: number; name: string }[]>(DEFAULT_CRM_GROUPS);
  const [tags, setTags] = useState<{ id: number; name: string; tag_color: string }[]>(DEFAULT_CRM_TAGS);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const connectedCount = integrations.filter(i => i.status === 'CONNECTED').length;
  const availableCount = integrations.filter(i => i.status === 'AVAILABLE').length;

  // ── Fetch Integrations status on mount / refresh ──
  const fetchHubSpotStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [hubspotRes, zohoRes, pipedriveRes] = await Promise.allSettled([
        getHubSpotStatus(accessToken),
        getZohoStatus(accessToken),
        getPipedriveStatus(accessToken),
      ]);

      const hubspotData = hubspotRes.status === 'fulfilled' ? hubspotRes.value : null;
      const zohoData = zohoRes.status === 'fulfilled' ? zohoRes.value : null;
      const pipedriveData = pipedriveRes.status === 'fulfilled' ? pipedriveRes.value : null;

      if (hubspotData) {
        setHubspotStatus(hubspotData);
      }
      if (zohoData) {
        setZohoStatus(zohoData);
      }
      if (pipedriveData) {
        setPipedriveStatus(pipedriveData);
      }

      setIntegrations(prev => prev.map(i => {
        if (i.id === 'hubspot' && hubspotData) {
          return {
            ...i,
            status: hubspotData.connected ? ('CONNECTED' as const) : ('AVAILABLE' as const),
            buttonLabel: hubspotData.connected ? 'Manage' : 'Connect Now',
          };
        }
        if (i.id === 'zoho' && zohoData) {
          return {
            ...i,
            status: zohoData.connected ? ('CONNECTED' as const) : ('AVAILABLE' as const),
            buttonLabel: zohoData.connected ? 'Manage' : 'Connect Now',
          };
        }
        if (i.id === 'pipedrive' && pipedriveData) {
          return {
            ...i,
            status: pipedriveData.connected ? ('CONNECTED' as const) : ('AVAILABLE' as const),
            buttonLabel: pipedriveData.connected ? 'Manage' : 'Connect Now',
          };
        }
        return i;
      }));
    } catch {
      // Silently fail — cards stay in current status
    }
  }, [accessToken]);

  const fetchMeta = useCallback(async () => {
    if (!accessToken) return;
    try {
      console.log('🔍 [fetchMeta] Loading groups & tags from /solo/crm/groups and /solo/crm/tags...');
      const [groupsData, tagsData] = await Promise.all([
        getCRMGroups(accessToken),
        getCRMTags(accessToken),
      ]);
      console.log('🔍 [fetchMeta] Loaded groups:', groupsData?.length, 'tags:', tagsData?.length);
      if (Array.isArray(groupsData)) {
        setGroups(groupsData);
      }
      if (Array.isArray(tagsData)) {
        setTags(tagsData);
      }
    } catch (err: any) {
      console.warn('⚠️ [fetchMeta] Error loading meta:', err?.message);
    }
  }, [accessToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchHubSpotStatus(),
        fetchMeta(),
      ]);
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  }, [fetchHubSpotStatus, fetchMeta]);

  useEffect(() => {
    fetchHubSpotStatus();
    fetchMeta();
  }, [fetchHubSpotStatus, fetchMeta]);

  // ── Handle incoming deep link redirect parameters ──
  useEffect(() => {
    console.log('📥 [HubSpot DeepLink] Route Params Received:', JSON.stringify(params, null, 2));
    if (params.success === 'hubspot_connected') {
      console.log('✅ [HubSpot DeepLink] Matched success param: hubspot_connected');
      fetchHubSpotStatus();
      // Clear route query parameters so the alert doesn't re-trigger on subsequent updates
      router.setParams({ success: undefined });
      Alert.alert('Integration Successful', 'Your HubSpot account has been successfully connected!');
    } else if (params.error === 'auth_failed') {
      console.log('❌ [HubSpot DeepLink] Matched error param: auth_failed');
      router.setParams({ error: undefined });
      Alert.alert('Integration Failed', 'Failed to connect HubSpot. Please try again.');
    }
  }, [params.success, params.error, fetchHubSpotStatus, router]);

  // ── Handle incoming deep link URLs directly via Linking listener ──
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('📥 [HubSpot DeepLink] Incoming Event URL:', event.url);
      if (event.url.includes('hubspot_connected') || event.url.includes('success')) {
        console.log('✅ [HubSpot DeepLink] Event URL matched success criteria');
        fetchHubSpotStatus();
        Alert.alert('Integration Successful', 'Your HubSpot account has been successfully connected!');
      } else if (event.url.includes('auth_failed') || event.url.includes('error')) {
        console.log('❌ [HubSpot DeepLink] Event URL matched error criteria');
        Alert.alert('Integration Failed', 'Failed to connect HubSpot. Please try again.');
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      console.log('📥 [HubSpot DeepLink] App Initial Launch URL:', url);
      if (url && (url.includes('hubspot_connected') || url.includes('success'))) {
        fetchHubSpotStatus();
        Alert.alert('Integration Successful', 'Your HubSpot account has been successfully connected!');
      }
    });

    return () => {
      linkSub.remove();
    };
  }, [fetchHubSpotStatus]);

  // ── Refresh status when app comes back to foreground (e.g. from Gmail / Chrome) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 [AppState] App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('🔄 [AppState] App active -> refreshing HubSpot status...');
        fetchHubSpotStatus();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [fetchHubSpotStatus]);

  // ── WebView navigation handler for OAuth ──
  const handleWebViewNavigationStateChange = useCallback((navState: any) => {
    const url: string = navState.url || '';
    console.log('🌐 [OAuth WebView Nav]:', url);

    const isAuthPage =
      url.includes('hubspot.com') ||
      url.includes('zoho.com') ||
      url.includes('zoho.in') ||
      url.includes('zoho.eu') ||
      url.includes('pipedrive.com');

    const isBackendCallback =
      url.includes('/callback') ||
      url.includes('/hubspot/callback') ||
      url.includes('/zoho/callback') ||
      url.includes('/pipedrive/callback') ||
      url.includes('staging-api.zien.ai') ||
      url.includes('api.zien.ai');

    // Only intercept and close AFTER the backend callback has executed and redirected to frontend/success/login
    if (!isAuthPage && !isBackendCallback) {
      if (
        url.includes('success') ||
        url.includes('connected') ||
        url.includes('staging.zien.ai') ||
        url.includes('zien.ai')
      ) {
        setShowHubspotWebView(false);
        setHubspotAuthUrl(null);
        fetchHubSpotStatus();
        if (url.includes('error=')) {
          Alert.alert('Integration Failed', `Failed to connect ${oauthIntegrationName}. Please try again.`);
        } else {
          Alert.alert('Integration Successful', `Your ${oauthIntegrationName} account has been successfully connected!`);
        }
      }
    }
  }, [fetchHubSpotStatus, oauthIntegrationName]);

  const handleShouldStartLoadWithRequest = useCallback((request: any) => {
    const url: string = request.url || '';
    console.log('🌐 [OAuth WebView ShouldStart]:', url);

    const isAuthPage =
      url.includes('hubspot.com') ||
      url.includes('zoho.com') ||
      url.includes('zoho.in') ||
      url.includes('zoho.eu') ||
      url.includes('pipedrive.com');

    const isBackendCallback =
      url.includes('/callback') ||
      url.includes('/hubspot/callback') ||
      url.includes('/zoho/callback') ||
      url.includes('/pipedrive/callback') ||
      url.includes('staging-api.zien.ai') ||
      url.includes('api.zien.ai');

    // Allow OAuth provider pages AND backend callback API request to load!
    if (isAuthPage || isBackendCallback) {
      return true;
    }

    // Intercept when backend finishes processing code and redirects to frontend domain
    if (
      url.includes('success') ||
      url.includes('connected') ||
      url.includes('staging.zien.ai') ||
      url.includes('zien.ai')
    ) {
      setShowHubspotWebView(false);
      setHubspotAuthUrl(null);
      fetchHubSpotStatus();
      if (url.includes('error=')) {
        Alert.alert('Integration Failed', `Failed to connect ${oauthIntegrationName}. Please try again.`);
      } else {
        Alert.alert('Integration Successful', `Your ${oauthIntegrationName} account has been successfully connected!`);
      }
      return false; // Prevent loading Zien web login page inside WebView
    }
    return true;
  }, [fetchHubSpotStatus, oauthIntegrationName]);

  // ── HubSpot OAuth Connect ──
  const handleHubSpotConnect = async () => {
    if (!accessToken) return;
    setHubspotLoading(true);

    try {
      console.log('🚀 [HubSpot Connect] Initiating OAuth URL request...');
      const res = await getHubSpotAuthUrl(accessToken);
      console.log('🚀 [HubSpot Connect] Received Auth URL:', res.url);

      if (res.url) {
        setOauthModalTitle('Connect HubSpot');
        setOauthIntegrationName('HubSpot');
        setHubspotAuthUrl(res.url);
        setShowHubspotWebView(true);
      }
    } catch (err: any) {
      console.warn('⚠️ [HubSpot Connect] Error initiating OAuth:', err?.message);
      Alert.alert('Connection Error', err.message || 'Failed to initiate HubSpot OAuth.');
    } finally {
      setHubspotLoading(false);
    }
  };

  // ── Manual Sync (HubSpot / Zoho CRM / Pipedrive) ──
  const handleSync = async () => {
    if (!accessToken) return;
    setSyncing(true);
    const provider = managingIntegration?.id || 'hubspot';
    const providerName = managingIntegration?.name || 'CRM';
    try {
      if (provider === 'hubspot') {
        const res = await triggerHubSpotSync(accessToken);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['crmContacts'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['crmLeads'] });
        queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
        Alert.alert('Sync Complete', `Successfully synced ${res.count || 0} contact(s) from ${providerName}.`);
      } else {
        await triggerIntegrationSync(provider, accessToken);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['crmContacts'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['crmLeads'] });
        queryClient.invalidateQueries({ queryKey: ['crm-overview'] });
        Alert.alert('Sync Complete', `Successfully triggered synchronization with ${providerName}.`);
      }
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'Failed to sync contacts.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Toggle Push Sync (Immediate Save) ──
  const handleTogglePush = async (newValue: boolean) => {
    if (!accessToken) return;
    const prevValue = syncPush;
    setSyncPush(newValue);
    const provider = managingIntegration?.id || 'hubspot';
    try {
      const payload: any = {
        sync_push: newValue,
        sync_pull: syncPull,
      };
      if (selectedGroupId || selectedTagId) {
        payload.settings = {
          ...(selectedGroupId ? { default_group_id: selectedGroupId } : {}),
          ...(selectedTagId ? { default_tag_id: selectedTagId } : {}),
        };
      }
      const res = await updateIntegrationSettings(provider, accessToken, payload);
      if (res?.sync_push !== undefined) {
        setSyncPush(res.sync_push);
      }
      if (provider === 'hubspot') {
        setHubspotStatus((prev: any) => ({ ...(prev || {}), sync_push: newValue }));
      } else if (provider === 'zoho') {
        setZohoStatus((prev: any) => ({ ...(prev || {}), sync_push: newValue }));
      } else if (provider === 'pipedrive') {
        setPipedriveStatus((prev: any) => ({ ...(prev || {}), sync_push: newValue }));
      }
    } catch (err: any) {
      setSyncPush(prevValue);
      Alert.alert('Error', err.message || 'Failed to update push settings.');
    }
  };

  // ── Toggle Pull Sync (Immediate Save) ──
  const handleTogglePull = async (newValue: boolean) => {
    if (!accessToken) return;
    const prevValue = syncPull;
    setSyncPull(newValue);
    const provider = managingIntegration?.id || 'hubspot';
    try {
      const payload: any = {
        sync_push: syncPush,
        sync_pull: newValue,
      };
      if (selectedGroupId || selectedTagId) {
        payload.settings = {
          ...(selectedGroupId ? { default_group_id: selectedGroupId } : {}),
          ...(selectedTagId ? { default_tag_id: selectedTagId } : {}),
        };
      }
      const res = await updateIntegrationSettings(provider, accessToken, payload);
      if (res?.sync_pull !== undefined) {
        setSyncPull(res.sync_pull);
      }
      if (provider === 'hubspot') {
        setHubspotStatus((prev: any) => ({ ...(prev || {}), sync_pull: newValue }));
      } else if (provider === 'zoho') {
        setZohoStatus((prev: any) => ({ ...(prev || {}), sync_pull: newValue }));
      } else if (provider === 'pipedrive') {
        setPipedriveStatus((prev: any) => ({ ...(prev || {}), sync_pull: newValue }));
      }
    } catch (err: any) {
      setSyncPull(prevValue);
      Alert.alert('Error', err.message || 'Failed to update pull settings.');
    }
  };

  // ── Select Group (Immediate Save via POST /settings) ──
  const handleSelectGroup = async (groupId: number | null) => {
    if (!accessToken) return;
    const prevGroupId = selectedGroupId;
    setSelectedGroupId(groupId);
    setGroupPickerOpen(false);
    const provider = managingIntegration?.id || 'hubspot';
    try {
      console.log(`📡 [handleSelectGroup] Calling POST /solo/crm/integrations/${provider}/settings with default_group_id:`, groupId);
      const res = await updateIntegrationSettings(provider, accessToken, {
        sync_push: syncPush,
        sync_pull: syncPull,
        settings: {
          default_group_id: groupId,
          ...(selectedTagId ? { default_tag_id: selectedTagId } : {}),
        },
      });
      if (res?.settings?.default_group_id !== undefined) {
        setSelectedGroupId(res.settings.default_group_id);
      }
      if (provider === 'zoho') {
        setZohoStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_group_id: groupId } }));
      } else if (provider === 'hubspot') {
        setHubspotStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_group_id: groupId } }));
      } else if (provider === 'pipedrive') {
        setPipedriveStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_group_id: groupId } }));
      }
    } catch (err: any) {
      setSelectedGroupId(prevGroupId);
      Alert.alert('Error', err.message || 'Failed to update default group.');
    }
  };

  // ── Select Tag (Immediate Save via POST /settings) ──
  const handleSelectTag = async (tagId: number | null) => {
    if (!accessToken) return;
    const prevTagId = selectedTagId;
    setSelectedTagId(tagId);
    setTagPickerOpen(false);
    const provider = managingIntegration?.id || 'hubspot';
    try {
      console.log(`📡 [handleSelectTag] Calling POST /solo/crm/integrations/${provider}/settings with default_tag_id:`, tagId);
      const res = await updateIntegrationSettings(provider, accessToken, {
        sync_push: syncPush,
        sync_pull: syncPull,
        settings: {
          ...(selectedGroupId ? { default_group_id: selectedGroupId } : {}),
          default_tag_id: tagId,
        },
      });
      if (res?.settings?.default_tag_id !== undefined) {
        setSelectedTagId(res.settings.default_tag_id);
      }
      if (provider === 'zoho') {
        setZohoStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_tag_id: tagId } }));
      } else if (provider === 'hubspot') {
        setHubspotStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_tag_id: tagId } }));
      } else if (provider === 'pipedrive') {
        setPipedriveStatus((prev: any) => ({ ...(prev || {}), settings: { ...(prev?.settings || {}), default_tag_id: tagId } }));
      }
    } catch (err: any) {
      setSelectedTagId(prevTagId);
      Alert.alert('Error', err.message || 'Failed to update default tag.');
    }
  };

  // ── HubSpot Disconnect ──
  const handleHubSpotDisconnect = () => {
    Alert.alert(
      'Disconnect HubSpot',
      'Are you sure you want to disconnect your HubSpot integration? All sync settings will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            setDisconnecting(true);
            try {
              await disconnectHubSpot(accessToken);
              setHubspotStatus(null);
              setSyncPush(false);
              setSyncPull(false);
              setSelectedGroupId(null);
              setSelectedTagId(null);
              setIntegrations(prev => prev.map(i =>
                i.id === 'hubspot'
                  ? { ...i, status: 'AVAILABLE' as const, buttonLabel: 'Connect Now' }
                  : i
              ));
              setHubspotModalVisible(false);
              Alert.alert('Disconnected', 'HubSpot has been disconnected.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to disconnect.');
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  // ── Zoho CRM OAuth Connect ──
  const handleZohoConnect = async () => {
    if (!accessToken) return;
    setZohoLoading(true);
    try {
      console.log('🚀 [Zoho Connect] Initiating OAuth URL request...');
      const res = await getZohoAuthUrl(accessToken);
      console.log('🚀 [Zoho Connect] Received Auth URL:', res.url);

      if (res.url) {
        setOauthModalTitle('Connect Zoho CRM');
        setOauthIntegrationName('Zoho CRM');
        setHubspotAuthUrl(res.url);
        setShowHubspotWebView(true);
      }
    } catch (err: any) {
      console.warn('⚠️ [Zoho Connect] Error initiating OAuth:', err?.message);
      Alert.alert('Connection Error', err.message || 'Failed to initiate Zoho CRM OAuth.');
    } finally {
      setZohoLoading(false);
    }
  };

  // ── Pipedrive OAuth Connect ──
  const handlePipedriveConnect = async () => {
    if (!accessToken) return;
    setPipedriveLoading(true);
    try {
      console.log('🚀 [Pipedrive Connect] Initiating OAuth URL request...');
      const res = await getPipedriveAuthUrl(accessToken);
      console.log('🚀 [Pipedrive Connect] Received Auth URL:', res.url);

      if (res.url) {
        setOauthModalTitle('Connect Pipedrive');
        setOauthIntegrationName('Pipedrive');
        setHubspotAuthUrl(res.url);
        setShowHubspotWebView(true);
      }
    } catch (err: any) {
      console.warn('⚠️ [Pipedrive Connect] Error initiating OAuth:', err?.message);
      Alert.alert('Connection Error', err.message || 'Failed to initiate Pipedrive OAuth.');
    } finally {
      setPipedriveLoading(false);
    }
  };

  // ── Card press handler ──
  const handleCardAction = (int: Integration) => {
    if (int.status === 'CONNECTED') {
      setManagingIntegration(int);
      const activeStatus = int.id === 'zoho' ? zohoStatus : int.id === 'pipedrive' ? pipedriveStatus : hubspotStatus;
      if (activeStatus) {
        setSyncPush(activeStatus.sync_push ?? false);
        setSyncPull(activeStatus.sync_pull ?? false);
        setSelectedGroupId(activeStatus.settings?.default_group_id ?? null);
        setSelectedTagId(activeStatus.settings?.default_tag_id ?? null);
      }
      setHubspotModalVisible(true);
      fetchMeta();
    } else if (int.id === 'hubspot') {
      handleHubSpotConnect();
    } else if (int.id === 'zoho') {
      handleZohoConnect();
    } else if (int.id === 'pipedrive') {
      handlePipedriveConnect();
    } else {
      // All other integrations → Coming Soon modal
      setComingSoonIntegration(int);
      setComingSoonModalVisible(true);
    }
  };

  // ── Helper to get group/tag name by id ──
  const getGroupName = (id: number | null) => groups.find(g => g.id === id)?.name || 'Select a default group...';
  const getTagName = (id: number | null) => tags.find(t => t.id === id)?.name || 'Select a default tag...';

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
            colors={['#0a2341']}
          />
        }>



        {/* Integration Cards */}
        <View style={styles.cardsGrid}>
          {integrations.map((int) => {
            const isConnected = int.status === 'CONNECTED';
            const isConnecting =
              (int.id === 'hubspot' && hubspotLoading) ||
              (int.id === 'zoho' && zohoLoading) ||
              (int.id === 'pipedrive' && pipedriveLoading);

            return (
              <View
                key={int.id}
                style={[
                  styles.intCard,
                  isConnected && styles.intCardConnected,
                ]}
              >
                <View style={styles.intCardHeader}>
                  <LinearGradient
                    colors={[...int.gradient] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.intIconWrap}
                  >
                    <MaterialCommunityIcons name={int.icon} size={22} color="#FFFFFF" />
                  </LinearGradient>

                  <View style={[
                    styles.statusBadge,
                    isConnected && styles.statusBadgeConnected,
                  ]}>
                    {isConnected && <View style={styles.connectedPulse} />}
                    <Text style={[
                      styles.statusBadgeText,
                      isConnected && styles.statusBadgeTextConnected,
                    ]}>
                      {isConnected ? 'CONNECTED' : 'AVAILABLE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.intMetaGroup}>
                  <Text style={styles.intName} numberOfLines={1}>{int.name}</Text>
                  <Text style={styles.intCategory}>{int.category}</Text>
                </View>

                <Text style={styles.intDesc} numberOfLines={2}>{int.desc}</Text>

                {isConnected ? (
                  <View style={styles.connectedRow}>
                    <Pressable
                      onPress={() => handleCardAction(int)}
                      style={({ pressed }) => [
                        styles.manageBtn,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      ]}>
                      <MaterialCommunityIcons name="cog-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.intActionBtnText}>Manage</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        if (int.id === 'hubspot') {
                          handleHubSpotDisconnect();
                        } else {
                          Alert.alert('Disconnect', `Are you sure you want to disconnect ${int.name}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Disconnect',
                              style: 'destructive',
                              onPress: () => {
                                setIntegrations(prev => prev.map(item => item.id === int.id ? { ...item, status: 'AVAILABLE', buttonLabel: 'Connect Now' } : item));
                              }
                            }
                          ]);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.disconnectBtn,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                      ]}>
                      <Text style={styles.intActionBtnText}>Disconnect</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleCardAction(int)}
                    disabled={isConnecting}
                    style={({ pressed }) => [
                      styles.intActionBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}>
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.intActionBtnText}>{int.buttonLabel}</Text>
                    )}
                  </Pressable>
                )}
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
          colors={['#0a2341', '#1B5E9A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HubSpot Management Modal                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HubSpot Management Modal 2.0                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={hubspotModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHubspotModalVisible(false)}
      >
        <Pressable
          style={styles.hs2Overlay}
          onPress={() => setHubspotModalVisible(false)}
        >
          <Pressable style={styles.hs2Card} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.hs2Header}>
              <Text style={styles.hs2Title}>Manage {managingIntegration?.name || 'HubSpot'}</Text>
              <Pressable
                style={({ pressed }) => [styles.hs2CloseBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setHubspotModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ flexGrow: 0 }}>

              {/* SECTION 1: Lead Routing Defaults */}
              <View style={styles.hs2SectionCard}>
                <View style={styles.hs2SectionHeader}>
                  <View style={styles.hs2IconWrapper}>
                    <MaterialCommunityIcons name="folder-open-outline" size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.hs2SectionTitleGroup}>
                    <Text style={styles.hs2SectionTitleText}>Lead Routing (Defaults)</Text>
                    <Text style={styles.hs2SectionSubtitleText}>
                      When a new contact is pulled from {managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')}, where should Zien save them?
                    </Text>
                  </View>
                </View>

                {/* Group Dropdown */}
                <View style={styles.hs2FieldGroup}>
                  <Text style={styles.hs2FieldLabel}>Assign to Group</Text>
                  <Pressable
                    style={styles.hs2CustomDropdown}
                    onPress={() => {
                      setGroupPickerOpen(!groupPickerOpen);
                      setTagPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.hs2DropdownText, !selectedGroupId && styles.hs2DropdownPlaceholder]}>
                      {getGroupName(selectedGroupId)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                  </Pressable>

                  {groupPickerOpen && (
                    <View style={styles.hs2PickerListInline}>
                      <ScrollView nestedScrollEnabled={true}>
                        {groups.map((g, idx) => (
                          <Pressable
                            key={`group-${g.id || idx}`}
                            style={[styles.hs2PickerItemInline, selectedGroupId === g.id && styles.hs2PickerItemActive]}
                            onPress={() => handleSelectGroup(g.id)}
                          >
                            <Text style={[styles.hs2PickerItemTextInline, selectedGroupId === g.id && styles.hs2PickerItemTextActive]}>
                              {g.name}
                            </Text>
                            {selectedGroupId === g.id && (
                              <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                      {groups.length === 0 && (
                        <Text style={styles.hs2PickerEmptyInline}>No groups found</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Tag Dropdown */}
                <View style={styles.hs2FieldGroup}>
                  <Text style={styles.hs2FieldLabel}>Assign to Tag</Text>
                  <Pressable
                    style={styles.hs2CustomDropdown}
                    onPress={() => {
                      setTagPickerOpen(!tagPickerOpen);
                      setGroupPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.hs2DropdownText, !selectedTagId && styles.hs2DropdownPlaceholder]}>
                      {getTagName(selectedTagId)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                  </Pressable>

                  {tagPickerOpen && (
                    <View style={styles.hs2PickerListInline}>
                      <ScrollView nestedScrollEnabled={true}>
                        {tags.map((t, idx) => (
                          <Pressable
                            key={`tag-${t.id || idx}`}
                            style={[styles.hs2PickerItemInline, selectedTagId === t.id && styles.hs2PickerItemActive]}
                            onPress={() => handleSelectTag(t.id)}
                          >
                            <View style={styles.hsTagRow}>
                              <View style={[styles.hsTagDot, { backgroundColor: t.tag_color || '#94A3B8' }]} />
                              <Text style={[styles.hs2PickerItemTextInline, selectedTagId === t.id && styles.hs2PickerItemTextActive]}>
                                {t.name}
                              </Text>
                            </View>
                            {selectedTagId === t.id && (
                              <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                      {tags.length === 0 && (
                        <Text style={styles.hs2PickerEmptyInline}>No tags found</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* SECTION 2: Manual Data Sync */}
              <View style={styles.hs2SectionCard}>
                <View style={styles.hs2SectionHeader}>
                  <View style={styles.hs2IconWrapper}>
                    <MaterialCommunityIcons name="database-outline" size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.hs2SectionTitleGroup}>
                    <Text style={styles.hs2SectionTitleText}>Manual Data Sync</Text>
                    <Text style={styles.hs2SectionSubtitleText}>
                      Automatic syncing is enabled, but you can manually trigger a full synchronization of older contacts right now.
                    </Text>
                  </View>
                </View>

                <View style={styles.hs2SyncBtnContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.hs2ForceSyncBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                         <MaterialCommunityIcons name="database-sync-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.hs2ForceSyncBtnText}>Force Sync Now</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* SECTION 3: Sync Direction Settings */}
              <View style={styles.hs2SectionCard}>
                <View style={styles.hs2SectionHeader}>
                  <View style={styles.hs2IconWrapper}>
                    <MaterialCommunityIcons name="cog-outline" size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.hs2SectionTitleGroup}>
                    <Text style={styles.hs2SectionTitleText}>Sync Direction Settings</Text>
                    <Text style={styles.hs2SectionSubtitleText}>
                      Control how data flows between Zien and {managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')} automatically.
                    </Text>
                  </View>
                </View>

                {/* Push Switch Item */}
                <View style={styles.hs2SwitchRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hs2SwitchTitle}>Push to {managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')}</Text>
                    <Text style={styles.hs2SwitchSub}>Zien changes will update {managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')}</Text>
                  </View>
                  <Switch
                    value={syncPush}
                    onValueChange={handleTogglePush}
                    trackColor={{ false: colors.cardBorder, true: colors.accentTeal }}
                    thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                  />
                </View>

                {/* Pull Switch Item */}
                <View style={styles.hs2SwitchRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hs2SwitchTitle}>Pull from {managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')}</Text>
                    <Text style={styles.hs2SwitchSub}>{managingIntegration?.id === 'zoho' ? 'Zoho' : (managingIntegration?.name || 'HubSpot')} changes will update Zien</Text>
                  </View>
                  <Switch
                    value={syncPull}
                    onValueChange={handleTogglePull}
                    trackColor={{ false: colors.cardBorder, true: colors.accentTeal }}
                    thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                  />
                </View>
              </View>

            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Request Integration Modal                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
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

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={true}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <View style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>Integration Name *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Asana, Trello, Monday.com"
                      placeholderTextColor="#94A3B8"
                      value={reqName}
                      onChangeText={setReqName}
                    />
                  </View>
                </View>

                <View style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>Your Email *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="your@email.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={reqEmail}
                      onChangeText={setReqEmail}
                    />
                  </View>
                </View>

                <View style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>Full Message *</Text>
                  <View style={[styles.inputWrap, styles.textAreaWrap]}>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Tell us how this integration would help your workflow..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      value={reqMessage}
                      onChangeText={setReqMessage}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <Pressable
                  style={({ pressed }) => [styles.cancelActionBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    setRequestModalVisible(false);
                    setReqName('');
                    setReqEmail('');
                    setReqMessage('');
                  }}
                >
                  <Text style={styles.cancelActionBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.submitActionBtn,
                    (!reqName.trim() || !reqEmail.trim() || !reqMessage.trim()) && { opacity: 0.5 },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                  ]}
                  disabled={!reqName.trim() || !reqEmail.trim() || !reqMessage.trim()}
                  onPress={() => {
                    if (!reqName.trim() || !reqEmail.trim() || !reqMessage.trim()) {
                      Alert.alert('Required Fields', 'Please fill in all required fields marked with *.');
                      return;
                    }
                    Alert.alert('Success', 'Your integration request has been submitted successfully.');
                    setReqName('');
                    setReqEmail('');
                    setReqMessage('');
                    setRequestModalVisible(false);
                  }}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitActionBtnText}>Submit Request</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Coming Soon Modal                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={comingSoonModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setComingSoonModalVisible(false)}
      >
        <Pressable
          style={styles.csOverlay}
          onPress={() => setComingSoonModalVisible(false)}
        >
          <Pressable style={styles.csCard} onPress={() => { }}>
            {/* Gradient Icon */}
            {comingSoonIntegration && (
              <LinearGradient
                colors={[...comingSoonIntegration.gradient] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.csIconWrap}
              >
                <MaterialCommunityIcons name={comingSoonIntegration.icon} size={32} color="#FFFFFF" />
              </LinearGradient>
            )}

            {/* Title */}
            <Text style={styles.csTitle}>{comingSoonIntegration?.name}</Text>
            <Text style={styles.csCategory}>{comingSoonIntegration?.category}</Text>

            {/* Coming Soon Badge */}
            <View style={styles.csBadge}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#FF7A59" />
              <Text style={styles.csBadgeText}>Coming Soon</Text>
            </View>

            {/* Description */}
            <Text style={styles.csDesc}>
              We're working hard to bring {comingSoonIntegration?.name} integration to Zien. Stay tuned for updates!
            </Text>

            {/* Close Button */}
            <Pressable
              style={({ pressed }) => [styles.csCloseBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => setComingSoonModalVisible(false)}
            >
              <Text style={styles.csCloseBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* HubSpot OAuth WebView Modal */}
      <Modal visible={showHubspotWebView} animationType="slide" transparent={false} onRequestClose={() => setShowHubspotWebView(false)}>
        <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingTop: insets.top }}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>{oauthModalTitle}</Text>
            <Pressable
              onPress={() => {
                setShowHubspotWebView(false);
                setHubspotAuthUrl(null);
                fetchHubSpotStatus();
              }}
              style={styles.closeWebViewButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {hubspotAuthUrl && (
            <WebView
              source={{ uri: hubspotAuthUrl }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={colors.accentTeal} />
                </View>
              )}
            />
          )}
        </View>
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
      shadowColor: '#0a2341',
      shadowOpacity: 0.08,
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

    connectedPulse: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    statusBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    statusBadgeTextConnected: { color: colors.accent },

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
      backgroundColor: '#0a2341',
    },
    connectedBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    connectedRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    manageBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#0C2340', // Deep brand navy
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    disconnectBtn: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#EF4444', // Premium alert red
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    intActionBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // ── FAB ──
    fab: {
      position: 'absolute',
      right: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      shadowColor: '#0a2341',
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

    // ── Modal Shared ──
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
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: 0.2,
      marginBottom: 10,
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

    // ── HubSpot Modal Styles ──
    hubspotTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    hubspotTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hsStatusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
    },
    hsStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hsStatusDotWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    hsStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    hsStatusTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    hsStatusSub: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    hsStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    hsStatusBadgeActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    hsStatusBadgeInactive: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    hsStatusBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    // ── Settings ──
    hsSectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    hsSettingsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
      overflow: 'hidden',
    },
    hsToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    hsToggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    hsToggleLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    hsToggleDesc: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    hsDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 18,
    },

    // ── Pickers ──
    hsPickerRow: {
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    hsPickerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    hsPickerLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    hsPickerValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentTeal || '#0a2341',
      marginTop: 2,
    },
    hsPickerList: {
      paddingHorizontal: 18,
      paddingBottom: 12,
    },
    hsPickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    hsPickerItemActive: {
      backgroundColor: 'rgba(11, 160, 178, 0.08)',
    },
    hsPickerItemText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    hsPickerItemTextActive: {
      color: '#0a2341',
      fontWeight: '700',
    },
    hsPickerEmpty: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 10,
    },
    hsTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hsTagDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    // ── Sync ──
    hsSyncBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: '#FF7A59',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FF7A59',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    hsSyncBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hsSyncHint: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 24,
    },

    // ── Disconnect ──
    hsDisconnectBtn: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    hsDisconnectBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
    },

    // ── HubSpot Manage Modal 2.0 Styles ──
    hs2Overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    hs2Card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxHeight: '90%',
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    hs2Header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    hs2Title: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    hs2CloseBtn: {
      padding: 4,
    },
    hs2SectionCard: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    hs2SectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    hs2IconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hs2SectionTitleGroup: {
      flex: 1,
      gap: 2,
    },
    hs2SectionTitleText: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    hs2SectionSubtitleText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 16,
    },
    hs2FieldGroup: {
      marginBottom: 14,
    },
    hs2FieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    hs2CustomDropdown: {
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
    },
    hs2DropdownText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    hs2DropdownPlaceholder: {
      color: colors.inputPlaceholder,
    },
    hs2PickerListInline: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 4,
      padding: 6,
      maxHeight: 180,
    },
    hs2PickerItemInline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    hs2PickerItemActive: {
      backgroundColor: colors.surfaceMuted,
    },
    hs2PickerItemTextInline: {
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    hs2PickerItemTextActive: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    hs2PickerEmptyInline: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.inputPlaceholder,
      textAlign: 'center',
      paddingVertical: 12,
    },
    hs2SyncBtnContainer: {
      alignItems: 'flex-start',
      marginTop: 4,
    },
    hs2ForceSyncBtn: {
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.accentTeal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    hs2ForceSyncBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hs2SwitchRowCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    hs2SwitchTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    hs2SwitchSub: {
      fontSize: 11.5,
      fontWeight: '500',
      color: colors.textSecondary,
    },

    // ── Coming Soon Modal ──
    csOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    csCard: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.15,
      shadowRadius: 30,
      elevation: 10,
    },
    csIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    csTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    csCategory: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 18,
    },
    csBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 122, 89, 0.1)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      marginBottom: 18,
    },
    csBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FF7A59',
      letterSpacing: 0.3,
    },
    csDesc: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
    csCloseBtn: {
      width: '100%',
      height: 52,
      borderRadius: 14,
      backgroundColor: '#0B2D3E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    csCloseBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0B2D3E',
    },
    webViewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
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
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
  });
}