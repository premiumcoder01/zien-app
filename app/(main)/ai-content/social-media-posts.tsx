import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Clipboard,
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

const STYLE_OPTIONS = ['Viral Hook', 'Emoji Optimized', 'AI Visual', 'One-Click Post'];

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
    const { prefill, content } = useLocalSearchParams<{ prefill?: string; content?: string }>();

    const [selectedPlatform, setSelectedPlatform] = useState('instagram');
    const [campaignContext, setCampaignContext] = useState(prefill || '');
    const [selectedStyle, setSelectedStyle] = useState('Viral Hook');
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputCaption, setOutputCaption] = useState(content || '');
    const [hasGenerated, setHasGenerated] = useState(!!content);

    useEffect(() => {
        if (prefill) {
            setCampaignContext(prefill);
        }
        if (content) {
            setOutputCaption(content);
            setHasGenerated(true);
        }
    }, [prefill, content]);

    const handleGenerate = () => {
        if (!campaignContext.trim()) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);
        setOutputCaption('');

        // Simulate thinking & generating
        setTimeout(() => {
            setIsGenerating(false);
            setHasGenerated(true);

            // Start typing animation for caption
            let index = 0;
            const textToType = MOCK_CAPTION;
            const speed = 15;

            const timer = setInterval(() => {
                if (index < textToType.length) {
                    setOutputCaption((prev) => prev + textToType.charAt(index));
                    index++;
                } else {
                    clearInterval(timer);
                }
            }, speed);
        }, 1500);
    };

    const copyToClipboard = () => {
        Clipboard.setString(outputCaption);
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
                            {STYLE_OPTIONS.map((style) => (
                                <Pressable
                                    key={style}
                                    onPress={() => setSelectedStyle(style)}
                                    style={[
                                        styles.stylePill,
                                        selectedStyle === style && styles.stylePillActive,
                                    ]}
                                >
                                    <Text style={[
                                        styles.stylePillText,
                                        selectedStyle === style && styles.stylePillTextActive,
                                    ]}>
                                        {style}
                                    </Text>
                                </Pressable>
                            ))}
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
                                    <Pressable style={styles.iconAction} onPress={copyToClipboard}>
                                        <MaterialCommunityIcons name="content-copy" size={18} color="#94A3B8" />
                                    </Pressable>
                                    <Pressable style={styles.exportBtn}>
                                        <MaterialCommunityIcons name="share-variant-outline" size={18} color="#FFFFFF" />
                                        <Text style={styles.exportBtnText}>EXPORT POST</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        <View style={styles.outputContent}>
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: MOCK_IMAGE }} style={styles.previewImage} />
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
        styleList: { marginTop: 10 },
        stylePill: {
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: colors.surfaceSoft,
            marginRight: 8,
            height: 32,
            justifyContent: 'center',
        },
        stylePillActive: {
            backgroundColor: colors.surfaceMuted,
        },
        stylePillText: {
            fontSize: 8,
            color: colors.textSecondary,
            fontWeight: '700',
        },
        stylePillTextActive: {
            color: colors.textPrimary,
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
    });
}

