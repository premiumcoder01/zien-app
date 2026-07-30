import { useAppTheme } from '@/context/ThemeContext';
import { CreateDigitalCardPayload } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreateCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (payload: CreateDigitalCardPayload) => Promise<void>;
  initialType?: 'work' | 'personal';
}

export function CreateCardModal({ isVisible, onClose, onCreate, initialType = 'work' }: CreateCardModalProps) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [cardType, setCardType] = useState<'work' | 'personal'>(initialType);

  const [profileName, setProfileName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callingCode, setCallingCode] = useState('1');
  const phoneInputRef = React.useRef<PhoneInput>(null);

  useEffect(() => {
    if (isVisible) {
      setCardType(initialType);
      setProfileName('');
      setFullName('');
      setEmail('');
      setPhone('');
      setTitle('');
      setCompanyName('');
      setCallingCode('1');
    }
  }, [isVisible, initialType]);

  const handleSubmit = async () => {
    if (!profileName.trim() || !fullName.trim() || !email.trim()) return;
    setIsSubmitting(true);

    const callingCode = phoneInputRef.current?.getCallingCode() || '1';
    let nationalNumber = phone.replace(/\D/g, '');
    if (nationalNumber.startsWith('0')) {
      nationalNumber = nationalNumber.slice(1);
    }
    const fullPhone = phone ? `+${callingCode}${nationalNumber}` : '';

    try {
      await onCreate({
        card_type: cardType,
        profile_name: profileName,
        name: fullName,
        email,
        phone: fullPhone,
        title: cardType === 'work' ? title : '',
        company_name: cardType === 'work' ? companyName : '',
      });
      onClose();
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';
  const submitDisabled = !profileName.trim() || !fullName.trim() || !email.trim() || isSubmitting;

  // Theme colors for selection and buttons
  const activeColor = cardType === 'work' ? colors.textPrimary : colors.accentTeal;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(11, 45, 62, 0.05)' }]}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={20} color={colors.textPrimary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Create Digital Card</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Setup your professional profile</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="handled"
            >
              {/* Card Type Selector */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Card Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.typeBtn,
                      {
                        borderColor: cardType === 'work' ? activeColor : colors.cardBorder,
                        backgroundColor: cardType === 'work' ? 'transparent' : 'transparent',
                        borderWidth: cardType === 'work' ? 2 : 1.5,
                      },
                    ]}
                    onPress={() => setCardType('work')}>
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={24}
                      color={cardType === 'work' ? activeColor : colors.textSecondary}
                    />
                    <Text style={[
                      styles.typeText,
                      { color: cardType === 'work' ? activeColor : colors.textSecondary }
                    ]}>Work</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.typeBtn,
                      {
                        borderColor: cardType === 'personal' ? activeColor : colors.cardBorder,
                        backgroundColor: cardType === 'personal' ? 'rgba(20, 184, 166, 0.05)' : 'transparent',
                        borderWidth: cardType === 'personal' ? 2 : 1.5,
                      },
                    ]}
                    onPress={() => setCardType('personal')}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={24}
                      color={cardType === 'personal' ? activeColor : colors.textSecondary}
                    />
                    <Text style={[
                      styles.typeText,
                      { color: cardType === 'personal' ? activeColor : colors.textSecondary }
                    ]}>Personal</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Grid 1: Profile Name & Full Name */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Profile Name <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC', borderColor: colors.cardBorder }]}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="e.g. Work"
                      placeholderTextColor={colors.textSecondary + '80'}
                      value={profileName}
                      onChangeText={setProfileName}
                    />
                  </View>
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC', borderColor: colors.cardBorder }]}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="Your Name"
                      placeholderTextColor={colors.textSecondary + '80'}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>
              </View>

              {/* Grid 2: Email & Phone */}
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Email Address <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC', borderColor: colors.cardBorder }]}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="you@mail.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={colors.textSecondary + '80'}
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Phone Number
                  </Text>
                  <PhoneInput
                    key={isVisible ? 'active' : 'inactive'}
                    ref={phoneInputRef}
                    defaultValue={phone}
                    defaultCode="US"
                    layout="first"
                    onChangeText={setPhone}
                    onChangeCountry={(country) => {
                      setCallingCode(country.callingCode[0] || '1');
                    }}
                    withDarkTheme={isDark}
                    withShadow={false}
                    autoFocus={false}
                    disableArrowIcon={true}
                    containerStyle={[
                      styles.phoneContainer,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC',
                        borderColor: colors.cardBorder,
                      }
                    ]}
                    textContainerStyle={styles.phoneTextContainer}
                    textInputStyle={[styles.phoneTextInput, { color: colors.textPrimary }]}
                    codeTextStyle={[styles.phoneCodeText, { color: colors.textPrimary }]}
                    flagButtonStyle={[styles.phoneFlagButton, { borderRightColor: colors.cardBorder }]}
                    placeholder="Phone Number"
                    textInputProps={{
                      placeholderTextColor: colors.textSecondary + '80',
                      maxLength: 15,
                      keyboardType: 'phone-pad',
                    }}
                    countryPickerProps={{
                      withFilter: true,
                      withAlphaFilter: true,
                      renderFlagButton: () => {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1, justifyContent: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                              +{callingCode}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={12} color={colors.textSecondary} />
                          </View>
                        );
                      },
                      theme: {
                        backgroundColor: colors.cardBackground,
                        onBackgroundTextColor: colors.textPrimary,
                        fontSize: 15,
                        filterPlaceholderTextColor: colors.textSecondary + '80',
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
                        placeholderTextColor: colors.textSecondary + '80',
                        style: {
                          flex: 1,
                          height: 48,
                          color: colors.textPrimary,
                          fontSize: 15,
                          textAlignVertical: 'center',
                          marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                        }
                      }
                    }}
                  />
                </View>
              </View>

              {/* Grid 3: Title & Company (Work Only) */}
              {cardType === 'work' && (
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      Title / Position
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC', borderColor: colors.cardBorder }]}>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="e.g. Broker"
                        placeholderTextColor={colors.textSecondary + '80'}
                        value={title}
                        onChangeText={setTitle}
                      />
                    </View>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      Company Name
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F9FC', borderColor: colors.cardBorder }]}>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="e.g. Zien"
                        placeholderTextColor={colors.textSecondary + '80'}
                        value={companyName}
                        onChangeText={setCompanyName}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.submitBtn,
                  { backgroundColor: submitDisabled ? colors.cardBorder : activeColor }
                ]}
                disabled={submitDisabled}
                onPress={handleSubmit}>
                {isSubmitting ? (
                  <ActivityIndicator color={submitDisabled ? colors.textSecondary : '#FFFFFF'} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="creation"
                      size={20}
                      color={submitDisabled ? colors.textSecondary : (isDark && activeColor === colors.textPrimary ? colors.cardBackground : '#FFFFFF')}
                    />
                    <Text style={[
                      styles.submitBtnText,
                      { color: submitDisabled ? colors.textSecondary : (isDark && activeColor === colors.textPrimary ? colors.cardBackground : '#FFFFFF') }
                    ]}>Create My Card</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  flex1: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    height: 90,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputContainer: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '700',
    textAlignVertical: 'center',
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },
  phoneContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 14,
  },
  phoneCodeText: {
    display: 'none',
    width: 0,
    height: 0,
    paddingHorizontal: 0,
  },
  phoneFlagButton: {
    backgroundColor: 'transparent',
    width: 55,
    height: 54,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTextInput: {
    fontSize: 15,
    height: 54,
    fontWeight: '700',
    paddingLeft: 4,
  },
});
