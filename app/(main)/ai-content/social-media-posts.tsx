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

const MOCK_IMAGE = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80';

// Platform-specific optimized prompt generator
const getPlatformPrompt = (platform: string, style: string, details: string) => {
    switch (platform) {
        case 'instagram':
            return `Write a highly engaging, visually-optimized real estate social media post for Instagram.
Details to include: ${details}

Format it properly for Instagram:
- Start with a compelling hook in the first line.
- Use spacing and clear line breaks to make it readable.
- Integrate emojis naturally to highlight key property features (e.g., 🏠, ✨, 🗝️, 🛁, 🌳).
- Make the tone vibrant, welcoming, and aspirational.
- End with a curated group of 5-10 highly relevant trending real estate hashtags (e.g., #DreamHome, #LuxuryLiving).
- Important: DO NOT use markdown bold formatting like asterisks (**).
- Important stylistic rule: ${style}.`;

        case 'facebook':
            return `Write a friendly, community-focused, and highly engaging real estate social media post for Facebook.
Details to include: ${details}

Format it properly for Facebook:
- Write a captivating headline.
- Use readable, well-spaced paragraphs to encourage sharing and discussion.
- Keep the tone warm, professional, and inviting.
- Add a clear Call-To-Action (CTA) at the end, inviting readers to comment or send a DM to schedule a private tour.
- Include appropriate emojis and 3-5 relevant hashtags at the very end.
- Important: DO NOT use markdown bold formatting like asterisks (**).
- Important stylistic rule: ${style}.`;

        case 'linkedin':
            return `Write a highly professional, industry-tailored, and structured real estate post for LinkedIn.
Details to include: ${details}

Format it properly for LinkedIn:
- Focus on the investment value, prime location, design quality, and architectural highlights.
- Keep the tone professional, sophisticated, yet captivating.
- Use clean bullet points (using emojis like ▪️ or ▫️ or ✔️) to list the property's key specifications (beds, baths, square footage, amenities).
- Add a professional CTA (e.g., "For inquiries or to schedule a private showing, connect with us today.").
- Include 3-4 professional hashtags at the end (e.g., #RealEstate, #PropertyInvestment, #CommercialRealEstate, #LuxuryListing).
- Important: DO NOT use markdown bold formatting like asterisks (**).
- Important stylistic rule: ${style}.`;

        case 'tiktok':
            return `Write a high-energy, viral-style caption and short description for a TikTok real estate video.
Details to include: ${details}

Format it properly for TikTok:
- Start with an extremely strong, attention-grabbing viral hook in the first sentence (e.g., "You won't believe what's inside this house! 😱" or "Touring the most beautiful home in [Area]! ✨").
- Keep the sentences short, punchy, and fast-paced.
- Use high-energy emojis frequently.
- Add a clear CTA directing viewers to take action (e.g., "Link in bio for full details!" or "Tag someone who needs to live here!").
- Include a list of 5-8 trending TikTok real estate hashtags (e.g., #HouseTour, #DreamHome, #RealEstateTikTok, #MansionTour).
- Important: DO NOT use markdown bold formatting like asterisks (**).
- Important stylistic rule: ${style}.`;

        default:
            return `Write a highly engaging real estate social media post. Details to include: ${details}. Format it properly with appropriate emojis, tone, and spacing. Include relevant trending hashtags. Make it sound professional yet captivating. DO NOT use any markdown formatting like asterisks (**) for bolding. Important stylistic rules to apply: ${style}.`;
    }
};

export default function SocialPostLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { id, prefill, content, address, platform } = useLocalSearchParams<{ id?: string; prefill?: string; content?: string; address?: string; platform?: string }>();

    const [selectedPlatform, setSelectedPlatform] = useState('instagram');
    const [campaignContext, setCampaignContext] = useState(prefill || '');
    const [selectedStyle, setSelectedStyle] = useState('Emoji Optimized');
    const [isGenerating, setIsGenerating] = useState(false);

    // Multi-platform caption state mapping
    const [platformCaptions, setPlatformCaptions] = useState<{ [key: string]: string }>({
        instagram: '',
        facebook: '',
        linkedin: '',
        tiktok: '',
    });

    // Sub-tab workspace view controller
    const [activeViewTab, setActiveViewTab] = useState<'form' | 'preview'>('form');
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

    // Reset expanded state when platform changes
    useEffect(() => {
        setIsCaptionExpanded(false);
    }, [selectedPlatform]);


    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Properties list states
    const [properties, setProperties] = useState<RawPropertyItem[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | number>('custom');

    // Current platform variables
    const currentCaption = platformCaptions[selectedPlatform] || '';
    const hasGeneratedForPlatform = !!currentCaption.trim();

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

    // Load prefill parameters from router/navigation search parameters
    useEffect(() => {
        if (prefill) setCampaignContext(prefill);
        if (content) {
            const initialPlatform = (platform?.toLowerCase() || 'instagram') as string;
            setSelectedPlatform(initialPlatform);
            setPlatformCaptions((prev) => ({
                ...prev,
                [initialPlatform]: content,
            }));
            setActiveViewTab('preview');
        }
    }, [prefill, content, platform]);

    const handleGenerate = async () => {
        if (!campaignContext.trim() || !accessToken) return;
        Keyboard.dismiss();

        setIsGenerating(true);
        setActiveViewTab('preview'); // Instantly navigate to see preview loader

        try {
            let promptFeatures = campaignContext.trim();
            if (selectedPropertyId !== 'custom') {
                const prop = properties.find((p) => p.id === selectedPropertyId);
                if (prop) {
                    const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                    promptFeatures = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${campaignContext.trim()}`;
                }
            }

            const prompt = getPlatformPrompt(selectedPlatform, selectedStyle, promptFeatures);
            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                setPlatformCaptions((prev) => ({
                    ...prev,
                    [selectedPlatform]: response.result,
                }));
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[SocialPostLab] Generation failed:', err);
            setActiveViewTab('form'); // Send user back to form on failure
            Alert.alert('Generation Failed', err?.message || 'Could not generate social post. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!currentCaption) return;
        await Clipboard.setStringAsync(currentCaption);
        setCopied(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportNarrative = async () => {
        if (!currentCaption || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const activeImage = prop ? (prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0]) : MOCK_IMAGE;
            const platformLabel = selectedPlatform === 'instagram' ? 'Instagram' : selectedPlatform === 'facebook' ? 'Facebook' : selectedPlatform === 'linkedin' ? 'LinkedIn' : 'TikTok';

            const payload = {
                type: 'social-posts',
                content: currentCaption,
                metadata: {
                    platform: platformLabel,
                    input_details: campaignContext || '',
                    image: activeImage || '',
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
            console.error('[SocialPostLab] Export failed:', err);
            Alert.alert('Export Failed', err?.message || 'Could not save the social post. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const setOutputCaption = (text: string) => {
        setPlatformCaptions((prev) => ({
            ...prev,
            [selectedPlatform]: text,
        }));
    };

    const renderCaptionWithSeeMore = (maxLength: number, textStyle: any, inputStyle: any, wrapperStyle?: any) => {
        const text = currentCaption || '';
        const shouldShowSeeMore = text.length > maxLength;

        if (shouldShowSeeMore && !isCaptionExpanded) {
            const truncatedText = text.substring(0, maxLength).trim();
            return (
                <Pressable 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsCaptionExpanded(true);
                    }}
                    style={wrapperStyle}
                >
                    <Text style={textStyle}>
                        {truncatedText}
                        <Text style={{ fontWeight: '700', color: selectedPlatform === 'tiktok' ? '#FE2C55' : colors.accentTeal }}>
                            ... see more
                        </Text>
                    </Text>
                </Pressable>
            );
        }

        return (
            <View style={wrapperStyle}>
                <TextInput
                    style={inputStyle}
                    multiline
                    scrollEnabled={selectedPlatform === 'tiktok'}
                    value={currentCaption}
                    onChangeText={setOutputCaption}
                    textAlignVertical="top"
                />
            </View>
        );
    };

    // Renders realistic layout previews corresponding to selected social platform
    const renderSocialPreview = () => {
        const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
        const firstImage = prop ? (prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0]) : null;
        const activeImage = firstImage || MOCK_IMAGE;

        const propertyTitle = prop ? prop.address.split(',')[0] : 'Luxury Estate Listing';
        const propertyLocation = prop ? prop.address.split(',').slice(1).join(',').trim() : 'Zien Premier Realty';

        if (isGenerating) {
            return (
                <View style={styles.previewLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.previewLoadingText}>Building platform-native post...</Text>
                </View>
            );
        }

        if (!hasGeneratedForPlatform) {
            return (
                <View style={styles.previewPlaceholderContainer}>
                    <View style={styles.previewPlaceholderIcon}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={styles.previewPlaceholderTitle}>No {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} post generated yet</Text>
                    <Text style={styles.previewPlaceholderDesc}>
                        Go to the "Configure Post" tab to generate a custom caption and style for this platform.
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

        switch (selectedPlatform) {
            case 'instagram':
                return (
                    <View style={styles.igCard}>
                        {/* IG Header */}
                        <View style={styles.igHeader}>
                            <View style={styles.igAvatarContainer}>
                                <LinearGradient
                                    colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
                                    style={styles.igAvatarGradient}
                                >
                                    <View style={styles.igAvatarInner}>
                                        <MaterialCommunityIcons name="home-modern" size={14} color="#FFFFFF" />
                                    </View>
                                </LinearGradient>
                            </View>
                            <View style={styles.igHeaderText}>
                                <Text style={styles.igUsername}>zien.realty</Text>
                                <Text style={styles.igLocation} numberOfLines={1}>{propertyTitle}</Text>
                            </View>
                            <MaterialCommunityIcons name="dots-horizontal" size={18} color={colors.textPrimary} style={styles.igDots} />
                        </View>

                        {/* IG Media */}
                        <View style={styles.igMedia}>
                            <Image source={{ uri: activeImage }} style={styles.igImage} />
                        </View>

                        {/* IG Actions */}
                        <View style={styles.igActions}>
                            <View style={styles.igActionsLeft}>
                                <MaterialCommunityIcons name="heart-outline" size={22} color={colors.textPrimary} style={{ marginRight: 14 }} />
                                <MaterialCommunityIcons name="chat-outline" size={22} color={colors.textPrimary} style={{ marginRight: 14 }} />
                                <MaterialCommunityIcons name="send-outline" size={22} color={colors.textPrimary} />
                            </View>
                            <MaterialCommunityIcons name="bookmark-outline" size={22} color={colors.textPrimary} />
                        </View>

                        {/* IG Likes */}
                        <Text style={styles.igLikes}>Liked by <Text style={{ fontWeight: '700' }}>realestate_broker</Text> and <Text style={{ fontWeight: '700' }}>1,248 others</Text></Text>

                        {/* IG Caption */}
                        {renderCaptionWithSeeMore(
                            120,
                            [styles.igCaptionInput, { color: colors.textPrimary }],
                            styles.igCaptionInput,
                            styles.igCaptionContainer
                        )}
                    </View>
                );

            case 'facebook':
                return (
                    <View style={styles.fbCard}>
                        {/* FB Header */}
                        <View style={styles.fbHeader}>
                            <View style={styles.fbAvatar}>
                                <MaterialCommunityIcons name="home" size={18} color="#1877F2" />
                            </View>
                            <View style={styles.fbHeaderText}>
                                <Text style={styles.fbAuthor}>Zien Real Estate</Text>
                                <View style={styles.fbTimeRow}>
                                    <Text style={styles.fbTime}>Just now · </Text>
                                    <MaterialCommunityIcons name="earth" size={10} color={colors.textMuted} />
                                </View>
                            </View>
                            <MaterialCommunityIcons name="dots-horizontal" size={18} color={colors.textPrimary} />
                        </View>

                        {/* FB Post Text */}
                        {renderCaptionWithSeeMore(
                            200,
                            [styles.fbTextInput, { color: colors.textPrimary }],
                            styles.fbTextInput,
                            styles.fbTextContainer
                        )}

                        {/* FB Image & Preview Link */}
                        <View style={styles.fbMediaContainer}>
                            <Image source={{ uri: activeImage }} style={styles.fbImage} />
                            <View style={styles.fbLinkPreview}>
                                <Text style={styles.fbLinkDomain}>ZIEN.AI</Text>
                                <Text style={styles.fbLinkTitle} numberOfLines={1}>{propertyTitle}</Text>
                                <Text style={styles.fbLinkDesc} numberOfLines={1}>{propertyLocation} - Active Listing</Text>
                            </View>
                        </View>

                        {/* FB Actions */}
                        <View style={styles.fbActions}>
                            <View style={styles.fbActionBtn}>
                                <MaterialCommunityIcons name="thumb-up-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.fbActionText}>Like</Text>
                            </View>
                            <View style={styles.fbActionBtn}>
                                <MaterialCommunityIcons name="chat-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.fbActionText}>Comment</Text>
                            </View>
                            <View style={styles.fbActionBtn}>
                                <MaterialCommunityIcons name="share-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.fbActionText}>Share</Text>
                            </View>
                        </View>
                    </View>
                );

            case 'linkedin':
                return (
                    <View style={styles.liCard}>
                        {/* LI Header */}
                        <View style={styles.liHeader}>
                            <View style={styles.liAvatar}>
                                <MaterialCommunityIcons name="office-building" size={18} color="#0A66C2" />
                            </View>
                            <View style={styles.liHeaderText}>
                                <Text style={styles.liAuthor}>Zien Realty Group</Text>
                                <Text style={styles.liTagline} numberOfLines={1}>Premium Listings & Property Portfolios</Text>
                                <View style={styles.liTimeRow}>
                                    <Text style={styles.liTime}>Just now • </Text>
                                    <MaterialCommunityIcons name="earth" size={10} color={colors.textMuted} />
                                </View>
                            </View>
                            <MaterialCommunityIcons name="dots-horizontal" size={18} color={colors.textPrimary} />
                        </View>

                        {/* LI Post Text */}
                        {renderCaptionWithSeeMore(
                            180,
                            [styles.liTextInput, { color: colors.textPrimary }],
                            styles.liTextInput,
                            styles.liTextContainer
                        )}

                        {/* LI Image */}
                        <View style={styles.liMediaContainer}>
                            <Image source={{ uri: activeImage }} style={styles.liImage} />
                            <View style={styles.liMediaFooter}>
                                <Text style={styles.liMediaTitle} numberOfLines={1}>{propertyTitle}</Text>
                                <Text style={styles.liMediaSubtitle} numberOfLines={1}>{propertyLocation}</Text>
                            </View>
                        </View>

                        {/* LI Actions */}
                        <View style={styles.liActions}>
                            <View style={styles.liActionBtn}>
                                <MaterialCommunityIcons name="thumb-up-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.liActionText}>Like</Text>
                            </View>
                            <View style={styles.liActionBtn}>
                                <MaterialCommunityIcons name="chat-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.liActionText}>Comment</Text>
                            </View>
                            <View style={styles.liActionBtn}>
                                <MaterialCommunityIcons name="share-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.liActionText}>Repost</Text>
                            </View>
                            <View style={styles.liActionBtn}>
                                <MaterialCommunityIcons name="send" size={16} color={colors.textSecondary} />
                                <Text style={styles.liActionText}>Send</Text>
                            </View>
                        </View>
                    </View>
                );

            case 'tiktok':
                return (
                    <View style={styles.ttCard}>
                        {/* TT Background Image simulating Video */}
                        <Image source={{ uri: activeImage }} style={styles.ttBgImage} />

                        {/* Dark Overlay for readability */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.ttOverlay}
                        >
                            {/* TT Sidebar actions */}
                            <View style={styles.ttSidebar}>
                                <View style={styles.ttProfilePic}>
                                    <View style={styles.ttProfilePicInner}>
                                        <MaterialCommunityIcons name="home-city" size={14} color="#000" />
                                    </View>
                                    <View style={styles.ttProfileAdd}>
                                        <MaterialCommunityIcons name="plus" size={10} color="#FFF" />
                                    </View>
                                </View>
                                <View style={styles.ttSidebarIcon}>
                                    <MaterialCommunityIcons name="heart" size={26} color="#FFF" />
                                    <Text style={styles.ttSidebarText}>1.2K</Text>
                                </View>
                                <View style={styles.ttSidebarIcon}>
                                    <MaterialCommunityIcons name="message-text" size={24} color="#FFF" />
                                    <Text style={styles.ttSidebarText}>84</Text>
                                </View>
                                <View style={styles.ttSidebarIcon}>
                                    <MaterialCommunityIcons name="bookmark" size={24} color="#FFF" />
                                    <Text style={styles.ttSidebarText}>320</Text>
                                </View>
                                <View style={styles.ttSidebarIcon}>
                                    <MaterialCommunityIcons name="share" size={24} color="#FFF" />
                                    <Text style={styles.ttSidebarText}>115</Text>
                                </View>
                                <View style={styles.ttMusicDiscContainer}>
                                    <LinearGradient
                                        colors={['#333', '#111']}
                                        style={styles.ttMusicDisc}
                                    >
                                        <MaterialCommunityIcons name="music" size={12} color="#FFF" />
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* TT Info Overlay */}
                            <View style={styles.ttInfo}>
                                <Text style={styles.ttUsername}>@zien_realty</Text>
                                {renderCaptionWithSeeMore(
                                    80,
                                    [styles.ttCaptionInput, { color: '#FFFFFF' }],
                                    styles.ttCaptionInput,
                                    styles.ttCaptionContainer
                                )}
                                <View style={styles.ttMusicRow}>
                                    <MaterialCommunityIcons name="music" size={12} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.ttMusicName}>Original Sound - Zien Realty</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                );

            default:
                return null;
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
                            Configure Post
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
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Platform Selector Tabs - Stays visible to swap active channels */}
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

                            {/* Campaign Context Configuration Card */}
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

                                <View style={styles.styleList}>
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
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.previewContainer}>
                            {/* Live simulated platform-native card */}
                            {renderSocialPreview()}

                            {/* Sticky-feeling side-by-side action buttons */}
                            {hasGeneratedForPlatform && (
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
                                            {copied ? "Copied" : "Copy Caption"}
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

        // Platform Tabs
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

        // Instagram Simulated UI Cards
        igCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
        },
        igHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
        },
        igAvatarContainer: {
            marginRight: 10,
        },
        igAvatarGradient: {
            width: 32,
            height: 32,
            borderRadius: 16,
            padding: 2,
            justifyContent: 'center',
            alignItems: 'center',
        },
        igAvatarInner: {
            width: '100%',
            height: '100%',
            borderRadius: 14,
            backgroundColor: '#000000',
            justifyContent: 'center',
            alignItems: 'center',
        },
        igHeaderText: {
            flex: 1,
        },
        igUsername: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        igLocation: {
            fontSize: 10,
            color: colors.textSecondary,
            marginTop: 1,
        },
        igDots: {
            marginLeft: 8,
        },
        igMedia: {
            width: '100%',
            height: SCREEN_WIDTH - 42,
            backgroundColor: colors.surfaceSoft,
        },
        igImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        igActions: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 8,
        },
        igActionsLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        igLikes: {
            fontSize: 12,
            color: colors.textPrimary,
            paddingHorizontal: 12,
            marginBottom: 6,
        },
        igCaptionContainer: {
            flexDirection: 'row',
            paddingHorizontal: 12,
            paddingBottom: 16,
            gap: 6,
        },
        igCaptionUser: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 2,
        },
        igCaptionInput: {
            flex: 1,
            fontSize: 12,
            color: colors.textPrimary,
            lineHeight: 16,
            fontWeight: '500',
            padding: 0,
            margin: 0,
            textAlignVertical: 'top',
        },

        // Facebook Simulated UI Cards
        fbCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 12,
        },
        fbHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
        },
        fbAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#1877F215',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
        },
        fbHeaderText: {
            flex: 1,
        },
        fbAuthor: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        fbTimeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 2,
        },
        fbTime: {
            fontSize: 10,
            color: colors.textMuted,
        },
        fbTextContainer: {
            marginBottom: 12,
        },
        fbTextInput: {
            fontSize: 13,
            color: colors.textPrimary,
            lineHeight: 18,
            fontWeight: '500',
            padding: 0,
            margin: 0,
            textAlignVertical: 'top',
        },
        fbMediaContainer: {
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surfaceSoft,
        },
        fbImage: {
            width: '100%',
            height: 200,
            resizeMode: 'cover',
        },
        fbLinkPreview: {
            backgroundColor: colors.surfaceSoft,
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
        },
        fbLinkDomain: {
            fontSize: 9,
            color: colors.textMuted,
            fontWeight: '600',
        },
        fbLinkTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 4,
        },
        fbLinkDesc: {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 2,
        },
        fbActions: {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
            marginTop: 12,
            paddingTop: 10,
        },
        fbActionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        fbActionText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
        },

        // LinkedIn Simulated UI Cards
        liCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 12,
        },
        liHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
        },
        liAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#0A66C215',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
        },
        liHeaderText: {
            flex: 1,
        },
        liAuthor: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        liTagline: {
            fontSize: 10,
            color: colors.textSecondary,
            marginTop: 1,
        },
        liTimeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 2,
        },
        liTime: {
            fontSize: 10,
            color: colors.textMuted,
        },
        liTextContainer: {
            marginBottom: 12,
        },
        liTextInput: {
            fontSize: 13,
            color: colors.textPrimary,
            lineHeight: 18,
            fontWeight: '500',
            padding: 0,
            margin: 0,
            textAlignVertical: 'top',
        },
        liMediaContainer: {
            borderRadius: 8,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surfaceSoft,
        },
        liImage: {
            width: '100%',
            height: 200,
            resizeMode: 'cover',
        },
        liMediaFooter: {
            backgroundColor: colors.surfaceSoft,
            padding: 12,
        },
        liMediaTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        liMediaSubtitle: {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 2,
        },
        liActions: {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
            marginTop: 12,
            paddingTop: 10,
        },
        liActionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
        },
        liActionText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
        },

        // TikTok Simulated UI Cards
        ttCard: {
            backgroundColor: '#000000',
            borderRadius: 16,
            height: 450,
            overflow: 'hidden',
            position: 'relative',
        },
        ttBgImage: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            resizeMode: 'cover',
            opacity: 0.85,
        },
        ttOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'flex-end',
            padding: 16,
        },
        ttSidebar: {
            position: 'absolute',
            right: 12,
            bottom: 60,
            alignItems: 'center',
            gap: 16,
        },
        ttProfilePic: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            borderWidth: 1,
            borderColor: '#FFFFFF',
        },
        ttProfilePicInner: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FE2C5515',
            justifyContent: 'center',
            alignItems: 'center',
        },
        ttProfileAdd: {
            position: 'absolute',
            bottom: -5,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#FE2C55',
            justifyContent: 'center',
            alignItems: 'center',
        },
        ttSidebarIcon: {
            alignItems: 'center',
        },
        ttSidebarText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
            textShadowColor: 'rgba(0, 0, 0, 0.75)',
            textShadowOffset: { width: -1, height: 1 },
            textShadowRadius: 4,
        },
        ttMusicDiscContainer: {
            marginTop: 8,
        },
        ttMusicDisc: {
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        ttInfo: {
            width: '80%',
            marginBottom: 10,
        },
        ttUsername: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 6,
            textShadowColor: 'rgba(0, 0, 0, 0.75)',
            textShadowOffset: { width: -1, height: 1 },
            textShadowRadius: 4,
        },
        ttCaptionContainer: {
            maxHeight: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            padding: 8,
            marginBottom: 8,
        },
        ttCaptionInput: {
            fontSize: 12,
            color: '#FFFFFF',
            lineHeight: 16,
            fontWeight: '500',
            textAlignVertical: 'top',
        },
        ttMusicRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        ttMusicName: {
            color: '#FFFFFF',
            fontSize: 11,
            textShadowColor: 'rgba(0, 0, 0, 0.75)',
            textShadowOffset: { width: -1, height: 1 },
            textShadowRadius: 4,
        },
    });
}
