import { PageHeader } from '@/components/ui/PageHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Clipboard,
    Dimensions,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface EmailType {
    id: string;
    title: string;
    icon: string;
    placeholder: string;
}

const EMAIL_TYPES: EmailType[] = [
    {
        id: 'just_listed',
        title: 'Just Listed',
        icon: 'bell-outline',
        placeholder: 'e.g. New property at 742 Evergreen Terrace. Modern ranch style, 3 bed, 2 bath, close to schools. Highlight the backyard patio...',
    },
    {
        id: 'follow_up',
        title: 'Follow-up',
        icon: 'send-outline',
        placeholder: 'e.g. Follow-up for the Malibu beachfront tour. Mention the sunset patio and the private beach access. Propose a meeting on Friday.',
    },
    {
        id: 'newsletter',
        title: 'Newsletter',
        icon: 'newspaper-variant-outline',
        placeholder: 'e.g. Monthly real estate market update for Orange County. Mention current interest rates and new listings in Irvine.',
    },
    {
        id: 'price_drop',
        title: 'Price Drop',
        icon: 'lightning-bolt-outline',
        placeholder: 'e.g. Massive $50k price reduction on the Downtown Penthouse. Mention motivated seller and ready to move in.',
    },
];

const STYLE_TAGS = ['Spam-Safe', 'Conversion Tuned', 'Luxury Tone', 'Dynamic Tags'];

const MOCK_EMAIL = {
    subject: 'Follow-up: The Malibu Beachfront View You Loved',
    body: `Hi [Client Name],

It was a pleasure showing you the Malibu beachfront property yesterday. I keep thinking about how much you appreciated the panoramic sunset views from the master suite!

As promised, I've attached the detailed floor plans and the private beach access documentation. This property has already seen significant interest since our tour.

Would you be available for a quick 10-minute call on Friday to discuss next steps?

Best regards,
[Your Name]
Zien Realty Group`
};

export default function EmailTemplatesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { prefill, content } = useLocalSearchParams<{ prefill?: string; content?: string }>();

    const [selectedType, setSelectedType] = useState('just_listed');
    const [campaignContext, setCampaignContext] = useState(prefill || '');
    const [selectedStyle, setSelectedStyle] = useState('Spam-Safe');
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputEmail, setOutputEmail] = useState({ 
        subject: content ? content.split('\n')[0].replace(/^Subject:\s*/i, '') : '', 
        body: content ? content.substring(content.indexOf('\n') + 1).trim() : '' 
    });
    const [hasGenerated, setHasGenerated] = useState(!!content);

    useEffect(() => {
        if (prefill) {
            setCampaignContext(prefill);
        }
        if (content) {
            const subject = content.split('\n')[0].replace(/^Subject:\s*/i, '');
            const body = content.substring(content.indexOf('\n') + 1).trim();
            setOutputEmail({ subject, body });
            setHasGenerated(true);
        }
    }, [prefill, content]);

    const handleGenerate = () => {
        if (!campaignContext.trim()) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);
        setOutputEmail({ subject: '', body: '' });

        // Simulate thinking & generating
        setTimeout(() => {
            setIsGenerating(false);
            setHasGenerated(true);

            // Typing animation
            let subjectIndex = 0;
            let bodyIndex = 0;
            const fullSubject = MOCK_EMAIL.subject;
            const fullBody = MOCK_EMAIL.body;

            const timer = setInterval(() => {
                if (subjectIndex < fullSubject.length) {
                    setOutputEmail(prev => ({ ...prev, subject: prev.subject + fullSubject.charAt(subjectIndex) }));
                    subjectIndex++;
                } else if (bodyIndex < fullBody.length) {
                    setOutputEmail(prev => ({ ...prev, body: prev.body + fullBody.charAt(bodyIndex) }));
                    bodyIndex++;
                } else {
                    clearInterval(timer);
                }
            }, 10);
        }, 1500);
    };

    const copyToClipboard = () => {
        Clipboard.setString(`Subject: ${outputEmail.subject}\n\n${outputEmail.body}`);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <PageHeader
                    title="Email Campaign Lab"
                    subtitle="Compose ultra-personalized, high-conversion email sequences using Zien AI."
                    onBack={() => router.back()}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Email Type Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeTabs}
                    >
                        {EMAIL_TYPES.map((type) => (
                            <Pressable
                                key={type.id}
                                style={[
                                    styles.typeTab,
                                    selectedType === type.id && styles.typeTabActive,
                                ]}
                                onPress={() => setSelectedType(type.id)}
                            >
                                <MaterialCommunityIcons
                                    name={type.icon as any}
                                    size={18}
                                    color={selectedType === type.id ? '#FFFFFF' : colors.textPrimary}
                                />
                                <Text style={[
                                    styles.typeTabText,
                                    selectedType === type.id && styles.typeTabTextActive,
                                ]}>
                                    {type.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Campaign Context Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.cardHeading}>Campaign Context</Text>
                        <Text style={styles.cardSubtitle}>
                            Provide specific details about the property, recipient context, or the main call-to-action.
                        </Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            placeholder={EMAIL_TYPES.find(t => t.id === selectedType)?.placeholder}
                            placeholderTextColor="#94A3B8"
                            value={campaignContext}
                            onChangeText={setCampaignContext}
                            textAlignVertical="top"
                        />

                        <View style={styles.inputFooter}>
                            <Pressable
                                style={[styles.generateBtn, !campaignContext.trim() && styles.generateBtnDisabled]}
                                onPress={handleGenerate}
                                disabled={isGenerating || !campaignContext.trim()}
                            >
                                {isGenerating ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.generateBtnText}>Generate</Text>
                                )}
                            </Pressable>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagList}>
                            {STYLE_TAGS.map((tag) => (
                                <Pressable
                                    key={tag}
                                    onPress={() => setSelectedStyle(tag)}
                                    style={[
                                        styles.tagPill,
                                        selectedStyle === tag && styles.tagPillActive,
                                    ]}
                                >
                                    <Text style={[
                                        styles.tagPillText,
                                        selectedStyle === tag && styles.tagPillTextActive,
                                    ]}>
                                        {tag}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Output Card */}
                    <View style={styles.outputCard}>
                        <View style={styles.outputHeader}>
                            <View style={styles.outputStatus}>
                                <View style={styles.statusDot} />
                                <Text style={styles.outputTitle} numberOfLines={1}>AI EMAIL OUTPUT</Text>
                            </View>
                            <View style={styles.outputActions}>
                                <Pressable style={styles.iconAction} onPress={copyToClipboard}>
                                    <MaterialCommunityIcons name="content-copy" size={18} color="#94A3B8" />
                                </Pressable>
                                <Pressable style={styles.exportBtn}>
                                    <MaterialCommunityIcons name="file-document-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.exportBtnText}>EXPORT</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.outputContent}>
                            {isGenerating ? (
                                <View style={styles.loaderState}>
                                    <ActivityIndicator size="large" color="#0BA0B2" />
                                    <Text style={styles.loaderText}>Drafting your high-conversion email...</Text>
                                </View>
                            ) : hasGenerated ? (
                                <View style={styles.emailBodyContainer}>
                                    <View style={styles.subjectRow}>
                                        <Text style={styles.subjectLabel}>Subject:</Text>
                                        <TextInput
                                            style={styles.subjectText}
                                            value={outputEmail.subject}
                                            onChangeText={(t) => setOutputEmail(p => ({ ...p, subject: t }))}
                                        />
                                    </View>
                                    <TextInput
                                        style={styles.emailTextArea}
                                        multiline
                                        value={outputEmail.body}
                                        onChangeText={(t) => setOutputEmail(p => ({ ...p, body: t }))}
                                        textAlignVertical="top"
                                    />
                                </View>
                            ) : (
                                <View style={styles.placeholderState}>
                                    <MaterialCommunityIcons name="lightning-bolt-outline" size={48} color="#1E293B" />
                                    <Text style={styles.placeholderTitle}>Email Studio Active</Text>
                                    <Text style={styles.placeholderSubtitle}>
                                        Enter your campaign brief and click generate to draft a professional email.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20 },

        // Tabs
        typeTabs: {
            paddingVertical: 10,
            gap: 8,
            marginBottom: 20,
        },
        typeTab: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginRight: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        typeTabActive: {
            backgroundColor: '#0BA0B2',
            borderColor: '#0BA0B2',
        },
        typeTabText: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
            marginLeft: 8,
        },
        typeTabTextActive: {
            color: '#FFFFFF',
        },

        // Campaign Context Card
        inputCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 4,
        },
        cardHeading: {
            fontSize: 18,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 8,
        },
        cardSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
            marginBottom: 20,
        },
        textArea: {
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 16,
            padding: 16,
            height: 180,
            fontSize: 15,
            color: colors.textPrimary,
            fontWeight: '600',
            marginBottom: 20,
        },
        inputFooter: {
            flexDirection: 'row',
            marginBottom: 16,
        },
        generateBtn: {
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        generateBtnDisabled: {
            opacity: 0.6,
        },
        generateBtnText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '800',
        },
        tagList: { marginTop: 10 },
        tagPill: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            marginRight: 8,
            justifyContent: 'center',
        },
        tagPillActive: {
            backgroundColor: colors.surfaceMuted,
        },
        tagPillText: {
            fontSize: 11,
            color: colors.textSecondary,
            fontWeight: '700',
        },
        tagPillTextActive: {
            color: colors.textPrimary,
        },

        // Output Card
        outputCard: {
            backgroundColor: colors.cardBackgroundSemi,
            borderRadius: 24,
            padding: 16,
            minHeight: 450,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 30,
            elevation: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        outputHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            paddingBottom: 16,
        },
        outputStatus: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
        },
        statusDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#0BA0B2',
            marginRight: 6,
        },
        outputTitle: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: 0.5,
        },
        outputActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        iconAction: {
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        exportBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0BA0B2',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
            gap: 6,
        },
        exportBtnText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '900',
        },
        outputContent: { flex: 1 },
        loaderState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loaderText: {
            color: colors.textMuted,
            marginTop: 16,
            fontSize: 14,
            textAlign: 'center',
        },
        placeholderState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
        },
        placeholderTitle: {
            fontSize: 16,
            fontWeight: '900',
            color: colors.textSecondary,
            marginTop: 16,
        },
        placeholderSubtitle: {
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
            paddingHorizontal: 40,
            lineHeight: 18,
        },
        emailBodyContainer: {
            flex: 1,
            gap: 16,
        },
        subjectRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
        },
        subjectLabel: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '700',
        },
        subjectText: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '600',
        },
        emailTextArea: {
            flex: 1,
            backgroundColor: colors.surfaceSoft,
            borderRadius: 16,
            padding: 16,
            color: colors.textPrimary,
            fontSize: 14,
            lineHeight: 22,
            minHeight: 300,
        },
    });
}
