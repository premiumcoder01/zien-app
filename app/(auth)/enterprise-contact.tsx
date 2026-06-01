import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Animated } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import PhoneInput from 'react-native-phone-number-input';
import * as z from 'zod';

import { AuthCard, AuthScreenBackground } from '@/components/auth';
import LabeledInput from '@/components/ui/labeled-input';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEATURES = [
  {
    title: 'Custom Integration',
    description: 'Seamless sync with your existing CRM and transaction management software.',
  },
  {
    title: 'Volume Licensing',
    description: 'Preferred pricing tiers for brokerages and large teams.',
  },
  {
    title: 'Dedicated Success Manager',
    description: 'White-glove onboarding and 24/7 priority support channel.',
  },
];

const TEAM_SIZE_OPTIONS = [
  '1–19 Agents',
  '20–50 Agents',
  '51–200 Agents',
  '201–500 Agents',
  '500+ Agents',
];

const schema = z.object({
  fullName: z.string({ message: 'Full name is required' }).trim().min(1, 'Full name is required'),
  email: z.string({ message: 'Company email is required' }).trim().min(1, 'Company email is required').email('Invalid email address'),
  company: z.string({ message: 'Company name is required' }).trim().min(1, 'Company name is required'),
  phone: z.string({ message: 'Contact number is required' }).trim().min(1, 'Contact number is required'),
  preferredDate: z.any().refine((val) => val instanceof Date, 'Preferred date is required'),
  preferredTime: z.any().refine((val) => val instanceof Date, 'Preferred time is required'),
  teamSize: z.string({ message: 'Team size is required' }).min(1, 'Team size is required'),
  message: z.string().optional(),
  isHuman: z.boolean().refine((val) => val === true, 'Please confirm you are human'),
});

type FormData = z.infer<typeof schema>;

export default function EnterpriseContactScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const isDark = theme === 'dark';
  const router = useRouter();
  const [teamSizeModalVisible, setTeamSizeModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(30)).current;

  const showToast = () => {
    setToastVisible(true);
    Animated.parallel([
      Animated.spring(toastOpacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(toastTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: 30, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setToastVisible(false);
        router.replace('/(auth)/login');
      });
    }, 2800);
  };

  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      teamSize: '',
      isHuman: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const preferredDate = data.preferredDate as Date;
      const preferredTime = data.preferredTime as Date;

      const payload = {
        full_name: data.fullName,
        email: data.email,
        company_name: data.company,
        contact_number: formattedPhone || data.phone,
        preferred_date: preferredDate.toISOString().split('T')[0], // "YYYY-MM-DD"
        preferred_time: `${String(preferredTime.getHours()).padStart(2, '0')}:${String(preferredTime.getMinutes()).padStart(2, '0')}`, // "HH:mm"
        source: 'contact_sales',
        team_size: data.teamSize,
        message: data.message || '',
        is_human_verified: data.isHuman,
      };

      console.log('Demo request payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://staging.zien.ai/api/website/demo-requests', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));
      console.log('Demo request response:', response.status, JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(responseData.message || `Server error: ${response.status}`);
      }

      // Clear form and navigate
      reset({ teamSize: '', isHuman: false });
      setFormattedPhone('');
      showToast();
    } catch (error: any) {
      console.error('Demo request error:', error);
      // Show error inline (re-use _form style pattern)
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTeamSize = watch('teamSize');
  const selectedDate = watch('preferredDate');
  const selectedTime = watch('preferredTime');

  const handleConfirmDate = (date: Date) => {
    setValue('preferredDate', date, { shouldValidate: true });
    setDatePickerVisibility(false);
  };

  const handleConfirmTime = (date: Date) => {
    setValue('preferredTime', date, { shouldValidate: true });
    setTimePickerVisibility(false);
  };

  return (
    <AuthScreenBackground colors={['#041c32', '#061320', '#040d16']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: 250 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior='automatic'
        >

          <View style={styles.topBackButtonRow}>
            <Pressable style={styles.topBackButton} onPress={() => router.back()} hitSlop={12}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Hero section */}
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ENTERPRISE</Text>
            </View>
            <Text style={styles.heroTitle}>Power your brokerage with Zien Intelligence.</Text>
            <Text style={styles.heroSubtitle}>
              Deploy our Neural Engine across your entire organization. Get custom API access, white-labeling, and
              dedicated support for teams of 20+ agents.
            </Text>
            <View style={styles.featureList}>
              {FEATURES.map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.checkCircle}>
                    <MaterialCommunityIcons name="check" size={12} color={colors.link} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact form card */}
          <AuthCard>
            <Text style={styles.formTitle}>Contact Sales</Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <LabeledInput
                    label="Full name"
                    placeholder="Full name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value || ''}
                    required
                    error={errors.fullName?.message?.toString()}
                  />
                )}
              />

              <View style={styles.row}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <LabeledInput
                      label="Company email"
                      placeholder="Company email"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value || ''}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      containerStyle={styles.flexItem}
                      required
                      error={errors.email?.message?.toString()}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="company"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <LabeledInput
                      label="Company name"
                      placeholder="Company name"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value || ''}
                      containerStyle={styles.flexItem}
                      required
                      error={errors.company?.message?.toString()}
                    />
                  )}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contact number <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      defaultValue={value}
                      defaultCode="US"
                      layout="first"
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
                        onChange(cleaned);
                      }}
                      onChangeFormattedText={(text) => {
                        setFormattedPhone(text); // e.g. "+91 8775845996"
                        onChange(text);
                      }}
                      withDarkTheme={theme === 'dark'}
                      withShadow={false}
                      autoFocus={false}
                      containerStyle={[styles.phoneContainer, !!errors.phone && { borderColor: '#ef4444' }]}
                      textContainerStyle={styles.phoneTextContainer}
                      textInputStyle={styles.phoneTextInput}
                      codeTextStyle={styles.phoneCodeText}
                      flagButtonStyle={styles.phoneFlagButton}
                      placeholder="Phone number"
                      textInputProps={{
                        maxLength: 15,
                        keyboardType: 'phone-pad',
                      }}
                      countryPickerProps={{
                        withFilter: true,
                        withAlphaFilter: true,
                        renderFlagButton: (props: any) => {
                          const code = (props.countryCode || 'US').toUpperCase();
                          const emoji = code.replace(/./g, (c: string) =>
                            String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                          );
                          return <Text style={{ fontSize: 20, lineHeight: 26, marginLeft: 5 }}>{emoji}</Text>;
                        },
                        theme: theme === 'dark' ? {
                          backgroundColor: '#000000',
                          onBackgroundTextColor: '#FFFFFF',
                          fontSize: 15,
                          filterPlaceholderTextColor: '#94A3B8',
                          activeOpacity: 0.7,
                          itemHeight: 55,
                          flagSize: 20,
                        } : {
                          backgroundColor: '#FFFFFF',
                          onBackgroundTextColor: '#0F172A',
                          fontSize: 15,
                          filterPlaceholderTextColor: '#64748B',
                          activeOpacity: 0.7,
                          itemHeight: 55,
                          flagSize: 20,
                        },
                        modalProps: {
                          statusBarTranslucent: true,
                        },
                        closeButtonStyle: {
                          marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                        },
                        filterProps: {
                          autoFocus: true,
                          placeholder: 'Enter country name',
                          placeholderTextColor: theme === 'dark' ? '#94A3B8' : '#64748B',
                          style: {
                            flex: 1,
                            height: 48,
                            color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
                            fontSize: 15,
                            textAlignVertical: 'center',
                            marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                          },
                        },
                      }}
                    />
                  )}
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone.message?.toString()}</Text>}
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flexItem]}>
                  <Text style={styles.label}>Preferred date <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <Pressable
                    style={[styles.selectTouchable, !!errors.preferredDate && { borderColor: '#ef4444' }]}
                    onPress={() => setDatePickerVisibility(true)}>
                    <Text style={[styles.selectText, !selectedDate && styles.selectPlaceholder]}>
                      {selectedDate ? selectedDate.toLocaleDateString() : 'dd/mm/yyyy'}
                    </Text>
                    <MaterialCommunityIcons name="calendar" size={18} color={colors.iconMuted} />
                  </Pressable>
                  {errors.preferredDate && <Text style={styles.errorText}>{errors.preferredDate.message?.toString()}</Text>}
                </View>

                <View style={[styles.field, styles.flexItem]}>
                  <Text style={styles.label}>Preferred time <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <Pressable
                    style={[styles.selectTouchable, !!errors.preferredTime && { borderColor: '#ef4444' }]}
                    onPress={() => setTimePickerVisibility(true)}>
                    <Text style={[styles.selectText, !selectedTime && styles.selectPlaceholder]}>
                      {selectedTime ? selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-- : -- --'}
                    </Text>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.iconMuted} />
                  </Pressable>
                  {errors.preferredTime && <Text style={styles.errorText}>{errors.preferredTime.message?.toString()}</Text>}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Team size</Text>
                <Pressable
                  style={styles.selectTouchable}
                  onPress={() => setTeamSizeModalVisible(true)}>
                  <Text style={[styles.selectText, !selectedTeamSize && styles.selectPlaceholder]}>{selectedTeamSize || 'Select your team size'}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.iconMuted} />
                </Pressable>
              </View>

              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.field}>
                    <Text style={styles.label}>How can we help?</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="How can we help?"
                      placeholderTextColor={colors.inputPlaceholder}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value || ''}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="isHuman"
                render={({ field: { onChange, value } }) => (
                  <Pressable style={styles.checkboxRow} onPress={() => onChange(!value)}>
                    <View style={[styles.checkbox, value && styles.checkboxActive]}>
                      {value && <MaterialCommunityIcons name="check" size={14} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I confirm I am human.</Text>
                  </Pressable>
                )}
              />
              {errors.isHuman && <Text style={[styles.errorText, { marginTop: -8 }]}>{errors.isHuman.message?.toString()}</Text>}

              <Pressable
                style={[styles.submitButton, isSubmitting && { opacity: 0.75 }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={colors.brandGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButtonGradient}>
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.gradientButtonText} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Request Demo</Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color={colors.gradientButtonText} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={teamSizeModalVisible}
        transparent
        animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTeamSizeModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Team Size</Text>
            {TEAM_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[styles.modalOption, selectedTeamSize === option && styles.modalOptionSelected]}
                onPress={() => {
                  setValue('teamSize', option);
                  setTeamSizeModalVisible(false);
                }}>
                <Text style={styles.modalOptionText}>{option}</Text>
                {selectedTeamSize === option ? (
                  <MaterialCommunityIcons name="check" size={20} color={colors.link} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        minimumDate={new Date()}
        display={Platform.OS === 'android' ? 'calendar' : 'inline'}
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisibility(false)}
        display={Platform.OS === 'android' ? 'clock' : 'spinner'}
      />

      {/* Success Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.toastIconWrap}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
          </View>
          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle}>Request Sent!</Text>
            <Text style={styles.toastSubtitle}>Our sales team will reach out to you shortly.</Text>
          </View>
        </Animated.View>
      )}
    </AuthScreenBackground>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      padding: colors.screenPadding,
      flexGrow: 1,
      paddingBottom: 40,
    },
    hero: {
      marginTop: 24,
      marginBottom: 24,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.link,
      marginBottom: 16,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: '#FFFFFF',
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: 28,
      marginBottom: 10,
    },
    heroSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: 21,
      marginBottom: 18,
    },
    featureList: {
      gap: 14,
    },
    featureItem: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.link,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    featureContent: { flex: 1 },
    featureTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.7)',
      lineHeight: 19,
    },
    topBackButtonRow: {
      alignSelf: 'stretch',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    topBackButton: {
      padding: 8,
      marginLeft: -8, // Compensate for padding to align with other content
    },
    formTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 18,
    },
    form: {
      alignSelf: 'stretch',
      gap: 14,
    },
    row: { flexDirection: 'row', gap: 12 },
    flexItem: { flex: 1 },
    field: { gap: 8 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    selectTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBackground,
      borderRadius: colors.inputBorderRadius,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    selectText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    selectPlaceholder: {
      color: colors.inputPlaceholder,
    },
    textArea: {
      backgroundColor: colors.inputBackground,
      borderRadius: colors.inputBorderRadius,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 100,
    },
    phoneContainer: {
      width: '100%',
      backgroundColor: colors.inputBackground,
      borderRadius: colors.inputBorderRadius,
      borderWidth: 1,
      borderColor: colors.borderInput,
      height: 50,
    },
    phoneTextContainer: {
      backgroundColor: 'transparent',
      paddingVertical: 0,
      borderRadius: colors.inputBorderRadius,
    },
    phoneCodeText: {
      fontSize: 15,
      color: colors.textPrimary,
      paddingHorizontal: 10,
    },
    phoneFlagButton: {
      backgroundColor: 'transparent',
      width: 60,
      height: 50,
      borderRightWidth: 1,
      borderRightColor: colors.borderInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phoneTextInput: {
      fontSize: 15,
      color: colors.textPrimary,
      height: 50,
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginTop: 2,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.borderInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: colors.link,
      borderColor: colors.link,
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    submitButton: {
      width: '100%',
      marginTop: 8,
      borderRadius: colors.buttonBorderRadius,
      overflow: 'hidden',
    },
    submitButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.gradientButtonText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      maxHeight: 360,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    modalOptionSelected: {
      backgroundColor: colors.surfaceMuted,
    },
    modalOptionText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    toast: {
      position: 'absolute',
      bottom: 48,
      left: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 1,
      borderColor: '#D1FAE5',
    },
    toastIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toastTextWrap: {
      flex: 1,
    },
    toastTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    toastSubtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
  });
}
