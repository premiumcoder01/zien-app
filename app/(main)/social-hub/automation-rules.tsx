import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  createAutomationRule,
  deleteAutomationRule,
  getAutomationRules,
  getTemplates,
  updateAutomationRule,
  AutomationRule
} from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TRIGGER_OPTIONS = [
  { label: 'New Property Listed', value: 'New Property Listed' },
  { label: 'Property Sold', value: 'Property Sold' },
  { label: 'Property Price Reduced', value: 'Property Price Reduced' },
];

const ACTION_OPTIONS = [
  { label: 'Auto-Generate & Publish Immediately', value: 'Auto-Generate & Publish Immediately' },
  { label: 'Auto-Generate & Save as Draft', value: 'Auto-Generate & Save as Draft' },
  { label: 'Notify Team to Post Manually', value: 'Notify Team to Post Manually' },
];

const SCOPE_OPTIONS = [
  { label: 'All Properties', value: 'All Properties' },
  { label: 'Filter by Minimum Price', value: 'Filter by Minimum Price' },
  { label: 'Filter by Property Type', value: 'Filter by Property Type' },
];

const PROPERTY_TYPE_OPTIONS = [
  { label: 'Residential', value: 'Residential' },
  { label: 'Commercial', value: 'Commercial' },
  { label: 'Land', value: 'Land' },
  { label: 'Luxury', value: 'Luxury' },
];

export default function AutomationRulesScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  // Form States
  const [newRuleName, setNewRuleName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(TRIGGER_OPTIONS[0].value);
  const [selectedAction, setSelectedAction] = useState(ACTION_OPTIONS[0].value);
  const [targetScope, setTargetScope] = useState(SCOPE_OPTIONS[0].value);
  const [scopeValue, setScopeValue] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Instagram', 'Facebook']);
  const [activeDropdown, setActiveDropdown] = useState<'trigger' | 'action' | 'scope' | 'template' | 'propertyType' | null>(null);

  // Validation Error States
  const [ruleNameError, setRuleNameError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [platformsError, setPlatformsError] = useState('');
  const [scopeValError, setScopeValError] = useState('');

  // Queries
  const { data: rules = [], isLoading: isRulesLoading } = useQuery({
    queryKey: ['automation-rules-all'],
    queryFn: () => getAutomationRules(accessToken || ''),
    enabled: !!accessToken,
  });

  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['social-templates-all'],
    queryFn: () => getTemplates(accessToken || ''),
    enabled: !!accessToken,
  });

  const isLoading = isRulesLoading || isTemplatesLoading;

  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(String(templates[0].id));
    }
  }, [templates, selectedTemplateId]);

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingRuleId(null);
    setNewRuleName('');
    setSelectedTrigger(TRIGGER_OPTIONS[0].value);
    setSelectedAction(ACTION_OPTIONS[0].value);
    setTargetScope(SCOPE_OPTIONS[0].value);
    setScopeValue('');
    setSelectedTemplateId(templates.length > 0 ? String(templates[0].id) : '');
    setSelectedPlatforms(['Instagram', 'Facebook']);
    setActiveDropdown(null);

    setRuleNameError('');
    setTemplateError('');
    setPlatformsError('');
    setScopeValError('');
  };

  const openCreateModal = () => {
    setEditingRuleId(null);
    setNewRuleName('');
    setSelectedTrigger(TRIGGER_OPTIONS[0].value);
    setSelectedAction(ACTION_OPTIONS[0].value);
    setTargetScope(SCOPE_OPTIONS[0].value);
    setScopeValue('');
    setSelectedTemplateId(templates.length > 0 ? String(templates[0].id) : '');
    setSelectedPlatforms(['Instagram', 'Facebook']);
    
    setRuleNameError('');
    setTemplateError('');
    setPlatformsError('');
    setScopeValError('');
    
    setShowCreateModal(true);
  };

  const openEditModal = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setNewRuleName(rule.name);
    setSelectedTrigger(rule.trigger_event);
    setSelectedAction(rule.action_type);
    setTargetScope(rule.config?.scope?.type || SCOPE_OPTIONS[0].value);
    setScopeValue(rule.config?.scope?.value ? String(rule.config.scope.value) : '');
    setSelectedTemplateId(rule.config?.template_id ? String(rule.config.template_id) : '');
    setSelectedPlatforms(rule.config?.platforms || []);
    
    setRuleNameError('');
    setTemplateError('');
    setPlatformsError('');
    setScopeValError('');
    
    setShowCreateModal(true);
  };

  const handleToggleActive = async (rule: AutomationRule) => {
    if (!accessToken) return;
    try {
      await updateAutomationRule(accessToken, rule.id, {
        is_active: !rule.is_active,
      });
      queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle rule status');
    }
  };

  const handleDeleteRule = (id: number) => {
    Alert.alert(
      'Delete Automation',
      'Are you sure you want to delete this automation rule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            try {
              await deleteAutomationRule(accessToken, id);
              queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] });
              Alert.alert('Success', 'Rule deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const handleSaveRule = async () => {
    let isValid = true;

    if (!newRuleName.trim()) {
      setRuleNameError('Rule name is required.');
      isValid = false;
    } else {
      setRuleNameError('');
    }

    if (!selectedTemplateId) {
      setTemplateError('Please select a template to use.');
      isValid = false;
    } else {
      setTemplateError('');
    }

    if (selectedPlatforms.length === 0) {
      setPlatformsError('Please select at least one target platform.');
      isValid = false;
    } else {
      setPlatformsError('');
    }

    if (targetScope === 'Filter by Minimum Price') {
      if (!scopeValue.trim()) {
        setScopeValError('Minimum price is required.');
        isValid = false;
      } else if (isNaN(Number(scopeValue))) {
        setScopeValError('Please enter a valid number.');
        isValid = false;
      } else {
        setScopeValError('');
      }
    } else if (targetScope === 'Filter by Property Type') {
      if (!scopeValue.trim()) {
        setScopeValError('Property type is required.');
        isValid = false;
      } else {
        setScopeValError('');
      }
    } else {
      setScopeValError('');
    }

    if (!isValid) return;

    const payload = {
      name: newRuleName,
      trigger_event: selectedTrigger,
      action_type: selectedAction,
      is_active: true,
      config: {
        scope: {
          type: targetScope,
          ...(targetScope !== 'All Properties' ? { value: targetScope === 'Filter by Minimum Price' ? Number(scopeValue) : scopeValue } : {})
        },
        platforms: selectedPlatforms,
        template_id: String(selectedTemplateId),
      },
    };

    if (!accessToken) return;

    try {
      if (editingRuleId) {
        await updateAutomationRule(accessToken, editingRuleId, payload);
      } else {
        await createAutomationRule(accessToken, payload);
      }
      queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] });
      closeModal();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save automation rule');
    }
  };

  const filteredRules = rules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const triggerDropdownOptions = TRIGGER_OPTIONS;
  const actionDropdownOptions = ACTION_OPTIONS;
  const scopeDropdownOptions = SCOPE_OPTIONS;
  const templateDropdownOptions = templates.map(t => ({ label: t.name, value: String(t.id) }));

  const DropdownMenu = ({ visible, title, options, selected, onSelect, onClose }: any) => {
    if (!visible) return null;
    return (
      <RNModal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.dropdownOverlay} onPress={onClose}>
          <Pressable style={styles.dropdownMenuContent} onPress={() => {}}>
            <View style={styles.bottomSheetHandle} />
            {!!title && (
              <>
                <Text style={styles.dropdownSheetTitle}>{title}</Text>
                <View style={styles.dropdownSheetDivider} />
              </>
            )}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {options.map((opt: any) => {
                const isSelected = selected === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.dropdownMenuItem,
                      isSelected && { backgroundColor: colors.surfaceSoft }
                    ]}
                    onPress={() => {
                      onSelect(opt.value);
                      onClose();
                    }}>
                    <View style={styles.dropdownMenuItemInner}>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={16} color={colors.accentTeal} style={{ marginRight: 8 }} />
                      )}
                      <Text style={[
                        styles.dropdownMenuItemText,
                        isSelected && { color: colors.accentTeal }
                      ]}>{opt.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    );
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>

      <PageHeader
        title="Automation Rules"
        subtitle="Set up 'if this, then that' workflows for your social media."
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentTeal} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Configuring workflows...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search rules..."
              placeholderTextColor={colors.textMuted || '#94A3B8'}
            />
          </View>

          {/* Rule List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Automations</Text>
            <Text style={styles.sectionCount}>{filteredRules.length} Rules</Text>
          </View>

          <View style={styles.ruleList}>
            {filteredRules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="robot-off-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No automation rules found</Text>
              </View>
            ) : (
              filteredRules.map((rule, idx) => (
                <Animated.View
                  entering={FadeInDown.delay(idx * 100).springify()}
                  key={rule.id}
                  style={styles.ruleCard}
                >
                  <View style={styles.ruleHeaderRow}>
                    <View style={styles.ruleTitleSection}>
                      <View style={styles.ruleIconBox}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={20} color={colors.accentTeal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text style={styles.ruleTitleText}>{rule.name}</Text>
                          <View style={styles.scopeBadge}>
                            <Text style={styles.scopeBadgeText}>
                              {rule.config?.scope?.type?.toUpperCase() || 'ALL PROPERTIES'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.ruleInfoDivider} />

                  <View style={styles.ruleFooterRow}>
                    <View style={styles.timeSection}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.timeText}>
                        {rule.action_type === 'Auto-Generate & Publish Immediately' ? 'Immediate' : 'Delayed'}
                      </Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <Pressable
                        style={[
                          styles.statusBadge,
                          { backgroundColor: rule.is_active ? 'rgba(16, 185, 129, 0.1)' : colors.surfaceSoft }
                        ]}
                        onPress={() => handleToggleActive(rule)}
                      >
                        <Text style={[styles.statusText, { color: rule.is_active ? '#10B981' : colors.textMuted }]}>
                          {rule.is_active ? 'ACTIVE' : 'PAUSED'}
                        </Text>
                      </Pressable>

                      <Pressable style={styles.editBtn} onPress={() => openEditModal(rule)}>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
                      </Pressable>

                      <Pressable style={styles.deleteBtn} onPress={() => handleDeleteRule(rule.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#F87171" />
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </View>

          {/* Automation Impact Section matching web design exactly */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.impactContainer}>
            <View style={styles.impactHeader}>
              <View style={styles.impactRadarBox}>
                <MaterialCommunityIcons name="radar" size={22} color={colors.accentTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.impactTitle}>Automation Impact</Text>
                <Text style={styles.impactSubtitle}>Last 30 days performance</Text>
              </View>
            </View>

            <View style={styles.impactDivider} />

            <View style={styles.impactStatsRow}>
              <View style={styles.impactStatItem}>
                <Text style={styles.impactStatValue}>16</Text>
                <Text style={styles.impactStatLabel}>Posts Automated</Text>
              </View>

              <View style={styles.impactStatDivider} />

              <View style={styles.impactStatItem}>
                <Text style={styles.impactStatValue}>5h</Text>
                <Text style={styles.impactStatLabel}>Time Saved</Text>
              </View>
            </View>
          </Animated.View>

        </ScrollView>
      )}

      {/* Floating Create Rule Button */}
      {!isLoading && (
        <Pressable
          style={styles.fab}
          onPress={openCreateModal}
        >
          <LinearGradient
            colors={[colors.accentTeal, colors.accentBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.fabText}>Create Rule</Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* Create / Edit Rule Modal */}
      <RNModal visible={showCreateModal} transparent={false} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={[styles.modalContent, { paddingTop: insets.top, paddingBottom: 0 }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{editingRuleId ? 'Edit Automation Rule' : 'Create Automation Rule'}</Text>
                <Pressable onPress={closeModal} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Rule Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Rule Name <Text style={styles.asterisk}>*</Text></Text>
                  <TextInput
                    style={[styles.input, !!ruleNameError && styles.inputError]}
                    value={newRuleName}
                    onChangeText={(val) => {
                      setNewRuleName(val);
                      if (val.trim()) setRuleNameError('');
                    }}
                    placeholder="e.g. Social Lead email"
                    placeholderTextColor={colors.textMuted || '#94A3B8'}
                  />
                  {!!ruleNameError && <Text style={styles.errorText}>{ruleNameError}</Text>}
                </View>

                {/* Trigger (IF) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Trigger (IF) <Text style={styles.asterisk}>*</Text></Text>
                  <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('trigger')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {TRIGGER_OPTIONS.find(o => o.value === selectedTrigger)?.label || 'Select Trigger'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Action (THEN) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Action (THEN) <Text style={styles.asterisk}>*</Text></Text>
                  <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('action')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {ACTION_OPTIONS.find(o => o.value === selectedAction)?.label || 'Select Action'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Template to Use */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Template to Use <Text style={styles.asterisk}>*</Text></Text>
                  <Pressable style={[styles.dropdownStub, !!templateError && styles.inputError]} onPress={() => setActiveDropdown('template')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {templates.find(t => String(t.id) === selectedTemplateId)?.name || 'Select Template'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                  {!!templateError && <Text style={styles.errorText}>{templateError}</Text>}
                </View>

                {/* Target Scope */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Target Scope <Text style={styles.asterisk}>*</Text></Text>
                  <Pressable style={styles.dropdownStub} onPress={() => setActiveDropdown('scope')}>
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {SCOPE_OPTIONS.find(o => o.value === targetScope)?.label || 'Select Scope'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Dynamic field for Filter by Minimum Price */}
                {targetScope === 'Filter by Minimum Price' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Minimum Price ($) <Text style={styles.asterisk}>*</Text></Text>
                    <TextInput
                      style={[styles.input, !!scopeValError && styles.inputError]}
                      value={scopeValue}
                      onChangeText={(val) => {
                        setScopeValue(val);
                        if (val.trim()) setScopeValError('');
                      }}
                      keyboardType="numeric"
                      placeholder="e.g. 1000000"
                      placeholderTextColor={colors.textMuted || '#94A3B8'}
                    />
                    {!!scopeValError && <Text style={styles.errorText}>{scopeValError}</Text>}
                  </View>
                )}

                {/* Dynamic field for Filter by Property Type */}
                {targetScope === 'Filter by Property Type' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Property Type <Text style={styles.asterisk}>*</Text></Text>
                    <Pressable
                      style={[styles.dropdownStub, !!scopeValError && styles.inputError]}
                      onPress={() => setActiveDropdown('propertyType')}
                    >
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {PROPERTY_TYPE_OPTIONS.find(o => o.value === scopeValue)?.label || 'Select Property Type'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                    </Pressable>
                    {!!scopeValError && <Text style={styles.errorText}>{scopeValError}</Text>}
                  </View>
                )}

                {/* Platforms */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Target Platforms <Text style={styles.asterisk}>*</Text></Text>
                  <View style={styles.platformGrid}>
                    {[
                      { id: 'Instagram', icon: 'instagram', color: '#E1306C' },
                      { id: 'Facebook', icon: 'facebook', color: '#1877F2' },
                      // { id: 'Linkedin', icon: 'linkedin', color: '#0A66C2' },
                      { id: 'TikTok', icon: 'music-note', color: '#FE2C55' }
                    ].map((p) => {
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            let updated;
                            if (isSelected) {
                              updated = selectedPlatforms.filter(item => item !== p.id);
                            } else {
                              updated = [...selectedPlatforms, p.id];
                            }
                            setSelectedPlatforms(updated);
                            if (updated.length > 0) setPlatformsError('');
                          }}
                          style={styles.platformRowBadge}
                        >
                          <MaterialCommunityIcons 
                            name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} 
                            size={18} 
                            color={isSelected ? colors.accentTeal : colors.textMuted} 
                            style={{ marginRight: 8 }}
                          />
                          <MaterialCommunityIcons name={p.icon as any} size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                          <Text style={[styles.platformText, { color: colors.textPrimary }]}>{p.id}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!!platformsError && <Text style={styles.errorText}>{platformsError}</Text>}
                </View>
              </ScrollView>

              {/* Fixed bottom buttons */}
              <View style={styles.actionRowFixed}>
                <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                  <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveRule}>
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                    {editingRuleId ? 'Update Rule' : 'Activate Rule'}
                  </Text>
                </Pressable>
              </View>

              {/* Dropdown Modals */}
              <DropdownMenu
                visible={activeDropdown === 'trigger'}
                title="Select Trigger Event"
                options={triggerDropdownOptions}
                selected={selectedTrigger}
                onSelect={setSelectedTrigger}
                onClose={() => setActiveDropdown(null)}
              />

              <DropdownMenu
                visible={activeDropdown === 'action'}
                title="Select Action Type"
                options={actionDropdownOptions}
                selected={selectedAction}
                onSelect={setSelectedAction}
                onClose={() => setActiveDropdown(null)}
              />

              <DropdownMenu
                visible={activeDropdown === 'scope'}
                title="Select Target Scope"
                options={scopeDropdownOptions}
                selected={targetScope}
                onSelect={setTargetScope}
                onClose={() => setActiveDropdown(null)}
              />

              <DropdownMenu
                visible={activeDropdown === 'template'}
                title="Select Template"
                options={templateDropdownOptions}
                selected={selectedTemplateId}
                onSelect={setSelectedTemplateId}
                onClose={() => setActiveDropdown(null)}
              />

              <DropdownMenu
                visible={activeDropdown === 'propertyType'}
                title="Select Property Type"
                options={PROPERTY_TYPE_OPTIONS}
                selected={scopeValue}
                onSelect={(val: string) => {
                  setScopeValue(val);
                  setScopeValError('');
                }}
                onClose={() => setActiveDropdown(null)}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>
    </LinearGradient>
  );
}

function getStyles(colors: any, theme: 'light' | 'dark') {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 18 },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '700',
    },
    fab: {
      position: 'absolute',
      bottom: 30,
      right: 25,
      borderRadius: 28,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    fabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      height: 45,
      borderRadius: 28,
      gap: 8,
    },
    fabText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 20,
      marginTop: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      height: '100%',
      paddingVertical: 0,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    ruleList: {
      marginBottom: 24,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: '600',
    },
    ruleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      marginBottom: 14,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    ruleHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    ruleTitleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    ruleIconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: `${colors.accentTeal}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ruleTitleText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    scopeBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    scopeBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    ruleInfoDivider: {
      height: 1,
      backgroundColor: colors.rowBorder || colors.cardBorder,
      marginVertical: 12,
    },
    ruleFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    editBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    deleteBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    impactContainer: {
      backgroundColor: theme === 'dark' ? '#151D26' : '#0B2D3E',
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
        android: { elevation: 4 },
      }),
    },
    impactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    impactRadarBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    impactTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFF',
    },
    impactSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
    },
    impactDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: 16,
    },
    impactStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    impactStatItem: {
      alignItems: 'center',
    },
    impactStatValue: {
      fontSize: 28,
      fontWeight: '900',
      color: '#FFF',
    },
    impactStatLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    impactStatDivider: {
      width: 1,
      height: 35,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    dropdownMenuContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -10 },
      elevation: 10,
    },
    bottomSheetHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: `${colors.textMuted}30`,
      alignSelf: 'center',
      marginBottom: 16,
      marginTop: 4,
    },
    dropdownSheetTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    dropdownSheetDivider: {
      height: 1,
      backgroundColor: colors.rowBorder || colors.cardBorder,
      marginBottom: 10,
    },
    dropdownMenuItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.rowBorder || colors.cardBorder,
    },
    dropdownMenuItemInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dropdownMenuItemText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      justifyContent: 'flex-start',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      flex: 1,
      height: '100%',
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.rowBorder || colors.cardBorder,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    modalScroll: {
      paddingBottom: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    input: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 16,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    formCol: {
      flex: 1,
    },
    dropdownStub: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    dropdownText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    platformGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    platformRowBadge: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      padding: 12,
      borderRadius: 14,
    },
    platformText: {
      fontSize: 11,
      fontWeight: '800',
    },
    asterisk: {
      color: '#EF4444',
    },
    errorText: {
      color: '#EF4444',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
    inputError: {
      borderColor: '#EF4444',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    actionRowFixed: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    modalBtn: {
      flex: 1,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    saveBtn: {
      backgroundColor: colors.accentTeal,
    },
    modalBtnText: {
      fontSize: 14,
      fontWeight: '800',
    },
  });
}
