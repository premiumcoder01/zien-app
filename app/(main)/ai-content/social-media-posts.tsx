import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateAiText, saveAiContent } from '@/services/aiContentService';
import { getProperties, RawPropertyItem } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

interface PlatformOption {
    id: string;
    title: string;
    icon: string;
    defaultValue: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
    {
        id: 'instagram',
        title: 'Instagram',
        icon: 'instagram',
        defaultValue: 'e.g. Modern Malibu mansion with sunrise lighting, architectural pool shot. Mention the 5 bed, 7 bath features...',
    },
    {
        id: 'facebook',
        title: 'Facebook',
        icon: 'facebook',
        defaultValue: 'e.g. Beautiful family home in Los Angeles. Spacious backyard, open floor plan. Mention the proximity to schools...',
    },
    {
        id: 'linkedin',
        title: 'LinkedIn',
        icon: 'linkedin',
        defaultValue: 'e.g. Professional office space in downtown Miami. Modern amenities, great views. Mention the business connectivity...',
    },
    {
        id: 'tiktok',
        title: 'TikTok',
        icon: 'music-note',
        defaultValue: 'e.g. Trendy loft in Brooklyn. City views, industrial chic. Mention the vibrant neighborhood vibes...',
    },
];

const STYLE_OPTIONS = ['Viral Hook', 'Emoji Optimized', 'Short & Punchy', 'Professional Tone'];

const MOCK_CAPTION = `🏠 JUST LISTED: A masterpiece of modern architecture. 

Step into a world where design meets tranquility. This meticulously crafted residence at 123 Business Way offers the perfect balance of industrial chic and warm, natural aesthetics. 

Featuring soaring ceilings, bespoke timber detailing, and an open-concept flow that redefines luxury living. Your new chapter starts here. 🗝️✨

#RealEstate #ModernArchitecture #JustListed #LuxuryLiving`;

const MOCK_IMAGE = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80';

export default function SocialPostLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { prefill, content, address } = useLocalSearchParams<{ prefill?: string; content?: string; address?: string }>();

    const [selectedPlatform, setSelectedPlatform] = useState('instagram');
    const [campaignContext, setCampaignContext] = useState(prefill || '');
    const [selectedStyle, setSelectedStyle] = useState('Emoji Optimized');
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputCaption, setOutputCaption] = useState(content || '');
    const [hasGenerated, setHasGenerated] = useState(!!content);
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
            console.error('[SocialPostLab] Error fetching properties:', err);
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
            setOutputCaption(content);
            setHasGenerated(true);
        }
    }, [prefill, content]);

    const handleGenerate = async () => {
        if (!campaignContext.trim() || !accessToken) return;
        Keyboard.dismiss();

        setIsGenerating(true);
        setHasGenerated(false);
        setOutputCaption('');

        try {
            let promptFeatures = campaignContext.trim();
            if (selectedPropertyId !== 'custom') {
                const prop = properties.find((p) => p.id === selectedPropertyId);
                if (prop) {
                    const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                    promptFeatures = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${campaignContext.trim()}`;
                }
            }

            const platformLabel = selectedPlatform === 'instagram' ? 'Instagram' : selectedPlatform === 'facebook' ? 'Facebook' : selectedPlatform === 'linkedin' ? 'LinkedIn' : 'TikTok';
            const prompt = `Write a highly engaging real estate social media post for ${platformLabel}. Details to include: ${promptFeatures}. Format it properly for ${platformLabel} (use appropriate emojis, tone, and spacing). Include relevant trending hashtags at the end. Make it sound professional yet captivating. DO NOT use any markdown formatting like asterisks (**) for bolding. Important stylistic rules to apply: ${selectedStyle}.`;
            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                setOutputCaption(response.result);
                setHasGenerated(true);
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[SocialPostLab] Generation failed:', err);
            setHasGenerated(false);
            Alert.alert('Generation Failed', err?.message || 'Could not generate social post. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!outputCaption) return;
        await Clipboard.setStringAsync(outputCaption);
        setCopied(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportNarrative = async () => {
        if (!outputCaption || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const activeImage = prop ? (prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0]) : MOCK_IMAGE;
            const platformLabel = selectedPlatform === 'instagram' ? 'Instagram' : selectedPlatform === 'facebook' ? 'Facebook' : selectedPlatform === 'linkedin' ? 'LinkedIn' : 'TikTok';

            await saveAiContent(
                {
                    type: 'social-posts',
                    content: outputCaption,
                    metadata: {
                        platform: platformLabel,
                        input_details: campaignContext || '',
                        image: activeImage || '',
                        address: prop ? prop.address : '',
                    },
                },
                accessToken
            );
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
            console.error('[SocialPostLab] Export failed:', err);
            Alert.alert('Export Failed', err?.message || 'Could not save the social post. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <PageHeader
                    title="Social Post Lab"
                    subtitle="Generate high-engagement captions and AI visuals for every platform in seconds."
                    onBack={() => router.back()}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Platform Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.platformTabs}

                    >
                        {PLATFORM_OPTIONS.map((platform) => (
                            <Pressable
                                key={platform.id}
                                style={[
                                    styles.platformTab,
                                    selectedPlatform === platform.id && styles.platformTabActive,
                                ]}
                                onPress={() => {
                                    setSelectedPlatform(platform.id);
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={platform.icon as any}
                                    size={18}
                                    color={selectedPlatform === platform.id ? '#FFFFFF' : colors.textPrimary}
                                />
                                <Text style={[
                                    styles.platformTabText,
                                    selectedPlatform === platform.id && styles.platformTabTextActive,
                                ]}>
                                    {platform.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Horizontal Property Selector */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.propertySelectorScroll}
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
                                        // Auto-populate the campaign context with remarks/details
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

                    {/* Campaign Context Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.cardHeading}>Campaign Context</Text>
                        <Text style={styles.cardSubtitle}>
                            Describe what you want to post. Mention the property, key features, or the mood for the image.
                        </Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            placeholder={PLATFORM_OPTIONS.find(p => p.id === selectedPlatform)?.defaultValue}
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

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleList} scrollEnabled={false}>
                            {STYLE_OPTIONS.map((style) => {
                                const isActive = selectedStyle === style;
                                return (
                                    <Pressable
                                        key={style}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedStyle(style);
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
                                            {style}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Preview & Multimedia Card */}
                    <View style={styles.outputCard}>
                        <View style={styles.outputHeader}>
                            <View style={styles.outputStatus}>
                                <View style={styles.statusDot} />
                                <Text style={styles.outputTitle} numberOfLines={1}>POST PREVIEW</Text>
                            </View>
                            {hasGenerated && (
                                <View style={styles.outputActions}>
                                    <Pressable
                                        style={[styles.iconAction, !outputCaption && styles.btnDisabledDark]}
                                        onPress={copyToClipboard}
                                        disabled={!outputCaption}
                                    >
                                        <MaterialCommunityIcons
                                            name={copied ? "check-all" : "content-copy"}
                                            size={18}
                                            color={outputCaption ? "#94A3B8" : "#334155"}
                                        />
                                    </Pressable>
                                    <Pressable
                                        style={[styles.exportBtn, (!outputCaption || isSaving) && styles.btnDisabledExport]}
                                        onPress={handleExportNarrative}
                                        disabled={!outputCaption || isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="content-save-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                                                <Text style={styles.exportBtnText}>SAVE TO LIBRARY</Text>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        <View style={styles.outputContent}>
                            <View style={styles.imagePreviewContainer}>
                                {(() => {
                                    const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
                                    const firstImage = prop ? (prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0]) : null;
                                    const activeImage = firstImage || MOCK_IMAGE;
                                    return <Image source={{ uri: activeImage }} style={styles.previewImage} />;
                                })()}
                            </View>

                            {isGenerating ? (
                                <View style={styles.loadingState}>
                                    <ActivityIndicator size="small" color="#0a2341" />
                                    <Text style={styles.loadingText}>Building your social media presence...</Text>
                                </View>
                            ) : hasGenerated ? (
                                <View style={styles.captionArea}>
                                    <TextInput
                                        style={styles.captionText}
                                        multiline
                                        value={outputCaption}
                                        onChangeText={setOutputCaption}
                                        textAlignVertical="top"
                                    />
                                </View>
                            ) : (
                                <View style={styles.placeholderState}>
                                    <MaterialCommunityIcons name="lightning-bolt-outline" size={24} color="#64748B" />
                                    <Text style={styles.placeholderTitle}>Creative Studio Ready</Text>
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

        // Platform Tabs
        platformTabs: {
            paddingVertical: 10,
            gap: 8,
            marginBottom: 20,
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
            gap: 8,
            marginTop: 16,
        },
        stylePill: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
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
            fontSize: 12,
            fontWeight: '700',
        },
        stylePillTextActive: {
            color: '#FFFFFF',
        },
        stylePillTextInactive: {
            color: colors.textSecondary,
        },

        // Output Card
        outputCard: {
            backgroundColor: colors.cardBackgroundSemi,
            borderRadius: 24,
            padding: 16,
            minHeight: 500,
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
            marginBottom: 24,
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
            backgroundColor: '#0a2341',
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
            backgroundColor: '#0a2341',
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 8,
            gap: 4,
        },
        exportBtnText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '900',
        },
        outputContent: { flex: 1 },
        previewContainer: { gap: 16 },
        imagePreviewContainer: {
            width: '100%',
            height: 320,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: colors.surfaceSoft,
        },
        previewImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        captionArea: {
            backgroundColor: colors.surfaceSoft,
            borderRadius: 16,
            padding: 16,
            minHeight: 120,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        captionText: {
            fontSize: 14,
            color: colors.textPrimary,
            lineHeight: 22,
            fontWeight: '500',
        },
        loadingState: {
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 16,
            marginTop: 16,
        },
        loadingText: {
            color: colors.textMuted,
            marginTop: 12,
            fontSize: 13,
            textAlign: 'center',
        },
        placeholderState: {
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 16,
            marginTop: 16,
        },
        placeholderTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
            marginTop: 12,
        },
        btnDisabledDark: {
            opacity: 0.4,
        },
        btnDisabledExport: {
            opacity: 0.5,
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
    });
}

