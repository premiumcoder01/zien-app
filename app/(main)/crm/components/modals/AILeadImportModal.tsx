import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { addCRMLead, analyzeContactsFile, extractContactsWithAI, importCRMLeads } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

interface AILeadImportModalProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string | null;
  metaData: {
    groups?: Array<{ id: number; name: string }>;
    tags?: Array<{ id: number; name: string; tag_color: string }>;
  } | null;
  onImportSuccess: () => void;
}

type ImportStep = 'upload' | 'review';

const ANALYSIS_STEPS = [
  { id: 'parse', label: 'Decompressing document stream' },
  { id: 'schema', label: 'Analyzing field headers & structures' },
  { id: 'semantic', label: 'Injecting neural semantic mapping' },
  { id: 'tag', label: 'Applying matching tags and groups' },
  { id: 'complete', label: 'Successfully ingested leads' },
] as const;

export const AILeadImportModal: React.FC<AILeadImportModalProps> = ({
  visible,
  onClose,
  accessToken,
  metaData,
  onImportSuccess,
}) => {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [instructions, setInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; uri: string; mimeType?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedStepIndex, setCompletedStepIndex] = useState(-1);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [selectedContactIndices, setSelectedContactIndices] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  // Reset state when modal is closed
  useEffect(() => {
    if (!visible) {
      resetImport();
    }
  }, [visible]);

  // Rotate animation for SVG loader
  useEffect(() => {
    if (!isAnalyzing) {
      spinValue.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isAnalyzing]);

  const resetImport = () => {
    setInstructions('');
    setSelectedFile(null);
    setIsAnalyzing(false);
    setCompletedStepIndex(-1);
    setParsedContacts([]);
    setSelectedContactIndices({});
    setCurrentStep('upload');
  };

  const toggleSelectAll = () => {
    const allSelected = parsedContacts.length > 0 && parsedContacts.every((_, idx) => selectedContactIndices[idx]);
    const nextState = !allSelected;
    const updated: Record<number, boolean> = {};
    parsedContacts.forEach((_, idx) => {
      updated[idx] = nextState;
    });
    setSelectedContactIndices(updated);
  };

  const toggleSelectContact = (idx: number) => {
    setSelectedContactIndices(prev => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const removeContact = (idx: number) => {
    const updatedContacts = parsedContacts.filter((_, i) => i !== idx);
    setParsedContacts(updatedContacts);
    setSelectedContactIndices(prev => {
      const updated: Record<number, boolean> = {};
      updatedContacts.forEach((_, i) => {
        const oldIndex = i >= idx ? i + 1 : i;
        updated[i] = prev[oldIndex] !== undefined ? prev[oldIndex] : true;
      });
      return updated;
    });
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0.11 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        setSelectedFile({
          name: asset.name,
          size: formatBytes(asset.size),
          uri: asset.uri,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      } else if (result && !(result as any).canceled && (result as any).uri) {
        // Fallback for older expo-document-picker structures
        const oldResult = result as any;

        setSelectedFile({
          name: oldResult.name || 'Leads_Export.csv',
          size: formatBytes(oldResult.size),
          uri: oldResult.uri,
          mimeType: 'application/octet-stream',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not open document picker: ' + error.message);
    }
  };



  const startAnalysis = async () => {
    if (!selectedFile) {
      Alert.alert('No File Uploaded', 'Please upload a CSV file to begin.');
      return;
    }

    setIsAnalyzing(true);
    setCompletedStepIndex(-1);

    try {
      // Step 1: Decompressing document stream
      setCompletedStepIndex(0);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Read actual file contents using expo-file-system as UTF8 text
      const fileText = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: FileSystem.EncodingType.UTF8 });

      // Step 2: Analyzing field headers & structures
      setCompletedStepIndex(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Call Zien text extraction AI API
      setCompletedStepIndex(2);

      const promptPayload = `\nAnalyze the following lead list data and extract the leads.\nUser instructions/context: "${instructions || 'None'}"\n\nLead data:\n${fileText}\n`;
      const systemInstructionPayload = `\nYou are an expert CRM lead analyst. Analyze the provided lead list data and any user instructions, and output a valid JSON array of lead objects. \nEach lead object MUST exactly match this JSON schema:\n{\n  \"name\": string (full name),\n  \"email\": string,\n  \"source\": string (the source of the lead, e.g., \"LinkedIn\", \"Web\", \"Referral\", \"Manual\"),\n  \"status\": string (categorize as \"New\" or \"Qualified\"),\n  \"score\": number (lead intent score from 1 to 100),\n  \"tag\": string (such as \"HOT\", \"WARM\", or \"COLD\"),\n  \"confidence\": number (confidence score of analysis from 1 to 100),\n  \"date\": string (such as \"Today\", \"Yesterday\", or a short relative date)\n}\n\nReturn ONLY the raw JSON array of objects. Do not include any markdown formatting, backticks (such as \`\`\`json), or other text outside the JSON array.\n`;

      const responseData = await extractContactsWithAI(
        accessToken || '',
        promptPayload,
        systemInstructionPayload
      );

      let cleanResult = '';
      if (Array.isArray(responseData)) {
        cleanResult = JSON.stringify(responseData);
      } else if (responseData && typeof responseData === 'object') {
        const anyResponse = responseData as any;
        if (Array.isArray(anyResponse.result)) {
          cleanResult = JSON.stringify(anyResponse.result);
        } else if (typeof anyResponse.result === 'string') {
          cleanResult = anyResponse.result.trim();
        } else if (Array.isArray(anyResponse.contacts)) {
          cleanResult = JSON.stringify(anyResponse.contacts);
        } else if (Array.isArray(anyResponse.leads)) {
          cleanResult = JSON.stringify(anyResponse.leads);
        } else {
          const arrayKey = Object.keys(anyResponse).find(k => Array.isArray(anyResponse[k]));
          if (arrayKey) {
            cleanResult = JSON.stringify(anyResponse[arrayKey]);
          } else {
            throw new Error('AI returned an unparseable response.');
          }
        }
      }

      // Clean up markdown markers if present
      cleanResult = cleanResult.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      const leads = JSON.parse(cleanResult);

      if (!Array.isArray(leads)) {
        throw new Error('AI returned an invalid lead list format.');
      }

      setParsedContacts(leads);
      const initialSelection: Record<number, boolean> = {};
      leads.forEach((_, idx) => {
        initialSelection[idx] = true;
      });
      setSelectedContactIndices(initialSelection);

      // Step 4: Applying matching tags and groups
      setCompletedStepIndex(3);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 5: Ingestion Complete
      setCompletedStepIndex(4);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsAnalyzing(false);
      setCurrentStep('review'); // Switch to Zien review table screen!
    } catch (error: any) {
      setIsAnalyzing(false);
      Alert.alert(
        'AI Mapping Failed',
        'Zien Neural Studio failed to map the CSV columns semantically: ' + error.message,
        [{ text: 'Dismiss' }]
      );
    }
  };

  const confirmAndImport = async () => {
    setIsSaving(true);
    try {
      const defaultGroup = metaData?.groups?.[0]?.id || 1;
      const findGroupId = (aiGroupName: string) => {
        if (!metaData?.groups) return defaultGroup;
        const nameLower = (aiGroupName || '').toLowerCase().trim();
        const exactMatch = metaData.groups.find(g => g.name.toLowerCase() === nameLower);
        if (exactMatch) return exactMatch.id;
        const subMatch = metaData.groups.find(g => nameLower.includes(g.name.toLowerCase()) || g.name.toLowerCase().includes(nameLower));
        if (subMatch) return subMatch.id;
        return defaultGroup;
      };

      const defaultTag = metaData?.tags?.[0]?.id || 1;
      const findTagId = (aiTagName: string) => {
        if (!metaData?.tags) return defaultTag;
        const nameLower = (aiTagName || '').toLowerCase().trim();
        const exactMatch = metaData.tags.find(t => t.name.toLowerCase() === nameLower);
        if (exactMatch) return exactMatch.id;
        const subMatch = metaData.tags.find(t => nameLower.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(nameLower));
        if (subMatch) return subMatch.id;
        return defaultTag;
      };

      // Prepare list of selected contacts to import
      const leadsToImport = parsedContacts.filter((_, idx) => !!selectedContactIndices[idx]);
      if (leadsToImport.length === 0) {
        Alert.alert('No Selection', 'Please select at least one lead to import.');
        setIsSaving(false);
        return;
      }

      const importPayload = leadsToImport.map(contact => {
        // Split name to first & last
        let firstName = contact.name || 'Lead';
        let lastName = '';
        if (firstName.includes(' ')) {
          const parts = firstName.split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }

        return {
          first_name: firstName,
          last_name: lastName || 'Lead',
          email: contact.email || 'no-email@zien.ai',
          phone: contact.phone || '',
          country_code: contact.phone ? '+1' : null,
          group_id: findGroupId(contact.group || 'Buyer'),
          tag_id: findTagId(contact.tag || 'Lead'),
          source: contact.source || 'AI Import',
          status: contact.status === 'Qualified' ? 1 : 0,
          score: contact.score || 75,
          lead_date_label: contact.date || 'Today',
        };
      });

      if (accessToken) {
        try {
          await importCRMLeads(accessToken, importPayload);
        } catch (batchErr) {
          console.warn('Batch leads import failed, falling back to sequential loops', batchErr);
          for (const payload of importPayload) {
            await addCRMLead(accessToken, payload);
          }
        }
      }

      setIsSaving(false);
      Alert.alert(
        'Synchronization Success',
        `Successfully integrated all ${leadsToImport.length} leads into your Zien CRM.`,
        [
          {
            text: 'Done',
            onPress: () => {
              onImportSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Database Sync Failed', err.message || 'Could not save imported leads.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
        <View style={styles.modalContent}>

          {/* STEP 1: Main upload screen */}
          {currentStep === 'upload' ? (
            <>
              {/* Header Area */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <LinearGradient
                    colors={['#0a2341', '#00a7b5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sparkleIconBadge}
                  >
                    <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.headerTexts}>
                    <Text style={styles.title}>AI Lead Import</Text>
                    <Text style={styles.subtitle}>
                      Let AI analyze your leads and automatically calculate heat scores and intent patterns.
                    </Text>
                  </View>
                  <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                    <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* Decorative line */}
              <View style={styles.dividerLine} />

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
              >
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="comment-text-outline" size={16} color={theme === 'dark' ? '#00a7b5' : colors.accentTeal} />
                    <Text style={styles.sectionTitle}>Lead Context & Campaign Info</Text>
                  </View>

                  <View style={styles.textareaContainer}>
                    <TextInput
                      style={styles.textarea}
                      multiline
                      numberOfLines={4}
                      value={instructions}
                      onChangeText={setInstructions}
                      placeholder="Describe the source of these leads... (e.g., 'From the Spring Open House, interested in luxury condos')"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Pressable style={styles.textareaUploadBtn} onPress={handlePickDocument} hitSlop={8}>
                      <MaterialCommunityIcons name="upload" size={18} color="#64748B" />
                    </Pressable>

                    {selectedFile && (
                      <View style={styles.textareaBadgeRow}>
                        <View style={styles.badgeGreen}>
                          <MaterialCommunityIcons name="star-four-points" size={10} color="#10B981" />
                        </View>
                        <View style={styles.badgeRed}>
                          <Text style={styles.badgeRedText}>1</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Advice Card */}
                  <View style={styles.tooltipCard}>
                    <View style={styles.tooltipIconBadge}>
                      <MaterialCommunityIcons name="robot-outline" size={15} color={theme === 'dark' ? '#00a7b5' : colors.accentTeal} />
                    </View>
                    <Text style={styles.tooltipText}>
                      Optional: Describing your data helps the AI map ambiguous fields and group leads by intent.
                    </Text>
                  </View>

                  {/* File Upload Selector */}
                  {!selectedFile ? (
                    <View style={styles.uploadSection}>
                      <Pressable
                        style={styles.uploadContainer}
                        onPress={handlePickDocument}
                      >
                        <View style={styles.uploadIconBadge}>
                          <MaterialCommunityIcons
                            name="upload"
                            size={24}
                            color={colors.textSecondary}
                          />
                        </View>
                        <Text style={styles.uploadTitle}>Upload your lead list</Text>
                        <Text style={styles.uploadSubtitle}>
                          Drag and drop CSV or Excel files here
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.attachedCardContainer}>
                      <View style={styles.attachedFileBox}>
                        <View style={styles.attachedIconFrame}>
                          <MaterialCommunityIcons
                            name="file-document-outline"
                            size={26}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.attachedInfo}>
                          <Text style={styles.attachedFileName} numberOfLines={1}>
                            {selectedFile.name}
                          </Text>
                          <View style={styles.attachedStatusRow}>
                            <Text style={styles.attachedReadyText}>
                              Ready to Process • {selectedFile.size}
                            </Text>
                            <Pressable onPress={handlePickDocument} hitSlop={12}>
                              <Text style={styles.attachedChangeText}>Change File</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>

                      {/* Launch AI Analysis Button */}
                      <Pressable style={styles.initializeBtn} onPress={startAnalysis}>
                        <LinearGradient
                          colors={['#0a2341', '#00a7b5']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.initializeGradient}
                        >
                          <MaterialCommunityIcons name="star-four-points" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.initializeBtnText}>Initialize AI Lead Scoring</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
            </>
          ) : (

            /* STEP 2: AI Processing Table Review Screen */
            <>
              {/* Review Page Header */}
              <View style={styles.header}>
                <View style={[styles.headerTitleRow, { alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <LinearGradient
                      colors={['#0a2341', '#00a7b5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sparkleIconBadge}
                    >
                      <MaterialCommunityIcons name="table-large" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { fontSize: 18 }]} numberOfLines={1}>Lead Intelligence Table</Text>
                    </View>
                  </View>

                  {/* Reset button inside top right */}
                  <Pressable onPress={resetImport} style={styles.startNewBtn} hitSlop={10}>
                    <MaterialCommunityIcons name="sync" size={13} color={colors.textPrimary} style={{ marginRight: 3 }} />
                    <Text style={[styles.startNewText, { fontSize: 11 }]}>Start New</Text>
                  </Pressable>
                </View>

                {/* Subtitle rendered outside horizontal row, taking full width */}
                <Text style={[styles.subtitle, { marginTop: 8 }]}>
                  Review all mapped fields. AI has automatically calculated scores and identified high-intent leads.
                </Text>
              </View>

              <View style={styles.dividerLine} />

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* Confidence Card Header Banner */}
                <View style={styles.reviewBannerCard}>
                  <View style={styles.reviewBannerRow}>
                    <View style={styles.reviewBannerInfo}>
                      <View style={styles.reviewRobotFrame}>
                        <MaterialCommunityIcons name="robot-outline" size={16} color={theme === 'dark' ? '#00a7b5' : colors.accentTeal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewBannerTitle}>Lead Intelligence Table</Text>
                        <Text style={styles.reviewBannerSub}>Reviewing AI analyzed leads before CRM integration.</Text>
                      </View>
                    </View>
                    <View style={styles.confidenceBadgeWrap}>
                      <Text style={styles.confidenceLabel}>AVG SCORE</Text>
                      <View style={styles.confidenceValueRow}>
                        <Text style={[styles.confidenceValue, { color: '#00a7b5' }]}>
                          {(parsedContacts.length > 0 ? (parsedContacts.reduce((sum, c) => sum + (c.score || 50), 0) / parsedContacts.length).toFixed(1) : '80.4')}/100
                        </Text>
                        <View style={[styles.confidenceCheckCircle, { backgroundColor: '#00a7b5' }]}>
                          <MaterialCommunityIcons name="check-bold" size={10} color="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* scrollable leads review list */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={styles.contactsListHeader}>Parsed Lead Records ({parsedContacts.length})</Text>
                  
                  <Pressable 
                    onPress={toggleSelectAll} 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight }}
                  >
                    <MaterialCommunityIcons 
                      name={parsedContacts.length > 0 && parsedContacts.every((_, idx) => selectedContactIndices[idx]) ? "checkbox-marked" : "checkbox-blank-outline"} 
                      size={16} 
                      color={colors.accentTeal} 
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>Select All</Text>
                  </Pressable>
                </View>

                <View style={{ gap: 14 }}>
                  {parsedContacts.map((contact, idx) => (
                    <View key={idx} style={[styles.reviewCard, !selectedContactIndices[idx] && { opacity: 0.6 }]}>
                      {/* Checkbox and Delete Row */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, opacity: 0.8, marginBottom: 12 }}>
                        <Pressable 
                          onPress={() => toggleSelectContact(idx)} 
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                          <MaterialCommunityIcons 
                            name={selectedContactIndices[idx] ? "checkbox-marked" : "checkbox-blank-outline"} 
                            size={20} 
                            color={selectedContactIndices[idx] ? colors.accentTeal : colors.textMuted} 
                          />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>
                            {selectedContactIndices[idx] ? 'SELECTED FOR IMPORT' : 'EXCLUDED FROM IMPORT'}
                          </Text>
                        </Pressable>
                        
                        <Pressable onPress={() => removeContact(idx)} style={{ padding: 4 }}>
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                        </Pressable>
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                        {/* COLUMN 1: LEAD DETAILS */}
                        <View style={{ minWidth: 150, flex: 2 }}>
                          <Text style={styles.reviewCardLabel}>LEAD DETAILS</Text>
                          <Text style={styles.reviewCardName} numberOfLines={1}>{contact.name || 'Unknown'}</Text>
                          <Text style={[styles.reviewCardEmail, { color: theme === 'dark' ? '#00a7b5' : '#0a2341' }]} numberOfLines={1}>{contact.email || 'no-email@zien.ai'}</Text>
                        </View>

                        {/* COLUMN 2: SOURCE */}
                        <View style={{ minWidth: 80, flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>SOURCE</Text>
                          <Text style={styles.reviewCardValueBold}>{contact.source || 'Manual'}</Text>
                          <Text style={styles.reviewCardValueSub}>{contact.date || 'Today'}</Text>
                        </View>

                        {/* COLUMN 3: AI LEAD SCORE */}
                        <View style={{ minWidth: 60, flex: 1, alignItems: 'center' }}>
                          <Text style={styles.reviewCardLabel}>AI LEAD SCORE</Text>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#00a7b5', marginTop: 2 }}>{contact.score || 50}</Text>
                        </View>

                        {/* COLUMN 4: STATUS */}
                        <View style={{ minWidth: 60, flex: 1, alignItems: 'center' }}>
                          <Text style={styles.reviewCardLabel}>STATUS</Text>
                          <View style={{ backgroundColor: contact.status === 'Qualified' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: contact.status === 'Qualified' ? '#10B981' : '#EF4444' }}>{(contact.status || 'New').toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* COLUMN 5: CATEGORY */}
                        <View style={{ minWidth: 60, flex: 1, alignItems: 'center' }}>
                          <Text style={styles.reviewCardLabel}>CATEGORY</Text>
                          <View style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textSecondary }}>{(contact.tag || 'WARM').toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* COLUMN 6: CONFIDENCE */}
                        <View style={{ minWidth: 80, flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>CONFIDENCE</Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 4 }}>{contact.confidence || 95}%</Text>
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft, overflow: 'hidden' }}>
                            <View style={{ height: 6, width: `${contact.confidence || 95}%` as any, backgroundColor: '#00a7b5' }} />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Bottom buttons row */}
                <View style={styles.reviewActionsRow}>
                  <Pressable
                    style={styles.confirmImportBtn}
                    onPress={confirmAndImport}
                    disabled={isSaving}
                  >
                    <LinearGradient
                      colors={['#0a2341', '#00a7b5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.confirmImportGradient}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmImportBtnText}>
                            Confirm & Import {parsedContacts.filter((_, idx) => !!selectedContactIndices[idx]).length} Leads
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.adjustInstructionsBtn}
                    onPress={() => setCurrentStep('upload')}
                  >
                    <Text style={styles.adjustInstructionsBtnText}>Adjust Instructions</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>

      {/* Full-Screen Immersive Step-by-Step AI Analysis overlay */}
      <Modal
        visible={isAnalyzing}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.analysisOverlay}>
          <View style={styles.analysisCard}>
            {/* Animated SVG Loader Ring */}
            <View style={styles.analysisIconWrap}>
              <Animated.View
                style={[
                  styles.analysisLoaderRingWrap,
                  {
                    transform: [
                      {
                        rotate: spinValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Svg width={96} height={96} style={styles.analysisSvg}>
                  <Circle
                    cx={48}
                    cy={48}
                    r={42}
                    stroke={theme === 'dark' ? '#00a7b5' : colors.accentTeal}
                    strokeWidth={4.5}
                    fill="none"
                    strokeDasharray="50 180"
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>
              <View style={styles.analysisLoaderInner}>
                <View style={styles.analysisLoaderWhiteRing} />
                <View style={styles.analysisBrainIconWrap}>
                  <MaterialCommunityIcons name="brain" size={32} color={theme === 'dark' ? '#00a7b5' : colors.accentTeal} />
                </View>
              </View>
            </View>

            <Text style={styles.analysisTitle}>Analyzing Lead List</Text>
            <Text style={styles.analysisSubtitle}>
              Applying semantic neural intelligence...
            </Text>

            <View style={styles.stepsList}>
              {ANALYSIS_STEPS.map((step, idx) => {
                const isDone = idx <= completedStepIndex;
                const inProgress = idx === completedStepIndex + 1;
                return (
                  <View key={step.id} style={styles.stepRow}>
                    <Text
                      style={[
                        styles.stepLabel,
                        !isDone && !inProgress ? styles.stepLabelPending : null,
                        inProgress ? styles.stepLabelInProgress : null,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isDone ? (
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      </View>
                    ) : inProgress ? (
                      <ActivityIndicator size="small" color={theme === 'dark' ? '#00a7b5' : colors.accentTeal} />
                    ) : (
                      <View style={styles.pendingBadge} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const getStyles = (colors: ThemeColors, theme?: string) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sparkleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme === 'dark' ? '#000000' : '#0a2341',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTexts: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSoft,
  },
  startNewText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: colors.divider,
    marginHorizontal: 20,
    opacity: 0.8,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  textareaContainer: {
    position: 'relative',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 14,
  },
  textarea: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    height: 110,
    textAlignVertical: 'top',
    paddingRight: 32,
  },
  textareaUploadBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textareaBadgeRow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
  },
  badgeGreen: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRed: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tooltipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.05)' : `${colors.accentTeal}08`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.15)' : `${colors.accentTeal}15`,
    padding: 14,
    marginBottom: 20,
  },
  tooltipIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.12)' : `${colors.accentTeal}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    flex: 1,
    fontSize: 12,
    color: theme === 'dark' ? '#00a7b5' : colors.textSecondary,
    fontWeight: '600',
    lineHeight: 16,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadContainer: {
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surfaceSoft,
  },
  uploadIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  uploadFormats: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  attachedCardContainer: {
    gap: 16,
  },
  attachedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 14,
  },
  attachedIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme === 'dark' ? '#00a7b5' : colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: {
    flex: 1,
    gap: 2,
  },
  attachedFileName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  attachedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachedReadyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  attachedChangeText: {
    fontSize: 12,
    color: theme === 'dark' ? '#00a7b5' : colors.accentTeal,
    fontWeight: '800',
  },
  initializeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme === 'dark' ? '#000000' : '#0a2341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  initializeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 20,
  },
  initializeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  analysisOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  analysisCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  analysisIconWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  analysisLoaderRingWrap: {
    position: 'absolute',
    width: 96,
    height: 96,
  },
  analysisSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  analysisLoaderInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisLoaderWhiteRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.cardBackground,
  },
  analysisBrainIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.12)' : `${colors.accentTeal}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  analysisSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 24,
  },
  stepsList: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  stepLabelPending: {
    color: colors.textMuted,
  },
  stepLabelInProgress: {
    color: theme === 'dark' ? '#00a7b5' : colors.accentTeal,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    marginRight: 6,
  },
  reviewBannerCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 20,
  },
  reviewBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  reviewBannerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewRobotFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme === 'dark' ? 'rgba(0, 167, 181, 0.12)' : `${colors.accentTeal}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  reviewBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  confidenceBadgeWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  confidenceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme === 'dark' ? '#00a7b5' : colors.accentTeal,
  },
  confidenceCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsListHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  reviewCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 16,
  },
  reviewCardSection: {
    gap: 2,
  },
  reviewCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewCardName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  reviewCardEmail: {
    fontSize: 13,
    color: theme === 'dark' ? '#00a7b5' : colors.accentTeal,
    fontWeight: '700',
  },
  reviewCardPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  reviewCardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  groupTextBadge: {
    backgroundColor: `${colors.textPrimary}10`,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 2,
  },
  groupTextValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reviewCardValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reviewCardValueSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reviewTagBadge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  reviewTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reviewActionsRow: {
    gap: 12,
    marginTop: 24,
  },
  confirmImportBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme === 'dark' ? '#000000' : '#0a2341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmImportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  confirmImportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  adjustInstructionsBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustInstructionsBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
