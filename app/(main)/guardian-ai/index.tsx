import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardianTabId } from './_components/GuardianNav';
import { GuardianScreenShell } from './_components/GuardianScreenShell';
import { AdminView } from './admin';
import { LogsReportsView } from './logs-reports';
import { MonitoringView } from './monitoring';

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

const GUARDIAN_POLICIES = [
  { key: 'notifyBroker' as const, label: 'Notify Broker on Timer Expiry', icon: 'bell-outline' as const },
  { key: 'continuousGps' as const, label: 'Continuous GPS Tracking', icon: 'crosshairs-gps' as const },
  { key: 'silentEmergency' as const, label: 'Silent Emergency Signal', icon: 'alert-circle-outline' as const },
];

const TOP_TABS = [
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'guardian', label: 'Guardian' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'admin', label: 'Admin' },
] as const;

const CLIENTS = [
  {
    id: '1',
    name: 'Jessica Miller',
    status: 'Identity audit complete • 12m ago',
    confidence: 98,
    action: null as string | null,
  },
  {
    id: '2',
    name: 'David Chen',
    status: 'Identity audit complete • 1h ago',
    confidence: 92,
    action: null,
  },
  {
    id: '3',
    name: 'Sarah Thompson',
    status: 'Action required: ID verification',
    confidence: null,
    action: 'Verify',
  },
];

function formatGuardianTime(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const RISK_METRICS = [
  { label: 'Property Area', value: 12, dark: true },
  { label: 'Neighboring', value: 34, dark: false },
  { label: 'Regional Avg', value: 22, dark: false },
  { label: 'Incident Rate', value: 5, dark: true },
  { label: 'Response Time', value: 86, dark: true },
];

const INTERVENTION_HISTORY = [
  { id: '1', title: 'SMS escalation sent', icon: 'bell-outline' as const, time: 'Today 1:38 PM' },
  { id: '2', title: 'Auto-call initiated', icon: 'phone-outline' as const, time: 'Yesterday 6:04 PM' },
  { id: '3', title: 'Silent alert resolved', icon: 'alert-outline' as const, time: 'Mon 10:21 AM' },
  { id: '4', title: 'Guardian app activated', icon: 'shield-check-outline' as const, time: 'Jan 30 2:45 PM' },
];

const ADMIN_PROTOCOLS = [
  { id: '1', title: 'Escalation Ladder', desc: 'Primary → Broker → Emergency agency sequence.', icon: 'shield-check-outline' as const },
  { id: '2', title: 'Timer Grace Period', desc: 'Auto-call activation after 5m expiry.', icon: 'clock-outline' as const },
  { id: '3', title: 'Identity Requirements', desc: 'Mandatory ID upload for all prospects.', icon: 'card-account-details-outline' as const },
  { id: '4', title: 'Silent SOS Trigger', desc: 'Triple-tap volume for stealth alerts.', icon: 'cellphone' as const },
  { id: '5', title: 'Geo-fence Radius', desc: 'Strict 50m radius around showing area.', icon: 'map-marker-radius-outline' as const },
  { id: '6', title: 'Audit Reporting', desc: 'Generate daily safety summary for admin.', icon: 'file-document-outline' as const },
];

const INCIDENT_LOGS = [
  { id: '1', timestamp: 'Today 2:45 PM', level: 'Silent Alert', levelRed: true, agent: 'S. Thompson', protocol: 'T-Tap SOS', resolution: 'Resolved' },
  { id: '2', timestamp: 'Feb 05 6:12 PM', level: 'Timer Expiry', levelRed: false, agent: 'M. Chen', protocol: 'Auto-Call', resolution: 'Broker Action' },
  { id: '3', timestamp: 'Feb 01 10:20 AM', level: 'Risk Deviation', levelRed: false, agent: 'E. Rodriguez', protocol: 'Geo-fence', resolution: 'Passive' },
];

const INTELLIGENCE_TOOLS = [
  {
    id: 'geo',
    title: 'Property Geo-Fence',
    icon: 'map-marker-radius' as const,
    status: 'ACTIVE',
    statusStyle: 'active',
  },
  {
    id: 'route',
    title: 'Safe Route Tracking',
    icon: 'map-marker-path' as const,
    status: 'Enable',
    statusStyle: 'action',
  },
  {
    id: 'biometric',
    title: 'Biometric Pulse Scale',
    icon: 'heart-pulse' as const,
    status: 'Connect',
    statusStyle: 'action',
  },
];

interface VerificationLead {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  statusType: 'success' | 'warning';
  path: string[] | null;
}

const VERIFICATION_LEADS_INITIAL: VerificationLead[] = [
  {
    id: '1',
    name: 'Jessica Miller',
    subtitle: 'Manhattan • AI Scenario',
    status: 'CLEARED',
    statusType: 'success',
    path: ['Social Match', 'DRE Sync', 'Fraud Check'],
  },
  {
    id: '2',
    name: 'Robert Chen',
    subtitle: 'Brooklyn • Manual Route',
    status: 'IN REVIEW',
    statusType: 'warning',
    path: null,
  },
];

const CRM_LEADS_MOCK = [
  { id: '101', name: 'Alex Rivera', email: 'alex.r@studio.com', city: 'Miami' },
  { id: '102', name: 'Linda Foster', email: 'l.foster@realty.com', city: 'Coral Gables' },
  { id: '103', name: 'Marcus Wright', email: 'm.wright@invest.com', city: 'San Francisco' },
  { id: '104', name: 'Sofia Garcia', email: 's.garcia@tech.com', city: 'Seattle' },
  { id: '105', name: 'James Wilson', email: 'j.wilson@build.com', city: 'Austin' },
];

export default function GuardianAiOverviewScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors);

  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: GuardianTabId }>();
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState<GuardianTabId>(params.tab || 'overview');

  useEffect(() => {
    if (params.tab) {
      setCurrentTab(params.tab);
    }
  }, [params.tab]);

  const [activeTab, setActiveTab] = useState<(typeof TOP_TABS)[number]['id']>('guardian');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [clientIdentityRef, setClientIdentityRef] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [guardianPolicies, setGuardianPolicies] = useState({
    notifyBroker: true,
    continuousGps: true,
    silentEmergency: true,
  });
  const [guardianChatOpen, setGuardianChatOpen] = useState(false);
  const [secureMessage, setSecureMessage] = useState('');
  const [guardianTimerActive, setGuardianTimerActive] = useState(false);
  const [guardianSecondsLeft, setGuardianSecondsLeft] = useState(30 * 60);
  const [showSosModal, setShowSosModal] = useState(false);
  const [metricsView, setMetricsView] = useState<'realtime' | 'historic'>('realtime');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [verificationLeads, setVerificationLeads] = useState<VerificationLead[]>(VERIFICATION_LEADS_INITIAL);
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [selectedCrmIds, setSelectedCrmIds] = useState<string[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const guardianIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetGuardianTimer = () => {
    if (guardianIntervalRef.current) {
      clearInterval(guardianIntervalRef.current);
      guardianIntervalRef.current = null;
    }
    setGuardianTimerActive(false);
    setGuardianSecondsLeft(selectedMinutes * 60);
    setShowSosModal(false);
  };

  const startGuardianTimer = () => {
    setGuardianSecondsLeft(selectedMinutes * 60);
    setGuardianTimerActive(true);
  };

  useEffect(() => {
    if (!guardianTimerActive) return;
    guardianIntervalRef.current = setInterval(() => {
      setGuardianSecondsLeft((prev) => {
        if (prev <= 1) {
          if (guardianIntervalRef.current) {
            clearInterval(guardianIntervalRef.current);
            guardianIntervalRef.current = null;
          }
          setGuardianTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (guardianIntervalRef.current) {
        clearInterval(guardianIntervalRef.current);
        guardianIntervalRef.current = null;
      }
    };
  }, [guardianTimerActive]);

  useEffect(() => {
    if (!guardianTimerActive) setGuardianSecondsLeft(selectedMinutes * 60);
  }, [selectedMinutes, guardianTimerActive]);

  const toggleGuardianChat = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGuardianChatOpen((prev) => !prev);
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedCrmIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCrmIds.length === CRM_LEADS_MOCK.length) {
      setSelectedCrmIds([]);
    } else {
      setSelectedCrmIds(CRM_LEADS_MOCK.map(l => l.id));
    }
  };

  const handleImportAndVerify = () => {
    const newLeads = CRM_LEADS_MOCK.filter(l => selectedCrmIds.includes(l.id)).map(l => ({
      id: l.id,
      name: l.name,
      subtitle: `${l.city} • AI Scenario`,
      status: 'CLEARED',
      statusType: 'success' as const,
      path: ['Social Match', 'DRE Sync', 'Fraud Check'],
    }));

    setVerificationLeads(prev => [...prev, ...newLeads]);
    setShowCrmModal(false);
    setSelectedCrmIds([]);
    setCrmSearchQuery('');
  };

  const handleManualVerify = () => {
    if (!manualName || !manualEmail || !manualPhone) return;

    const newLead: VerificationLead = {
      id: Date.now().toString(),
      name: manualName,
      subtitle: manualAddress || 'Local Registry • Manual Route',
      status: 'IN REVIEW',
      statusType: 'warning',
      path: null,
    };

    setVerificationLeads(prev => [newLead, ...prev]);
    setShowManualForm(false);
    setManualName('');
    setManualEmail('');
    setManualPhone('');
    setManualAddress('');
  };

  const handleVerifyLead = (id: string) => {
    setVerificationLeads(prev => prev.map(lead => {
      if (lead.id === id) {
        return {
          ...lead,
          status: 'CLEARED',
          statusType: 'success',
          path: ['Social Match', 'DRE Sync', 'Fraud Check'],
        };
      }
      return lead;
    }));
  };

  const getShellConfig = () => {
    switch (currentTab) {
      case 'monitoring':
        return {
          title: 'Mission Control & Monitoring',
          subtitle: 'High-fidelity surveillance architecture for active field operations.',
        };
      case 'logs-reports':
        return {
          title: 'Audit Logs & Governance',
          subtitle: 'Centralized repository for operational telemetry and safety compliance records.',
        };
      case 'admin':
        return {
          title: 'System Governance & Admin',
          subtitle: 'Manage safety protocols, team escalations, and high-fidelity access control.',
        };
      default:
        return {
          title: 'AI Guardian Intelligence',
          subtitle: 'High-fidelity safety monitoring and automated emergency escalation.',
        };
    }
  };

  const shellConfig = getShellConfig();

  return (
    <GuardianScreenShell
      title={shellConfig.title}
      subtitle={shellConfig.subtitle}
      showBack={true}
      activeTab={currentTab}
      onTabChange={setCurrentTab}>

      {currentTab === 'overview' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Premium Sub-Navigation */}
          <View style={styles.topTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topTabsScroll}>
              {TOP_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.topTabPill, isActive && styles.topTabPillActive]}
                    onPress={() => setActiveTab(tab.id)}>
                    <Text style={[styles.topTabPillText, isActive && styles.topTabPillTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Pressable
            style={styles.premiumMissionBtn}
            onPress={() => setCurrentTab('monitoring')}>
            <View style={styles.premiumMissionIconWrap}>
              <MaterialCommunityIcons name="earth" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.premiumMissionTextWrap}>
              <Text style={styles.premiumMissionTitle}>Mission Control Center</Text>
              <Text style={styles.premiumMissionSub}>Initialize global monitoring sequence</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>

          {/* Tab content: sirf niche ka content change */}
          {activeTab === 'intelligence' && (
            <>
              <View style={styles.premiumCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.premiumCardTitle}>Client Verification</Text>
                  <Pressable style={styles.premiumNewAuditBtn} onPress={() => setShowAuditModal(true)}>
                    <Text style={styles.premiumNewAuditText}>New Audit</Text>
                  </Pressable>
                </View>
                {CLIENTS.map((client, index) => (
                  <View
                    key={client.id}
                    style={[styles.premiumClientRow, index === 0 && styles.premiumClientRowFirst]}>
                    <LinearGradient
                      colors={['#0B2D3E', '#1B4D66']}
                      style={styles.premiumAvatar}>
                      <Text style={styles.avatarText}>
                        {client.name.split(' ').map((n) => n[0]).join('')}
                      </Text>
                    </LinearGradient>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientStatus}>{client.status}</Text>
                      {client.confidence != null && (
                        <View style={styles.confidenceWrap}>
                          <View style={styles.confidenceBarBg}>
                            <View style={[styles.confidenceBarFill, { width: `${client.confidence}%` }]} />
                          </View>
                          <Text style={styles.confidenceText}>{client.confidence}% Confidence</Text>
                        </View>
                      )}
                    </View>
                    {client.action ? (
                      <Pressable style={styles.premiumVerifyBtn}>
                        <Text style={styles.premiumVerifyBtnText}>{client.action}</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={18} color="#16A34A" />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.premiumCard}>
                <Text style={styles.premiumCardTitle}>Operational Intelligence</Text>
                {INTELLIGENCE_TOOLS.map((tool, index) => (
                  <View
                    key={tool.id}
                    style={[styles.premiumToolRow, index === 0 && styles.premiumToolRowFirst]}>
                    <View style={styles.premiumToolIconWrap}>
                      <MaterialCommunityIcons name={tool.icon} size={22} color="#0a2341" />
                    </View>
                    <View style={styles.toolTextWrap}>
                      <Text style={styles.premiumToolTitle}>{tool.title}</Text>
                      <Text style={styles.premiumToolSub}>System subsystem {tool.statusStyle}</Text>
                    </View>
                    <Pressable
                      style={[styles.premiumToolBtn, tool.statusStyle === 'active' && styles.premiumToolBtnActive]}>
                      <Text
                        style={[
                          styles.premiumToolBtnText,
                          tool.statusStyle === 'active' && styles.premiumToolBtnTextActive,
                        ]}>
                        {tool.status}
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <View style={styles.intelHintBox}>
                  <MaterialCommunityIcons name="information-outline" size={16} color="#5B6B7A" />
                  <Text style={styles.intelHintText}>
                    Intelligence tools monitor your surroundings and biometric data to trigger
                    escalations when anomalies are detected.
                  </Text>
                </View>
              </View>
            </>
          )}

          {activeTab === 'guardian' && (
            <>
              <View style={styles.card}>
                <View style={styles.badgeRow}>
                  <MaterialCommunityIcons
                    name={guardianTimerActive ? 'clock-check-outline' : 'clock-outline'}
                    size={14}
                    color="#5B6B7A"
                  />
                  <Text style={styles.badgeText}>PRIMARY SAFETY ARCHITECTURE</Text>
                </View>
                <View style={styles.timerRing}>
                  <Text style={styles.timerValue}>
                    {formatGuardianTime(guardianSecondsLeft)}
                  </Text>
                  <Text style={styles.timerLabel}>
                    {guardianTimerActive ? 'COUNTDOWN ACTIVE' : 'READY FOR DEPLOYMENT'}
                  </Text>
                </View>
                <View style={styles.durationRow}>
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = selectedMinutes === opt.minutes;
                    const disabled = guardianTimerActive;
                    return (
                      <Pressable
                        key={opt.minutes}
                        style={[
                          styles.durationBtn,
                          isSelected && !disabled && styles.durationBtnActive,
                          disabled && styles.durationBtnDisabled,
                        ]}
                        onPress={() => !disabled && setSelectedMinutes(opt.minutes)}
                        disabled={disabled}>
                        <Text
                          style={[
                            styles.durationBtnText,
                            isSelected && !disabled && styles.durationBtnTextActive,
                            disabled && styles.durationBtnTextDisabled,
                          ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!guardianTimerActive ? (
                  <Pressable style={styles.activateBtn} onPress={startGuardianTimer}>
                    <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                    <Text style={styles.activateBtnText}>Activate Guardian</Text>
                  </Pressable>
                ) : (
                  <View style={styles.guardianActionRow}>
                    <Pressable style={styles.pauseProtectionBtn} onPress={resetGuardianTimer}>
                      <MaterialCommunityIcons name="pause" size={20} color={colors.textPrimary} />
                      <Text style={styles.pauseProtectionBtnText}>Pause Protection</Text>
                    </Pressable>
                    <Pressable
                      style={styles.emergencySosBtn}
                      onPress={() => setShowSosModal(true)}>
                      <MaterialCommunityIcons name="alert" size={20} color="#FFFFFF" />
                      <Text style={styles.emergencySosBtnText}>EMERGENCY SOS</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="battery-high" size={18} color={colors.textPrimary} />
                    <View>
                      <Text style={styles.statValue}>86%</Text>
                      <Text style={styles.statLabel}>DEVICE VITALITY</Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="wifi" size={18} color={colors.textPrimary} />
                    <View>
                      <Text style={styles.statValue}>Excellent</Text>
                      <Text style={styles.statLabel}>SIGNAL STRENGTH</Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textPrimary} />
                    <View>
                      <Text style={styles.statValue}>2m ago</Text>
                      <Text style={styles.statLabel}>LAST CHECK-IN</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Real-time Surveillance</Text>
                <View style={[styles.survRow, styles.survRowFirst]}>
                  <View style={styles.survIconWrap}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.textPrimary} />
                  </View>
                  <View style={styles.survText}>
                    <Text style={styles.survTitle}>Live Location Sync</Text>
                    <Text style={styles.survSub}>Streaming coordinates to broker.</Text>
                  </View>
                  <View style={styles.pillActive}>
                    <Text style={styles.pillActiveText}>ACTIVE</Text>
                  </View>
                </View>
                <View style={styles.survRow}>
                  <View style={styles.survIconWrap}>
                    <MaterialCommunityIcons name="message-text-outline" size={22} color={colors.textPrimary} />
                  </View>
                  <View style={styles.survText}>
                    <Text style={styles.survTitle}>Guardian Chat</Text>
                    <Text style={styles.survSub}>
                      {guardianChatOpen ? 'Secure channel is live.' : 'Secured p2p comms channel.'}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.pillSecure, guardianChatOpen && styles.pillSecureActive]}
                    onPress={toggleGuardianChat}>
                    <Text style={[styles.pillSecureText, guardianChatOpen && styles.pillSecureTextActive]}>
                      {guardianChatOpen ? 'Secure Close' : 'Secure Open'}
                    </Text>
                  </Pressable>
                </View>
                {guardianChatOpen && (
                  <View style={styles.secureMessageBlock}>
                    <Text style={styles.secureMessageDesc}>
                      <Text style={styles.secureMessageBold}>Guardian AI:</Text> Secure channel initialized. Stay connected during active showings.
                    </Text>
                    <View style={styles.secureMessageRow}>
                      <TextInput
                        style={styles.secureMessageInput}
                        placeholder="Send secure message..."
                        placeholderTextColor="#9AA7B6"
                        value={secureMessage}
                        onChangeText={setSecureMessage}
                      />
                      <Pressable style={styles.secureSendBtn}>
                        <Text style={styles.secureSendBtnText}>Send</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.sosCard}>
                <Text style={styles.sosLabel}>PRIMARY SOS CONTACT</Text>
                <Text style={styles.sosName}>Zien Brokerage - HQ</Text>
                <Pressable style={styles.emergencyCallBtn}>
                  <MaterialCommunityIcons name="phone" size={18} color={colors.textPrimary} />
                  <Text style={styles.emergencyCallBtnText}>Emergency Call</Text>
                </Pressable>
              </View>

              <View style={styles.premiumCard}>
                <View style={styles.hubHeaderRow}>
                  <View style={styles.hubTitleSection}>
                    <View style={styles.hubIconWrap}>
                      <MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.premiumCardTitle}>Lead Verification Hub</Text>
                      <View style={styles.engineStatusRow}>
                        <View style={styles.enginePulse} />
                        <Text style={styles.engineStatusText}>ENGINE STANDBY</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.hubActionContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.hubActionBtn,
                      pressed && styles.hubActionBtnPressed,
                    ]}
                    onPress={() => setShowCrmModal(true)}>
                    <View style={styles.hubActionIconWrap}>
                      <MaterialCommunityIcons name="database-import" size={20} color="#0a2341" />
                    </View>
                    <Text style={styles.hubActionLabel}>Import CRM</Text>
                  </Pressable>

                  <View style={styles.hubActionSeparator} />

                  <Pressable
                    style={({ pressed }) => [
                      styles.hubActionBtn,
                      pressed && styles.hubActionBtnPressed,
                    ]}
                    onPress={() => setShowManualForm(!showManualForm)}>
                    <View style={styles.hubActionIconWrap}>
                      <MaterialCommunityIcons name="account-plus-outline" size={20} color="#0a2341" />
                    </View>
                    <Text style={styles.hubActionLabel}>Manual Entry</Text>
                  </Pressable>
                </View>

                {showManualForm && (
                  <View style={styles.manualFormContainer}>
                    <View style={styles.manualFormHeader}>
                      <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.textPrimary} />
                      <Text style={styles.manualFormTitle}>QUICK MANUAL ADMISSION</Text>
                    </View>

                    <View style={styles.manualFieldRow}>
                      <Text style={styles.manualLabel}>Full Legal Name <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.manualInput}
                        placeholder="e.g. Jessica Miller"
                        placeholderTextColor="#9AA7B6"
                        value={manualName}
                        onChangeText={setManualName}
                      />
                    </View>

                    <View style={styles.manualFieldRow}>
                      <Text style={styles.manualLabel}>Email Address <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.manualInput}
                        placeholder="name@example.com"
                        placeholderTextColor="#9AA7B6"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={manualEmail}
                        onChangeText={setManualEmail}
                      />
                    </View>

                    <View style={styles.manualFieldRow}>
                      <Text style={styles.manualLabel}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.manualInput}
                        placeholder="+1 (555) 000-0000"
                        placeholderTextColor="#9AA7B6"
                        keyboardType="phone-pad"
                        value={manualPhone}
                        onChangeText={setManualPhone}
                      />
                    </View>

                    <View style={styles.manualFieldRow}>
                      <Text style={styles.manualLabel}>Address (Optional)</Text>
                      <TextInput
                        style={[styles.manualInput, styles.manualInputArea]}
                        placeholder="Street, City, Zip"
                        placeholderTextColor="#9AA7B6"
                        multiline
                        value={manualAddress}
                        onChangeText={setManualAddress}
                      />
                    </View>

                    <Pressable
                      style={[styles.manualVerifyBtn, (!manualName || !manualEmail || !manualPhone) && styles.btnDisabled]}
                      onPress={handleManualVerify}
                      disabled={!manualName || !manualEmail || !manualPhone}>
                      <MaterialCommunityIcons name="shield-check-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.manualVerifyBtnText}>Verify</Text>
                    </Pressable>
                  </View>
                )}

                {verificationLeads.map((lead: VerificationLead, index: number) => (
                  <View key={lead.id} style={styles.hubLeadCard}>
                    <View style={styles.hubLeadHeader}>
                      <View style={styles.hubAvatarWrap}>
                        <LinearGradient
                          colors={['#0a2341', '#20B2AA']}
                          style={styles.hubAvatarGradient}>
                          <Text style={styles.hubAvatarText}>{lead.name[0]}</Text>
                        </LinearGradient>
                      </View>
                      <View style={styles.hubLeadInfo}>
                        <Text style={styles.hubLeadName}>{lead.name}</Text>
                        <Text style={styles.hubLeadSub}>{lead.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.hubStatusBadge,
                          lead.statusType === 'success' ? styles.hubStatusSuccess : styles.hubStatusWarning,
                        ]}>
                        <Text
                          style={[
                            styles.hubStatusText,
                            lead.statusType === 'success' ? styles.hubStatusTextSuccess : styles.hubStatusTextWarning,
                          ]}>
                          {lead.status}
                        </Text>
                      </View>
                    </View>

                    {lead.status === 'IN REVIEW' && (
                      <View style={styles.hubInReviewRow}>
                        <Pressable style={styles.hubReviewActionBtn} onPress={() => handleVerifyLead(lead.id)}>
                          <MaterialCommunityIcons name="email-outline" size={16} color={colors.textPrimary} />
                          <Text style={styles.hubReviewActionText}>Verify Email</Text>
                        </Pressable>
                        <Pressable style={styles.hubReviewActionBtn} onPress={() => handleVerifyLead(lead.id)}>
                          <MaterialCommunityIcons name="phone-outline" size={16} color={colors.textPrimary} />
                          <Text style={styles.hubReviewActionText}>Verify Phone</Text>
                        </Pressable>
                      </View>
                    )}

                    {lead.path && (
                      <View style={styles.hubAiPathBox}>
                        <Text style={styles.hubAiPathLabel}>AI VERIFICATION PATH</Text>
                        <View style={styles.hubPathChipsRow}>
                          {lead.path.map((step: string) => (
                            <View key={step} style={styles.hubPathChip}>
                              <MaterialCommunityIcons
                                name="check-circle-outline"
                                size={14}
                                color="#0a2341"
                              />
                              <Text style={styles.hubPathChipText}>{step}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Automated Policies</Text>
                {GUARDIAN_POLICIES.map((p, index) => (
                  <View key={p.key} style={[styles.policyRow, index === 0 && styles.policyRowFirst]}>
                    <MaterialCommunityIcons name={p.icon} size={20} color="#5B6B7A" />
                    <Text style={styles.policyLabel}>{p.label}</Text>
                    <Switch
                      value={guardianPolicies[p.key]}
                      onValueChange={(v) => setGuardianPolicies((prev) => ({ ...prev, [p.key]: v }))}
                      trackColor={{ false: '#D7DEE7', true: '#0B2D3E' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === 'metrics' && (
            <>
              <View style={styles.card}>
                <View style={styles.metricsCardHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Safety Risk Architecture</Text>
                    <Text style={styles.metricsSubtitle}>
                      Projected and active risk metrics based on regional intelligence.
                    </Text>
                  </View>
                  <View style={styles.metricsToggleRow}>
                    <Pressable
                      style={[styles.metricsToggleBtn, metricsView === 'realtime' && styles.metricsToggleBtnActive]}
                      onPress={() => setMetricsView('realtime')}>
                      <Text style={[styles.metricsToggleText, metricsView === 'realtime' && styles.metricsToggleTextActive]}>
                        Real-time
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.metricsToggleBtn, metricsView === 'historic' && styles.metricsToggleBtnActive]}
                      onPress={() => setMetricsView('historic')}>
                      <Text style={[styles.metricsToggleText, metricsView === 'historic' && styles.metricsToggleTextActive]}>
                        Historic
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.barChartRow}>
                  {RISK_METRICS.map((m) => (
                    <View key={m.label} style={styles.barChartItem}>
                      <Text style={styles.barChartValue}>{m.value}%</Text>
                      <View style={styles.barChartBarWrap}>
                        <View
                          style={[
                            styles.barChartBar,
                            { height: Math.max(4, (m.value / 100) * 100) },
                            m.dark ? styles.barChartBarDark : styles.barChartBarLight,
                          ]}
                        />
                      </View>
                      <Text style={styles.barChartLabel} numberOfLines={2}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Intervention History</Text>
                {INTERVENTION_HISTORY.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.interventionRow, index === 0 && styles.interventionRowFirst]}>
                    <View style={styles.interventionIconWrap}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={colors.textPrimary} />
                    </View>
                    <Text style={styles.interventionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.interventionTimeRight}>{item.time}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {activeTab === 'admin' && (
            <>
              <View style={styles.card}>
                <View style={styles.adminSectionHeader}>
                  <Text style={styles.sectionTitle}>Security Architecture Protocols</Text>
                  <Pressable style={styles.saveMasterBtn}>
                    <Text style={styles.saveMasterBtnText}>Save Master Policies</Text>
                  </Pressable>
                </View>
                <View style={styles.protocolGrid}>
                  {ADMIN_PROTOCOLS.map((p) => (
                    <View key={p.id} style={styles.protocolCard}>
                      <MaterialCommunityIcons name={p.icon} size={24} color={colors.textPrimary} />
                      <Text style={styles.protocolCardTitle}>{p.title}</Text>
                      <Text style={styles.protocolCardDesc}>{p.desc}</Text>
                      <Pressable style={styles.configureArchBtn}>
                        <Text style={styles.configureArchBtnText}>Configure Architecture</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Master Incident Audit</Text>
                <View style={styles.incidentSearchWrap}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#7B8794" />
                  <TextInput
                    style={styles.incidentSearchInput}
                    placeholder="Search incident logs..."
                    placeholderTextColor="#9AA7B6"
                    value={incidentSearch}
                    onChangeText={setIncidentSearch}
                  />
                </View>
                <View style={styles.incidentList}>
                  {INCIDENT_LOGS.map((inc) => (
                    <View key={inc.id} style={styles.incidentCard}>
                      <View style={styles.incidentCardRow}>
                        <Text style={styles.incidentLabel}>TIMESTAMP</Text>
                        <Text style={styles.incidentValue}>{inc.timestamp}</Text>
                      </View>
                      <View style={styles.incidentCardRow}>
                        <Text style={styles.incidentLabel}>INCIDENT LEVEL</Text>
                        <Text style={[styles.incidentValue, inc.levelRed && styles.incidentLevelRed]}>{inc.level}</Text>
                      </View>
                      <View style={styles.incidentCardRow}>
                        <Text style={styles.incidentLabel}>AGENT ASSIGNED</Text>
                        <Text style={styles.incidentValue}>{inc.agent}</Text>
                      </View>
                      <View style={styles.incidentCardRow}>
                        <Text style={styles.incidentLabel}>PROTOCOL TRIGGERED</Text>
                        <Text style={styles.incidentValue}>{inc.protocol}</Text>
                      </View>
                      <View style={[styles.incidentCardRow, styles.incidentCardRowLast]}>
                        <Text style={styles.incidentLabel}>RESOLUTION</Text>
                        <View style={styles.resolutionPill}>
                          <Text style={styles.resolutionPillText}>{inc.resolution}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {currentTab === 'monitoring' && <MonitoringView />}
      {currentTab === 'logs-reports' && <LogsReportsView />}
      {currentTab === 'admin' && <AdminView />}

      {/* Intelligence Audit Modal: Refactored to Full Page */}
      <Modal
        visible={showAuditModal}
        animationType="slide"
        onRequestClose={() => setShowAuditModal(false)}>
        <View
          style={[
            styles.modalFullContainer,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
          ]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Intelligence Audit</Text>
              <Text style={styles.modalSubtitleFull}>Analyze client credentials for field safety.</Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowAuditModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalFormContent}>
              <Text style={styles.uploadSectionLabelFull}>Government ID Upload</Text>
              <Pressable style={styles.uploadZoneFull}>
                <LinearGradient
                  colors={['#F7FBFF', '#FFFFFF']}
                  style={styles.uploadZoneGradient}>
                  <View style={styles.uploadIconCircle}>
                    <MaterialCommunityIcons name="tray-arrow-down" size={32} color="#0a2341" />
                  </View>
                  <Text style={styles.uploadZoneTitleFull}>Upload ID Document</Text>
                  <Text style={styles.uploadZoneHintFull}>Support PDF, JPG, PNG (Max 10MB)</Text>
                </LinearGradient>
              </Pressable>

              <Text style={styles.uploadSectionLabelFull}>Client Identity Reference</Text>
              <TextInput
                style={styles.identityInputFull}
                placeholder="e.g. David Thompson"
                placeholderTextColor="#9AA7B6"
                value={clientIdentityRef}
                onChangeText={setClientIdentityRef}
              />

              <View style={styles.securityNoteBox}>
                <View style={styles.securityNoteHeader}>
                  <MaterialCommunityIcons name="shield-lock" size={18} color="#0a2341" />
                  <Text style={styles.securityNoteTitle}>Encrypted Processing</Text>
                </View>
                <Text style={styles.securityNoteText}>
                  All identity documents are processed through our Zien-Shield™ layer. Data is
                  obfuscated and never stored on local device memory.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable style={styles.initAuditBtnPremium} onPress={() => setShowAuditModal(false)}>
              <Text style={styles.initAuditBtnTextPremium}>Initialize Audit</Text>
            </Pressable>
            <Pressable style={styles.cancelBtnPremium} onPress={() => setShowAuditModal(false)}>
              <Text style={styles.cancelBtnTextPremium}>Return to Guardian</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Emergency SOS Modal */}
      <Modal
        visible={showSosModal}
        transparent
        animationType="fade"
        onRequestClose={resetGuardianTimer}>
        <Pressable style={styles.modalOverlay} onPress={resetGuardianTimer}>
          <Pressable style={styles.sosModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sosModalIconWrap}>
              <MaterialCommunityIcons name="alert" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.sosModalTitle}>Trigger Emergency SOS?</Text>
            <Text style={styles.sosModalBody}>
              This will immediately transmit your live location, audio stream, and biometric data to Zien HQ and local emergency services.
            </Text>
            <View style={styles.sosModalActions}>
              <Pressable style={styles.sosModalConfirmBtn} onPress={resetGuardianTimer}>
                <Text style={styles.sosModalConfirmBtnText}>YES, TRANSMIT SOS</Text>
              </Pressable>
              <Pressable style={styles.sosModalCancelBtn} onPress={resetGuardianTimer}>
                <Text style={styles.sosModalCancelBtnText}>CANCEL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CRM Import Modal */}
      <Modal
        visible={showCrmModal}
        animationType="slide"
        onRequestClose={() => setShowCrmModal(false)}>
        <View
          style={[
            styles.modalFullContainer,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
          ]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Import for Auto-Verification</Text>
              <Text style={styles.modalSubtitleFull}>
                Select clients to run through the AI Guardian engine.
              </Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowCrmModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.crmSearchContainer}>
            <View style={styles.crmSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9AA7B6" />
              <TextInput
                style={styles.crmSearchInput}
                placeholder="Search 1,000+ leads by name or email..."
                placeholderTextColor="#9AA7B6"
                value={crmSearchQuery}
                onChangeText={setCrmSearchQuery}
              />
            </View>
          </View>

          <View style={styles.crmSelectionHeader}>
            <Text style={styles.crmSelectionCount}>
              {selectedCrmIds.length} of {CRM_LEADS_MOCK.length} leads selected
            </Text>
            <Pressable onPress={handleSelectAll}>
              <Text style={styles.crmSelectAllText}>
                {selectedCrmIds.length === CRM_LEADS_MOCK.length ? 'DESELECT ALL' : 'SELECT ALL'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.crmLeadsList}>
              {CRM_LEADS_MOCK.filter(
                (l) =>
                  l.name.toLowerCase().includes(crmSearchQuery.toLowerCase()) ||
                  l.email.toLowerCase().includes(crmSearchQuery.toLowerCase())
              ).map((lead) => {
                const isSelected = selectedCrmIds.includes(lead.id);
                return (
                  <Pressable
                    key={lead.id}
                    style={[styles.crmLeadItem, isSelected && styles.crmLeadItemSelected]}
                    onPress={() => toggleLeadSelection(lead.id)}>
                    <View style={[styles.crmCheckbox, isSelected && styles.crmCheckboxChecked]}>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.crmLeadInfo}>
                      <Text style={styles.crmLeadName}>{lead.name}</Text>
                      <Text style={styles.crmLeadSub}>
                        {lead.email} • {lead.city}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable
              style={[
                styles.initAuditBtnPremium,
                selectedCrmIds.length === 0 && styles.btnDisabled,
              ]}
              onPress={handleImportAndVerify}
              disabled={selectedCrmIds.length === 0}>
              <View style={styles.btnContentRow}>
                <MaterialCommunityIcons
                  name="creation"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.initAuditBtnTextPremium}>
                  Import & Verify {selectedCrmIds.length}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.cancelBtnPremium}
              onPress={() => {
                setSelectedCrmIds([]);
                setCrmSearchQuery('');
              }}>
              <Text style={styles.cancelBtnTextPremium}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </GuardianScreenShell>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topTabsContainer: {
    backgroundColor: 'rgba(215, 233, 242, 0.4)',
    borderRadius: 20,
    padding: 6,
    marginBottom: 20,
  },
  topTabsScroll: {
    flexDirection: 'row',
    gap: 4,
  },
  topTabPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  topTabPillActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topTabPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  topTabPillTextActive: {
    color: colors.textPrimary,
  },
  premiumMissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B2D3E',
    padding: 16,
    borderRadius: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  premiumMissionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  premiumMissionTextWrap: {
    flex: 1,
  },
  premiumMissionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  premiumMissionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  premiumCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  premiumNewAuditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.2)',
  },
  premiumNewAuditText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0a2341',
  },
  premiumClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  premiumClientRowFirst: {
    paddingTop: 8,
  },
  premiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  confidenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  confidenceBarBg: {
    width: 60,
    height: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  premiumVerifyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#0a2341',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumVerifyBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  premiumToolRowFirst: {
    paddingTop: 8,
  },
  premiumToolIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toolTextWrap: {
    flex: 1,
  },
  premiumToolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  premiumToolSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumToolBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a2341',
  },
  premiumToolBtnActive: {
    backgroundColor: '#0a2341',
    borderColor: '#0a2341',
  },
  premiumToolBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0a2341',
  },
  premiumToolBtnTextActive: {
    color: '#FFFFFF',
  },
  intelHintBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 18,
    marginTop: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D0E6FF',
  },
  intelHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Legacy styles for compatibility with other tabs
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  clientStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Guardian tab
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.6 },
  timerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerValue: { fontSize: 32, fontWeight: '900', color: colors.textPrimary },
  timerLabel: { fontSize: 8, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginTop: 4 },
  durationRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
  durationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  durationBtnActive: { backgroundColor: '#0a2341', borderColor: '#0a2341' },
  durationBtnDisabled: { opacity: 0.6 },
  durationBtnText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
  durationBtnTextActive: { color: '#FFFFFF' },
  durationBtnTextDisabled: { color: colors.textSecondary },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  activateBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  guardianActionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pauseProtectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#0a2341',
    paddingVertical: 14,
    borderRadius: 14,
  },
  pauseProtectionBtnText: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
  emergencySosBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
  },
  emergencySosBtnText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValue: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
  statLabel: { fontSize: 7, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 14 },
  survRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  survRowFirst: { borderTopWidth: 0 },
  survIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  survText: { flex: 1 },
  survTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  survSub: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  pillActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillActiveText: { fontSize: 11, fontWeight: '900', color: '#16A34A', letterSpacing: 0.4 },
  pillSecure: { backgroundColor: colors.cardBackground, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillSecureActive: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: '#0a2341' },
  pillSecureText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  pillSecureTextActive: { color: colors.textPrimary },
  secureMessageBlock: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  secureMessageDesc: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  secureMessageBold: { fontWeight: '900', color: colors.textPrimary },
  secureMessageRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  secureMessageInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secureSendBtn: {
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secureSendBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  sosCard: {
    backgroundColor: '#0B2D3E',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sosLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  sosName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 16 },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emergencyCallBtnText: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  policyRowFirst: { borderTopWidth: 0 },
  policyLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  placeholderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  placeholderCardText: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginTop: 12 },
  placeholderCardSub: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
  // Metrics tab
  metricsCardHeader: { marginBottom: 16 },
  metricsSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  metricsToggleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metricsToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
  },
  metricsToggleBtnActive: { backgroundColor: '#0a2341' },
  metricsToggleText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  metricsToggleTextActive: { color: '#FFFFFF' },
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    minHeight: 140,
  },
  barChartItem: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  barChartValue: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  barChartBarWrap: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barChartBar: {
    width: '70%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barChartBarDark: { backgroundColor: '#0a2341' },
  barChartBarLight: { backgroundColor: '#5B6B7A' },
  barChartLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  interventionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  interventionRowFirst: { borderTopWidth: 0 },
  interventionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interventionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  interventionTimeRight: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  // Admin tab
  adminSectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  saveMasterBtn: {
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveMasterBtnText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  protocolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  protocolCard: {
    width: '47%',
    minWidth: 140,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  protocolCardTitle: { fontSize: 10, fontWeight: '900', color: colors.textPrimary },
  protocolCardDesc: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, lineHeight: 16 },
  configureArchBtn: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  configureArchBtnText: { fontSize: 8, fontWeight: '800', color: colors.textPrimary },
  incidentSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  incidentSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
  },
  incidentList: { gap: 12 },
  incidentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    gap: 8,
  },
  incidentCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  incidentCardRowLast: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  incidentLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.4 },
  incidentValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  incidentLevelRed: { color: '#DC2626' },
  resolutionPill: {
    backgroundColor: 'rgba(11, 45, 62, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resolutionPillText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  bottomSpacer: { height: 8 },

  // Intelligence Audit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 45, 62, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D7DEE7',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: colors.cardBackground,
  },
  uploadZoneTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 12,
  },
  uploadZoneHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  identityInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  initAuditBtn: {
    flex: 1,
    backgroundColor: '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  initAuditBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // Full Page Modal Styles
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalHeaderFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitleFull: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  modalSubtitleFull: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtnFull: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 45, 62, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  modalScrollBody: {
    flex: 1,
  },
  modalFormContent: {
    padding: 24,
  },
  uploadSectionLabelFull: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  uploadZoneFull: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D0E6FF',
    marginBottom: 24,
  },
  uploadZoneGradient: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  uploadZoneTitleFull: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 20,
  },
  uploadZoneHintFull: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
  },
  identityInputFull: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  securityNoteBox: {
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.1)',
  },
  securityNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  securityNoteTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0a2341',
  },
  securityNoteText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 19,
  },
  modalFooterFixed: {
    padding: 24,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 12,
  },
  initAuditBtnPremium: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  initAuditBtnTextPremium: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelBtnPremium: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnTextPremium: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  hubTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hubIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  enginePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9AA7B6',
    borderWidth: 1,
    borderColor: '#9AA7B6',
  },
  engineStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  hubActionContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'stretch',
  },
  hubActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 16,
  },
  hubActionBtnPressed: {
    backgroundColor: 'rgba(11, 160, 178, 0.08)',
  },
  hubActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a2341',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hubActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hubActionSeparator: {
    width: 1,
    backgroundColor: '#E3ECF4',
    marginVertical: 8,
  },
  hubLeadCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  hubLeadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubAvatarWrap: {
    marginRight: 12,
  },
  hubAvatarGradient: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hubLeadInfo: {
    flex: 1,
  },
  hubLeadName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  hubLeadSub: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  hubStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hubStatusSuccess: {
    backgroundColor: 'rgba(11, 160, 178, 0.08)',
  },
  hubStatusWarning: {
    backgroundColor: '#FFF4E5',
  },
  hubStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hubStatusTextSuccess: {
    color: '#0a2341',
  },
  hubStatusTextWarning: {
    color: '#FF8C00',
  },
  hubAiPathBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  hubAiPathLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  hubPathChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubPathChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hubPathChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // Emergency SOS Modal
  sosModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  sosModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sosModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  sosModalBody: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  sosModalActions: { width: '100%', gap: 12 },
  sosModalConfirmBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  sosModalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  sosModalCancelBtn: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sosModalCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },

  // CRM Import Styles
  crmSearchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  crmSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  crmSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  crmSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  crmSelectionCount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  crmSelectAllText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0a2341',
  },
  crmLeadsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  crmLeadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  crmLeadItemSelected: {
    borderColor: '#0a2341',
    backgroundColor: colors.cardBackground,
    shadowColor: '#0a2341',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  crmCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: colors.cardBackground,
  },
  crmCheckboxChecked: {
    borderColor: '#0a2341',
    backgroundColor: '#0a2341',
  },
  crmLeadInfo: {
    flex: 1,
  },
  crmLeadName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  crmLeadSub: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#94A3B8',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Manual Form Styles
  manualFormContainer: {
    marginVertical: 16,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.cardBackground,
  },
  manualFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  manualFormTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  manualFieldRow: {
    marginBottom: 16,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  requiredStar: {
    color: '#DC2626',
  },
  manualInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  manualInputArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  manualVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7B8794', // Match the gray in image
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  manualVerifyBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // In Review Row Styles
  hubInReviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  hubReviewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hubReviewActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
