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

const METRIC_CARDS = [
  { id: 'telemetry', icon: 'console' as const, label: 'Total telemetry', value: '4.2k' },
  { id: 'compliance', icon: 'sync' as const, label: 'Compliance rate', value: '100%' },
  { id: 'sessions', icon: 'chart-line' as const, label: 'Active sessions', value: '12' },
  { id: 'integrity', icon: 'lock-outline' as const, label: 'Audit integrity', value: 'Vaulted' },
];

const AUDIT_ROWS = [
  { id: '1', time: 'Today 3:42 PM', event: 'Operational Check-in', category: 'Session', agent: 'John Olakoya', severity: 'LOW' as const },
  { id: '2', time: 'Today 2:15 PM', event: 'Geo-fence Protocol Deviation', category: 'Alert', agent: 'Maria West', severity: 'WARNING' as const },
  { id: '3', time: 'Today 1:04 PM', event: 'ID Verification Terminal Pass', category: 'Compliance', agent: 'Evan Hale', severity: 'LOW' as const },
  { id: '4', time: 'Yesterday 6:55 PM', event: 'Silent SOS Gesture Pulse', category: 'Emergency', agent: 'Sarah Thompson', severity: 'CRITICAL' as const },
  { id: '5', time: 'Yesterday 10:20 AM', event: 'Device Heartland Sync', category: 'System', agent: 'David Chen', severity: 'LOW' as const },
  { id: '6', time: 'Feb 05 9:14 AM', event: 'Broker Escalation Resolved', category: 'Incident', agent: 'HQ Commander', severity: 'LOW' as const },
];

export function LogsReportsView() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState('Situational Anomalies');
  const [disclosureText, setDisclosureText] = useState('');

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable style={styles.exportBtn}>
            <MaterialCommunityIcons name="download-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.exportBtnText}>Archive</Text>
          </Pressable>
          <Pressable style={styles.fileReportBtn} onPress={() => setShowSafetyModal(true)}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#FFFFFF" />
            <Text style={styles.fileReportBtnText}>Safety Report</Text>
          </Pressable>
        </View>

        {/* Metric Grid */}
        <View style={styles.premiumMetricGrid}>
          {METRIC_CARDS.map((m) => (
            <View key={m.id} style={styles.premiumMetricCard}>
              <View style={styles.premiumMetricIconWrap}>
                <MaterialCommunityIcons name={m.icon} size={24} color="#0a2341" />
              </View>
              <View style={styles.premiumMetricInfo}>
                <Text style={styles.premiumMetricLabel} numberOfLines={1}>{m.label}</Text>
                <Text style={styles.premiumMetricValue}>{m.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Operation Audit Trail */}
        <View style={styles.premiumTrailContainer}>
          <Text style={styles.premiumTrailTitle}>Operation Audit Trail</Text>
          <View style={styles.premiumTrailToolbar}>
            <View style={styles.premiumSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#7B8794" />
              <TextInput
                style={styles.premiumSearchInput}
                placeholder="Search telemetry..."
                placeholderTextColor="#9AA7B6"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable style={styles.premiumToolbarAction}>
              <MaterialCommunityIcons name="calendar-range" size={18} color={colors.textPrimary} />
              <Text style={styles.premiumToolbarActionText}>Range</Text>
            </Pressable>
            <Pressable style={styles.premiumToolbarAction}>
              <MaterialCommunityIcons name="tune" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.auditList}>
            {AUDIT_ROWS.map((row, idx) => (
              <View key={row.id} style={[styles.premiumAuditItem, idx === 0 && { borderTopWidth: 0 }]}>
                <View style={styles.auditItemHeader}>
                  <View style={styles.auditTimeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#7B8794" />
                    <Text style={styles.auditTimeTextPremium}>{row.time}</Text>
                  </View>
                  <View style={[
                    styles.severityBadge,
                    row.severity === 'CRITICAL' && styles.severityCriticalBadge,
                    row.severity === 'WARNING' && styles.severityWarningBadge,
                  ]}>
                    <Text style={[
                      styles.severityBadgeText,
                      row.severity === 'CRITICAL' && styles.severityCriticalText,
                      row.severity === 'WARNING' && styles.severityWarningText,
                    ]}>
                      {row.severity}
                    </Text>
                  </View>
                </View>

                <Text style={styles.auditItemTitle}>{row.event}</Text>

                <View style={styles.auditItemFooter}>
                  <View style={styles.auditCategoryPill}>
                    <Text style={styles.auditCategoryText}>{row.category}</Text>
                  </View>
                  <View style={styles.auditAgentInfo}>
                    <MaterialCommunityIcons name="account-circle-outline" size={14} color="#5B6B7A" />
                    <Text style={styles.auditAgentName}>{row.agent}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Pressable style={styles.loadArchivedBtn}>
            <Text style={styles.loadArchivedBtnText}>Load Archived Logs</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showSafetyModal}
        animationType="slide"
        onRequestClose={() => setShowSafetyModal(false)}>
        <View style={[styles.modalFullContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeaderFull}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitleFull}>Safety Disclosure</Text>
              <Text style={styles.modalSubtitleFull}>File a manual incident or situational safety report.</Text>
            </View>
            <Pressable style={styles.modalCloseBtnFull} onPress={() => setShowSafetyModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.disclosureFormContainer}>
              <Text style={styles.formFieldLabel}>Incident Category</Text>
              <Pressable style={styles.disclosureDropdown}>
                <Text style={styles.disclosureDropdownText}>{incidentCategory}</Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#5B6B7A" />
              </Pressable>

              <Text style={styles.formFieldLabel}>Detailed Disclosure</Text>
              <TextInput
                style={styles.disclosureTextArea}
                placeholder="Provide high-fidelity details regarding the situational anomaly..."
                placeholderTextColor="#9AA7B6"
                value={disclosureText}
                onChangeText={setDisclosureText}
                multiline
              />

              <Text style={styles.formFieldLabel}>Evidence / Documentation (Optional)</Text>
              <Pressable style={styles.disclosureUploadZone}>
                <View style={styles.uploadIconCircle}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={32} color="#0a2341" />
                </View>
                <Text style={styles.uploadZoneTitle}>Upload Incident Documentation</Text>
                <Text style={styles.uploadZoneSub}>Max file size 25MB • PDF, JPG, PNG</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooterFixed}>
            <Pressable style={styles.submitVaultBtnPremium} onPress={() => setShowSafetyModal(false)}>
              <View style={styles.btnContentRow}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitVaultBtnTextPremium}>Submit to Zien Vault</Text>
              </View>
            </Pressable>
            <Pressable style={styles.cancelBtnPremiumFull} onPress={() => setShowSafetyModal(false)}>
              <Text style={styles.cancelBtnTextPremiumFull}>Cancel Submission</Text>
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
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0a2341',
    backgroundColor: colors.cardBackground,
  },
  exportBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  fileReportBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0B2D3E',
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fileReportBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },

  // Premium Metric & Trail Styles
  premiumMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  premiumMetricCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  premiumMetricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumMetricInfo: {
    flex: 1,
  },
  premiumMetricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  premiumMetricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  premiumTrailContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  premiumTrailTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  premiumTrailToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  premiumSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  premiumToolbarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumToolbarActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  auditList: {
    gap: 0,
  },
  premiumAuditItem: {
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
  },
  auditItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditTimeTextPremium: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  severityCriticalBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  severityWarningBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
  },
  severityCriticalText: {
    color: '#DC2626',
  },
  severityWarningText: {
    color: '#EA580C',
  },
  auditItemTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  auditItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  auditCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.cardBackground,
  },
  auditCategoryText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  auditAgentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditAgentName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  loadArchivedBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  loadArchivedBtnText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  bottomSpacer: { height: 32 },

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
  disclosureFormContainer: {
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
  disclosureDropdown: {
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
  disclosureDropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  disclosureTextArea: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  disclosureUploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadZoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  uploadZoneSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalFooterFixed: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  submitVaultBtnPremium: {
    backgroundColor: '#0B2D3E',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitVaultBtnTextPremium: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cancelBtnPremiumFull: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnTextPremiumFull: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
