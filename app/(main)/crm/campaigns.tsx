import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { addCRMTemplate, createCRMCampaign, CRMCampaign, deleteCRMCampaign, extractContactsWithAI, getCRMCampaignROI, getCRMCampaigns, getCRMOverview, getCRMTemplates, patchCRMCampaignStatus, updateCRMCampaign } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable, RefreshControl, ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



const SCHEDULE_OPTIONS = [
  { id: 'IMMEDIATELY', name: 'Send Immediately', desc: 'Dispatch campaign pipeline right away without delay' },
  { id: 'SPECIFIC_DATETIME', name: 'Specific Date & Time', desc: 'Pick exact date and time for execution' },
  { id: 'AFTER_X_DAYS', name: 'After X Days', desc: 'Wait a specified number of days before sending' },
  { id: 'EVERY_WEEK_DAY', name: 'Every Week on Day', desc: 'Repeat weekly on a specific day of the week' },
  { id: 'LOOP_X_DAYS', name: 'Loop Every X Days', desc: 'Re-trigger campaign automatically every X days' },
  { id: 'LOOP_X_HOURS', name: 'Loop Every X Hours', desc: 'Re-trigger campaign automatically every X hours' },
];

interface Campaign extends CRMCampaign { }

export default function CRMCampaignsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ openAiModal?: string; aiPrompt?: string }>();
  const { accessToken } = useAuth();

  const { data: campaignList, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', accessToken],
    queryFn: () => getCRMCampaigns(accessToken || ''),
    enabled: !!accessToken,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        refetch();
      }
    }, [accessToken, refetch])
  );

  const { data: templateList } = useQuery({
    queryKey: ['crmTemplates'],
    queryFn: () => getCRMTemplates(accessToken || ''),
    enabled: !!accessToken
  });

  const { data: crmOverview } = useQuery({
    queryKey: ['crm-overview'],
    queryFn: () => getCRMOverview(accessToken || ''),
    enabled: !!accessToken
  });

  const totalAudience = useMemo(() => {
    const totalContacts = parseInt(crmOverview?.stats?.totalContacts?.value || '0', 10);
    const totalLeads = parseInt(crmOverview?.stats?.totalLeads?.value || '0', 10);
    return totalContacts + totalLeads;
  }, [crmOverview]);

  const [aiGeneratedTemplate, setAiGeneratedTemplate] = useState<any | null>(null);

  const extendedTemplateList = useMemo(() => {
    const list = [...(templateList || [])];
    if (aiGeneratedTemplate) {
      list.unshift(aiGeneratedTemplate);
    }
    return list;
  }, [templateList, aiGeneratedTemplate]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('All Channels');
  const [isChannelDropdownOpen, setChannelDropdownOpen] = useState(false);
  const [newCampaignVisible, setNewCampaignVisible] = useState(false);

  // Filtering Logic
  const filteredCampaigns = (campaignList || []).filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesChannel = true;
    if (selectedChannel === 'Email Only') matchesChannel = campaign.channel.toLowerCase() === 'email';
    else if (selectedChannel === 'SMS Only') matchesChannel = campaign.channel.toLowerCase() === 'sms';
    else if (selectedChannel === 'WhatsApp Only') matchesChannel = campaign.channel.toLowerCase() === 'whatsapp';

    return matchesSearch && matchesChannel;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


  // New Campaign Form State
  const [formCampaignName, setFormCampaignName] = useState('');
  const [commChannel, setCommChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [targetSegment, setTargetSegment] = useState('All Audience (Leads + Contacts)');
  const [formTemplateId, setFormTemplateId] = useState<string | null>(null);
  const [sendingAccount, setSendingAccount] = useState('Select account');
  const [sendSchedule, setSendSchedule] = useState<'NOW' | 'SCHEDULE'>('NOW');
  const [abTesting, setAbTesting] = useState(false);
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Dropdown states for form
  const [segmentDropdown, setSegmentDropdown] = useState(false);
  const [templateDropdown, setTemplateDropdown] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Focus states for input highlight borders
  const [isNameFocused, setNameFocused] = useState(false);
  const [isVersionAFocused, setVersionAFocused] = useState(false);
  const [isVersionBFocused, setVersionBFocused] = useState(false);

  const [intelVisible, setIntelVisible] = useState(false);
  const [intelCampaign, setIntelCampaign] = useState<Campaign | null>(null);

  const { data: campaignRoi, isLoading: isRoiLoading } = useQuery({
    queryKey: ['campaignRoi', intelCampaign?.id],
    queryFn: () => getCRMCampaignROI(accessToken || '', intelCampaign?.id || ''),
    enabled: !!accessToken && !!intelCampaign?.id
  });

  const [unsubscribeEnforcement, setUnsubscribeEnforcement] = useState(true);
  const [bounceProtection, setBounceProtection] = useState(true);

  type ScheduleOption = 'IMMEDIATELY' | 'SPECIFIC_DATETIME' | 'AFTER_X_DAYS' | 'EVERY_WEEK_DAY' | 'LOOP_X_DAYS' | 'LOOP_X_HOURS';

  const [scheduleOption, setScheduleOption] = useState<ScheduleOption>('IMMEDIATELY');
  const [scheduleOptionDropdown, setScheduleOptionDropdown] = useState(false);
  const [loopDays, setLoopDays] = useState('1');
  const [loopHours, setLoopHours] = useState('12');
  const [weekDay, setWeekDay] = useState('Monday');
  const [weekDayDropdown, setWeekDayDropdown] = useState(false);

  interface SequenceStep {
    id: string;
    templateId: string | null;
    scheduleOption: string;
    scheduledDate: Date;
    scheduledTime: Date;
    waitDays: string;
    selectedWeekDay: string;
    loopDays: string;
    loopHours: string;
    showDatePicker?: boolean;
    showTimePicker?: boolean;
  }

  const createDefaultStep = (id: string, option: string = 'IMMEDIATELY'): SequenceStep => ({
    id,
    templateId: null,
    scheduleOption: option,
    scheduledDate: new Date(),
    scheduledTime: new Date(),
    waitDays: '1',
    selectedWeekDay: 'MONDAY',
    loopDays: '7',
    loopHours: '24',
  });

  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    createDefaultStep('step_1', 'IMMEDIATELY')
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const handleAddStep = () => {
    setSequenceSteps(prev => [
      ...prev,
      createDefaultStep(`step_${Date.now()}`, 'AFTER_X_DAYS')
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (sequenceSteps.length <= 1) return;
    setSequenceSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStepField = (index: number, field: keyof SequenceStep, value: any) => {
    setSequenceSteps(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const resetForm = () => {
    setFormCampaignName('');
    setCommChannel('EMAIL');
    setTargetSegment('All Audience (Leads + Contacts)');
    setSequenceSteps([createDefaultStep('step_1', 'IMMEDIATELY')]);
    setActiveStepIndex(0);
    setFormTemplateId(null);
    setSendingAccount('Select account');
    setSendSchedule('NOW');
    setScheduleOption('IMMEDIATELY');
    setAbTesting(true);
    setVersionA('');
    setVersionB('');
    setScheduledDate(new Date());
    setScheduledTime(new Date());
    setEditingCampaignId(null);
    setAiGeneratedTemplate(null);
    setUnsubscribeEnforcement(true);
    setBounceProtection(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setFormCampaignName(campaign.name);
    setCommChannel(campaign.channel.toUpperCase() as any);
    setTargetSegment(campaign.target_segment);
    setFormTemplateId(campaign.template_id || null);
    setSequenceSteps([
      {
        id: 'step_1',
        templateId: campaign.template_id || null,
        scheduleOption: campaign.schedule_type === 0 ? 'IMMEDIATELY' : 'SPECIFIC_DATETIME',
        scheduledDate: campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date(),
        scheduledTime: campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date(),
        waitDays: '1',
        selectedWeekDay: 'MONDAY',
        loopDays: '7',
        loopHours: '24',
      }
    ]);
    setSendingAccount(campaign.sending_account);
    setSendSchedule(campaign.schedule_type === 0 ? 'NOW' : 'SCHEDULE');
    setScheduleOption(campaign.schedule_type === 0 ? 'IMMEDIATELY' : 'SPECIFIC_DATETIME');
    if (campaign.scheduled_at) {
      const date = new Date(campaign.scheduled_at);
      setScheduledDate(date);
      setScheduledTime(date);
    }
    const abEnabled = true;
    setAbTesting(abEnabled);
    setVersionA(campaign.version_a || '');
    setVersionB(campaign.version_b || '');
    setNewCampaignVisible(true);
  };

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    let errors: { [key: string]: string } = {};
    if (!formCampaignName.trim()) {
      errors.campaignName = "Campaign name is required";
    }
    sequenceSteps.forEach((step, idx) => {
      if (!step.templateId) {
        errors[`step_${idx}_template`] = `Template is required for Step ${idx + 1}`;
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchCampaign = async () => {
    if (validateForm()) {
      setIsLaunching(true);
      try {
        let finalTemplateId = formTemplateId;

        // Only create a new template on the server if this is a temporary AI-generated template
        if (
          formTemplateId &&
          formTemplateId.startsWith('ai-temp-') &&
          aiGeneratedTemplate &&
          aiGeneratedTemplate.id === formTemplateId
        ) {
          const createdTemplate = await addCRMTemplate(accessToken || '', {
            name: aiGeneratedTemplate.name,
            template_type: aiGeneratedTemplate.template_type,
            subject: versionA.trim() || aiGeneratedTemplate.subject,
            content_json: aiGeneratedTemplate.content_json,
            status: 1
          });
          finalTemplateId = createdTemplate.id;
        }

        const firstStep = sequenceSteps[0];
        const primaryTemplateId = firstStep?.templateId || finalTemplateId || (extendedTemplateList?.[0]?.id || null);
        const isNow = firstStep?.scheduleOption === 'IMMEDIATELY';

        // Format step objects matching the Web API payload format
        const formattedSteps = sequenceSteps.map((step, idx) => {
          let scheduleType = 'Immediate';
          if (step.scheduleOption === 'SPECIFIC_DATETIME' || step.scheduleOption === 'AFTER_X_DAYS') {
            scheduleType = 'Scheduled';
          } else if (step.scheduleOption === 'EVERY_WEEK_DAY' || step.scheduleOption === 'LOOP_X_DAYS' || step.scheduleOption === 'LOOP_X_HOURS') {
            scheduleType = 'Recurring';
          }

          return {
            id: step.id && !step.id.startsWith('step_') ? step.id : (Date.now() + idx).toString(),
            templateId: step.templateId || primaryTemplateId,
            scheduleType: scheduleType,
            scheduledDate: step.scheduledDate ? step.scheduledDate.toISOString() : new Date().toISOString(),
            scheduledTime: step.scheduledTime ? step.scheduledTime.toISOString() : new Date().toISOString(),
            waitDays: step.waitDays || '1',
            selectedWeekDay: step.selectedWeekDay || 'MONDAY',
            loopDays: step.loopDays || '7',
            loopHours: step.loopHours || '24'
          };
        });

        // Compute primary scheduled_at ISO string
        let primaryScheduledAt: string = new Date().toISOString();
        if (firstStep) {
          if (firstStep.scheduleOption === 'SPECIFIC_DATETIME') {
            const combined = new Date(firstStep.scheduledDate);
            combined.setHours(firstStep.scheduledTime.getHours());
            combined.setMinutes(firstStep.scheduledTime.getMinutes());
            primaryScheduledAt = combined.toISOString();
          } else if (firstStep.scheduleOption === 'AFTER_X_DAYS') {
            const date = new Date();
            date.setDate(date.getDate() + (parseInt(firstStep.waitDays, 10) || 1));
            primaryScheduledAt = date.toISOString();
          } else if (firstStep.scheduleOption === 'EVERY_WEEK_DAY') {
            const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const targetDayIndex = daysOfWeek.indexOf((firstStep.selectedWeekDay || 'MONDAY').toUpperCase());
            const date = new Date();
            if (targetDayIndex !== -1) {
              const currentDayIndex = date.getDay();
              let diff = targetDayIndex - currentDayIndex;
              if (diff <= 0) diff += 7;
              date.setDate(date.getDate() + diff);
              date.setHours(firstStep.scheduledTime.getHours());
              date.setMinutes(firstStep.scheduledTime.getMinutes());
              primaryScheduledAt = date.toISOString();
            }
          }
        }

        const payload = {
          name: formCampaignName,
          channel: commChannel.toLowerCase(),
          target_segment: targetSegment.toLowerCase().includes('all') ? 'all audience' : targetSegment.toLowerCase(),
          template_id: primaryTemplateId,
          sending_account: null,
          schedule_type: isNow ? 0 : 1,
          scheduled_at: primaryScheduledAt,
          status: isNow ? 3 : 1,
          unsubscribeEnforced: unsubscribeEnforcement,
          bounceProtection: bounceProtection,
          steps: formattedSteps,
          ab_testing: abTesting ? 1 : 0,
          version_a: abTesting ? versionA.trim() : null,
          version_b: abTesting ? versionB.trim() : null
        };

        if (editingCampaignId) {
          await updateCRMCampaign(accessToken || '', editingCampaignId, payload);
        } else {
          await createCRMCampaign(accessToken || '', payload);
        }

        setNewCampaignVisible(false);
        setEditingCampaignId(null);
        Alert.alert("Success", editingCampaignId ? "Campaign updated." : "Campaign pipeline launched.");
        resetForm();
        refetch(); // Refresh list
      } catch (error: any) {
        Alert.alert("Launch Failed", error.message || "Could not launch campaign pipeline.");
      } finally {
        setIsLaunching(false);
      }
    }
  };

  const openNewCampaignModal = () => {
    resetForm();
    setFormErrors({});
    setNewCampaignVisible(true);
  };

  // Batch Selection and Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectCampaign = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedIds.includes(c.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filteredCampaigns.map(c => c.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredCampaigns.map(c => c.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };



  // AI Campaign Form State
  const [aiCampaignVisible, setAiCampaignVisible] = useState(false);
  const [aiSegment, setAiSegment] = useState('All Contacts');
  const [aiTemplateId, setAiTemplateId] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSegmentDropdown, setAiSegmentDropdown] = useState(false);
  const [aiTemplateDropdown, setAiTemplateDropdown] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (params.openAiModal === 'true' && params.aiPrompt) {
      setAiDescription(params.aiPrompt);
      setAiError(null);
      setAiCampaignVisible(true);
      router.setParams({ openAiModal: undefined, aiPrompt: undefined });
    }
  }, [params.openAiModal, params.aiPrompt]);

  const handleGenerateAICampaign = async () => {
    setAiError(null);
    if (!aiDescription.trim()) {
      setAiError("Please describe your campaign objective.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      let systemInstruction = '';
      if (aiTemplateId) {
        systemInstruction = `You are a professional Real Estate Marketing Copywriter.
The user wants to create a new marketing campaign targeting "${aiSegment}" using an existing template.
Here is their instruction/prompt: "${aiDescription.trim()}".
Based on this, generate a JSON object with exactly the following fields:
1. "campaignName": A catchy, professional name for this campaign (max 50 chars).
2. "subjectA": A compelling email subject line for variation A.
3. "subjectB": A compelling email subject line for variation B (different approach than A).`;
      } else {
        systemInstruction = `You are a professional Real Estate Marketing Copywriter.
The user wants to create a new marketing campaign targeting "${aiSegment}".
Here is their instruction/prompt: "${aiDescription.trim()}".
Based on this, generate a JSON object with exactly the following fields:
1. "campaignName": A catchy, professional name for this campaign (max 50 chars).
2. "subjectA": A compelling email subject line for variation A.
3. "subjectB": A compelling email subject line for variation B (different approach than A).
4. "emailBody": The complete HTML body of the email. Use professional styling, inline CSS, and placeholder variables like {{first_name}} where appropriate. Make it persuasive and directly related to the user's prompt.`;
      }

      const aiResponse = await extractContactsWithAI(accessToken || '', aiDescription.trim(), systemInstruction);

      const rawResult = (aiResponse as any).result || '';
      if (!rawResult) {
        throw new Error("AI returned empty content. Please try again.");
      }

      // Handle raw markdown format
      let cleanJsonStr = rawResult.trim();
      if (cleanJsonStr.startsWith('```')) {
        const matches = cleanJsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
          cleanJsonStr = matches[1].trim();
        }
      }

      const data = JSON.parse(cleanJsonStr);

      if (aiTemplateId) {
        // ✅ User selected an EXISTING template — use it directly, no new template creation
        setAiGeneratedTemplate(null);   // clear any leftover AI-generated template
        setFormTemplateId(aiTemplateId);
      } else {
        // ✅ No template selected — AI generates a temporary template body
        const tempId = `ai-temp-${Date.now()}`;
        setAiGeneratedTemplate({
          id: tempId,
          name: `[AI] ${data.campaignName}`,
          template_type: 'email',
          content_json: {
            components: [
              {
                type: 'Text Block',
                content: data.emailBody
              }
            ]
          },
          subject: data.subjectA,
          status: 1
        });
        setFormTemplateId(tempId);
      }

      // Populate campaign form fields
      setFormCampaignName(data.campaignName || '');
      setCommChannel('EMAIL');
      setTargetSegment(aiSegment);
      setAbTesting(true);
      setVersionA(data.subjectA || '');
      setVersionB(data.subjectB || '');

      setAiCampaignVisible(false);
      setNewCampaignVisible(true);

      // Reset AI form fields
      setAiTemplateId(null);
      setAiDescription('');
      setAiSegment('All Contacts');
      setAiError(null);
    } catch (error: any) {
      setAiError(error.message || "Insufficient AI Credits.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 2 ? 1 : 2;
      await patchCRMCampaignStatus(accessToken || '', id, newStatus);
      refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update campaign status.");
    }
  };

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCampaign = (id: string) => {
    setCampaignToDelete(id);
    setConfirmDeleteVisible(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (campaignToDelete) {
        await deleteCRMCampaign(accessToken || '', campaignToDelete);
        setSelectedIds(prev => prev.filter(item => item !== campaignToDelete));
        setCampaignToDelete(null);
      } else {
        await Promise.all(
          selectedIds.map(id => deleteCRMCampaign(accessToken || '', id))
        );
        setSelectedIds([]);
      }
      refetch();
      setConfirmDeleteVisible(false);
      Alert.alert("Success", "Campaign(s) deleted successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete campaign(s).");
    } finally {
      setIsDeleting(false);
    }
  };



  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'email': return 'email-outline';
      case 'sms': return 'message-text-outline';
      case 'whatsapp': return 'whatsapp';
      default: return 'email-outline';
    }
  };

  const getStatusDisplay = (status: number) => {
    switch (status) {
      case 1: return { label: 'SCHEDULED', bg: '#FFF7ED', text: '#F59E0B' };
      case 2: return { label: 'PAUSED', bg: '#FEF2F2', text: '#EF4444' };
      case 3: return { label: 'COMPLETED', bg: '#ECFDF5', text: '#10B981' };
      default: return { label: 'UNKNOWN', bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const renderCampaignCard = (campaign: Campaign) => {
    const statusInfo = getStatusDisplay(campaign.status);
    const channelColor = campaign.channel.toLowerCase() === 'email' ? '#3B82F6' : campaign.channel.toLowerCase() === 'sms' ? '#0a2341' : '#25D366';
    const isSelected = selectedIds.includes(campaign.id);

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
      <Pressable
        key={campaign.id}
        style={[styles.webRowCard, isSelected && { borderColor: colors.accentTeal, borderWidth: 1.5 }]}
        onPress={() => toggleSelectCampaign(campaign.id)}
      >
        <View style={styles.webRowHeader}>
          <View style={styles.webRowLeft}>
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={18}
              color={isSelected ? colors.accentTeal : "#94A3B8"}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.webRowCampaignName} numberOfLines={1}>{campaign.name}</Text>
          </View>
          <View style={styles.webRowActions}>
            <Pressable
              style={styles.webRowActionBtn}
              onPress={() => {
                setIntelCampaign(campaign);
                setIntelVisible(true);
              }}
            >
              <MaterialCommunityIcons name="chart-bar" size={18} color={colors.accentTeal} style={{ marginRight: 12 }} />
            </Pressable>
            <Pressable style={styles.webRowActionBtn} onPress={() => handleEditCampaign(campaign)}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#64748B" />
            </Pressable>
            <Pressable style={styles.webRowActionBtn} onPress={() => handleDeleteCampaign(campaign.id)}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" style={{ marginLeft: 12 }} />
            </Pressable>
          </View>
        </View>

        <View style={styles.webRowDetails}>
          <View style={styles.webRowDetailCol}>
            <Text style={styles.webRowDetailLabel}>CHANNEL</Text>
            <View style={styles.webRowChannelVal}>
              <MaterialCommunityIcons name={getChannelIcon(campaign.channel)} size={14} color={channelColor} style={{ marginRight: 4 }} />
              <Text style={styles.webRowChannelText}>{campaign.channel}</Text>
            </View>
          </View>

          <View style={styles.webRowDetailCol}>
            <Text style={styles.webRowDetailLabel}>AUDIENCE</Text>
            <View style={[styles.webRowAudienceBadge, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.webRowAudienceText}>{campaign.target_segment.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.webRowFooter}>
          <View style={styles.webRowDetailCol}>
            <Text style={styles.webRowDetailLabel}>DATE</Text>
            <Text style={styles.webRowDateText}>{formatDate(campaign.sent_at || campaign.created_at)}</Text>
          </View>

          <View style={styles.webRowDetailCol}>
            <Text style={styles.webRowDetailLabel}>STATUS</Text>
            <View style={[styles.webRowStatusBadge, { backgroundColor: `${statusInfo.text}15` }]}>
              <Text style={[styles.webRowStatusText, { color: statusInfo.text }]}>{statusInfo.label.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </Pressable>
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
        title="Campaigns"
        subtitle="Scalable marketing with full provider transparency and A/B analytics."
        onBack={() => router.back()}
      />

      <View style={styles.webTopButtonsRow}>
        <Pressable
          style={styles.webAiCampaignBtn}
          onPress={() => setAiCampaignVisible(true)}
        >
          <MaterialCommunityIcons name="star-four-points-outline" size={16} color="#0B2340" style={{ marginRight: 6 }} />
          <Text style={styles.webAiCampaignBtnText}>AI Campaign</Text>
        </Pressable>

        <Pressable
          style={styles.webLaunchCampaignBtn}
          onPress={openNewCampaignModal}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.webLaunchCampaignBtnText}>Launch New Campaign</Text>
        </Pressable>
      </View>

      <View style={styles.webFilterRow}>
        <View style={styles.webSearchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.webSearchInput}
            placeholder="Search campaigns or segments..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.webChannelFilterWrapper}>
          <Pressable
            style={styles.webChannelSelector}
            onPress={() => setChannelDropdownOpen(!isChannelDropdownOpen)}
          >
            <MaterialCommunityIcons name="filter-variant" size={16} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.webChannelSelectorText} numberOfLines={1}>{selectedChannel}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#64748B" style={{ marginLeft: 2 }} />
          </Pressable>

          {isChannelDropdownOpen && (
            <View style={styles.webDropdownMenu}>
              {['All Channels', 'Email Only', 'SMS Only', 'WhatsApp Only'].map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.webDropdownItem}
                  onPress={() => {
                    setSelectedChannel(opt);
                    setChannelDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.webDropdownItemText, selectedChannel === opt && { fontWeight: '700' }]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {filteredCampaigns.length > 0 && (
        <View style={styles.selectionBar}>
          <Pressable style={styles.selectionLeft} onPress={handleSelectAll}>
            <MaterialCommunityIcons
              name={isAllSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={18}
              color={isAllSelected ? colors.accentTeal : "#94A3B8"}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.selectionText}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All'}
            </Text>
          </Pressable>

          {selectedIds.length > 0 && (
            <Pressable
              style={styles.bulkDeleteBtn}
              onPress={() => {
                setCampaignToDelete(null);
                setConfirmDeleteVisible(true);
              }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.bulkDeleteText}>Delete Selected</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentTeal}
            colors={[colors.accentTeal]}
          />
        }
      >
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map(renderCampaignCard)
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="filter-variant-remove" size={48} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>No campaigns found matching your filters.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Launch New Campaign Modal ── */}
      <Modal
        visible={newCampaignVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setNewCampaignVisible(false);
          setEditingCampaignId(null);
        }}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          style={{ flex: 1, paddingTop: insets.top }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>{editingCampaignId ? 'Edit Campaign' : 'Campaigns'}</Text>
              <Text style={styles.modalSubtitle}>Scalable marketing with full provider transparency.</Text>
            </View>

            <Pressable
              onPress={() => {
                setNewCampaignVisible(false);
                setEditingCampaignId(null);
              }}
              hitSlop={12}
              style={styles.closeBtnCircle}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              {/* Campaign Configuration */}
              <View style={styles.formCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Campaign Configuration</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Campaign Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      formErrors.campaignName && styles.inputError,
                      isNameFocused && styles.formInputActive
                    ]}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    value={formCampaignName}
                    onChangeText={(val) => {
                      setFormCampaignName(val);
                      if (formErrors.campaignName) {
                        setFormErrors(prev => ({ ...prev, campaignName: '' }));
                      }
                    }}
                    placeholder="e.g. Summer Listing Collection"
                    placeholderTextColor="#94A3B8"
                    multiline={false}
                    numberOfLines={1}
                  />
                  {formErrors.campaignName && (
                    <Text style={styles.errorText}>{formErrors.campaignName}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup]}>
                  <Text style={styles.inputLabel}>Communication Channel</Text>
                  <View style={styles.channelTabs}>
                    <Pressable
                      style={[
                        styles.channelTab,
                        commChannel === 'EMAIL' && { backgroundColor: '#0B2D3E', borderColor: '#0B2D3E' }
                      ]}
                      onPress={() => {
                        setCommChannel('EMAIL');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name="email-outline"
                        size={18}
                        color={commChannel === 'EMAIL' ? '#FFFFFF' : '#475569'}
                      />
                      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.channelTabText, commChannel === 'EMAIL' && { color: '#FFFFFF' }]}>EMAIL</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.channelTab,
                        commChannel === 'SMS' && { backgroundColor: '#0B2D3E', borderColor: '#0B2D3E' }
                      ]}
                      onPress={() => {
                        setCommChannel('SMS');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name="message-text-outline"
                        size={17}
                        color={commChannel === 'SMS' ? '#FFFFFF' : '#475569'}
                      />
                      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.channelTabText, commChannel === 'SMS' && { color: '#FFFFFF' }]}>SMS</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.channelTab,
                        commChannel === 'WHATSAPP' && { backgroundColor: '#0B2D3E', borderColor: '#0B2D3E' }
                      ]}
                      onPress={() => {
                        setCommChannel('WHATSAPP');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name="whatsapp"
                        size={17}
                        color={commChannel === 'WHATSAPP' ? '#FFFFFF' : '#475569'}
                      />
                      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.channelTabText, commChannel === 'WHATSAPP' && { color: '#FFFFFF' }]}>WHATSAPP</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Segment <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <Pressable
                    style={styles.formSelector}
                    onPress={() => setSegmentDropdown(true)}
                  >
                    <Text style={styles.formSelectorText}>{targetSegment}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                </View>

              {/* Campaign Sequence Card */}
              <View style={styles.formCard}>
                <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between', marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sectionTitle}>Campaign Sequence</Text>
                    <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
                  </View>
                  <Pressable onPress={() => { setNewCampaignVisible(false); router.push('/(main)/crm/templates'); }}>
                    <Text style={styles.manageLink}>Manage Templates</Text>
                  </Pressable>
                </View>

                {sequenceSteps.map((step, index) => {
                  const channelLabel = commChannel === 'EMAIL' ? 'Email' : commChannel === 'SMS' ? 'SMS' : 'WhatsApp';
                  const selectedTemplate = extendedTemplateList?.find(t => t.id === step.templateId);
                  const hasTemplateError = !!formErrors[`step_${index}_template`];

                  return (
                    <View key={step.id} style={styles.stepCardContainer}>
                      {/* Step Header */}
                      <View style={styles.stepHeaderRow}>
                        <Text style={styles.stepTitle}>Step {index + 1}</Text>
                        {sequenceSteps.length > 1 && (
                          <Pressable style={styles.removeStepBtn} onPress={() => handleRemoveStep(index)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                            <Text style={styles.removeStepText}>Remove</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Template Selection */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          {channelLabel} Template <Text style={{ color: '#EF4444' }}>*</Text>
                        </Text>
                        {(extendedTemplateList || []).filter(t => t.template_type.toUpperCase() === commChannel).length === 0 ? (
                          <View style={styles.noTemplateCard}>
                            <View style={styles.noTemplateIconWrap}>
                              <MaterialCommunityIcons
                                name={commChannel === 'EMAIL' ? 'email-plus-outline' : commChannel === 'SMS' ? 'message-plus-outline' : 'whatsapp'}
                                size={32}
                                color={colors.accentTeal}
                              />
                            </View>
                            <Text style={styles.noTemplateTitle}>No {channelLabel} Templates Yet</Text>
                            <Text style={styles.noTemplateDesc}>
                              Create a {commChannel.toLowerCase()} template first to use in your campaign pipeline.
                            </Text>
                            <Pressable
                              style={styles.noTemplateBtn}
                              onPress={() => { setNewCampaignVisible(false); router.push('/(main)/crm/templates'); }}
                            >
                              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                              <Text style={styles.noTemplateBtnText}>Create Template</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <>
                            <Pressable
                              style={[styles.formSelector, hasTemplateError && styles.inputError]}
                              onPress={() => {
                                setActiveStepIndex(index);
                                setTemplateDropdown(true);
                              }}
                            >
                              <Text style={styles.formSelectorText}>
                                {selectedTemplate ? selectedTemplate.name : 'Select Template'}
                              </Text>
                              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                            </Pressable>
                            {hasTemplateError && (
                              <Text style={styles.errorText}>{formErrors[`step_${index}_template`]}</Text>
                            )}
                          </>
                        )}
                      </View>

                      {/* Sending Schedule */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Sending Schedule</Text>
                        <Pressable
                          style={styles.formSelector}
                          onPress={() => {
                            setActiveStepIndex(index);
                            setScheduleOptionDropdown(true);
                          }}
                        >
                          <Text style={styles.formSelectorText}>
                            {SCHEDULE_OPTIONS.find(o => o.id === step.scheduleOption)?.name || 'Send Immediately'}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                        </Pressable>

                        {/* Option 2: Specific Date & Time */}
                        {step.scheduleOption === 'SPECIFIC_DATETIME' && (
                          <View style={{ marginTop: 12 }}>
                            <View style={styles.dateTimeRow}>
                              <Pressable
                                style={[styles.dateTimeField, step.showDatePicker && styles.dateTimeFieldActive]}
                                onPress={() => {
                                  updateStepField(index, 'showDatePicker', !step.showDatePicker);
                                  updateStepField(index, 'showTimePicker', false);
                                }}
                              >
                                <Text style={[styles.formSelectorText, step.showDatePicker && { color: colors.accentTeal, fontWeight: '700' }]}>
                                  {step.scheduledDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                </Text>
                                <MaterialCommunityIcons name="calendar-outline" size={18} color={step.showDatePicker ? colors.accentTeal : colors.textSecondary} />
                              </Pressable>

                              <Pressable
                                style={[styles.dateTimeField, step.showTimePicker && styles.dateTimeFieldActive]}
                                onPress={() => {
                                  updateStepField(index, 'showTimePicker', !step.showTimePicker);
                                  updateStepField(index, 'showDatePicker', false);
                                }}
                              >
                                <Text style={[styles.formSelectorText, step.showTimePicker && { color: colors.accentTeal, fontWeight: '700' }]}>
                                  {step.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </Text>
                                <MaterialCommunityIcons name="clock-outline" size={18} color={step.showTimePicker ? colors.accentTeal : colors.textSecondary} />
                              </Pressable>
                            </View>

                            {step.showDatePicker && (
                              <View style={styles.inlinePickerContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 8, paddingBottom: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Select Date</Text>
                                  <Pressable
                                    onPress={() => updateStepField(index, 'showDatePicker', false)}
                                    style={{ backgroundColor: colors.accentTeal || '#0D9488', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 }}
                                  >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                  </Pressable>
                                </View>
                                <DateTimePicker
                                  value={step.scheduledDate}
                                  mode="date"
                                  display="spinner"
                                  themeVariant={theme === 'dark' ? 'dark' : 'light'}
                                  onChange={(event: any, date?: Date) => {
                                    if (date) updateStepField(index, 'scheduledDate', date);
                                    if (Platform.OS === 'android') updateStepField(index, 'showDatePicker', false);
                                  }}
                                />
                              </View>
                            )}

                            {step.showTimePicker && (
                              <View style={styles.inlinePickerContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 8, paddingBottom: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Select Time</Text>
                                  <Pressable
                                    onPress={() => updateStepField(index, 'showTimePicker', false)}
                                    style={{ backgroundColor: colors.accentTeal || '#0D9488', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 }}
                                  >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                  </Pressable>
                                </View>
                                <DateTimePicker
                                  value={step.scheduledTime}
                                  mode="time"
                                  display="spinner"
                                  themeVariant={theme === 'dark' ? 'dark' : 'light'}
                                  onChange={(event: any, date?: Date) => {
                                    if (date) updateStepField(index, 'scheduledTime', date);
                                    if (Platform.OS === 'android') updateStepField(index, 'showTimePicker', false);
                                  }}
                                />
                              </View>
                            )}
                          </View>
                        )}

                        {/* Option 3: After X Days */}
                        {step.scheduleOption === 'AFTER_X_DAYS' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 }}>
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>Wait</Text>
                            <TextInput
                              style={{
                                backgroundColor: colors.cardBackground,
                                borderWidth: 1.5,
                                borderColor: colors.cardBorder,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                height: 46,
                                minWidth: 75,
                                textAlign: 'center',
                                fontSize: 15,
                                fontWeight: '700',
                                color: colors.textPrimary,
                              }}
                              keyboardType="number-pad"
                              value={step.waitDays}
                              onChangeText={(val) => updateStepField(index, 'waitDays', val)}
                            />
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>days before sending.</Text>
                          </View>
                        )}

                        {/* Option 4: Every Week on Day */}
                        {step.scheduleOption === 'EVERY_WEEK_DAY' && (
                          <View style={{ marginTop: 12 }}>
                            <View style={styles.dateTimeRow}>
                              <Pressable
                                style={[styles.dateTimeField, { flex: 1 }]}
                                onPress={() => setWeekDayDropdown(true)}
                              >
                                <Text style={styles.formSelectorText}>{step.selectedWeekDay || weekDay}</Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                              </Pressable>

                              <Pressable
                                style={[styles.dateTimeField, { flex: 1 }, step.showTimePicker && styles.dateTimeFieldActive]}
                                onPress={() => {
                                  updateStepField(index, 'showTimePicker', !step.showTimePicker);
                                  updateStepField(index, 'showDatePicker', false);
                                }}
                              >
                                <Text style={[styles.formSelectorText, step.showTimePicker && { color: colors.accentTeal, fontWeight: '700' }]}>
                                  {step.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </Text>
                                <MaterialCommunityIcons name="clock-outline" size={18} color={step.showTimePicker ? colors.accentTeal : colors.textSecondary} />
                              </Pressable>
                            </View>

                            {step.showTimePicker && (
                              <View style={styles.inlinePickerContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 8, paddingBottom: 4 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Select Time</Text>
                                  <Pressable
                                    onPress={() => updateStepField(index, 'showTimePicker', false)}
                                    style={{ backgroundColor: colors.accentTeal || '#0D9488', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 }}
                                  >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Done</Text>
                                  </Pressable>
                                </View>
                                <DateTimePicker
                                  value={step.scheduledTime}
                                  mode="time"
                                  display="spinner"
                                  themeVariant={theme === 'dark' ? 'dark' : 'light'}
                                  onChange={(event: any, date?: Date) => {
                                    if (date) updateStepField(index, 'scheduledTime', date);
                                    if (Platform.OS === 'android') updateStepField(index, 'showTimePicker', false);
                                  }}
                                />
                              </View>
                            )}
                          </View>
                        )}

                        {/* Option 5: Loop Every X Days */}
                        {step.scheduleOption === 'LOOP_X_DAYS' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 }}>
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>Loop every</Text>
                            <TextInput
                              style={{
                                backgroundColor: colors.cardBackground,
                                borderWidth: 1.5,
                                borderColor: colors.cardBorder,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                height: 46,
                                minWidth: 75,
                                textAlign: 'center',
                                fontSize: 15,
                                fontWeight: '700',
                                color: colors.textPrimary,
                              }}
                              keyboardType="number-pad"
                              value={step.loopDays}
                              onChangeText={(val) => updateStepField(index, 'loopDays', val)}
                            />
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>days</Text>
                          </View>
                        )}

                        {/* Option 6: Loop Every X Hours */}
                        {step.scheduleOption === 'LOOP_X_HOURS' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 }}>
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>Loop every</Text>
                            <TextInput
                              style={{
                                backgroundColor: colors.cardBackground,
                                borderWidth: 1.5,
                                borderColor: colors.cardBorder,
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                height: 46,
                                minWidth: 75,
                                textAlign: 'center',
                                fontSize: 15,
                                fontWeight: '700',
                                color: colors.textPrimary,
                              }}
                              keyboardType="number-pad"
                              value={step.loopHours}
                              onChangeText={(val) => updateStepField(index, 'loopHours', val)}
                            />
                            <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500' }}>hours</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* + Add Another Step Button */}
                <Pressable style={styles.addStepDashedBtn} onPress={handleAddStep}>
                  <Text style={styles.addStepDashedText}>+ Add Another Step</Text>
                </Pressable>
              </View>

              {/* Compliance & Delivery */}
              <View style={styles.formCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Compliance & Delivery</Text>
                </View>

                <View style={styles.complianceItem}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.complianceTitle}>Unsubscribe Enforcement</Text>
                    <Text style={styles.complianceDesc}>Automatically exclude opted-out contacts.</Text>
                  </View>
                  <Switch
                    value={unsubscribeEnforcement}
                    onValueChange={setUnsubscribeEnforcement}
                    trackColor={{ false: '#CBD5E1', true: colors.accentTeal || '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.complianceItem}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.complianceTitle}>Bounce Protection</Text>
                    <Text style={styles.complianceDesc}>Remove invalid emails after first fail.</Text>
                  </View>
                  <Switch
                    value={bounceProtection}
                    onValueChange={setBounceProtection}
                    trackColor={{ false: '#CBD5E1', true: colors.accentTeal || '#0D9488' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.audienceBox}>
                  <Text style={styles.audienceLabel}>AUDIENCE PREVIEW</Text>
                  <Text style={styles.audienceCount}>{totalAudience}</Text>
                  <Text style={styles.audienceSubText}>Contacts match your current filters.</Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Fixed Footer */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={[styles.finalLaunchBtn, isLaunching && { opacity: 0.7 }]}
              onPress={handleLaunchCampaign}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.finalLaunchBtnText}>
                  {editingCampaignId ? 'Update & Reschedule' : 'Launch Campaign Pipeline'}
                </Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* Target Segment Bottom Sheet Modal */}
        <Modal
          visible={segmentDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setSegmentDropdown(false)}
        >
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setSegmentDropdown(false)}>
            <View style={styles.bottomSheetContent}>
              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Target Segment</Text>
                <Pressable style={styles.closeBtnSmall} onPress={() => setSegmentDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                {[
                  { name: 'All Audience (Leads + Contacts)', icon: 'account-group-outline', desc: 'Send to all registered leads and contacts in your CRM list', tag: 'ALL' },
                  { name: 'All Leads', icon: 'account-plus-outline', desc: 'Send to all registered leads needing initial follow-up', tag: 'LEADS' },
                  { name: 'All Contacts', icon: 'card-account-phone-outline', desc: 'Send to all registered contacts in your CRM list', tag: 'CONTACTS' }
                ].map(opt => {
                  const isSelected = targetSegment === opt.name;
                  return (
                    <Pressable
                      key={opt.name}
                      style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                      onPress={() => {
                        setTargetSegment(opt.name);
                        setSegmentDropdown(false);
                      }}
                    >
                      <View style={styles.itemIconContainer}>
                        <MaterialCommunityIcons
                          name={opt.icon as any}
                          size={22}
                          color={isSelected ? '#FFFFFF' : colors.accentTeal}
                        />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>{opt.name}</Text>
                        <Text style={[styles.itemDesc, isSelected && styles.itemDescActive]}>{opt.desc}</Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Template Selection Bottom Sheet Modal */}
        <Modal
          visible={templateDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setTemplateDropdown(false)}
        >
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setTemplateDropdown(false)}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.dragHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select {(commChannel === 'EMAIL' ? 'Email' : commChannel === 'SMS' ? 'SMS' : 'WhatsApp')} Template</Text>
                <Pressable style={styles.closeBtnSmall} onPress={() => setTemplateDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                {(extendedTemplateList || [])
                  .filter(t => t.template_type.toUpperCase() === commChannel)
                  .map(opt => {
                    const isSelected = sequenceSteps[activeStepIndex]?.templateId === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                        onPress={() => {
                          updateStepField(activeStepIndex, 'templateId', opt.id);
                          setFormTemplateId(opt.id);
                          setTemplateDropdown(false);
                          if (formErrors[`step_${activeStepIndex}_template`]) {
                            setFormErrors(prev => ({ ...prev, [`step_${activeStepIndex}_template`]: '' }));
                          }
                        }}
                      >
                        <View style={styles.itemIconContainer}>
                          <MaterialCommunityIcons
                            name={commChannel === 'EMAIL' ? 'email-outline' : commChannel === 'SMS' ? 'message-text-outline' : 'whatsapp'}
                            size={22}
                            color={isSelected ? '#FFFFFF' : colors.accentTeal}
                          />
                        </View>
                        <View style={styles.itemTextContainer}>
                          <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>{opt.name}</Text>
                          <Text style={[styles.itemDesc, isSelected && styles.itemDescActive]}>
                            Optimized template for {commChannel.toLowerCase()} campaigns. Click to apply.
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
                        )}
                      </Pressable>
                    );
                  })}
                {(extendedTemplateList || []).filter(t => t.template_type.toUpperCase() === commChannel).length === 0 && (
                  <View style={styles.dropdownEmpty}>
                    <MaterialCommunityIcons name="email-alert-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.dropdownEmptyText}>No {commChannel.toLowerCase()} templates available.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Schedule Option Selection Bottom Sheet Modal */}
        <Modal
          visible={scheduleOptionDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setScheduleOptionDropdown(false)}
        >
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setScheduleOptionDropdown(false)}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.dragHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Sending Schedule</Text>
                <Pressable style={styles.closeBtnSmall} onPress={() => setScheduleOptionDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                {SCHEDULE_OPTIONS.map(opt => {
                  const currentStepScheduleOption = sequenceSteps[activeStepIndex]?.scheduleOption || 'IMMEDIATELY';
                  const isSelected = currentStepScheduleOption === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                      onPress={() => {
                        updateStepField(activeStepIndex, 'scheduleOption', opt.id);
                        setScheduleOption(opt.id as any);
                        setScheduleOptionDropdown(false);
                        setShowDatePicker(false);
                        setShowTimePicker(false);
                      }}
                    >
                      <View style={styles.itemIconContainer}>
                        <MaterialCommunityIcons
                          name={
                            opt.id === 'IMMEDIATELY' ? 'flash-outline' :
                            opt.id === 'SPECIFIC_DATETIME' ? 'calendar-clock-outline' :
                            opt.id === 'AFTER_X_DAYS' ? 'clock-start' :
                            opt.id === 'EVERY_WEEK_DAY' ? 'calendar-week-outline' :
                            'sync'
                          }
                          size={22}
                          color={isSelected ? '#FFFFFF' : colors.accentTeal}
                        />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>{opt.name}</Text>
                        <Text style={[styles.itemDesc, isSelected && styles.itemDescActive]}>{opt.desc}</Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Day of Week Selection Bottom Sheet Modal */}
        <Modal
          visible={weekDayDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setWeekDayDropdown(false)}
        >
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setWeekDayDropdown(false)}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.dragHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Day of Week</Text>
                <Pressable style={styles.closeBtnSmall} onPress={() => setWeekDayDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isSelected = weekDay === day;
                  return (
                    <Pressable
                      key={day}
                      style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                      onPress={() => {
                        setWeekDay(day);
                        updateStepField(activeStepIndex, 'selectedWeekDay', day.toUpperCase());
                        setWeekDayDropdown(false);
                      }}
                    >
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>{day}</Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </Modal>



      <Modal
        visible={aiCampaignVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setAiCampaignVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        >
          {/* Full-page Header */}
          <View style={{
            backgroundColor: '#FFFFFF',
            paddingTop: insets.top,
            paddingHorizontal: 20,
            paddingBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Pressable
              onPress={() => {
                setAiCampaignVisible(false);
                setAiTemplateId(null);
                setAiDescription('');
                setAiSegment('All Contacts');
                setAiError(null);
              }}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="close" size={22} color="#0A2341" />
            </Pressable>
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: '#0A2341',
              letterSpacing: -0.3,
            }}>AI Campaign</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 24,
              paddingBottom: insets.bottom + 40,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Target Segment */}
            <View style={{ marginBottom: 20, zIndex: aiSegmentDropdown ? 30 : 1 }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#94A3B8',
                marginBottom: 8,
                letterSpacing: 0.5
              }}>TARGET SEGMENT</Text>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 50,
                }}
                onPress={() => {
                  setAiSegmentDropdown(!aiSegmentDropdown);
                  setAiTemplateDropdown(false);
                }}
              >
                <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {aiSegment}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#0F172A" />
              </Pressable>
              {aiSegmentDropdown && (
                <View style={{
                  position: 'absolute',
                  top: 80,
                  left: 0,
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  paddingVertical: 4,
                  zIndex: 999,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 10,
                }}>
                  {['All Contacts', 'Hot Leads', 'New Leads', 'Past Clients', 'Investor Group'].map(opt => {
                    const isSelected = aiSegment === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          backgroundColor: isSelected
                            ? 'rgba(59, 130, 246, 0.08)'
                            : pressed ? '#F1F5F9' : 'transparent',
                          borderRadius: 10,
                          marginHorizontal: 4,
                          marginVertical: 2
                        })}
                        onPress={() => { setAiSegment(opt); setAiSegmentDropdown(false); }}
                      >
                        <Text style={{
                          color: isSelected ? '#3B82F6' : '#1E293B',
                          fontSize: 14,
                          fontWeight: isSelected ? '700' : '600'
                        }}>{opt}</Text>
                        {isSelected && (
                          <MaterialCommunityIcons name="check" size={16} color="#3B82F6" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Brand Template */}
            <View style={{ marginBottom: 20, zIndex: aiTemplateDropdown ? 20 : 1 }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#94A3B8',
                marginBottom: 8,
                letterSpacing: 0.5
              }}>BRAND TEMPLATE</Text>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 50,
                }}
                onPress={() => {
                  setAiTemplateDropdown(!aiTemplateDropdown);
                  setAiSegmentDropdown(false);
                }}
              >
                <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {aiTemplateId ? (templateList?.find(t => t.id === aiTemplateId)?.name || 'Select template') : 'Select template'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#0F172A" />
              </Pressable>
              {aiTemplateDropdown && (
                <View style={{
                  position: 'absolute',
                  top: 80,
                  left: 0,
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  paddingVertical: 4,
                  zIndex: 999,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 10,
                  maxHeight: 220,
                }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    <Pressable
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        backgroundColor: !aiTemplateId
                          ? 'rgba(59, 130, 246, 0.08)'
                          : pressed ? '#F1F5F9' : 'transparent',
                        borderRadius: 10,
                        marginHorizontal: 4,
                        marginVertical: 2
                      })}
                      onPress={() => { setAiTemplateId(null); setAiTemplateDropdown(false); }}
                    >
                      <Text style={{
                        color: !aiTemplateId ? '#3B82F6' : '#1E293B',
                        fontSize: 14,
                        fontWeight: !aiTemplateId ? '700' : '600'
                      }}>Select template (Generate New Body)</Text>
                      {!aiTemplateId && (
                        <MaterialCommunityIcons name="check" size={16} color="#3B82F6" />
                      )}
                    </Pressable>
                    {(templateList || [])
                      .filter(t => t.template_type.toLowerCase() === 'email')
                      .map(opt => {
                        const isSelected = aiTemplateId === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            style={({ pressed }) => ({
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              backgroundColor: isSelected
                                ? 'rgba(59, 130, 246, 0.08)'
                                : pressed ? '#F1F5F9' : 'transparent',
                              borderRadius: 10,
                              marginHorizontal: 4,
                              marginVertical: 2
                            })}
                            onPress={() => { setAiTemplateId(opt.id); setAiTemplateDropdown(false); }}
                          >
                            <Text style={{
                              color: isSelected ? '#3B82F6' : '#1E293B',
                              fontSize: 14,
                              fontWeight: isSelected ? '700' : '600',
                              flex: 1,
                              marginRight: 8
                            }} numberOfLines={1}>{opt.name}</Text>
                            {isSelected && (
                              <MaterialCommunityIcons name="check" size={16} color="#3B82F6" />
                            )}
                          </Pressable>
                        );
                      })}
                    {((templateList || []).filter(t => t.template_type.toLowerCase() === 'email').length === 0) && (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>No templates found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Campaign Objective */}
            <View style={{ marginBottom: aiError ? 20 : 32 }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#94A3B8',
                marginBottom: 8,
                letterSpacing: 0.5
              }}>CAMPAIGN OBJECTIVE & DESCRIPTION</Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: aiError ? '#FCA5A5' : '#E2E8F0',
                  borderRadius: 14,
                  padding: 16,
                  minHeight: 140,
                  fontSize: 14,
                  color: '#0F172A',
                  lineHeight: 22,
                }}
                multiline
                placeholder="Describe the campaign you want to generate. e.g., 'Re-engage buyers who looked at luxury condos in West Hollywood last month with a price drop alert.'"
                placeholderTextColor="#94A3B8"
                value={aiDescription}
                onChangeText={(text) => {
                  setAiDescription(text);
                  if (aiError) setAiError(null);
                }}
                textAlignVertical="top"
              />

              {!!aiError && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingHorizontal: 2,
                }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                    {aiError}
                  </Text>
                </View>
              )}
            </View>

            {/* Footer Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={{
                  flex: 1,
                  height: 54,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF'
                }}
                onPress={() => {
                  setAiCampaignVisible(false);
                  setAiTemplateId(null);
                  setAiDescription('');
                  setAiSegment('All Contacts');
                  setAiError(null);
                }}
                disabled={isGeneratingAI}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0A2341' }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={{
                  flex: 1.5,
                  height: 54,
                  borderRadius: 14,
                  backgroundColor: '#0A2341',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isGeneratingAI ? 0.7 : 1,
                }}
                onPress={handleGenerateAICampaign}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Generate campaign</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setConfirmDeleteVisible(false);
          setCampaignToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>
              {campaignToDelete ? 'Delete Campaign' : 'Delete Selected Campaigns'}
            </Text>
            <Text style={styles.confirmSubtitle}>
              {campaignToDelete
                ? 'Are you sure you want to delete this campaign? This action cannot be undone.'
                : `Are you sure you want to delete the ${selectedIds.length} selected campaign(s)? This action cannot be undone.`}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setConfirmDeleteVisible(false);
                  setCampaignToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Campaign Intelligence Analytics Modal ── */}
      <Modal
        visible={intelVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setIntelVisible(false);
          setIntelCampaign(null);
        }}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          style={{ flex: 1, paddingTop: insets.top }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>Campaign Intelligence</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                ROI & Conversion Attribution for {intelCampaign?.name || 'Campaign'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setIntelVisible(false);
                setIntelCampaign(null);
              }}
              hitSlop={12}
              style={styles.closeBtnCircle}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          {isRoiLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accentTeal} />
              <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '600' }}>Loading Intelligence...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.intelScrollContent}>
              {/* Top Stats Grid */}
              <View style={styles.intelStatsGrid}>
                <View style={styles.intelStatCard}>
                  <View style={styles.intelStatIconBox}>
                    <MaterialCommunityIcons name="email-outline" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.intelStatLabel}>DELIVERED</Text>
                  <Text style={styles.intelStatValue}>{campaignRoi?.delivered ?? '0'}</Text>
                </View>

                <View style={styles.intelStatCard}>
                  <View style={styles.intelStatIconBox}>
                    <MaterialCommunityIcons name="near-me" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.intelStatLabel}>OPEN RATE</Text>
                  <Text style={styles.intelStatValue}>{campaignRoi?.open_rate ?? '0.0%'}</Text>
                </View>

                <View style={styles.intelStatCard}>
                  <View style={styles.intelStatIconBox}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.intelStatLabel}>REPLY RATE</Text>
                  <Text style={styles.intelStatValue}>{campaignRoi?.reply_rate ?? '0.0%'}</Text>
                </View>

                <View style={styles.intelStatCard}>
                  <View style={styles.intelStatIconBox}>
                    <MaterialCommunityIcons name="currency-usd" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.intelStatLabel}>EST. PIPELINE</Text>
                  <Text style={styles.intelStatValue}>${campaignRoi?.pipeline_value ?? '0'}</Text>
                </View>
              </View>

              {/* Live Attribution Stream */}
              <View style={styles.intelSectionCard}>
                <View style={styles.intelSectionHeaderRow}>
                  <Text style={styles.intelSectionTitle}>Live Attribution Stream</Text>
                  <View style={styles.intelLiveBadge}>
                    <View style={styles.intelLiveDot} />
                    <Text style={styles.intelLiveText}>LIVE PIPELINE</Text>
                  </View>
                </View>

                {!campaignRoi?.stream || campaignRoi.stream.length === 0 ? (
                  <View style={styles.intelEmptyStreamBox}>
                    <MaterialCommunityIcons name="access-point-network-off" size={32} color={colors.textMuted || '#94A3B8'} />
                    <Text style={styles.intelEmptyStreamText}>
                      No activity logs recorded yet. Once this campaign dispatches messages, real-time tracking will appear here.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.intelStreamList}>
                    {campaignRoi.stream.map((row, i) => (
                      <View key={i} style={styles.intelStreamItem}>
                        <View style={styles.intelStreamLeft}>
                          <View style={[styles.intelStreamAvatar, { backgroundColor: ['#E0F2FE', '#FFEDD5', '#F0FDF4', '#FEF2F2'][i % 4] }]}>
                            <Text style={[styles.intelStreamAvatarText, { color: ['#075985', '#9A3412', '#166534', '#991B1B'][i % 4] }]}>
                              {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
                            </Text>
                          </View>
                          <View style={styles.intelStreamInfo}>
                            <Text style={styles.intelStreamUserName} numberOfLines={1}>{row.name || 'Unknown Contact'}</Text>
                            <View style={styles.intelStreamMetaRow}>
                              <Text style={styles.intelStreamMetaLabel}>{row.channel}</Text>
                              <View style={styles.intelMetaDot} />
                              <Text style={styles.intelStreamMetaLabel}>{row.time}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.intelStreamRight}>
                          <View style={styles.intelActionPillMinimal}>
                            <Text style={styles.intelActionPillTextMinimal}>{row.action}</Text>
                          </View>
                          <Text style={styles.intelStreamImpactHighlight}>{row.score}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Reach & Engagement Diagnostics */}
              <View style={styles.intelSectionCard}>
                <Text style={styles.intelSectionTitle}>Reach & Engagement Diagnostics</Text>

                <View style={styles.intelMetricItem}>
                  <View style={styles.intelMetricLabelRow}>
                    <Text style={styles.intelMetricLabel}>DELIVERY RATE</Text>
                    <Text style={styles.intelMetricVal}>
                      {campaignRoi?.delivery_success_rate ? `${campaignRoi.delivery_success_rate}%` : '100.0%'}
                    </Text>
                  </View>
                  <View style={styles.intelMetricBarBg}>
                    <View style={[styles.intelMetricBarFill, { width: `${campaignRoi?.delivery_success_rate ?? 100}%` as any, backgroundColor: colors.accentTeal }]} />
                  </View>
                  <Text style={styles.intelMetricSubtext}>No messages sent yet.</Text>
                </View>

                <View style={styles.intelMetricItem}>
                  <View style={styles.intelMetricLabelRow}>
                    <Text style={styles.intelMetricLabel}>AUDIENCE COMPOSITION</Text>
                    <Text style={styles.intelMetricVal}>
                      {(campaignRoi?.audience_contacts_count ?? 13) + (campaignRoi?.audience_leads_count ?? 0)} Targeted
                    </Text>
                  </View>
                  <View style={styles.intelMetricBarBg}>
                    <View style={[styles.intelMetricBarFill, { width: '100%', backgroundColor: '#0B2341' }]} />
                  </View>
                  <Text style={styles.intelMetricSubtext}>
                    {campaignRoi?.audience_contacts_count ?? 13} Contacts & {campaignRoi?.audience_leads_count ?? 0} Leads. targeted segment: "{campaignRoi?.target_segment || 'All Contacts'}".
                  </Text>
                </View>
              </View>

              {/* Pipeline & Revenue Impact */}
              <View style={styles.intelSectionCard}>
                <Text style={styles.intelSectionTitle}>Pipeline & Revenue Impact</Text>

                <View style={styles.intelMetricItem}>
                  <View style={styles.intelMetricLabelRow}>
                    <Text style={styles.intelMetricLabel}>ATTRIBUTED CLOSED REVENUE</Text>
                    <Text style={styles.intelMetricVal}>
                      ${campaignRoi?.attributed_revenue ?? 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.intelMetricItem}>
                  <View style={styles.intelMetricLabelRow}>
                    <Text style={styles.intelMetricLabel}>AVERAGE DEAL SIZE</Text>
                    <Text style={styles.intelMetricVal}>
                      ${campaignRoi?.average_deal_value ?? 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.intelMetricItem}>
                  <Text style={[styles.intelMetricLabel, { marginBottom: 6 }]}>PROPERTIES INFLUENCED</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, lineHeight: 16 }}>
                    {campaignRoi?.properties_influenced && campaignRoi.properties_influenced.length > 0
                      ? campaignRoi.properties_influenced.join(', ')
                      : "No property deals have been initialized from this campaign's target audience yet."}
                  </Text>
                </View>
              </View>

              {/* Pipeline Engagement */}
              <View style={styles.intelSectionCard}>
                <Text style={styles.intelSectionTitle}>Pipeline Engagement</Text>

                <View style={styles.intelGridRow}>
                  <View style={styles.intelGridCol}>
                    <Text style={styles.intelGridLabel}>Click Through Rate</Text>
                    <Text style={styles.intelGridValue}>{campaignRoi?.click_through_rate || '0.0%'}</Text>
                  </View>
                  <View style={styles.intelGridCol}>
                    <Text style={styles.intelGridLabel}>Reply Velocity</Text>
                    <Text style={styles.intelGridValue}>{campaignRoi?.reply_velocity || 'N/A'}</Text>
                  </View>
                </View>

                <View style={[styles.intelGridRow, { marginTop: 12 }]}>
                  <View style={styles.intelGridCol}>
                    <Text style={styles.intelGridLabel}>Direct Conversion</Text>
                    <Text style={styles.intelGridValue}>{campaignRoi?.conversion_rate || '0.0%'}</Text>
                  </View>
                  <View style={styles.intelGridCol}>
                    <Text style={styles.intelGridLabel}>Unsubscribe Rate</Text>
                    <Text style={styles.intelGridValue}>{campaignRoi?.unsubscribe_rate || '0.0%'}</Text>
                  </View>
                </View>

                {/* AI Engagement Insights */}
                <View style={styles.intelInsightsCard}>
                  <Text style={styles.intelInsightsTitle}>✨ AI ENGAGEMENT INSIGHTS</Text>
                  <Text style={styles.intelInsightsText}>
                    {campaignRoi?.ai_insights || `This campaign targeting the "${intelCampaign?.target_segment || 'All Contacts'}" segment has not been executed yet. The target audience contains 13 contact(s) and 0 lead(s). Once sent, real-time metrics including open rates and conversation attribution will populate here.`}
                  </Text>
                </View>

                {/* Next Optimized Send Window */}
                <View style={styles.intelNextWindowCard}>
                  <Text style={styles.intelNextWindowTitle}>NEXT OPTIMIZED SEND WINDOW</Text>
                  <View style={styles.intelNextWindowTimeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.intelNextWindowTimeText}>Friday @ 09:15 EST</Text>
                  </View>
                  <Text style={styles.intelNextWindowSubtext}>Based on past engagement patterns.</Text>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </LinearGradient>
      </Modal>

    </LinearGradient>
  );
}

function getStyles(colors: any, theme?: string) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topActionsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 16,
      zIndex: 100,
    },
    webTopButtonsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 16,
    },
    webAiCampaignBtn: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#E2E8F0',
    },
    webAiCampaignBtnText: {
      color: '#0B2340',
      fontSize: 13,
      fontWeight: '700',
    },
    webLaunchCampaignBtn: {
      flex: 1.2,
      flexDirection: 'row',
      backgroundColor: '#0B2340',
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    webLaunchCampaignBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    webFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 20,
      zIndex: 999,
    },
    webSearchBar: {
      flex: 1.4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    webSearchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
      padding: 0,
    },
    webChannelFilterWrapper: {
      flex: 1,
      position: 'relative',
    },
    webChannelSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      height: 44,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    webChannelSelectorText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    webDropdownMenu: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 4,
      zIndex: 10000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    webDropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    webDropdownItemText: {
      fontSize: 12,
      color: colors.textPrimary,
    },
    webRowCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    webRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    webRowLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
    },
    webRowCampaignName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#0b2341',
    },
    webRowActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    webRowActionBtn: {
      padding: 4,
    },
    webRowDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    webRowDetailCol: {
      flex: 1,
    },
    webRowDetailLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#94A3B8',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    webRowChannelVal: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    webRowChannelText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    webRowAudienceBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#EFF6FF',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    webRowAudienceText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#1E40AF',
    },
    webRowFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 12,
    },
    webRowDateText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    webRowStatusBadge: {
      alignSelf: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    webRowStatusText: {
      fontSize: 10.5,
      fontWeight: '800',
    },
    channelFilterWrapper: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#0B2D3E',
      height: 48,
      borderRadius: 10,
    },
    aiCampaignBtn: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#0B2D3E',
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    aiCampaignBtnText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '800',
    },

    channelSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    channelSelectorText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dropdownMenu: {
      position: 'absolute',
      top: 52,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 6,
      zIndex: 1000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    dropdownItemText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    filterSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    fab: {
      position: 'absolute',
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#0B2D3E',
      gap: 5,
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 1000,
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '800',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    campaignCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    campaignName: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 10,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    channelInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    channelText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    audienceBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    audienceText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#475569',
    },
    dateText: {
      fontSize: 12,
      color: colors.inputPlaceholder,
    },
    statsGrid: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    statItem: {
      flex: 1,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    statValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    statSubLabel: {
      fontSize: 10,
      color: colors.inputPlaceholder,
      width: 35,
    },
    statValue: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    mainStatValue: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    actionLeftIcons: {
      flexDirection: 'row',
      gap: 16,
    },
    actionIconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeStatusBtn: {
      borderWidth: 1.5,
      borderColor: '#3B82F6',
      borderRadius: 6,
      backgroundColor: colors.cardBackground,
    },
    emptyState: {
      paddingTop: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.inputPlaceholder,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    modalHeaderTitleBox: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalScroll: {
      flex: 1,
    },
    formCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
    stepCardContainer: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      marginBottom: 16,
    },
    stepHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    stepTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    removeStepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    removeStepText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#EF4444',
    },
    addStepDashedBtn: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder || '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      marginTop: 4,
    },
    addStepDashedText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    sectionNumberBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionNumberText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    noTemplateCard: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      padding: 28,
      alignItems: 'center',
      gap: 8,
    },
    noTemplateIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: 'rgba(10, 35, 65, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    noTemplateTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    noTemplateDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 260,
    },
    noTemplateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      marginTop: 8,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    noTemplateBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 18,
      height: 54,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
      textAlignVertical: 'center',
      paddingVertical: Platform.OS === 'android' ? 0 : undefined,
    },
    formInputActive: {
      borderColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    manageLink: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0a2341',
      textDecorationLine: 'underline',
    },
    channelTabs: {
      flexDirection: 'row',
      gap: 6,
    },
    channelTab: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme === 'dark' ? colors.surfaceMuted : colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    channelIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    channelTabActive: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    channelTabText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    channelTextActive: {
      color: '#FFFFFF',
    },
    formSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 18,
      height: 54,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    formSelectorText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    scheduleTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 10,
      padding: 4,
      width: 220,
    },
    scheduleTab: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scheduleTabActive: {
      backgroundColor: colors.accentTeal,
    },
    scheduleTabText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    scheduleTextActive: {
      color: '#FFFFFF',
    },
    abContainer: {
      marginTop: 24,
      borderWidth: 1.5,
      borderStyle: 'solid',
      borderColor: theme === 'dark' ? 'rgba(234, 88, 12, 0.4)' : 'rgba(251, 146, 60, 0.4)',
      borderRadius: 24,
      backgroundColor: theme === 'dark' ? '#1F1510' : '#FFFBF7',
      padding: 20,
      shadowColor: '#EA580C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 2,
    },
    abHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    abTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#EA580C',
    },
    abContent: {
      gap: 12,
    },
    abLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#EA580C',
      marginBottom: 8,
    },
    abInput: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 18,
      height: 52,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
      textAlignVertical: 'center',
      paddingVertical: Platform.OS === 'android' ? 0 : undefined,
    },
    complianceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    complianceTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    complianceDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    activePill: {
      fontSize: 11,
      fontWeight: '900',
      color: '#10B981',
    },
    audienceBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.02,
      shadowRadius: 6,
    },
    audienceLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    audienceCount: {
      fontSize: 32,
      fontWeight: '900',
      color: '#0a2341',
      marginVertical: 4,
    },
    audienceSubText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    finalLaunchBtn: {
      backgroundColor: '#0B2D3E',
      height: 58,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    finalLaunchBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    // Premium Bottom Sheet Selector Styles
    bottomSheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(11, 45, 62, 0.65)',
      justifyContent: 'flex-end',
    },
    bottomSheetContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 20,
      paddingBottom: 40,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 16,
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme === 'dark' ? '#475569' : '#E2E8F0',
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    closeBtnSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    closeBtnCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      marginLeft: 16,
    },
    bottomSheetScroll: {
      marginBottom: 10,
    },
    bottomSheetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      marginBottom: 12,
      backgroundColor: theme === 'dark' ? colors.surfaceMuted : '#F8FAFC',
    },
    bottomSheetItemActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    itemIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(11, 160, 178, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    itemTextContainer: {
      flex: 1,
      marginRight: 10,
    },
    itemLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    itemLabelActive: {
      color: '#FFFFFF',
    },
    itemDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      fontWeight: '500',
    },
    itemDescActive: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    statusMiniBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusMiniBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    formDropdown: {
      marginTop: 4,
      backgroundColor: '#6A7D8C',
      borderRadius: 12,
      paddingVertical: 8,
      zIndex: 1000,
    },
    formDropDownItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    formDropDownItemText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(11, 45, 62, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    aiModalContent: {
      backgroundColor: colors.cardBackground,
      width: '100%',
      maxWidth: 500,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    modernCampaignCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      marginBottom: 20,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
      alignItems: 'stretch',
    },
    cardSidebar: {
      width: 6,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    modernCardContent: {
      flex: 1,
      padding: 20,
      paddingBottom: 16,
    },
    modernHeader: {
      marginBottom: 16,
    },
    modernTitleGroup: {
      flex: 1,
    },
    modernCampaignName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    modernMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    modernChannelLabel: {
      fontSize: 11,
      fontWeight: '900',
      marginLeft: 4,
    },
    modernDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textSecondary,
      marginHorizontal: 6,
      opacity: 0.5,
    },
    modernDateLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    statusMinimalistBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 30,
      borderWidth: 1,
      gap: 6,
    },
    statusMinimalistBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
      gap: 4,
    },
    statusIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusMinimalistText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    modernTargetBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 20,
      gap: 8,
    },
    modernTargetText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      flex: 1,
    },
    modernStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    modernStatBox: {
      alignItems: 'flex-start',
      flex: 1,
    },
    modernStatLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    modernStatValue: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    modernActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceSoft,
    },
    modernActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    compactIconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    aiModalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    aiRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 20,
      zIndex: 2000,
    },
    aiCol: {
      flex: 1,
    },
    aiLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    aiSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    aiSelectorText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
      flex: 1,
    },
    aiDropdown: {
      position: 'absolute',
      top: 68, // position below the selector + label
      left: 0,
      right: 0,
      backgroundColor: '#6A7D8C',
      borderRadius: 12,
      paddingVertical: 8,
      zIndex: 2100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    aiDropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    aiDropdownItemText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    aiInputGroup: {
      marginBottom: 24,
    },
    aiTextArea: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 16,
      height: 120,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    aiModalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    aiCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiCancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    aiGenerateBtn: {
      flex: 1.5,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#5A6E7D', // Slate grey from screenshot
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiGenerateBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    headerUpdateBtn: {
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 8,
    },
    headerUpdateBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeField: {
      flex: 1,
      height: 48,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateTimeFieldActive: {
      borderColor: colors.accentTeal || '#0D9488',
      backgroundColor: (colors.accentTeal && `${colors.accentTeal}0D`) || '#F0FDFA',
    },
    inlinePickerContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginTop: 12,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dropdownEmpty: {
      padding: 16,
      alignItems: 'center',
    },
    dropdownEmptyText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    templateItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    centeredPickerContainer: {
      width: '90%',
      maxWidth: 400,
    },
    pickerCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      overflow: 'hidden',
      paddingBottom: 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    pickerDoneBtn: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0a2341', // Using primary teal for visibility
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 6,
    },
    inputError: {
      borderColor: '#EF4444',
      borderWidth: 1.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    confirmModal: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    confirmSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      fontWeight: '500',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceSoft || 'rgba(148, 163, 184, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteBtn: {
      flex: 1,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceSoft || 'rgba(148, 163, 184, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#EF4444',
    },
    selectionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
      // backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      marginBottom: 10,
    },
    selectionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    bulkDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FEE2E2',
    },
    bulkDeleteText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#EF4444',
    },
    intelScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    intelStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 20,
    },
    intelStatCard: {
      width: (Dimensions.get('window').width - 52) / 2,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 2,
    },
    intelStatIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    intelStatLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
      letterSpacing: 0.5,
    },
    intelStatValue: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary || '#0B2341',
      marginTop: 4,
    },
    intelSectionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
      shadowColor: colors.cardShadowColor || '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
    },
    intelSectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    intelSectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary || '#0B2341',
      marginBottom: 16,
    },
    intelLiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    intelLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    intelLiveText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#10B981',
    },
    intelEmptyStreamBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    intelEmptyStreamText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary || '#64748B',
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 18,
    },
    intelStreamList: {
      marginTop: 8,
    },
    intelStreamItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    intelStreamLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    intelStreamAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    intelStreamAvatarText: {
      fontSize: 14,
      fontWeight: '900',
    },
    intelStreamInfo: {
      flex: 1,
    },
    intelStreamUserName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    intelStreamMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    intelStreamMetaLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary || '#64748B',
    },
    intelMetaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#CBD5E1',
    },
    intelStreamRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    intelActionPillMinimal: {
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    intelActionPillTextMinimal: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
    },
    intelStreamImpactHighlight: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
    },
    intelMetricItem: {
      marginBottom: 16,
    },
    intelMetricLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    intelMetricLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
      letterSpacing: 0.5,
    },
    intelMetricVal: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    intelMetricBarBg: {
      height: 8,
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    intelMetricBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    intelMetricSubtext: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary || '#64748B',
      marginTop: 6,
    },
    intelGridRow: {
      flexDirection: 'row',
      gap: 12,
    },
    intelGridCol: {
      flex: 1,
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
      padding: 12,
      borderRadius: 12,
    },
    intelGridLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
    },
    intelGridValue: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
      marginTop: 4,
    },
    intelInsightsCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    intelInsightsTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#B45309',
      letterSpacing: 0.5,
    },
    intelInsightsText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#78350F',
      marginTop: 6,
      lineHeight: 16,
    },
    intelNextWindowCard: {
      backgroundColor: '#0B2341',
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
    },
    intelNextWindowTitle: {
      fontSize: 9,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 0.5,
    },
    intelNextWindowTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    intelNextWindowTimeText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    intelNextWindowSubtext: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.6)',
      marginTop: 4,
    },
  });
}