import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { createCRMCampaign, CRMCampaign, deleteCRMCampaign, getCRMCampaigns, getCRMTemplates, patchCRMCampaignStatus, updateCRMCampaign } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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



interface Campaign extends CRMCampaign { }

export default function CRMCampaignsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const { data: campaignList, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => getCRMCampaigns(accessToken || ''),
    enabled: !!accessToken
  });

  const { data: templateList } = useQuery({
    queryKey: ['crmTemplates'],
    queryFn: () => getCRMTemplates(accessToken || ''),
    enabled: !!accessToken
  });

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

  // New Campaign Form State
  const [formCampaignName, setFormCampaignName] = useState('');
  const [commChannel, setCommChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [targetSegment, setTargetSegment] = useState('All Contacts');
  const [formTemplateId, setFormTemplateId] = useState<string | null>(null);
  const [sendingAccount, setSendingAccount] = useState('SendGrid (Connected)');
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

  const resetForm = () => {
    setFormCampaignName('');
    setCommChannel('EMAIL');
    setTargetSegment('All Contacts');
    setFormTemplateId(null);
    setSendingAccount('SendGrid (Connected)');
    setSendSchedule('NOW');
    setAbTesting(false);
    setVersionA('');
    setVersionB('');
    setVersionB('');
    setScheduledDate(new Date());
    setScheduledTime(new Date());
    setEditingCampaignId(null);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setFormCampaignName(campaign.name);
    setCommChannel(campaign.channel.toUpperCase() as any);
    setTargetSegment(campaign.target_segment);
    setFormTemplateId(campaign.template_id || null);
    setSendingAccount(campaign.sending_account);
    setSendSchedule(campaign.schedule_type === 0 ? 'NOW' : 'SCHEDULE');
    if (campaign.scheduled_at) {
      const date = new Date(campaign.scheduled_at);
      setScheduledDate(date);
      setScheduledTime(date);
    }
    const abEnabled = campaign.ab_testing === 1 || !!campaign.ab_testing;
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
    if (!formTemplateId) {
      errors.template = `${commChannel.toLowerCase().charAt(0).toUpperCase() + commChannel.toLowerCase().slice(1)} template is required`;
    }
    if (abTesting) {
      if (!versionA.trim()) {
        errors.versionA = "Version A subject is required";
      }
      if (!versionB.trim()) {
        errors.versionB = "Version B subject is required";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchCampaign = async () => {
    if (validateForm()) {
      setIsLaunching(true);
      try {
        const isNow = sendSchedule === 'NOW';
        let scheduledAt: string | null = null;

        if (!isNow) {
          const combined = new Date(scheduledDate);
          combined.setHours(scheduledTime.getHours());
          combined.setMinutes(scheduledTime.getMinutes());
          scheduledAt = combined.toISOString();
        }

        const payload = {
          name: formCampaignName,
          channel: commChannel.toLowerCase(),
          target_segment: targetSegment,
          template_id: formTemplateId,
          sending_account: sendingAccount,
          schedule_type: isNow ? 0 : 1,
          scheduled_at: scheduledAt,
          status: isNow ? 3 : 1,
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

  // Campaign Intelligence State
  const [intelligenceVisible, setIntelligenceVisible] = useState(false);
  const [selectedCampaignForIntelligence, setSelectedCampaignForIntelligence] = useState<Campaign | null>(null);

  const handleOpenIntelligence = (campaign: Campaign) => {
    setSelectedCampaignForIntelligence(campaign);
    setIntelligenceVisible(true);
  };

  // AI Campaign Form State
  const [aiCampaignVisible, setAiCampaignVisible] = useState(false);
  const [aiSegment, setAiSegment] = useState('All Contacts');
  const [aiTemplateId, setAiTemplateId] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [aiSegmentDropdown, setAiSegmentDropdown] = useState(false);
  const [aiTemplateDropdown, setAiTemplateDropdown] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAICampaign = async () => {
    if (!aiTemplateId) {
      Alert.alert("Required", "Please select a brand template for the AI campaign.");
      return;
    }
    if (!aiDescription.trim()) {
      Alert.alert("Required", "Please describe your campaign objective.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const selectedTemplate = templateList?.find(t => t.id === aiTemplateId);
      const channel = selectedTemplate?.template_type?.toLowerCase() || 'email';
      const promptName = aiDescription.trim().substring(0, 30);

      const payload = {
        name: `AI: ${promptName}...`,
        channel: channel,
        target_segment: aiSegment,
        template_id: aiTemplateId,
        schedule_type: 1,
        status: 1,
        ai_prompt: aiDescription.trim()
      };

      await createCRMCampaign(accessToken || '', payload);

      setAiCampaignVisible(false);
      setAiTemplateId(null);
      setAiDescription('');
      setAiSegment('All Contacts');
      Alert.alert("Success", "AI Campaign generated and scheduled successfully.");
      refetch(); // Refresh campaigns list
    } catch (error: any) {
      Alert.alert("Generation Failed", error.message || "Could not generate AI campaign.");
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

  const handleDeleteCampaign = (id: string) => {
    Alert.alert(
      "Delete Campaign",
      "Are you sure you want to delete this campaign? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCRMCampaign(accessToken || '', id);
              refetch();
            } catch (error) {
              Alert.alert("Error", "Failed to delete campaign.");
            }
          }
        }
      ]
    );
  };

  // Filtering Logic
  const filteredCampaigns = (campaignList || []).filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesChannel = true;
    if (selectedChannel === 'Email Only') matchesChannel = campaign.channel.toLowerCase() === 'email';
    else if (selectedChannel === 'SMS Only') matchesChannel = campaign.channel.toLowerCase() === 'sms';
    else if (selectedChannel === 'WhatsApp Only') matchesChannel = campaign.channel.toLowerCase() === 'whatsapp';

    return matchesSearch && matchesChannel;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
      <View key={campaign.id} style={styles.modernCampaignCard}>
        {/* Sidebar Channel Indicator */}
        <View style={[styles.cardSidebar, { backgroundColor: channelColor }]} />


        <View style={styles.modernCardContent}>
          <View style={styles.modernHeader}>
            <View style={styles.modernTitleGroup}>
              <Text style={styles.modernCampaignName} numberOfLines={1}>{campaign.name}</Text>
              <View style={styles.modernMetaRow}>
                <MaterialCommunityIcons name={getChannelIcon(campaign.channel)} size={14} color={channelColor} />
                <Text style={[styles.modernChannelLabel, { color: channelColor }]}>{campaign.channel.toUpperCase()}</Text>
                <View style={styles.modernDot} />
                <Text style={styles.modernDateLabel}>{formatDate(campaign.sent_at || campaign.created_at)}</Text>
              </View>
            </View>

            {/* Minimalist Status Badge */}
            <View style={[styles.statusMinimalistBadge, { backgroundColor: `${statusInfo.text}10`, borderColor: `${statusInfo.text}30` }]}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: statusInfo.text }]} />
              <Text style={[styles.statusMinimalistText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.modernTargetBox}>
            <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.modernTargetText} numberOfLines={1}>{campaign.target_segment}</Text>
          </View>

          <View style={styles.modernStatsRow}>
            <View style={styles.modernStatBox}>
              <Text style={styles.modernStatLabel}>OPENS</Text>
              <Text style={styles.modernStatValue}>{parseFloat(campaign.open_rate).toFixed(1)}%</Text>
            </View>
            <View style={styles.modernStatBox}>
              <Text style={styles.modernStatLabel}>CLK.</Text>
              <Text style={styles.modernStatValue}>{parseFloat(campaign.click_rate).toFixed(1)}%</Text>
            </View>
            <View style={styles.modernStatBox}>
              <Text style={styles.modernStatLabel}>RPL.</Text>
              <Text style={[styles.modernStatValue, { color: '#F59E0B' }]}>{parseFloat(campaign.reply_rate).toFixed(1)}%</Text>
            </View>
            <View style={styles.modernStatBox}>
              <Text style={styles.modernStatLabel}>CONV.</Text>
              <Text style={[styles.modernStatValue, { color: '#10B981' }]}>{parseFloat(campaign.conversion_rate).toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.modernActionRow}>
            <View style={styles.modernActionGroup}>
              <Pressable style={styles.compactIconBtn} onPress={() => handleOpenIntelligence(campaign)}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#3B82F6" />
              </Pressable>

              <Pressable style={styles.compactIconBtn} onPress={() => handleToggleStatus(campaign.id, campaign.status)}>
                <MaterialCommunityIcons
                  name={campaign.status === 2 ? "play" : "pause"}
                  size={20}
                  color={campaign.status === 2 ? "#10B981" : colors.textPrimary}
                />
              </Pressable>

              <Pressable style={styles.compactIconBtn} onPress={() => handleEditCampaign(campaign)}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
              </Pressable>

              <Pressable style={styles.compactIconBtn} onPress={() => handleDeleteCampaign(campaign.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              </Pressable>
            </View>
          </View>
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
        title="Campaigns"
        subtitle="Scalable marketing with full provider transparency and A/B analytics."
        onBack={() => router.back()}
      />

      <View style={styles.topActionsRow}>
        <Pressable
          style={styles.aiCampaignBtn}
          onPress={() => setAiCampaignVisible(true)}
        >
          <MaterialCommunityIcons name="robot-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.aiCampaignBtnText}>AI Campaign</Text>
        </Pressable>

        <View style={styles.channelFilterWrapper}>
          <Pressable
            style={styles.channelSelector}
            onPress={() => setChannelDropdownOpen(!isChannelDropdownOpen)}
          >
            <Text style={styles.channelSelectorText}>{selectedChannel}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
          </Pressable>

          {isChannelDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {['All Channels', 'Email Only', 'SMS Only', 'WhatsApp Only'].map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedChannel(opt);
                    setChannelDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedChannel === opt && { fontWeight: '700' }]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns or segments..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
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

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={openNewCampaignModal}
      >
        <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
      </Pressable>

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
            >
              {/* Campaign Configuration */}
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Campaign Configuration</Text>

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
                  />
                  {formErrors.campaignName && (
                    <Text style={styles.errorText}>{formErrors.campaignName}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup]}>
                  <Text style={styles.inputLabel}>Communication Channel</Text>
                  <View style={styles.channelTabs}>
                    <Pressable
                      style={[styles.channelTab, commChannel === 'EMAIL' && styles.channelTabActive]}
                      onPress={() => {
                        setCommChannel('EMAIL');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="email-outline" size={18} color={commChannel === 'EMAIL' ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.channelTabText, commChannel === 'EMAIL' && styles.channelTextActive]}>EMAIL</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.channelTab, commChannel === 'SMS' && styles.channelTabActive]}
                      onPress={() => {
                        setCommChannel('SMS');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="message-text-outline" size={18} color={commChannel === 'SMS' ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.channelTabText, commChannel === 'SMS' && styles.channelTextActive]}>SMS</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.channelTab, commChannel === 'WHATSAPP' && styles.channelTabActive]}
                      onPress={() => {
                        setCommChannel('WHATSAPP');
                        setFormTemplateId(null);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="whatsapp" size={18} color={commChannel === 'WHATSAPP' ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.channelTabText, commChannel === 'WHATSAPP' && styles.channelTextActive]}>WHATSAPP</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Segment</Text>
                  <Pressable
                    style={styles.formSelector}
                    onPress={() => setSegmentDropdown(true)}
                  >
                    <Text style={styles.formSelectorText}>{targetSegment}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>{commChannel.charAt(0) + commChannel.slice(1).toLowerCase()} Template <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <Pressable onPress={() => { setNewCampaignVisible(false); router.push('/(main)/crm/templates'); }}>
                      <Text style={styles.manageLink}>Manage Templates</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[styles.formSelector, formErrors.template && styles.inputError]}
                    onPress={() => setTemplateDropdown(true)}
                  >
                    <Text style={styles.formSelectorText}>{formTemplateId ? (templateList?.find(t => t.id === formTemplateId)?.name || 'Select a template') : 'Select a template'}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                  {formErrors.template && (
                    <Text style={styles.errorText}>{formErrors.template}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sending Account</Text>
                  <Pressable
                    style={styles.formSelector}
                    onPress={() => setAccountDropdown(true)}
                  >
                    <Text style={styles.formSelectorText}>{sendingAccount}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sending Schedule</Text>
                  <View style={styles.scheduleTabs}>
                    <Pressable
                      style={[styles.scheduleTab, sendSchedule === 'NOW' && styles.scheduleTabActive]}
                      onPress={() => setSendSchedule('NOW')}
                    >
                      <Text style={[styles.scheduleTabText, sendSchedule === 'NOW' && styles.scheduleTextActive]}>SEND NOW</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.scheduleTab, sendSchedule === 'SCHEDULE' && styles.scheduleTabActive]}
                      onPress={() => setSendSchedule('SCHEDULE')}
                    >
                      <Text style={[styles.scheduleTabText, sendSchedule === 'SCHEDULE' && styles.scheduleTextActive]}>SCHEDULE</Text>
                    </Pressable>
                  </View>
                </View>

                {sendSchedule === 'SCHEDULE' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Execution Date & Time</Text>
                    <View style={styles.dateTimeRow}>
                      <Pressable
                        style={styles.dateTimeField}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.formSelectorText}>{scheduledDate.toLocaleDateString()}</Text>
                        <MaterialCommunityIcons name="calendar-multiselect" size={18} color={colors.textSecondary} />
                      </Pressable>

                      <Pressable
                        style={styles.dateTimeField}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.formSelectorText}>{scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <MaterialCommunityIcons name="clock-check-outline" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    <Modal
                      visible={showDatePicker || showTimePicker}
                      transparent
                      animationType="fade"
                      onRequestClose={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                    >
                      <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                      >
                        <View style={styles.centeredPickerContainer}>
                          <View style={styles.pickerCard}>
                            <View style={styles.pickerHeader}>
                              <Text style={styles.pickerTitle}>{showDatePicker ? 'Select Date' : 'Select Time'}</Text>
                              <Pressable onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                                <Text style={styles.pickerDoneBtn}>Done</Text>
                              </Pressable>
                            </View>

                            {showDatePicker && (
                              <DateTimePicker
                                value={scheduledDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                themeVariant={theme === 'dark' ? 'dark' : 'light'}
                                onChange={(event: any, date?: Date) => {
                                  if (date) setScheduledDate(date);
                                  if (Platform.OS === 'android') setShowDatePicker(false);
                                }}
                              />
                            )}

                            {showTimePicker && (
                              <DateTimePicker
                                value={scheduledTime}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                themeVariant={theme === 'dark' ? 'dark' : 'light'}
                                onChange={(event: any, date?: Date) => {
                                  if (date) setScheduledTime(date);
                                  if (Platform.OS === 'android') setShowTimePicker(false);
                                }}
                              />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </Modal>
                  </View>
                )}

                {/* A/B Subject Line Testing */}
                <View style={styles.abContainer}>
                  <View style={styles.abHeader}>
                    <Text style={styles.abTitle}>A/B Subject Line Testing</Text>
                    <Switch
                      value={abTesting}
                      onValueChange={setAbTesting}
                      trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  {abTesting && (
                    <View style={styles.abContent}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.abLabel}>VERSION A (50%)</Text>
                        <TextInput
                          style={[
                            styles.abInput,
                            formErrors.versionA && styles.inputError,
                            isVersionAFocused && styles.formInputActive
                          ]}
                          onFocus={() => setVersionAFocused(true)}
                          onBlur={() => setVersionAFocused(false)}
                          value={versionA}
                          onChangeText={(val) => {
                            setVersionA(val);
                            if (formErrors.versionA) {
                              setFormErrors(prev => ({ ...prev, versionA: '' }));
                            }
                          }}
                          placeholder="You won't believe this price drop..."
                          placeholderTextColor="#94A3B8"
                        />
                        {formErrors.versionA && (
                          <Text style={styles.errorText}>{formErrors.versionA}</Text>
                        )}
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.abLabel}>VERSION B (50%)</Text>
                        <TextInput
                          style={[
                            styles.abInput,
                            formErrors.versionB && styles.inputError,
                            isVersionBFocused && styles.formInputActive
                          ]}
                          onFocus={() => setVersionBFocused(true)}
                          onBlur={() => setVersionBFocused(false)}
                          value={versionB}
                          onChangeText={(val) => {
                            setVersionB(val);
                            if (formErrors.versionB) {
                              setFormErrors(prev => ({ ...prev, versionB: '' }));
                            }
                          }}
                          placeholder="New Pricing: Malibu Villa is now $1.2M"
                          placeholderTextColor="#94A3B8"
                        />
                        {formErrors.versionB && (
                          <Text style={styles.errorText}>{formErrors.versionB}</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Compliance & Delivery */}
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Compliance & Delivery</Text>

                <View style={styles.complianceItem}>
                  <View>
                    <Text style={styles.complianceTitle}>Unsubscribe Enforcement</Text>
                    <Text style={styles.complianceDesc}>Automatically exclude opted-out contacts.</Text>
                  </View>
                  <Text style={styles.activePill}>ACTIVE</Text>
                </View>

                <View style={styles.complianceItem}>
                  <View>
                    <Text style={styles.complianceTitle}>Bounce Protection</Text>
                    <Text style={styles.complianceDesc}>Remove invalid emails after first fail.</Text>
                  </View>
                  <Text style={styles.activePill}>ACTIVE</Text>
                </View>

                <View style={styles.audienceBox}>
                  <Text style={styles.audienceLabel}>AUDIENCE PREVIEW</Text>
                  <Text style={styles.audienceCount}>482</Text>
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
                  {editingCampaignId ? 'UPDATE & RESCHEDULE' : 'LAUNCH CAMPAIGN PIPELINE'}
                </Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </Modal>

      {/* ── Campaign Intelligence Modal ── */}
      <Modal
        visible={intelligenceVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIntelligenceVisible(false)}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          style={{ flex: 1, paddingTop: insets.top }}
        >
          {/* Intelligence Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>Campaign Intelligence</Text>
              <Text style={styles.modalSubtitle}>ROI & Conversion Attribution for {selectedCampaignForIntelligence?.id.substring(0, 8)}</Text>
            </View>
            <Pressable
              onPress={() => setIntelligenceVisible(false)}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={28} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Stats Grid */}
            <View style={styles.intelStatsGrid}>
              <View style={styles.intelStatCard}>
                <View style={styles.intelStatHeader}>
                  <MaterialCommunityIcons name="email-outline" size={16} color="#64748B" />
                  <View style={[styles.intelBadge, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.intelBadgeText, { color: '#10B981' }]}>99.8%</Text>
                  </View>
                </View>
                <Text style={styles.intelStatLabel}>DELIVERED</Text>
                <Text style={styles.intelStatLargeValue}>12,482</Text>
              </View>

              <View style={styles.intelStatCard}>
                <View style={styles.intelStatHeader}>
                  <MaterialCommunityIcons name="near-me" size={16} color="#64748B" />
                  <View style={[styles.intelBadge, { backgroundColor: colors.surfaceSoft }]}>
                    <Text style={[styles.intelBadgeText, { color: '#0D9488' }]}>+14%</Text>
                  </View>
                </View>
                <Text style={styles.intelStatLabel}>OPEN RATE</Text>
                <Text style={styles.intelStatLargeValue}>42.4%</Text>
              </View>

              <View style={styles.intelStatCard}>
                <View style={styles.intelStatHeader}>
                  <MaterialCommunityIcons name="lightning-bolt-outline" size={16} color="#64748B" />
                  <View style={[styles.intelBadge, { backgroundColor: '#F0F9FF' }]}>
                    <Text style={[styles.intelBadgeText, { color: '#0284C7' }]}>High</Text>
                  </View>
                </View>
                <Text style={styles.intelStatLabel}>CLICK-TO-CONV</Text>
                <Text style={styles.intelStatLargeValue}>8.2%</Text>
              </View>

              <View style={styles.intelStatCard}>
                <View style={styles.intelStatHeader}>
                  <MaterialCommunityIcons name="target" size={16} color="#64748B" />
                  <View style={[styles.intelBadge, { backgroundColor: '#F5F3FF' }]}>
                    <Text style={[styles.intelBadgeText, { color: '#7C3AED' }]}>+8%</Text>
                  </View>
                </View>
                <Text style={styles.intelStatLabel}>MARKET DEPTH</Text>
                <Text style={styles.intelStatLargeValue}>92%</Text>
              </View>
            </View>

            {/* Live Attribution Stream */}
            <View style={styles.streamCard}>
              <View style={styles.streamHeader}>
                <Text style={styles.streamTitle}>Live Attribution Stream</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE PIPELINE</Text>
                </View>
              </View>

              <View style={styles.streamTable}>
                {/* Column Headers */}
                <View style={styles.streamTableHead}>
                  <Text style={[styles.streamHeadText, { flex: 2 }]}>LEAD CONTACT</Text>
                  <Text style={[styles.streamHeadText, { flex: 1.5 }]}>ACTIVITY</Text>
                  <Text style={[styles.streamHeadText, { flex: 1 }]}>SCORE</Text>
                </View>

                {/* Rows */}
                {[
                  { name: 'Jessica Miller', action: 'CLICKED LINK', score: '+15', color: '#10B981' },
                  { name: 'Michael Chen', action: 'REPLIED', score: '+45', color: '#0a2341' },
                  { name: 'Sarah Johnson', action: 'OPENED', score: '+5', color: '#F59E0B' },
                  { name: 'David Wilson', action: 'CLICKED LINK', score: '+12', color: '#3B82F6' },
                ].map((row, idx) => (
                  <View key={idx} style={styles.streamRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.rowName}>{row.name}</Text>
                      <Text style={styles.rowSub}>2 mins ago • WhatsApp</Text>
                    </View>
                    <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
                      <View style={[styles.actionBadge, { backgroundColor: colors.surfaceSoft }]}>
                        <Text style={styles.actionBadgeText}>{row.action}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rowScore, { flex: 1, color: row.color }]}>{row.score}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pipeline Engagement */}
            <View style={styles.engagementCard}>
              <Text style={styles.cardTitle}>Pipeline Engagement</Text>

              <View style={styles.progressItem}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Click Through Rate</Text>
                  <Text style={styles.progressValue}>12.8%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '12.8%', backgroundColor: colors.accentTeal }]} />
                </View>
              </View>

              <View style={styles.progressItem}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Reply Velocity</Text>
                  <Text style={styles.progressValue}>Fast</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '85%', backgroundColor: '#2DD4BF' }]} />
                </View>
              </View>

              <View style={styles.progressItem}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Direct Conversion</Text>
                  <Text style={styles.progressValue}>4.2%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '40%', backgroundColor: '#F97316' }]} />
                </View>
              </View>

              <View style={styles.progressItem}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Unsubscribe Rate</Text>
                  <Text style={styles.progressValue}>0.04%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '5%', backgroundColor: '#10B981' }]} />
                </View>
              </View>

              <View style={styles.optimizedWindowBox}>
                <Text style={styles.windowLabel}>NEXT OPTIMIZED SEND WINDOW</Text>
                <View style={styles.windowTimeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.windowTime}>Friday @ 09:15 EST</Text>
                </View>
                <Text style={styles.windowSub}>Based on past engagement patterns.</Text>
              </View>
            </View>

            {/* A/B Testing Outcome */}
            <View style={styles.abOutcomeCard}>
              <Text style={styles.cardTitle}>A/B testing Outcome</Text>
              <View style={styles.winnerBox}>
                <View style={styles.winnerHeader}>
                  <Text style={styles.winnerTopic}>Subject Line "Malibu..."</Text>
                  <Text style={styles.winnerLabel}>WINNER</Text>
                </View>
                <Text style={styles.winnerStat}>+45% Open Rate</Text>
              </View>
            </View>

          </ScrollView>
        </LinearGradient>
      </Modal>

      <Modal
        visible={aiCampaignVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAiCampaignVisible(false)}
      >
        <LinearGradient
          colors={colors.backgroundGradient as any}
          style={{ flex: 1, paddingTop: insets.top }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>AI Campaign</Text>
              <Text style={styles.modalSubtitle}>Generate smart marketing campaigns with AI.</Text>
            </View>
            <Pressable
              onPress={() => setAiCampaignVisible(false)}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={28} color={colors.textPrimary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formCard}>
                <View style={[styles.aiRow, { zIndex: 3000 }]}>
                  <View style={styles.aiCol}>
                    <Text style={styles.aiLabel}>TARGET SEGMENT</Text>
                    <Pressable
                      style={styles.aiSelector}
                      onPress={() => {
                        setAiSegmentDropdown(!aiSegmentDropdown);
                        setAiTemplateDropdown(false);
                      }}
                    >
                      <Text style={styles.aiSelectorText} numberOfLines={1}>{aiSegment}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                    {aiSegmentDropdown && (
                      <View style={[styles.aiDropdown, { top: 68 }]}>
                        {['All Contacts', 'Hot Leads', 'New Leads', 'Past Clients', 'Investor Group'].map(opt => (
                          <Pressable key={opt} style={styles.aiDropdownItem} onPress={() => { setAiSegment(opt); setAiSegmentDropdown(false); }}>
                            <Text style={styles.aiDropdownItemText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.aiCol}>
                    <Text style={styles.aiLabel}>BRAND TEMPLATE</Text>
                    <Pressable
                      style={styles.aiSelector}
                      onPress={() => {
                        setAiTemplateDropdown(!aiTemplateDropdown);
                        setAiSegmentDropdown(false);
                      }}
                    >
                      <Text style={styles.aiSelectorText} numberOfLines={1}>
                        {aiTemplateId ? (templateList?.find(t => t.id === aiTemplateId)?.name || 'Select template') : 'Select template'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                    {aiTemplateDropdown && (
                      <View style={[styles.aiDropdown, { top: 68 }]}>
                        {(templateList || []).map(opt => (
                          <Pressable key={opt.id} style={styles.aiDropdownItem} onPress={() => { setAiTemplateId(opt.id); setAiTemplateDropdown(false); }}>
                            <Text style={styles.aiDropdownItemText}>{opt.name}</Text>
                          </Pressable>
                        ))}
                        {(templateList || []).length === 0 && (
                          <View style={{ padding: 10 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 12 }}>No templates found</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.aiInputGroup}>
                  <Text style={styles.aiLabel}>CAMPAIGN OBJECTIVE & DESCRIPTION</Text>
                  <TextInput
                    style={styles.aiTextArea}
                    multiline={true}
                    placeholder="Describe the campaign you want to generate. e.g., 'Re-engage buyers who looked at luxury condos in West Hollywood last month with a price drop alert.'"
                    placeholderTextColor="#94A3B8"
                    value={aiDescription}
                    onChangeText={setAiDescription}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.aiModalActions}>
              <Pressable
                style={styles.aiCancelBtn}
                onPress={() => {
                  setAiCampaignVisible(false);
                  setAiTemplateId(null);
                  setAiDescription('');
                  setAiSegment('All Contacts');
                }}
                disabled={isGeneratingAI}
              >
                <Text style={styles.aiCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.aiGenerateBtn, isGeneratingAI && { opacity: 0.7 }]}
                onPress={handleGenerateAICampaign}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.aiGenerateBtnText}>Generate Campaign</Text>
                )}
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Modal>

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
                { name: 'All Contacts', icon: 'account-group-outline', desc: 'Send to all registered contacts in your CRM list', tag: 'ALL' },
                { name: 'Leads (New/Unqualified)', icon: 'account-plus-outline', desc: 'Fresh and uncontacted leads needing initial follow-up', tag: 'LEADS' },
                { name: 'Hot Leads (Heat Index > 70)', icon: 'fire', desc: 'Active prospects with high heat scores and engagement levels', tag: 'ENGAGED' },
                { name: 'Active Clients', icon: 'check-decagram-outline', desc: 'Contacts in currently active deal flows and showings', tag: 'ACTIVE' },
                { name: 'Buyers - Budget > $1M', icon: 'currency-usd', desc: 'High-intent premium buyers with budget over $1,000,000', tag: 'VIP' },
                { name: 'Sellers - Pending Listing', icon: 'home-alert-outline', desc: 'Homeowners preparing to list property or finalize listing contracts', tag: 'SELLERS' }
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
              <Text style={styles.bottomSheetTitle}>Select {commChannel.charAt(0) + commChannel.slice(1).toLowerCase()} Template</Text>
              <Pressable style={styles.closeBtnSmall} onPress={() => setTemplateDropdown(false)}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
              {(templateList || [])
                .filter(t => t.template_type.toUpperCase() === commChannel)
                .map(opt => {
                  const isSelected = formTemplateId === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                      onPress={() => {
                        setFormTemplateId(opt.id);
                        setTemplateDropdown(false);
                        if (formErrors.template) {
                          setFormErrors(prev => ({ ...prev, template: '' }));
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
              {(templateList || []).filter(t => t.template_type.toUpperCase() === commChannel).length === 0 && (
                <View style={styles.dropdownEmpty}>
                  <MaterialCommunityIcons name="email-alert-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.dropdownEmptyText}>No {commChannel.toLowerCase()} templates available.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Sending Account Selection Bottom Sheet Modal */}
      <Modal
        visible={accountDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setAccountDropdown(false)}
      >
        <Pressable style={styles.bottomSheetBackdrop} onPress={() => setAccountDropdown(false)}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.dragHandle} />

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Sending Account</Text>
              <Pressable style={styles.closeBtnSmall} onPress={() => setAccountDropdown(false)}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
              {[
                { name: 'SendGrid (Connected)', provider: 'Email Delivery Agent', desc: 'Secure high-deliverability primary transactional route', icon: 'email-check-outline', status: 'ACTIVE' },
                { name: 'WhatsApp Business API', provider: 'WhatsApp Business Account', desc: 'Official Cloud API with high message limits', icon: 'whatsapp', status: 'CONNECTED' },
                { name: 'Default System Provider', provider: 'Fallback Relay Agent', desc: 'Shared fallback channel for basic communications', icon: 'server-network', status: 'DEFAULT' }
              ].map(opt => {
                const isSelected = sendingAccount === opt.name;
                return (
                  <Pressable
                    key={opt.name}
                    style={[styles.bottomSheetItem, isSelected && styles.bottomSheetItemActive]}
                    onPress={() => {
                      setSendingAccount(opt.name);
                      setAccountDropdown(false);
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>{opt.name}</Text>
                        <View style={[styles.statusMiniBadge, isSelected ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: `${colors.accentTeal}15` }]}>
                          <Text style={[styles.statusMiniBadgeText, isSelected ? { color: '#FFFFFF' } : { color: colors.accentTeal }]}>{opt.status}</Text>
                        </View>
                      </View>
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
    aiCampaignBtn: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#0B2D3E',
      height: 52,
      borderRadius: 14,
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
      fontSize: 14,
      fontWeight: '800',
    },
    channelFilterWrapper: {
      flex: 1,
    },
    channelSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    channelSelectorText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dropdownMenu: {
      position: 'absolute',
      top: 56,
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
      height: 52,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    fab: {
      position: 'absolute',
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#0B2D3E',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 1000,
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
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 20,
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
      gap: 8,
    },
    channelTab: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      backgroundColor: theme === 'dark' ? colors.surfaceMuted : colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    channelTabActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    channelTabText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modernTitleGroup: {
      flex: 1,
    },
    modernCampaignName: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    modernMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      marginHorizontal: 8,
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
    // Campaign Intelligence Dashboard Styles
    intelStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    intelStatCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    intelStatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    intelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    intelBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    intelStatLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    intelStatLargeValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    streamCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    streamHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    streamTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
    },
    streamTable: {
      gap: 12,
    },
    streamTableHead: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 8,
    },
    streamHeadText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.inputPlaceholder,
    },
    streamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    rowName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    rowSub: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    actionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    actionBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#475569',
    },
    rowScore: {
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'right',
    },
    engagementCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    progressItem: {
      marginBottom: 16,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#475569',
    },
    progressValue: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    optimizedWindowBox: {
      backgroundColor: colors.accentTeal,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    windowLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      marginBottom: 8,
    },
    windowTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    windowTime: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    windowSub: {
      fontSize: 10,
      color: colors.inputPlaceholder,
    },
    abOutcomeCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    winnerBox: {
      borderWidth: 1,
      borderColor: '#10B981',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 16,
    },
    winnerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    winnerTopic: {
      fontSize: 14,
      fontWeight: '700',
      color: '#0F766E',
    },
    winnerLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: '#FFFFFF',
      backgroundColor: '#10B981',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    winnerStat: {
      fontSize: 20,
      fontWeight: '900',
      color: '#0D9488',
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
  });
}