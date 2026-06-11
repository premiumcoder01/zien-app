import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  addCRMAutomation,
  CRMAutomation,
  deleteCRMAutomation,
  generateCRMAutomationWithAI,
  getCRMAutomations,
  getCRMContacts,
  getCRMFollowUps,
  getCRMLeads,
  getCRMMeta,
  getCRMOverview,
  getCRMTemplates,
  updateCRMAutomation,
  updateCRMAutomationStatus
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface IntelligentFlow {
  id: string;
  title: string;
  subtitle: string;
}

const FLOWS_DATA: IntelligentFlow[] = [
  { id: '1', title: 'Instant SMS Follow-up on New Lead', subtitle: 'Boosts engagement by 40%' },
  { id: '2', title: 'Re-engage Leads after 30 days', subtitle: 'Prevents database decay' },
  { id: '3', title: 'Auto-assign Premium Leads to Senior Agents', subtitle: 'Optimizes conversion for $2M+' },
  { id: '4', title: 'Predictive Churn Prevention', subtitle: 'AI detects low-activity high-value leads' },
  { id: '5', title: 'Neighborhood Alert Workflow', subtitle: 'Syncs lead zip code with new inventory' },
];

export default function CRM_AutomationsScreen() {
  const { colors, theme } = useAppTheme();
  const { accessToken } = useAuth();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const [ruleIdentity, setRuleIdentity] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [targetSegment, setTargetSegment] = useState('All Leads');
  const [targetSegmentId, setTargetSegmentId] = useState<string | number | null>(null);
  const [targetSegmentType, setTargetSegmentType] = useState<'all' | 'group' | 'tag'>('all');
  const [segmentPickerVisible, setSegmentPickerVisible] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const [flowModalVisible, setFlowModalVisible] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<IntelligentFlow | null>(null);

  const [createRuleVisible, setCreateRuleVisible] = useState(false);
  const [triggerLogic, setTriggerLogic] = useState('New Lead Captured');
  const [executionWhen, setExecutionWhen] = useState('Immediate');
  const [automatedAction, setAutomatedAction] = useState('Send Welcome Email');
  const [activePicker, setActivePicker] = useState<'trigger' | 'execution' | 'action' | 'segment' | null>(null);

  // Edit / View states
  const [selectedRule, setSelectedRule] = useState<CRMAutomation | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [editName, setEditName] = useState('');
  const [editTrigger, setEditTrigger] = useState('');
  const [editAction, setEditAction] = useState('');
  const [editTarget, setEditTarget] = useState('All Leads');
  const [editExecution, setEditExecution] = useState('Immediate');
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [editTargetType, setEditTargetType] = useState<'all' | 'group' | 'tag'>('all');
  const [editActivePicker, setEditActivePicker] = useState<'trigger' | 'execution' | 'action' | 'segment' | null>(null);
  const [editTemplatePickerVisible, setEditTemplatePickerVisible] = useState(false);
  const [editCategory, setEditCategory] = useState('AI-Generated');
  const [editIcon, setEditIcon] = useState('Sparkles');

  // Proposed AI values state
  const [proposedName, setProposedName] = useState('');
  const [proposedTrigger, setProposedTrigger] = useState('Heat Index > 85');
  const [proposedAction, setProposedAction] = useState('Predictive Retargeting SMS');
  const [proposedReasoning, setProposedReasoning] = useState('Analyzing lead behavior patterns for this segment suggests this trigger will maximize ROI.');
  const [proposedExecution, setProposedExecution] = useState('Immediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assistantSegmentSearch, setAssistantSegmentSearch] = useState('');

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: (newRule: Omit<CRMAutomation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      addCRMAutomation(accessToken!, newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      setCreateRuleVisible(false);
      setFlowModalVisible(false);
      setAiAssistantVisible(false);
      // Reset form
      setRuleIdentity('');
      setAiPrompt('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create automation');
    }
  });

  // Fetch Automations
  const {
    data: automations = [],
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['crm-automations'],
    queryFn: () => getCRMAutomations(accessToken!),
    enabled: !!accessToken,
  });

  // Fetch Leads
  const { data: crmLeads = [], refetch: refetchLeads } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => getCRMLeads(accessToken!),
    enabled: !!accessToken,
  });

  // Fetch Follow-Ups (Completed only, matching the exact API web layout uses)
  const { data: followUps = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['crm-followups-completed'],
    queryFn: () => getCRMFollowUps(accessToken!, 'Completed'),
    enabled: !!accessToken,
  });

  // Fetch Contacts
  const { data: crmContacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: () => getCRMContacts(accessToken!),
    enabled: !!accessToken,
  });

  // Fetch Overview Stats
  const { data: crmOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['crm-overview'],
    queryFn: () => getCRMOverview(accessToken!),
    enabled: !!accessToken,
  });

  const handleRefresh = async () => {
    setManualRefreshing(true);
    await Promise.all([
      refetch(),
      refetchLeads(),
      refetchFollowUps(),
      refetchContacts(),
      refetchOverview(),
    ]).catch((err) => console.log('Refresh error:', err));
    setManualRefreshing(false);
  };

  // Fetch Meta (Groups/Tags)
  const { data: metaData } = useQuery({
    queryKey: ['crm-meta'],
    queryFn: () => getCRMMeta(accessToken!),
    enabled: !!accessToken,
  });

  // Fetch Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['crm-templates'],
    queryFn: () => getCRMTemplates(accessToken!),
    enabled: !!accessToken,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);

  const [triggerSearch, setTriggerSearch] = useState('');
  const [executionSearch, setExecutionSearch] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [segmentSearch, setSegmentSearch] = useState('');

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      updateCRMAutomationStatus(accessToken!, id, status === 1 ? 0 : 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCRMAutomation(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      setConfirmDeleteVisible(false);
      setRuleToDelete(null);
      Alert.alert('Success', 'Automation rule deleted successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete automation');
    }
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CRMAutomation> }) =>
      updateCRMAutomation(accessToken!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      setEditModalVisible(false);
      setViewModalVisible(false);
      setSelectedRule(null);
      Alert.alert('Success', 'Automation updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update automation');
    }
  });

  const SEGMENTS = [
    'All Leads',
    'High Intent Only',
    'Social Media Leads',
    'Website Direct',
    'Luxury Segment (>$2M)',
    'Cold Database'
  ];

  const TRIGGER_OPTIONS = [
    'Contact Captured',
    'Lead Captured',
    'Heat Index > 85',
    'Deal Stage Updated',
    'No Activity for 14 Days'
  ];

  const EXECUTION_OPTIONS = [
    'Immediate',
    'Wait 5 Minutes',
    'Wait 1 Hour',
    'Wait 24 Hours',
    'Wait 7 Days'
  ];

  const ACTION_OPTIONS = [
    'Send Email from Template',
    'Send Follow-up SMS',
    'Assign Agent Task',
    'Apply Contact Tag',
    'Update Lead Score'
  ];

  const filteredTriggers = useMemo(() => {
    return TRIGGER_OPTIONS.filter(opt => opt.toLowerCase().includes(triggerSearch.toLowerCase()));
  }, [triggerSearch]);

  const filteredExecutions = useMemo(() => {
    return EXECUTION_OPTIONS.filter(opt => opt.toLowerCase().includes(executionSearch.toLowerCase()));
  }, [executionSearch]);

  const filteredActions = useMemo(() => {
    return ACTION_OPTIONS.filter(opt => opt.toLowerCase().includes(actionSearch.toLowerCase()));
  }, [actionSearch]);

  const filteredSegments = useMemo(() => {
    const base = ['All Leads'];
    const groups = (metaData?.groups || []).map(g => `Group: ${g.name}`);
    const tags = (metaData?.tags || []).map(t => `Tag: ${t.name}`);
    return [...base, ...groups, ...tags].filter(opt => opt.toLowerCase().includes(segmentSearch.toLowerCase()));
  }, [metaData, segmentSearch]);

  const filteredRules = useMemo(() => {
    return (automations as CRMAutomation[]).filter(rule =>
      rule.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [automations, searchQuery]);

  const toggleRuleStatus = (id: string, currentStatus: number) => {
    toggleStatusMutation.mutate({ id, status: currentStatus });
  };

  // Dynamic stats calculation for Autonomous Impact Card
  const activeRulesCount = useMemo(() => {
    return automations.filter((r: any) => r.status === 1).length;
  }, [automations]);

  const efficiencyScore = useMemo(() => {
    return activeRulesCount > 0 ? Math.min(95 + activeRulesCount, 99) : 90;
  }, [activeRulesCount]);

  const completedFollowUpsCount = useMemo(() => {
    return followUps.length;
  }, [followUps]);

  const leadsScoredCount = useMemo(() => {
    return crmLeads.filter((l: any) => typeof l.score === 'number').length;
  }, [crmLeads]);

  const savedHours = useMemo(() => {
    return activeRulesCount > 0 ? (activeRulesCount * 1.7).toFixed(1) : '0';
  }, [activeRulesCount]);

  const formatStatValue = (val: number) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return val.toString();
  };

  const handleFlowPress = (flow: IntelligentFlow) => {
    setSelectedFlow(flow);
    setRuleIdentity(flow.title);
    setAiPrompt("Generate a workflow for: " + flow.title);
    setTargetSegment("Cold Database");
    // Dynamically set based on flow type if needed, or keep these common AI defaults
    setProposedName(flow.title);
    setProposedTrigger("Heat Index > 85");
    setProposedAction("Predictive Retargeting SMS");
    setProposedReasoning("Analyzing lead behavior patterns for this segment suggests this trigger will maximize ROI.");
    setProposedExecution("Immediate");
    setFlowModalVisible(true);
  };

  const handleGenerate = async () => {
    if (!ruleIdentity.trim()) {
      Alert.alert('Error', 'Please provide a rule identity (name)');
      return;
    }
    if (!aiPrompt.trim()) {
      Alert.alert('Error', 'Please provide prompt/instructions');
      return;
    }

    setIsGenerating(true);
    try {
      const systemInstruction = `You are an expert CRM Automation Architect. \nThe user wants to create an automation rule named "${ruleIdentity}" targeting "${targetSegment}".\nTheir instruction is: "${aiPrompt}".\n\nValid Triggers: 'New Lead Captured', 'Status Changed', 'Inactivity Threshold Met', 'Score > 80', 'Deal Stage Updated'.\nValid Actions: 'Send Follow-up SMS', 'Send Email from Template', 'Send WhatsApp from Template', 'Update Lead Score', 'Assign Agent Task'.\nValid Executions: 'Immediate', 'Wait 1 Hour', 'Wait 24 Hours', 'Wait 3 Days'.\n\nBased on the prompt, generate a JSON object with EXACTLY the following fields:\n1. "name": A catchy name for this rule (max 40 chars).\n2. "trigger": One of the valid triggers that best fits.\n3. "action": One of the valid actions that best fits.\n4. "target": The exact string "${targetSegment}".\n5. "execution": One of the valid execution times.\n6. "reasoning": A 1-2 sentence explanation of why this automation logic is effective.`;

      const response = await generateCRMAutomationWithAI(accessToken!, aiPrompt, systemInstruction);

      let cleanResult = response.result.trim();
      if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```(json)?/, '');
        cleanResult = cleanResult.replace(/```$/, '');
        cleanResult = cleanResult.trim();
      }

      const parsed = JSON.parse(cleanResult);

      setProposedName(parsed.name || ruleIdentity);
      setProposedTrigger(parsed.trigger || 'New Lead Captured');
      setProposedAction(parsed.action || 'Send Follow-up SMS');
      setProposedReasoning(parsed.reasoning || '');
      setProposedExecution(parsed.execution || 'Immediate');

      if (parsed.target) {
        setTargetSegment(parsed.target);
      }

      setAiAssistantVisible(false);
      setFlowModalVisible(true);
    } catch (error: any) {
      Alert.alert('AI Generation Error', error.message || 'Failed to generate automation rule');
    } finally {
      setIsGenerating(false);
    }
  };

  const deployAutomation = () => {
    addMutation.mutate({
      name: proposedName || ruleIdentity || "Auto-assign Premium Leads to Senior Agents",
      trigger: proposedTrigger,
      action: proposedAction,
      target: targetSegment,
      execution: proposedExecution,
      reasoning: proposedReasoning,
      category: "AI-Generated",
      icon: "Sparkles",
      status: 1,
      target_id: null,
      template_id: null
    });
  };

  const handleCreateSave = () => {
    if (!ruleIdentity.trim()) {
      Alert.alert('Error', 'Please provide a rule identity (name)');
      return;
    }

    addMutation.mutate({
      name: ruleIdentity,
      trigger: triggerLogic,
      action: automatedAction === 'Send Email from Template' ? `Email: ${selectedTemplateId}` : automatedAction,
      status: 1,
      category: 'Manual',
      target: targetSegment,
      // Pass ID and Type if the backend supports it, otherwise name is fine
      target_id: targetSegmentId?.toString() || null,
      execution: executionWhen,
      icon: 'Lightning',
      template_id: automatedAction === 'Send Email from Template' ? selectedTemplateId : null
    });
  };

  const handleDeletePress = (id: string) => {
    setRuleToDelete(id);
    setConfirmDeleteVisible(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete);
    }
  };

  const renderRuleItem = (rule: CRMAutomation) => {
    const isActive = rule.status === 1;

    // Map icon names from API to MaterialCommunityIcons
    const getIconName = (name: string): any => {
      switch (name) {
        case 'Sparkles': return 'flare';
        case 'Bot': return 'robot-outline';
        case 'AccountPlus': return 'account-plus-outline';
        case 'Clock': return 'clock-outline';
        case 'Lightning': return 'lightning-bolt-outline';
        default: return 'cellphone';
      }
    };

    // Color definitions matching the mock design
    const iconBgColor = '#FFEFE6';
    const iconColor = '#FF6B00';

    return (
      <View key={rule.id} style={styles.horizontalCard}>
        {/* TOP ROW: Icon + Rule Name */}
        <View style={styles.horizontalCardTopRow}>
          {/* Left: Peach Square Icon Box */}
          <View style={styles.horizontalCardIconBox}>
            <MaterialCommunityIcons name={getIconName(rule.icon)} size={20} color={iconColor} />
          </View>

          {/* Middle: Title/Identity */}
          <View style={styles.horizontalCardInfo}>
            <Text style={styles.horizontalCardTitle} numberOfLines={2}>
              {rule.name}
            </Text>
          </View>
        </View>

        {/* MIDDLE ROW: Timing & Segment Badge Pills */}
        <View style={styles.horizontalCardMiddleRow}>
          {/* Timing */}
          <View style={styles.horizontalCardMetaItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" />
            <Text style={styles.horizontalCardMetaText} numberOfLines={1}>
              {rule.execution}
            </Text>
          </View>

          {/* Target Segment */}
          <View style={styles.horizontalCardMetaItem}>
            <MaterialCommunityIcons name="target" size={14} color="#64748B" />
            <Text style={styles.horizontalCardMetaText} numberOfLines={1}>
              {rule.target}
            </Text>
          </View>
        </View>

        {/* STATUS BADGE ROW */}
        <Pressable
          style={[
            styles.horizontalCardStatusRow,
            {
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(148, 163, 184, 0.06)',
              borderColor: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.12)',
            }
          ]}
          onPress={() => toggleRuleStatus(rule.id, rule.status)}
          disabled={toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === rule.id}
        >
          {toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === rule.id ? (
            <ActivityIndicator size="small" color={isActive ? '#10B981' : '#94A3B8'} />
          ) : (
            <>
              <View style={[styles.horizontalCardStatusDot, { backgroundColor: isActive ? '#10B981' : '#94A3B8' }]} />
              <Text style={[styles.horizontalCardStatusText, { color: isActive ? '#10B981' : '#94A3B8' }]}>
                {isActive ? 'ACTIVE' : 'PAUSED'}
              </Text>
            </>
          )}
        </Pressable>

        {/* BOTTOM ROW: Dynamic Actions Row */}
        <View style={styles.horizontalCardActionsRow}>
          {/* View Details */}
          <Pressable
            style={styles.horizontalCardActionBtn}
            onPress={() => {
              setSelectedRule(rule);
              setViewModalVisible(true);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="eye-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.horizontalCardActionBtnText}>View</Text>
          </Pressable>

          {/* Modify */}
          <Pressable
            style={styles.horizontalCardActionBtn}
            onPress={() => {
              setSelectedRule(rule);
              setEditName(rule.name);
              setEditTrigger(rule.trigger);
              setEditAction(rule.action);
              setEditTarget(rule.target);
              setEditExecution(rule.execution);
              setEditTargetId(rule.target_id?.toString() || null);
              setEditTemplateId(rule.template_id || null);
              setEditCategory(rule.category || 'AI-Generated');
              setEditIcon(rule.icon || 'Sparkles');
              if (rule.target.startsWith('Group:')) {
                setEditTargetType('group');
              } else if (rule.target.startsWith('Tag:')) {
                setEditTargetType('tag');
              } else {
                setEditTargetType('all');
              }
              setEditModalVisible(true);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#0EA5E9" />
            <Text style={styles.horizontalCardActionBtnText}>Modify</Text>
          </Pressable>

          {/* Delete */}
          <Pressable
            style={[styles.horizontalCardActionBtn, styles.deleteActionBtn]}
            onPress={() => handleDeletePress(rule.id)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="delete-outline" size={16} color="#EF4444" />
            <Text style={[styles.horizontalCardActionBtnText, styles.deleteActionBtnText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <PageHeader
        title="Automations Rules"
        subtitle="Transform your contact database into an autonomous conversion engine."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor="#0a2341" />
        }
      >
        {/* Floating Action Area */}
        <View style={styles.floatingActionArea}>
          <Pressable
            style={styles.floatingAiBtn}
            onPress={() => setAiAssistantVisible(true)}
          >
            <LinearGradient
              colors={['#0a2341', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingAiGradient}
            >
              <MaterialCommunityIcons name="creation" size={18} color="#FFFFFF" />
              <Text style={styles.floatingAiText}>AI Rule</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.floatingCreateBtn}
            onPress={() => setCreateRuleVisible(true)}
          >
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.floatingCreateGradient}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.floatingCreateText}>Create Rule</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Search Bar Modernized */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search automation rules..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Rules List */}
        <View style={styles.rulesList}>
          {isLoading && !isRefetching ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0a2341" />
              <Text style={styles.loadingText}>Fetching intelligence flows...</Text>
            </View>
          ) : filteredRules.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No automation rules found</Text>
              <Text style={styles.emptySubtext}>Create one or use Zien Assistant to get started.</Text>
            </View>
          ) : (
            filteredRules.map(renderRuleItem)
          )}
        </View>

        {/* Autonomous Impact Card */}
        <View style={styles.impactCard}>
          <Text style={[styles.impactTitle, { color: '#FFFFFF' }]}>Autonomous Impact</Text>
          <Text style={styles.impactScore}>Efficiency score: {efficiencyScore}%</Text>

          <View style={styles.impactStatsRow}>
            <View style={styles.impactStatBox}>
              <Text style={styles.impactStatValue}>{formatStatValue(completedFollowUpsCount)}</Text>
              <Text style={styles.impactStatLabel}>FOLLOW-UPS SENT</Text>
            </View>
            <View style={styles.impactStatBox}>
              <Text style={styles.impactStatValue}>{formatStatValue(leadsScoredCount)}</Text>
              <Text style={styles.impactStatLabel}>LEADS SCORED</Text>
            </View>
          </View>

          <View style={styles.aiInsightBox}>
            <Text style={styles.aiInsightText}>
              <Text style={{ fontWeight: '900' }}>AI Insight:</Text> Your active rules are saving {savedHours} hrs/week.
            </Text>
          </View>
        </View>

        {/* Intelligent CRM Flows */}
        <View style={styles.flowsSection}>
          <Text style={styles.sectionTitle}>Intelligent CRM Flows</Text>
          {FLOWS_DATA.map(flow => (
            <Pressable
              key={flow.id}
              style={styles.flowRow}
              onPress={() => handleFlowPress(flow)}
            >
              <View style={styles.flowIconBox}>
                <MaterialCommunityIcons name="dots-hexagon" size={20} color={colors.accent} />
              </View>
              <View style={styles.flowInfo}>
                <Text style={styles.flowTitle}>{flow.title}</Text>
                <Text style={styles.flowSubtitle}>{flow.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="plus" size={20} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Zien Assistant Modal - Full Page */}
      <Modal
        visible={aiAssistantVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setAiAssistantVisible(false)}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.fullModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.assistantModalContent}>
              {/* Top Form Section - Flexible */}
              <View style={{ flex: 1 }}>
                <View style={styles.assistantHeader}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={styles.assistantTitle}>Zien Assistant</Text>
                    <Text style={styles.assistantSubtitle}>Define your business objective via neural core.</Text>
                  </View>
                  <Pressable
                    style={styles.closeBtnSmall}
                    onPress={() => setAiAssistantVisible(false)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={true}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  <View style={styles.assistantField}>
                    <Text style={styles.fieldLabel}>RULE IDENTITY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. VIP Concierge Follow-up"
                        placeholderTextColor="#94A3B8"
                        value={ruleIdentity}
                        onChangeText={setRuleIdentity}
                      />
                    </View>
                  </View>

                  <View style={styles.assistantField}>
                    <Text style={styles.fieldLabel}>TARGET SEGMENT</Text>
                    <Pressable
                      style={styles.segmentPickerTrigger}
                      onPress={() => { setSegmentPickerVisible(true); setAssistantSegmentSearch(''); }}
                    >
                      <Text style={styles.segmentValue}>{targetSegment}</Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={20}
                        color={colors.textPrimary}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.assistantField}>
                    <Text style={styles.fieldLabel}>PROMPT / INSTRUCTIONS <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <View style={styles.textareaContainer}>
                      <TextInput
                        style={styles.textarea}
                        placeholder="e.g. Send a personalized SMS to new leads within 5 minutes, wait 2 days, and if they don't respond, send an email template."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        value={aiPrompt}
                        onChangeText={setAiPrompt}
                      />
                    </View>
                  </View>
                </ScrollView>
              </View>

              {/* Bottom Footer - Fixed */}
              <View style={styles.modalFooter}>
                <Pressable
                  style={[
                    styles.generateBtn,
                    { opacity: (isGenerating || !ruleIdentity.trim() || !aiPrompt.trim()) ? 0.5 : 1 }
                  ]}
                  onPress={handleGenerate}
                  disabled={isGenerating || !ruleIdentity.trim() || !aiPrompt.trim()}
                >
                  <LinearGradient
                    colors={['#475569', '#1E293B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.generateBtnGradient}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.generateBtnText}>Generate</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Segment Picker Overlay for Zien Assistant */}
              {segmentPickerVisible && (
                <View style={styles.pickerOverlayAbsolute}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => setSegmentPickerVisible(false)} />

                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Target Segment</Text>
                      <Pressable onPress={() => setSegmentPickerVisible(false)}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput
                        style={styles.pickerSearchInputSmall}
                        placeholder="Search segment..."
                        placeholderTextColor={colors.textMuted}
                        value={assistantSegmentSearch}
                        onChangeText={setAssistantSegmentSearch}
                      />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {SEGMENTS.filter(opt => opt.toLowerCase().includes(assistantSegmentSearch.toLowerCase())).map(segment => {
                        const isActive = targetSegment === segment;
                        return (
                          <Pressable
                            key={segment}
                            style={[styles.selectionModalItem, isActive && styles.selectionModalItemActive]}
                            onPress={() => {
                              setTargetSegment(segment);
                              setSegmentPickerVisible(false);
                              setAssistantSegmentSearch('');
                            }}
                          >
                            <Text style={[styles.selectionModalItemText, isActive && styles.selectionModalItemTextActive]}>
                              {segment}
                            </Text>
                            {isActive && (
                              <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {/* Create Rules Modal - Full Page */}
      <Modal
        visible={createRuleVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setCreateRuleVisible(false)}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.fullModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.assistantModalContent}>
            {/* Top Section - Form */}
            <View style={{ flex: 1 }}>
              <View style={styles.assistantHeader}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.assistantTitle}>Create Rules</Text>
                  <Text style={styles.assistantSubtitle}>Define your automation logic with precision.</Text>
                </View>
                <Pressable
                  style={styles.closeBtnSmall}
                  onPress={() => setCreateRuleVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {/* Rule Identity */}
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>RULE IDENTITY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. VIP Concierge Follow-up"
                      placeholderTextColor="#94A3B8"
                      value={ruleIdentity}
                      onChangeText={setRuleIdentity}
                    />
                  </View>
                </View>

                {/* Trigger Logic */}
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>TRIGGER LOGIC (IF) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setActivePicker('trigger'); setTriggerSearch(''); }}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>{triggerLogic}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Execution Timing */}
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>EXECUTION (WHEN) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setActivePicker('execution'); setExecutionSearch(''); }}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>{executionWhen}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Action */}
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>AUTOMATED ACTION (THEN) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setActivePicker('action'); setActionSearch(''); }}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>{automatedAction}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Template Specific Picker (if Email from Template selected) */}
                {automatedAction === 'Send Email from Template' && (
                  <View style={styles.assistantField}>
                    <Text style={styles.fieldLabel}>EMAIL TEMPLATE <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <Pressable
                      style={styles.segmentPickerTrigger}
                      onPress={() => setTemplatePickerVisible(true)}
                    >
                      <Text style={styles.segmentValue} numberOfLines={1}>
                        {templates.find(t => t.id === selectedTemplateId)?.name || 'Choose...'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                )}

                {/* Target Segment */}
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>TARGET SEGMENT <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setActivePicker('segment'); setSegmentSearch(''); }}
                  >
                    <Text style={styles.segmentValue}>{targetSegment}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </ScrollView>
            </View>

            {/* Modal Footer Actions */}
            <View style={styles.createModalFooter}>
              <Pressable
                style={styles.discardBtn}
                onPress={() => setCreateRuleVisible(false)}
              >
                <Text style={styles.discardBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveRuleBtn}
                onPress={handleCreateSave}
              >
                {addMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveRuleBtnText}>Save</Text>
                )}
              </Pressable>
            </View>

            {/* Selector Overlay Inside the Modal (rendered absolutely over the Modal contents) */}
            {(activePicker !== null || templatePickerVisible) && (
              <View style={styles.pickerOverlayAbsolute}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => { setActivePicker(null); setTemplatePickerVisible(false); }} />

                {activePicker === 'trigger' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Trigger</Text>
                      <Pressable onPress={() => setActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search trigger..." placeholderTextColor={colors.textMuted} value={triggerSearch} onChangeText={setTriggerSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredTriggers.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, triggerLogic === opt && styles.selectionModalItemActive]} onPress={() => { setTriggerLogic(opt); setActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, triggerLogic === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {triggerLogic === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {activePicker === 'execution' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Timing</Text>
                      <Pressable onPress={() => setActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search timing..." placeholderTextColor={colors.textMuted} value={executionSearch} onChangeText={setExecutionSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredExecutions.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, executionWhen === opt && styles.selectionModalItemActive]} onPress={() => { setExecutionWhen(opt); setActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, executionWhen === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {executionWhen === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {activePicker === 'action' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Action</Text>
                      <Pressable onPress={() => setActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search action..." placeholderTextColor={colors.textMuted} value={actionSearch} onChangeText={setActionSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredActions.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, automatedAction === opt && styles.selectionModalItemActive]} onPress={() => { setAutomatedAction(opt); setActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, automatedAction === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {automatedAction === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {templatePickerVisible && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Template</Text>
                      <Pressable onPress={() => setTemplatePickerVisible(false)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {templates.map(t => (
                        <Pressable key={t.id} style={[styles.selectionModalItem, selectedTemplateId === t.id && styles.selectionModalItemActive]} onPress={() => { setSelectedTemplateId(t.id); setTemplatePickerVisible(false); }}>
                          <Text style={[styles.selectionModalItemText, selectedTemplateId === t.id && styles.selectionModalItemTextActive]}>{t.name}</Text>
                          {selectedTemplateId === t.id && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {activePicker === 'segment' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Segment</Text>
                      <Pressable onPress={() => setActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search segment..." placeholderTextColor={colors.textMuted} value={segmentSearch} onChangeText={setSegmentSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      <Pressable style={[styles.selectionModalItem, targetSegment === 'All Leads' && styles.selectionModalItemActive]} onPress={() => { setTargetSegment('All Leads'); setTargetSegmentId(null); setTargetSegmentType('all'); setActivePicker(null); }}>
                        <Text style={[styles.selectionModalItemText, targetSegment === 'All Leads' && styles.selectionModalItemTextActive]}>All Leads</Text>
                        {targetSegment === 'All Leads' && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                      </Pressable>

                      {metaData?.groups && metaData.groups.length > 0 && (
                        <View style={styles.dropdownCategory}>
                          <Text style={styles.dropdownCategoryText}>Groups</Text>
                          {metaData.groups.map(group => (
                            <Pressable key={`group-${group.id}`} style={[styles.selectionModalItem, targetSegmentId === group.id && targetSegmentType === 'group' && styles.selectionModalItemActive]} onPress={() => { setTargetSegment(`Group: ${group.name}`); setTargetSegmentId(group.id); setTargetSegmentType('group'); setActivePicker(null); }}>
                              <Text style={[styles.selectionModalItemText, targetSegmentId === group.id && targetSegmentType === 'group' && styles.selectionModalItemTextActive]}>{group.name}</Text>
                              {targetSegmentId === group.id && targetSegmentType === 'group' && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {metaData?.tags && metaData.tags.length > 0 && (
                        <View style={styles.dropdownCategory}>
                          <Text style={styles.dropdownCategoryText}>Tags</Text>
                          {metaData.tags.map(tag => (
                            <Pressable key={`tag-${tag.id}`} style={[styles.selectionModalItem, targetSegmentId === tag.id && targetSegmentType === 'tag' && styles.selectionModalItemActive]} onPress={() => { setTargetSegment(`Tag: ${tag.name}`); setTargetSegmentId(tag.id); setTargetSegmentType('tag'); setActivePicker(null); }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tag.tag_color }} />
                                <Text style={[styles.selectionModalItemText, targetSegmentId === tag.id && targetSegmentType === 'tag' && styles.selectionModalItemTextActive]}>{tag.name}</Text>
                              </View>
                              {targetSegmentId === tag.id && targetSegmentType === 'tag' && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {/* Flow Proposal Modal - Bottom Sheet */}
      <Modal
        visible={flowModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFlowModalVisible(false)}
      >
        <Pressable
          style={styles.bottomOverlay}
          onPress={() => setFlowModalVisible(false)}
        >
          <Pressable
            style={[styles.flowProposalModal, { paddingBottom: insets.bottom + 24 }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.proposalHeader}>
              <View>
                <Text style={styles.assistantTitle}>Zien Assistant</Text>
                <Text style={styles.assistantSubtitle}>Define your business objective via neural core.</Text>
              </View>
              <Pressable
                style={styles.closeBtnSmall}
                onPress={() => setFlowModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.intelligenceBox}>
              <View style={styles.proposedBadge}>
                <MaterialCommunityIcons name="check" size={14} color={colors.accent} />
                <Text style={styles.proposedBadgeText}>INTELLIGENCE PROPOSED</Text>
              </View>

              <View style={styles.proposalDetailRow}>
                <Text style={styles.proposalLabel}>NAME:</Text>
                <Text style={styles.proposalValue}>{proposedName || ruleIdentity}</Text>
              </View>

              <View style={styles.proposalDetailRow}>
                <Text style={styles.proposalLabel}>TRIGGER:</Text>
                <Text style={styles.proposalValue}>{proposedTrigger}</Text>
              </View>

              <View style={styles.proposalDetailRow}>
                <Text style={styles.proposalLabel}>ACTION:</Text>
                <Text style={styles.proposalValue}>{proposedAction}</Text>
              </View>

              <View style={styles.proposalDetailRow}>
                <Text style={styles.proposalLabel}>SEGMENT:</Text>
                <Text style={styles.proposalValue}>{targetSegment}</Text>
              </View>

              <View style={styles.proposalDetailRow}>
                <Text style={styles.proposalLabel}>TIMING:</Text>
                <Text style={styles.proposalValue}>{proposedExecution}</Text>
              </View>

              <View style={styles.logicDivider} />
              <Text style={styles.logicLabel}>Logic: <Text style={{ fontStyle: 'italic', color: colors.inputPlaceholder }}>"{proposedReasoning}"</Text></Text>
            </View>

            <View style={styles.proposalFooter}>
              <Pressable
                style={styles.deployBtn}
                onPress={deployAutomation}
              >
                {addMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deployBtnText}>Deploy Automation</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.refineBtn}
                onPress={() => {
                  setFlowModalVisible(false);
                  const ruleName = selectedFlow?.title || "Auto-assign Premium Leads to Senior Agents";
                  setRuleIdentity(ruleName);
                  setAiPrompt("Generate a workflow for: " + ruleName);
                  setTargetSegment("Cold Database");
                  setAiAssistantVisible(true);
                }}
              >
                <Text style={styles.refineBtnText}>Refine Prompt</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.trashCircle}>
              <MaterialCommunityIcons name="trash-can-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Rule?</Text>
            <Text style={styles.confirmSubtitle}>
              This will permanently remove this automation rule. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setConfirmDeleteVisible(false)} disabled={deleteMutation.isPending}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── VIEW / PREVIEW AUTOMATION MODAL ── */}
      <Modal
        visible={viewModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setViewModalVisible(false); setSelectedRule(null); }}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.fullModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.assistantModalContent}>
            {/* Badges and Close button header */}
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalBadges}>
                <View style={styles.viewModalCategoryBadge}>
                  <Text style={styles.viewModalCategoryText}>
                    {selectedRule?.category?.toUpperCase() || 'AI-GENERATED'}
                  </Text>
                </View>
                <View style={[
                  styles.viewModalStatusBadge,
                  {
                    backgroundColor: selectedRule?.status === 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                    borderWidth: 1,
                    borderColor: selectedRule?.status === 1 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.15)'
                  }
                ]}>
                  <Text style={[
                    styles.viewModalStatusText,
                    {
                      color: selectedRule?.status === 1 ? '#10B981' : '#94A3B8',
                      fontWeight: '800'
                    }
                  ]}>
                    {selectedRule?.status === 1 ? 'ACTIVE' : 'PAUSED'}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.viewModalCloseBtn}
                onPress={() => { setViewModalVisible(false); setSelectedRule(null); }}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Title / Identity */}
            <Text style={styles.viewModalTitle}>{selectedRule?.name}</Text>

            {/* Logic Box (Trigger -> Action) */}
            <View style={styles.viewModalLogicBox}>
              <View style={styles.viewModalLogicStep}>
                <Text style={styles.viewModalLogicLabel}>IF (TRIGGER)</Text>
                <Text style={styles.viewModalLogicValue}>{selectedRule?.trigger}</Text>
              </View>
              <View style={styles.viewModalDivider} />
              <View style={styles.viewModalLogicStep}>
                <Text style={styles.viewModalLogicLabel}>THEN (ACTION)</Text>
                <Text style={styles.viewModalLogicValue}>{selectedRule?.action}</Text>
              </View>
            </View>

            {/* Target Segment & Timing Columns */}
            <View style={styles.viewModalMetadataRow}>
              <View style={styles.viewModalMetadataCol}>
                <Text style={styles.viewModalLogicLabel}>TARGET SEGMENT</Text>
                <Text style={styles.viewModalMetadataValue}>{selectedRule?.target}</Text>
              </View>
              <View style={styles.viewModalMetadataCol}>
                <Text style={styles.viewModalLogicLabel}>EXECUTION LAG</Text>
                <Text style={styles.viewModalMetadataValue}>{selectedRule?.execution}</Text>
              </View>
            </View>

            {/* Actions: Close / Modify */}
            <View style={styles.viewModalActionsRow}>
              <Pressable
                style={styles.viewModalCancelBtn}
                onPress={() => { setViewModalVisible(false); setSelectedRule(null); }}
              >
                <Text style={styles.viewModalCancelBtnText}>Close</Text>
              </Pressable>

              <Pressable
                style={styles.viewModalModifyBtn}
                onPress={() => {
                  if (selectedRule) {
                    const rule = selectedRule;
                    // Transition to edit modal
                    setViewModalVisible(false);
                    setEditName(rule.name);
                    setEditTrigger(rule.trigger);
                    setEditAction(rule.action);
                    setEditTarget(rule.target);
                    setEditExecution(rule.execution);
                    setEditTargetId(rule.target_id?.toString() || null);
                    setEditTemplateId(rule.template_id || null);
                    setEditCategory(rule.category || 'AI-Generated');
                    setEditIcon(rule.icon || 'Sparkles');
                    // Detect target type
                    if (rule.target.startsWith('Group:')) {
                      setEditTargetType('group');
                    } else if (rule.target.startsWith('Tag:')) {
                      setEditTargetType('tag');
                    } else {
                      setEditTargetType('all');
                    }
                    setTimeout(() => {
                      setEditModalVisible(true);
                    }, 300);
                  }
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.viewModalModifyBtnText}>Modify</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Modal>

      {/* ── EDIT / MODIFY AUTOMATION MODAL ── */}
      <Modal
        visible={editModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setEditModalVisible(false); setSelectedRule(null); }}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.fullModalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.assistantModalContent}>
            {/* Header */}
            <View style={styles.assistantHeader}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.assistantTitle}>Modify Rule</Text>
                <Text style={styles.assistantSubtitle}>Define your automation logic with precision.</Text>
              </View>
              <Pressable
                style={styles.closeBtnSmall}
                onPress={() => { setEditModalVisible(false); setSelectedRule(null); }}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} style={{ flex: 1 }}>
              {/* Rule Identity */}
              <View style={styles.assistantField}>
                <Text style={styles.fieldLabel}>RULE IDENTITY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. VIP Concierge Follow-up"
                    placeholderTextColor="#94A3B8"
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>
              </View>

              {/* Trigger Logic & Execution When - Columns */}
              <View style={styles.editModalTwoColRow}>
                <View style={[styles.assistantField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>TRIGGER LOGIC (IF) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setEditActivePicker('trigger'); setTriggerSearch(''); }}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>{editTrigger}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={[styles.assistantField, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.fieldLabel}>EXECUTION (WHEN) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => { setEditActivePicker('execution'); setExecutionSearch(''); }}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>{editExecution}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              {/* Automated Action */}
              <View style={styles.assistantField}>
                <Text style={styles.fieldLabel}>AUTOMATED ACTION (THEN) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <Pressable
                  style={styles.segmentPickerTrigger}
                  onPress={() => { setEditActivePicker('action'); setActionSearch(''); }}
                >
                  <Text style={styles.segmentValue} numberOfLines={1}>{editAction}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Email Template Specific Selector */}
              {editAction === 'Send Email from Template' && (
                <View style={styles.assistantField}>
                  <Text style={styles.fieldLabel}>EMAIL TEMPLATE <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.segmentPickerTrigger}
                    onPress={() => setEditTemplatePickerVisible(true)}
                  >
                    <Text style={styles.segmentValue} numberOfLines={1}>
                      {templates.find(t => t.id === editTemplateId)?.name || 'Choose...'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>
              )}

              {/* Target Segment */}
              <View style={styles.assistantField}>
                <Text style={styles.fieldLabel}>TARGET SEGMENT <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <Pressable
                  style={styles.segmentPickerTrigger}
                  onPress={() => { setEditActivePicker('segment'); setSegmentSearch(''); }}
                >
                  <Text style={styles.segmentValue} numberOfLines={1}>{editTarget}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </ScrollView>

            {/* Actions: Cancel / Save Rule */}
            <View style={styles.viewModalActionsRow}>
              <Pressable
                style={styles.viewModalCancelBtn}
                onPress={() => { setEditModalVisible(false); setSelectedRule(null); }}
              >
                <Text style={styles.viewModalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.editModalSaveBtn}
                onPress={() => {
                  if (!editName.trim()) {
                    Alert.alert('Error', 'Please provide a rule identity (name)');
                    return;
                  }
                  if (editAction === 'Send Email from Template' && !editTemplateId) {
                    Alert.alert('Error', 'Please select an email template');
                    return;
                  }

                  const payload: Partial<CRMAutomation> = {
                    name: editName,
                    trigger: editTrigger,
                    action: editAction === 'Send Email from Template' ? `Email: ${editTemplateId}` : editAction,
                    target: editTarget,
                    target_id: editTargetId,
                    template_id: editTemplateId,
                    execution: editExecution,
                    category: editCategory,
                    icon: editIcon,
                  };

                  editMutation.mutate({
                    id: selectedRule!.id,
                    payload
                  });
                }}
              >
                {editMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editModalSaveBtnText}>Save Rule</Text>
                )}
              </Pressable>
            </View>
            {/* Edit Modal Pickers (rendered inline as absolute overlay to avoid breaking dark mode / nested modal issues) */}
            {(editActivePicker !== null || editTemplatePickerVisible) && (
              <View style={styles.pickerOverlayAbsolute}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => { setEditActivePicker(null); setEditTemplatePickerVisible(false); }} />

                {editActivePicker === 'trigger' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Trigger</Text>
                      <Pressable onPress={() => setEditActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search trigger..." placeholderTextColor={colors.textMuted} value={triggerSearch} onChangeText={setTriggerSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredTriggers.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, editTrigger === opt && styles.selectionModalItemActive]} onPress={() => { setEditTrigger(opt); setEditActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, editTrigger === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {editTrigger === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {editActivePicker === 'execution' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Timing</Text>
                      <Pressable onPress={() => setEditActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search timing..." placeholderTextColor={colors.textMuted} value={executionSearch} onChangeText={setExecutionSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredExecutions.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, editExecution === opt && styles.selectionModalItemActive]} onPress={() => { setEditExecution(opt); setEditActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, editExecution === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {editExecution === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {editActivePicker === 'action' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Action</Text>
                      <Pressable onPress={() => setEditActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search action..." placeholderTextColor={colors.textMuted} value={actionSearch} onChangeText={setActionSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredActions.map(opt => (
                        <Pressable key={opt} style={[styles.selectionModalItem, editAction === opt && styles.selectionModalItemActive]} onPress={() => { setEditAction(opt); setEditActivePicker(null); }}>
                          <Text style={[styles.selectionModalItemText, editAction === opt && styles.selectionModalItemTextActive]}>{opt}</Text>
                          {editAction === opt && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {editTemplatePickerVisible && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Email Template</Text>
                      <Pressable onPress={() => setEditTemplatePickerVisible(false)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {templates.map(t => (
                        <Pressable key={t.id} style={[styles.selectionModalItem, editTemplateId === t.id && styles.selectionModalItemActive]} onPress={() => { setEditTemplateId(t.id); setEditTemplatePickerVisible(false); }}>
                          <Text style={[styles.selectionModalItemText, editTemplateId === t.id && styles.selectionModalItemTextActive]}>{t.name}</Text>
                          {editTemplateId === t.id && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {editActivePicker === 'segment' && (
                  <View style={styles.selectionModalContainer}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Target Segment</Text>
                      <Pressable onPress={() => setEditActivePicker(null)}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></Pressable>
                    </View>
                    <View style={styles.pickerSearchBoxSmall}>
                      <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                      <TextInput style={styles.pickerSearchInputSmall} placeholder="Search segment..." placeholderTextColor={colors.textMuted} value={segmentSearch} onChangeText={setSegmentSearch} />
                    </View>
                    <ScrollView style={styles.selectionModalList} keyboardShouldPersistTaps="handled">
                      {filteredSegments.map(opt => {
                        const isGroup = opt.startsWith('Group:');
                        const isTag = opt.startsWith('Tag:');
                        let targetId: string | number | null = null;
                        let targetType: 'all' | 'group' | 'tag' = 'all';

                        if (isGroup) {
                          const gName = opt.replace('Group: ', '');
                          targetId = metaData?.groups?.find(g => g.name === gName)?.id || null;
                          targetType = 'group';
                        } else if (isTag) {
                          const tName = opt.replace('Tag: ', '');
                          targetId = metaData?.tags?.find(t => t.name === tName)?.id || null;
                          targetType = 'tag';
                        }

                        const isActiveSegment = editTarget === opt;

                        return (
                          <Pressable
                            key={opt}
                            style={[styles.selectionModalItem, isActiveSegment && styles.selectionModalItemActive]}
                            onPress={() => {
                              setEditTarget(opt);
                              setEditTargetId(targetId ? targetId.toString() : null);
                              setEditTargetType(targetType);
                              setEditActivePicker(null);
                            }}
                          >
                            <Text style={[styles.selectionModalItemText, isActiveSegment && styles.selectionModalItemTextActive]}>{opt}</Text>
                            {isActiveSegment && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any, theme?: string) {
  const isDark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    floatingActionArea: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    floatingAiBtn: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    floatingAiGradient: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    floatingAiText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    floatingCreateBtn: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    floatingCreateGradient: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    floatingCreateText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    searchSection: {
      marginBottom: 24,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rulesList: {
      gap: 16,
      marginBottom: 24,
    },
    modernRuleCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    cardSidebar: {
      width: 6,
    },
    modernCardContent: {
      flex: 1,
      padding: 16,
    },
    modernCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    ruleIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(100, 116, 139, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    ruleTitleContainer: {
      flex: 1,
    },
    modernRuleName: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    ruleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ruleCategoryText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#CBD5E1',
      marginHorizontal: 6,
    },
    ruleSourceText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(100, 116, 139, 0.05)',
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusPillText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    ruleDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    ruleActions: {
      flexDirection: 'row',
      gap: 8,
    },
    cardActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(100, 116, 139, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteActionBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    impactCard: {
      backgroundColor: '#0a2341',
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    impactTitle: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 4,
      color: '#FFFFFF',
    },
    impactScore: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '600',
      marginBottom: 24,
    },
    impactStatsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    impactStatBox: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    impactStatValue: {
      fontSize: 24,
      fontWeight: '900',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    impactStatLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: 'rgba(255, 255, 255, 0.7)',
      letterSpacing: 0.5,
    },
    aiInsightBox: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: 12,
      borderRadius: 12,
    },
    aiInsightText: {
      fontSize: 12,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    flowsSection: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    flowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    flowIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(11, 160, 178, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    flowInfo: {
      flex: 1,
    },
    flowTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    flowSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    fullModalContainer: {
      flex: 1,
    },
    assistantModalContent: {
      flex: 1,
      padding: 24,
    },
    assistantHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
    },
    assistantTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    assistantSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
      marginTop: 2,
    },
    closeBtnSmall: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    assistantField: {
      marginBottom: 18,
    },
    fieldLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    inputContainer: {
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.05)',
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 50,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(100, 116, 139, 0.1)',
    },
    fieldInput: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    textareaContainer: {
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.05)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(100, 116, 139, 0.1)',
    },
    textarea: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlignVertical: 'top',
      flex: 1,
    },
    segmentPickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.05)',
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 50,
      borderWidth: 1,
      borderColor: colors.cardBorder || 'rgba(100, 116, 139, 0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    segmentValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    segmentDropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 1000,
    },
    segmentOption: {
      padding: 12,
      borderRadius: 12,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    optionTextSelected: {
      color: colors.accent,
      fontWeight: '800',
    },
    modalFooter: {
      paddingTop: 16,
    },
    generateBtn: {
      height: 58,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 10,
    },
    generateBtnGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    generateBtnText: {
      fontSize: 17,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    createModalFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 16,
    },
    dropdownCategory: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    dropdownCategoryText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    switchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusToggleLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginRight: 8,
    },
    customToggleContainer: {
      width: 44,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    customToggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    discardBtn: {
      flex: 1,
      height: 56,
      borderRadius: 18,
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    discardBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    saveRuleBtn: {
      flex: 1,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.accentTeal || '#0a2341',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal || '#0a2341',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    saveRuleBtnText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    bottomOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'flex-end',
    },
    flowProposalModal: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      padding: 24,
      minHeight: 450,
    },
    sheetHandle: {
      width: 40,
      height: 5,
      backgroundColor: '#E2E8F0',
      borderRadius: 2.5,
      alignSelf: 'center',
      marginBottom: 24,
    },
    proposalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    intelligenceBox: {
      backgroundColor: 'rgba(11, 160, 178, 0.05)',
      borderRadius: 24,
      padding: 24,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: 'rgba(11, 160, 178, 0.1)',
    },
    proposedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 20,
    },
    proposedBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.accent,
      letterSpacing: 1,
    },
    proposalDetailRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    proposalLabel: {
      width: 80,
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    proposalValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    logicDivider: {
      height: 1,
      backgroundColor: 'rgba(11, 160, 178, 0.1)',
      marginVertical: 16,
    },
    logicLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    proposalFooter: {
      flexDirection: 'column',
      gap: 12,
      marginTop: 8,
    },
    refineBtn: {
      height: 52,
      borderRadius: 16,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    refineBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    deployBtn: {
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    deployBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    confirmModal: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 32,
      padding: 32,
      alignItems: 'center',
    },
    trashCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    confirmTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    confirmSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
      fontWeight: '500',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      height: 58,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    deleteBtn: {
      flex: 1,
      height: 58,
      borderRadius: 20,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    deleteBtnText: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    splitFieldsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
      zIndex: 100,
    },
    // Upgraded Horizontal Card & Modals Styles
    horizontalCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 12,
      elevation: 3,
    },
    horizontalCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    horizontalCardIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#FFEFE6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    horizontalCardInfo: {
      flex: 1,
      justifyContent: 'center',
      marginRight: 8,
    },
    horizontalCardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      lineHeight: 20,
    },
    horizontalCardBadge: {
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    horizontalCardBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    horizontalCardMiddleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    horizontalCardMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    horizontalCardMetaText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    horizontalCardActionsRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 8,
    },
    horizontalCardStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    horizontalCardStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    horizontalCardStatusText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    horizontalCardActionBtn: {
      flex: 1,
      flexDirection: 'row',
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    horizontalCardActionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteActionBtnText: {
      color: '#EF4444',
    },

    // View Modal styles
    viewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    viewModalContent: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 32,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 12,
    },
    viewModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    viewModalBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewModalCategoryBadge: {
      backgroundColor: '#0F172A',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    viewModalCategoryText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    viewModalStatusBadge: {
      backgroundColor: '#E2E8F0',
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    viewModalStatusText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    viewModalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewModalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    viewModalLogicBox: {
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.03)',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    viewModalLogicStep: {
      marginVertical: 4,
    },
    viewModalLogicLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#94A3B8',
      letterSpacing: 1,
      marginBottom: 6,
    },
    viewModalLogicValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    viewModalDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 14,
    },
    viewModalMetadataRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    viewModalMetadataCol: {
      flex: 1,
      backgroundColor: colors.surfaceSoft || 'rgba(100, 116, 139, 0.03)',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    viewModalMetadataValue: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    viewModalActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    viewModalCancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    viewModalCancelBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    viewModalModifyBtn: {
      flex: 1.2,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#00A7B5', // Cyan/teal from the mock
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewModalModifyBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Edit Modal styles
    editModalContent: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 32,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 12,
      maxHeight: '90%',
    },
    editModalHeaderTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    editModalTwoColRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 0,
    },
    editModalSaveBtn: {
      flex: 1.2,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#0F172A', // Dark blue/black matching mock Save Rule
      alignItems: 'center',
      justifyContent: 'center',
    },
    editModalSaveBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Premium Card Styles
    premiumCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
      marginBottom: 16,
    },
    cardGradient: {
      padding: 20,
    },
    cardHeaderSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(100, 116, 139, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(100, 116, 139, 0.05)',
    },
    categoryText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    statusToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
    },
    statusDotSmall: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    statusTextSmall: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cardMainContent: {
      marginBottom: 20,
    },
    premiumRuleName: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    logicFlowContainer: {
      backgroundColor: 'rgba(100, 116, 139, 0.03)',
      borderRadius: 16,
      padding: 12,
      gap: 4,
    },
    logicStep: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logicIndicator: {
      width: 44,
      height: 24,
      borderRadius: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logicLabelSmall: {
      fontSize: 10,
      fontWeight: '900',
      color: '#10B981',
    },
    logicContent: {
      flex: 1,
    },
    logicTitle: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    logicValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    logicConnector: {
      height: 12,
      marginLeft: 21,
      width: 2,
      justifyContent: 'center',
    },
    connectorLine: {
      flex: 1,
      width: 1,
      backgroundColor: colors.cardBorder,
      opacity: 0.5,
    },
    cardFooterPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 12,
    },
    footerInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerInfoText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    footerDivider: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
    },
    trashBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    centerContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 8,
    },
    emptySubtext: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    pickerOverlayAbsolute: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      zIndex: 9999,
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
      color: colors.accent,
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
  });
}