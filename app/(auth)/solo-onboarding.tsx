import { AuthCard, AuthLogoBrand, AuthScreenBackground } from '@/components/auth';
import GradientButton from '@/components/ui/GradientButton';
import LabeledInput from '@/components/ui/labeled-input';
import OutlineButton from '@/components/ui/OutlineButton';
import PasswordInput from '@/components/ui/PasswordInput';
import StepIndicator from '@/components/ui/StepIndicator';
import { Addon, CheckoutPayload, completeCheckout, fetchSoloPlans, Plan, registerSoloCheckout } from '@/services/plans';
import { checkUserExists, registerMobileIos, RegisterMobileIosRequest } from '@/services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

type PlanId = 'pro-agent' | 'starter' | 'team';

export default function SoloOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useAppTheme();

  const handleContactSupport = async () => {
    const url = 'mailto:support@zien.ai';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        throw new Error('Not supported');
      }
    } catch (error) {
      Alert.alert(
        'Support Email',
        'Please email us at support@zien.ai',
        [{ text: 'OK' }]
      );
    }
  };

  const styles = getStyles(colors, insets);
  const { login, logout, accessToken } = useAuth();
  const { isCompleting } = useLocalSearchParams();
  const isCompletingMode = isCompleting === 'true';

  const [currentStep, setCurrentStep] = useState(isCompletingMode ? 3 : 1);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro-agent');
  const [duration, setDuration] = useState<'monthly' | 'annually'>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  const [countryCode, setCountryCode] = useState('+1');
  const [countryCodeISO, setCountryCodeISO] = useState<any>('US');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const phoneInputRef = useRef<PhoneInput>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    primaryMarket: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const nameRegex = /^[A-Za-z\s.-]+$/;

      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      } else if (!nameRegex.test(formData.firstName)) {
        newErrors.firstName = 'First name should only contain letters';
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      } else if (!nameRegex.test(formData.lastName)) {
        newErrors.lastName = 'Last name should only contain letters';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (phoneInputRef.current && !phoneInputRef.current.isValidNumber(formData.phone)) {
        newErrors.phone = 'Invalid number for ' + (phoneInputRef.current.getCountryCode() || 'selected country');
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirm password is required';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (currentStep === 2) {
      const genericRegex = /^[A-Za-z\s.-]+$/;

      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';

      if (!formData.primaryMarket.trim()) {
        newErrors.primaryMarket = 'Primary market is required';
      } else if (!genericRegex.test(formData.primaryMarket)) {
        newErrors.primaryMarket = 'Market name should only contain letters';
      } else if (formData.primaryMarket.length < 2) {
        newErrors.primaryMarket = 'Market name is too short';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isCheckingExists, setIsCheckingExists] = useState(false);

  const goNext = async () => {
    if (!validateStep()) return;

    if (currentStep === 1) {
      setIsCheckingExists(true);
      try {
        const checkResult = await checkUserExists({
          email: formData.email,
          country_code: countryCode,
          phone: formData.phone,
        });
        
        let hasError = false;
        const newErrors = { ...errors };

        if (checkResult.email?.exists) {
          newErrors.email = checkResult.email.message || 'Email already registered';
          hasError = true;
        } else {
          delete newErrors.email;
        }
        if (checkResult.phone?.exists) {
          newErrors.phone = checkResult.phone.message || 'Phone already registered';
          hasError = true;
        } else {
          delete newErrors.phone;
        }

        if (hasError) {
          setErrors(newErrors);
          setIsCheckingExists(false);
          return; // Stop and do not proceed to step 2
        }
      } catch (error: any) {
        setErrors(prev => ({ ...prev, _form: error.message || 'Failed to verify email/phone. Please try again.' }));
        setIsCheckingExists(false);
        return;
      }
      setIsCheckingExists(false);
    }

    if (Platform.OS === 'ios' && currentStep === 2) {
      const payload: RegisterMobileIosRequest = {
        flow: 'solo',
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        country_code: countryCode,
        phone: formData.phone,
        password: formData.password,
        license_number: formData.licenseNumber,
        primary_market: formData.primaryMarket,
      };

      console.log('Sending iOS Registration Payload:', payload);
      iosRegisterMutation.mutate(payload);
      return;
    }

    if (currentStep === 3) {
      const addon_ids = (activePlan?.addons || [])
        .filter(a => selectedAddons[a.slug])
        .map(a => a.id);

      const payload: CheckoutPayload = {
        addon_ids,
        billing: duration.charAt(0).toUpperCase() + duration.slice(1),
        country_code: countryCode,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        license_number: formData.licenseNumber,
        password: formData.password,
        phone: formData.phone,
        plan_id: activePlan?.id || 0,
        primary_market: formData.primaryMarket,
      };

      console.log('Sending Registration Payload:', payload);
      registerMutation.mutate(payload);
      return;
    }
    const maxSteps = Platform.OS === 'ios' ? 2 : 3;
    setCurrentStep((prev) => Math.min(prev + 1, maxSteps));
  };
  const goBack = () => {
    if (isCompletingMode) {
      // Gracefully logout to break the redirection loop and allow returning to login
      logout();
      return;
    }
    if (currentStep === 1) {
      router.back();
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const { data: plans, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['solo-plans'],
    queryFn: fetchSoloPlans,
  });




  const activePlan = useMemo(() => {
    return plans?.find(p => p.slug === selectedPlan) || plans?.[0];
  }, [plans, selectedPlan]);

  const activePrice = useMemo(() => {
    return activePlan?.prices.find(p => p.billing_interval === duration) || activePlan?.prices[0];
  }, [activePlan, duration]);

  const toggleAddon = (slug: string) => {
    setSelectedAddons(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const registerMutation = useMutation({
    mutationFn: (payload: CheckoutPayload) => registerSoloCheckout(payload),
    onSuccess: (data) => {

      if (data.checkout_url && data.session_id) {
        setCheckoutUrl(data.checkout_url);
        setSessionId(data.session_id);
        setShowWebView(true);
      } else {
        // Fallback for success without URL
        setShowSuccess(true);
      }
    },
    onError: (error: Error) => {

      const msg = error.message.toLowerCase();
      if (msg.includes('email')) {
        setErrors(prev => ({ ...prev, email: error.message }));
        setCurrentStep(1);
      } else if (msg.includes('phone')) {
        setErrors(prev => ({ ...prev, phone: error.message }));
        setCurrentStep(1);
      } else {
        setErrors(prev => ({ ...prev, _form: error.message }));
      }
    },
  });

  const iosRegisterMutation = useMutation({
    mutationFn: (payload: RegisterMobileIosRequest) => registerMobileIos(payload),
    onSuccess: (data) => {
      if (!data.access_token && data.message) {
        setShowActivationModal(true);
        return;
      }
      if (data.access_token) {
        login(data.access_token, data.role, data.complete_profile);
        setSuccessData(data);
        setShowSuccess(true);
      } else {
        setShowSuccess(true);
      }
    },
    onError: (error: Error) => {
      const msg = error.message.toLowerCase();
      if (msg.includes('email')) {
        setErrors(prev => ({ ...prev, email: error.message }));
        setCurrentStep(1);
      } else if (msg.includes('phone')) {
        setErrors(prev => ({ ...prev, phone: error.message }));
        setCurrentStep(1);
      } else {
        setErrors(prev => ({ ...prev, _form: error.message }));
      }
    },
  });

  const isAnyRegisterPending = registerMutation.isPending || iosRegisterMutation.isPending;
  const isAnyRegisterError = registerMutation.isError || iosRegisterMutation.isError;
  const anyRegisterErrorMessage = registerMutation.error?.message || iosRegisterMutation.error?.message;

  const completeCheckoutMutation = useMutation({
    mutationFn: (sId: string) => completeCheckout(sId),
    onSuccess: (data) => {

      if (data.access_token) {
        login(data.access_token, data.role, true);
        setSuccessData(data);
        setIsCompletingCheckout(false);
        setShowSuccess(true);
      }
    },
    onError: (error: Error) => {

      setIsCompletingCheckout(false);
      setErrors(prev => ({ ...prev, _form: `Payment verified but account setup failed: ${error.message}` }));
    },
  });

  // Manual redirect handled by user button click

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors._form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next._form;
        return next;
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.title}>Account Info</Text>
            <Text style={styles.subtitle}>Let's start with your basic details</Text>

            <View style={styles.form}>

              <LabeledInput
                label="First Name"
                placeholder="First Name"
                required
                containerStyle={styles.flexItem}
                value={formData.firstName}
                onChangeText={(val) => updateField('firstName', val)}
                error={errors.firstName}
              />
              <LabeledInput
                label="Last Name"
                placeholder="Last Name"
                required
                containerStyle={styles.flexItem}
                value={formData.lastName}
                onChangeText={(val) => updateField('lastName', val)}
                error={errors.lastName}
              />

              <LabeledInput
                label="Email"
                placeholder="Email"
                required
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(val) => updateField('email', val)}
                error={errors.email}
              />

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number <Text style={styles.requiredAsterisk}>*</Text></Text>
                <PhoneInput
                  ref={phoneInputRef}
                  defaultValue={formData.phone}
                  defaultCode={countryCodeISO || 'US'}
                  layout="first"
                  onChangeText={(text) => {
                    // Only allow digits and limit to 15 characters
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 15);
                    updateField('phone', cleaned);
                  }}
                  onChangeFormattedText={(_text) => {
                    const callingCode = phoneInputRef.current?.getCallingCode();
                    const iso = phoneInputRef.current?.getCountryCode();
                    if (callingCode) setCountryCode(`+${callingCode}`);
                    if (iso) setCountryCodeISO(iso);
                  }}
                  onChangeCountry={(country) => {
                    if (country.cca2) setCountryCodeISO(country.cca2);
                    if (country.callingCode && country.callingCode[0]) {
                      setCountryCode(`+${country.callingCode[0]}`);
                    }
                  }}
                  containerStyle={[
                    styles.phoneInputWrapper,
                    !!errors.phone && { borderColor: '#EF4444' }
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
                  }}
                  countryPickerProps={{
                    withFilter: true,
                    withAlphaFilter: true,
                    renderFlagButton: (props: any) => {
                      const code = (props.countryCode || countryCodeISO || 'US').toUpperCase();
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


                {errors.phone ? <Text style={styles.errorTextSmall}>{errors.phone}</Text> : null}
              </View>

              <PasswordInput
                label="Password"
                required
                value={formData.password}
                onChangeText={(val) => updateField('password', val)}
                error={errors.password}
              />
              <PasswordInput
                label="Confirm Password"
                required
                value={formData.confirmPassword}
                onChangeText={(val) => updateField('confirmPassword', val)}
                error={errors.confirmPassword}
              />
            </View>

            <GradientButton 
              title="Continue" 
              style={styles.primaryButton} 
              onPress={goNext} 
              isLoading={isCheckingExists}
              disabled={isCheckingExists}
            />
            {errors._form && (
              <Text style={[styles.errorTextSmall, { textAlign: 'center', marginTop: 12 }]}>
                {errors._form}
              </Text>
            )}
            <Text style={styles.supportText}>
              Need help? <Text style={styles.supportLink} onPress={handleContactSupport}>Contact Support</Text>
            </Text>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>Professional Info</Text>
            <Text style={styles.subtitle}>Help us tailor Zien to your market</Text>

            <View style={styles.form}>
              <LabeledInput
                label="License Number"
                placeholder="License Number"
                required
                value={formData.licenseNumber}
                onChangeText={(val) => updateField('licenseNumber', val)}
                error={errors.licenseNumber}
              />
              <Text style={styles.disclaimer}>* License verification may take up to 5 business days.</Text>

              <LabeledInput
                label="Primary Market / City"
                placeholder="Primary Market / City"
                required
                value={formData.primaryMarket}
                onChangeText={(val) => updateField('primaryMarket', val)}
                error={errors.primaryMarket}
              />
            </View>

            <View style={styles.actionRow}>
              <OutlineButton title="Back" style={styles.secondaryButton} onPress={goBack} />
              <GradientButton title="Continue" style={styles.primaryButtonFlex} onPress={goNext} />
            </View>
            {errors._form && (
              <Text style={[styles.errorTextSmall, { textAlign: 'center', marginTop: 12 }]}>
                {errors._form}
              </Text>
            )}
            <Text style={styles.supportText}>
              Need help? <Text style={styles.supportLink} onPress={handleContactSupport}>Contact Support</Text>
            </Text>
          </>
        );
      case 3:
        if (plansLoading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Loading available plans...</Text>
            </View>
          );
        }

        if (plansError) {
          return (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Oops! Something went wrong.</Text>
              <Text style={styles.errorSubtitle}>
                {plansError instanceof Error ? plansError.message : "We couldn't load the plans. Please try again later."}
              </Text>
              <OutlineButton
                title="Retry Again"
                onPress={() => refetchPlans()}
                style={styles.retryButton}
              />
            </View>
          );
        }

        return (
          <>
            <Text style={styles.title}>Select a Plan</Text>
            <Text style={styles.subtitle}>Pick duration first, then choose the best plan</Text>

            <View style={styles.planSection}>
              <View style={styles.durationPickerContainer}>
                <Pressable
                  style={[styles.durationOption, duration === 'monthly' && styles.durationOptionActive, { flex: .5 }]}
                  onPress={() => setDuration('monthly')}
                >
                  <Text style={[styles.durationText, duration === 'monthly' && styles.durationTextActive]}>Monthly</Text>
                </Pressable>
                <Pressable
                  style={[styles.durationOption, duration === 'annually' && styles.durationOptionActive]}
                  onPress={() => setDuration('annually')}
                >
                  <View style={styles.annuallyLabelContainer}>
                    <Text style={[styles.durationText, duration === 'annually' && styles.durationTextActive]}>Annually</Text>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>SAVE 2 Months</Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              {plans?.map((plan: Plan, planIndex: number) => {
                const planPrice = plan.prices.find(p => p.billing_interval === duration) || plan.prices[0];
                const isSelected = selectedPlan === plan.slug;
                const isPopular = plans.length > 1 && planIndex === 1;
                const PLAN_META: Record<string, { icon: string; role: string }> = {
                  'starter': { icon: 'account-outline', role: 'Starter Agent' },
                  'pro-agent': { icon: 'briefcase-check-outline', role: 'Pro Agent' },
                };
                const meta = PLAN_META[plan.slug] || { icon: 'star-outline', role: 'Professional' };
                const displayMonthly = duration === 'annually' && planPrice
                  ? (Number(planPrice.price) / 12).toFixed(2)
                  : (planPrice?.price || '0.00');
                const wholePrice = displayMonthly.split('.')[0];
                const decimalPrice = displayMonthly.split('.')[1] || '00';

                return (
                  <Pressable
                    key={plan.id}
                    style={[styles.premiumPlanCard, isSelected && styles.premiumPlanCardSelected]}
                    onPress={() => setSelectedPlan(plan.slug as any)}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={['rgba(0,167,181,0.07)', 'rgba(11,35,65,0.04)']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}

                    {isPopular && (
                      <LinearGradient
                        colors={['#0b2341', '#00a7b5']}
                        style={styles.popularBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <MaterialCommunityIcons name="fire" size={11} color="#FFF" />
                        <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                      </LinearGradient>
                    )}

                    <View style={[styles.planCardHeader, isPopular && { marginTop: 6 }]}>
                      <LinearGradient
                        colors={isSelected ? ['#0b2341', '#00a7b5'] : ['#F1F5F9', '#E2E8F0']}
                        style={styles.planIconWrap}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialCommunityIcons
                          name={meta.icon as any}
                          size={22}
                          color={isSelected ? '#FFFFFF' : '#64748B'}
                        />
                      </LinearGradient>

                      <View style={styles.planCardTitleGroup}>
                        <View style={[styles.roleBadge, isSelected && styles.roleBadgeActive]}>
                          <Text style={[styles.roleBadgeText, isSelected && styles.roleBadgeTextActive]}>
                            {meta.role}
                          </Text>
                        </View>
                        <Text style={[styles.planNameText, isSelected && styles.planNameTextSelected]}>
                          {plan.name}
                        </Text>
                      </View>

                      {isSelected ? (
                        <LinearGradient
                          colors={['#0b2341', '#00a7b5']}
                          style={styles.selectedCheckmark}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <MaterialCommunityIcons name="check" size={13} color="#FFF" />
                        </LinearGradient>
                      ) : (
                        <View style={styles.unselectedCircle} />
                      )}
                    </View>

                    <LinearGradient
                      colors={isSelected ? ['#0b2341', '#1a3a5c'] : ['#F8FAFC', '#F1F5F9']}
                      style={styles.priceBand}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <View style={styles.priceContainer}>
                        <Text style={[styles.priceCurrency, isSelected && styles.priceOnDark]}>$</Text>
                        <Text style={[styles.priceAmount, isSelected && styles.priceOnDark]}>{wholePrice}</Text>
                        <View>
                          <Text style={[styles.priceDecimals, isSelected && styles.priceOnDark]}>.{decimalPrice}</Text>
                          <Text style={[styles.priceInterval, isSelected && styles.priceIntervalOnDark]}>/mo</Text>
                        </View>
                      </View>
                      {duration === 'annually' && (
                        <View style={[styles.billedAnnuallyBadge, isSelected && { backgroundColor: 'rgba(0,167,181,0.25)' }]}>
                          <Text style={[styles.billedAnnuallyText, isSelected && { color: '#7EEEF7' }]}>Billed annually</Text>
                        </View>
                      )}
                    </LinearGradient>

                    <View style={styles.featuresList}>
                      {plan.features?.map((feature, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <LinearGradient
                            colors={isSelected ? ['#0b2341', '#00a7b5'] : ['#E2E8F0', '#CBD5E1']}
                            style={styles.featureCheckCircle}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <MaterialCommunityIcons name="check" size={9} color={isSelected ? '#FFF' : '#94A3B8'} />
                          </LinearGradient>
                          <Text style={[styles.featureText, isSelected && styles.featureTextActive]}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                );
              })}

              <View style={styles.addOnSection}>
                <Text style={styles.sectionLabel}>Add-ons for {duration.charAt(0).toUpperCase() + duration.slice(1)}</Text>
                {activePlan?.addons.map((addon: Addon) => {
                  const addonPrice = addon.prices.find(p => p.billing_interval === duration) || addon.prices[0];
                  const isSelected = !!selectedAddons[addon.slug];

                  // Map slugs to relevant icons
                  const iconName = addon.slug.includes('staging') ? 'camera-plus-outline' :
                    addon.slug.includes('lead') ? 'account-check-outline' :
                      addon.slug.includes('property') || addon.slug.includes('intelligence') ? 'home-search-outline' :
                        'plus-circle-outline';

                  return (
                    <Pressable
                      key={addon.id}
                      style={[styles.addOnItem, isSelected && styles.addOnItemSelected]}
                      onPress={() => toggleAddon(addon.slug)}
                    >
                      <View style={styles.addOnItemMain}>
                        <View style={[styles.addOnIconBox, isSelected && styles.addOnIconBoxSelected]}>
                          <MaterialCommunityIcons
                            name={iconName as any}
                            size={20}
                            color={isSelected ? '#7EEEF7' : colors.textSecondary}
                          />
                        </View>
                        <View style={styles.addOnTextGroup}>
                          <Text style={styles.addOnName} numberOfLines={1}>{addon.name}</Text>
                          <Text style={styles.addOnSub}>{addon.description}</Text>
                          <View style={styles.addOnActionCol}>
                            <Text style={[styles.addOnPrice, isSelected && styles.addOnPriceActive]}>
                              {addonPrice
                                ? `$${duration === 'annually' ? (Number(addonPrice.price) / 12).toFixed(2) : addonPrice.price}/mo`
                                : 'N/A'}
                            </Text>
                            <Switch
                              value={isSelected}
                              onValueChange={() => toggleAddon(addon.slug)}
                              trackColor={{ false: colors.borderLight, true: colors.accent }}
                              thumbColor="#FFFFFF"
                            />
                          </View>
                        </View>

                      </View>

                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Payment Summary ({duration.charAt(0).toUpperCase() + duration.slice(1)})</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{activePlan?.name}</Text>
                  <Text style={styles.summaryValue}>
                    {duration === 'annually'
                      ? `$${(Number(activePrice?.price || 0) / 12).toFixed(2)}/mo x 12`
                      : `$${activePrice?.price || '0.00'}`}
                  </Text>
                </View>

                {(activePlan?.addons || []).filter(a => selectedAddons[a.slug]).map(addon => {
                  const addonPrice = addon.prices.find(p => p.billing_interval === duration) || addon.prices[0];
                  return (
                    <View key={addon.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{addon.name}</Text>
                      <Text style={styles.summaryValue}>
                        {duration === 'annually'
                          ? `$${(Number(addonPrice?.price || 0) / 12).toFixed(2)}/mo x 12`
                          : `$${addonPrice?.price || '0.00'}`}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total Deduction</Text>
                  <Text style={styles.summaryTotalValue}>
                    ${(
                      Number(activePrice?.price || 0) +
                      (activePlan?.addons || [])
                        .filter(a => selectedAddons[a.slug])
                        .reduce((sum, a) => {
                          const ap = a.prices.find(p => p.billing_interval === duration) || a.prices[0];
                          return sum + Number(ap?.price || 0);
                        }, 0)
                    ).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.trialInfo}>
                  {(() => {
                    const total = Number(activePrice?.price || 0) +
                      (activePlan?.addons || [])
                        .filter(a => selectedAddons[a.slug])
                        .reduce((sum, a) => {
                          const ap = a.prices.find(p => p.billing_interval === duration) || a.prices[0];
                          return sum + Number(ap?.price || 0);
                        }, 0);
                    const perMonth = (total / 12).toFixed(2);
                    return (
                      <>
                        <Text style={styles.trialBold}>14-day free trial.</Text>
                        {' '}You will enter a payment method at checkout; you are not charged today. After the trial,{' '}
                        {duration === 'annually' ? (
                          <Text style={styles.trialBold}>${perMonth}/mo (billed ${total.toFixed(2)} annually)</Text>
                        ) : (
                          <Text style={styles.trialBold}>${total.toFixed(2)} per Month</Text>
                        )}
                        {' '}applies until you cancel.
                      </>
                    );
                  })()}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <OutlineButton
                title="Back"
                style={styles.secondaryButton}
                onPress={goBack}
                disabled={isAnyRegisterPending || isCompletingMode}
              />
              <GradientButton
                title="Continue"
                style={styles.primaryButtonFlex}
                onPress={goNext}
                isLoading={isAnyRegisterPending}
              />
            </View>
            {isAnyRegisterError && (
              <Text style={[styles.errorTextSmall, { textAlign: 'center', marginTop: 12 }]}>
                {anyRegisterErrorMessage}
              </Text>
            )}
            <Text style={styles.supportText}>
              Need help? <Text style={styles.supportLink} onPress={handleContactSupport}>Contact Support</Text>
            </Text>
          </>
        );
      default:
        return null;
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    console.log('WebView Navigation URL:', navState.url);

    // Heuristics for success or failure redirect
    if (navState.url.includes('success') || navState.url.includes('checkout-success')) {
      console.log('Success detected from URL redirect!');
      setShowWebView(false);
      setIsCompletingCheckout(true);
      if (sessionId) {
        completeCheckoutMutation.mutate(sessionId);
      }
    } else if (navState.url.includes('cancel') || navState.url.includes('checkout-cancel')) {
      console.log('Cancellation detected from URL redirect.');
      setShowWebView(false);
    }
  };

  const renderCompleting = () => (
    <View style={styles.loadingContainerLarge}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.loadingTitleLarge}>Finalizing your workspace...</Text>
      <Text style={styles.loadingSubtitleLarge}>We're setting everything up for you. Almost there!</Text>
    </View>
  );

  const renderSuccess = () => {
    const planName = successData?.plan_summary?.plan?.name || 'Pro Agent';
    const addons = successData?.plan_summary?.addons || [];
    const redirectTo = successData?.redirect_to || (successData?.role === 'agency_user' ? '/agency' : '/(main)/dashboard');

    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconOuter}>
          <View style={styles.successIconInner}>
            <MaterialCommunityIcons name="check" size={32} color="#10B981" />
          </View>
        </View>

        <Text style={styles.successTitle}>Welcome to Zien!</Text>
        <Text style={styles.successHighlight}>{planName} Trial Started.</Text>

        <Text style={styles.successDescription}>
          Your 14-day trial is now active. Your saved payment method will be charged at the end of the trial unless you cancel.
        </Text>

        {addons.length > 0 && (
          <View style={styles.successPlanDetails}>
            <Text style={styles.successDetailsTitle}>Included Add-ons:</Text>
            {addons.map((addon: any) => (
              <View key={addon.id} style={styles.successAddonRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                <Text style={styles.successAddonName}>{addon.name}</Text>
              </View>
            ))}
          </View>
        )}

        <GradientButton
          title="Continue to Dashboard"
          style={styles.successButton}
          onPress={() => router.push(redirectTo as any)}
        />
      </View>
    );
  };

  return (
    <AuthScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            (showSuccess || isCompletingCheckout) && { justifyContent: 'center', }
          ]}
          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {!showSuccess && !isCompletingCheckout && (
            <View style={styles.topNav}>
              <Pressable style={styles.backButton} onPress={goBack} hitSlop={12}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
              </Pressable>

              <View style={{ width: 44 }} />
            </View>
          )}

          <AuthCard>
            {/* Added centered logo brand here as well to match design flow */}
            <AuthLogoBrand brandLabel="ZIEN" />

             {!showSuccess && !isCompletingCheckout && <StepIndicator currentStep={currentStep} totalSteps={Platform.OS === 'ios' ? 2 : 3} />}

            {isCompletingCheckout ? renderCompleting() : showSuccess ? renderSuccess() : renderStepContent()}
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showWebView} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingTop: Math.max(insets.top, 20) }}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Checkout</Text>
            <Pressable onPress={() => setShowWebView(false)} style={styles.closeWebViewButton}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {checkoutUrl && (
            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={showActivationModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.activationCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.activationGradient}
            >
              {/* Circular Mail Icon Header */}
              <View style={styles.iconContainerOuter}>
                <LinearGradient
                  colors={['#00A7B5', '#0B2341']}
                  style={styles.iconContainerInner}
                >
                  <MaterialCommunityIcons name="email-fast-outline" size={38} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.activationTitle}>Verify Your Email</Text>
              <Text style={styles.activationSubtitle}>We've sent an activation link to:</Text>
              
              {/* Highlighted Email Badge */}
              <View style={styles.emailBadge}>
                <Text style={styles.emailBadgeText}>{formData.email.toLowerCase()}</Text>
              </View>

              <Text style={styles.activationDescription}>
                Please check your email and choose a plan to activate your subscription.
              </Text>

              {/* Steps Container */}
              <View style={styles.stepsContainer}>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Open Email Inbox</Text>
                    <Text style={styles.stepDesc}>Find the activation email from Zien.</Text>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Activate Plan & Pay</Text>
                    <Text style={styles.stepDesc}>Click the link, select a plan and subscribe.</Text>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepTitle}>Return and Log In</Text>
                    <Text style={styles.stepDesc}>Open Zien again & sign in with your credentials.</Text>
                  </View>
                </View>
              </View>

              {/* Primary Button */}
              <GradientButton
                title="Go to Login"
                style={styles.activationBtn}
                onPress={() => {
                  setShowActivationModal(false);
                  router.push('/(auth)/login');
                }}
              />
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </AuthScreenBackground>
  );
}

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: colors.screenPadding,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topLogo: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    alignSelf: 'stretch',
    gap: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  phoneInputWrapper: {
    width: '100%',
    backgroundColor: colors.inputBackground,
    borderRadius: colors.inputBorderRadius,
    borderWidth: 1,
    borderColor: colors.borderInput,
    height: 50,
    overflow: 'hidden',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  phoneTextInput: {
    fontSize: 15,
    marginLeft: 10,
    color: colors.textPrimary,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  phoneCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 10,
  },
  phoneFlagButton: {
    width: 60,
    height: 50,
    backgroundColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
  },
  planSection: {
    gap: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  durationPickerContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  durationOptionActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: colors.textPrimary,
  },
  annuallyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveBadge: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  premiumPlanCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#0b2341',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumPlanCardSelected: {
    borderColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardTitleGroup: {
    flex: 1,
    gap: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeActive: {
    backgroundColor: 'rgba(0,167,181,0.12)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  roleBadgeTextActive: {
    color: colors.accent,
  },
  planNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planNameTextSelected: {
    color: colors.textPrimary,
  },
  selectedCheckmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  priceBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  priceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 38,
  },
  priceDecimals: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  priceInterval: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceOnDark: {
    color: '#FFFFFF',
  },
  priceIntervalOnDark: {
    color: 'rgba(255,255,255,0.65)',
  },
  billedAnnuallyBadge: {
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  billedAnnuallyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  featuresList: {
    gap: 10,
    padding: 16,
    paddingTop: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  featureTextActive: {
    color: colors.textPrimary,
  },
  addOnSection: {
    gap: 12,
  },
  addOnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  addOnItemSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.inputBackground,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addOnItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  addOnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addOnIconBoxSelected: {
    backgroundColor: '#0b2341',
    borderColor: colors.accent,
  },
  addOnTextGroup: {
    flex: 1,
    paddingTop: 2,
  },
  addOnName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  addOnSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  addOnActionCol: {
    paddingTop: 10,
    gap: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  addOnPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  addOnPriceActive: {
    color: colors.accent,
  },
  summaryCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  trialInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  trialBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingContainerLarge: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 16,
  },
  loadingTitleLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingSubtitleLarge: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  redirectBadge: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  redirectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    width: '100%',
    height: 56,
  },
  primaryButtonFlex: {
    flex: 1,
    height: 56,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
    alignSelf: 'stretch',
  },
  successIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  successIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  successHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 32,
  },
  successDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
    paddingHorizontal: 10,
  },
  successButton: {
    width: '100%',
    marginTop: 10,
    alignSelf: 'stretch',
  },
  successPlanDetails: {
    width: '100%',
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  successDetailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  successAddonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  successAddonName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 24,
    minWidth: 140,
    marginTop: 8,
  },
  supportText: {
    marginTop: 24,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  supportLink: {
    color: colors.accent,
    fontWeight: '700',
  },
  errorTextSmall: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  webViewHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 16,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeWebViewButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  activationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  activationGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainerOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary || '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  activationSubtitle: {
    fontSize: 14,
    color: colors.textSecondary || '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailBadge: {
    backgroundColor: 'rgba(0, 167, 181, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 167, 181, 0.2)',
    marginBottom: 16,
  },
  emailBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent || '#00A7B5',
  },
  activationDescription: {
    fontSize: 14,
    color: colors.textSecondary || '#334155',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground || '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight || '#E2E8F0',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent || '#00A7B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary || '#0F172A',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.textSecondary || '#64748B',
  },
  activationBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
  },
});
