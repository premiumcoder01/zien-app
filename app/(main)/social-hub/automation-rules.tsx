import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const INITIAL_RULES = [
  {
    id: '1',
    title: 'New Listing Promo',
    ifLabel: 'Property Status Change',
    thenLabel: 'Post on All Platforms',
    status: 'ACTIVE' as const,
    icon: 'star-four-points-outline' as const,
  },
  {
    id: '2',
    title: 'Open House Reminder',
    ifLabel: '24h Before Event',
    thenLabel: 'Instagram Story + FB Post',
    status: 'ACTIVE' as const,
    icon: 'clock-outline' as const,
  },
  {
    id: '3',
    title: 'Weekly Market Update',
    ifLabel: 'Every Monday @ 9AM',
    thenLabel: 'LinkedIn Article',
    status: 'PAUSED' as const,
    icon: 'calendar-blank-outline' as const,
  },
  {
    id: '4',
    title: 'Price Drop Alert',
    ifLabel: 'Price Change > 5%',
    thenLabel: 'Facebook & Instagram Post',
    status: 'ACTIVE' as const,
    icon: 'lightning-bolt-outline' as const,
  },
];

const TRIGGER_OPTIONS = [
  'Property Status Change',
  'New Open House Created',
  'Price Adjustment Detected',
  'Scheduled Task Completion',
  'New Follower Detected',
];

const ACTION_OPTIONS = [
  'Post to All Connected Platforms',
  'Notify Team via Dashboard',
  'Draft AI Campaign',
  'Send Weekly Digest',
];

const SCOPE_OPTIONS = [
  'All Properties',
  'Premium Only',
  'New Listings Only',
  'Global Market',
  'Active Listings',
];

const SUGGESTED_FLOWS = [
  { id: 'a', label: 'Replenish Content Queue when Empty', highlighted: true, trigger: 'Queue Empty', action: 'Draft AI Campaign' },
  { id: 'b', label: 'Cross-post TikToks to IG Reels', highlighted: false, trigger: 'New TikTok Post', action: 'Repost to Reels' },
  { id: 'c', label: 'Auto-DM New Followers', highlighted: false, trigger: 'New Follower', action: 'Send Welcome DM' },
];

type Rule = {
  id: string;
  title: string;
  ifLabel: string;
  thenLabel: string;
  status: 'ACTIVE' | 'PAUSED';
  icon: any;
};

export default function AutomationRulesScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [scheduleDate, setScheduleDate] = useState('dd/mm/yyyy');
  const [triggerTime, setTriggerTime] = useState('09:00 AM');
  const [targetScope, setTargetScope] = useState('All Properties');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Instagram', 'Facebook', 'Linkedin', 'TikTok']);
  const [activeDropdown, setActiveDropdown] = useState<'trigger' | 'action' | 'scope' | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Handlers
  const toggleRuleStatus = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRules(currentRules =>
      currentRules.map(rule =>
        rule.id === id
          ? { ...rule, status: rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : rule
      )
    );
  };

  const deleteRule = (id: string) => {
    Alert.alert(
      "Delete Rule",
      "Are you sure you want to delete this automation rule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setRules(currentRules => currentRules.filter(r => r.id !== id));
          }
        }
      ]
    );
  };

  const handleCreateRule = () => {
    // Basic validation
    if (!newRuleName) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (editingRuleId) {
      setRules(currentRules =>
        currentRules.map(rule =>
          rule.id === editingRuleId
            ? {
              ...rule,
              title: newRuleName,
              ifLabel: selectedTrigger || 'Custom Trigger',
              thenLabel: selectedAction || 'Custom Action',
            }
            : rule
        )
      );
    } else {
      const newRule: Rule = {
        id: Date.now().toString(),
        title: newRuleName,
        ifLabel: selectedTrigger || 'Custom Trigger',
        thenLabel: selectedAction || 'Custom Action',
        status: 'ACTIVE',
        icon: 'robot-outline',
      };
      setRules([newRule, ...rules]);
    }

    closeModal();
  };

  const openSuggestionModal = (flow: (typeof SUGGESTED_FLOWS)[0]) => {
    setNewRuleName(flow.label || '');
    setSelectedTrigger(flow.trigger || '');
    setSelectedAction(flow.action || '');
    setScheduleDate('dd/mm/yyyy');
    setTriggerTime('09:00 AM');
    setTargetScope('All Properties');
    setSelectedPlatforms(['Instagram', 'Facebook', 'Linkedin', 'TikTok']);
    setShowCreateModal(true);
  };

  const openEditModal = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setNewRuleName(rule.title);
    setSelectedTrigger(rule.ifLabel);
    setSelectedAction(rule.thenLabel);
    setScheduleDate('dd/mm/yyyy');
    setTriggerTime('09:00 AM');
    setTargetScope('All Properties');
    setSelectedPlatforms(['Instagram', 'Facebook', 'Linkedin', 'TikTok']);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setActiveDropdown(null);
    setEditingRuleId(null);
    setNewRuleName('');
    setSelectedTrigger('');
    setSelectedAction('');
    setScheduleDate('dd/mm/yyyy');
    setTriggerTime('09:00 AM');
    setTargetScope('All Properties');
    setSelectedPlatforms([]);
  };

  const DropdownMenu = ({ visible, options, selected, onSelect, onClose }: any) => {
    if (!visible) return null;
    return (
      <RNModal transparent visible={visible} animationType="fade">
        <Pressable style={styles.dropdownOverlay} onPress={onClose}>
          <View style={styles.dropdownMenuContent}>
            {options.map((opt: string) => (
              <Pressable
                key={opt}
                style={styles.dropdownMenuItem}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}>
                <View style={styles.dropdownMenuItemInner}>
                  {selected === opt && (
                    <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.dropdownMenuItemText}>{opt}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </RNModal>
    );
  };

  const filteredRules = rules.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>

      <PageHeader
        title="Automation Rules"
        subtitle="Set up 'if this, then that' workflows for your social media."
        onBack={() => router.back()}

      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search automation rules..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Rule list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Automations</Text>
          <Text style={styles.sectionCount}>{filteredRules.length} Rules</Text>
        </View>

        <View style={styles.ruleList}>
          {filteredRules.map((rule) => (
            <View
              key={rule.id}
              style={[
                styles.ruleCard,
                rule.status === 'PAUSED' && styles.ruleCardPaused
              ]}
            >
              <View style={styles.ruleRowMain}>
                <View style={[styles.ruleIconBox, { backgroundColor: rule.status === 'PAUSED' ? '#F1F5F9' : '#0a234110' }]}>
                  <MaterialCommunityIcons
                    name={rule.icon}
                    size={22}
                    color={rule.status === 'PAUSED' ? '#94A3B8' : '#0a2341'}
                  />
                </View>
                <View style={styles.ruleContent}>
                  <Text style={[styles.ruleLabelTitle, rule.status === 'PAUSED' && styles.textPaused]}>
                    {rule.title}
                  </Text>
                  <View style={styles.logicFlow}>
                    <Text style={styles.logicText} numberOfLines={1}>
                      <Text style={styles.logicBold}>IF</Text> {rule.ifLabel} → <Text style={styles.logicBold}>THEN</Text> {rule.thenLabel}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={rule.status === 'ACTIVE'}
                  onValueChange={() => toggleRuleStatus(rule.id)}
                  trackColor={{ false: '#E2E8F0', true: '#0a2341' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : rule.status === 'ACTIVE' ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor="#E2E8F0"
                />
              </View>

              <View style={styles.ruleFooter}>
                <View style={styles.footerInfo}>
                  <MaterialCommunityIcons name="history" size={14} color={colors.textMuted} />
                  <Text style={styles.footerText}>Last run 2h ago</Text>
                </View>
                <View style={styles.footerActions}>
                  <Pressable style={styles.footerBtn} onPress={() => openEditModal(rule)}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.footerBtn} onPress={() => deleteRule(rule.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#F87171" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Automation Impact Widget */}
        <LinearGradient
          colors={['#0B2341', '#1E293B']}
          style={styles.impactWidget}>
          <View style={styles.widgetHeader}>
            <View style={styles.widgetIconBox}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#0a2341" />
            </View>
            <View>
              <Text style={styles.widgetTitle}>System Impact</Text>
              <Text style={styles.widgetSubtitle}>Efficiency gains this month</Text>
            </View>
          </View>
          <View style={styles.widgetStats}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>42</Text>
                <Text style={styles.statLabel}>Task Handled</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>12h</Text>
                <Text style={styles.statLabel}>Time Reclaimed</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart Recommendations</Text>
        </View>

        <View style={styles.suggestionsContainer}>
          {SUGGESTED_FLOWS.map((flow) => (
            <Pressable
              key={flow.id}
              onPress={() => openSuggestionModal(flow)}
              style={({ pressed }) => [styles.suggestedCard, pressed && { opacity: 0.7 }]}>
              <View style={styles.suggestedIconWrap}>
                <MaterialCommunityIcons name="auto-fix" size={20} color="#0a2341" />
              </View>
              <Text style={styles.suggestedText}>{flow.label}</Text>
              <MaterialCommunityIcons name="plus" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Floating Create Rule Button */}
      <View style={[styles.floatingAction, { bottom: insets.bottom + 20 }]}>
        <Pressable
          style={styles.createRuleFab}
          onPress={() => {
            setNewRuleName('');
            setSelectedTrigger('Property Status Change');
            setSelectedAction('Post to All Connected Platforms');
            setScheduleDate('dd/mm/yyyy');
            setTriggerTime('09:00 AM');
            setTargetScope('All Properties');
            setSelectedPlatforms(['Instagram']);
            setShowCreateModal(true);
          }}>
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
          <Text style={styles.fabText}>New Automation</Text>
        </Pressable>
      </View>

      {/* Create / Suggestion Modal */}
      <RNModal visible={showCreateModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top, height: '100%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editingRuleId ? 'Edit Automation Rule' : 'Create Automation Rule'}</Text>
              <Pressable onPress={closeModal} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Rule Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Rule Name</Text>
                <TextInput
                  style={styles.input}
                  value={newRuleName}
                  onChangeText={setNewRuleName}
                  placeholder="TikTok Sync"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Trigger & Action */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Trigger (IF)</Text>
                  <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('trigger')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>{selectedTrigger || 'Select Trigger'}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Action (THEN)</Text>
                  <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('action')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>{selectedAction || 'Select Action'}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              {/* Schedule Date & Trigger Time */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Schedule Date</Text>
                  <Pressable
                    style={styles.dropdownStub}
                    onPress={() => Alert.alert('Select Date', 'Date picker would open here.')}>
                    <Text style={styles.dropdownValue}>{scheduleDate}</Text>
                    <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>Trigger Time</Text>
                  <Pressable
                    style={styles.dropdownStub}
                    onPress={() => Alert.alert('Select Time', 'Time picker would open here.')}>
                    <Text style={styles.dropdownValue}>{triggerTime}</Text>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              {/* Target Scope */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Target Scope</Text>
                <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('scope')}>
                  <Text style={styles.dropdownText}>{targetScope}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Target Platforms */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Target Platforms</Text>
                <View style={styles.platformGrid}>
                  {[
                    { id: 'Instagram', icon: 'instagram', color: '#E1306C' },
                    { id: 'Facebook', icon: 'facebook', color: '#1877F2' },
                    { id: 'Linkedin', icon: 'linkedin', color: '#0A66C2' },
                    { id: 'TikTok', icon: 'music-note', color: '#000000' }
                  ].map((p) => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedPlatforms(selectedPlatforms.filter(id => id !== p.id));
                          } else {
                            setSelectedPlatforms([...selectedPlatforms, p.id]);
                          }
                        }}
                        style={[styles.platformToggle, isSelected && styles.platformToggleActive]}
                      >
                        <View style={[styles.customCheckbox, isSelected && styles.customCheckboxActive]}>
                          {isSelected && <MaterialCommunityIcons name="check" size={12} color="#FFF" />}
                        </View>
                        <MaterialCommunityIcons name={p.icon as any} size={18} color={p.color} style={{ marginHorizontal: 4 }} />
                        <Text style={styles.platformLabel}>{p.id}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleCreateRule}>
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.modalSaveText}>{editingRuleId ? 'Update Rule' : 'Activate Rule'}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Dropdown Menus */}
        <DropdownMenu
          visible={activeDropdown === 'trigger'}
          options={TRIGGER_OPTIONS}
          selected={selectedTrigger}
          onSelect={setSelectedTrigger}
          onClose={() => setActiveDropdown(null)}
        />
        <DropdownMenu
          visible={activeDropdown === 'action'}
          options={ACTION_OPTIONS}
          selected={selectedAction}
          onSelect={setSelectedAction}
          onClose={() => setActiveDropdown(null)}
        />
        <DropdownMenu
          visible={activeDropdown === 'scope'}
          options={SCOPE_OPTIONS}
          selected={targetScope}
          onSelect={setTargetScope}
          onClose={() => setActiveDropdown(null)}
        />
      </RNModal>

    </LinearGradient >
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      marginBottom: 24,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
        android: { elevation: 2 },
      }),
    },
    searchIconBox: { marginRight: 12 },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
    },
    ruleList: { gap: 16, marginBottom: 24 },
    ruleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.03, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    ruleCardPaused: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.cardBorder,
    },
    ruleRowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    ruleIconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ruleContent: { flex: 1 },
    ruleLabelTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    textPaused: { color: colors.textMuted },
    logicFlow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logicText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    logicBold: {
      color: '#0a2341',
      fontWeight: '900',
    },
    ruleFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    footerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    footerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    footerBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    impactWidget: {
      borderRadius: 24,
      padding: 24,
      marginBottom: 32,
      ...Platform.select({
        ios: { shadowColor: '#0B2341', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15 },
        android: { elevation: 6 },
      }),
    },
    widgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    widgetIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(11, 160, 178, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    widgetTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    widgetSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.6)',
    },
    widgetStats: {},
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    statItem: {
      alignItems: 'center',
    },
    statVal: {
      fontSize: 28,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0a2341',
      marginTop: 4,
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.surfaceIcon,
    },
    suggestionsContainer: { gap: 12 },
    suggestedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    suggestedIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#0a234110',
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestedText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    floatingAction: {
      position: 'absolute',
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    createRuleFab: {
      backgroundColor: colors.accentTeal,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderRadius: 30,
      shadowColor: '#0B2341',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 15,
      elevation: 8,
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'flex-start',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      height: '100%',
      width: '100%',
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: -10 },
      shadowRadius: 20,
      elevation: 20,
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    dropdownMenuContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      width: '100%',
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.4,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 12,
    },
    dropdownMenuItem: {
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    dropdownMenuItemInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dropdownMenuItemText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    dropdownValue: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    customCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    customCheckboxActive: {
      backgroundColor: '#0a2341',
      borderColor: '#0a2341',
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalScroll: {
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 20,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    inputGroup: {
      marginBottom: 24,
    },
    formRow: {
      gap: 16,
      marginBottom: 24,
    },
    formCol: {
      flex: 1,
    },
    input: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
    },
    dropdownStub: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    platformToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      width: '48.5%',
    },
    platformToggleActive: {
      backgroundColor: '#0a234105',
      borderColor: '#0a234120',
    },
    platformLabel: {
      paddingLeft: 4,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 16,
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground
    },
    modalCancelText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15
    },
    modalSaveBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
    },
    modalSaveText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15
    }
  });
}
