import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { createSupportTicket } from '@/services/dashboardService';
import {
    useConversations,
    useLoadConversation,
    useCreateConversation,
    useSendMessage,
    useDeleteConversation,
} from '@/hooks/useChat';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const CustomPicker = ({ label, value, options, onSelect, icon, required = false }: any) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={[styles.pickerBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder }]}
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
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
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

const formatChatMessageTime = (dateInput?: Date | string | null) => {
    try {
        if (!dateInput) return undefined;
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : undefined;

        const pad = (num: number) => num.toString().padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());

        return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
        return undefined;
    }
};

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp?: string;
}

const VirtualAssistant = () => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [isChatFocused, setIsChatFocused] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    // Queries & mutations
    const createConversationMutation = useCreateConversation();
    const sendMessageMutation = useSendMessage();
    const loadConversationMutation = useLoadConversation();
    const deleteConversationMutation = useDeleteConversation();
    const { data: conversations = [], isLoading: isLoadingHistory, refetch: refetchConversations } = useConversations();

    const chatScrollRef = useRef<ScrollView>(null);

    // Auto-load latest conversation if available and no active chat is selected yet
    useEffect(() => {
        if (conversations && conversations.length > 0 && !activeConversationId && messages.length === 0) {
            loadConversationMessages(conversations[0].id);
        }
    }, [conversations]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText.trim();
        setInputText('');

        const timeNow = formatChatMessageTime(new Date());

        // 1. Add user message locally
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            text,
            isUser: true,
            timestamp: timeNow,
        };
        setMessages(prev => [...prev, userMsg]);
        setIsAiTyping(true);

        try {
            let convId = activeConversationId;
            // 2. If no active conversation, create one
            if (!convId) {
                const title = text.length > 25 ? text.substring(0, 25) + '...' : text;
                const newConv = await createConversationMutation.mutateAsync({ title });
                convId = newConv.id;
                setActiveConversationId(convId);
                refetchConversations();
            }

            // 3. Send message
            const res = await sendMessageMutation.mutateAsync({ conversationId: convId, content: text });
            
            // 4. Add AI message
            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                text: res.aiMessage.content,
                isUser: false,
                timestamp: formatChatMessageTime(new Date()),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            const errMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                text: error?.message || 'Failed to send message. Please try again.',
                isUser: false,
                timestamp: formatChatMessageTime(new Date()),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const loadConversationMessages = async (conversationId: number) => {
        try {
            setMessages([]);
            setIsAiTyping(true);
            setIsHistoryVisible(false);
            const conv = await loadConversationMutation.mutateAsync({ conversationId });
            setActiveConversationId(conv.id);
            const loadedMessages: ChatMessage[] = conv.messages.map((msg, idx) => ({
                id: `loaded-${conv.id}-${idx}`,
                text: msg.content,
                isUser: msg.role === 'user',
                timestamp: formatChatMessageTime(msg.created_at)
            }));
            setMessages(loadedMessages);
            setIsAiTyping(false);
        } catch (error: any) {
            setIsAiTyping(false);
            const errMsg: ChatMessage = {
                id: `err-load-${Date.now()}`,
                text: error?.message || 'Failed to load conversation.',
                isUser: false,
            };
            setMessages([errMsg]);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setActiveConversationId(null);
        setIsHistoryVisible(false);
    };

    const handleDelete = (convId: number) => {
        Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteConversationMutation.mutateAsync({ conversationId: convId });
                            if (activeConversationId === convId) {
                                handleNewChat();
                            }
                            refetchConversations();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete conversation.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.tabContent}>
            {/* Header with History Button */}
            <View style={styles.chatCardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.chatCardTitle, { color: colors.textPrimary }]}>Zien Intelligence Support</Text>
                    <Text style={[styles.chatCardSubtitle, { color: colors.textSecondary }]}>Our AI assistant is trained on Zien docs and can resolve queries instantly.</Text>
                </View>
                <TouchableOpacity
                    style={[styles.historyBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceSoft }]}
                    activeOpacity={0.8}
                    onPress={() => {
                        refetchConversations();
                        setIsHistoryVisible(true);
                    }}
                >
                    <MaterialCommunityIcons name="message-text-outline" size={16} color={colors.textPrimary} />
                    <Text style={styles.historyBtnText}>History</Text>
                </TouchableOpacity>
            </View>

            {/* Chat Container */}
            <View style={[styles.chatContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder, height: 420, justifyContent: 'flex-start', alignItems: 'stretch', padding: 0, overflow: 'hidden' }]}>
                {messages.length === 0 && !isAiTyping ? (
                    <View style={[styles.emptyChat, { flex: 1, justifyContent: 'center' }]}>
                        <View style={[styles.chatIconWrap, { backgroundColor: '#F0FDFA' }]}>
                            <MaterialCommunityIcons name="robot-outline" size={32} color={colors.accentTeal} />
                        </View>
                        <Text style={[styles.chatTitle, { color: colors.textPrimary }]}>How can I help you today?</Text>
                        <Text style={[styles.chatDesc, { color: colors.textSecondary, paddingHorizontal: 28 }]}>
                            Our AI assistant is trained on all Zien documentation and can resolve 85% of queries instantly.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        ref={chatScrollRef}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        {messages.map((msg) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.msgRow,
                                    msg.isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
                                ]}
                            >
                                <View
                                    style={[
                                        styles.msgBubble,
                                        msg.isUser
                                            ? { backgroundColor: '#14532D', borderBottomRightRadius: 4, borderRadius: 14 }
                                            : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4, borderRadius: 14 }
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.msgText,
                                            msg.isUser ? { color: '#FFFFFF' } : { color: colors.textPrimary }
                                        ]}
                                    >
                                        {msg.text}
                                    </Text>
                                    {msg.timestamp && (
                                        <Text
                                            style={{
                                                fontSize: 10,
                                                color: msg.isUser ? 'rgba(255, 255, 255, 0.7)' : '#94A3B8',
                                                marginTop: 4,
                                                alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {msg.timestamp}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                        {isAiTyping && (
                            <View style={styles.msgRow}>
                                <View style={[styles.msgBubble, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16 }]}>
                                    <ActivityIndicator size="small" color={colors.accentTeal} />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Input Row */}
            <View style={[
                styles.chatInputRow,
                { backgroundColor: colors.surfaceSoft, borderColor: isChatFocused ? colors.accentTeal : '#E2E8F0' }
            ]}>
                <TextInput
                    placeholder="Type your message..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.chatInput, { color: colors.textPrimary }]}
                    onFocus={() => setIsChatFocused(true)}
                    onBlur={() => setIsChatFocused(false)}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85} onPress={handleSend}>
                    <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={styles.sendBtnGradient}
                    >
                        <MaterialCommunityIcons name="send" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Chat History Sidebar Modal */}
            <Modal
                visible={isHistoryVisible}
                transparent
                animationType="none"
                onRequestClose={() => setIsHistoryVisible(false)}
            >
                <View style={styles.historyOverlay}>
                    {/* Backdrop */}
                    <Pressable style={styles.historyBackdrop} onPress={() => setIsHistoryVisible(false)} />
                    
                    {/* Drawer Content */}
                    <View style={[styles.historyDrawer, { backgroundColor: colors.cardBackground }]}>
                        {/* Header */}
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>Chat History</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity 
                                    style={styles.newChatHeaderBtn} 
                                    onPress={handleNewChat}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="plus" size={14} color={colors.accentTeal} />
                                    <Text style={[styles.newChatHeaderText, { color: colors.accentTeal }]}>New Chat</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.closeHeaderBtn} 
                                    onPress={() => setIsHistoryVisible(false)}
                                >
                                    <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.historyDivider} />

                        {/* List */}
                        {isLoadingHistory ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.accentTeal} />
                            </View>
                        ) : conversations.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>No history found</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
                                {conversations.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.historyItemCard,
                                            activeConversationId === item.id && { backgroundColor: colors.surfaceSoft }
                                        ]}
                                        onPress={() => loadConversationMessages(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons name="forum-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={styles.historyItemTitle}>{item.title}</Text>
                                            <Text style={styles.historyItemTime}>
                                                {formatChatMessageTime(item.updated_at) || new Date(item.updated_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => handleDelete(item.id)}
                                            hitSlop={8}
                                            style={{ padding: 4 }}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const SubmittedTicket = () => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const [form, setForm] = useState({
        category: 'Billing Inquiry',
        priority: 'Medium - Need Assistance',
        subject: '',
        description: ''
    });

    const [isSubjectFocused, setIsSubjectFocused] = useState(false);
    const [isDescFocused, setIsDescFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!form.category) {
            Alert.alert('Validation Error', 'Please select an issue category.');
            return;
        }
        if (!form.priority) {
            Alert.alert('Validation Error', 'Please select a priority level.');
            return;
        }
        if (!form.subject.trim()) {
            Alert.alert('Validation Error', 'Please enter a subject.');
            return;
        }
        if (!form.description.trim()) {
            Alert.alert('Validation Error', 'Please enter a detailed description.');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await createSupportTicket(accessToken!, {
                category: form.category,
                priority: form.priority,
                subject: form.subject.trim(),
                description: form.description.trim()
            });

            Alert.alert('Success', res.message || 'Support ticket submitted successfully!');
            setForm({
                category: 'Billing Inquiry',
                priority: 'Medium - Need Assistance',
                subject: '',
                description: ''
            });
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to submit support ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.tabContent}>
            <View style={[styles.formCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <Text style={[styles.formHeading, { color: colors.textPrimary }]}>Submit a Support Ticket</Text>

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                        <CustomPicker
                            label="Issue Category"
                            required
                            value={form.category}
                            options={['Technical Issue', 'Billing Inquiry', 'Agent Seat Management', 'Account Security', 'Feature Request']}
                            onSelect={(v: string) => setForm({ ...form, category: v })}
                            icon="tag-outline"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <CustomPicker
                            label="Priority Level"
                            required
                            value={form.priority}
                            options={['Low - General Inquiry', 'Medium - Need Assistance', 'Medium – Minor Bug', 'High - Critical Bug', 'Urgent - System Outage']}
                            onSelect={(v: string) => setForm({ ...form, priority: v })}
                            icon="alert-circle-outline"
                        />
                    </View>
                </View>

                {/* Subject Input Field */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Subject<Text style={{ color: '#EF4444' }}> *</Text>
                    </Text>
                    <View style={[
                        styles.inputContainerRow,
                        { backgroundColor: colors.surfaceSoft, borderColor: isSubjectFocused ? colors.accentTeal : '#E2E8F0' }
                    ]}>
                        <MaterialCommunityIcons
                            name="pencil-outline"
                            size={18}
                            color={isSubjectFocused ? colors.accentTeal : '#64748B'}
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

                {/* Description Input Field */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Detailed Description<Text style={{ color: '#EF4444' }}> *</Text>
                    </Text>
                    <View style={[
                        styles.textAreaContainerRow,
                        { backgroundColor: colors.surfaceSoft, borderColor: isDescFocused ? colors.accentTeal : '#E2E8F0' }
                    ]}>
                        <MaterialCommunityIcons
                            name="text-box-outline"
                            size={18}
                            color={isDescFocused ? colors.accentTeal : '#64748B'}
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

                {/* Submit button */}
                <TouchableOpacity
                    style={[styles.submitBtnWrapper, isSubmitting && { opacity: 0.7 }]}
                    activeOpacity={0.9}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={styles.submitBtnGradient}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />
                                <Text style={styles.submitBtnText}>Create Support Ticket</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const EmailSupport = () => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const handleOpenMail = async (email: string) => {
        const mailUrl = `mailto:${email}`;
        const webMailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;

        try {
            const canOpenMailto = await Linking.canOpenURL(mailUrl);
            if (canOpenMailto) {
                await Linking.openURL(mailUrl);
            } else {
                await Linking.openURL(webMailUrl);
            }
        } catch {
            try {
                await Linking.openURL(webMailUrl);
            } catch {
                Alert.alert(
                    'Contact Support',
                    `Support Email: ${email}`,
                    [
                        {
                            text: 'Copy Email',
                            onPress: async () => {
                                await Clipboard.setStringAsync(email);
                                Alert.alert('Copied', `${email} copied to clipboard!`);
                            }
                        },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
            }
        }
    };

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
                            { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }
                        ]}
                    >
                        <View style={styles.supportLineTop}>
                            <View style={[styles.iconBox, { backgroundColor: colors.surfaceSoft }]}>
                                <MaterialCommunityIcons name={line.icon as any} size={22} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.lineTitle, { color: colors.textPrimary }]}>{line.title}</Text>
                                <Text style={[styles.lineDesc, { color: colors.textSecondary }]}>{line.desc}</Text>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenMail(line.email)}>
                                    <Text style={[styles.lineEmail, { color: '#F97316' }]}>{line.email}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceSoft }]}
                            activeOpacity={0.8}
                            onPress={() => handleOpenMail(line.email)}
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
    const styles = getStyles(colors);
    const [activeTab, setActiveTab] = useState('Virtual Assistant');

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground={colors.cardBackground}
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
                                        activeTab === tab && { backgroundColor: colors.accentTeal }
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        { color: colors.textSecondary },
                                        activeTab === tab && { color: colors.gradientButtonText || '#FFFFFF', fontWeight: '900' }
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
                                    { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }
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

const getStyles = (colors: any) => StyleSheet.create({
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
                shadowColor: colors.cardShadowColor,
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
                shadowColor: colors.cardShadowColor,
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
                shadowColor: colors.cardShadowColor,
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
        borderTopColor: colors.divider,
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
                shadowColor: colors.cardShadowColor,
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
        color: colors.textPrimary,
    },
    modalCloseCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    // Chat & History Styles
    chatCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    chatCardTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    chatCardSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    historyBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    msgRow: {
        flexDirection: 'row',
        width: '100%',
        marginVertical: 4,
    },
    msgBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        maxWidth: '80%',
    },
    msgText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    historyOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    historyBackdrop: {
        flex: 0.15,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    historyDrawer: {
        flex: 0.85,
        height: '100%',
        paddingVertical: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
        marginTop: Platform.OS === 'ios' ? 40 : 10,
    },
    historyTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    newChatHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    newChatHeaderText: {
        fontSize: 11,
        fontWeight: '800',
    },
    closeHeaderBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyDivider: {
        height: 1,
        backgroundColor: colors.surfaceSoft,
        marginBottom: 8,
    },
    historyItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    historyItemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    historyItemTime: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
        fontWeight: '600',
    },
});
