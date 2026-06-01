import { PageHeader } from '@/components/ui';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AgencyProfile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();

    // Bind state to field inputs for high-fidelity functionality
    const [fullName, setFullName] = useState('Skyline Agency Admin');
    const [email, setEmail] = useState('admin@skyline-realty.com');
    const [phone, setPhone] = useState('+1 (555) 123-4567');
    const [website, setWebsite] = useState('https://skyline-realty.com');
    const [address, setAddress] = useState('Suite 405, Innovation Tower, Tech Park, Berlin, Germany');
    const [regNo, setRegNo] = useState('DE-99120349');
    const [taxId, setTaxId] = useState('VAT-77283');

    // Premium Local Input Component with Active Focus Highlights
    const PremiumInput = ({
        label,
        value,
        onChangeText,
        placeholder,
        icon,
        keyboardType = 'default',
        returnKeyType = 'next',
        autoCapitalize = 'none',
        multiline = false,
    }: {
        label: string;
        value: string;
        onChangeText: (text: string) => void;
        placeholder: string;
        icon: string;
        keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
        returnKeyType?: 'next' | 'done';
        autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
        multiline?: boolean;
    }) => {
        const [isFocused, setIsFocused] = useState(false);

        return (
            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
                <View style={[
                    styles.inputWrapper,
                    {
                        backgroundColor: colors.cardBackground,
                        borderColor: isFocused ? colors.accentTeal : colors.cardBorder,
                        height: multiline ? 100 : 54,
                        alignItems: multiline ? 'flex-start' : 'center',
                        paddingTop: multiline ? 12 : 0,
                    }
                ]}>
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={20}
                        color={isFocused ? colors.accentTeal : colors.textSecondary}
                        style={[styles.inputIcon, multiline && { marginTop: 2 }]}
                    />
                    <TextInput
                        style={[
                            styles.premiumTextInput,
                            {
                                color: colors.textPrimary,
                                height: multiline ? 76 : 48,
                                textAlignVertical: multiline ? 'top' : 'center',
                            }
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.inputPlaceholder}
                        value={value}
                        onChangeText={onChangeText}
                        keyboardType={keyboardType}
                        returnKeyType={returnKeyType}
                        autoCapitalize={autoCapitalize}
                        multiline={multiline}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                </View>
            </View>
        );
    };

    // Premium Section Header with subtle colored marker
    const SectionHeader = ({ title, icon }: { title: string; icon: string }) => {
        return (
            <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionHeaderLine, { backgroundColor: colors.accentTeal }]} />
                <MaterialCommunityIcons name={icon as any} size={16} color={colors.accentTeal} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>{title}</Text>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={colors.backgroundGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <PageHeader
                title="Agency Profile"
                subtitle="Manage your personal and company contact details"
                onBack={() => router.back()}
                rightIconColor={colors.accentTeal}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Visual Identity & Status Card */}
                    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.avatarPressable,
                                { transform: [{ scale: pressed ? 0.96 : 1 }] }
                            ]}
                            onPress={() => console.log('Change photo')}
                        >
                            <LinearGradient
                                colors={[colors.accentTeal, colors.accentBlue]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.avatarGradientRing}
                            >
                                <View style={[styles.avatarBg, { backgroundColor: colors.cardBackground }]}>
                                    <LinearGradient
                                        colors={[colors.accentTeal + '15', colors.accentBlue + '15']}
                                        style={styles.avatarInitialsBg}
                                    >
                                        <Text style={[styles.avatarInitialsText, { color: colors.accentTeal }]}>SA</Text>
                                    </LinearGradient>
                                </View>
                            </LinearGradient>
                            <View style={[styles.verifiedBadge, { backgroundColor: colors.accentTeal, borderColor: colors.cardBackground }]}>
                                <MaterialCommunityIcons name="camera-plus" size={14} color="#fff" />
                            </View>
                        </Pressable>

                        <View style={styles.nameSection}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.profileName, { color: colors.textPrimary }]}>Skyline Agency Admin</Text>
                                <MaterialCommunityIcons name="check-decagram" size={18} color="#10B981" style={styles.verifiedDecagram} />
                            </View>
                            <Text style={styles.profileRole}>MANAGING DIRECTOR</Text>
                        </View>

                        {/* Modern Double Card Status Grid */}
                        <View style={styles.statusSection}>
                            <View style={styles.statusGrid}>
                                <View style={[styles.statusCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder }]}>
                                    <View style={[styles.statusIconContainer, { backgroundColor: '#10B98112' }]}>
                                        <MaterialCommunityIcons name="shield-check" size={18} color="#10B981" />
                                    </View>
                                    <View style={styles.statusTextContainer}>
                                        <Text style={[styles.statusLabelText, { color: colors.textSecondary }]}>STATUS</Text>
                                        <Text style={[styles.statusValue, { color: '#10B981' }]}>Verified</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder }]}>
                                    <View style={[styles.statusIconContainer, { backgroundColor: colors.accentBlue + '12' }]}>
                                        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.accentBlue} />
                                    </View>
                                    <View style={styles.statusTextContainer}>
                                        <Text style={[styles.statusLabelText, { color: colors.textSecondary }]}>JOINED</Text>
                                        <Text style={[styles.statusValue, { color: colors.textPrimary }]}>Dec 2023</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Form Sections */}
                    <View style={styles.formContainer}>
                        <SectionHeader title="Personal Details" icon="card-account-details-outline" />

                        <PremiumInput
                            label="Full Name"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Skyline Agency Admin"
                            icon="account-outline"
                            autoCapitalize="words"
                        />

                        <PremiumInput
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="admin@skyline-realty.com"
                            icon="email-outline"
                            keyboardType="email-address"
                        />

                        <PremiumInput
                            label="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+1 (555) 123-4567"
                            icon="phone-outline"
                            keyboardType="phone-pad"
                        />

                        <PremiumInput
                            label="Agency Website"
                            value={website}
                            onChangeText={setWebsite}
                            placeholder="https://skyline-realty.com"
                            icon="web"
                            keyboardType="url"
                        />

                        <SectionHeader title="Company Profile" icon="office-building-marker-outline" />

                        <PremiumInput
                            label="Office Address"
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Suite 405, Innovation Tower, Tech Park, Berlin, Germany"
                            icon="map-marker-outline"
                            multiline
                        />

                        <PremiumInput
                            label="Company Registration No."
                            value={regNo}
                            onChangeText={setRegNo}
                            placeholder="DE-99120349"
                            icon="card-text-outline"
                        />

                        <PremiumInput
                            label="Tax ID"
                            value={taxId}
                            onChangeText={setTaxId}
                            placeholder="VAT-77283"
                            icon="percent-outline"
                            returnKeyType="done"
                        />
                    </View>

                    {/* Fixed Save Button with brand gradient & micro-scale interaction */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.saveBtnContainer,
                            { transform: [{ scale: pressed ? 0.98 : 1 }] }
                        ]}
                        onPress={() => console.log('Saved Profile:', { fullName, email, phone, website, address, regNo, taxId })}
                    >
                        <LinearGradient
                            colors={colors.brandGradient as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.saveBtnGradient}
                        >
                            <MaterialCommunityIcons name="content-save-check-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.saveBtnText}>Save Profile</Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    card: {
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarPressable: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGradientRing: {
        width: 106,
        height: 106,
        borderRadius: 36,
        padding: 3, // Ring thickness
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBg: {
        width: '100%',
        height: '100%',
        borderRadius: 33,
        overflow: 'hidden',
    },
    avatarInitialsBg: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitialsText: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    nameSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedDecagram: {
        marginLeft: 6,
        marginTop: 2,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
    },
    profileRole: {
        fontSize: 10.5,
        fontWeight: '900',
        color: '#F97316',
        textAlign: 'center',
        marginTop: 6,
        letterSpacing: 1.5,
    },
    statusSection: {
        width: '100%',
        marginTop: 8,
    },
    statusGrid: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    statusCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
    },
    statusIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    statusTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    statusLabelText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statusValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    formContainer: {
        gap: 16,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 4,
    },
    sectionHeaderLine: {
        width: 3.5,
        height: 14,
        borderRadius: 2,
        marginRight: 8,
    },
    sectionHeaderTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 4,
    },
    inputWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    inputIcon: {
        marginRight: 12,
    },
    premiumTextInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        padding: 0,
    },
    saveBtnContainer: {
        marginTop: 28,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#0a2341',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    saveBtnGradient: {
        flexDirection: 'row',
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
});
