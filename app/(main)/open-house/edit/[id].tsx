import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getOpenHouseById, updateOpenHouse } from '@/services/openHouseService';
import { RawPropertyItem, uploadPropertyImage } from '@/services/propertyService';
import { generateAiText } from '@/services/aiContentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  KeyboardAvoidingView,
  Keyboard,
  Clipboard
} from 'react-native';
import { ProgressStep, ProgressSteps } from 'react-native-progress-steps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientButton from '@/components/ui/GradientButton';
import OutlineButton from '@/components/ui/OutlineButton';
import ColorPickerModal from '@/components/ui/ColorPickerModal';

function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDisplayTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

const H_PADDING = 18;
const PLACEHOLDER_3 = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600';
const EXTENDED_BRAND_COLORS = ['#0B2D3E', '#0D9488', '#F97316', '#8B5CF6', '#10B981', '#DC2626', '#2563EB', '#0F172A'];
const DESC_STYLES = ['Luxury', 'Friendly', 'Modern'] as const;
type DescStyleKey = 'luxury' | 'friendly' | 'modern';
const DEFAULT_DESCRIPTION =
  'Breathtaking Luxury estate featuring rare architectural details, bespoke imported finishes, and a seamless connection to private, manicured grounds. This residence offers an unparalleled lifestyle for those who demand excellence in every square inch.';

export default function OpenHouseEditScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: openHouseData, isLoading: isLoadingData } = useQuery({
    queryKey: ['open-house', id],
    queryFn: () => getOpenHouseById(accessToken || '', id as string),
    enabled: !!accessToken && !!id,
  });

  const [activeStep, setActiveStep] = useState(0);
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [startTimeDate, setStartTimeDate] = useState(() => { const d = new Date(); d.setHours(13, 0, 0, 0); return d; });
  const [endTimeDate, setEndTimeDate] = useState(() => { const d = new Date(); d.setHours(16, 0, 0, 0); return d; });
  const [agentName, setAgentName] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [sendReport, setSendReport] = useState(true);
  const [accentIndex, setAccentIndex] = useState(0);
  const [brandColors, setBrandColors] = useState<string[]>([...EXTENDED_BRAND_COLORS]);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [descStyle, setDescStyle] = useState<DescStyleKey>('luxury');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [enableVisitorReg, setEnableVisitorReg] = useState(true);
  const [logoMode, setLogoMode] = useState<'text' | 'image'>('text');
  const [agencyLogoUri, setAgencyLogoUri] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [errors, setErrors] = useState<{ agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string }>({});

  const validateStep2 = () => {
    const newErrors: { agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string } = {};
    if (!eventDate) {
      newErrors.eventDate = 'Date is required';
    }
    if (!startTimeDate) {
      newErrors.startTimeDate = 'Start time is required';
    }
    if (!endTimeDate) {
      newErrors.endTimeDate = 'End time is required';
    }
    if (!agentName.trim()) {
      newErrors.agentName = 'Agent Name is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!agentEmail.trim()) {
      newErrors.agentEmail = 'Agent Email is required';
    } else if (!emailRegex.test(agentEmail.trim())) {
      newErrors.agentEmail = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  useEffect(() => {
    if (openHouseData) {
      setSelectedPropertyId(openHouseData.property_id.toString());
      setEventDate(new Date(openHouseData.date + 'T00:00:00'));

      const startParts = openHouseData.start_time.split(':');
      const startD = new Date();
      startD.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0, 0);
      setStartTimeDate(startD);

      const endParts = openHouseData.end_time.split(':');
      const endD = new Date();
      endD.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0, 0);
      setEndTimeDate(endD);

      setAgentName(openHouseData.agent_details?.name || '');
      setBrokerageName(openHouseData.agent_details?.brokerage || '');
      setLicenseNumber(openHouseData.agent_details?.license || '');
      setAgentPhone(openHouseData.agent_details?.phone || '');
      setAgentEmail(openHouseData.agent_details?.email || '');
      setDescription(openHouseData.ai_description || DEFAULT_DESCRIPTION);

      const tone = openHouseData.ai_tone?.toLowerCase() as DescStyleKey;
      if (['luxury', 'friendly', 'modern'].includes(tone)) setDescStyle(tone);

      setGalleryImages(openHouseData.gallery_images || []);
      setEnableVisitorReg(openHouseData.visitor_registration ?? true);
      setSendReport(openHouseData.send_report ?? true);

      if (openHouseData.uploaded_logo) {
        setAgencyLogoUri(openHouseData.uploaded_logo);
        setLogoMode('image');
      } else {
        setLogoMode('text');
      }

      if (openHouseData.brand_color) {
        const cleanedColor = openHouseData.brand_color.toUpperCase();
        const baseColorsUpper = EXTENDED_BRAND_COLORS.map(c => c.toUpperCase());
        const colorIdx = baseColorsUpper.indexOf(cleanedColor);
        if (colorIdx !== -1) {
          setAccentIndex(colorIdx);
        } else {
          setBrandColors([...EXTENDED_BRAND_COLORS, cleanedColor]);
          setAccentIndex(EXTENDED_BRAND_COLORS.length);
        }
      }
    }
  }, [openHouseData]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateOpenHouse(accessToken || '', id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-houses'] });
      queryClient.invalidateQueries({ queryKey: ['open-house', id] });
      setIsFinalized(true);
    },
    onError: (error) => {
      console.error('Update Open House Error:', error);
      Alert.alert('Error', 'Failed to update open house. Please try again.');
    },
  });

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      let uploadedLogoUrl = agencyLogoUri;
      if (logoMode === 'image' && agencyLogoUri && (agencyLogoUri.startsWith('file://') || agencyLogoUri.startsWith('content://'))) {
        const res = await uploadPropertyImage(agencyLogoUri, accessToken!);
        if (res.success) uploadedLogoUrl = res.url;
      } else if (logoMode === 'text') {
        uploadedLogoUrl = null;
      }

      const uploadedGalleryUrls = await Promise.all(
        galleryImages.map(async (uri) => {
          if (uri.startsWith('file://') || uri.startsWith('content://')) {
            const res = await uploadPropertyImage(uri, accessToken!);
            return res.success ? res.url : uri;
          }
          return uri;
        })
      );

      await updateMutation.mutateAsync({
        date: eventDate.toISOString().split('T')[0],
        start_time: startTimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        end_time: endTimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        agent_details: { name: agentName, brokerage: brokerageName, license: licenseNumber, email: agentEmail, phone: agentPhone },
        ai_description: description,
        brand_color: brandColors[accentIndex],
        gallery_images: uploadedGalleryUrls,
        uploaded_logo: uploadedLogoUrl,
        logo_text: logoMode === 'text' ? agentName : null,
        ai_tone: descStyle.charAt(0).toUpperCase() + descStyle.slice(1),
        visitor_registration: enableVisitorReg,
        send_report: sendReport,
      });
    } catch (error: any) {
      console.error('Update Error:', error);
      Alert.alert('Error', error.message || 'Failed to update open house');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground }}>
        <ActivityIndicator size="large" color={colors.accentTeal} />
        <Text style={{ marginTop: 16, color: colors.textSecondary, fontWeight: '600' }}>Loading event details...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >

      <Modal transparent visible={isUpdating} animationType="fade">
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#00A7B5" />
            <Text style={styles.loaderText}>Updating your Open House...</Text>
            <Text style={styles.loaderSubtext}>Saving changes and uploading assets.</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Pressable style={styles.backBtnWrapper} onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.accentTeal} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.stepsWrapper}>
        <ProgressSteps
          activeStep={activeStep}
          topOffset={0}
          marginBottom={16}
          progressBarColor={colors.cardBorder}
          completedProgressBarColor={colors.accentTeal}
          activeStepIconColor={colors.accentTeal}
          activeStepIconBorderColor={colors.accentTeal}
          completedStepIconColor={colors.accentTeal}
          disabledStepIconColor={colors.cardBorder}
          labelColor={colors.textMuted}
          activeLabelColor={colors.accentTeal}
          completedLabelColor={colors.accentTeal}
          activeStepNumColor={colors.cardBackground}
          completedStepNumColor={colors.cardBackground}
          disabledStepNumColor={colors.textSecondary}
          completedCheckColor={colors.cardBackground}
          labelFontSize={10}
          activeLabelFontSize={10}
        >
          <ProgressStep label="DETAILS" removeBtnRow>
            <Step2Details
              eventDate={eventDate}
              setEventDate={setEventDate}
              startTimeDate={startTimeDate}
              setStartTimeDate={setStartTimeDate}
              endTimeDate={endTimeDate}
              setEndTimeDate={setEndTimeDate}
              agentName={agentName}
              setAgentName={setAgentName}
              brokerageName={brokerageName}
              setBrokerageName={setBrokerageName}
              licenseNumber={licenseNumber}
              setLicenseNumber={setLicenseNumber}
              agentPhone={agentPhone}
              setAgentPhone={setAgentPhone}
              agentEmail={agentEmail}
              setAgentEmail={setAgentEmail}
              sendReport={sendReport}
              setSendReport={setSendReport}
              errors={errors}
              setErrors={setErrors}
            />
          </ProgressStep>
          <ProgressStep label="CUSTOMIZATION" removeBtnRow>
            {!isFinalized ? (
              <Step4Customization
                selectedPropertyId={selectedPropertyId}
                properties={openHouseData?.property ? [openHouseData.property as any] : []}
                agentName={agentName}
                eventDate={eventDate}
                startTimeDate={startTimeDate}
                endTimeDate={endTimeDate}
                accentIndex={accentIndex}
                setAccentIndex={setAccentIndex}
                brandColors={brandColors}
                setBrandColors={setBrandColors}
                description={description}
                setDescription={setDescription}
                descStyle={descStyle}
                setDescStyle={setDescStyle}
                galleryImages={galleryImages}
                setGalleryImages={setGalleryImages}
                enableVisitorReg={enableVisitorReg}
                setEnableVisitorReg={setEnableVisitorReg}
                logoMode={logoMode}
                setLogoMode={setLogoMode}
                agencyLogoUri={agencyLogoUri}
                setAgencyLogoUri={setAgencyLogoUri}
              />
            ) : (
              <Step5SheetReady
                createdId={id as string}
                onGoToDashboard={() => router.push('/(main)/open-house' as any)}
              />
            )}
          </ProgressStep>
        </ProgressSteps>
      </View>

      {/* Global Fixed Bottom Bar */}
      {!isFinalized && !isKeyboardVisible && (
        <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {activeStep === 0 && (
            <View style={styles.fixedBtnRow}>
              <OutlineButton
                title="Back"
                onPress={() => router.back()}
                style={styles.fixedSecondaryBtn}
                textStyle={styles.fixedBtnText}
              />
              <GradientButton
                title="Continue to Customization"
                onPress={() => {
                  if (validateStep2()) {
                    setActiveStep(1);
                  }
                }}
                style={styles.fixedPrimaryBtnHalf}
                textStyle={styles.fixedBtnText}
              />
            </View>
          )}
          {activeStep === 1 && (
            <View style={styles.fixedBtnRow}>
              <OutlineButton
                title="Back"
                onPress={() => setActiveStep(0)}
                style={styles.fixedSecondaryBtn}
                textStyle={styles.fixedBtnText}
              />
              <GradientButton
                title="Save Changes"
                isLoading={updateMutation.isPending || isUpdating}
                onPress={handleUpdate}
                style={styles.fixedPrimaryBtnHalf}
                textStyle={styles.fixedBtnText}
              />
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  </LinearGradient>
  );
}

type PickerType = 'date' | 'start' | 'end' | null;

function Step2Details({
  eventDate, setEventDate, startTimeDate, setStartTimeDate, endTimeDate, setEndTimeDate,
  agentName, setAgentName, brokerageName, setBrokerageName, licenseNumber, setLicenseNumber,
  agentPhone, setAgentPhone, agentEmail, setAgentEmail, sendReport, setSendReport,
  errors, setErrors,
}: {
  eventDate: Date; setEventDate: (d: Date) => void;
  startTimeDate: Date; setStartTimeDate: (d: Date) => void;
  endTimeDate: Date; setEndTimeDate: (d: Date) => void;
  agentName: string; setAgentName: (v: string) => void;
  brokerageName: string; setBrokerageName: (v: string) => void;
  licenseNumber: string; setLicenseNumber: (v: string) => void;
  agentPhone: string; setAgentPhone: (v: string) => void;
  agentEmail: string; setAgentEmail: (v: string) => void;
  sendReport: boolean; setSendReport: (v: boolean) => void;
  errors: { agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string }>>;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState<PickerType>(null);
  const [tempValue, setTempValue] = useState<Date>(eventDate);

  const openPicker = (type: PickerType) => {
    if (type === 'date') setTempValue(eventDate);
    else if (type === 'start') setTempValue(startTimeDate);
    else if (type === 'end') setTempValue(endTimeDate);
    setPickerOpen(type);
  };

  const onPickerChange = (_event: { type: string }, selected?: Date) => {
    if (selected != null) setTempValue(selected);
    if (Platform.OS === 'android') {
      if (_event.type === 'set' && selected != null) {
        if (pickerOpen === 'date') setEventDate(selected);
        else if (pickerOpen === 'start') setStartTimeDate(selected);
        else if (pickerOpen === 'end') setEndTimeDate(selected);
      }
      setPickerOpen(null);
    }
  };

  const confirmPicker = () => {
    if (pickerOpen === 'date') setEventDate(tempValue);
    else if (pickerOpen === 'start') setStartTimeDate(tempValue);
    else if (pickerOpen === 'end') setEndTimeDate(tempValue);
    setPickerOpen(null);
  };

  const pickerTitle = pickerOpen === 'date' ? 'Select date' : pickerOpen === 'start' ? 'Start time' : pickerOpen === 'end' ? 'End time' : '';
  const isDatePicker = pickerOpen === 'date';

  return (
    <View style={styles.stepContent}>
      <ScrollView
        style={styles.detailsScroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCardWrap}>
          <View style={[styles.formCard, { borderTopWidth: 1, borderRadius: 18, padding: 32 }]}>
            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>DATE *</Text>
              <Pressable style={styles.inputWrap} onPress={() => { openPicker('date'); if (errors.eventDate) setErrors(prev => ({ ...prev, eventDate: undefined })); }} android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: colors.textPrimary }]} numberOfLines={1}>{formatDisplayDate(eventDate)}</Text>
                <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.eventDate && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>{errors.eventDate}</Text>}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>START *</Text>
              <Pressable style={styles.inputWrap} onPress={() => { openPicker('start'); if (errors.startTimeDate) setErrors(prev => ({ ...prev, startTimeDate: undefined })); }} android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: colors.textPrimary }]} numberOfLines={1}>{formatDisplayTime(startTimeDate)}</Text>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.startTimeDate && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>{errors.startTimeDate}</Text>}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>END *</Text>
              <Pressable style={styles.inputWrap} onPress={() => { openPicker('end'); if (errors.endTimeDate) setErrors(prev => ({ ...prev, endTimeDate: undefined })); }} android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: colors.textPrimary }]} numberOfLines={1}>{formatDisplayTime(endTimeDate)}</Text>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.endTimeDate && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>{errors.endTimeDate}</Text>}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>AGENT NAME *</Text>
              <View style={[styles.inputWrap, errors.agentName && { borderColor: '#EF4444' }]}>
                <TextInput
                  style={styles.input}
                  value={agentName}
                  onChangeText={(val) => {
                    setAgentName(val);
                    if (errors.agentName) setErrors((prev) => ({ ...prev, agentName: undefined }));
                  }}
                  placeholder="e.g. John Smith"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.agentName && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.agentName}
                </Text>
              )}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>BROKERAGE NAME</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.input} value={brokerageName} onChangeText={setBrokerageName} placeholder="e.g. Zien Estates" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>LICENSE NUMBER (DRE#)</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. DRE# 000000" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>AGENT PHONE</Text>
              <View style={styles.inputWrap}>
                <TextInput style={styles.input} value={agentPhone} onChangeText={setAgentPhone} placeholder="(555) 000-0000" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>AGENT EMAIL *</Text>
              <View style={[styles.inputWrap, errors.agentEmail && { borderColor: '#EF4444' }]}>
                <TextInput
                  style={styles.input}
                  value={agentEmail}
                  onChangeText={(val) => {
                    setAgentEmail(val);
                    if (errors.agentEmail) setErrors((prev) => ({ ...prev, agentEmail: undefined }));
                  }}
                  placeholder="agent@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {errors.agentEmail && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.agentEmail}
                </Text>
              )}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>SEND PERFORMANCE REPORT TO SELLER</Text>
              <Switch value={sendReport} onValueChange={setSendReport} trackColor={{ false: '#E4EAF2', true: '#0D9488' }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>
      </ScrollView>

      {Platform.OS === 'android' && pickerOpen != null && (
        <DateTimePicker value={tempValue} mode={isDatePicker ? 'date' : 'time'} display="default" onChange={onPickerChange} minimumDate={isDatePicker ? new Date() : undefined} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={pickerOpen != null} transparent animationType="slide" onRequestClose={() => setPickerOpen(null)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(null)}>
            <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerSheetTitle}>{pickerTitle}</Text>
              {pickerOpen != null && (
                <DateTimePicker value={tempValue} mode={isDatePicker ? 'date' : 'time'} display="spinner" onChange={onPickerChange} minimumDate={isDatePicker ? new Date() : undefined} style={styles.pickerSpinner} textColor="#0B2D3E" />
              )}
              <Pressable style={styles.pickerDoneButton} onPress={confirmPicker}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function Step4Customization({
  selectedPropertyId, properties, agentName, eventDate, startTimeDate, endTimeDate,
  accentIndex, setAccentIndex, brandColors, setBrandColors, description, setDescription, descStyle, setDescStyle,
  galleryImages, setGalleryImages, enableVisitorReg, setEnableVisitorReg,
  logoMode, setLogoMode, agencyLogoUri, setAgencyLogoUri,
}: {
  selectedPropertyId: string | null;
  properties: RawPropertyItem[];
  agentName: string;
  eventDate: Date;
  startTimeDate: Date;
  endTimeDate: Date;
  accentIndex: number; setAccentIndex: (i: number) => void;
  brandColors: string[]; setBrandColors: React.Dispatch<React.SetStateAction<string[]>>;
  description: string; setDescription: (v: string) => void;
  descStyle: DescStyleKey; setDescStyle: (v: DescStyleKey) => void;
  galleryImages: string[]; setGalleryImages: (v: string[] | ((prev: string[]) => string[])) => void;
  enableVisitorReg: boolean; setEnableVisitorReg: (v: boolean) => void;
  logoMode: 'text' | 'image'; setLogoMode: (v: 'text' | 'image') => void;
  agencyLogoUri: string | null; setAgencyLogoUri: (v: string | null) => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const { accessToken } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Prompt Required', 'Please type some instructions or a prompt to generate the narrative.');
      return;
    }
    setIsGenerating(true);
    try {
      const data = await generateAiText(aiPrompt.trim(), accessToken || '', 'complex');
      const text = data.result;
      if (text) {
        setDescription(text);
      } else {
        throw new Error('AI engine did not return a valid result.');
      }
    } catch (error: any) {
      console.error('AI Generation error:', error);
      Alert.alert('AI Generation Error', error.message || 'Failed to generate text. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const property = selectedPropertyId ? properties.find((p) => p.id.toString() === selectedPropertyId) : null;
  const addressLine1 = property ? property.address.split(',')[0] : '1601 Welch Street';
  const addressLine2 = property ? property.address.split(',').slice(1).join(',').trim() : 'Houston TX 77006';
  const beds = property?.data?.BedroomsTotal || property?.data?.beds || '5';
  const baths = property?.data?.BathroomsFull || property?.data?.baths || '4.5';
  const sqft = property?.data?.LivingArea || property?.data?.sqft || '4,200';
  const price = property?.data?.ListPrice ? `$${Number(property.data.ListPrice).toLocaleString()}` : '$2,450,000';

  const allPreviewImages = useMemo(() => {
    const propertyImages = (property?.data?.user_images || property?.data?.Media?.map((m: any) => m.MediaURL) || []).filter(Boolean);
    const combined = [...galleryImages, ...propertyImages];
    return combined.length > 0 ? combined : [PLACEHOLDER_3];
  }, [galleryImages, property]);

  const currentPreviewImage = allPreviewImages[activeImageIndex % allPreviewImages.length];
  const currentAccent = brandColors[accentIndex] || brandColors[0] || '#0B2D3E';
  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % allPreviewImages.length);
  const prevImage = () => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allPreviewImages.length - 1));

  const handleLogoUpload = () => {
    Alert.alert('Agency Logo', 'Choose a source for your logo', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'We need camera access to take a photo.'); return; }
          const result = await ImagePicker.launchCameraAsync({ aspect: [1, 1], quality: 0.8 });
          if (!result.canceled) setAgencyLogoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ aspect: [1, 1], quality: 0.8 });
          if (!result.canceled) setAgencyLogoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleGalleryUpload = () => {
    Alert.alert('Property Photos', 'Add photos to your property gallery', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'We need camera access to take a photo.'); return; }
          const result = await ImagePicker.launchCameraAsync({ aspect: [4, 3], quality: 0.8 });
          if (!result.canceled) setGalleryImages((prev) => [...prev, result.assets[0].uri]);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ['images'] as any, quality: 0.8 });
          if (!result.canceled) setGalleryImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeGalleryImage = (index: number) => setGalleryImages((prev) => prev.filter((_, i) => i !== index));

  return (
    <View style={styles.stepContent}>
      <ScrollView style={styles.customizationScroll} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.titleBlock, isMobile ? styles.titleBlockMobile : styles.titleBlockDesktop]}>
          <Text style={styles.screenTitle}>Personalize Your Event</Text>
          <Text style={styles.screenSubtitle}>Customize the look and feel for visitors.</Text>
        </View>

        <View style={[styles.splitLayout, isMobile && styles.splitLayoutMobile]}>
          {/* LEFT COLUMN */}
          <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>
            <View style={styles.customCard}>
              <Text style={styles.customCardTitle}>Design & Branding</Text>
              <View style={styles.swatchRow}>
                {brandColors.map((color, i) => (
                  <Pressable key={color} style={[styles.colorSwatch, { backgroundColor: color }, i === accentIndex && styles.colorSwatchActive]} onPress={() => setAccentIndex(i)} />
                ))}
                <Pressable style={styles.addColorBtn} onPress={() => setColorPickerVisible(true)}><Text style={styles.addColorBtnText}>+</Text></Pressable>
              </View>
              <Text style={styles.selectedColorText}>Current accent: <Text style={{ fontWeight: '800', color: currentAccent }}>{currentAccent}</Text></Text>

              <Text style={styles.sectionHeaderLabelSmall}>LOGO PRESENTATION</Text>
              <View style={styles.segmentedControl}>
                <Pressable style={[styles.segmentBtn, logoMode === 'text' && styles.segmentBtnActive]} onPress={() => setLogoMode('text')}>
                  <Text style={logoMode === 'text' ? styles.segmentBtnTextActive : styles.segmentBtnText}>Agency Text</Text>
                </Pressable>
                <Pressable style={[styles.segmentBtn, logoMode === 'image' && styles.segmentBtnActive]} onPress={() => setLogoMode('image')}>
                  <Text style={logoMode === 'image' ? styles.segmentBtnTextActive : styles.segmentBtnText}>Image Logo</Text>
                </Pressable>
              </View>

              {logoMode === 'text' ? (
                <View style={styles.inputWrap}>
                  <TextInput style={styles.input} value={agentName} onChangeText={() => { }} placeholder="Agency Name" placeholderTextColor="#9CA3AF" editable={false} />
                </View>
              ) : (
                <View style={[styles.logoUploadContainer, { alignItems: 'center' }]}>
                  <Pressable style={[styles.logoUploadBtn, { width: '100%' }]} onPress={handleLogoUpload}>
                    <Text style={styles.logoUploadBtnText}>{agencyLogoUri ? 'Replace Brand Image' : 'Upload Agency Logo'}</Text>
                  </Pressable>
                  {agencyLogoUri && (
                    <View style={styles.logoPreviewWrap}>
                      <Image source={{ uri: agencyLogoUri }} style={styles.logoPreview} contentFit="contain" />
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.customCard}>
              <Text style={styles.customCardTitle}>AI Property Narrative</Text>
              <Text style={styles.customCardSubLabelText}>Type your custom instructions below to generate highly personalized copy.</Text>
              
              <Text style={styles.aiFieldLabel}>YOUR PROMPT / CUSTOM TEXT</Text>
              <TextInput 
                style={styles.aiInput} 
                multiline 
                value={aiPrompt} 
                onChangeText={setAiPrompt} 
                placeholder="Write instructions, features, or details for the AI..." 
                placeholderTextColor="#94A3B8"
                textAlignVertical="top" 
              />
              
              <Pressable 
                style={({ pressed }) => [
                  styles.regenerateBtnFull, 
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  isGenerating && { opacity: 0.7 }
                ]}
                onPress={handleGenerateDescription}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.regenerateBtnText}>Generate Description <MaterialCommunityIcons name="magic-staff" size={16} color="#FFF" /></Text>
                )}
              </Pressable>

              <View style={styles.aiOutputHeaderRow}>
                <Text style={styles.aiFieldLabel}>GENERATED OUTPUT</Text>
                <View style={styles.stylePillRow}>
                  {DESC_STYLES.map((style) => (
                    <Pressable key={style} style={[styles.stylePill, descStyle === style.toLowerCase() && styles.stylePillActive]} onPress={() => setDescStyle(style.toLowerCase() as DescStyleKey)}>
                      <Text style={[styles.stylePillText, descStyle === style.toLowerCase() && styles.stylePillTextActive]}>{style}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <TextInput 
                style={[styles.aiInput, { height: 160 }]} 
                multiline 
                value={description} 
                onChangeText={setDescription} 
                textAlignVertical="top" 
              />
            </View>

            <View style={[styles.customCard, styles.customCardGallery]}>
              <Text style={styles.customCardTitle}>Property Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {galleryImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.galleryImageItem}>
                    <Image source={{ uri }} style={styles.galleryImageThumb} contentFit="cover" />
                    <Pressable style={styles.deleteImageBtn} onPress={() => removeGalleryImage(index)}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="rgba(0,0,0,0.6)" />
                    </Pressable>
                  </View>
                ))}
                <Pressable style={styles.galleryAddBoxSmall} onPress={handleGalleryUpload}>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.accentTeal} />
                  <Text style={styles.galleryAddTextSmall}>ADD PHOTOS</Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.customCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.customCardTitle}>Lead Capture (QR)</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Automatic sync to Salesforce CRM</Text>
                </View>
                <Switch value={enableVisitorReg} onValueChange={setEnableVisitorReg} trackColor={{ false: '#E2E8F0', true: '#0D9488' }} thumbColor="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>Enable Visitor Registration</Text>
            </View>
          </View>

          {/* RIGHT COLUMN: Live Preview */}
          <View style={[styles.rightColumn, isMobile && styles.rightColumnMobile]}>
            <Text style={styles.sectionHeaderLabelPreview}>LIVE COMPANION PREVIEW</Text>
            <View style={styles.phoneMockup}>
              <View style={styles.phoneHeader}>
                {logoMode === 'image' && agencyLogoUri ? (
                  <Image source={{ uri: agencyLogoUri }} style={styles.phoneLogo} contentFit="contain" />
                ) : (
                  <Text style={styles.phoneBrand}>{agentName.toUpperCase()}</Text>
                )}
                <Text style={[styles.phoneTag, { color: currentAccent }]}>EXCLUSIVE LISTING</Text>
              </View>
              <View style={styles.phoneImageWrap}>
                <Image source={{ uri: currentPreviewImage }} style={styles.phoneImage} contentFit="cover" />
                <View style={styles.phoneImageOverlay}>
                  <Pressable style={styles.phoneArrowBtn} onPress={prevImage}>
                    <MaterialCommunityIcons name="arrow-left" size={14} color="#333" />
                  </Pressable>
                  <Pressable style={styles.phoneArrowBtn} onPress={nextImage}>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#333" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.phoneBody}>
                <View style={styles.phoneTitleRow}>
                  <Text style={[styles.phoneTitle, { color: '#0F172A' }]}>{addressLine1}</Text>
                  <Text style={[styles.phonePrice, { color: currentAccent }]}>{price}</Text>
                </View>
                <Text style={styles.phoneSubtitle}>{addressLine2}</Text>
                <View style={styles.phoneTagsRow}>
                  {['MODERN', 'POOL', 'SMART HOME'].map((tag) => (
                    <Text key={tag} style={[styles.phonePill, { backgroundColor: currentAccent + '15', color: currentAccent }]}>{tag}</Text>
                  ))}
                </View>
                <View style={styles.phoneStatsRow}>
                  <View style={styles.phoneStatItem}><Text style={styles.phoneStatValue}>{beds}</Text><Text style={styles.phoneStatLabel}>BEDS</Text></View>
                  <View style={styles.phoneStatItem}><Text style={styles.phoneStatValue}>{baths}</Text><Text style={styles.phoneStatLabel}>BATHS</Text></View>
                  <View style={styles.phoneStatItem}><Text style={styles.phoneStatValue}>{Number(sqft).toLocaleString()}</Text><Text style={styles.phoneStatLabel}>SQFT</Text></View>
                </View>
                <Text style={styles.phoneScheduleLabel}>SCHEDULE</Text>
                <View style={styles.phoneScheduleRow}>
                  <View style={styles.phoneScheduleBox}>
                    <Text style={styles.phoneScheduleVal}>{formatDisplayDate(eventDate)}</Text>
                    <Text style={styles.phoneScheduleSub}>DATE</Text>
                  </View>
                  <View style={styles.phoneScheduleBox}>
                    <Text style={styles.phoneScheduleVal}>{`${formatDisplayTime(startTimeDate)} – ${formatDisplayTime(endTimeDate)}`}</Text>
                    <Text style={styles.phoneScheduleSub}>TIME</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>


      </ScrollView>
      <ColorPickerModal
        visible={colorPickerVisible}
        onClose={() => setColorPickerVisible(false)}
        initialColor={currentAccent}
        onSelectColor={(color) => {
          const cleaned = color.toUpperCase();
          const existingIdx = brandColors.findIndex(c => c.toUpperCase() === cleaned);
          if (existingIdx !== -1) {
            setAccentIndex(existingIdx);
          } else {
            setBrandColors(prev => [...prev, cleaned]);
            setAccentIndex(brandColors.length);
          }
        }}
      />
    </View>
  );
}

function Step5SheetReady({
  createdId,
  onGoToDashboard,
}: {
  createdId?: string | number;
  onGoToDashboard: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalIcon, setModalIcon] = useState('bullhorn-outline');
  const [modalColor, setModalColor] = useState('#0D9488');

  const showFeatureModal = (title: string, desc: string, icon: string, color: string) => {
    setModalTitle(title);
    setModalDescription(desc);
    setModalIcon(icon);
    setModalColor(color);
    setModalVisible(true);
  };

  const handleCopyLink = () => {
    const linkId = createdId || '27';
    const link = `https://staging.zien.ai/open-house/check-in/${linkId}`;
    Clipboard.setString(link);
    Alert.alert(
      'Link Copied',
      `The check-in portfolio link has been copied to your clipboard:\n\n${link}`
    );
  };

  return (
    <View style={styles.stepContent}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.readyMobileScrollContent}
      >
        <View style={styles.readyMobileHeader}>
          <Text style={styles.readyMobileTitle}>Changes Saved!</Text>
          <Text style={styles.readyMobileSubtitle}>
            Your open house event has been successfully updated and is live.
          </Text>
        </View>

        <View style={styles.readyMobileGrid}>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => showFeatureModal('PDF Dossier Preparation', "We are finalising Zien's PDF document generation engine. Soon you will be able to export rich property flyers directly to your phone!", 'file-pdf-box', '#EF4444')}
          >
            <MaterialCommunityIcons name="file-document-outline" size={32} color="#EF4444" />
            <Text style={styles.readyMobileCardLabel}>Download PDF</Text>
            <Text style={styles.readyMobileCardSubLabel}>PROPERTY DOSSIER</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleCopyLink}
          >
            <MaterialCommunityIcons name="link-variant" size={32} color={colors.accentTeal} />
            <Text style={styles.readyMobileCardLabel}>Digital Share Link</Text>
            <Text style={styles.readyMobileCardSubLabel}>VISITOR PORTAL</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => showFeatureModal('Campaign Syncing', "Match leads automatically with active campaigns. Complete bi-directional synchronization with your CRM dashboard will launch soon!", 'bullhorn-outline', '#4F46E5')}
          >
            <MaterialCommunityIcons name="bullhorn-outline" size={32} color="#4F46E5" />
            <Text style={styles.readyMobileCardLabel}>Add to campaigns</Text>
            <Text style={styles.readyMobileCardSubLabel}>ADD TO CAMPAIGNS</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => showFeatureModal('Smart AI Follow-Ups', "Set up Zien's dynamic AI email responders for check-ins. Automated personalized visitor nurture workflows will be ready soon!", 'email-plus-outline', '#0D9488')}
          >
            <MaterialCommunityIcons name="email-plus-outline" size={32} color="#0D9488" />
            <Text style={styles.readyMobileCardLabel}>Email Automation</Text>
            <Text style={styles.readyMobileCardSubLabel}>CREATE AI AUTOMATION</Text>
          </Pressable>
        </View>

        <View style={styles.readyMobileActions}>
          <Pressable style={styles.readyMobilePrimaryBtn} onPress={onGoToDashboard}>
            <Text style={styles.readyMobilePrimaryBtnText}>Back to Open Houses</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Premium Coming Soon Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalIconBg, { backgroundColor: modalColor + '15' }]}>
              <MaterialCommunityIcons name={modalIcon as any} size={42} color={modalColor} />
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: modalColor + '20' }]}>
                <Text style={[styles.badgeText, { color: modalColor }]}>COMING SOON</Text>
              </View>
            </View>

            <Text style={styles.modalDescription}>
              {modalDescription}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalCloseBtn,
                { backgroundColor: modalColor },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
              ]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Awesome, Got It!</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PADDING, paddingTop: 8, paddingBottom: 12 },
    backBtnWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText: { fontSize: 14, fontWeight: '800', color: colors.accentTeal },
    stepsWrapper: { flex: 1 },
    stepContent: { paddingTop: 8, paddingBottom: 24 },

    // Form Card
    formCardWrap: {
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 12 },
        android: { elevation: 4 },
      }),
    },
    formCard: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.cardBorder,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    fieldSingle: { marginBottom: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 6 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 48,
    },
    input: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary, padding: 0 },
    inputText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
    toggleLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.2 },
    buttonRow: { flexDirection: 'row', gap: 10 },

    // Picker
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingHorizontal: 20,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 },
        android: { elevation: 16 },
      }),
    },
    pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
    pickerSheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    pickerSpinner: { marginVertical: 8 },
    pickerDoneButton: { backgroundColor: '#0D9488', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    pickerDoneText: { fontSize: 16, fontWeight: '700', color: colors.cardBackground },

    // Customization
    customizationScroll: { flex: 1 },
    titleBlock: { marginBottom: 24 },
    titleBlockMobile: { alignItems: 'flex-start', marginBottom: 24 },
    titleBlockDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    screenTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
    screenSubtitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    splitLayout: { flexDirection: 'row', gap: 32 },
    splitLayoutMobile: { flexDirection: 'column', gap: 32 },
    leftColumn: { flex: 1, minWidth: 320 },
    leftColumnMobile: { minWidth: '100%' },
    rightColumn: { width: 340 },
    rightColumnMobile: { width: '100%', alignItems: 'center' },
    sectionHeaderLabelSmall: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1, marginTop: 20, marginBottom: 12, textTransform: 'uppercase' },
    sectionHeaderLabelPreview: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' },

    customCard: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 24, marginBottom: 20 },
    customCardGallery: { minHeight: 260 },
    customCardTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 16, letterSpacing: -0.5 },
    customCardSubLabelText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: -12, marginBottom: 16 },
    aiFieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
    aiOutputHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8, flexWrap: 'wrap', gap: 12 },

    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
    colorSwatch: { width: 32, height: 32, borderRadius: 16 },
    colorSwatchActive: { borderWidth: 2, borderColor: '#0F172A', transform: [{ scale: 1.1 }] },
    addColorBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    addColorBtnText: { fontSize: 20, fontWeight: '700', color: '#94A3B8', lineHeight: 22 },
    selectedColorText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },

    segmentedControl: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 16 },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    segmentBtnActive: {
      backgroundColor: '#FFFFFF',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 2 }, android: { elevation: 1 } }),
    },
    segmentBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    segmentBtnTextActive: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },

    logoUploadContainer: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#00A7B5', borderStyle: 'dashed', borderRadius: 12, padding: 16, marginTop: 12 },
    logoUploadBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', flex: 1 },
    logoUploadBtnText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
    logoPreviewWrap: { width: 120, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12 },
    logoPreview: { width: '100%', height: '100%' },

    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
    stylePillRow: { flexDirection: 'row', gap: 8 },
    stylePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#0F172A', backgroundColor: 'transparent' },
    stylePillActive: { backgroundColor: '#0F172A' },
    stylePillText: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
    stylePillTextActive: { color: '#FFFFFF' },

    aiInput: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, fontSize: 13, color: colors.textSecondary, height: 120, textAlignVertical: 'top', lineHeight: 20 },
    regenerateBtnFull: { backgroundColor: '#00A7B5', borderRadius: 12, paddingVertical: 14, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
    regenerateBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

    galleryImageItem: { width: 140, height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
    galleryImageThumb: { width: '100%', height: '100%' },
    deleteImageBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 0, zIndex: 10 },
    galleryAddBoxSmall: { width: 140, height: 140, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#00A7B5', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
    galleryAddTextSmall: { fontSize: 10, fontWeight: '800', color: '#00A7B5' },

    // Phone Mockup
    phoneMockup: {
      width: 320,
      backgroundColor: '#FFFFFF',
      borderRadius: 40,
      borderWidth: 12,
      borderColor: '#0F172A',
      overflow: 'hidden',
      alignSelf: 'center',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 }, android: { elevation: 12 } }),
    },
    phoneHeader: { paddingLeft: 16, paddingRight: 20, paddingTop: 24, paddingBottom: 16, alignItems: 'flex-start' },
    phoneBrand: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
    phoneLogo: { width: 100, height: 40, alignSelf: 'flex-start' },
    phoneTag: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
    phoneImageWrap: { width: '100%', height: 180, position: 'relative' },
    phoneImage: { width: '100%', height: '100%' },
    phoneImageOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
    phoneArrowBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
    phoneBody: { padding: 20 },
    phoneTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    phoneTitle: { flex: 1, fontSize: 22, fontWeight: '900', lineHeight: 26 },
    phonePrice: { fontSize: 14, fontWeight: '800' },
    phoneSubtitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 16 },
    phoneTagsRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
    phonePill: { fontSize: 8, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    phoneStatsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, marginBottom: 24 },
    phoneStatItem: { alignItems: 'flex-start' },
    phoneStatValue: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
    phoneStatLabel: { fontSize: 8, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
    phoneScheduleLabel: { fontSize: 10, fontWeight: '800', color: '#0F172A', marginBottom: 12, letterSpacing: 0.5 },
    phoneScheduleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    phoneScheduleBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
    phoneScheduleVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
    phoneScheduleSub: { fontSize: 8, fontWeight: '700', color: colors.textMuted, marginTop: 2 },

    // Bottom Actions
    bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 40 },
    actionBackBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#FFFFFF' },
    actionBackText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    actionFinalizeBtn: { backgroundColor: '#0F172A', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
    actionFinalizeText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    fixedBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackgroundSemi,
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: H_PADDING,
      paddingTop: 16,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 8,
    },
    fixedBtnRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    fixedPrimaryBtn: {
      flex: 1,
      height: 54,
    },
    fixedPrimaryBtnHalf: {
      flex: 2,
      height: 54,
    },
    fixedSecondaryBtn: {
      flex: 1,
      height: 54,
      paddingVertical: 0,
    },
    fixedBtnText: {
      fontSize: 13.5,
    },
    detailsScroll: {
      flex: 1,
    },

    // Loader
    loaderOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    loaderCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    loaderText: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 20, textAlign: 'center' },
    loaderSubtext: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 8, textAlign: 'center' },

    // Success Screen
    readyMobileScrollContent: { paddingBottom: 40, alignItems: 'center' },
    readyMobileHeader: { alignItems: 'center', marginTop: 20, marginBottom: 32, paddingHorizontal: 20 },
    readyMobileTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
    readyMobileSubtitle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    readyMobileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12, marginBottom: 40 },
    readyMobileCard: {
      width: '48%',
      aspectRatio: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({ ios: { shadowColor: colors.cardShadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }),
    },
    readyMobileCardLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginTop: 12, textAlign: 'center' },
    readyMobileCardSubLabel: { fontSize: 8, fontWeight: '700', color: colors.textMuted, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
    readyMobileActions: { width: '100%', paddingHorizontal: 16, gap: 12 },
    readyMobilePrimaryBtn: { backgroundColor: colors.accentTeal, width: '100%', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
    readyMobilePrimaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.cardBackground },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      width: '90%',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        android: { elevation: 8 },
      }),
    },
    modalIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    badgeRow: {
      marginBottom: 16,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    modalDescription: {
      fontSize: 14.5,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
      fontWeight: '500',
      paddingHorizontal: 8,
    },
    modalCloseBtn: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
