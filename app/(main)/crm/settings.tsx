import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { updateCRMSettings, getCRMSettings } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['General', 'Email Delivery', 'Automation Rules', 'Zien Extension'] as const;
type Tab = (typeof TABS)[number];

const LEAD_DISTRIBUTION_OPTIONS = [
  'Assign to Me (Default)',
  'Round Robin (Team)',
  'First to Claim',
  'Priority (Broker Selection)',
] as const;
const AUTOMATED_ACTION_OPTIONS = ["Send 'Just Checking In' Email", 'Create Follow-Up Task', 'Send SMS Reminder'] as const;

const EMAIL_PROVIDERS = [
  { id: 'mailgun', name: 'Mailgun' },
  { id: 'sendgrid', name: 'SendGrid' },
];

const ANNIVERSARY_RULES = [
  { id: 'home', label: 'Home Purchase Anniversary', icon: 'home-outline' as const },
  { id: 'birthday', label: 'Client Birthday', icon: 'gift-outline' as const },
  { id: 'marriage', label: 'Marriage Anniversary', icon: 'heart-outline' as const },
];

const INACTIVITY_OPTIONS = ['30 Days', '60 Days', '90 Days (Recommended)', '180 Days'] as const;
const SAFETY_LIMIT_OPTIONS = ['1 Attempt', '3 Attempts (Max)', 'No Limit'] as const;
const TARGET_SEGMENT_OPTIONS = ['Standard Leads', 'Cold Outreach', 'Dormant Buyers'] as const;
const SENDER_IDENTITY_OPTIONS = [
  'Assigned Agent (Personalized)',
  'Zien Concierge (Neutral)',
  'Brokerage Principal (High Priority)',
] as const;

export default function CRMSettingsScreen() {
  const { colors, theme } = useAppTheme();
  const { accessToken } = useAuth();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadDistribution, setLeadDistribution] = useState<(typeof LEAD_DISTRIBUTION_OPTIONS)[number]>('Assign to Me (Default)');
  const [autoMergeDuplicates, setAutoMergeDuplicates] = useState(true);
  const [leadDistOpen, setLeadDistOpen] = useState(false);
  const [inactivityDays, setInactivityDays] = useState<(typeof INACTIVITY_OPTIONS)[number]>('90 Days (Recommended)');
  const [safetyLimit, setSafetyLimit] = useState<(typeof SAFETY_LIMIT_OPTIONS)[number]>('3 Attempts (Max)');
  const [reEngagementChannel, setReEngagementChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [protocolIdentity, setProtocolIdentity] = useState<(typeof SENDER_IDENTITY_OPTIONS)[number]>('Assigned Agent (Personalized)');
  const [targetSegmentGhost, setTargetSegmentGhost] = useState<(typeof TARGET_SEGMENT_OPTIONS)[number]>('Standard Leads');

  const [inactivityOpen, setInactivityOpen] = useState(false);
  const [safetyLimitOpen, setSafetyLimitOpen] = useState(false);
  const [targetSegmentOpen, setTargetSegmentOpen] = useState(false);
  const [protocolIdentityOpen, setProtocolIdentityOpen] = useState(false);

  const [automatedAction, setAutomatedAction] = useState<(typeof AUTOMATED_ACTION_OPTIONS)[number]>("Send 'Just Checking In' Email");
  const [automatedActionOpen, setAutomatedActionOpen] = useState(false);
  const [emailBodyPreview, setEmailBodyPreview] = useState("\"Hi {{first_name}}, it's been a while since we last spoke. I noticed you haven't browsed the {{last_property}} details recently—are you still tracking listing in that area or should I pause your updates?\"");
  const [ghostProtocolEnabled, setGhostProtocolEnabled] = useState(true);
  const [anniversaryToggles, setAnniversaryToggles] = useState<Record<string, boolean>>({
    home: false,
    birthday: false,
    marriage: false,
  });
  const [customRules, setCustomRules] = useState<{ id: string; label: string; icon: any; enabled: boolean }[]>([]);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');

  // ── Transactional Email Providers State ──
  const [connectedProviders, setConnectedProviders] = useState<Record<string, { apiKey: string; domain?: string; senderEmail?: string }>>({});
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<{ id: string; name: string } | null>(null);
  const [modalApiKey, setModalApiKey] = useState('');
  const [modalDomain, setModalDomain] = useState('');
  const [modalSenderEmail, setModalSenderEmail] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!accessToken) return;
      try {
        setLoading(true);
        const data = await getCRMSettings(accessToken);
        if (data) {
          if (data.lead_distribution) {
            setLeadDistribution(data.lead_distribution as any);
          }
          if (data.auto_merge !== undefined) {
            setAutoMergeDuplicates(data.auto_merge);
          }
          if (data.inactivity_threshold) {
            setInactivityDays(data.inactivity_threshold as any);
          }
          if (data.safety_limit) {
            setSafetyLimit(data.safety_limit as any);
          }
          if (data.target_segment) {
            setTargetSegmentGhost(data.target_segment as any);
          }
          if (data.reengagement_channel) {
            setReEngagementChannel(data.reengagement_channel as any);
          }
          if (data.protocol_identity) {
            setProtocolIdentity(data.protocol_identity as any);
          }
          if (data.recovery_script) {
            setEmailBodyPreview(data.recovery_script);
          }
          if (data.ghost_protocol !== undefined) {
            setGhostProtocolEnabled(data.ghost_protocol);
          }
          if (data.anniversary_settings) {
            setAnniversaryToggles({
              home: !!data.anniversary_settings.homeAnniversary,
              birthday: !!data.anniversary_settings.birthdayAnniversary,
              marriage: !!data.anniversary_settings.marriageAnniversary,
            });
          }
          if (data.anniversaries) {
            const standardKeys = ['homeAnniversary', 'birthdayAnniversary', 'marriageAnniversary'];
            const custom = data.anniversaries
              .filter((ann: any) => !standardKeys.includes(ann.key))
              .map((ann: any) => ({
                id: ann.key,
                label: ann.event,
                icon: ann.icon === 'star' ? 'star-outline' : ann.icon,
                enabled: !!data.anniversary_settings?.[ann.key]
              }));
            setCustomRules(custom);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load CRM settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [accessToken]);

  const handleOpenConnect = (provider: { id: string; name: string }) => {
    setActiveProvider(provider);
    const existing = connectedProviders[provider.id];
    setModalApiKey(existing?.apiKey || '');
    setModalDomain(existing?.domain || '');
    setModalSenderEmail(existing?.senderEmail || '');
    setProviderModalOpen(true);
  };

  const handleSaveConnection = () => {
    if (!activeProvider) return;
    if (activeProvider.id === 'mailgun') {
      if (!modalApiKey.trim() || !modalDomain.trim() || !modalSenderEmail.trim()) {
        Alert.alert('Required Fields', 'Please fill in the API Key, Verified Domain, and Sender Email.');
        return;
      }
    } else if (activeProvider.id === 'sendgrid') {
      if (!modalApiKey.trim() || !modalSenderEmail.trim()) {
        Alert.alert('Required Fields', 'Please fill in the API Key and Sender Email.');
        return;
      }
    }
    setConnectedProviders(prev => ({
      ...prev,
      [activeProvider.id]: {
        apiKey: modalApiKey,
        domain: activeProvider.id === 'mailgun' ? modalDomain : '',
        senderEmail: modalSenderEmail,
      }
    }));
    setProviderModalOpen(false);
    setActiveProvider(null);
    setModalApiKey('');
    setModalDomain('');
    setModalSenderEmail('');
  };

  const handleDisconnectProvider = (providerId: string) => {
    Alert.alert(
      'Disconnect Provider',
      'Are you sure you want to disconnect this email provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setConnectedProviders(prev => {
              const copy = { ...prev };
              delete copy[providerId];
              return copy;
            });
          }
        }
      ]
    );
  };

  const setAnniversaryToggle = (id: string, value: boolean) =>
    setAnniversaryToggles((prev) => ({ ...prev, [id]: value }));

  const handleAddMilestone = () => {
    if (!newMilestoneName.trim()) return;
    const newId = `custom_${Date.now()}`;
    setCustomRules((prev) => [
      ...prev,
      {
        id: newId,
        label: newMilestoneName,
        icon: 'star-outline' as const,
        enabled: true,
      },
    ]);
    setNewMilestoneName('');
    setIsMilestoneModalOpen(false);
  };

  const handleSave = async () => {
    if (!accessToken) {
      Alert.alert('Unauthorized', 'You must be signed in to save settings.');
      return;
    }
    if (saving) return;

    const anniversaries = [
      ...ANNIVERSARY_RULES.map(rule => ({
        event: rule.label,
        icon: rule.id === 'birthday' ? 'gift' : rule.id === 'marriage' ? 'heart' : 'home',
        key: `${rule.id}Anniversary`
      })),
      ...customRules.map(rule => ({
        event: rule.label,
        icon: 'star',
        key: rule.id
      }))
    ];

    const anniversarySettings: Record<string, boolean> = {
      homeAnniversary: !!anniversaryToggles.home,
      birthdayAnniversary: !!anniversaryToggles.birthday,
      marriageAnniversary: !!anniversaryToggles.marriage,
    };
    customRules.forEach(rule => {
      anniversarySettings[rule.id] = rule.enabled;
    });

    const payload = {
      lead_distribution: leadDistribution,
      auto_merge: autoMergeDuplicates,
      inactivity_threshold: inactivityDays,
      safety_limit: safetyLimit,
      target_segment: targetSegmentGhost,
      reengagement_channel: reEngagementChannel,
      protocol_identity: protocolIdentity,
      recovery_script: emailBodyPreview,
      ghost_protocol: ghostProtocolEnabled,
      anniversaries,
      anniversary_settings: anniversarySettings,
    };

    try {
      setSaving(true);
      await updateCRMSettings(accessToken, payload);
      Alert.alert('Success', 'CRM settings saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <PageHeader
        title="CRM & Marketing Settings"
        subtitle="Configure attribution, automated follow-ups, and email providers."
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentTeal} />
        </View>
      ) : (
        <>
          {/* Tabs — horizontal scroll on mobile */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              {isActive && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {activeTab === 'General' && (
          <View style={styles.tabPanel}>
            <Text style={styles.premiumCardTitle}>Lead Routing & Duplicate Detection</Text>

            <View style={styles.premiumCard}>
              <View style={[styles.premiumField, { zIndex: 100 }]}>
                <Text style={styles.premiumLabelText}>DEFAULT LEAD DISTRIBUTION</Text>
                <Pressable
                  style={styles.premiumTrigger}
                  onPress={() => setLeadDistOpen(!leadDistOpen)}>
                  <Text style={styles.premiumTriggerText}>{leadDistribution}</Text>
                  <MaterialCommunityIcons
                    name={leadDistOpen ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={colors.textPrimary}
                  />
                </Pressable>

                {leadDistOpen && (
                  <View style={styles.premiumDropdownFloating}>
                    <ScrollView bounces={false} style={{ maxHeight: 200 }}>
                      {LEAD_DISTRIBUTION_OPTIONS.map((opt) => {
                        const isSelected = leadDistribution === opt;
                        return (
                          <Pressable
                            key={opt}
                            style={styles.premiumDropdownOption}
                            onPress={() => {
                              setLeadDistribution(opt);
                              setLeadDistOpen(false);
                            }}>
                            <View style={styles.optionInner}>
                              {isSelected && (
                                <MaterialCommunityIcons name="check" size={18} color={colors.accent} style={{ marginRight: 10 }} />
                              )}
                              <Text style={[styles.optionLabelText, isSelected && styles.optionLabelTextActive]}>
                                {opt}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.premiumToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumToggleTitle}>Auto-Merge Duplicates</Text>
                  <Text style={styles.premiumToggleSubtitle}>
                    Automatically merge leads with matching email or phone numbers to maintain database hygiene.
                  </Text>
                </View>
                <Switch
                  value={autoMergeDuplicates}
                  onValueChange={setAutoMergeDuplicates}
                  trackColor={{ false: colors.cardBorder, true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Email Delivery' && (
          <View style={styles.tabPanel}>
            <Text style={styles.cardTitle}>Transactional Email Provider</Text>
            <Text style={styles.cardDesc}>
              Connect your preferred provider for scalable delivery (Mailgun, SendGrid, etc.).
            </Text>
            <View style={styles.card}>
              {EMAIL_PROVIDERS.map((provider, idx) => {
                const conn = connectedProviders[provider.id];
                const isConnected = !!conn;

                return (
                  <View
                    key={provider.id}
                    style={[
                      styles.providerRow,
                      idx === EMAIL_PROVIDERS.length - 1 && styles.providerRowLast,
                      isConnected && styles.providerRowConnected
                    ]}
                  >
                    {isConnected ? (
                      <>
                        <View style={styles.providerInfoColumn}>
                          <View style={styles.providerNameBadgeRow}>
                            <Text style={styles.providerName}>{provider.name}</Text>
                            <View style={styles.connectedBadgeCapsule}>
                              <Text style={styles.connectedBadgeText}>CONNECTED</Text>
                            </View>
                          </View>
                          {provider.id === 'mailgun' ? (
                            <Text style={styles.providerDomainText}>Domain: {conn.domain}</Text>
                          ) : (
                            <Text style={styles.providerDomainText}>Sender: {conn.senderEmail}</Text>
                          )}
                        </View>
                        <View style={styles.providerActionsRow}>
                          <Pressable
                            style={styles.connectApiBtnConnected}
                            onPress={() => handleOpenConnect(provider)}
                          >
                            <Text style={styles.connectApiBtnTextConnected}>Manage API Key</Text>
                          </Pressable>
                          <Pressable
                            style={styles.disconnectProviderBtn}
                            onPress={() => handleDisconnectProvider(provider.id)}
                          >
                            <Text style={styles.disconnectProviderBtnText}>Disconnect</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <View style={styles.providerRowLayout}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Pressable
                          style={styles.connectApiBtn}
                          onPress={() => handleOpenConnect(provider)}
                        >
                          <Text style={styles.connectApiBtnText}>Connect API Key</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === 'Automation Rules' && (
          <View style={styles.tabPanel}>
            <View style={styles.columnView}>
              {/* Ghost Re-Engagement Protocol */}
              <View style={styles.sectionCardPremium}>
                <Text style={styles.premiumSectionTitle}>Ghost Re-Engagement Protocol</Text>
                <Text style={styles.premiumSectionSubtitle}>
                  Automatically re-engage leads who have shown no activity for a set period.
                </Text>

                <View style={[styles.premiumFieldRow, { zIndex: 100 }]}>
                  <View style={[styles.premiumField, { flex: 1 }]}>
                    <Text style={styles.premiumLabel}>Inactivity Threshold</Text>
                    <Pressable
                      style={styles.premiumSelect}
                      onPress={() => setInactivityOpen(!inactivityOpen)}>
                      <Text style={styles.premiumSelectText}>{inactivityDays}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                    </Pressable>
                    {inactivityOpen && (
                      <View style={styles.premiumDropdown}>
                        {INACTIVITY_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt}
                            style={styles.premiumDropdownItem}
                            onPress={() => {
                              setInactivityDays(opt);
                              setInactivityOpen(false);
                            }}>
                            <View style={styles.premiumDropdownCheck}>
                              {inactivityDays === opt && (
                                <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                              )}
                            </View>
                            <Text style={styles.premiumDropdownText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.premiumField, { flex: 1 }]}>
                    <Text style={styles.premiumLabel}>Safety Limit</Text>
                    <Pressable
                      style={styles.premiumSelect}
                      onPress={() => setSafetyLimitOpen(!safetyLimitOpen)}>
                      <Text style={styles.premiumSelectText}>{safetyLimit}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                    </Pressable>
                    {safetyLimitOpen && (
                      <View style={styles.premiumDropdown}>
                        {SAFETY_LIMIT_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt}
                            style={styles.premiumDropdownItem}
                            onPress={() => {
                              setSafetyLimit(opt);
                              setSafetyLimitOpen(false);
                            }}>
                            <View style={styles.premiumDropdownCheck}>
                              {safetyLimit === opt && (
                                <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                              )}
                            </View>
                            <Text style={styles.premiumDropdownText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.premiumFieldRow, { zIndex: 90 }]}>
                  <View style={[styles.premiumField, { flex: 1 }]}>
                    <Text style={styles.premiumLabel}>Target Segment</Text>
                    <Pressable
                      style={styles.premiumSelect}
                      onPress={() => setTargetSegmentOpen(!targetSegmentOpen)}>
                      <Text style={styles.premiumSelectText} numberOfLines={2}>{targetSegmentGhost}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                    </Pressable>
                    {targetSegmentOpen && (
                      <View style={styles.premiumDropdown}>
                        {TARGET_SEGMENT_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt}
                            style={styles.premiumDropdownItem}
                            onPress={() => {
                              setTargetSegmentGhost(opt);
                              setTargetSegmentOpen(false);
                            }}>
                            <View style={styles.premiumDropdownCheck}>
                              {targetSegmentGhost === opt && (
                                <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                              )}
                            </View>
                            <Text style={styles.premiumDropdownText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.premiumField, { flex: 1 }]}>
                    <Text style={styles.premiumLabel}>Protocol Identity</Text>
                    <Pressable
                      style={styles.premiumSelect}
                      onPress={() => setProtocolIdentityOpen(!protocolIdentityOpen)}>
                      <Text style={styles.premiumSelectText} numberOfLines={2}>{protocolIdentity}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                    </Pressable>
                    {protocolIdentityOpen && (
                      <View style={styles.premiumDropdownFloating}>
                        <ScrollView bounces={false} style={{ maxHeight: 200 }}>
                          {SENDER_IDENTITY_OPTIONS.map((opt) => {
                            const isSelected = protocolIdentity === opt;
                            return (
                              <Pressable
                                key={opt}
                                style={styles.premiumDropdownOption}
                                onPress={() => {
                                  setProtocolIdentity(opt);
                                  setProtocolIdentityOpen(false);
                                }}>
                                <View style={styles.optionInner}>
                                  {isSelected && (
                                    <MaterialCommunityIcons name="check" size={18} color={colors.accent} style={{ marginRight: 10 }} />
                                  )}
                                  <Text style={[styles.optionLabelText, isSelected && styles.optionLabelTextActive]}>
                                    {opt}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.fieldHint, { marginTop: -12, marginBottom: 20 }]}>Defines the "From" name and signature personality for automated outreach.</Text>

                <View style={styles.premiumField}>
                  <Text style={styles.premiumLabel}>Re-engagement Channel</Text>
                  <View style={styles.premiumSegmentedControl}>
                    <Pressable
                      style={[styles.premiumSegmentBtn, reEngagementChannel === 'EMAIL' && styles.premiumSegmentBtnActive]}
                      onPress={() => setReEngagementChannel('EMAIL')}
                    >
                      <MaterialCommunityIcons
                        name="email"
                        size={20}
                        color={reEngagementChannel === 'EMAIL' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text style={[styles.premiumSegmentBtnText, reEngagementChannel === 'EMAIL' && styles.premiumSegmentBtnTextActive]}>EMAIL</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.premiumSegmentBtn, reEngagementChannel === 'SMS' && styles.premiumSegmentBtnActive]}
                      onPress={() => setReEngagementChannel('SMS')}
                    >
                      <MaterialCommunityIcons
                        name="cellphone"
                        size={20}
                        color={reEngagementChannel === 'SMS' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text style={[styles.premiumSegmentBtnText, reEngagementChannel === 'SMS' && styles.premiumSegmentBtnTextActive]}>SMS</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.premiumSegmentBtn, reEngagementChannel === 'WHATSAPP' && styles.premiumSegmentBtnActive]}
                      onPress={() => setReEngagementChannel('WHATSAPP')}
                    >
                      <MaterialCommunityIcons
                        name="whatsapp"
                        size={20}
                        color={reEngagementChannel === 'WHATSAPP' ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text style={[styles.premiumSegmentBtnText, reEngagementChannel === 'WHATSAPP' && styles.premiumSegmentBtnTextActive]}>WHATSAPP</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.premiumField, { marginBottom: 12 }]}>
                  <Text style={styles.premiumLabel}>Recovery Messaging (Editable Script)</Text>
                  <View style={styles.draftingWrap}>
                    <View style={styles.draftingHeader}>
                      <Text style={styles.draftingBadge}>DRAFTING WORKSPACE</Text>
                    </View>
                    <TextInput
                      style={styles.premiumTextArea}
                      value={emailBodyPreview}
                      onChangeText={setEmailBodyPreview}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                    />
                    <View style={styles.draftingFooter}>
                      <View style={styles.tokenBadge}><Text style={styles.tokenText}>{"{{ first_name }}"}</Text></View>
                      <View style={styles.tokenBadge}><Text style={styles.tokenText}>{"{{ last_property }}"}</Text></View>
                    </View>
                  </View>
                  <Text style={styles.fieldHint}>Your script will automatically adapt to the lead's history and selected Re-engagement Channel.</Text>
                </View>

                <View style={styles.toggleRowPremium}>
                  <Text style={styles.premiumLabelLarge}>Enable Ghost Protocol</Text>
                  <Switch
                    value={ghostProtocolEnabled}
                    onValueChange={setGhostProtocolEnabled}
                    trackColor={{ false: colors.cardBorder, true: colors.accentTeal }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Anniversary Automation */}
              <View style={styles.sectionCardPremiumSmall}>
                <Text style={styles.premiumSectionTitle}>Anniversary Automation</Text>
                <Text style={styles.premiumSectionSubtitle}>
                  Build long-term loyalty with life-event triggers.
                </Text>

                <View style={styles.anniversaryList}>
                  {ANNIVERSARY_RULES.map((rule) => (
                    <View key={rule.id} style={styles.anniversaryItemPremium}>
                      <View style={styles.anniversaryIconBoxPremium}>
                        <MaterialCommunityIcons name={rule.icon} size={22} color={colors.textPrimary} />
                      </View>
                      <Text style={styles.anniversaryLabelPremiumText}>{rule.label}</Text>
                      <Switch
                        value={anniversaryToggles[rule.id] ?? false}
                        onValueChange={(v) => setAnniversaryToggle(rule.id, v)}
                        trackColor={{ false: colors.cardBorder, true: colors.accentTeal }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  ))}
                  {customRules.map((rule) => (
                    <View key={rule.id} style={styles.anniversaryItemPremium}>
                      <View style={styles.anniversaryIconBoxPremium}>
                        <MaterialCommunityIcons name={rule.icon} size={22} color={colors.textPrimary} />
                      </View>
                      <Text style={styles.anniversaryLabelPremiumText}>{rule.label}</Text>
                      <Switch
                        value={rule.enabled}
                        onValueChange={(v) =>
                          setCustomRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, enabled: v } : r))
                          )
                        }
                        trackColor={{ false: colors.cardBorder, true: colors.accentTeal }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  ))}
                </View>

                <Pressable
                  style={styles.addCustomBtn}
                  onPress={() => setIsMilestoneModalOpen(true)}>
                  <MaterialCommunityIcons name="plus" size={18} color="#64748B" />
                  <Text style={styles.addCustomBtnText}>ADD CUSTOM MILESTONE</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Zien Extension' && (
          <View style={styles.tabPanel}>
            <View style={styles.premiumCard}>
              <View style={styles.extensionHero}>
                <LinearGradient
                  colors={['rgba(11, 160, 178, 0.2)', 'rgba(11, 160, 178, 0.05)']}
                  style={styles.extensionIconLarge}
                >
                  <MaterialCommunityIcons name="google-chrome" size={40} color="#0a2341" />
                </LinearGradient>
                <View style={styles.extensionHeaderInfo}>
                  <Text style={styles.extensionTitlePremium}>ZIEN AI Chrome Extension</Text>
                  <View style={styles.phaseBadge}>
                    <Text style={styles.phaseBadgeText}>PHASE 3 COMPLETED</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.extensionDescriptionPremium}>
                Bridge the gap between public listing portals and your private CRM. Import leads and listings with a single click.
              </Text>

              <Pressable style={({ pressed }) => [styles.downloadBtnPremium, pressed && { opacity: 0.9 }]}>
                <LinearGradient
                  colors={['#0a2341', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.downloadGradiant}
                >
                  <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadBtnTextPremium}>Download Extension</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.howItWorksPremium}>
                <Text style={styles.howTitlePremium}>How it Works</Text>

                <View style={styles.stepRowPremium}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepTextPremium}>Search any listing on Zillow or Redfin.</Text>
                </View>

                <View style={styles.stepRowPremium}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepTextPremium}>Click "Add to Zien" in the Extension panel.</Text>
                </View>

                <View style={styles.stepRowPremium}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepTextPremium}>Zien dynamically reads the browser tab for effortless integration.</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Milestone Modal */}
      {isMilestoneModalOpen && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsMilestoneModalOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.modalTitleText}>New Milestone</Text>
                <Text style={styles.modalSubTitleText}>
                  Enter a name for this anniversary trigger. This will allow you to automate personalized outreach for this life event.
                </Text>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>MILESTONE NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., Child's Birthday"
                  placeholderTextColor="#94A3B8"
                  value={newMilestoneName}
                  onChangeText={setNewMilestoneName}
                  autoFocus
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setIsMilestoneModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalCreateBtn} onPress={handleAddMilestone}>
                  <Text style={styles.modalCreateBtnText}>Create</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Connect API Provider Modal */}
      {providerModalOpen && activeProvider && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setProviderModalOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitleText}>Connect {activeProvider.name}</Text>
                <Pressable onPress={() => setProviderModalOpen(false)}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.modalSectionCard}>
                {/* API Key */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.modalLabel}>API KEY / CREDENTIALS *</Text>
                  <View style={styles.modalInputWrap}>
                    <MaterialCommunityIcons name="key-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.modalInputText}
                      placeholder={activeProvider.id === 'mailgun' ? "Paste your Mailgun API key..." : "Paste your SendGrid API key..."}
                      placeholderTextColor={colors.inputPlaceholder}
                      value={modalApiKey}
                      onChangeText={setModalApiKey}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Verified Domain (Mailgun only) */}
                {activeProvider.id === 'mailgun' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.modalLabel}>VERIFIED DOMAIN (MAILGUN) *</Text>
                    <View style={styles.modalInputWrap}>
                      <MaterialCommunityIcons name="earth" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.modalInputText}
                        placeholder="e.g., mg.youragency.com"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={modalDomain}
                        onChangeText={setModalDomain}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                {/* Sender Email */}
                <View>
                  <Text style={styles.modalLabel}>SENDER EMAIL *</Text>
                  <View style={styles.modalInputWrap}>
                    <MaterialCommunityIcons name="email-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.modalInputText}
                      placeholder="e.g., John Doe <hello@yourdomain.com>"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={modalSenderEmail}
                      onChangeText={setModalSenderEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setProviderModalOpen(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalCreateBtn} onPress={handleSaveConnection}>
                  <Text style={styles.modalCreateBtnText}>Save Connection</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

          {/* Save Changes — sticky at bottom on mobile */}
          <View style={[styles.saveBar, { paddingBottom: 16 + insets.bottom }]}>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.92 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

function getStyles(colors: any, theme: string) {
  return StyleSheet.create({
    background: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.95)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(227, 236, 244, 0.8)',
    },
    headerCenter: { flex: 1, minWidth: 0 },
    title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.3 },
    subtitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginTop: 6, lineHeight: 20 },
    tabsScroll: { maxHeight: 55, marginBottom: 4 },
    tabsContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 4,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      marginRight: 8,
    },
    tabActive: { backgroundColor: colors.surfaceMuted },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.textPrimary, fontWeight: '800' },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 12,
      right: 12,
      height: 3,
      backgroundColor: colors.accentTeal,
      borderRadius: 2,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
    tabPanel: { marginBottom: 24 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    cardDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, lineHeight: 21 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    input: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    select: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    selectText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1 },
    dropdown: {
      marginTop: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 14 },
    dropdownItemText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    toggleLabelWrap: { flex: 1, marginRight: 12 },
    toggleDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    providerRowLast: { borderBottomWidth: 0 },
    providerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    connectApiBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    connectApiBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    sectionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionCardTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    sectionCardDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 21 },
    anniversaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
      gap: 12,
    },
    anniversaryRowFirst: { borderTopWidth: 0 },
    anniversaryLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    extensionBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 20,
    },
    extensionIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: 'rgba(11, 45, 62, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    extensionTextWrap: { flex: 1, minWidth: 0 },
    extensionPhase: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    extensionDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 14 },
    downloadBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
    },
    downloadBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    howItWorksTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    bulletList: { gap: 8 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bullet: { fontSize: 16, color: colors.accentTeal, fontWeight: '700' },
    bulletText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
    saveBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.cardBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
    },
    saveBtn: {
      backgroundColor: colors.accentTeal,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    saveBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    // Premium Layout Styles
    columnView: {
      gap: 20,
    },
    sectionCardPremium: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 3,
    },
    sectionCardPremiumSmall: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 3,
    },
    premiumSectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    premiumSectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 20,
    },
    premiumField: {
      marginBottom: 20,
    },
    premiumFieldRow: {
      flexDirection: 'column',
      gap: 12,
      marginBottom: 20,
    },
    premiumLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.8,
      marginBottom: 10,
      textTransform: 'uppercase',
      opacity: 0.8,
    },
    premiumLabelLarge: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    premiumSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
    },
    premiumSelectText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      lineHeight: 18,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    segmentBtnActive: {
      backgroundColor: colors.accentTeal,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    segmentBtnTextActive: {
      color: '#FFFFFF',
    },
    draftingWrap: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    draftingHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    draftingBadge: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.5,
      backgroundColor: 'rgba(11, 45, 62, 0.05)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    premiumTextArea: {
      padding: 16,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
      fontStyle: 'italic',
      lineHeight: 22,
      minHeight: 120,
    },
    draftingFooter: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    tokenBadge: {
      backgroundColor: theme === 'dark' ? 'rgba(0, 137, 123, 0.2)' : '#E0F2F1',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tokenText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme === 'dark' ? '#4DB6AC' : '#00897B',
    },
    fieldHint: {
      fontSize: 11,
      color: colors.inputPlaceholder,
      marginTop: 8,
      lineHeight: 16,
    },
    toggleRowPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    anniversaryList: {
      gap: 12,
      marginBottom: 20,
    },
    anniversaryItemPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    anniversaryIconBoxPremium: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anniversaryLabelPremiumText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    addCustomBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      borderRadius: 16,
      height: 52,
      gap: 8,
    },
    addCustomBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    // Modal Styles
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(11, 45, 62, 0.4)',
    },
    bottomSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 32,
      width: '100%',
    },
    bottomSheetHeader: {
      marginBottom: 24,
    },
    modalTitleText: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    modalSubTitleText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      fontWeight: '500',
    },
    modalField: {
      marginBottom: 32,
    },
    modalLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    modalInput: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    modalCreateBtn: {
      flex: 1,
      backgroundColor: colors.accentTeal,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCreateBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    premiumDropdown: {
      position: 'absolute',
      top: 76,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingVertical: 8,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    premiumDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
    },
    premiumDropdownCheck: {
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumDropdownText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    premiumCardTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    premiumCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 2,
    },
    premiumLabelText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    premiumTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    premiumTriggerText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    premiumDropdownFloating: {
      position: 'absolute',
      top: 90,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    premiumDropdownOption: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    optionInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionLabelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    optionLabelTextActive: {
      color: colors.textPrimary,
      fontWeight: '800',
    },
    premiumToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    premiumToggleTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    premiumToggleSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      lineHeight: 18,
      marginTop: 4,
    },
    premiumSegmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.inputBackground,
      borderRadius: 18,
      padding: 6,
      gap: 4,
    },
    premiumSegmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: 14,
      gap: 10,
    },
    premiumSegmentBtnActive: {
      backgroundColor: colors.accentTeal,
    },
    premiumSegmentBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    premiumSegmentBtnTextActive: {
      color: '#FFFFFF',
    },
    extensionHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    extensionIconLarge: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(11, 160, 178, 0.2)',
    },
    extensionHeaderInfo: {
      flex: 1,
    },
    extensionTitlePremium: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    phaseBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(11, 160, 178, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 6,
    },
    phaseBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#0a2341',
      letterSpacing: 0.5,
    },
    extensionDescriptionPremium: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
      fontWeight: '500',
    },
    downloadBtnPremium: {
      height: 56,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 32,
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    downloadGradiant: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    downloadBtnTextPremium: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    howItWorksPremium: {
      backgroundColor: 'rgba(148, 163, 184, 0.05)',
      borderRadius: 20,
      padding: 20,
    },
    howTitlePremium: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 20,
    },
    stepRowPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#0a2341',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    stepTextPremium: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
      lineHeight: 20,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    modalSectionCard: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      marginTop: 6,
    },
    modalInputWrapLast: {
      marginBottom: 0,
    },
    modalInputText: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
      padding: 0,
    },
    providerRowConnected: {
      flexDirection: 'column',
      alignItems: 'stretch',
      backgroundColor: colors.cardBackground,
      borderColor: 'rgba(11, 160, 178, 0.25)',
      gap: 12,
      paddingVertical: 16,
    },
    providerRowLayout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    providerInfoColumn: {
      flexDirection: 'column',
      gap: 4,
    },
    providerNameBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    connectedBadgeCapsule: {
      backgroundColor: 'rgba(11, 160, 178, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    connectedBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: 0.5,
    },
    providerDomainText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    providerActionsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    connectApiBtnConnected: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectApiBtnTextConnected: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    disconnectProviderBtn: {
      flex: 1,
      height: 40,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectProviderBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
}