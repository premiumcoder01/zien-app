import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STAT_CARDS = [
  {
    id: 'policies',
    icon: 'cog-outline' as const,
    label: 'Security Policies',
    value: '14 Active',
  },
  {
    id: 'personnel',
    icon: 'account-group-outline' as const,
    label: 'Verified Personnel',
    value: '86 Total',
  },
  {
    id: 'escalation',
    icon: 'bell-outline' as const,
    label: 'Escalation Nodes',
    value: '04 HQ',
  },
  {
    id: 'sync',
    icon: 'database-outline' as const,
    label: 'Database Sync',
    value: 'Optimal',
  },
];

const TEAM_ACCESS_ROLES = [
  {
    id: 'global',
    title: 'Global Administrator',
    desc: 'Full system architecture and policy control.',
    tag: 'Universal',
  },
  {
    id: 'hq',
    title: 'HQ Watch Commander',
    desc: 'Emergency escalation and live stream access.',
    tag: 'Surveillance',
  },
  {
    id: 'supervisor',
    title: 'Team Supervisor',
    desc: 'Report generation and agent oversight.',
    tag: 'Governance',
  },
  {
    id: 'field',
    title: 'Field Agent',
    desc: 'Individual session and safety tools.',
    tag: 'Operational',
  },
];

const GOVERNANCE_AUDIT_ITEMS = [
  { id: '1', label: 'Role Integrity Check', status: 'Passed', icon: 'account-group-outline' as const },
  { id: '2', label: 'Data Encryption Audit', status: 'Optimal', icon: 'lock-outline' as const },
  { id: '3', label: 'Audit Trail Consistency', status: 'Verified', icon: 'pulse' as const },
  { id: '4', label: 'API Endpoint Security', status: 'Secure', icon: 'key-outline' as const },
];

export function AdminView() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [clearanceLevel, setClearanceLevel] = useState('L1');

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable style={styles.auditBtn} onPress={() => setShowAuditModal(true)}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.textPrimary} />
            <Text style={styles.auditBtnText}>Run Security Audit</Text>
          </Pressable>
          <Pressable style={styles.provisionBtn} onPress={() => setShowProvisionModal(true)}>
            <MaterialCommunityIcons name="account-plus-outline" size={20} color="#FFFFFF" />
            <Text style={styles.provisionBtnText}>Provision Access</Text>
          </Pressable>
        </View>

        {/* Summary stat cards */}
        <View style={styles.statRow}>
          {STAT_CARDS.map((s) => (
            <View key={s.id} style={styles.statCard}>
              <View style={styles.statCardIconWrap}>
                <MaterialCommunityIcons name={s.icon} size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.statCardLabel}>{s.label}</Text>
              <Text style={styles.statCardValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Two-column: Team Access Matrix + API / Governance */}
        <View style={styles.twoCol}>
          <View style={styles.accessMatrixCard}>
            <Text style={styles.sectionTitle}>Team Access Matrix</Text>
            {TEAM_ACCESS_ROLES.map((r, idx) => (
              <View key={r.id} style={[styles.roleRow, idx === 0 && styles.roleRowFirst]}>
                <View style={styles.roleContent}>
                  <Text style={styles.roleTitle}>{r.title}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{r.tag}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.rightCol}>
            <View style={styles.apiCard}>
              <Text style={styles.sectionTitle}>API Architecture</Text>
              <Text style={styles.apiSubtitle}>
                Secure endpoints for third-party monitoring integration and hardware relay.
              </Text>
              <View style={styles.apiKeyRow}>
                <MaterialCommunityIcons name="key-variant" size={20} color={colors.textPrimary} />
                <Text style={styles.apiKeyLabel}>Guardian API Key</Text>
              </View>
              <View style={styles.apiKeyStatusRow}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
                <TextInput
                  style={styles.apiKeyInput}
                  value="zn_guardian_live_**********"
                  editable={false}
                />
              </View>
              <Pressable style={styles.rotateBtn}>
                <Text style={styles.rotateBtnText}>Rotate Architecture Key</Text>
              </Pressable>
            </View>

            <View style={styles.governanceCard}>
              <View style={styles.governanceHeader}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#FFFFFF" />
                <Text style={styles.governanceTitle}>Enforced Governance</Text>
              </View>
              <Text style={styles.governanceDesc}>
                Multi-factor authentication is mandatory for all HQ-level command overrides and policy changes.
              </Text>
              <Pressable style={styles.auditLogsBtn}>
                <Text style={styles.auditLogsBtnText}>Audit Access Logs</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Provision Node Access Full-Page Modal */}
      <Modal
        visible={showProvisionModal}
        animationType="slide"
        onRequestClose={() => setShowProvisionModal(false)}>
        <View style={[styles.modalFullContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Provision Node Access</Text>
              <Text style={styles.modalSubtitleFull}>Authorize new personnel with safety-level clearances.</Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowProvisionModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.provisionFormContainer}>
              <Text style={styles.formFieldLabel}>Target Personnel</Text>
              <View style={styles.provisionInputBox}>
                <MaterialCommunityIcons name="account-search-outline" size={22} color="#7B8794" />
                <TextInput
                  style={styles.provisionInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor="#9AA7B6"
                />
              </View>

              <Text style={styles.formFieldLabel}>Enterprise Role</Text>
              <Pressable style={styles.provisionDropdown}>
                <Text style={styles.provisionDropdownText}>HQ Watch Commander</Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#5B6B7A" />
              </Pressable>

              <Text style={styles.formFieldLabel}>Safety Clearance Level</Text>
              <View style={styles.clearanceToggleRow}>
                {['L1-Standard', 'L2-Verified', 'L3-Full'].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setClearanceLevel(level.split('-')[0])}
                    style={[
                      styles.clearanceBtn,
                      clearanceLevel === level.split('-')[0] && styles.clearanceBtnActive
                    ]}>
                    <Text style={[
                      styles.clearanceBtnText,
                      clearanceLevel === level.split('-')[0] && styles.clearanceBtnTextActive
                    ]}>
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.secureProvisionBlock}>
                <View style={styles.secureIconWrap}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.secureTextContent}>
                  <Text style={styles.secureProvisionTitle}>Secure Provisioning</Text>
                  <Text style={styles.secureProvisionSub}>
                    Credentials will be transmitted via encrypted Zien Vault link.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <View style={styles.footerBtnGroup}>
              <Pressable style={styles.authorizeBtn} onPress={() => setShowProvisionModal(false)}>
                <Text style={styles.authorizeBtnText}>Authorize Access</Text>
              </Pressable>
              <Pressable style={styles.cancelActionBtn} onPress={() => setShowProvisionModal(false)}>
                <Text style={styles.cancelActionBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Governance Audit Full-Page Modal */}
      <Modal
        visible={showAuditModal}
        animationType="slide"
        onRequestClose={() => setShowAuditModal(false)}>
        <View style={[styles.modalFullContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Full Governance Audit</Text>
              <Text style={styles.modalSubtitleFull}>Technical verification of roles, permissions, and system integrity.</Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowAuditModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.auditListContainerPremium}>
              {GOVERNANCE_AUDIT_ITEMS.map((item) => (
                <View key={item.id} style={styles.auditItemRowPremium}>
                  <View style={styles.auditIconCirclePremium}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={colors.textPrimary} />
                  </View>
                  <View style={styles.auditItemMain}>
                    <Text style={styles.auditItemLabelPremium}>{item.label}</Text>
                  </View>
                  <View style={styles.auditItemStatusBadge}>
                    <Text style={styles.auditItemStatusText}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable style={styles.closeAuditFullBtn} onPress={() => setShowAuditModal(false)}>
              <Text style={styles.closeAuditFullBtnText}>Close Audit Report</Text>
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  auditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  auditBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  provisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#0B2D3E',
  },
  provisionBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCardLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  statCardValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, marginTop: 4 },

  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  accessMatrixCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 12 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  roleRowFirst: { borderTopWidth: 0 },
  roleContent: { flex: 1 },
  roleTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  roleDesc: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
  roleTag: {
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 12,
  },
  roleTagText: { fontSize: 11, fontWeight: '800', color: '#0a2341' },

  rightCol: { flex: 1, minWidth: 280, gap: 16 },
  apiCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  apiSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  apiKeyLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  apiKeyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  activeBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: '#14B8A6' },
  apiKeyInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rotateBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
  },
  rotateBtnText: { fontSize: 12, fontWeight: '800', color: '#0a2341' },

  governanceCard: {
    backgroundColor: '#0B2D3E',
    borderRadius: 20,
    padding: 18,
  },
  governanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  governanceTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  governanceDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
    opacity: 0.95,
    marginBottom: 14,
  },
  auditLogsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  auditLogsBtnText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },

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
  provisionFormContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formFieldLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 20,
    letterSpacing: 0.3,
  },
  provisionInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  provisionInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  provisionDropdown: {
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
  provisionDropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clearanceToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clearanceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  clearanceBtnActive: {
    backgroundColor: colors.cardBackground,
    borderColor: '#0B2D3E',
    borderWidth: 2,
  },
  clearanceBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  clearanceBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  secureProvisionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B2D3E',
    borderRadius: 22,
    padding: 24,
    marginTop: 32,
    gap: 16,
  },
  secureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureTextContent: {
    flex: 1,
  },
  secureProvisionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secureProvisionSub: {
    fontSize: 12,
    fontWeight: '600',
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
  footerBtnGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  authorizeBtn: {
    flex: 2,
    backgroundColor: '#0B2D3E',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorizeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  // Governance Audit Specific
  auditListContainerPremium: {
    paddingHorizontal: 24,
    gap: 12,
  },
  auditItemRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  auditIconCirclePremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  auditItemMain: {
    flex: 1,
  },
  auditItemLabelPremium: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  auditItemStatusBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  auditItemStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  closeAuditFullBtn: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeAuditFullBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
