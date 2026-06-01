import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CRMContact, CRMDeal, CRMPipeline, CRMStage, addCRMDeal, addCRMPipelineStage, deleteCRMPipelineStage, updateCRMPipelineStage, getCRMContacts, getCRMDeals, getCRMPipelines, updateCRMDealStage, deleteCRMDeal } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROPERTIES = [
  '123 Business Way, Los Angeles',
  '456 Tech Lane',
  '789 Garden St',
  '101 Cyberdyne Blvd'
];

export default function DealsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  const router = useRouter();
  const { accessToken } = useAuth();

  // Pipeline-related state
  const [activePipeline, setActivePipeline] = useState<CRMPipeline | null>(null);
  const [targetPipeline, setTargetPipeline] = useState<CRMPipeline | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [transferingDealId, setTransferingDealId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  // TanStack Query for dynamic data
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ['crmPipelines', accessToken],
    queryFn: () => getCRMPipelines(accessToken!),
    enabled: !!accessToken,
  });

  // Set default active pipeline when data loads and sync it
  useEffect(() => {
    if (pipelines.length > 0) {
      if (!activePipeline) {
        setActivePipeline(pipelines[0]);
      } else {
        const updated = pipelines.find(p => p.id === activePipeline.id);
        if (updated) {
          setActivePipeline(updated);
        }
      }
    }
  }, [pipelines]);

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['crmContacts', accessToken],
    queryFn: () => getCRMContacts(accessToken!),
    enabled: !!accessToken,
  });


  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['crmDeals', activePipeline?.id, accessToken],
    queryFn: () => getCRMDeals(accessToken!, activePipeline!.id),
    enabled: !!accessToken && !!activePipeline?.id,
  });

  // Calculate deals per stage
  const dealsByStage = useMemo(() => {
    const map: Record<string, CRMDeal[]> = {};
    deals.forEach(deal => {
      if (!map[deal.stage_id]) map[deal.stage_id] = [];
      map[deal.stage_id].push(deal);
    });
    return map;
  }, [deals]);

  // Form states
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [dealValue, setDealValue] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const [isContactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [isPropertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [isPipelineDropdownOpen, setPipelineDropdownOpen] = useState(false);
  const [isStageDropdownOpen, setStageDropdownOpen] = useState(false);

  const [contactSearch, setContactSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [stageSearch, setStageSearch] = useState('');

  const filteredContacts = useMemo(() => {
    return (contacts || []).filter(c =>
      `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
    );
  }, [contacts, contactSearch]);

  const filteredProperties = useMemo(() => {
    return (PROPERTIES || []).filter(p => p.toLowerCase().includes(propertySearch.toLowerCase()));
  }, [propertySearch]);

  const filteredPipelines = useMemo(() => {
    return (pipelines || []).filter(p => p.name.toLowerCase().includes(pipelineSearch.toLowerCase()));
  }, [pipelines, pipelineSearch]);

  const filteredStages = useMemo(() => {
    if (!targetPipeline) return [];
    return targetPipeline.stages.filter((s: any) => s.name.toLowerCase().includes(stageSearch.toLowerCase()));
  }, [targetPipeline, stageSearch]);

  const [customStageName, setCustomStageName] = useState('');
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Stage Management states
  const [isStagesModalVisible, setIsStagesModalVisible] = useState(false);
  const [stagesModalPipeline, setStagesModalPipeline] = useState<CRMPipeline | null>(null);
  const [isStagesPipelineDropdownOpen, setIsStagesPipelineDropdownOpen] = useState(false);
  const [stagesPipelineSearch, setStagesPipelineSearch] = useState('');
  const [newStageInput, setNewStageInput] = useState('');
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['crmPipelines'] }),
      queryClient.invalidateQueries({ queryKey: ['crmContacts'] }),
      queryClient.invalidateQueries({ queryKey: ['crmDeals'] })
    ]);
    setRefreshing(false);
  }, [queryClient]);
   const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageNameInput, setEditStageNameInput] = useState('');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  const handleEditStageSave = async (stageId: string) => {
    if (!editStageNameInput.trim() || !accessToken) return;

    try {
      setIsUpdatingStage(true);
      await updateCRMPipelineStage(accessToken, stageId, editStageNameInput.trim());
      setEditingStageId(null);
      setEditStageNameInput('');
      await queryClient.invalidateQueries({ queryKey: ['crmPipelines'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to rename stage');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const [dealToDelete, setDealToDelete] = useState<CRMDeal | null>(null);
  const [isDeletingDeal, setIsDeletingDeal] = useState(false);

  const handleDeleteDealConfirm = async () => {
    if (!dealToDelete || !accessToken) return;

    try {
      setIsDeletingDeal(true);
      await deleteCRMDeal(accessToken, dealToDelete.id);
      setDealToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['crmDeals'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete deal');
    } finally {
      setIsDeletingDeal(false);
    }
  };

  const currentStages = activePipeline?.stages || [];

  const stagesModalCurrentStages = useMemo(() => {
    if (!stagesModalPipeline) return [];
    const fresh = pipelines.find(p => p.id === stagesModalPipeline.id);
    return fresh?.stages || stagesModalPipeline.stages || [];
  }, [stagesModalPipeline, pipelines]);

  const filteredStagesPipelines = useMemo(() => {
    return (pipelines || []).filter(p => p.name.toLowerCase().includes(stagesPipelineSearch.toLowerCase()));
  }, [pipelines, stagesPipelineSearch]);

  const handleAddStage = async () => {
    if (!newStageInput.trim() || !stagesModalPipeline?.id || !accessToken) return;

    try {
      setIsAddingStage(true);
      await addCRMPipelineStage(accessToken, stagesModalPipeline.id, newStageInput.trim());
      setNewStageInput('');
      await queryClient.invalidateQueries({ queryKey: ['crmPipelines'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add stage');
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleRemoveStage = async (stageId: string) => {
    if (!accessToken) return;

    try {
      setDeletingStageId(stageId);
      await deleteCRMPipelineStage(accessToken, stageId);
      await queryClient.invalidateQueries({ queryKey: ['crmPipelines'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete stage');
    } finally {
      setDeletingStageId(null);
    }
  };

  // Auto-Trigger states
  const [isAutoTriggerModalVisible, setIsAutoTriggerModalVisible] = useState(false);
  const [automations, setAutomations] = useState([
    { id: 'lead', stage: 'Lead', enabled: true, action: 'Send Email' },
    { id: 'contacted', stage: 'Contacted', enabled: false, action: 'Send Email' },
    { id: 'showing', stage: 'Showing', enabled: false, action: 'SMS Alert' },
    { id: 'offer', stage: 'Offer', enabled: true, action: 'Send Email' },
    { id: 'closed', stage: 'Closed', enabled: true, action: 'Send Email' },
  ]);
  const [activeActionStageId, setActiveActionStageId] = useState<string | null>(null);

  const handleSaveAutomations = () => {
    setIsAutoTriggerModalVisible(false);
  };


  const resetForm = () => {
    setCustomStageName('');
    setTargetPipeline(null);
    setSelectedContact(null);
    setSelectedProperty(null);
    setDealValue('');
    setSelectedStage(null);
    setShowErrors(false);
    setContactDropdownOpen(false);
    setPropertyDropdownOpen(false);
    setPipelineDropdownOpen(false);
    setStageDropdownOpen(false);
  };

  const handleCreateDeal = async () => {
    setShowErrors(true);
    if (!accessToken || !targetPipeline || !selectedContact || !selectedProperty || !dealValue || !selectedStage) {
      return;
    }

    try {
      setIsCreatingDeal(true);

      const stage = targetPipeline.stages.find((s: any) => s.name === selectedStage);
      let finalStageId = stage?.id;

      // Handle custom stage creation
      if (!finalStageId && customStageName.trim()) {
        const newStage = await addCRMPipelineStage(accessToken, targetPipeline.id, customStageName.trim());
        finalStageId = newStage.id;
        await queryClient.invalidateQueries({ queryKey: ['crmPipelines'] });
      }

      if (!finalStageId) {
        Alert.alert('Error', 'Please select a valid stage.');
        return;
      }

      // Convert value string like "$ 1,200,000" to number
      const numericValue = parseInt(dealValue.replace(/[^0-9]/g, '')) || 0;

      await addCRMDeal(accessToken, {
        contact_id: selectedContact.id,
        pipeline_id: targetPipeline.id,
        stage_id: finalStageId,
        related_property: selectedProperty,
        deal_value: numericValue
      });

      setIsModalVisible(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['crmDeals'] });
      Alert.alert('Success', 'Deal created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create deal');
    } finally {
      setIsCreatingDeal(false);
    }
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const updateAutomationAction = (stageName: string, action: string) => {
    setAutomations(prev => {
      const exists = prev.find(a => a.stage === stageName);
      if (exists) {
        return prev.map(a => a.stage === stageName ? { ...a, action } : a);
      }
      return [...prev, { id: Math.random().toString(), stage: stageName, enabled: false, action }];
    });
    setActiveActionStageId(null);
  };

  const handleValueChange = (text: string) => {
    // Remove all non-numeric characters
    const cleanNumber = text.replace(/[^0-9]/g, '');
    if (cleanNumber === '') {
      setDealValue('');
      return;
    }
    // Format with commas and $ prefix
    const formatted = '$ ' + Number(cleanNumber).toLocaleString();
    setDealValue(formatted);
  };

  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num}`;
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const handleMoveDeal = async (dealId: string, stageId: string) => {
    try {
      await updateCRMDealStage(accessToken!, dealId, stageId);
      setTransferingDealId(null);
      await queryClient.invalidateQueries({ queryKey: ['crmDeals'] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to move deal');
    }
  };

  // Premium stage color palette for visual discrimination
  const STAGE_COLORS = [
    { bg: 'rgba(10, 35, 65, 0.06)', border: 'rgba(10, 35, 65, 0.15)', accent: '#0a2341', dot: '#0a2341', badge: 'rgba(10, 35, 65, 0.1)', badgeText: '#0a2341' },
    { bg: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.15)', accent: '#3B82F6', dot: '#3B82F6', badge: 'rgba(59, 130, 246, 0.1)', badgeText: '#3B82F6' },
    { bg: 'rgba(139, 92, 246, 0.06)', border: 'rgba(139, 92, 246, 0.15)', accent: '#8B5CF6', dot: '#8B5CF6', badge: 'rgba(139, 92, 246, 0.1)', badgeText: '#8B5CF6' },
    { bg: 'rgba(236, 72, 153, 0.06)', border: 'rgba(236, 72, 153, 0.15)', accent: '#EC4899', dot: '#EC4899', badge: 'rgba(236, 72, 153, 0.1)', badgeText: '#EC4899' },
    { bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.15)', accent: '#F59E0B', dot: '#F59E0B', badge: 'rgba(245, 158, 11, 0.1)', badgeText: '#D97706' },
    { bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.15)', accent: '#10B981', dot: '#10B981', badge: 'rgba(16, 185, 129, 0.1)', badgeText: '#059669' },
    { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.15)', accent: '#EF4444', dot: '#EF4444', badge: 'rgba(239, 68, 68, 0.1)', badgeText: '#DC2626' },
    { bg: 'rgba(20, 184, 166, 0.06)', border: 'rgba(20, 184, 166, 0.15)', accent: '#14B8A6', dot: '#14B8A6', badge: 'rgba(20, 184, 166, 0.1)', badgeText: '#0D9488' },
  ];

  const getStageColor = (index: number) => STAGE_COLORS[index % STAGE_COLORS.length];

  const renderDealCard = (deal: CRMDeal, stageColor: typeof STAGE_COLORS[0]) => {
    const isMenuOpen = transferingDealId === deal.id;

    return (
      <View key={deal.id} style={styles.dealCard}>
        <View style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3.5, borderRadius: 2, backgroundColor: stageColor.accent }} />
        <View style={styles.dealCardHeader}>
          <Text style={[styles.dealCardName, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>
            {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name || ''}` : 'No Contact'}
          </Text>
          <Pressable
            style={styles.dealDeleteBtn}
            onPress={() => setDealToDelete(deal)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
        <Text style={styles.dealCardAddress}>{deal.related_property}</Text>
        <View style={styles.dealCardBottom}>
          <Text style={[styles.dealCardValue, { color: stageColor.accent }]}>
            {typeof deal.deal_value === 'number' ? `$${deal.deal_value.toLocaleString()}` : formatPrice(deal.deal_value)}
          </Text>
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.transferBtn, { backgroundColor: stageColor.badge }]}
              onPress={() => setTransferingDealId(isMenuOpen ? null : deal.id)}
            >
              <Text style={[styles.transferBtnText, { color: stageColor.accent }]}>Transfer</Text>
              <MaterialCommunityIcons name={isMenuOpen ? "chevron-up" : "chevron-down"} size={14} color={stageColor.accent} />
            </Pressable>
            <Text style={styles.dealCardTime}>{getTimeAgo(deal.last_activity_at)}</Text>
          </View>
        </View>

        {isMenuOpen && (
          <View style={styles.transferMenu}>
            <Text style={styles.transferMenuTitle}>Move to:</Text>
            <View style={styles.transferOptionsRow}>
              {currentStages.filter(s => s.id !== deal.stage_id).map((stage, idx) => {
                const targetColor = getStageColor(currentStages.indexOf(stage));
                return (
                  <Pressable
                    key={stage.id}
                    style={[styles.transferOption, { backgroundColor: targetColor.badge }]}
                    onPress={() => handleMoveDeal(deal.id, stage.id)}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: targetColor.accent, marginRight: 6 }} />
                    <Text style={[styles.transferOptionText, { color: targetColor.accent }]}>{stage.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderStage = (stage: CRMStage, index: number) => {
    const deals = dealsByStage[stage.id] || [];
    const sc = getStageColor(index);
    return (
      <View key={stage.id} style={[styles.stageColumn, { backgroundColor: sc.bg, borderColor: sc.border }]}>
        <View style={styles.stageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sc.dot }} />
            <Text style={[styles.stageHeaderText, { color: sc.accent }]}>{stage.name.toUpperCase()}</Text>
          </View>
          <View style={[styles.stageCountBadge, { backgroundColor: sc.badge }]}>
            <Text style={[styles.stageCountText, { color: sc.badgeText }]}>{deals.length}</Text>
          </View>
        </View>
        <View style={styles.stageContent}>
          {deals.length > 0 ? (
            deals.map(deal => renderDealCard(deal, sc))
          ) : (
            <View style={[styles.dragPlaceholder, { borderColor: sc.border }]}>
              <Text style={styles.dragPlaceholderText}>No deal here</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <PageHeader
          title="Deals"
          subtitle="Manage your deals from lead to closing with zero manual effort."
          onBack={() => router.back()}
        />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.mainScroll, { paddingBottom: insets.bottom + 20 }]}
          keyboardDismissMode='interactive'
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentTeal}
              colors={[colors.accentTeal]}
            />
          }
        >
          {/* Scrollable Tabs */}
          <View style={styles.tabContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {pipelines.map((pipeline) => {
                const isActive = activePipeline?.id === pipeline.id;
                return (
                  <Pressable
                    key={pipeline.id}
                    style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                    onPress={() => setActivePipeline(pipeline)}
                  >
                    <Text style={[styles.pillBtnText, isActive && styles.pillBtnTextActive]}>
                      {pipeline.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.topActions}>
            <View style={styles.filterBtnsRow}>
              <Pressable style={styles.filterBtn} onPress={() => { setStagesModalPipeline(activePipeline); setIsStagesModalVisible(true); }}>
                <MaterialCommunityIcons name="tune-variant" size={18} color={colors.textPrimary} />
                <Text style={styles.filterBtnText}>Stages</Text>
              </Pressable>
              <Pressable style={styles.filterBtn} onPress={() => setIsAutoTriggerModalVisible(true)}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.filterBtnText}>Auto-Triggers</Text>
              </Pressable>
            </View>
          </View>

          {isLoadingDeals ? (
            <View style={{ paddingVertical: 100 }}>
              <ActivityIndicator size="large" color={colors.accentTeal} />
            </View>
          ) : (
            <View style={styles.stagesList}>
              {currentStages.map((stage, index) => renderStage(stage, index))}
            </View>
          )}
        </ScrollView>

        {/* Add Pipeline Stage Modal */}
        <Modal
          visible={isStagesModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          statusBarTranslucent
          onRequestClose={() => setIsStagesModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Manage Stages</Text>
                <Text style={styles.modalSubtitle}>Add or remove stages for your pipeline.</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setIsStagesModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 200 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Pipeline Selector */}
              <View style={styles.smSection}>
                <View style={styles.smSectionHeader}>
                  <MaterialCommunityIcons name="pipe" size={15} color={colors.accentTeal} />
                  <Text style={styles.smSectionLabel}>Target Pipeline</Text>
                </View>
                <Pressable
                  style={styles.smPipelineSelector}
                  onPress={() => { setIsStagesPipelineDropdownOpen(true); setStagesPipelineSearch(''); }}
                >
                  <View style={styles.smPipelineIconWrap}>
                    <MaterialCommunityIcons name="view-list-outline" size={18} color={colors.accentTeal} />
                  </View>
                  <Text style={[styles.smPipelineName, !stagesModalPipeline && { color: colors.textMuted }]}>
                    {stagesModalPipeline?.name || 'Select a pipeline'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>

                <Modal
                  visible={isStagesPipelineDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setIsStagesPipelineDropdownOpen(false)}
                >
                  <Pressable style={styles.pickerOverlay} onPress={() => setIsStagesPipelineDropdownOpen(false)}>
                    <View style={styles.selectionModalContainer}>
                      <View style={styles.selectionModalHeader}>
                        <Text style={styles.selectionModalTitle}>Select Pipeline</Text>
                        <Pressable onPress={() => setIsStagesPipelineDropdownOpen(false)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                        </Pressable>
                      </View>
                      <View style={styles.pickerSearchBoxSmall}>
                        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                        <TextInput
                          style={styles.pickerSearchInputSmall}
                          placeholder="Search pipeline..."
                          placeholderTextColor={colors.textMuted}
                          value={stagesPipelineSearch}
                          onChangeText={setStagesPipelineSearch}
                        />
                      </View>
                      <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                        {filteredStagesPipelines.map((opt) => (
                          <Pressable
                            key={opt.id}
                            style={[styles.selectionModalItem, stagesModalPipeline?.id === opt.id && styles.selectionModalItemActive]}
                            onPress={() => { setStagesModalPipeline(opt); setIsStagesPipelineDropdownOpen(false); }}
                          >
                            <Text style={[styles.selectionModalItemText, stagesModalPipeline?.id === opt.id && styles.selectionModalItemTextActive]}>
                              {opt.name}
                            </Text>
                            {stagesModalPipeline?.id === opt.id && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </View>

              {/* Add New Stage */}
              <View style={styles.smSection}>
                <View style={styles.smSectionHeader}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={15} color={colors.accentTeal} />
                  <Text style={styles.smSectionLabel}>Add New Stage</Text>
                </View>
                <View style={styles.smAddRow}>
                  <View style={styles.smAddInputWrap}>
                    <MaterialCommunityIcons name="flag-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.smAddInput}
                      placeholder="Stage name..."
                      placeholderTextColor={colors.textMuted}
                      value={newStageInput}
                      onChangeText={setNewStageInput}
                      editable={!isAddingStage}
                      returnKeyType="done"
                      onSubmitEditing={handleAddStage}
                    />
                  </View>
                  <Pressable
                    style={[styles.smAddBtn, isAddingStage && { opacity: 0.7 }]}
                    onPress={handleAddStage}
                    disabled={isAddingStage}
                  >
                    {isAddingStage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Current Stages List */}
              <View style={styles.smSection}>
                <View style={styles.smSectionHeader}>
                  <MaterialCommunityIcons name="layers-outline" size={15} color={colors.accentTeal} />
                  <Text style={styles.smSectionLabel}>Current Stages</Text>
                  <View style={styles.smCountBadge}>
                    <Text style={styles.smCountBadgeText}>{stagesModalCurrentStages.length}</Text>
                  </View>
                </View>

                {stagesModalCurrentStages.length === 0 ? (
                  <View style={styles.smEmptyState}>
                    <MaterialCommunityIcons name="layers-off-outline" size={36} color={colors.textMuted} />
                    <Text style={styles.smEmptyTitle}>No stages yet</Text>
                    <Text style={styles.smEmptySubtitle}>Add your first stage above to get started.</Text>
                  </View>
                ) : (
                  <View style={styles.smStageList}>
                    {stagesModalCurrentStages.map((stage, index) => {
                      const isEditing = editingStageId === stage.id;
                      return (
                        <View key={stage.id} style={styles.smStageCard}>
                          <View style={styles.smStageLeft}>
                            <View style={styles.smStageIndex}>
                              <Text style={styles.smStageIndexText}>{index + 1}</Text>
                            </View>
                            {isEditing ? (
                              <TextInput
                                style={styles.smEditInput}
                                value={editStageNameInput}
                                onChangeText={setEditStageNameInput}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={() => handleEditStageSave(stage.id)}
                                editable={!isUpdatingStage}
                              />
                            ) : (
                              <Text style={styles.smStageName}>{stage.name}</Text>
                            )}
                          </View>
                          
                          <View style={styles.smActionRow}>
                            {isEditing ? (
                              <>
                                <Pressable
                                  style={[styles.smSaveBtn, isUpdatingStage && { opacity: 0.5 }]}
                                  onPress={() => handleEditStageSave(stage.id)}
                                  disabled={isUpdatingStage}
                                >
                                  {isUpdatingStage ? (
                                    <ActivityIndicator size="small" color="#10B981" />
                                  ) : (
                                    <MaterialCommunityIcons name="check" size={18} color="#10B981" />
                                  )}
                                </Pressable>
                                <Pressable
                                  style={styles.smCancelBtn}
                                  onPress={() => { setEditingStageId(null); setEditStageNameInput(''); }}
                                  disabled={isUpdatingStage}
                                >
                                  <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                                </Pressable>
                              </>
                            ) : (
                              <>
                                <Pressable
                                  style={styles.smEditBtn}
                                  onPress={() => { setEditingStageId(stage.id); setEditStageNameInput(stage.name); }}
                                >
                                  <MaterialCommunityIcons name="pencil-outline" size={17} color={colors.accentTeal} />
                                </Pressable>
                                <Pressable
                                  style={[styles.smDeleteBtn, deletingStageId === stage.id && { opacity: 0.5 }]}
                                  onPress={() => handleRemoveStage(stage.id)}
                                  disabled={deletingStageId === stage.id}
                                >
                                  {deletingStageId === stage.id ? (
                                    <ActivityIndicator size="small" color={colors.danger} />
                                  ) : (
                                    <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.danger} />
                                  )}
                                </Pressable>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={styles.saveSettingsBtn} onPress={() => setIsStagesModalVisible(false)}>
                <Text style={styles.saveSettingsBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Create New Deal Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          statusBarTranslucent
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Deal</Text>
                <Text style={styles.modalSubtitle}>Initialize a new sales opportunity in the pipeline.</Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  setIsModalVisible(false);
                  resetForm();
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Primary Contact */}
              <View style={[styles.inputGroup, { zIndex: 100 }]}>
                <Text style={styles.inputLabel}>Primary Contact <Text style={styles.requiredStar}>*</Text></Text>
                <Pressable
                  style={[styles.dropdownTrigger, showErrors && !selectedContact && styles.errorBorder]}
                  onPress={() => {
                    setContactDropdownOpen(true);
                    setContactSearch('');
                  }}
                >
                  <Text style={[styles.dropdownValue, !selectedContact && { color: colors.textSecondary }]}>
                    {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ''}` : 'Select Primary Contact'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {showErrors && !selectedContact && (
                  <Text style={styles.errorText}>Primary contact is required</Text>
                )}

                <Modal
                  visible={isContactDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setContactDropdownOpen(false)}
                >
                  <Pressable style={styles.pickerOverlay} onPress={() => setContactDropdownOpen(false)}>
                    <View style={styles.selectionModalContainer}>
                      <View style={styles.selectionModalHeader}>
                        <Text style={styles.selectionModalTitle}>Select Primary Contact</Text>
                        <Pressable onPress={() => setContactDropdownOpen(false)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                        </Pressable>
                      </View>

                      <View style={styles.pickerSearchBoxSmall}>
                        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                        <TextInput
                          style={styles.pickerSearchInputSmall}
                          placeholder="Search contact..."
                          placeholderTextColor={colors.textMuted}
                          value={contactSearch}
                          onChangeText={setContactSearch}
                        />
                      </View>

                      <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                        {filteredContacts.map((opt) => (
                          <Pressable
                            key={opt.id}
                            style={[styles.selectionModalItem, selectedContact?.id === opt.id && styles.selectionModalItemActive]}
                            onPress={() => {
                              setSelectedContact(opt);
                              setContactDropdownOpen(false);
                            }}
                          >
                            <View>
                              <Text style={[styles.selectionModalItemText, selectedContact?.id === opt.id && styles.selectionModalItemTextActive]}>
                                {opt.first_name} {opt.last_name || ''}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{opt.phone || opt.email || 'No details'}</Text>
                            </View>
                            {selectedContact?.id === opt.id && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                            )}
                          </Pressable>
                        ))}
                        {filteredContacts.length === 0 && (
                          <View style={{ padding: 24, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>No contacts found</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </View>

              {/* Related Property */}
              <View style={[styles.inputGroup, { zIndex: 90 }]}>
                <Text style={styles.inputLabel}>Related Property <Text style={styles.requiredStar}>*</Text></Text>
                <Pressable
                  style={[styles.dropdownTrigger, showErrors && !selectedProperty && styles.errorBorder]}
                  onPress={() => {
                    setPropertyDropdownOpen(true);
                    setPropertySearch('');
                  }}
                >
                  <Text style={[styles.dropdownValue, !selectedProperty && { color: colors.textSecondary }]}>
                    {selectedProperty || 'Select Related Property'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {showErrors && !selectedProperty && (
                  <Text style={styles.errorText}>Related property is required</Text>
                )}

                <Modal
                  visible={isPropertyDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setPropertyDropdownOpen(false)}
                >
                  <Pressable style={styles.pickerOverlay} onPress={() => setPropertyDropdownOpen(false)}>
                    <View style={styles.selectionModalContainer}>
                      <View style={styles.selectionModalHeader}>
                        <Text style={styles.selectionModalTitle}>Select Property</Text>
                        <Pressable onPress={() => setPropertyDropdownOpen(false)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                        </Pressable>
                      </View>

                      <View style={styles.pickerSearchBoxSmall}>
                        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                        <TextInput
                          style={styles.pickerSearchInputSmall}
                          placeholder="Search property..."
                          placeholderTextColor={colors.textMuted}
                          value={propertySearch}
                          onChangeText={setPropertySearch}
                        />
                      </View>

                      <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                        {filteredProperties.map((opt) => (
                          <Pressable
                            key={opt}
                            style={[styles.selectionModalItem, selectedProperty === opt && styles.selectionModalItemActive]}
                            onPress={() => {
                              setSelectedProperty(opt);
                              setPropertyDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.selectionModalItemText, selectedProperty === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                            {selectedProperty === opt && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </View>

              {/* Estimated Deal Value */}
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Estimated Deal Value <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.valueInputWrapper, showErrors && !dealValue && styles.errorBorder]}>
                  <TextInput
                    style={[styles.valueInput, !dealValue && { fontWeight: '500', fontSize: 16 }]}
                    value={dealValue}
                    onChangeText={handleValueChange}
                    keyboardType="numeric"
                    placeholder="$ 1,200,000"
                    placeholderTextColor={colors.textSecondary || '#8DA4B5'}
                  />
                </View>
                {showErrors && !dealValue && (
                  <Text style={styles.errorText}>Estimated deal value is required and must be a valid number</Text>
                )}
              </View>

              {/* Target Pipeline */}
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Target Pipeline <Text style={styles.requiredStar}>*</Text></Text>
                <Pressable
                  style={[styles.dropdownTrigger, showErrors && !targetPipeline && styles.errorBorder]}
                  onPress={() => {
                    setPipelineDropdownOpen(true);
                    setPipelineSearch('');
                  }}
                >
                  <Text style={[styles.dropdownValue, !targetPipeline && { color: colors.textSecondary }]}>
                    {targetPipeline?.name || 'Select Target Pipeline'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {showErrors && !targetPipeline && (
                  <Text style={styles.errorText}>Pipeline is required</Text>
                )}

                <Modal
                  visible={isPipelineDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setPipelineDropdownOpen(false)}
                >
                  <Pressable style={styles.pickerOverlay} onPress={() => setPipelineDropdownOpen(false)}>
                    <View style={styles.selectionModalContainer}>
                      <View style={styles.selectionModalHeader}>
                        <Text style={styles.selectionModalTitle}>Select Pipeline</Text>
                        <Pressable onPress={() => setPipelineDropdownOpen(false)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                        </Pressable>
                      </View>

                      <View style={styles.pickerSearchBoxSmall}>
                        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                        <TextInput
                          style={styles.pickerSearchInputSmall}
                          placeholder="Search pipeline..."
                          placeholderTextColor={colors.textMuted}
                          value={pipelineSearch}
                          onChangeText={setPipelineSearch}
                        />
                      </View>

                      <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                        {filteredPipelines.map((opt) => (
                          <Pressable
                            key={opt.id}
                            style={[styles.selectionModalItem, targetPipeline?.id === opt.id && styles.selectionModalItemActive]}
                            onPress={() => {
                              setTargetPipeline(opt);
                              setSelectedStage(null);
                              setPipelineDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.selectionModalItemText, targetPipeline?.id === opt.id && styles.selectionModalItemTextActive]}>{opt.name}</Text>
                            {targetPipeline?.id === opt.id && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </View>

              {/* Stage */}
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Stage <Text style={styles.requiredStar}>*</Text></Text>
                <Pressable
                  style={[styles.dropdownTrigger, showErrors && !selectedStage && styles.errorBorder]}
                  onPress={() => {
                    if (!targetPipeline) {
                      Alert.alert('Selection Required', 'Please select a pipeline first.');
                      return;
                    }
                    setStageDropdownOpen(true);
                    setStageSearch('');
                  }}
                >
                  <Text style={[styles.dropdownValue, !selectedStage && { color: colors.textSecondary }]}>
                    {selectedStage || 'Select Stage'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
                {showErrors && !selectedStage && (
                  <Text style={styles.errorText}>Stage is required</Text>
                )}
                <Modal
                  visible={isStageDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setStageDropdownOpen(false)}
                >
                  <Pressable style={styles.pickerOverlay} onPress={() => setStageDropdownOpen(false)}>
                    <View style={styles.selectionModalContainer}>
                      <View style={styles.selectionModalHeader}>
                        <Text style={styles.selectionModalTitle}>Select Stage</Text>
                        <Pressable onPress={() => setStageDropdownOpen(false)}>
                          <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                        </Pressable>
                      </View>

                      <View style={styles.pickerSearchBoxSmall}>
                        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                        <TextInput
                          style={styles.pickerSearchInputSmall}
                          placeholder="Search stage..."
                          placeholderTextColor={colors.textMuted}
                          value={stageSearch}
                          onChangeText={setStageSearch}
                        />
                      </View>

                      <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                        {filteredStages.map((stage: any) => (
                          <Pressable
                            key={stage.id}
                            style={[styles.selectionModalItem, selectedStage === stage.name && styles.selectionModalItemActive]}
                            onPress={() => {
                              setSelectedStage(stage.name);
                              setStageDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.selectionModalItemText, selectedStage === stage.name && styles.selectionModalItemTextActive]}>{stage.name}</Text>
                            {selectedStage === stage.name && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accentTeal} />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Modal>
              </View>

              {/* AI Forecast Section */}
              <View style={styles.aiForecastBox}>
                <View style={styles.aiHeader}>
                  <MaterialCommunityIcons name="robot-outline" size={20} color={colors.accentTeal} />
                  <Text style={styles.aiTitle}>AI Forecast Enabled</Text>
                </View>
                <Text style={styles.aiDescription}>
                  Zien predicts a high probability of closing based on historical data for "{selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ''}` : 'selected contact'}" and market demand for selected area.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setIsModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createBtn, isCreatingDeal && { opacity: 0.7 }]}
                onPress={handleCreateDeal}
                disabled={isCreatingDeal}
              >
                {isCreatingDeal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createBtnText}>Create Deal Pipeline</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Auto-Trigger Automations Modal */}
        <Modal
          visible={isAutoTriggerModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          statusBarTranslucent
          onRequestClose={() => setIsAutoTriggerModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Zien Automations</Text>
                <Text style={styles.modalSubtitle}>Tell Zien what to do when you move a deal.</Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setIsAutoTriggerModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {(activePipeline?.stages || []).map((stage) => {
                const item = automations.find(a => a.stage === stage.name) || {
                  id: stage.id,
                  stage: stage.name,
                  enabled: false,
                  action: 'Send Email'
                };
                return (
                  <View
                    key={stage.id}
                    style={[
                      styles.automationCard,
                      item.enabled && styles.automationCardActive
                    ]}
                  >
                    <View style={styles.automationCardMain}>
                      <View style={styles.automationInfo}>
                        <View style={styles.automationTitleRow}>
                          <View style={[styles.statusDot, { backgroundColor: item.enabled ? colors.accentTeal : colors.iconMuted }]} />
                          <Text style={styles.automationStageName}>{stage.name}</Text>
                        </View>
                        <View style={styles.automationActionRow}>
                          <Text style={styles.thenText}>Then </Text>
                          <Pressable
                            style={styles.actionSelector}
                            onPress={() => setActiveActionStageId(activeActionStageId === stage.id ? null : stage.id)}
                          >
                            <Text style={styles.actionText}>{item.action}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.accentTeal} />
                          </Pressable>

                          {activeActionStageId === stage.id && (
                            <View style={styles.actionDropdownMenu}>
                              {['Send Email', 'Create Task', 'SMS Alert', 'Internal Ping'].map((act) => (
                                <Pressable
                                  key={act}
                                  style={[
                                    styles.actionDropdownItem,
                                    item.action === act && styles.actionDropdownItemActive
                                  ]}
                                  onPress={() => updateAutomationAction(stage.name, act)}
                                >
                                  <Text style={[
                                    styles.actionDropdownText,
                                    item.action === act && styles.actionDropdownTextActive
                                  ]}>
                                    {act}
                                  </Text>
                                  {item.action === act && (
                                    <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" style={styles.actionCheck} />
                                  )}
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                      <Switch
                        value={item.enabled}
                        onValueChange={() => toggleAutomation(item.id)}
                        trackColor={{ false: colors.borderLight, true: colors.accentTeal }}
                        thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                        ios_backgroundColor={colors.borderLight}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                style={styles.saveSettingsBtn}
                onPress={handleSaveAutomations}
              >
                <Text style={styles.saveSettingsBtnText}>Save Settings</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Delete Deal Confirmation Modal */}
        <Modal
          visible={!!dealToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setDealToDelete(null)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setDealToDelete(null)}>
            <Pressable style={styles.dealDeleteModalContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.dealDeleteHeaderRow}>
                <Text style={styles.dealDeleteTitle}>Delete Deal?</Text>
                <Pressable onPress={() => setDealToDelete(null)} style={styles.dealDeleteCloseBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
              
              <Text style={styles.dealDeleteSubtitleWarning}>This action cannot be undone.</Text>
              
              <Text style={styles.dealDeleteDescription}>
                Are you sure you want to delete this deal? If your account is connected to HubSpot, the deal will also be permanently deleted from your HubSpot pipeline.
              </Text>
              
              <View style={styles.dealDeleteActionsRow}>
                <Pressable 
                  style={styles.dealDeleteCancelBtn} 
                  onPress={() => setDealToDelete(null)}
                  disabled={isDeletingDeal}
                >
                  <Text style={styles.dealDeleteCancelText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={styles.dealDeleteConfirmBtn} 
                  onPress={handleDeleteDealConfirm}
                  disabled={isDeletingDeal}
                >
                  {isDeletingDeal ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dealDeleteConfirmText}>Yes, Delete</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>


        {/* Floating Action Button */}
        <Pressable
          style={[styles.fab, { bottom: 24 + insets.bottom }]}
          onPress={() => setIsModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function getStyles(colors: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
    },
    mainScroll: {
      paddingTop: 8,
    },
    tabContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    tabsScrollContent: {
      gap: 12,
      paddingRight: 20,
    },
    pillBtn: {
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 100,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    pillBtnActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    pillBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    pillBtnTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    topActions: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    filterBtnsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    filterBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    stagesList: {
      paddingHorizontal: 20,
    },
    stageColumn: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden',
    },
    stageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    stageHeaderText: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
    },
    stageCountBadge: {
      paddingHorizontal: 10,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 28,
    },
    stageCountText: {
      fontSize: 11,
      fontWeight: '900',
    },
    stageContent: {
      gap: 12,
    },
    dealCard: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 16,
      paddingLeft: 20,
      paddingRight: 16,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    dealCardName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    dealCardAddress: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 12,
    },
    dealCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    dealCardValue: {
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    transferBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    transferBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    dealCardTime: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },
    transferMenu: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    transferMenuTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    transferOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    transferOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    transferOptionText: {
      fontSize: 11,
      fontWeight: '700',
    },
    dragPlaceholder: {
      height: 72,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.7,
    },
    dragPlaceholderText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      paddingTop: Platform.OS === 'android' ? insets.top : 0,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      maxWidth: '80%',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    modalScroll: {
      flex: 1,
    },
    modalContent: {
      padding: 24,
      paddingBottom: insets.bottom + 200,
    },
    inputGroup: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    requiredStar: {
      color: colors.danger,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
    },
    dropdownValue: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    selectionModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      width: '100%',
      height: 520,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 20,
    },
    selectionModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    selectionModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    selectionModalList: {
      paddingBottom: 24,
    },
    selectionModalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceSoft,
    },
    selectionModalItemActive: {
      backgroundColor: 'rgba(11, 160, 178, 0.05)',
    },
    selectionModalItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    selectionModalItemTextActive: {
      color: colors.accentTeal,
      fontWeight: '800',
    },
    pickerSearchBoxSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      margin: 16,
      paddingHorizontal: 12,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerSearchInputSmall: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    errorBorder: {
      borderColor: colors.danger,
    },
    errorText: {
      fontSize: 12,
      color: colors.danger,
      marginTop: 6,
      fontWeight: '500',
    },
    formDropdownMenu: {
      marginTop: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 8,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.cardShadowOpacity,
      shadowRadius: 12,
      elevation: 5,
    },
    formDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    formDropdownItemText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    valueInputWrapper: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      justifyContent: 'center',
    },
    valueInput: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    stageSelectContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    formDropdownMenuTop: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 8,
      zIndex: 1000,
    },
    customStageInputWrapper: {
      marginTop: 16,
    },
    customStageInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      fontSize: 15,
      color: colors.textPrimary,
    },
    aiForecastBox: {
      backgroundColor: colors.badgeNewBg,
      borderRadius: 20,
      padding: 20,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.badgeNewBorder,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    aiTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    aiDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 16,
    },
    cancelBtn: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    createBtn: {
      flex: 2,
      height: 56,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    createBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
    stagesPipelineSelector: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingTop: 12,
    },
    addStageInputRow: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    newStageTextInput: {
      flex: 1,
      backgroundColor: colors.inputBackground,
      height: 48,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 14,
      color: colors.textPrimary,
    },
    addStageSubmitBtn: {
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 20,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addStageSubmitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
    stageManagementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    stageManagementName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    // Manage Stages modal
    smSection: {
      marginBottom: 28,
    },
    smSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    smSectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    smCountBadge: {
      backgroundColor: colors.accentTeal,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 1,
      marginLeft: 4,
    },
    smCountBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    smPipelineSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      height: 56,
      gap: 12,
    },
    smPipelineIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.badgeNewBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smPipelineName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    smAddRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    smAddInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      height: 52,
    },
    smAddInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    smAddBtn: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    smStageList: {
      gap: 8,
    },
    smStageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    smStageLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    smStageIndex: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: colors.badgeNewBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smStageIndexText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    smStageName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    smDeleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.dangerBg || 'rgba(239,68,68,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    smEditBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: 'rgba(11, 160, 178, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smSaveBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smCancelBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smEditInput: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
    },
    smEmptyState: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 8,
    },
    smEmptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    smEmptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    saveSettingsBtn: {
      flex: 1,
      height: 56,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    saveSettingsBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
    automationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    automationCardActive: {
      borderColor: colors.badgeNewBorder,
      backgroundColor: colors.badgeNewBg,
    },
    automationCardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    automationInfo: {
      flex: 1,
    },
    automationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    automationStageName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    automationActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    thenText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    actionSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    actionDropdownMenu: {
      position: 'absolute',
      top: 24,
      left: 0,
      width: 160,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 6,
      zIndex: 2000,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    actionDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    actionDropdownItemActive: {
      backgroundColor: colors.accentTeal,
    },
    actionCheck: {
      marginLeft: 4,
    },
    actionDropdownText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    actionDropdownTextActive: {
      color: '#FFFFFF',
    },
    dealCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 4,
    },
    dealDeleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dealDeleteModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxWidth: 340,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    dealDeleteHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    dealDeleteTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    dealDeleteCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dealDeleteSubtitleWarning: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.danger || '#EF4444',
      marginBottom: 16,
    },
    dealDeleteDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 24,
    },
    dealDeleteActionsRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
    },
    dealDeleteCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    dealDeleteCancelText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    dealDeleteConfirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.danger || '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
    },
    dealDeleteConfirmText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    fab: {
      position: 'absolute',
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  });
}