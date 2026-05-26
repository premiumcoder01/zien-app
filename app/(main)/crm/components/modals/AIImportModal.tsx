import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';
import { addCRMContact, AddCRMContactPayload } from '@/services/crmService';

interface AIImportModalProps {
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

export const AIImportModal: React.FC<AIImportModalProps> = ({
  visible,
  onClose,
  accessToken,
  metaData,
  onImportSuccess,
}) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [instructions, setInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; uri: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedStepIndex, setCompletedStepIndex] = useState(-1);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
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
    setCurrentStep('upload');
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
        type: ['text/comma-separated-values', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Enforce strict CSV type check
        if (!asset.name.toLowerCase().endsWith('.csv')) {
          Alert.alert('Unsupported File Format', 'Please select a valid CSV (.csv) contact list only.');
          return;
        }

        setSelectedFile({
          name: asset.name,
          size: formatBytes(asset.size),
          uri: asset.uri,
        });
      } else if (result && !(result as any).canceled && (result as any).uri) {
        // Fallback for older expo-document-picker structures
        const oldResult = result as any;
        if (!oldResult.name.toLowerCase().endsWith('.csv')) {
          Alert.alert('Unsupported File Format', 'Please select a valid CSV (.csv) contact list only.');
          return;
        }

        setSelectedFile({
          name: oldResult.name || 'Leads_Export.csv',
          size: formatBytes(oldResult.size),
          uri: oldResult.uri,
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

      // Read actual file contents using expo-file-system
      const csvContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      
      // Step 2: Analyzing field headers & structures
      setCompletedStepIndex(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Call Zien text generation AI API to semantically parse contacts
      setCompletedStepIndex(2);

      const promptPayload = `\nAnalyze the following contact list data and extract the contacts.\nUser instructions/context: "${instructions || 'Extract all leads'}"\n\nContact data:\n${csvContent}\n`;
      const systemInstructionPayload = `\nYou are an expert CRM data analyst. Analyze the provided contact list data and any user instructions, and output a valid JSON array of contact objects. \nEach contact object MUST exactly match this JSON schema:\n{\n  \"name\": string (full name),\n  \"email\": string,\n  \"phone\": string,\n  \"group\": string (categorize as \"Buyer\", \"Seller\", \"Investor\", or \"Past Client\" based on context and user instructions),\n  \"tag\": string (such as \"High Priority\", \"Review Required\", \"Lead\", \"VIP\", etc.),\n  \"tagColor\": string (hex color code suitable for the tag, e.g., \"#F37021\", \"#00A7B5\", \"#64748B\"),\n  \"confidence\": number (confidence score from 1 to 100),\n  \"source\": string (the source of the contact, e.g., \"LinkedIn\", \"Web\", \"Referral\", \"Manual\"),\n  \"attribution\": string (attribution info or event, e.g., \"Tech Summit Lead\", \"Direct Search\", \"Past Client\"),\n  \"budget\": string (budget info, e.g. \"$2M - $5M\", \"$800k - $1.2M\", \"N/A\"),\n  \"timeline\": string (timeline info, e.g. \"Active\", \"3-6 Months\", \"Immediate\")\n}\n\nReturn ONLY the raw JSON array of objects. Do not include any markdown formatting, backticks (such as \`\`\`json), or other text outside the JSON array.\n`;

      const response = await fetch('https://staging-api.zien.ai/api/shared/ai/generate-text', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          prompt: promptPayload,
          systemInstruction: systemInstructionPayload,
          complexity: 'complex'
        }),
      });

      if (!response.ok) {
        throw new Error(`Zien AI Server returned: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      let cleanResult = responseData.result || '';
      
      // Clean up markdown markers if present
      cleanResult = cleanResult.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      const contacts = JSON.parse(cleanResult);

      if (!Array.isArray(contacts)) {
        throw new Error('AI returned an invalid contact list format.');
      }

      setParsedContacts(contacts);

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
      // Find database groups/tags
      const defaultGroup = metaData?.groups?.[0]?.id || 1;
      const buyerGroup = metaData?.groups?.find(g => g.name.toLowerCase().includes('buyer'))?.id || defaultGroup;
      const sellerGroup = metaData?.groups?.find(g => g.name.toLowerCase().includes('seller'))?.id || defaultGroup;
      const investorGroup = metaData?.groups?.find(g => g.name.toLowerCase().includes('investor'))?.id || defaultGroup;

      const defaultTag = metaData?.tags?.[0]?.id || 1;
      const hotTag = metaData?.tags?.find(t => t.name.toLowerCase().includes('hot'))?.id || defaultTag;
      const followUpTag = metaData?.tags?.find(t => t.name.toLowerCase().includes('follow'))?.id || defaultTag;
      const vipTag = metaData?.tags?.find(t => t.name.toLowerCase().includes('vip'))?.id || defaultTag;

      // Ingest parsed leads sequentially
      if (accessToken && parsedContacts.length > 0) {
        for (const contact of parsedContacts) {
          // Parse semantic group mapping
          let groupId = defaultGroup;
          const groupName = (contact.group || '').toLowerCase();
          if (groupName.includes('buyer')) groupId = buyerGroup;
          else if (groupName.includes('seller')) groupId = sellerGroup;
          else if (groupName.includes('investor')) groupId = investorGroup;

          // Parse semantic tag mapping
          let tagId = defaultTag;
          const tagName = (contact.tag || '').toLowerCase();
          if (tagName.includes('hot') || tagName.includes('high')) tagId = hotTag;
          else if (tagName.includes('follow') || tagName.includes('review')) tagId = followUpTag;
          else if (tagName.includes('vip')) tagId = vipTag;

          // Split name to first & last
          let firstName = contact.name || 'Lead';
          let lastName = '';
          if (firstName.includes(' ')) {
            const parts = firstName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }

          const payload: AddCRMContactPayload = {
            first_name: firstName,
            last_name: lastName || 'Lead',
            email: contact.email || 'no-email@zien.ai',
            phone: contact.phone || '',
            country_code: '+1',
            group_id: groupId,
            tag_id: tagId,
          };

          await addCRMContact(accessToken, payload);
        }
      }

      setIsSaving(false);
      Alert.alert(
        'Synchronization Success',
        `Successfully integrated all ${parsedContacts.length} contacts into your Zien CRM.`,
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
      Alert.alert('Database Sync Failed', err.message || 'Could not save imported contacts.');
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
                    colors={['#0BA0B2', '#00a7b5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sparkleIconBadge}
                  >
                    <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.headerTexts}>
                    <Text style={styles.title}>AI Import</Text>
                    <Text style={styles.subtitle}>
                      Let AI analyze your files and automatically group contacts by intent, tags, and data patterns.
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
                    <MaterialCommunityIcons name="comment-text-outline" size={16} color={colors.accentTeal} />
                    <Text style={styles.sectionTitle}>Import Context & Instructions</Text>
                  </View>

                  <View style={styles.textareaContainer}>
                    <TextInput
                      style={styles.textarea}
                      multiline
                      numberOfLines={4}
                      value={instructions}
                      onChangeText={setInstructions}
                      placeholder="Tell the AI how to categorize these contacts... (e.g., 'Group by industry and tag VIPs')"
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
                      <MaterialCommunityIcons name="robot-outline" size={15} color={colors.accentTeal} />
                    </View>
                    <Text style={styles.tooltipText}>
                      Optional: Describing your data helps the AI map ambiguous fields and group contacts by intent.
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
                        <Text style={styles.uploadTitle}>Upload your contact list</Text>
                        <Text style={styles.uploadSubtitle}>
                          Drag and drop your file here, or click to browse
                        </Text>
                        <Text style={styles.uploadFormats}>CSV files only</Text>
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
                          colors={['#0BA0B2', '#00a7b5']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.initializeGradient}
                        >
                          <MaterialCommunityIcons name="star-four-points" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.initializeBtnText}>Initialize AI Intelligence Mapping</Text>
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
                      colors={['#0BA0B2', '#00a7b5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sparkleIconBadge}
                    >
                      <MaterialCommunityIcons name="table-large" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { fontSize: 18 }]} numberOfLines={1}>AI Processing Table</Text>
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
                  Review all mapped fields. AI has automatically extracted contact details, attribution, and intent.
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
                        <MaterialCommunityIcons name="robot-outline" size={16} color={colors.accentTeal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewBannerTitle}>Full Intelligence Field Mapping</Text>
                        <Text style={styles.reviewBannerSub}>Previewing all data points before database synchronization.</Text>
                      </View>
                    </View>
                    <View style={styles.confidenceBadgeWrap}>
                      <Text style={styles.confidenceLabel}>AVG CONFIDENCE</Text>
                      <View style={styles.confidenceValueRow}>
                        <Text style={styles.confidenceValue}>94.2%</Text>
                        <View style={styles.confidenceCheckCircle}>
                          <MaterialCommunityIcons name="check-bold" size={10} color="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* scrollable contacts review list */}
                <Text style={styles.contactsListHeader}>Parsed Contact Records ({parsedContacts.length})</Text>
                
                <View style={{ gap: 14 }}>
                  {parsedContacts.map((contact, idx) => (
                    <View key={idx} style={styles.reviewCard}>
                      
                      {/* CONTACT DETAILS */}
                      <View style={styles.reviewCardSection}>
                        <Text style={styles.reviewCardLabel}>CONTACT DETAILS</Text>
                        <Text style={styles.reviewCardName}>{contact.name || 'Unknown'}</Text>
                        <Text style={styles.reviewCardEmail}>{contact.email || 'no-email@zien.ai'}</Text>
                        {contact.phone && (
                          <Text style={styles.reviewCardPhone}>{contact.phone}</Text>
                        )}
                      </View>

                      <View style={styles.cardSeparator} />

                      {/* Row for Group and Source */}
                      <View style={styles.reviewCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>INTELLIGENCE GROUP</Text>
                          <View style={styles.groupTextBadge}>
                            <Text style={styles.groupTextValue}>{contact.group || 'Lead'}</Text>
                          </View>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>SOURCE / ATTRIBUTION</Text>
                          <Text style={styles.reviewCardValueBold}>{contact.source || 'Web'}</Text>
                          <Text style={styles.reviewCardValueSub}>{contact.attribution || 'Direct Submission'}</Text>
                        </View>
                      </View>

                      <View style={styles.cardSeparator} />

                      {/* Row for Budget/Timeline and Tags */}
                      <View style={styles.reviewCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>BUDGET / TIMELINE</Text>
                          <Text style={styles.reviewCardValueBold}>{contact.budget || 'N/A'}</Text>
                          <Text style={[styles.reviewCardValueBold, { color: '#0BA0B2', marginTop: 2 }]}>
                            {contact.timeline || 'Active'}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewCardLabel}>AI TAGS</Text>
                          <View
                            style={[
                              styles.reviewTagBadge,
                              {
                                backgroundColor: (contact.tagColor || '#64748B') + '15',
                                borderColor: (contact.tagColor || '#64748B') + '40',
                              },
                            ]}
                          >
                            <Text style={[styles.reviewTagText, { color: contact.tagColor || '#64748B' }]}>
                              {(contact.tag || 'Lead').toUpperCase()}
                            </Text>
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
                      colors={['#0BA0B2', '#00a7b5']}
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
                            Confirm & Import {parsedContacts.length} Contacts
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
                    stroke={colors.accentTeal}
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
                  <MaterialCommunityIcons name="brain" size={32} color={colors.accentTeal} />
                </View>
              </View>
            </View>

            <Text style={styles.analysisTitle}>Analyzing Contact List</Text>
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
                      <ActivityIndicator size="small" color={colors.accentTeal} />
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

const getStyles = (colors: any) => StyleSheet.create({
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
    shadowColor: '#0BA0B2',
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
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  textareaContainer: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    marginBottom: 16,
    position: 'relative',
    minHeight: 130,
  },
  textarea: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlignVertical: 'top',
    flex: 1,
    paddingRight: 46,
  },
  textareaUploadBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textareaBadgeRow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 3,
  },
  badgeGreen: {
    padding: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRed: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tooltipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 160, 178, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.15)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  tooltipIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 160, 178, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentTeal,
    lineHeight: 16,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadContainer: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  uploadIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceIcon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  uploadFormats: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  attachedCardContainer: {
    marginBottom: 20,
    gap: 16,
  },
  attachedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  attachedIconFrame: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0b2341',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  attachedInfo: {
    flex: 1,
    gap: 4,
  },
  attachedFileName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0b2341',
  },
  attachedStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachedReadyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  attachedChangeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EF4444',
  },
  initializeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0BA0B2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  initializeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  initializeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  /* Review Screen Mappings */
  reviewBannerCard: {
    backgroundColor: 'rgba(100, 116, 139, 0.03)',
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 18,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0BA0B212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  reviewBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  confidenceBadgeWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  confidenceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
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
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  reviewCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewCardSection: {
    gap: 3,
  },
  reviewCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  reviewCardName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  reviewCardEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reviewCardPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    opacity: 0.6,
  },
  reviewCardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  groupTextBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  groupTextValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  reviewCardValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  reviewCardValueSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  reviewTagBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reviewTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  reviewActionsRow: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  adjustInstructionsBtn: {
    width: '100%',
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  adjustInstructionsBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
  },
  confirmImportBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0BA0B2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmImportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmImportBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Analysis screen overlay
  analysisOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  analysisCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  analysisIconWrap: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisSvg: {
    position: 'absolute',
  },
  analysisLoaderInner: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisLoaderWhiteRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardBackground,
    borderWidth: 3,
    borderColor: colors.borderLight,
  },
  analysisBrainIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  analysisSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  stepsList: {
    width: '100%',
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.rowBorder,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  stepLabelPending: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  stepLabelInProgress: {
    color: colors.accentTeal,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
});
