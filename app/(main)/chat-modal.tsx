import { useAppTheme } from '@/context/ThemeContext';
import { useConversations, useCreateConversation, useDeleteConversation, useLoadConversation, useSendMessage } from '@/hooks/useChat';
import type { Conversation } from '@/services/chatService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

type ChatMessage = {
    id: string;
    text: string;
    isUser: boolean;
    isTyping?: boolean;
};

// ──────────────────────────────────────────────────────
// Typewriter effect for AI responses
// ──────────────────────────────────────────────────────
const TypewriterText = memo(({
    fullText,
    onComplete,
    onType,
}: {
    fullText: string;
    onComplete: () => void;
    onType: () => void;
}) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= fullText.length) {
                setDisplayedText(fullText.slice(0, currentIndex));
                currentIndex++;
                if (currentIndex % 3 === 0) {
                    onType();
                }
            } else {
                clearInterval(interval);
                onComplete();
            }
        }, 20);
        return () => clearInterval(interval);
    }, [fullText, onComplete, onType]);

    return <Text style={styles.aiMessageText}>{displayedText}</Text>;
});

// ──────────────────────────────────────────────────────
// Suggestion chips shown above text input
// ──────────────────────────────────────────────────────
const SUGGESTIONS = [
    { icon: 'map-marker-outline', label: 'Find listings near me' },
    { icon: 'account-group-outline', label: 'Summarize my leads' },
    { icon: 'home-search-outline', label: 'Listings in Houston' },
    { icon: 'home-outline', label: 'Open houses this weekend' },
    { icon: 'clipboard-list-outline', label: 'Show my activity log' },
    { icon: 'card-account-details-outline', label: 'Zien Card details' },
    { icon: 'shield-check-outline', label: 'Check guardian alerts' },
    { icon: 'bell-outline', label: 'Latest notifications' },
];

// ──────────────────────────────────────────────────────
// Relative time helper
// ──────────────────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w ago`;
    return date.toLocaleDateString();
}

function cleanVoiceTranscript(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();
    // Normalize phonetic variations of brand name "Zien" (e.g. Jean, Zeon, Zein, Jeen -> Zien)
    cleaned = cleaned
        .replace(/\b(jean|zeon|zein|jeen|zian|xian|zean|zion)\s*ai\b/gi, 'Zien AI')
        .replace(/\b(jean|zeon|zein|jeen|zian|xian|zean|zion)\s*intelligence\b/gi, 'Zien Intelligence')
        .replace(/\bwhat\s+is\s+(jean|zeon|zein|jeen|zian|xian|zean|zion)\b/gi, 'what is Zien')
        .replace(/\bwho\s+is\s+(jean|zeon|zein|jeen|zian|xian|zean|zion)\b/gi, 'who is Zien')
        .replace(/\btell\s+me\s+about\s+(jean|zeon|zein|jeen|zian|xian|zean|zion)\b/gi, 'tell me about Zien')
        .replace(/\babout\s+(jean|zeon|zein|jeen|zian|xian|zean|zion)\b/gi, 'about Zien')
        .replace(/\b(jean|zeon|zein|jeen|zian|xian|zean)\b/gi, 'Zien');
    return cleaned;
}

// ──────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────
export default function ChatModalScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();

    const [inputText, setInputText] = useState('');
    const [speechLang, setSpeechLang] = useState<'en-US' | 'hi-IN'>('en-US');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

    // TanStack Query hooks
    const { data: conversations = [], isLoading: isLoadingHistory } = useConversations();
    const createConversationMutation = useCreateConversation();
    const sendMessageMutation = useSendMessage();
    const deleteConversationMutation = useDeleteConversation();
    const loadConversationMutation = useLoadConversation();

    // Load an existing conversation's messages from the API
    const loadConversationMessages = useCallback(async (conversationId: number) => {
        try {
            setMessages([]);
            setIsAiTyping(true);
            const conv = await loadConversationMutation.mutateAsync({ conversationId });
            setActiveConversationId(conv.id);
            const loadedMessages: ChatMessage[] = conv.messages.map((msg, idx) => ({
                id: `loaded-${conv.id}-${idx}`,
                text: msg.content,
                isUser: msg.role === 'user',
                isTyping: false,
            }));
            setMessages(loadedMessages);
            setIsAiTyping(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        } catch (error: any) {
            setIsAiTyping(false);
            const errMsg: ChatMessage = {
                id: `err-load-${Date.now()}`,
                text: error?.message || 'Failed to load conversation.',
                isUser: false,
                isTyping: false,
            };
            setMessages([errMsg]);
        }
    }, [loadConversationMutation]);

    const [isAiTyping, setIsAiTyping] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isRecordingMode, setIsRecordingMode] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const isRecordingRef = useRef(false);
    useEffect(() => {
        isRecordingRef.current = isRecordingMode;
    }, [isRecordingMode]);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const flatListRef = useRef<FlatList>(null);
    const inset = useSafeAreaInsets();

    // Pulse animation for recording dot
    const startPulse = useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    const stopPulse = useCallback(() => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    }, [pulseAnim]);

    const latestTranscriptRef = useRef('');
    const hasSubmittedVoiceRef = useRef(false);

    // Speech Recognition hooks
    useSpeechRecognitionEvent('start', () => {
        setIsListening(true);
        startPulse();
    });

    useSpeechRecognitionEvent('speechstart', () => {
        setIsListening(true);
        startPulse();
    });

    useSpeechRecognitionEvent('speechend', () => {
        stopPulse();
    });

    useSpeechRecognitionEvent('end', () => {
        setIsListening(false);
        stopPulse();
        // If recognition ended and transcript exists but wasn't auto-submitted yet, leave in place for user or auto-send
        if (latestTranscriptRef.current.trim() && !hasSubmittedVoiceRef.current) {
            setVoiceText(latestTranscriptRef.current.trim());
        }
    });

    useSpeechRecognitionEvent('result', (event) => {
        const primary = event.results?.[0]?.transcript || '';
        const transcript = cleanVoiceTranscript(primary);

        if (transcript) {
            setVoiceText(transcript);
            latestTranscriptRef.current = transcript;
        }

        // When speech returns final result, auto submit after short pause
        if (event.isFinal && transcript && !hasSubmittedVoiceRef.current) {
            hasSubmittedVoiceRef.current = true;
            setTimeout(() => {
                const textToSend = latestTranscriptRef.current.trim();
                if (textToSend) {
                    cancelVoice();
                    handleSubmit(textToSend);
                }
            }, 500);
        }
    });

    useSpeechRecognitionEvent('error', (event) => {
        console.log('Speech recognition event error:', event.error, event.message);
        setIsListening(false);
        stopPulse();

        // Silent benign errors (aborted, no-speech, busy)
        if (event.error === 'aborted' || event.error === 'no-speech') {
            return;
        }

        let friendlyMessage = event.message;
        if (event.error === 'service-not-allowed') {
            friendlyMessage = 'Speech recognition service is not available on this device. Please check Siri/Dictation settings in iOS Settings.';
        } else if (event.error === 'network') {
            friendlyMessage = 'Network error during speech recognition. Please check your internet connection.';
        } else if (event.error === 'not-allowed') {
            friendlyMessage = 'Microphone and Speech Recognition permissions are required. Please enable them in iPhone Settings > Zien.';
        }

        Alert.alert('Voice Recognition', friendlyMessage || `Speech error: ${event.error}`);
        setIsRecordingMode(false);
    });

    const startVoice = useCallback(async () => {
        setVoiceText('');
        latestTranscriptRef.current = '';
        hasSubmittedVoiceRef.current = false;
        setIsRecordingMode(true);

        const isAvailable = typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function'
            ? ExpoSpeechRecognitionModule.isRecognitionAvailable()
            : true;

        if (!isAvailable) {
            Alert.alert(
                'Speech Recognition Unavailable',
                'Speech recognition is not available. Please verify Siri and Dictation are enabled in device settings.'
            );
            setIsRecordingMode(false);
            return;
        }

        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            Alert.alert('Permission Required', 'Microphone and speech recognition permissions are required to use voice search.');
            setIsRecordingMode(false);
            return;
        }

        try {
            ExpoSpeechRecognitionModule.start({
                lang: speechLang,
                interimResults: true,
                continuous: true,
                addsPunctuation: true,
                iosTaskHint: 'search',
                contextualStrings: ['Zien', 'Zien AI', 'Zien Intelligence', 'CRM', 'listing', 'leads', 'properties', 'agents'],
                androidIntentOptions: {
                    EXTRA_LANGUAGE_MODEL: "free_form",
                    EXTRA_BIASING_STRINGS: ['Zien', 'Zien AI', 'Zien Intelligence'],
                } as any,
            });
        } catch (e: any) {
            console.warn('Failed to start speech recognition:', e);
            setIsRecordingMode(false);
        }
    }, [speechLang]);

    const cancelVoice = useCallback(() => {
        try {
            ExpoSpeechRecognitionModule.abort();
        } catch {}
        stopPulse();
        setIsListening(false);
        setIsRecordingMode(false);
        setVoiceText('');
        latestTranscriptRef.current = '';
    }, [stopPulse]);

    const sendVoice = useCallback(() => {
        const text = (voiceText || latestTranscriptRef.current).trim();
        hasSubmittedVoiceRef.current = true;
        cancelVoice();
        if (text) handleSubmit(text);
    }, [voiceText, cancelVoice, handleSubmit]);



    const handleSubmit = useCallback(async (overrideText?: string) => {
        const text = (overrideText ?? inputText).trim();
        if (!text || isAiTyping) return;

        const timestamp = Date.now().toString();
        const userMsg: ChatMessage = { id: `u-${timestamp}`, text, isUser: true };

        // Show user message immediately (optimistic)
        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsAiTyping(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Create conversation if none exists
            let convId = activeConversationId;
            if (!convId) {
                const newConv = await createConversationMutation.mutateAsync({ title: text });
                convId = newConv.id;
                setActiveConversationId(convId);
            }

            // Send message & get AI response
            const response = await sendMessageMutation.mutateAsync({
                conversationId: convId,
                content: speechLang === 'hi-IN' ? `${text} (Please respond in Hindi)` : text,
            });

            const aiMsg: ChatMessage = {
                id: `ai-${timestamp}`,
                text: response.aiMessage.content,
                isUser: false,
                isTyping: true,
            };
            setMessages((prev) => [...prev, aiMsg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error: any) {
            // Show error as AI message
            const errMsg: ChatMessage = {
                id: `err-${timestamp}`,
                text: error?.message || 'Something went wrong. Please try again.',
                isUser: false,
                isTyping: false,
            };
            setMessages((prev) => [...prev, errMsg]);
            setIsAiTyping(false);
        }
    }, [inputText, isAiTyping, activeConversationId, createConversationMutation, sendMessageMutation, speechLang]);

    const params = useLocalSearchParams<{ initialMessage?: string; startVoice?: string; conversationId?: string }>();
    const initialMessageProcessed = useRef(false);

    // ── Handle initial message from params ────────────────
    useEffect(() => {
        if (params.conversationId && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            setTimeout(() => {
                loadConversationMessages(Number(params.conversationId));
            }, 300);
        } else if (params.initialMessage && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            setTimeout(() => {
                handleSubmit(params.initialMessage);
            }, 300);
        } else if (params.startVoice === 'true' && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            setTimeout(() => {
                startVoice();
            }, 300);
        }
    }, [params.initialMessage, params.startVoice, params.conversationId, handleSubmit, startVoice, loadConversationMessages]);

    const handleClear = useCallback(() => {
        setMessages([]);
        setIsAiTyping(false);
        setActiveConversationId(null);
        initialMessageProcessed.current = false;
    }, []);

    // ── Message renderer ───────────────────────────────
    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        if (item.isUser) {
            return (
                <View style={styles.userRow}>
                    <LinearGradient
                        colors={['#0D2F45', '#0B2D3E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userBubble}
                    >
                        <Text style={styles.userMessageText}>{item.text}</Text>
                    </LinearGradient>
                </View>
            );
        }

        return (
            <View style={styles.aiRow}>
                {/* AI avatar */}
                <LinearGradient
                    colors={['#0a2341', '#1B5E9A']}
                    style={styles.aiAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="star-four-points" size={13} color="#fff" />
                </LinearGradient>

                <View style={styles.aiBubble}>
                    {/* AI label */}
                    <Text style={styles.aiLabel}>Zien Intelligence</Text>
                    {item.isTyping ? (
                        <TypewriterText
                            fullText={item.text}
                            onComplete={() => {
                                setIsAiTyping(false);
                                setMessages(prev =>
                                    prev.map(m => m.id === item.id ? { ...m, isTyping: false } : m)
                                );
                            }}
                            onType={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        />
                    ) : (
                        <Text style={styles.aiMessageText}>{item.text}</Text>
                    )}
                </View>
            </View>
        );
    };

    const hasMessages = messages.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            {/* Extra top breathing room */}
            <View style={{ height: 10 }} />

            {/* ── Header ── */}
            <View style={styles.header}>
                {/* LEFT: AI badge + title/subtitle only */}
                <View style={styles.headerLeft}>
                    <LinearGradient
                        colors={['#0a2341', '#1B5E9A']}
                        style={styles.headerAiDot}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MaterialCommunityIcons name="star-four-points" size={14} color="#fff" />
                    </LinearGradient>
                    <View>
                        <Text style={styles.headerTitle}>Zien Intelligence</Text>
                        <Text style={styles.headerSub}>
                            {isAiTyping ? 'Thinking…' : 'Online · Ready'}
                        </Text>
                    </View>
                </View>

                {/* RIGHT: Clear icon (when messages) + History + Close */}
                <View style={styles.headerRight}>
                    {hasMessages && (
                        <Pressable
                            onPress={handleClear}
                            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
                            hitSlop={8}
                        >
                            <MaterialCommunityIcons name="refresh" size={16} color={colors.textSecondary} />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => setSpeechLang((prev) => (prev === 'en-US' ? 'hi-IN' : 'en-US'))}
                        style={({ pressed }) => [
                            styles.langSelectorBtn,
                            speechLang === 'hi-IN' && styles.langSelectorBtnActive,
                            pressed && { opacity: 0.7 }
                        ]}
                        hitSlop={8}
                    >
                        <Text style={[
                            styles.langSelectorText,
                            speechLang === 'hi-IN' && styles.langSelectorTextActive,
                        ]}>
                            {speechLang === 'en-US' ? 'EN' : 'HI'}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setShowHistoryModal(true)}
                        style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons name="history" size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                    >
                        <MaterialCommunityIcons name="close" size={18} color={colors.textPrimary} />
                    </Pressable>
                </View>
            </View>

            {/* Thin header divider */}
            <View style={styles.headerDivider} />

            {/* ── Body ── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <View style={styles.body}>

                    {/* Empty state */}
                    {!hasMessages ? (
                        <Pressable style={[styles.emptyState, { flex: 1 }]} onPress={() => Keyboard.dismiss()}>
                            <Text style={styles.emptyTitle}>Ask Zien AI</Text>
                            <Text style={styles.emptySubtitle}>
                                Ask questions about your property listings, CRM leads, notifications, or safety logs.
                            </Text>
                        </Pressable>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.chatList}
                            showsVerticalScrollIndicator={false}
                            keyboardDismissMode="on-drag"
                            keyboardShouldPersistTaps="handled"
                        />
                    )}

                    {/* Suggestions Row above text input */}
                    {!hasMessages && (
                        <View style={styles.suggestionsContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionsScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                {SUGGESTIONS.map((s) => (
                                    <Pressable
                                        key={s.label}
                                        style={({ pressed }) => [
                                            styles.suggestionChip,
                                            pressed && { opacity: 0.7 }
                                        ]}
                                        onPress={() => handleSubmit(s.label)}
                                    >
                                        <MaterialCommunityIcons name={s.icon as any} size={14} color={colors.accentTeal} />
                                        <Text style={styles.suggestionText}>{s.label}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* ── Input Bar ── */}
                    {isRecordingMode ? (
                        <View style={styles.recordingWrapper}>
                            <Pressable
                                onPress={cancelVoice}
                                style={({ pressed }) => [styles.recordingActionBtn, pressed && { opacity: 0.7 }]}
                            >
                                <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    if (!isListening) {
                                        startVoice();
                                    }
                                }}
                                style={[styles.recordingBubble, isListening && { borderColor: '#FF4B4B60' }]}
                            >
                                <View style={styles.recordingStatus}>
                                    <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                                    <Text style={styles.recordingLabel}>
                                        {isListening ? 'Listening...' : voiceText ? 'Done' : 'Tap to speak'}
                                    </Text>
                                </View>
                                <Text
                                    style={[styles.recordingTranscript, { color: voiceText ? colors.textPrimary : colors.textSecondary + '80' }]}
                                    numberOfLines={2}
                                >
                                    {voiceText || (speechLang === 'hi-IN' ? 'Bolna shuru karein (Hindi)...' : 'Start speaking (English)...')}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={sendVoice}
                                style={({ pressed }) => [{ opacity: !voiceText.trim() ? 0.35 : pressed ? 0.8 : 1 }]}
                                disabled={!voiceText.trim()}
                            >
                                <LinearGradient
                                    colors={['#0a2341', '#1B5E9A']}
                                    style={styles.sendBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <MaterialCommunityIcons name="arrow-up" size={18} color="#fff" />
                                </LinearGradient>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={[
                            styles.inputBar,
                            inputFocused && styles.inputBarFocused,
                        ]}>
                            <TextInput
                                placeholder={isAiTyping ? 'Zien is thinking…' : speechLang === 'hi-IN' ? 'Ask Zien in Hindi...' : 'Ask Zien to find properties'}
                                placeholderTextColor={colors.inputPlaceholder}
                                style={styles.input}
                                value={isAiTyping ? '' : inputText}
                                onChangeText={(t) => { if (!isAiTyping) setInputText(t); }}
                                multiline={false}
                                returnKeyType="send"
                                onSubmitEditing={() => handleSubmit()}
                                editable={!isAiTyping}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                            />

                            {/* Right actions: mic or send */}
                            {inputText.trim().length > 0 && !isAiTyping ? (
                                <Pressable
                                    onPress={() => handleSubmit()}
                                    style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}
                                    hitSlop={8}
                                >
                                    <LinearGradient
                                        colors={['#0a2341', '#1B5E9A']}
                                        style={styles.sendBtnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialCommunityIcons name="arrow-up" size={18} color="#fff" />
                                    </LinearGradient>
                                </Pressable>
                            ) : !isAiTyping ? (
                                <Pressable
                                    onPress={startVoice}
                                    style={({ pressed }) => [styles.micBtn, pressed && { opacity: 0.8 }]}
                                    hitSlop={8}
                                >
                                    <MaterialCommunityIcons name="microphone-outline" size={20} color={colors.textSecondary} />
                                </Pressable>
                            ) : null}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
            {/* ── History Drawer Modal ── */}
            <Modal visible={showHistoryModal} transparent animationType="fade">
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior="padding"
                >
                    <View style={[styles.historyOverlay, { paddingTop: inset.top }]} >
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowHistoryModal(false)} />
                        <Animated.View style={styles.historyPanel}>
                            <SafeAreaView edges={['top', 'bottom']} style={styles.historySafeArea}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyHeaderTitle}>Chat History</Text>
                                    <Pressable
                                        onPress={() => setShowHistoryModal(false)}
                                        style={({ pressed }) => [styles.closeHistoryBtn, pressed && { opacity: 0.7 }]}
                                    >
                                        <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
                                    </Pressable>
                                </View>

                                <View style={styles.historySearchRow}>
                                    <View style={styles.historySearchBar}>
                                        <MaterialCommunityIcons name="magnify" size={16} color="#94A3B8" />
                                        <TextInput
                                            placeholder="Search your chats..."
                                            placeholderTextColor="#94A3B8"
                                            style={styles.historySearchInput}
                                            value={historySearch}
                                            onChangeText={setHistorySearch}
                                        />
                                        {historySearch.length > 0 && (
                                            <Pressable onPress={() => setHistorySearch('')}>
                                                <MaterialCommunityIcons name="close-circle" size={16} color="#94A3B8" />
                                            </Pressable>
                                        )}
                                    </View>
                                    <Pressable
                                        style={({ pressed }) => [styles.historyNewBtn, pressed && { opacity: 0.8 }]}
                                        onPress={() => {
                                            setShowHistoryModal(false);
                                            handleClear();
                                        }}
                                    >
                                        <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
                                        <Text style={styles.historyNewBtnText}>New</Text>
                                    </Pressable>
                                </View>

                                <FlatList
                                    data={conversations.filter((item: Conversation) =>
                                        item.title.toLowerCase().includes(historySearch.toLowerCase())
                                    ).slice(0, 20)}
                                    ListEmptyComponent={
                                        isLoadingHistory ? (
                                            <View style={styles.historyEmptyState}>
                                                <Text style={styles.historyEmptyText}>Loading conversations...</Text>
                                            </View>
                                        ) : historySearch.length > 0 ? (
                                            <View style={styles.historyEmptyState}>
                                                <MaterialCommunityIcons name="chat-remove-outline" size={40} color={colors.textMuted || "#94A3B8"} />
                                                <Text style={styles.historyEmptyText}>No matching chats found for "{historySearch}"</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.historyEmptyState}>
                                                <MaterialCommunityIcons name="chat-outline" size={40} color={colors.textMuted || "#94A3B8"} />
                                                <Text style={styles.historyEmptyText}>No conversations yet. Start a new chat!</Text>
                                            </View>
                                        )
                                    }
                                    keyExtractor={(item: Conversation) => item.id.toString()}
                                    contentContainerStyle={styles.historyList}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }: { item: Conversation }) => (
                                        <Pressable
                                            style={({ pressed }) => [styles.historyCard, pressed && styles.historyCardPressed]}
                                            onPress={() => {
                                                setShowHistoryModal(false);
                                                loadConversationMessages(item.id);
                                            }}
                                        >
                                            <View style={styles.historyIconBox}>
                                                <MaterialCommunityIcons name="robot-outline" size={16} color="#5B6B7A" />
                                            </View>
                                            <View style={styles.historyCardContent}>
                                                <Text style={styles.historyCardTitle} numberOfLines={1}>{item.title}</Text>
                                                <Text style={styles.historyCardSubtitle}>{getRelativeTime(item.updated_at)}</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Delete Conversation',
                                                        `Delete "${item.title}"?`,
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            {
                                                                text: 'Delete',
                                                                style: 'destructive',
                                                                onPress: () => {
                                                                    deleteConversationMutation.mutate({ conversationId: item.id });
                                                                    if (activeConversationId === item.id) {
                                                                        handleClear();
                                                                    }
                                                                },
                                                            },
                                                        ]
                                                    );
                                                }}
                                                style={({ pressed }) => [styles.historyDeleteBtn, pressed && { opacity: 0.6 }]}
                                                hitSlop={6}
                                            >
                                                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                                            </Pressable>
                                        </Pressable>
                                    )}
                                />


                            </SafeAreaView>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// ──────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────
function getStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },

        // ── Header ────────────────────────────────────────
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 12,
            zIndex: 999
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        headerAiDot: {
            width: 38,
            height: 38,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0a2341',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
        },
        headerTitle: {
            fontSize: 15.5,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: 0.1,
        },
        headerSub: {
            fontSize: 11.5,
            fontWeight: '600',
            color: colors.accentTeal,
            marginTop: 1,
        },
        headerRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        headerBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        headerIconBtn: {
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        headerBtnText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        langSelectorBtn: {
            width: 38,
            height: 34,
            borderRadius: 11,
            backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
            marginRight: 6,
        },
        langSelectorBtnActive: {
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
        },
        langSelectorText: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.textSecondary || '#475569',
        },
        langSelectorTextActive: {
            color: '#1D4ED8',
        },
        closeBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        headerDivider: {
            height: 1,
            backgroundColor: 'rgba(228,234,242,0.9)',
            marginHorizontal: 18,
        },

        // ── Body ──────────────────────────────────────────
        body: {
            flex: 1,
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === 'ios' ? 16 : 24,
            justifyContent: 'space-between',
        },

        // ── Empty State ───────────────────────────────────
        emptyState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: height * 0.06,
        },
        heroWrap: {
            width: 96,
            height: 96,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        heroGlowOuter: {
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: 'rgba(11,160,178,0.1)',
        },
        heroGlowInner: {
            position: 'absolute',
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(11,160,178,0.15)',
        },
        heroIcon: {
            width: 56,
            height: 56,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0a2341',
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
        },
        emptyTitle: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.2,
            marginBottom: 8,
            textAlign: 'center',
        },
        emptySubtitle: {
            fontSize: 13.5,
            color: colors.textSecondary,
            fontWeight: '500',
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 280,
            marginBottom: 28,
        },
        suggestions: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            maxWidth: 340,
        },
        suggestionsContainer: {
            paddingVertical: 10,
            marginBottom: 4,
        },
        suggestionsScrollContent: {
            paddingHorizontal: 16,
            gap: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        suggestionChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: `${colors.accentTeal}30`,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 1,
        },
        suggestionText: {
            fontSize: 12.5,
            fontWeight: '700',
            color: colors.textPrimary,
        },

        // ── Chat List ────────────────────────────────────
        chatList: {
            paddingVertical: 18,
            gap: 18,
        },

        // User message
        userRow: {
            alignItems: 'flex-end',
        },
        userBubble: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 20,
            borderBottomRightRadius: 6,
            maxWidth: '82%',
            shadowColor: '#0B2D3E',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 4,
        },
        userMessageText: {
            color: '#FFFFFF',
            fontSize: 14.5,
            fontWeight: '500',
            lineHeight: 21,
        },

        // AI message
        aiRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            maxWidth: '92%',
        },
        aiAvatar: {
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            shadowColor: '#0a2341',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
            flexShrink: 0,
        },
        aiBubble: {
            flex: 1,
            backgroundColor: colors.cardBackground,
            borderRadius: 18,
            borderTopLeftRadius: 6,
            paddingHorizontal: 16,
            paddingVertical: 14,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
            borderWidth: 1,
            borderColor: 'rgba(228,234,242,0.9)',
        },
        aiLabel: {
            fontSize: 11.5,
            fontWeight: '800',
            color: colors.accentTeal,
            letterSpacing: 0.3,
            marginBottom: 6,
            textTransform: 'uppercase',
        },
        aiMessageText: {
            color: colors.textPrimary,
            fontSize: 14.5,
            lineHeight: 22,
            fontWeight: '400',
        },

        // ── Input Bar ────────────────────────────────────
        inputBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1.5,
            borderColor: colors.cardBorder,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 10,
            minHeight: 56,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 5 },
            elevation: 3,
        },
        inputBarFocused: {
            borderColor: `${colors.accentTeal}60`,
            shadowColor: colors.accentTeal,
            shadowOpacity: 0.1,
            shadowRadius: 16,
        },

        input: {
            flex: 1,
            fontSize: 14.5,
            color: colors.textPrimary,
            paddingVertical: 0,
            minHeight: 24,
            fontWeight: '400',
        },
        micBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSoft,
        },
        micBtnActive: {
            backgroundColor: '#EF4444',
        },
        sendBtn: {
            borderRadius: 12,
            overflow: 'hidden',
        },
        sendBtnGradient: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0a2341',
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
        },

        // ── Recording Mode ───────────────────────────────
        recordingWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        recordingActionBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.surfaceSoft,
        },
        recordingBubble: {
            flex: 1,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.cardBackground,
            paddingHorizontal: 16,
            justifyContent: 'center',
        },
        recordingStatus: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2,
        },
        recordingDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#FF4B4B',
        },
        recordingLabel: {
            fontSize: 10,
            fontWeight: '800',
            color: '#FF4B4B',
            textTransform: 'uppercase',
        },
        recordingTranscript: {
            fontSize: 13,
            fontWeight: '400',
            color: colors.textPrimary,
        },


        // ── History Modal ────────────────────────────────
        historyOverlay: {
            flex: 1,
            backgroundColor: 'rgba(11, 45, 62, 0.45)',
            flexDirection: 'row',
            // justifyContent: 'flex-end',
        },
        historyPanel: {
            width: '100%',
            height: '100%',
            backgroundColor: colors.cardBackground,
            shadowColor: '#0B2D3E',
            shadowOpacity: 0.15,
            shadowRadius: 24,
            shadowOffset: { width: -5, height: 0 },
            elevation: 10,
        },
        historySafeArea: {
            flex: 1,
        },
        historyHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
        },
        historyHeaderTitle: {
            fontSize: 16,
            fontWeight: '900',
            color: colors.textPrimary,
        },
        closeHistoryBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        historySearchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            gap: 10,
        },
        historySearchBar: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 40,
        },
        historySearchInput: {
            flex: 1,
            marginLeft: 8,
            fontSize: 13,
            color: colors.textPrimary,
            paddingVertical: 0,
        },
        historyNewBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0B2D3E',
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 40,
            gap: 6,
        },
        historyNewBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '800',
        },
        historyList: {
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 10,
        },
        historyCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.02,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        historyCardPressed: {
            backgroundColor: colors.surfaceSoft,
            borderColor: colors.accentTeal,
        },
        historyIconBox: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        historyCardContent: {
            flex: 1,
        },
        historyCardTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 3,
        },
        historyCardSubtitle: {
            fontSize: 11,
            fontWeight: '600',
            color: '#94A3B8',
        },
        historyEmptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 60,
            paddingHorizontal: 40,
        },
        historyEmptyText: {
            fontSize: 14,
            color: colors.textMuted || '#64748B',
            textAlign: 'center',
            marginTop: 12,
            fontWeight: '500',
            lineHeight: 20,
        },
        historyFooter: {
            padding: 20,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
        },
        fullHistoryBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        fullHistoryText: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.accentTeal,
        },
        historyDeleteBtn: {
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 6,
        },
    });
}