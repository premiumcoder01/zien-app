import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateAiText, saveAiContent, updateAiContent } from '@/services/aiContentService';
import { getProperties, RawPropertyItem } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
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

const MOCK_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

export default function EmailTemplatesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { id, prefill, content, address } = useLocalSearchParams<{ id?: string; prefill?: string; content?: string; address?: string }>();

    const [selectedType, setSelectedType] = useState('just_listed');
    const [campaignContext, setCampaignContext] = useState(prefill || '');
    const [selectedStyle, setSelectedStyle] = useState('Conversion Tuned');
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputEmail, setOutputEmail] = useState({
        subject: content ? content.split('\n')[0].replace(/^Subject:\s*/i, '') : '',
        body: content ? content.substring(content.indexOf('\n') + 1).trim() : ''
    });

    // Sub-tab workspace view controller
    const [activeViewTab, setActiveViewTab] = useState<'form' | 'preview'>('form');

    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Properties list states
    const [properties, setProperties] = useState<RawPropertyItem[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | number>('custom');

    // Fetch properties helper
    const fetchProperties = useCallback(async () => {
        if (!accessToken) return;
        setPropertiesLoading(true);
        try {
            const response = await getProperties(accessToken);
            if (response.success && Array.isArray(response.properties)) {
                setProperties(response.properties);
            }
        } catch (err) {
            console.error('[EmailCampaign] Error fetching properties:', err);
        } finally {
            setPropertiesLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    // Auto-select property when editing / mounting with address parameter
    useEffect(() => {
        if (properties.length > 0 && address) {
            const matched = properties.find(
                (p) => p.address.toLowerCase().includes(address.toLowerCase())
            );
            if (matched) {
                setSelectedPropertyId(matched.id);
            }
        }
    }, [properties, address]);

    useEffect(() => {
        if (prefill) setCampaignContext(prefill);
        if (content) {
            const subject = content.split('\n')[0].replace(/^Subject:\s*/i, '');
            const body = content.substring(content.indexOf('\n') + 1).trim();
            setOutputEmail({ subject, body });
            setActiveViewTab('preview'); // Instantly navigate to preview when loaded
        }
    }, [prefill, content]);

    const handleGenerate = async () => {
        if (!campaignContext.trim() || !accessToken) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setActiveViewTab('preview'); // Switch to preview tab loader

        try {
            let promptFeatures = campaignContext.trim();
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            if (prop) {
                const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                promptFeatures = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${campaignContext.trim()}`;
            }

            const emailTypeLabel = selectedType === 'just_listed' ? 'Just Listed' : selectedType === 'follow_up' ? 'Follow-up' : selectedType === 'newsletter' ? 'Newsletter' : 'Price Drop';
            const propertyAddress = prop ? prop.address : 'N/A';

            const prompt = `Write a highly professional real estate email for a "${emailTypeLabel}" campaign. \n            Details: ${promptFeatures}.\n            Property Address: ${propertyAddress}\n            \n            Structure the email properly with an engaging subject line, a professional greeting, clear body paragraphs, and a strong call-to-action at the end. DO NOT use any markdown formatting like asterisks (**) for bolding. Important rules: ${selectedStyle}.`;
            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                const rawResult = response.result;
                const subject = rawResult.split('\n')[0].replace(/^Subject:\s*/i, '').trim();
                const body = rawResult.substring(rawResult.indexOf('\n') + 1).trim();
                setOutputEmail({ subject, body });
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[EmailCampaign] Generation failed:', err);
            setActiveViewTab('form'); // Send user back to form on error
            Alert.alert('Generation Failed', err?.message || 'Could not generate email. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        const fullText = `Subject: ${outputEmail.subject}\n\n${outputEmail.body}`;
        if (!fullText.trim()) return;
        await Clipboard.setStringAsync(fullText);
        setCopied(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportNarrative = async () => {
        const fullText = `Subject: ${outputEmail.subject}\n\n${outputEmail.body}`;
        if (!fullText.trim() || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const emailTypeLabel = selectedType === 'just_listed' ? 'Just Listed' : selectedType === 'follow_up' ? 'Follow-up' : selectedType === 'newsletter' ? 'Newsletter' : 'Price Drop';

            const payload = {
                type: 'email-templates',
                content: fullText,
                metadata: {
                    template_type: emailTypeLabel,
                    input_details: campaignContext || '',
                    property_id: prop ? prop.id : null,
                    address: prop ? prop.address : '',
                },
            };

            if (id) {
                await updateAiContent(id, payload, accessToken);
            } else {
                await saveAiContent(payload, accessToken);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Success',
                'Narrative saved successfully to your library.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setTimeout(() => {
                                router.replace('/(main)/ai-content');
                            }, 100);
                        }
                    }
                ]
            );
        } catch (err: any) {
            console.error('[EmailCampaign] Export failed:', err);
            Alert.alert('Export Failed', err?.message || 'Could not save the email templates. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderEmailPreview = () => {
        if (isGenerating) {
            return (
                <View style={styles.previewLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.previewLoadingText}>Drafting email campaign...</Text>
                </View>
            );
        }

        if (!outputEmail.subject.trim() && !outputEmail.body.trim()) {
            return (
                <View style={styles.previewPlaceholderContainer}>
                    <View style={styles.previewPlaceholderIcon}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={styles.previewPlaceholderTitle}>No email generated yet</Text>
                    <Text style={styles.previewPlaceholderDesc}>
                        Go to the "Configure Post" tab to generate a custom email campaign.
                    </Text>
                    <Pressable
                        style={styles.previewGenerateShortcutBtn}
                        onPress={() => setActiveViewTab('form')}
                    >
                        <Text style={styles.previewGenerateShortcutBtnText}>Configure & Generate</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View style={styles.emailCard}>
                {/* Email Client Header Mock */}
                <View style={styles.emailHeader}>
                    <View style={styles.emailAvatarContainer}>
                        <View style={styles.emailAvatarCircle}>
                            <MaterialCommunityIcons name="email-outline" size={18} color="#0A2341" />
                        </View>
                    </View>

                    <View style={styles.emailHeaderDetails}>
                        <View style={styles.emailMetaRow}>
                            <Text style={styles.emailMetaLabel}>From:</Text>
                            <Text style={styles.emailMetaValue}>Zien Realty <Text style={styles.emailMetaEmail}>&lt;advisor@zien.ai&gt;</Text></Text>
                        </View>

                        <View style={styles.emailMetaRow}>
                            <Text style={styles.emailMetaLabel}>To:</Text>
                            <Text style={styles.emailMetaValue}>premium.client@domain.com</Text>
                        </View>

                        <View style={[styles.emailMetaRow, { marginTop: 6 }]}>
                            <Text style={styles.emailMetaLabel}>Subject:</Text>
                            <TextInput
                                style={styles.emailSubjectInput}
                                value={outputEmail.subject}
                                onChangeText={(text) => setOutputEmail(prev => ({ ...prev, subject: text }))}
                                placeholder="Email Subject"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                </View>

                {/* Email Divider */}
                <View style={styles.emailDivider} />

                {/* Email Body Mock */}
                <View style={styles.emailBodyContainer}>
                    <TextInput
                        style={styles.emailBodyInput}
                        multiline
                        scrollEnabled={false}
                        value={outputEmail.body}
                        onChangeText={(text) => setOutputEmail(prev => ({ ...prev, body: text }))}
                        placeholder="Email body text..."
                        placeholderTextColor="#94A3B8"
                        textAlignVertical="top"
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <PageHeader
                    title="Email Templates Lab"
                    subtitle="Draft high-converting follow-ups, newsletters, and listing alerts."
                    onBack={() => router.back()}
                />

                {/* Sub-tab view switcher */}
                <View style={styles.viewTabContainer}>
                    <Pressable
                        style={[
                            styles.viewTabButton,
                            activeViewTab === 'form' && styles.viewTabButtonActive,
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveViewTab('form');
                        }}
                    >
                        <MaterialCommunityIcons
                            name="pencil-box-outline"
                            size={16}
                            color={activeViewTab === 'form' ? '#FFFFFF' : colors.textSecondary}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[
                            styles.viewTabButtonText,
                            activeViewTab === 'form' && styles.viewTabButtonTextActive,
                        ]}>
                            Configure Email
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.viewTabButton,
                            activeViewTab === 'preview' && styles.viewTabButtonActive,
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveViewTab('preview');
                        }}
                    >
                        <MaterialCommunityIcons
                            name="eye-outline"
                            size={16}
                            color={activeViewTab === 'preview' ? '#FFFFFF' : colors.textSecondary}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[
                            styles.viewTabButtonText,
                            activeViewTab === 'preview' && styles.viewTabButtonTextActive,
                        ]}>
                            Live Preview
                        </Text>
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 200 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Email Campaign Type Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.platformTabs}
                    >
                        {EMAIL_TYPES.map((type) => (
                            <Pressable
                                key={type.id}
                                style={[
                                    styles.platformTab,
                                    selectedType === type.id && styles.platformTabActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedType(type.id);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={type.icon as any}
                                    size={18}
                                    color={selectedType === type.id ? '#FFFFFF' : colors.textPrimary}
                                />
                                <Text style={[
                                    styles.platformTabText,
                                    selectedType === type.id && styles.platformTabTextActive,
                                ]}>
                                    {type.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Mode Specific Display */}
                    {activeViewTab === 'form' ? (
                        <>
                            {/* Horizontal Property Selector */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.propertySelectorScroll}
                                nestedScrollEnabled
                                contentContainerStyle={styles.propertySelectorContent}
                            >
                                {/* CUSTOM INPUT Card */}
                                <Pressable
                                    style={[
                                        styles.selectorCard,
                                        selectedPropertyId === 'custom' && styles.selectorCardActive
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedPropertyId('custom');
                                        setCampaignContext(prefill || '');
                                    }}
                                >
                                    <View style={styles.selectorCardIconContainer}>
                                        <MaterialCommunityIcons name="cube-outline" size={20} color={colors.accentTeal} />
                                    </View>
                                    <View style={styles.selectorCardTextContainer}>
                                        <Text style={styles.selectorCardTitle} numberOfLines={1}>CUSTOM INPUT</Text>
                                        <Text style={styles.selectorCardSubtitle}>Manual Entry</Text>
                                    </View>
                                </Pressable>

                                {/* Property Cards */}
                                {properties.map((prop) => {
                                    const isSelected = selectedPropertyId === prop.id;
                                    const firstImage = prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0];
                                    const propTitle = prop.address.split(',')[0];

                                    return (
                                        <Pressable
                                            key={prop.id}
                                            style={[
                                                styles.selectorCard,
                                                isSelected && styles.selectorCardActive
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedPropertyId(prop.id);
                                                // Auto-populate context with remarks/details
                                                const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                                                const details = `Property details for ${prop.address}:\nPrice: ${prop.data?.price || prop.data?.ListPrice || 'N/A'}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || 'N/A'}/${prop.data?.bathsFull || prop.data?.BathroomsFull || 'N/A'}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || 'N/A'}\nRemarks: ${remarks}`;
                                                setCampaignContext(remarks || details);
                                            }}
                                        >
                                            {firstImage ? (
                                                <Image source={{ uri: firstImage }} style={styles.selectorCardImage} />
                                            ) : (
                                                <View style={styles.selectorCardIconContainer}>
                                                    <MaterialCommunityIcons name="home-outline" size={20} color={colors.textSecondary} />
                                                </View>
                                            )}
                                            <View style={styles.selectorCardTextContainer}>
                                                <Text style={styles.selectorCardTitle} numberOfLines={1}>{propTitle}</Text>
                                                <Text style={styles.selectorCardSubtitle} numberOfLines={1}>
                                                    Active Property
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Campaign Context Configuration Card */}
                            <View style={styles.inputCard}>
                                <Text style={styles.cardHeading}>Email Context</Text>
                                <Text style={styles.cardSubtitle}>
                                    Describe details about the email. Add property specifications, client context, or call schedule guidelines.
                                </Text>

                                <TextInput
                                    style={styles.textArea}
                                    multiline
                                    placeholder={EMAIL_TYPES.find(e => e.id === selectedType)?.placeholder}
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

                                <View style={styles.styleList}>
                                    {STYLE_TAGS.map((tag) => {
                                        const isActive = selectedStyle === tag;
                                        return (
                                            <Pressable
                                                key={tag}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSelectedStyle(tag);
                                                }}
                                                style={[
                                                    styles.stylePill,
                                                    isActive ? styles.stylePillActive : styles.stylePillInactive,
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.stylePillText,
                                                    isActive ? styles.stylePillTextActive : styles.stylePillTextInactive,
                                                ]}>
                                                    {tag}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.previewContainer}>
                            {/* Live simulated email card view */}
                            {renderEmailPreview()}

                            {/* Symmetrical action button row */}
                            {(outputEmail.subject.trim().length > 0 || outputEmail.body.trim().length > 0) && (
                                <View style={styles.previewActionsRow}>
                                    <Pressable
                                        style={[
                                            styles.previewActionBtn,
                                            styles.previewCopyBtn,
                                            copied && styles.previewCopyBtnSuccess
                                        ]}
                                        onPress={copyToClipboard}
                                    >
                                        <MaterialCommunityIcons
                                            name={copied ? "check-circle" : "content-copy"}
                                            size={18}
                                            color={copied ? "#10B981" : colors.textPrimary}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[
                                            styles.previewActionBtnText,
                                            { color: colors.textPrimary }
                                        ]}>
                                            {copied ? "Copied" : "Copy Email"}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.previewActionBtn,
                                            styles.previewSaveBtn,
                                            isSaving && styles.previewSaveBtnDisabled
                                        ]}
                                        onPress={handleExportNarrative}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons
                                                    name="content-save-outline"
                                                    size={18}
                                                    color="#FFFFFF"
                                                    style={{ marginRight: 8 }}
                                                />
                                                <Text style={[
                                                    styles.previewActionBtnText,
                                                    { color: "#FFFFFF" }
                                                ]}>
                                                    Save to Library
                                                </Text>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}
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

        // Platform / Type Tabs
        platformTabs: {
            paddingVertical: 10,
            gap: 8,
            marginBottom: 16,
        },
        platformTab: {
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
        platformTabActive: {
            backgroundColor: colors.accentTeal,
            borderColor: colors.accentTeal,
        },
        platformTabText: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
            marginLeft: 8,
        },
        platformTabTextActive: {
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
        styleList: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 16,
        },
        stylePill: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
        },
        stylePillActive: {
            backgroundColor: '#0D9488',
        },
        stylePillInactive: {
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        stylePillText: {
            fontSize: 11,
            fontWeight: '700',
        },
        stylePillTextActive: {
            color: '#FFFFFF',
        },
        stylePillTextInactive: {
            color: colors.textSecondary,
        },

        // Property Selector Scroll Row
        propertySelectorScroll: {
            marginBottom: 20,
            marginTop: 4,
        },
        propertySelectorContent: {
            gap: 12,
            paddingRight: 20,
        },
        selectorCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.cardBorder,
            paddingHorizontal: 12,
            paddingVertical: 8,
            width: 200,
            height: 60,
            gap: 10,
        },
        selectorCardActive: {
            borderColor: colors.accentTeal,
        },
        selectorCardImage: {
            width: 40,
            height: 40,
            borderRadius: 8,
            resizeMode: 'cover',
        },
        selectorCardIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorCardTextContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        selectorCardTitle: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        selectorCardSubtitle: {
            fontSize: 9,
            color: colors.textSecondary,
            marginTop: 2,
        },

        // Workspace sub-tabs switcher
        viewTabContainer: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            padding: 4,
            marginHorizontal: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        viewTabButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 9,
        },
        viewTabButtonActive: {
            backgroundColor: colors.accentTeal || '#0D9488',
        },
        viewTabButtonText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        viewTabButtonTextActive: {
            color: '#FFFFFF',
            fontWeight: '800',
        },

        // Preview general container
        previewContainer: {
            marginHorizontal: 0,
            marginBottom: 20,
            gap: 16,
        },
        previewLoadingContainer: {
            height: 320,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        previewLoadingText: {
            marginTop: 12,
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        previewPlaceholderContainer: {
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            minHeight: 320,
        },
        previewPlaceholderIcon: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
        },
        previewPlaceholderTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
        },
        previewPlaceholderDesc: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 18,
            marginBottom: 24,
        },
        previewGenerateShortcutBtn: {
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
        },
        previewGenerateShortcutBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '800',
        },

        // Action Buttons underneath mockup card
        previewActionsRow: {
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 4,
            marginTop: 8,
        },
        previewActionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
        },
        previewCopyBtn: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
        },
        previewCopyBtnSuccess: {
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
        },
        previewSaveBtn: {
            backgroundColor: '#0a2341',
            borderColor: '#0a2341',
        },
        previewSaveBtnDisabled: {
            opacity: 0.5,
        },
        previewActionBtnText: {
            fontSize: 14,
            fontWeight: '800',
        },

        // Premium simulated Email Client Inbox card mockup
        emailCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 20,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 4,
        },
        emailHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        emailAvatarContainer: {
            marginRight: 14,
        },
        emailAvatarCircle: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        emailHeaderDetails: {
            flex: 1,
            gap: 4,
        },
        emailMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        emailMetaLabel: {
            width: 60,
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        emailMetaValue: {
            flex: 1,
            fontSize: 12,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        emailMetaEmail: {
            fontWeight: '500',
            color: colors.textMuted,
        },
        emailSubjectInput: {
            flex: 1,
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
            padding: 0,
            margin: 0,
        },
        emailDivider: {
            height: 1,
            backgroundColor: colors.cardBorder,
            marginVertical: 18,
        },
        emailBodyContainer: {
            minHeight: 200,
        },
        emailBodyInput: {
            fontSize: 14,
            color: colors.textPrimary,
            lineHeight: 22,
            fontWeight: '500',
            padding: 0,
            margin: 0,
        },
    });
}
