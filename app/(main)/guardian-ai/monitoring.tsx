import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUDIT_ITEMS = [
  { id: '1', label: 'Encryption Layer', value: 'AES-256 GCM', status: 'Optimal', icon: 'lock-outline' as const },
  { id: '2', label: 'Triangulation Link', value: 'Active (8 Sat)', status: 'Excellent', icon: 'connection' as const },
  { id: '3', label: 'Biometric Stream', value: 'Synchronized', status: 'Secure', icon: 'fingerprint' as const },
  { id: '4', label: 'Cloud Handshake', value: '0.42ms Latency', status: 'High-Speed', icon: 'chart-line' as const },
];

const STATUS_CARDS = [
  { id: 'network', icon: 'access-point' as const, value: '98%', sub: 'Stable', label: 'Network Signal' },
  { id: 'gps', icon: 'crosshairs-gps' as const, value: 'High', sub: '8 Satellites', label: 'GPS Precision' },
  { id: 'battery', icon: 'cellphone' as const, value: '84%', sub: 'Normal', label: 'Device Battery' },
  { id: 'security', icon: 'shield-check-outline' as const, value: '94', sub: 'Optimal', label: 'Security Score' },
];

const TELEMETRY_LINES_BASE = [
  '[12:45:02] System initialized. Ready for deployment.',
  '[12:45:05] GPS link established with 8 satellites.',
  '[12:45:10] Biometric stream synchronized.',
];
const TELEMETRY_SESSION_LINE = '[17:49:10] NEW SESSION ESTABLISHED. GUARDIAN ENGAGED.';

const RESPONDERS = [
  { id: '1', name: 'Maria West', role: 'HQ Commander', initials: 'MW', online: true, onCall: false },
  { id: '2', name: 'Evan Hale', role: 'Security Agent', initials: 'EH', online: false, onCall: true },
];

const ACTIVE_ALERTS = [
  { id: '1', icon: 'bell-outline' as const, title: 'Silent check-in required', time: 'Now', color: '#EAB308' },
  { id: '2', icon: 'map-marker-alert-outline' as const, title: 'Geo-fence deviation', time: '8m ago', color: '#DC2626' },
  { id: '3', icon: 'heart-pulse' as const, title: 'System heartbeat normal', time: '14m ago', color: '#0a2341' },
];

export function MonitoringView() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [sessionDeployed, setSessionDeployed] = useState(false);
  const [assetId, setAssetId] = useState('John Olakoya (S-142)');
  const [deployZone, setDeployZone] = useState('742 Evergreen Terrace, NY');

  const handleAuthenticateDeploy = () => {
    setShowDeployModal(false);
    setSessionDeployed(true);
  };

  const telemetryLines = sessionDeployed ? [TELEMETRY_SESSION_LINE, ...TELEMETRY_LINES_BASE] : TELEMETRY_LINES_BASE;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable style={styles.systemAuditBtn} onPress={() => setShowAuditModal(true)}>
            <Text style={styles.systemAuditBtnText}>System Audit</Text>
          </Pressable>
          <Pressable style={styles.startSessionBtn} onPress={() => setShowDeployModal(true)}>
            <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.startSessionBtnText}>Start New Session</Text>
          </Pressable>
        </View>

        {/* Status cards 2x2 */}
        <View style={styles.statusGrid}>
          {STATUS_CARDS.map((s) => (
            <View key={s.id} style={styles.statusCard}>
              <MaterialCommunityIcons name={s.icon} size={22} color={colors.textPrimary} />
              <Text style={styles.statusCardValue}>{s.value}</Text>
              <Text style={styles.statusCardSub}>{s.sub}</Text>
              <Text style={styles.statusCardLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Live Surveillance Feed */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View>
              <Text style={styles.sectionTitle}>Live Surveillance Feed</Text>
              <Text style={styles.cardSubtitle}>Active GPS triangulation and asset tracking.</Text>
            </View>
            {sessionDeployed ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveBadgeDot} />
                <Text style={styles.liveBadgeText}>LIVE </Text>
              </View>
            ) : (
              <Text style={styles.standbyBadge}>STANDBY</Text>
            )}
          </View>
          {sessionDeployed ? (
            <View style={styles.feedLive}>
              <View style={styles.feedLiveIconWrap}>
                <MaterialCommunityIcons name="map-marker" size={48} color={colors.textPrimary} />
              </View>
              <Text style={styles.feedLiveAsset}>Asset: S-142 (John O.)</Text>
              <Text style={styles.feedLiveCoords}>40.7128° N, 74.0060° W</Text>
            </View>
          ) : (
            <View style={styles.feedPlaceholder}>
              <ActivityIndicator size="large" color="#9AA7B6" />
              <Text style={styles.feedPlaceholderText}>PENDING DEPLOYMENT</Text>
            </View>
          )}
        </View>

        {/* Live System Telemetry */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryHeaderText}>Live System Telemetry</Text>
            <View style={styles.telemetryDots}>
              <View style={[styles.dot, styles.dotRed]} />
              <View style={[styles.dot, styles.dotYellow]} />
              <View style={[styles.dot, styles.dotGreen]} />
            </View>
          </View>
          <View style={styles.telemetryBody}>
            {telemetryLines.map((line, i) => (
              <Text
                key={i}
                style={[
                  styles.telemetryLine,
                  sessionDeployed && i === 0 && styles.telemetryLineHighlight,
                ]}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Master Responders */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionTitle}>Master Responders</Text>
            <Pressable hitSlop={12}>
              <MaterialCommunityIcons name="dots-horizontal" size={22} color="#5B6B7A" />
            </Pressable>
          </View>
          {RESPONDERS.map((r, idx) => (
            <View key={r.id} style={[styles.responderRow, idx === 0 && styles.responderRowFirst]}>
              <View style={styles.responderAvatar}>
                <Text style={styles.responderInitials}>{r.initials}</Text>
              </View>
              <View style={styles.responderInfo}>
                <Text style={styles.responderName}>{r.name}</Text>
                <Text style={styles.responderRole}>{r.role}</Text>
              </View>
              <View style={styles.onlinePill}>
                <Text style={styles.onlinePillText}>{r.onCall ? 'On-call' : 'Online'}</Text>
              </View>
            </View>
          ))}
          <Pressable style={styles.deployAgentBtn}>
            <Text style={styles.deployAgentBtnText}>Deploy Extra Agent</Text>
          </Pressable>
        </View>

        {/* Active Alerts */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {ACTIVE_ALERTS.map((a, idx) => (
            <View key={a.id} style={[styles.alertRow, idx === 0 && styles.alertRowFirst]}>
              <View style={[styles.alertIconWrap, { borderColor: a.color }]}>
                <MaterialCommunityIcons name={a.icon} size={20} color={a.color} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertTime}>{a.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Force Intervene */}
        <View style={styles.forceCard}>
          <View style={styles.forceTitleRow}>
            <MaterialCommunityIcons name="alert" size={22} color="#DC2626" />
            <Text style={styles.forceTitle}>Force Intervene</Text>
          </View>
          <Text style={styles.forceDesc}>
            Bypass security protocols and force an emergency response sequence.
          </Text>
          <Pressable style={styles.forceBtn}>
            <Text style={styles.forceBtnText}>Force SES Signal</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Security Architecture Audit Modal */}
      <Modal
        visible={showAuditModal}
        animationType="slide"
        onRequestClose={() => setShowAuditModal(false)}>
        <View style={[styles.modalFullContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Security Architecture Audit</Text>
              <Text style={styles.modalSubtitleFull}>
                Technical verification of active safety protocols.
              </Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowAuditModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.auditListContainer}>
              {AUDIT_ITEMS.map((item) => (
                <View key={item.id} style={styles.auditItemRowFull}>
                  <View style={styles.auditIconWrapFull}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={colors.textPrimary} />
                  </View>
                  <View style={styles.auditItemCenter}>
                    <Text style={styles.auditItemLabelFull}>{item.label}</Text>
                    <Text style={styles.auditItemValueFull}>{item.value}</Text>
                  </View>
                  <View style={styles.auditStatusPillFull}>
                    <Text style={styles.auditStatusPillTextFull}>{item.status}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.auditIntegrityBlockPremium}>
                <View style={styles.auditIntegrityIconPremium}>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.auditIntegrityText}>
                  <Text style={styles.auditIntegrityTitlePremium}>Core Integrity Verified</Text>
                  <Text style={styles.auditIntegritySubPremium}>
                    All safety subsystems are operating within nominal enterprise parameters.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable style={styles.initAuditBtnPremium} onPress={() => setShowAuditModal(false)}>
              <Text style={styles.initAuditBtnTextPremium}>Close Technical Audit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeployModal}
        animationType="slide"
        onRequestClose={() => setShowDeployModal(false)}>
        <View style={[styles.modalFullContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Deployment Architecture</Text>
              <Text style={styles.modalSubtitleFull}>Initialize a new secure monitoring session.</Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowDeployModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.deployFormContainer}>
              <Text style={styles.deployFieldLabel}>Asset Identification</Text>
              <View style={styles.deployInputBoxFull}>
                <MaterialCommunityIcons name="account-outline" size={22} color="#7B8794" />
                <TextInput
                  style={styles.deployInputFull}
                  value={assetId}
                  onChangeText={setAssetId}
                  placeholder="Asset ID or Name"
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <Text style={styles.deployFieldLabel}>Deployment Zone</Text>
              <View style={styles.deployInputBoxFull}>
                <MaterialCommunityIcons name="map-marker-outline" size={22} color="#7B8794" />
                <TextInput
                  style={styles.deployInputFull}
                  value={deployZone}
                  onChangeText={setDeployZone}
                  placeholder="Secure Location Address"
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <Text style={styles.deployFieldLabel}>Session Duration</Text>
              <Pressable style={styles.deployDropdownFull}>
                <View style={styles.dropdownInfoRow}>
                  <MaterialCommunityIcons name="clock-outline" size={22} color="#7B8794" />
                  <Text style={styles.deployDropdownTextFull}>30 Minutes</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#5B6B7A" />
              </Pressable>

              <Text style={styles.deployFieldLabel}>Escalation Policy</Text>
              <Pressable style={styles.deployDropdownFull}>
                <View style={styles.dropdownInfoRow}>
                  <MaterialCommunityIcons name="shield-account-outline" size={22} color="#7B8794" />
                  <Text style={styles.deployDropdownTextFull}>Standard Ladder</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#5B6B7A" />
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable style={styles.initAuditBtnPremium} onPress={handleAuthenticateDeploy}>
              <Text style={styles.initAuditBtnTextPremium}>Authenticate & Deploy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  systemAuditBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  systemAuditBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  startSessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0B2D3E',
  },
  startSessionBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statusCard: {
    width: '47%',
    minWidth: 140,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  statusCardValue: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
  statusCardSub: { fontSize: 12, fontWeight: '700', color: '#0a2341' },
  statusCardLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
  cardSubtitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  standbyBadge: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  feedPlaceholder: {
    height: 160,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  feedPlaceholderText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
  feedLive: {
    height: 160,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  feedLiveIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLiveAsset: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  feedLiveCoords: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  telemetryCard: { marginBottom: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#0B2D3E' },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  telemetryHeaderText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  telemetryDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotRed: { backgroundColor: '#DC2626' },
  dotYellow: { backgroundColor: '#EAB308' },
  dotGreen: { backgroundColor: '#16A34A' },
  telemetryBody: {
    backgroundColor: '#0B2D3E',
    padding: 14,
    gap: 6,
  },
  telemetryLine: { fontSize: 11, fontFamily: 'monospace', color: '#E8EEF4', fontWeight: '600' },
  telemetryLineHighlight: { color: '#10B981', fontWeight: '800' },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  responderRowFirst: { borderTopWidth: 0 },
  responderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderInitials: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  responderInfo: { flex: 1 },
  responderName: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  responderRole: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  onlinePill: { backgroundColor: 'rgba(22, 163, 74, 0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  onlinePillText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  deployAgentBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  deployAgentBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  alertRowFirst: { borderTopWidth: 0 },
  alertIconWrap: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  alertTime: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  forceCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: '#DC2626',
    marginBottom: 16,
  },
  forceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  forceTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
  forceDesc: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  forceBtn: { backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  forceBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.4 },
  bottomSpacer: { height: 8 },
  // Security Architecture Audit Modal
  auditModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 45, 62, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  auditModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  auditModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  auditModalTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  auditModalSubtitle: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  auditModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    backgroundColor: colors.cardBackground,
  },
  auditItemCenter: { flex: 1 },
  auditItemLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.4 },
  auditItemValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, marginTop: 2 },
  auditStatusPill: {
    backgroundColor: 'rgba(22, 163, 74, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  auditStatusPillText: { fontSize: 12, fontWeight: '800', color: '#10B981' },
  auditIntegrityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0B2D3E',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  auditIntegrityIcon: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditIntegrityText: { flex: 1 },
  auditIntegrityTitle: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  auditIntegritySub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 18 },
  auditCloseBtn: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  auditCloseBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  // Deployment Architecture Modal
  deployModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  deployLabel: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, marginTop: 14 },
  deployInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deployInput: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  deployDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 0,
  },
  deployDropdownText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  authenticateDeployBtn: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  authenticateDeployBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },

  // Full-Page Modal Styles
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: 16,
  },
  modalTitleFull: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  modalSubtitleFull: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  modalCloseBtnFull: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 45, 62, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    flex: 1,
  },
  auditListContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  auditItemRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  auditIconWrapFull: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  auditItemLabelFull: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  auditItemValueFull: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  auditStatusPillFull: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  auditStatusPillTextFull: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  auditIntegrityBlockPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B2D3E',
    borderRadius: 22,
    padding: 24,
    marginTop: 20,
    marginBottom: 40,
    gap: 16,
  },
  auditIntegrityIconPremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditIntegrityTitlePremium: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  auditIntegritySubPremium: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 18,
  },
  modalFooterFixed: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  initAuditBtnPremium: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  initAuditBtnTextPremium: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Deployment Full-Page Styles
  deployFormContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  deployFieldLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 20,
    letterSpacing: 0.3,
  },
  deployInputBoxFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deployInputFull: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
  },
  deployDropdownFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deployDropdownTextFull: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
