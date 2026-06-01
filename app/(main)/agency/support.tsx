import { DashboardLayout } from '@/components/main';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

const TABS = ['Virtual Assistant', 'Submitted Ticket', 'Email Support'];

const FAQS = [
    { q: 'How to add more agent seats?', a: 'You can manage seats in the "My Packages" section or contact your account manager for bulk upgrades.' },
    { q: 'Customizing agent permissions?', a: 'Visit the "Role Permissions" page to configure exactly what each role in your agency can access.' },
    { q: 'Whitelabel options?', a: 'Enterprise agencies have access to custom branding settings in the "Agency Settings" menu.' },
];

const SUPPORT_LINES = [
    { title: 'General Intelligence Support', desc: 'Technical assistance and general platform inquiries.', email: 'support@zien.ai', icon: 'email-outline', action: 'Draft Mail' },
    { title: 'Financial & Licensing Hub', desc: 'Subscription tier adjustments and billing records.', email: 'billing@zien.ai', icon: 'briefcase-outline', action: 'Contact Billing' },
    { title: 'Enterprise Partnerships', desc: 'Custom brokerage architecture and deployment.', email: 'sales@zien.ai', icon: 'handshake-outline', action: 'Reach Sales' },
];

const CustomPicker = ({ label, value, options, onSelect, icon }: any) => {
    const { colors } = useAppTheme();
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={[styles.pickerBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                activeOpacity={0.75}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {icon && <MaterialCommunityIcons name={icon} size={18} color="#64748B" />}
                    <Text
                        style={{ color: value ? colors.textPrimary : colors.textMuted, fontSize: 13, fontWeight: '600' }}
                        numberOfLines={1}
                    >
                        {value || 'Select option'}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
                        {/* Grab handle centered at top */}
                        <View style={styles.modalGrabHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity
                                style={styles.modalCloseCircle}
                                onPress={() => setVisible(false)}
                            >
                                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {options.map((opt: string) => (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => { onSelect(opt); setVisible(false); }}
                                style={styles.modalOption}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.modalOptionText, value === opt && { color: '#F97316', fontWeight: '800' }]}>
                                    {opt}
                                </Text>
                                {value === opt && <MaterialCommunityIcons name="check" size={18} color="#F97316" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const VirtualAssistant = () => {
    const { colors } = useAppTheme();
    const [isChatFocused, setIsChatFocused] = useState(false);

    return (
        <View style={styles.tabContent}>
            <View style={[styles.chatContainer, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                <View style={styles.emptyChat}>
                    <View style={[styles.chatIconWrap, { backgroundColor: '#F0FDFA' }]}>
                        <MaterialCommunityIcons name="robot-outline" size={32} color="#0a2341" />
                    </View>
                    <Text style={[styles.chatTitle, { color: colors.textPrimary }]}>How can I help you today?</Text>
                    <Text style={[styles.chatDesc, { color: colors.textSecondary }]}>
                        Our AI assistant is trained on all Zien documentation and can resolve 85% of queries instantly.
                    </Text>
                </View>
            </View>

            <View style={[
                styles.chatInputRow,
                { backgroundColor: '#F8FAFC', borderColor: isChatFocused ? '#0a2341' : '#E2E8F0' }
            ]}>
                <TextInput
                    placeholder="Type your message..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.chatInput, { color: colors.textPrimary }]}
                    onFocus={() => setIsChatFocused(true)}
                    onBlur={() => setIsChatFocused(false)}
                />
                <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85}>
                    <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={styles.sendBtnGradient}
                    >
                        <MaterialCommunityIcons name="send" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SubmittedTicket = () => {
    const { colors } = useAppTheme();
    const [form, setForm] = useState({
        category: 'Technical Issue',
        priority: 'Low - General Inquiry',
        subject: '',
        description: ''
    });

    const [isSubjectFocused, setIsSubjectFocused] = useState(false);
    const [isDescFocused, setIsDescFocused] = useState(false);

    return (
        <View style={styles.tabContent}>
            <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }]}>
                <Text style={[styles.formHeading, { color: colors.textPrimary }]}>Submit a Support Ticket</Text>

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                        <CustomPicker
                            label="Issue Category"
                            value={form.category}
                            options={['Technical Issue', 'Billing Inquiry', 'Account Security', 'Feature Request']}
                            onSelect={(v: string) => setForm({ ...form, category: v })}
                            icon="tag-outline"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <CustomPicker
                            label="Priority Level"
                            value={form.priority}
                            options={['Low - General Inquiry', 'Medium - Need Assistance', 'High - Critical Bug', 'Urgent - System Outage']}
                            onSelect={(v: string) => setForm({ ...form, priority: v })}
                            icon="alert-circle-outline"
                        />
                    </View>
                </View>

                {/* Subject Input Field with left icon and active focus transitions */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject</Text>
                    <View style={[
                        styles.inputContainerRow,
                        { backgroundColor: '#F8FAFC', borderColor: isSubjectFocused ? '#0a2341' : '#E2E8F0' }
                    ]}>
                        <MaterialCommunityIcons
                            name="pencil-outline"
                            size={18}
                            color={isSubjectFocused ? '#0a2341' : '#64748B'}
                        />
                        <TextInput
                            style={[styles.textInputStyle, { color: colors.textPrimary }]}
                            placeholder="Brief description of the issue"
                            placeholderTextColor={colors.textMuted}
                            value={form.subject}
                            onChangeText={(v) => setForm({ ...form, subject: v })}
                            onFocus={() => setIsSubjectFocused(true)}
                            onBlur={() => setIsSubjectFocused(false)}
                        />
                    </View>
                </View>

                {/* Description Input Field with left icon and active focus transitions */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Detailed Description</Text>
                    <View style={[
                        styles.textAreaContainerRow,
                        { backgroundColor: '#F8FAFC', borderColor: isDescFocused ? '#0a2341' : '#E2E8F0' }
                    ]}>
                        <MaterialCommunityIcons
                            name="text-box-outline"
                            size={18}
                            color={isDescFocused ? '#0a2341' : '#64748B'}
                            style={{ marginTop: 2 }}
                        />
                        <TextInput
                            style={[styles.textAreaStyle, { color: colors.textPrimary }]}
                            placeholder="Please provide as much detail as possible..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            textAlignVertical="top"
                            value={form.description}
                            onChangeText={(v) => setForm({ ...form, description: v })}
                            onFocus={() => setIsDescFocused(true)}
                            onBlur={() => setIsDescFocused(false)}
                        />
                    </View>
                </View>

                {/* Submit button styled as a gorgeous orange gradient block */}
                <TouchableOpacity style={styles.submitBtnWrapper} activeOpacity={0.9}>
                    <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={styles.submitBtnGradient}
                    >
                        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />
                        <Text style={styles.submitBtnText}>Create Support Ticket</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const EmailSupport = () => {
    const { colors } = useAppTheme();
    return (
        <View style={styles.tabContent}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Direct Support Lines</Text>
            <Text style={[styles.sectionSubheading, { color: colors.textSecondary }]}>
                Connect with our specialized enterprise teams for rapid resolution.
            </Text>

            <View style={styles.supportLinesList}>
                {SUPPORT_LINES.map((line, i) => (
                    <View
                        key={i}
                        style={[
                            styles.supportLineCard,
                            { backgroundColor: colors.cardBackground, borderColor: '#F1F5F9' }
                        ]}
                    >
                        <View style={styles.supportLineTop}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
                                <MaterialCommunityIcons name={line.icon as any} size={22} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.lineTitle, { color: colors.textPrimary }]}>{line.title}</Text>
                                <Text style={[styles.lineDesc, { color: colors.textSecondary }]}>{line.desc}</Text>
                                <Text style={[styles.lineEmail, { color: '#F97316' }]}>{line.email}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>{line.action}</Text>
                                <MaterialCommunityIcons name="arrow-right" size={12} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default function Support() {
    const { colors } = useAppTheme();
    const [activeTab, setActiveTab] = useState('Submitted Ticket'); // Matches screenshot default

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground="#FFFFFF"
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Page Header */}
                    <View style={styles.header}>
                        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Agency Support Center</Text>
                        <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
                            Get help from our enterprise support team
                        </Text>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                            {TABS.map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    style={[
                                        styles.tab,
                                        { backgroundColor: colors.surfaceSoft },
                                        activeTab === tab && { backgroundColor: '#0D1B2A' }
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        { color: colors.textSecondary },
                                        activeTab === tab && { color: '#FFFFFF', fontWeight: '900' }
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Active Tab Content */}
                    <View style={styles.activeContent}>
                        {activeTab === 'Virtual Assistant' && <VirtualAssistant />}
                        {activeTab === 'Submitted Ticket' && <SubmittedTicket />}
                        {activeTab === 'Email Support' && <EmailSupport />}
                    </View>

                    {/* FAQs Section */}
                    <View style={styles.faqSection}>
                        <Text style={[styles.faqHeading, { color: colors.textPrimary }]}>Quick FAQs</Text>
                        {FAQS.map((faq, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.faqItem,
                                    { backgroundColor: '#FFFFFF', borderColor: '#F1F5F9' }
                                ]}
                            >
                                <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{faq.q}</Text>
                                <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 24,
    },
    header: {
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
    },
    tabsContainer: {
        marginBottom: 24,
        marginLeft: -24,
        marginRight: -24,
    },
    tabsScroll: {
        paddingHorizontal: 24,
        gap: 12,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    activeContent: {
        marginBottom: 40,
    },
    tabContent: {
        gap: 20,
    },
    chatContainer: {
        height: 240,
        borderRadius: 24,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 28,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.03,
                shadowRadius: 12,
            },
            android: {
                elevation: 2,
            }
        })
    },
    emptyChat: {
        alignItems: 'center',
    },
    chatIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    chatDesc: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        paddingLeft: 16,
        paddingRight: 6,
        height: 52,
    },
    chatInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        overflow: 'hidden',
    },
    sendBtnGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    formCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        gap: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 15,
            },
            android: {
                elevation: 3,
            }
        })
    },
    formHeading: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    rowInputs: {
        flexDirection: 'column',
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    pickerBtn: {
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inputContainerRow: {
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    textInputStyle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        height: '100%',
    },
    textAreaContainerRow: {
        height: 120,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    textAreaStyle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        height: '100%',
    },
    submitBtnWrapper: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 10,
    },
    submitBtnGradient: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '900',
    },
    sectionSubheading: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: -12,
        lineHeight: 18,
        marginBottom: 6,
    },
    supportLinesList: {
        gap: 16,
    },
    supportLineCard: {
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.02,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            }
        })
    },
    supportLineTop: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lineTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
    },
    lineDesc: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
        marginBottom: 6,
    },
    lineEmail: {
        fontSize: 12,
        fontWeight: '700',
    },
    actionBtn: {
        height: 40,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '800',
    },
    faqSection: {
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    faqHeading: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 20,
    },
    faqItem: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    faqQ: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 8,
    },
    faqA: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: -10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            }
        })
    },
    modalGrabHandle: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0F172A',
    },
    modalCloseCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
});
