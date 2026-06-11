import { useAppTheme } from '@/context/ThemeContext';
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
  View,
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  if (!code) return 'IN';
  return COUNTRY_CODE_TO_ISO[code] || 'IN';
};

interface AddContactModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  isEditing?: boolean;
  availableGroups: string[];
  availableTags: string[];
  loading?: boolean;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  availableGroups,
  availableTags,
  loading = false,
}) => {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const phoneInputRef = React.useRef<PhoneInput>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');
  const [tag, setTag] = useState('');
  const [countryCodeISO, setCountryCodeISO] = useState<any>('US');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [activePicker, setActivePicker] = useState<'group' | 'tag' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [modalOpenKey, setModalOpenKey] = useState(0);
  const hasInitializedRef = React.useRef(false);

  console.log(initialData)

  useEffect(() => {
    if (!activePicker) {
      setPickerSearch('');
    }
  }, [activePicker]);

  const filteredPickerOptions = (activePicker === 'group' ? availableGroups : availableTags).filter(opt =>
    opt.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  useEffect(() => {
    if (visible) {
      if (!hasInitializedRef.current) {
        setModalOpenKey(prev => prev + 1);
        setErrors({});
        if (initialData) {
          setFirstName(initialData.firstName || '');
          setLastName(initialData.lastName || '');
          setEmail(initialData.email || '');

          // Correctly prefill the phone number by stripping the country prefix if it's there
          const rawPhone = initialData.phone || '';
          const callingCode = (initialData.countryCode || '').replace('+', '');
          if (callingCode && rawPhone.startsWith(callingCode)) {
            setPhone(rawPhone.slice(callingCode.length));
          } else {
            setPhone(rawPhone);
          }

          setGroup(initialData.group || '');
          setTag(initialData.tag || '');
          setCountryCodeISO(getIsoCode(initialData.countryCode));
        } else {
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
          setGroup('');
          setTag('');
          setCountryCodeISO('US');
        }
        hasInitializedRef.current = true;
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [visible, initialData]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    // 1. Basic Required Field Check
    if (!firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required.';

    // 2. Name Validation (No numbers, as per previous screen rules)
    const nameRegex = /^[A-Za-z\s.-]+$/;
    if (firstName.trim() && !nameRegex.test(firstName)) {
      newErrors.firstName = 'Can only contain letters, spaces, dots, or hyphens.';
    }
    if (lastName.trim() && !nameRegex.test(lastName)) {
      newErrors.lastName = 'Can only contain letters, spaces, dots, or hyphens.';
    }

    // 3. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    // 4. Phone Validation (Library Check)
    if (phone && !phoneInputRef.current?.isValidNumber(phone)) {
      const countryCode = phoneInputRef.current?.getCountryCode();
      newErrors.phone = `Invalid number for ${countryCode || 'selected country'}.`;
    }

    // 5. Metadata Selection Check
    if (!group) newErrors.group = 'Please select a Group.';
    if (!tag) newErrors.tag = 'Please select a Tag.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const callingCode = phoneInputRef.current?.getCallingCode() || '91';
    const nationalNumber = phone.replace(/\D/g, '');
    const fullNumber = callingCode + nationalNumber;

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: fullNumber,
      countryCode: `+${callingCode}`,
      group,
      tag,
    });
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.fullPageModal}>
        <View style={[styles.modalContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{isEditing ? 'Edit Contact' : 'Add New Contact'}</Text>
              {isEditing ? (
                <Text style={styles.headerSubtitle}>Update lead details and tags</Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior='automatic'
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
            >

              <View style={styles.formCol}>
                <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  value={firstName}
                  onChangeText={(t) => { setFirstName(t); clearError('firstName'); }}
                  placeholder="e.g. Jessica"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>
              <View style={styles.formCol}>
                <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  value={lastName}
                  onChangeText={(t) => { setLastName(t); clearError('lastName'); }}
                  placeholder="e.g. Miller"
                  placeholderTextColor={colors.textMuted}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>


              <View style={styles.fullWidthCol}>
                <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearError('email'); }}
                  placeholder="name@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.fullWidthCol}>
                <Text style={styles.label}>Phone Number</Text>
                <PhoneInput
                  key={`phone-input-${modalOpenKey}`}
                  ref={phoneInputRef}
                  defaultValue={phone}
                  defaultCode={countryCodeISO}
                  layout="second"
                  onChangeText={(t) => { setPhone(t); clearError('phone'); }}
                  containerStyle={[styles.phoneInputWrapper, errors.phone && styles.inputError]}
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
                      const code = (props.countryCode || 'US').toUpperCase();
                      const emoji = code.replace(/./g, (c: string) =>
                        String.fromCodePoint(0x1F1A5 + c.charCodeAt(0))
                      );
                      return <Text style={{ fontSize: 22, lineHeight: 30, marginLeft: 8 }}>{emoji}</Text>;
                    },
                    theme: theme === 'dark' ? {
                      backgroundColor: '#000000',
                      onBackgroundTextColor: '#FFFFFF',
                      fontSize: 15,
                      filterPlaceholderTextColor: '#94A3B8',
                    } : {
                      backgroundColor: '#FFFFFF',
                      onBackgroundTextColor: '#0F172A',
                      fontSize: 15,
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
                        color: theme === 'dark' ? '#FFFFFF' : '#0F172A',
                        fontSize: 15,
                        flex: 1,
                        marginTop: Platform.OS === 'android' ? insets.top + 10 : 0,
                      }
                    }
                  }}
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>


              <View style={styles.formCol}>
                <Text style={styles.label}>Group <Text style={styles.required}>*</Text></Text>
                <Pressable
                  style={[styles.select, errors.group && styles.inputError]}
                  onPress={() => { setActivePicker(activePicker === 'group' ? null : 'group'); clearError('group'); }}
                >
                  <Text style={[styles.selectText, !group && styles.placeholderText]}>{group || 'Select Group'}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                </Pressable>
                {errors.group && <Text style={styles.errorText}>{errors.group}</Text>}
              </View>
              <View style={styles.formCol}>
                <Text style={styles.label}>Tag <Text style={styles.required}>*</Text></Text>
                <Pressable
                  style={[styles.select, errors.tag && styles.inputError]}
                  onPress={() => { setActivePicker(activePicker === 'tag' ? null : 'tag'); clearError('tag'); }}
                >
                  <Text style={[styles.selectText, !tag && styles.placeholderText]}>{tag || 'Select Tag'}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                </Pressable>
                {errors.tag && <Text style={styles.errorText}>{errors.tag}</Text>}
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>{isEditing ? 'Update' : 'Save'}</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* Selection Sub-Modal (Searchable) */}
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {activePicker === 'group' ? 'Group' : 'Tag'}</Text>
                <Pressable onPress={() => setActivePicker(null)} style={styles.pickerCloseBtn}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.pickerSearchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.pickerSearchInput}
                  placeholder="Search..."
                  placeholderTextColor={colors.textMuted}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>

              <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled" keyboardDismissMode='on-drag'>
                {filteredPickerOptions.length === 0 ? (
                  <Text style={styles.noResults}>No matches found</Text>
                ) : (
                  filteredPickerOptions.map(opt => {
                    const isSelected = activePicker === 'group' ? group === opt : tag === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                        onPress={() => {
                          if (activePicker === 'group') setGroup(opt);
                          else setTag(opt);
                          setActivePicker(null);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>{opt}</Text>
                        {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color={colors.accentTeal} />}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  fullPageModal: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  formCol: {
    flex: 1,
    marginBottom: 20
  },
  fullWidthCol: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  required: {
    color: colors.danger || '#EF4444',
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.danger || '#EF4444',
  },
  errorText: {
    color: colors.danger || '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  phoneInputWrapper: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    height: 48,
    overflow: 'hidden',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  phoneTextInput: {
    fontSize: 14,
    marginLeft: 10,
    color: colors.textPrimary,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  phoneCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  phoneFlagButton: {
    width: 90,
    backgroundColor: colors.surfaceIcon,
    borderRightWidth: 1.5,
    borderRightColor: colors.cardBorder,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  placeholderText: {
    color: colors.textMuted,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  pickerContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    height: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.rowBorder,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceIcon,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pickerList: {
    maxHeight: 360,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  pickerItemActive: {
    backgroundColor: colors.surfaceIcon,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pickerItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  noResults: {
    textAlign: 'center',
    marginVertical: 40,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.rowBorder,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: '#0B2D3E', // Keep dark accent button for premium feel
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
