import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateAiText } from '@/services/aiContentService';
import { createOpenHouse, getOpenHouses } from '@/services/openHouseService';
import { getProperties, RawPropertyItem, uploadPropertyImage } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import PhoneInput from 'react-native-phone-number-input';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';



import ColorPickerModal from '@/components/ui/ColorPickerModal';
import GradientButton from '@/components/ui/GradientButton';
import OutlineButton from '@/components/ui/OutlineButton';
import { ProgressStep, ProgressSteps } from 'react-native-progress-steps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDisplayDate(d: Date | null): string {
  if (!d) return '--/--/----';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDisplayTime(d: Date | null): string {
  if (!d) return '--:-- --';
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

const H_PADDING = 18;
const PLACEHOLDER_1 = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600';
const PLACEHOLDER_3 = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600';

// Extended Brand Colors from design
const EXTENDED_BRAND_COLORS = ['#0B2D3E', '#0D9488', '#F97316', '#8B5CF6', '#10B981', '#DC2626', '#2563EB', '#0F172A'];

// Static properties removed, now using dynamic data from API

// Simple mapping for common country codes to ISO
const COUNTRY_CODE_TO_ISO: Record<string, string> = {
  '+1': 'US',
  '+1-CA': 'CA',
  '+7': 'RU',
  '+20': 'EG',
  '+27': 'ZA',
  '+30': 'GR',
  '+31': 'NL',
  '+32': 'BE',
  '+33': 'FR',
  '+34': 'ES',
  '+36': 'HU',
  '+39': 'IT',
  '+40': 'RO',
  '+41': 'CH',
  '+43': 'AT',
  '+44': 'GB',
  '+45': 'DK',
  '+46': 'SE',
  '+47': 'NO',
  '+48': 'PL',
  '+49': 'DE',
  '+51': 'PE',
  '+52': 'MX',
  '+53': 'CU',
  '+54': 'AR',
  '+55': 'BR',
  '+56': 'CL',
  '+57': 'CO',
  '+58': 'VE',
  '+60': 'MY',
  '+61': 'AU',
  '+62': 'ID',
  '+63': 'PH',
  '+64': 'NZ',
  '+65': 'SG',
  '+66': 'TH',
  '+81': 'JP',
  '+82': 'KR',
  '+84': 'VN',
  '+86': 'CN',
  '+90': 'TR',
  '+91': 'IN',
  '+92': 'PK',
  '+93': 'AF',
  '+94': 'LK',
  '+95': 'MM',
  '+98': 'IR',
  '+212': 'MA',
  '+213': 'DZ',
  '+216': 'TN',
  '+218': 'LY',
  '+220': 'GM',
  '+221': 'SN',
  '+225': 'CI',
  '+234': 'NG',
  '+254': 'KE',
  '+255': 'TZ',
  '+256': 'UG',
  '+260': 'ZM',
  '+263': 'ZW',
  '+351': 'PT',
  '+353': 'IE',
  '+355': 'AL',
  '+358': 'FI',
  '+359': 'BG',
  '+372': 'EE',
  '+373': 'MD',
  '+374': 'AM',
  '+375': 'BY',
  '+380': 'UA',
  '+381': 'RS',
  '+385': 'HR',
  '+386': 'SI',
  '+387': 'BA',
  '+420': 'CZ',
  '+421': 'SK',
  '+502': 'GT',
  '+503': 'SV',
  '+504': 'HN',
  '+505': 'NI',
  '+506': 'CR',
  '+507': 'PA',
  '+591': 'BO',
  '+593': 'EC',
  '+595': 'PY',
  '+598': 'UY',
  '+852': 'HK',
  '+886': 'TW',
  '+961': 'LB',
  '+962': 'JO',
  '+963': 'SY',
  '+964': 'IQ',
  '+965': 'KW',
  '+966': 'SA',
  '+968': 'OM',
  '+971': 'AE',
  '+972': 'IL',
  '+973': 'BH',
  '+974': 'QA',
  '+977': 'NP',
};

const getIsoCode = (code: string | null) => {
  if (!code) return 'US';
  return COUNTRY_CODE_TO_ISO[code] || 'US';
};

const getCallingCodeForISO = (iso: string) => {
  const entry = Object.entries(COUNTRY_CODE_TO_ISO).find(([code, val]) => val === iso);
  return entry ? entry[0].replace('+', '') : '1';
};

const parseRawPhone = (rawPhone: string) => {
  if (!rawPhone) return { countryCodeISO: 'US', nationalNumber: '' };

  const cleaned = rawPhone.trim();
  if (!cleaned.startsWith('+')) {
    return { countryCodeISO: 'US', nationalNumber: cleaned };
  }

  let matchedKey = '';
  for (const key of Object.keys(COUNTRY_CODE_TO_ISO)) {
    if (cleaned.startsWith(key)) {
      if (key.length > matchedKey.length) {
        matchedKey = key;
      }
    }
  }

  if (matchedKey) {
    const national = cleaned.slice(matchedKey.length).replace(/[^0-9]/g, '');
    return {
      countryCodeISO: COUNTRY_CODE_TO_ISO[matchedKey],
      nationalNumber: national
    };
  }

  return { countryCodeISO: 'US', nationalNumber: cleaned.replace(/[^0-9]/g, '') };
};



export default function OpenHouseCreateScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(accessToken || ''),
    enabled: !!accessToken,
  });

  const { data: openHousesData } = useQuery({
    queryKey: ['open-houses'],
    queryFn: () => getOpenHouses(accessToken || ''),
    enabled: !!accessToken,
  });

  const activePropertyIds = useMemo(() => {
    if (!openHousesData) return new Set<number>();
    const activeEvents = openHousesData.filter(
      (oh) => oh.status === 'live' || oh.status === 'upcoming'
    );
    return new Set<number>(activeEvents.map((oh) => oh.property_id));
  }, [openHousesData]);

  const [activeStep, setActiveStep] = useState(0);
  const [isFinalized, setIsFinalized] = useState(false);
  const [createdOpenHouseId, setCreatedOpenHouseId] = useState<string | number>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId || !propertiesData?.properties) return null;
    return propertiesData.properties.find((p: any) => p.id.toString() === selectedPropertyId);
  }, [selectedPropertyId, propertiesData?.properties]);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);

  const [agentName, setAgentName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [brokerageName, setBrokerageName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [countryCodeISO, setCountryCodeISO] = useState('US');
  const [callingCode, setCallingCode] = useState('+1');
  const phoneInputRef = useRef<PhoneInput>(null);
  const [agentEmail, setAgentEmail] = useState('');
  const [sendReport, setSendReport] = useState(true);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const { height: kbAnimHeight } = useReanimatedKeyboardAnimation();
  const animatedBottomBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Platform.OS === 'ios' ? kbAnimHeight.value : 0 }],
  }));

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const [errors, setErrors] = useState<{ agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string; agentPhone?: string }>({});

  const validateStep2 = () => {
    const newErrors: { agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string; agentPhone?: string } = {};
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
    if (!agentPhone.trim()) {
      newErrors.agentPhone = 'Agent Phone is required';
    } else if (phoneInputRef.current && !phoneInputRef.current.isValidNumber(agentPhone)) {
      newErrors.agentPhone = `Invalid number for ${phoneInputRef.current.getCountryCode() || 'selected country'}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Customization state moved to parent for easy payload building
  const [accentIndex, setAccentIndex] = useState(0);
  const [brandColors, setBrandColors] = useState<string[]>([...EXTENDED_BRAND_COLORS]);
  const [description, setDescription] = useState('');
  const [descStyle, setDescStyle] = useState<DescStyleKey>('luxury');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [enableVisitorReg, setEnableVisitorReg] = useState(true);
  const [logoMode, setLogoMode] = useState<'text' | 'image'>('text');
  const [agencyLogoUri, setAgencyLogoUri] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (payload: any) => createOpenHouse(accessToken || '', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['open-houses'] });
      setIsFinalized(true);
      const newId = data?.data?.id || data?.id || '';
      setCreatedOpenHouseId(newId);
    },
    onError: (error) => {
      console.error('Create Open House Error:', error);
      alert('Failed to create open house. Please try again.');
    }
  });

  const handleFinalize = async () => {
    if (!selectedPropertyId) return;
    setIsFinalizing(true);

    try {
      // 1. Upload Logo if needed
      let uploadedLogoUrl = null;
      if (logoMode === 'image' && agencyLogoUri && (agencyLogoUri.startsWith('file://') || agencyLogoUri.startsWith('content://'))) {
        const uploadResult = await uploadPropertyImage(agencyLogoUri, accessToken!);
        if (uploadResult.success) {
          uploadedLogoUrl = uploadResult.url;
        }
      } else if (logoMode === 'image') {
        uploadedLogoUrl = agencyLogoUri;
      }

      // 2. Upload Gallery Images
      const uploadedGalleryUrls = await Promise.all(
        galleryImages.map(async (uri) => {
          if (uri.startsWith('file://') || uri.startsWith('content://')) {
            const uploadResult = await uploadPropertyImage(uri, accessToken!);
            return uploadResult.success ? uploadResult.url : uri;
          }
          return uri;
        })
      );

      console.log('Uploaded logo URL:', uploadedLogoUrl);
      console.log('Uploaded gallery URLs:', uploadedGalleryUrls);

      // 3. Prepare Payload
      const payload = {
        property_id: parseInt(selectedPropertyId),
        date: eventDate!.toISOString().split('T')[0],
        start_time: startTimeDate!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        end_time: endTimeDate!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        agent_details: {
          name: agentName,
          brokerage: brokerageName,
          license: licenseNumber,
          email: agentEmail,
          phone: agentPhone ? `${callingCode}${agentPhone}` : ''
        },
        ai_description: description,
        brand_color: brandColors[accentIndex],
        gallery_images: uploadedGalleryUrls,
        uploaded_logo: uploadedLogoUrl,
        logo_text: logoMode === 'text' ? agencyName : null,
        ai_tone: descStyle.charAt(0).toUpperCase() + descStyle.slice(1),
        visitor_registration: enableVisitorReg,
        send_report: sendReport,
      };

      // 4. Create Open House
      await createMutation.mutateAsync(payload);
    } catch (error: any) {
      console.error('Finalize Error:', error);
      Alert.alert('Error', error.message || 'Failed to finalize open house');
    } finally {
      setIsFinalizing(false);
    }
  };

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
        <Modal transparent visible={isFinalizing} animationType="fade">
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color="#00A7B5" />
              <Text style={styles.loaderText}>Launching your Open House...</Text>
              <Text style={styles.loaderSubtext}>Uploading assets and finalizing details.</Text>
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
            <ProgressStep label="Property" removeBtnRow>
              <Step1SelectProperty
                properties={propertiesData?.properties || []}
                isLoading={isLoadingProperties}
                selectedPropertyId={selectedPropertyId}
                activePropertyIds={activePropertyIds}
                onSelectProperty={(id) => {
                  setSelectedPropertyId(id);
                }}
              />
            </ProgressStep>
            <ProgressStep label="Details" removeBtnRow>
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
                phoneInputRef={phoneInputRef}
                countryCodeISO={countryCodeISO}
                setCountryCodeISO={setCountryCodeISO}
                callingCode={callingCode}
                setCallingCode={setCallingCode}
              />
            </ProgressStep>
            <ProgressStep label="Customization" removeBtnRow>
              {!isFinalized ? (
                <Step4Customization
                  selectedPropertyId={selectedPropertyId}
                  properties={propertiesData?.properties || []}
                  agentName={agentName}
                  eventDate={eventDate!}
                  startTimeDate={startTimeDate!}
                  endTimeDate={endTimeDate!}
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
                  agencyName={agencyName}
                  setAgencyName={setAgencyName}
                />
              ) : (
                <Step5SheetReady
                  createdId={createdOpenHouseId}
                  propertyAddress={selectedProperty?.address || ''}
                  propertyId={selectedProperty?.id?.toString() || ''}
                  onGoToDashboard={() => router.back()}
                  onCreateAnother={() => {
                    setIsFinalized(false);
                    setActiveStep(0);
                    setCreatedOpenHouseId('');
                    setSelectedPropertyId(null);
                    setEventDate(null);
                    setStartTimeDate(null);
                    setEndTimeDate(null);
                    setDescription('');
                    setGalleryImages([]);
                    setAgencyLogoUri(null);
                    setAgentName('');
                    setBrokerageName('');
                    setLicenseNumber('');
                    setAgentPhone('');
                    setAgentEmail('');
                  }}
                />
              )}
            </ProgressStep>
          </ProgressSteps>
        </View>

        {/* Global Fixed Bottom Bar */}
        {!isFinalized && (
          <Animated.View style={[styles.fixedBottomBar, animatedBottomBarStyle, { paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 16) }]}>
            {activeStep === 0 && (
              <GradientButton
                title="Continue to Details"
                disabled={!selectedPropertyId}
                onPress={() => setActiveStep(1)}
                style={styles.fixedPrimaryBtn}
                textStyle={styles.fixedBtnText}
              />
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
                  title="Continue to Customization"
                  onPress={() => {
                    if (validateStep2()) {
                      setActiveStep(2);
                    }
                  }}
                  style={styles.fixedPrimaryBtnHalf}
                  textStyle={styles.fixedBtnText}
                />
              </View>
            )}
            {activeStep === 2 && (
              <View style={styles.fixedBtnRow}>
                <OutlineButton
                  title="Back"
                  onPress={() => setActiveStep(1)}
                  style={styles.fixedSecondaryBtn}
                  textStyle={styles.fixedBtnText}
                />
                <GradientButton
                  title="Launch Event"
                  isLoading={createMutation.isPending}
                  onPress={handleFinalize}
                  style={styles.fixedPrimaryBtnHalf}
                  textStyle={styles.fixedBtnText}
                />
              </View>
            )}
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Step1SelectProperty({
  properties,
  isLoading,
  selectedPropertyId,
  activePropertyIds,
  onSelectProperty,
}: {
  properties: RawPropertyItem[];
  isLoading: boolean;
  selectedPropertyId: string | null;
  activePropertyIds?: Set<number>;
  onSelectProperty: (id: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.stepContent}>
      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>Select Property</Text>
        <Text style={styles.screenSubtitle}>
          Which property are we showing this weekend?
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.propertiesScrollContent, { paddingBottom: 140 }]}
        style={styles.propertiesScroll}
      >
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={{ marginTop: 16, color: colors.textSecondary, fontWeight: '600' }}>Fetching your properties...</Text>
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyProperties}>
            <MaterialCommunityIcons name="home-search-outline" size={60} color={colors.accentTeal + '40'} />
            <Text style={styles.emptyPropertiesTitle}>No properties found</Text>
            <Text style={styles.emptyPropertiesSub}>Add your first property to start creating an open house.</Text>
          </View>
        ) : (
          properties.map((property) => {
            const isScheduled = activePropertyIds?.has(property.id) || false;
            const isSelected = selectedPropertyId === property.id.toString();
            // Use user_images first, then media from bridgedata if available
            const imageUrl = property.data?.user_images?.[0] ||
              property.data?.Media?.[0]?.MediaURL ||
              PLACEHOLDER_1;

            const status = isScheduled ? 'SCHEDULED' : (property.status === 1 ? 'READY' : 'REVIEW');
            const price = property.data?.ListPrice ? `$${Number(property.data.ListPrice).toLocaleString()}` : 'Price N/A';
            const beds = property.data?.BedroomsTotal || property.data?.beds || '0';
            const baths = property.data?.BathroomsFull || property.data?.baths || '0';

            return (
              <Pressable
                key={property.id}
                style={[
                  styles.propertyRow,
                  isSelected && styles.propertyRowSelected,
                  isScheduled && { opacity: 0.6 }
                ]}
                onPress={() => {
                  if (isScheduled) {
                    Alert.alert(
                      'Already Scheduled',
                      'This property already has an active open house scheduled.'
                    );
                    return;
                  }
                  onSelectProperty(property.id.toString());
                }}
              >
                <View style={styles.propertyRowImageWrap}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.propertyRowImage}
                    contentFit="cover"
                  />
                  {isSelected && (
                    <View style={styles.propertyCheckBadge}>
                      <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                    </View>
                  )}
                </View>

                <View style={styles.propertyRowContent}>
                  <View style={styles.propertyRowHeader}>
                    <Text style={styles.propertyRowPrice}>{price}</Text>
                    <View style={[
                      styles.statusPill,
                      isScheduled ? styles.statusPillScheduled : (status === 'REVIEW' ? styles.statusPillReview : styles.statusPillReady)
                    ]}>
                      <Text style={
                        isScheduled ? styles.statusPillTextScheduled : (status === 'REVIEW' ? styles.statusPillTextReview : styles.statusPillTextReady)
                      }>{status}</Text>
                    </View>
                  </View>

                  <Text style={styles.propertyRowAddress} numberOfLines={1}>
                    {property.address}
                  </Text>

                  <View style={styles.propertyRowStats}>
                    <View style={styles.rowStatItem}>
                      <MaterialCommunityIcons name="bed-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.rowStatText}>{beds} Beds</Text>
                    </View>
                    <View style={styles.rowStatDivider} />
                    <View style={styles.rowStatItem}>
                      <MaterialCommunityIcons name="shower" size={12} color={colors.textMuted} />
                      <Text style={styles.rowStatText}>{baths} Baths</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
        <Pressable style={styles.compactAddBtn} onPress={() => router.push('/(main)/properties/create')}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.accentTeal} />
          <Text style={styles.compactAddBtnText}>Add New Property</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

type PickerType = 'date' | 'start' | 'end' | null;

function Step2Details({
  eventDate,
  setEventDate,
  startTimeDate,
  setStartTimeDate,
  endTimeDate,
  setEndTimeDate,
  agentName,
  setAgentName,
  brokerageName,
  setBrokerageName,
  licenseNumber,
  setLicenseNumber,
  agentPhone,
  setAgentPhone,
  agentEmail,
  setAgentEmail,
  sendReport,
  setSendReport,
  errors,
  setErrors,
  phoneInputRef,
  countryCodeISO,
  setCountryCodeISO,
  callingCode,
  setCallingCode,
}: {
  eventDate: Date | null;
  setEventDate: (d: Date | null) => void;
  startTimeDate: Date | null;
  setStartTimeDate: (d: Date | null) => void;
  endTimeDate: Date | null;
  setEndTimeDate: (d: Date | null) => void;
  agentName: string;
  setAgentName: (v: string) => void;
  brokerageName: string;
  setBrokerageName: (v: string) => void;
  licenseNumber: string;
  setLicenseNumber: (v: string) => void;
  agentPhone: string;
  setAgentPhone: (v: string) => void;
  agentEmail: string;
  setAgentEmail: (v: string) => void;
  sendReport: boolean;
  setSendReport: (v: boolean) => void;
  errors: { agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string; agentPhone?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ agentName?: string; agentEmail?: string; eventDate?: string; startTimeDate?: string; endTimeDate?: string; agentPhone?: string }>>;
  phoneInputRef: React.RefObject<PhoneInput | null>;
  countryCodeISO: string;
  setCountryCodeISO: (v: string) => void;
  callingCode: string;
  setCallingCode: (v: string) => void;
}) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState<PickerType>(null);
  const [tempValue, setTempValue] = useState<Date>(eventDate || new Date());

  const openPicker = (type: PickerType) => {
    if (type === 'date') setTempValue(eventDate || new Date());
    else if (type === 'start') setTempValue(startTimeDate || new Date());
    else if (type === 'end') setTempValue(endTimeDate || new Date());
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

  const pickerTitle =
    pickerOpen === 'date'
      ? 'Select date'
      : pickerOpen === 'start'
        ? 'Start time'
        : pickerOpen === 'end'
          ? 'End time'
          : '';

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
              <Text style={styles.fieldLabel}>Date *</Text>
              <Pressable
                style={[styles.inputWrap, errors.eventDate && { borderColor: '#EF4444' }]}
                onPress={() => {
                  openPicker('date');
                  if (errors.eventDate) setErrors((prev) => ({ ...prev, eventDate: undefined }));
                }}
                android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: eventDate ? colors.textPrimary : '#9CA3AF' }]} numberOfLines={1}>
                  {eventDate ? formatDisplayDate(eventDate) : 'dd/mm/yyyy'}
                </Text>
                <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.eventDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.eventDate}
                </Text>
              )}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>Start *</Text>
              <Pressable
                style={[styles.inputWrap, errors.startTimeDate && { borderColor: '#EF4444' }]}
                onPress={() => {
                  openPicker('start');
                  if (errors.startTimeDate) setErrors((prev) => ({ ...prev, startTimeDate: undefined }));
                }}
                android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: startTimeDate ? colors.textPrimary : '#9CA3AF' }]} numberOfLines={1}>
                  {startTimeDate ? formatDisplayTime(startTimeDate) : '--:-- --'}
                </Text>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.startTimeDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.startTimeDate}
                </Text>
              )}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>End *</Text>
              <Pressable
                style={[styles.inputWrap, errors.endTimeDate && { borderColor: '#EF4444' }]}
                onPress={() => {
                  openPicker('end');
                  if (errors.endTimeDate) setErrors((prev) => ({ ...prev, endTimeDate: undefined }));
                }}
                android_ripple={{ color: 'rgba(13,148,136,0.08)' }}>
                <Text style={[styles.inputText, { color: endTimeDate ? colors.textPrimary : '#9CA3AF' }]} numberOfLines={1}>
                  {endTimeDate ? formatDisplayTime(endTimeDate) : '--:-- --'}
                </Text>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textPrimary} />
              </Pressable>
              {errors.endTimeDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.endTimeDate}
                </Text>
              )}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>Agent Name *</Text>
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
              <Text style={styles.fieldLabel}>Brokerage Name</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={brokerageName}
                  onChangeText={setBrokerageName}
                  placeholder="e.g. Zien Estates"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>Agent License (DRE#)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="e.g. DRE# 000000"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>Agent Phone *</Text>
              <PhoneInput
                ref={phoneInputRef}
                defaultValue={agentPhone}
                defaultCode={countryCodeISO as any}
                layout="first"
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
                  setAgentPhone(cleaned);
                  if (errors.agentPhone) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.agentPhone;
                      return next;
                    });
                  }
                }}
                onChangeFormattedText={(_text) => {
                  const code = phoneInputRef.current?.getCallingCode();
                  if (code) {
                    setCallingCode(`+${code}`);
                  }
                }}
                containerStyle={[
                  styles.phoneInputWrapper,
                  !!errors.agentPhone && { borderColor: '#EF4444' }
                ]}
                textContainerStyle={styles.phoneTextContainer}
                textInputStyle={styles.phoneTextInput}
                codeTextStyle={styles.phoneCodeText}
                flagButtonStyle={styles.phoneFlagButton}
                placeholder="Phone Number"
                withDarkTheme={theme === 'dark'}
                textInputProps={{
                  maxLength: 15,
                  keyboardType: 'phone-pad',
                  placeholderTextColor: theme === 'dark' ? '#94A3B8' : '#9CA3AF',

                }}
                countryPickerProps={{
                  withFilter: true,
                  withAlphaFilter: true,
                  renderFlagButton: (props: any) => {
                    const code = (props.countryCode || 'US').toUpperCase();
                    const emoji = code.replace(/./g, (c: string) =>
                      String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                    );
                    return <Text style={{ fontSize: 20, lineHeight: 26 }}>{emoji}</Text>;
                  },
                  theme: theme === 'dark' ? {
                    backgroundColor: '#000000',
                    onBackgroundTextColor: '#FFFFFF',
                    fontSize: 16,
                    filterPlaceholderTextColor: '#94A3B8',
                  } : {
                    backgroundColor: '#FFFFFF',
                    onBackgroundTextColor: '#0F172A',
                    fontSize: 16,
                    filterPlaceholderTextColor: '#64748B',
                  },
                  modalProps: {
                    statusBarTranslucent: true,
                  },
                  closeButtonStyle: {
                    marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                  },
                  filterProps: {
                    placeholderTextColor: theme === 'dark' ? '#94A3B8' : '#64748B',
                    style: {
                      marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                      color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
                      fontSize: 16,
                      flex: 1,
                    }
                  }
                }}
              />
              {errors.agentPhone && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {errors.agentPhone}
                </Text>
              )}
            </View>

            <View style={styles.fieldSingle}>
              <Text style={styles.fieldLabel}>Agent Email *</Text>
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
          </View>
        </View>

        {Platform.OS === 'android' && pickerOpen != null && (
          <DateTimePicker
            value={tempValue}
            mode={isDatePicker ? 'date' : 'time'}
            display="default"
            onChange={onPickerChange}
            minimumDate={isDatePicker ? new Date() : undefined}
          />
        )}
        {Platform.OS === 'ios' && (
          <Modal
            visible={pickerOpen != null}
            transparent
            animationType="slide"
            onRequestClose={() => setPickerOpen(null)}>
            <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(null)}>
              <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.pickerHandle} />
                <Text style={styles.pickerSheetTitle}>{pickerTitle}</Text>
                {pickerOpen != null && (
                  <DateTimePicker
                    value={tempValue}
                    mode={isDatePicker ? 'date' : 'time'}
                    display="spinner"
                    onChange={onPickerChange}
                    minimumDate={isDatePicker ? new Date() : undefined}
                    style={styles.pickerSpinner}
                    textColor={colors.textPrimary}
                  />
                )}
                <Pressable style={styles.pickerDoneButton} onPress={confirmPicker}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </ScrollView>
    </View>
  );
}


const DESC_STYLES = ['Luxury', 'Friendly', 'Modern'] as const;
type DescStyleKey = 'luxury' | 'friendly' | 'modern';

function Step4Customization({
  selectedPropertyId,
  properties,
  agentName,
  eventDate,
  startTimeDate,
  endTimeDate,
  accentIndex,
  setAccentIndex,
  brandColors,
  setBrandColors,
  description,
  setDescription,
  descStyle,
  setDescStyle,
  galleryImages,
  setGalleryImages,
  enableVisitorReg,
  setEnableVisitorReg,
  logoMode,
  setLogoMode,
  agencyLogoUri,
  setAgencyLogoUri,
  agencyName,
  setAgencyName,
}: {
  selectedPropertyId: string | null;
  properties: RawPropertyItem[];
  agentName: string;
  eventDate: Date | null;
  startTimeDate: Date | null;
  endTimeDate: Date | null;
  accentIndex: number;
  setAccentIndex: (i: number) => void;
  brandColors: string[];
  setBrandColors: React.Dispatch<React.SetStateAction<string[]>>;
  description: string;
  setDescription: (v: string) => void;
  descStyle: DescStyleKey;
  setDescStyle: (v: DescStyleKey) => void;
  galleryImages: string[];
  setGalleryImages: (v: string[] | ((prev: string[]) => string[])) => void;
  enableVisitorReg: boolean;
  setEnableVisitorReg: (v: boolean) => void;
  logoMode: 'text' | 'image';
  setLogoMode: (v: 'text' | 'image') => void;
  agencyLogoUri: string | null;
  setAgencyLogoUri: (v: string | null) => void;
  agencyName: string;
  setAgencyName: (v: string) => void;
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
  const price = property?.data?.ListPrice
    ? `$${Number(property.data.ListPrice).toLocaleString()}`
    : '$2,450,000';

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
    Alert.alert(
      "Agency Logo",
      "Choose a source for your logo",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'We need camera access to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              // allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setAgencyLogoUri(result.assets[0].uri);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              // allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setAgencyLogoUri(result.assets[0].uri);
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleGalleryUpload = () => {
    Alert.alert(
      "Property Photos",
      "Add photos to your property gallery",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'We need camera access to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              // allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setGalleryImages((prev) => [...prev, result.assets[0].uri]);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsMultipleSelection: true,
              mediaTypes: ['images'],
              quality: 0.8,
            });
            if (!result.canceled) {
              const uris = result.assets.map(a => a.uri);
              setGalleryImages((prev) => [...prev, ...uris]);
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.stepContent}>
      <ScrollView
        style={styles.customizationScroll}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={[styles.titleBlock, isMobile ? styles.titleBlockMobile : styles.titleBlockDesktop]}>
          <Text style={styles.screenTitle}>Personalize Your Event</Text>
          <Text style={styles.screenSubtitle}>Customize the look and feel for visitors.</Text>
        </View>

        <View style={[styles.splitLayout, isMobile && styles.splitLayoutMobile]}>
          {/* LEFT COLUMN: Configuration */}
          <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>
            {/* Design & Branding Card */}
            <View style={styles.customCard}>
              <Text style={styles.customCardTitle}>Design & Branding</Text>
              <View style={styles.swatchRow}>
                {brandColors.map((color, i) => (
                  <Pressable
                    key={color}
                    style={[styles.colorSwatch, { backgroundColor: color }, i === accentIndex && styles.colorSwatchActive]}
                    onPress={() => setAccentIndex(i)}
                  />
                ))}
                <Pressable
                  style={styles.addColorBtn}
                  onPress={() => setColorPickerVisible(true)}
                >
                  <Text style={styles.addColorBtnText}>+</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Text style={[styles.selectedColorText, { marginBottom: 0 }]}>Current accent: <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{currentAccent}</Text></Text>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: currentAccent, borderWidth: 1.5, borderColor: colors.cardBorder }} />
              </View>

              <Text style={styles.sectionHeaderLabelSmall}>Logo Presentation</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  style={[styles.segmentBtn, logoMode === 'text' && styles.segmentBtnActive]}
                  onPress={() => setLogoMode('text')}
                >
                  <Text style={logoMode === 'text' ? styles.segmentBtnTextActive : styles.segmentBtnText}>Agency Text</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, logoMode === 'image' && styles.segmentBtnActive]}
                  onPress={() => setLogoMode('image')}
                >
                  <Text style={logoMode === 'image' ? styles.segmentBtnTextActive : styles.segmentBtnText}>Image Logo</Text>
                </Pressable>
              </View>

              {logoMode === 'text' ? (
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={agencyName}
                    onChangeText={(val) => setAgencyName(val)}
                    placeholder="Enter Agency Name"
                    placeholderTextColor="#9CA3AF"
                    editable={true}
                  />
                </View>
              ) : (
                <View style={[styles.logoUploadContainer, { alignItems: 'center', gap: 12 }]}>
                  <Pressable style={[styles.logoUploadBtn, { width: '100%' }]} onPress={handleLogoUpload}>
                    <Text style={styles.logoUploadBtnText}>
                      {agencyLogoUri ? "Replace Brand Image" : "Upload Agency Logo"}
                    </Text>
                  </Pressable>
                  {agencyLogoUri && (
                    <Pressable
                      style={[styles.logoUploadBtn, { borderColor: '#EF4444', backgroundColor: '#FEF2F2', width: '100%' }]}
                      onPress={() => setAgencyLogoUri(null)}
                    >
                      <Text style={[styles.logoUploadBtnText, { color: '#DC2626' }]}>Remove Image</Text>
                    </Pressable>
                  )}
                  {agencyLogoUri && (
                    <View style={[styles.logoPreviewWrap, { marginTop: 0 }]}>
                      <Image source={{ uri: agencyLogoUri }} style={styles.logoPreview} contentFit="contain" />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* AI Description Card */}
            <View style={styles.customCard}>
              <Text style={styles.customCardTitle}>AI Property Narrative</Text>
              <Text style={styles.customCardSubLabelText}>Type your custom instructions below to generate highly personalized copy.</Text>

              <Text style={styles.aiFieldLabel}>Your Prompt / Custom Text</Text>
              <TextInput
                style={styles.aiInput}
                multiline
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="e.g. Write a highly descriptive luxury real estate listing focusing on natural lighting and modern fixtures."
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
                <Text style={styles.aiFieldLabel}>Generated Output</Text>
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
                placeholder="Generate text using the prompt box above. The final narrative appears here and is fully editable."
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
              />
            </View>

            {/* Property Gallery Card */}
            <View style={[styles.customCard, styles.customCardGallery]}>
              <Text style={styles.customCardTitle}>Property Gallery</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {galleryImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.galleryImageItem}>
                    <Image source={{ uri }} style={styles.galleryImageThumb} contentFit="cover" />
                    <Pressable
                      style={styles.deleteImageBtn}
                      onPress={() => removeGalleryImage(index)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="rgba(0,0,0,0.6)" />
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  style={styles.galleryAddBoxSmall}
                  onPress={handleGalleryUpload}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={colors.accentTeal} />
                  <Text style={styles.galleryAddTextSmall}>Add Photos</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>

          {/* RIGHT COLUMN: Live Companion Preview */}
          <View style={[styles.rightColumn, isMobile && styles.rightColumnMobile]}>
            <Text style={styles.sectionHeaderLabelPreview}>Live Companion Preview</Text>

            <View style={styles.phoneMockup}>
              {/* Phone Header */}
              <View style={styles.phoneHeader}>
                {logoMode === 'image' && agencyLogoUri ? (
                  <Image source={{ uri: agencyLogoUri }} style={styles.phoneLogo} contentFit="contain" />
                ) : (
                  <Text style={styles.phoneBrand}>{(agencyName || agentName || 'AGENCY').toUpperCase()}</Text>
                )}
                <Text style={[styles.phoneTag, { color: currentAccent }]}>EXCLUSIVE LISTING</Text>
              </View>

              {/* Phone Main Image Carousel */}
              <View style={styles.phoneImageWrap}>
                <Image
                  source={{ uri: currentPreviewImage }}
                  style={styles.phoneImage}
                  contentFit="cover"
                />
                <View style={styles.phoneImageOverlay}>
                  <Pressable style={styles.phoneArrowBtn} onPress={prevImage}>
                    <MaterialCommunityIcons name="arrow-left" size={14} color="#333" />
                  </Pressable>
                  <Pressable style={styles.phoneArrowBtn} onPress={nextImage}>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#333" />
                  </Pressable>
                </View>
              </View>

              {/* Phone Content */}
              <View style={styles.phoneBody}>
                <View style={styles.phoneTitleRow}>
                  <Text style={[styles.phoneTitle, { color: '#0F172A' }]}>{addressLine1}</Text>
                  <Text style={[styles.phonePrice, { color: currentAccent }]}>{price}</Text>
                </View>
                <Text style={styles.phoneSubtitle}>{addressLine2}</Text>

                <View style={styles.phoneTagsRow}>
                  {['MODERN', 'POOL', 'SMART HOME'].map(tag => (
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
                    <Text style={styles.phoneScheduleVal}>{`${formatDisplayTime(startTimeDate)} - ${formatDisplayTime(endTimeDate)}`}</Text>
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
  propertyAddress,
  propertyId,
  onGoToDashboard,
  onCreateAnother,
}: {
  createdId?: string | number;
  propertyAddress: string;
  propertyId: string;
  onGoToDashboard: () => void;
  onCreateAnother: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const qrRef = useRef<any>(null);

  const handleCopyLink = () => {
    const addressToUse = propertyAddress || '5703 Rhetta Lane, Spring TX 77389';
    const link = `https://staging.zien.ai/open-house/check-in/${encodeURIComponent(addressToUse)}`;
    Clipboard.setString(link);
    Alert.alert(
      'Copied Successfully',
      `The digital share link has been copied to your clipboard:\n\n${link}`
    );
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) {
      Alert.alert('Not Ready', 'QR code is not ready yet. Please try again.');
      return;
    }
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to save the QR code.');
      return;
    }
    qrRef.current.toDataURL(async (data: string) => {
      try {
        const filePath = `${FileSystem.cacheDirectory}qrcode-${createdId || 'temp'}.png`;
        await FileSystem.writeAsStringAsync(filePath, data, { encoding: FileSystem.EncodingType.Base64 });
        const asset = await MediaLibrary.createAssetAsync(filePath);
        await MediaLibrary.createAlbumAsync('Zien', asset, false);
        Alert.alert('Downloaded!', 'QR Code saved to your Photos.');
      } catch (e) {
        Alert.alert('Error', 'Failed to save QR code.');
      }
    });
  };

  const handleLaunchCampaign = () => {
    const addressToUse = propertyAddress || '5703 Rhetta Lane, Spring TX 77389';
    router.push({
      pathname: '/(main)/crm/campaigns',
      params: {
        openAiModal: 'true',
        aiPrompt: `Write a persuasive email campaign promoting my new listing at ${addressToUse}. Include a strong call to action for the recipient to click the link to view the property photos and RSVP.`
      }
    });
  };

  const handlePostToSocial = () => {
    router.push({
      pathname: '/(main)/social-hub/create-post',
      params: { propertyId }
    });
  };

  return (
    <View style={styles.stepContent}>
      <View style={{ position: 'absolute', opacity: 0, left: -1000, top: -1000 }}>
        <QRCode
          value={`https://staging.zien.ai/open-house/check-in/${encodeURIComponent(propertyAddress || '5703 Rhetta Lane, Spring TX 77389')}`}
          size={200}
          color="#0B2D3E"
          backgroundColor="#FFFFFF"
          {...({ getRef: (ref: any) => { qrRef.current = ref; } } as any)}
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.readyMobileScrollContent}
      >
        <View style={styles.readyMobileHeader}>
          <Text style={styles.readyMobileTitle}>Event Added Successfully!</Text>
          <Text style={styles.readyMobileSubtitle}>
            Your open house marketing engine is fully tuned and multi-channel ready.
          </Text>
        </View>

        <View style={styles.readyMobileGrid}>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleCopyLink}
          >
            <MaterialCommunityIcons name="link-variant" size={32} color={colors.accentTeal} />
            <Text style={styles.readyMobileCardLabel}>Digital Share Link</Text>
            <Text style={styles.readyMobileCardSubLabel}>Visitor Portal</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleDownloadQR}
          >
            <MaterialCommunityIcons name="qrcode" size={32} color="#0B2D3E" />
            <Text style={styles.readyMobileCardLabel}>Download QR Code</Text>
            <Text style={styles.readyMobileCardSubLabel}>Print for Desk</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleLaunchCampaign}
          >
            <MaterialCommunityIcons name="email-outline" size={32} color="#4F46E5" />
            <Text style={styles.readyMobileCardLabel}>Launch Campaign</Text>
            <Text style={styles.readyMobileCardSubLabel}>Email & SMS</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.readyMobileCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handlePostToSocial}
          >
            <MaterialCommunityIcons name="share-variant" size={32} color="#8B5CF6" />
            <Text style={styles.readyMobileCardLabel}>Post to Social</Text>
            <Text style={styles.readyMobileCardSubLabel}>Instagram/Facebook</Text>
          </Pressable>
        </View>

        <View style={styles.readyMobileActions}>
          <Pressable style={styles.readyMobilePrimaryBtn} onPress={onGoToDashboard}>
            <Text style={styles.readyMobilePrimaryBtnText}>Manage Live Open Houses</Text>
          </Pressable>
          <Pressable style={styles.readyMobileSecondaryBtn} onPress={onCreateAnother}>
            <Text style={styles.readyMobileSecondaryBtnText}>Create Another</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: H_PADDING,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtnWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
        },
        android: { elevation: 2 },
      }),
    },
    stepsWrapper: {
      flex: 1,
    },
    stepContent: {
      paddingTop: 8,
      paddingBottom: 24,
    },
    placeholderStep: {
      padding: 24,
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    templateTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    templateTitleBlock: {
      flex: 1,
    },
    templateSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      lineHeight: 20,
      marginTop: 6,
    },
    templateScroll: {
      flexGrow: 0,
      marginHorizontal: -H_PADDING,
    },
    templateScrollContent: {
      flexDirection: 'row',
      paddingHorizontal: H_PADDING,
      gap: 14,
      paddingBottom: 8,
    },
    templateCard: {
      width: 160,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: 'transparent',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: { elevation: 4 },
      }),
    },
    templateCardSelected: {
      borderColor: '#0D9488',
      borderWidth: 3,
    },
    templateCardImageWrap: {
      width: '100%',
      height: 200,
    },
    // Premium Property Row Styles
    propertyRow: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 10,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    propertyRowSelected: {
      borderColor: colors.accentTeal || '#0D9488',
      backgroundColor: colors.cardBackground,
    },
    propertyRowImageWrap: {
      width: 80,
      height: 80,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.surfaceSoft,
    },
    propertyRowImage: {
      width: '100%',
      height: '100%',
    },
    propertyCheckBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: colors.accentTeal || '#0D9488',
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 1.5,
        },
        android: { elevation: 3 },
      }),
    },
    propertyRowContent: {
      flex: 1,
      marginLeft: 14,
      justifyContent: 'center',
    },
    propertyRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    propertyRowPrice: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statusPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    statusPillReady: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    statusPillReview: {
      backgroundColor: colors.dangerBg,
    },
    statusPillScheduled: {
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
    },
    statusPillTextReady: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: '#10B981',
    },
    statusPillTextReview: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: colors.danger,
    },
    statusPillTextScheduled: {
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: '#F97316',
    },
    propertyRowAddress: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    propertyRowStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rowStatText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    rowStatDivider: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.cardBorder,
    },
    compactAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
      borderStyle: 'dashed',
      backgroundColor: colors.surfaceSoft,
      marginTop: 8,
    },
    compactAddBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
    },
    templateCardImage: {
      width: '100%',
      height: '100%',
    },
    templateWatermark: {
      position: 'absolute',
      top: 10,
      left: 10,
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(11, 45, 62, 0.15)',
      maxWidth: '80%',
    },
    templateCardFooter: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    templateCategory: {
      fontSize: 9,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    templateName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.cardBackground,
      letterSpacing: -0.2,
    },
    templateButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 24,
    },
    continueButtonDisabled: {
      opacity: 0.6,
    },
    customizationScroll: {
      flex: 1,
    },
    customizationTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    customizationSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      lineHeight: 20,
      marginBottom: 18,
    },
    previewCard: {
      marginBottom: 22,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
      }),
    },
    previewCardLabel: {
      position: 'absolute',
      top: 10,
      left: 12,
      fontSize: 9,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
      zIndex: 1,
    },
    previewCardInner: {
      padding: 12,
      paddingTop: 28,
    },
    previewHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    previewBrand: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    previewTag: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    previewPropertyImage: {
      width: '100%',
      height: 140,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      marginBottom: 10,
    },
    previewAddress: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    previewCity: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    previewStatsRow: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 10,
    },
    previewStat: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    previewDescSnippet: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 12,
    },
    previewAgentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    previewAgentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBorder,
    },
    previewAgentInfo: {
      flex: 1,
    },
    previewAgentName: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    previewAgentMeta: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 1,
    },
    previewQRBox: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    customSectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    brandingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },

    customButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 22,
    },
    outlineButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
    },
    outlineButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    styleTagsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    styleTag: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    styleTagActive: {
      backgroundColor: colors.accentTeal,
      borderColor: '#0B2D3E',
    },
    styleTagText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    styleTagTextActive: {
      color: colors.cardBackground,
    },
    descriptionInput: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    regenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#0D9488',
      marginBottom: 22,
    },
    regenerateButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.cardBackground,
    },
    leadCaptureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingVertical: 4,
    },
    leadCaptureLabelBlock: {
      flex: 1,
      marginRight: 12,
    },
    leadCaptureLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    leadCaptureSub: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      marginTop: 2,
    },
    finalizeButton: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: { elevation: 2 },
      }),
    },
    // Mobile Optimized Step 5 Styles
    readyMobileScrollContent: {
      paddingBottom: 40,
      alignItems: 'center',
    },
    readyMobileHeader: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 32,
      paddingHorizontal: 20,
    },
    readyMobileTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    readyMobileSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    readyMobileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 40,
    },
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
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        android: { elevation: 2 },
      }),
    },
    readyMobileCardLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 12,
      textAlign: 'center',
    },
    readyMobileCardSubLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 4,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    readyMobileActions: {
      width: '100%',
      paddingHorizontal: 16,
      gap: 12,
    },
    readyMobilePrimaryBtn: {
      backgroundColor: colors.accentTeal,
      width: '100%',
      paddingVertical: 18,
      borderRadius: 14,
      alignItems: 'center',
    },
    readyMobilePrimaryBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.cardBackground,
    },
    readyMobileSecondaryBtn: {
      backgroundColor: colors.cardBackground,
      width: '100%',
      paddingVertical: 18,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    readyMobileSecondaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
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

    formCardWrap: {
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: { elevation: 4 },
      }),
    },
    formCardBorder: {
      height: 3,
      width: '100%',
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
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: '#E8EEF4',
      marginVertical: 18,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: 12,
      marginVertical: 16,
    },
    field: {
      flex: 1,
    },
    fieldSingle: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.4,
      marginBottom: 6,
    },
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
    input: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      padding: 0,
    },
    phoneInputWrapper: {
      width: '100%',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      height: 48,
      overflow: 'hidden',
    },
    phoneTextContainer: {
      backgroundColor: 'transparent',
      paddingVertical: 0,
      paddingHorizontal: 0,
      height: '100%',

    },
    phoneTextInput: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
      backgroundColor: 'transparent',
      padding: 0,

    },
    phoneCodeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      paddingLeft: 10,

    },
    phoneFlagButton: {
      width: 60,
      height: 48,
      backgroundColor: 'transparent',
      borderRightWidth: 1.5,
      borderRightColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadArea: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 18,
      marginVertical: 16,
    },
    uploadAreaTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    uploadAreaSubtitle: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 4,
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    uploadBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      gap: 10,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    backButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
      }),
    },
    backButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    continueButton: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: { elevation: 2 },
      }),
    },
    continueButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.cardBackground,
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingHorizontal: 20,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        },
        android: { elevation: 16 },
      }),
    },
    pickerHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#D1D5DB',
      alignSelf: 'center',
      marginBottom: 16,
    },
    pickerSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    pickerSpinner: {
      marginVertical: 8,
    },
    pickerDoneButton: {
      backgroundColor: '#0D9488',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    pickerDoneText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.cardBackground,
    },

    // Revised Property Step Styles
    titleBlock: {
      marginBottom: 24,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    screenSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    propertiesScroll: {
      flexGrow: 0,
    },
    propertiesScrollContent: {
      gap: 16,
      paddingBottom: 20,
    },
    propertyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 4,
      overflow: 'hidden',
      height: 240,
    },
    propertyCardSelected: {
      borderWidth: 2,
      borderColor: '#0D9488',
      transform: [{ scale: 1.02 }],
    },
    propertyCardImageWrap: {
      height: 140,
      backgroundColor: colors.surfaceSoft,
      position: 'relative',
    },
    propertyCardImage: {
      width: '100%',
      height: '100%',
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    propertyCardBody: {
      padding: 16,
      flex: 1,
      justifyContent: 'center',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    statusTextReady: {
      color: colors.accentTeal,
    },
    statusTextReview: {
      color: colors.danger,
    },
    propertyAddress: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      lineHeight: 22,
    },

    // Add Property Card
    addPropertyCard: {
      height: 240,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#0D9488',
      borderStyle: 'dashed',
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    addPropertyText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
    },
    emptyProperties: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      width: '100%',
    },
    emptyPropertiesTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptyPropertiesSub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 20,
    },


    // Restored Step 2 Styles
    detailsTitleBlock: {
      paddingTop: 0,
      paddingBottom: 14,
    },
    detailsTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    detailsSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      lineHeight: 20,
    },
    inputText: {
      flex: 1,
      minWidth: 0,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    // Step 3 Pro Styles
    templateGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 16,
      paddingBottom: 20,
    },
    templateCardPro: {
      width: '48%',
      aspectRatio: 0.8,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.accentTeal,
      position: 'relative',
    },
    templateCardProSelected: {
      borderWidth: 3,
      borderColor: '#0D9488',
      transform: [{ scale: 0.98 }]
    },
    templateOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
      paddingTop: 32,
    },
    templateCategoryPro: {
      fontSize: 8,
      fontWeight: '800',
      color: '#38BDF8',
      marginBottom: 2,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    templateNamePro: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.cardBackground,
    },
    templateSelectedOverlay: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
    },
    // Step 4 Pro Styles
    // Step 4 Pro Styles
    previewContainer: {
      alignItems: 'center',
      marginBottom: 40,
      paddingTop: 20,
    },
    sectionHeaderLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    paperSheet: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      aspectRatio: 0.7, // Slightly taller
      borderRadius: 8,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
        },
        android: { elevation: 12 },
      }),
    },
    paperHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    // Step 4 Split Layout Styles
    titleBlockDesktop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
    },
    titleBlockMobile: {
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    splitLayout: {
      flexDirection: 'row',
      gap: 32,
    },
    splitLayoutMobile: {
      flexDirection: 'column',
      gap: 32,
    },
    leftColumn: {
      flex: 1,
      minWidth: 320,
    },
    leftColumnMobile: {
      minWidth: '100%',
    },
    rightColumn: {
      width: 340,
    },
    rightColumnMobile: {
      width: '100%',
      alignItems: 'center',
    },
    sectionHeaderLabelSmall: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    sectionHeaderLabelPreview: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentBtnActive: {
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 2 },
        android: { elevation: 1 },
      }),
    },
    segmentBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    segmentBtnTextActive: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    customCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: colors.cardShadowColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: { elevation: 4 },
      }),
    },
    customCardGallery: {
      minHeight: 260,
    },
    customCardTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    customCardSubLabelText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: -12, marginBottom: 16 },
    aiFieldLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
    aiOutputHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8, flexWrap: 'wrap', gap: 12 },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 12,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    colorSwatchActive: {
      borderWidth: 2,
      borderColor: colors.textPrimary,
      transform: [{ scale: 1.1 }],
    },
    addColorBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addColorBtnText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textSecondary,
      lineHeight: 22,
    },
    selectedColorText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: 8,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
      gap: 12,
    },
    stylePillRow: {
      flexDirection: 'row',
      gap: 8,
    },
    stylePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: 'transparent',
    },
    stylePillActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    stylePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    stylePillTextActive: {
      color: colors.cardBackground,
    },
    aiInput: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 16,
      fontSize: 13,
      color: colors.textPrimary,
      height: 120,
      textAlignVertical: 'top',
      lineHeight: 20,
    },
    regenerateBtnFull: {
      backgroundColor: '#00A7B5',
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    regenerateBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    galleryUploadBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 2,
      borderColor: colors.accentTeal,
      borderStyle: 'dashed',
      borderRadius: 12,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%', // take full width
      maxWidth: 240, // Match screenshot proportion roughly
    },
    galleryUploadText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.accentTeal,
      letterSpacing: 0.5,
    },
    galleryImageItem: {
      width: 140,
      height: 140,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    galleryImageThumb: {
      width: '100%',
      height: '100%',
    },
    deleteImageBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 0,
      zIndex: 10,
    },
    galleryAddBoxSmall: {
      width: 140,
      height: 140,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
      borderStyle: 'dashed',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    galleryAddTextSmall: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    logoUploadContainer: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.accentTeal,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
    },
    logoUploadBtn: {
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flex: 1,
    },
    logoUploadBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    logoPreviewWrap: {
      width: 120,
      height: 120,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      marginTop: 12,
    },
    logoPreview: {
      width: '100%',
      height: '100%',
    },

    // Phone Mockup Styles
    phoneMockup: {
      width: 320,
      backgroundColor: '#FFFFFF',
      borderRadius: 40,
      borderWidth: 12,
      borderColor: '#0F172A',
      overflow: 'hidden',
      alignSelf: 'center',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
        android: { elevation: 12 },
      }),
    },
    phoneHeader: {
      paddingLeft: 16,
      paddingRight: 20,
      paddingTop: 24,
      paddingBottom: 16,
      alignItems: 'flex-start',
    },
    phoneBrand: {
      fontSize: 16,
      fontWeight: '900',
      color: '#0F172A',
    },
    phoneLogo: {
      width: 100,
      height: 40,
      alignSelf: 'flex-start',
    },
    phoneTag: {
      fontSize: 9,
      fontWeight: '800',
      color: '#00A7B5',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    phoneImageWrap: {
      width: '100%',
      height: 180,
      position: 'relative',
    },
    phoneImage: {
      width: '100%',
      height: '100%',
    },
    phoneImageOverlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    phoneArrowBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.9,
    },
    phoneBody: {
      padding: 20,
    },
    phoneTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    phoneTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: '900',
      lineHeight: 26,
    },
    phonePrice: {
      fontSize: 14,
      fontWeight: '800',
      color: '#00A7B5',
    },
    phoneSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 16,
    },
    phoneTagsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 24,
    },
    phonePill: {
      backgroundColor: '#F0F9FF',
      color: '#00A7B5',
      fontSize: 8,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    phoneStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#E2E8F0',
      paddingVertical: 12,
      marginBottom: 24,
    },
    phoneStatItem: {
      alignItems: 'flex-start',
    },
    phoneStatValue: {
      fontSize: 15,
      fontWeight: '900',
      color: '#0F172A',
    },
    phoneStatLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 2,
    },
    phoneScheduleLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    phoneScheduleRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    phoneScheduleBox: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      padding: 12,
      borderRadius: 8,
    },
    phoneScheduleVal: {
      fontSize: 12,
      fontWeight: '800',
      color: '#0F172A',
    },
    phoneScheduleSub: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 2,
    },

    bottomActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
      marginTop: 40,
    },
    actionBackBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    actionBackText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },
    actionFinalizeBtn: {
      backgroundColor: '#0F172A',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    actionFinalizeText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
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
      fontSize: 10,
    },
    detailsScroll: {
      flex: 1,
    },
    // Loader Overlay
    loaderOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loaderCard: {
      backgroundColor: '#FFFFFF',
      padding: 32,
      borderRadius: 24,
      alignItems: 'center',
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    loaderText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
      marginTop: 20,
      textAlign: 'center',
    },
    loaderSubtext: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748B',
      marginTop: 8,
      textAlign: 'center',
    },
  });

}
