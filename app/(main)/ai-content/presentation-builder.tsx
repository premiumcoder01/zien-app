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

// ── Narrative Styles (From Web Mockup) ──────────────────────────────────
const NARRATIVE_STYLES = [
    { id: 'luxury', title: 'Luxury Executive', icon: 'book-open-variant' },
    { id: 'minimal', title: 'Modern Minimal', icon: 'view-quilt' },
    { id: 'bold', title: 'Bold Investment', icon: 'file-document-outline' },
];

const FEATURE_PILLS = ['PDF Export', 'Dynamic Charts', 'Brand Assets', 'Multi-Device'];

const SLIDES = [
    {
        chapter: 'CHAPTER 01',
        title: 'Architectural Grandeur',
        subtitle: '123 Ocean Drive, Malibu',
        description: 'An exclusive look into the pinnacle of coastal luxury living, where modern design meets the Pacific horizon.',
        image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
    },
    {
        chapter: 'CHAPTER 02',
        title: 'The Living Experience',
        subtitle: 'Interior Mastery',
        description: 'Open-concept spaces featuring 24ft ceilings, Italian marble flooring, and hand-crafted walnut cabinetry throughout.',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    },
    {
        chapter: 'CHAPTER 03',
        title: 'Culinary Excellence',
        subtitle: 'Gourmet Kitchen',
        description: 'Professional-grade appliances integrated into a minimalist design, perfect for both intimate dining and grand entertaining.',
        image: 'https://images.unsplash.com/photo-1600607687940-47a04b50975a?auto=format&fit=crop&w=800&q=80'
    },
    {
        chapter: 'CHAPTER 04',
        title: 'Primary Sanctuary',
        subtitle: 'Master Suite Retreat',
        description: 'A private oasis with floor-to-ceiling glass, offering unobstructed ocean views and a spa-inspired en-suite bathroom.',
        image: 'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=800&q=80'
    }
];

const MOCK_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

export default function PresentationBuilderScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { id, prefill, content, address } = useLocalSearchParams<{ id?: string; prefill?: string; content?: string; address?: string }>();

    // Initial slides parsing
    let initialSlides = SLIDES;
    if (content) {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
                initialSlides = parsed;
            }
        } catch (e) {
            console.error('[PresentationBuilder] Failed to parse content:', e);
        }
    }

    const [selectedStyle, setSelectedStyle] = useState(NARRATIVE_STYLES[0]);
    const [brief, setBrief] = useState(prefill || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(!!content);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [slides, setSlides] = useState<any[]>(initialSlides);
    const [isEditingSlide, setIsEditingSlide] = useState(false);
    const [copied, setCopied] = useState(false);

    // Sub-tab view controller
    const [activeViewTab, setActiveViewTab] = useState<'form' | 'preview'>('form');

    // Properties list states
    const [properties, setProperties] = useState<RawPropertyItem[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | number>('custom');

    const scrollRef = useRef<ScrollView>(null);

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
            console.error('[PresentationBuilder] Error fetching properties:', err);
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
        if (prefill) setBrief(prefill);
        if (content) {
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSlides(parsed);
                    setHasGenerated(true);
                    setActiveViewTab('preview'); // Instantly go to preview mode when editing
                }
            } catch (e) {
                console.error(e);
            }
        }
    }, [prefill, content]);

    const handleGenerate = async () => {
        if (!brief.trim() || !accessToken) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setActiveViewTab('preview'); // Switch to preview tab loader

        try {
            let promptFeatures = brief.trim();
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            if (prop) {
                const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                promptFeatures = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${brief.trim()}`;
            }

            const prompt = `Write a premium real estate presentation deck outline in JSON format. The JSON should be an array of exactly 4 slide objects. Each object must have fields: "chapter" (e.g. "CHAPTER 01"), "title", "subtitle", and "description". Do not use markdown backticks in the response, output only raw JSON.
            Theme / Style requirement: ${selectedStyle.title}
            Property info: ${promptFeatures}`;

            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                let cleanResult = response.result.trim();
                // Strip markdown wraps if present
                if (cleanResult.startsWith('```json')) {
                    cleanResult = cleanResult.substring(7, cleanResult.length - 3).trim();
                } else if (cleanResult.startsWith('```')) {
                    cleanResult = cleanResult.substring(3, cleanResult.length - 3).trim();
                }

                const parsed = JSON.parse(cleanResult);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Inject images locally
                    const updated = parsed.map((slide, idx) => ({
                        ...slide,
                        image: SLIDES[idx]?.image || SLIDES[0].image
                    }));
                    setSlides(updated);
                    setHasGenerated(true);
                    setCurrentSlideIndex(0);
                } else {
                    throw new Error('Parsed result is not an array.');
                }
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[PresentationBuilder] Generation failed:', err);
            setActiveViewTab('form'); // Fallback to form tab on failure
            Alert.alert('Generation Failed', err?.message || 'Could not generate presentation. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (slides.length === 0) return;
        const text = slides.map((s, i) => `SLIDE ${i + 1}\nTitle: ${s.title}\nSubtitle: ${s.subtitle}\nDescription: ${s.description || s.content || ''}`).join('\n\n');
        await Clipboard.setStringAsync(text);
        setCopied(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportNarrative = async () => {
        if (slides.length === 0 || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const contentString = JSON.stringify(slides);

            const payload = {
                type: 'presentation-builder',
                content: contentString,
                metadata: {
                    theme: selectedStyle.title,
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
                'Presentation saved successfully to your library.',
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
            console.error('[PresentationBuilder] Save failed:', err);
            Alert.alert('Save Failed', err?.message || 'Could not save the presentation. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getSlideImage = (idx: number) => {
        return slides[idx]?.image || SLIDES[idx]?.image || MOCK_IMAGE;
    };

    const renderSlidePreview = () => {
        if (isGenerating) {
            return (
                <View style={styles.previewLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.previewLoadingText}>Building your slides...</Text>
                </View>
            );
        }

        if (!hasGenerated || slides.length === 0) {
            return (
                <View style={styles.previewPlaceholderContainer}>
                    <View style={styles.previewPlaceholderIcon}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={styles.previewPlaceholderTitle}>No slides generated yet</Text>
                    <Text style={styles.previewPlaceholderDesc}>
                        Go to the "Configure Deck" tab to select a template and generate your presentation.
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

        const currentSlide = slides[currentSlideIndex];

        return (
            <View style={styles.deckPreviewCard}>
                {/* Simulated Presentation Slide */}
                <View style={styles.slideContainer}>
                    <Image
                        source={{ uri: getSlideImage(currentSlideIndex) }}
                        style={styles.slideImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.slideImageOverlay}
                    />
                    <View style={styles.slideContent}>
                        <View style={styles.slideChapterBadge}>
                            <Text style={styles.slideChapterText}>{currentSlide.chapter || `SLIDE ${String(currentSlideIndex + 1).padStart(2, '0')}`}</Text>
                        </View>

                        {isEditingSlide ? (
                            <View style={styles.editSlideContainer}>
                                <Text style={styles.editLabel}>Title</Text>
                                <TextInput
                                    style={styles.editTitleInput}
                                    value={currentSlide.title}
                                    onChangeText={(text) => {
                                        const updated = [...slides];
                                        updated[currentSlideIndex].title = text;
                                        setSlides(updated);
                                    }}
                                />
                                <Text style={styles.editLabel}>Subtitle</Text>
                                <TextInput
                                    style={styles.editSubtitleInput}
                                    value={currentSlide.subtitle}
                                    onChangeText={(text) => {
                                        const updated = [...slides];
                                        updated[currentSlideIndex].subtitle = text;
                                        setSlides(updated);
                                    }}
                                />
                                <Text style={styles.editLabel}>Description</Text>
                                <TextInput
                                    style={styles.editContentInput}
                                    multiline
                                    value={currentSlide.description || currentSlide.content || ''}
                                    onChangeText={(text) => {
                                        const updated = [...slides];
                                        updated[currentSlideIndex].description = text;
                                        updated[currentSlideIndex].content = text;
                                        setSlides(updated);
                                    }}
                                />
                            </View>
                        ) : (
                            <>
                                <Text style={styles.slideTitle}>{currentSlide.title}</Text>
                                <Text style={styles.slideSubtitle}>{currentSlide.subtitle}</Text>
                                <View style={styles.slideDivider} />
                                <Text style={styles.slideDescription}>
                                    {currentSlide.description || currentSlide.content || ''}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Progress Indicators & Navigation Controls */}
                <View style={styles.navigationRow}>
                    <View style={styles.progressDots}>
                        {slides.map((_, i) => (
                            <Pressable
                                key={i}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setCurrentSlideIndex(i);
                                }}
                            >
                                <View style={[styles.dot, currentSlideIndex === i && styles.dotActive]} />
                            </Pressable>
                        ))}
                    </View>
                    <View style={styles.navControls}>
                        <Pressable
                            style={styles.navBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
                            }}
                            disabled={currentSlideIndex === 0}
                        >
                            <MaterialCommunityIcons
                                name="chevron-left"
                                size={22}
                                color={currentSlideIndex === 0 ? colors.textMuted : colors.textPrimary}
                            />
                        </Pressable>
                        <Text style={styles.pageIndicator}>
                            {String(currentSlideIndex + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                        </Text>
                        <Pressable
                            style={[styles.navBtn, currentSlideIndex < slides.length - 1 && styles.navBtnPrimary]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1));
                            }}
                            disabled={currentSlideIndex === slides.length - 1}
                        >
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={22}
                                color={currentSlideIndex === slides.length - 1 ? colors.textMuted : "#FFFFFF"}
                            />
                        </Pressable>
                    </View>
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
                    title="Presentation Lab"
                    subtitle="Compose architectural listing decks and market reports with autonomous AI logic."
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
                            Configure Deck
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
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {activeViewTab === 'form' ? (
                        <>
                            {/* Narrative Theme Tabs (Horizontal Cards matching Web layout) */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.themeSelectorScroll}
                                contentContainerStyle={styles.themeSelectorContent}
                            >
                                {NARRATIVE_STYLES.map((style) => {
                                    const isActive = selectedStyle.id === style.id;
                                    return (
                                        <Pressable
                                            key={style.id}
                                            style={[
                                                styles.themeCard,
                                                isActive && styles.themeCardActive
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedStyle(style);
                                            }}
                                        >
                                            <View style={[
                                                styles.themeCardIconContainer,
                                                isActive && styles.themeCardIconContainerActive
                                            ]}>
                                                <MaterialCommunityIcons
                                                    name={style.icon as any}
                                                    size={18}
                                                    color={isActive ? '#FFFFFF' : colors.textSecondary}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.themeCardTitle,
                                                isActive && styles.themeCardTitleActive
                                            ]}>
                                                {style.title}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
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
                                        setBrief(prefill || '');
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
                                                const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                                                const details = `Property details for ${prop.address}:\nPrice: ${prop.data?.price || prop.data?.ListPrice || 'N/A'}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || 'N/A'}/${prop.data?.bathsFull || prop.data?.BathroomsFull || 'N/A'}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || 'N/A'}\nRemarks: ${remarks}`;
                                                setBrief(remarks || details);
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

                            {/* Deck Objective Inputs Card */}
                            <View style={styles.inputCard}>
                                <Text style={styles.cardTitle}>Deck Objective</Text>
                                <Text style={styles.cardSubtitle}>
                                    Describe the property highlights, target audience, and local market data to populate the deck.
                                </Text>

                                <TextInput
                                    style={styles.textArea}
                                    multiline
                                    placeholder="e.g. Luxury listing deck for 123 Malibu Ocean Drive. Mention the recent market appreciation of 12% in the area and the premium smart-home features."
                                    placeholderTextColor="#94A3B8"
                                    value={brief}
                                    onChangeText={setBrief}
                                    textAlignVertical="top"
                                />

                                <Pressable
                                    style={[styles.generateBtn, !brief.trim() && styles.generateBtnDisabled]}
                                    onPress={handleGenerate}
                                    disabled={isGenerating || !brief.trim()}
                                >
                                    {isGenerating ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.generateBtnText}>Generate</Text>
                                    )}
                                </Pressable>

                                {/* Feature Pills */}
                                <View style={styles.featurePillsRow}>
                                    {FEATURE_PILLS.map((pill) => (
                                        <View key={pill} style={styles.featurePill}>
                                            <Text style={styles.featurePillText}>{pill}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.previewContainer}>
                            {/* Slide previews mockup block */}
                            {renderSlidePreview()}

                            {/* Aligned quick actions */}
                            {hasGenerated && slides.length > 0 && (
                                <View style={styles.previewActionsRow}>
                                    <Pressable
                                        style={[
                                            styles.previewActionBtn,
                                            styles.previewCopyBtn,
                                            isEditingSlide && styles.previewCopyBtnActive
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setIsEditingSlide(!isEditingSlide);
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={isEditingSlide ? "check-circle-outline" : "pencil-outline"}
                                            size={18}
                                            color={isEditingSlide ? "#FFFFFF" : colors.textPrimary}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[
                                            styles.previewActionBtnText,
                                            { color: isEditingSlide ? "#FFFFFF" : colors.textPrimary }
                                        ]}>
                                            {isEditingSlide ? "Done Editing" : "Edit Slide"}
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

        // Theme Selector Scroll
        themeSelectorScroll: {
            marginBottom: 16,
            marginTop: 4,
        },
        themeSelectorContent: {
            gap: 12,
            paddingRight: 20,
        },
        themeCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
        },
        themeCardActive: {
            backgroundColor: '#0a2341',
            borderColor: '#0a2341',
        },
        themeCardIconContainer: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        themeCardIconContainerActive: {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
        themeCardTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        themeCardTitleActive: {
            color: '#FFFFFF',
        },

        // Property Selector Scroll Row
        propertySelectorScroll: {
            marginBottom: 20,
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

        // Narrative Inputs Card
        inputCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 2,
        },
        cardTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 6,
        },
        cardSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 16,
            lineHeight: 18,
        },
        textArea: {
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 14,
            padding: 16,
            height: 180,
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '500',
            marginBottom: 16,
        },
        generateBtn: {
            flexDirection: 'row',
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
        },
        generateBtnDisabled: {
            opacity: 0.5,
        },
        generateBtnText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '800',
        },
        featurePillsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 20,
        },
        featurePill: {
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        featurePillText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
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
        previewCopyBtnActive: {
            backgroundColor: colors.accentTeal,
            borderColor: colors.accentTeal,
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

        // Slide Preview Deck mockup card
        deckPreviewCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 4,
        },
        slideContainer: {
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        slideImage: {
            width: '100%',
            height: 180,
            resizeMode: 'cover',
        },
        slideImageOverlay: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 100,
            height: 80,
        },
        slideContent: {
            padding: 16,
        },
        slideChapterBadge: {
            backgroundColor: colors.accentTeal + '15',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            alignSelf: 'flex-start',
            marginBottom: 10,
        },
        slideChapterText: {
            fontSize: 9,
            fontWeight: '900',
            color: colors.accentTeal,
            letterSpacing: 1.5,
        },
        slideTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 4,
        },
        slideSubtitle: {
            fontSize: 12,
            fontWeight: '700',
            color: '#0d9488',
            marginBottom: 10,
        },
        slideDivider: {
            width: 24,
            height: 2,
            backgroundColor: colors.accentTeal,
            marginBottom: 12,
        },
        slideDescription: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 20,
        },

        // Slide editing fields
        editSlideContainer: {
            gap: 8,
        },
        editLabel: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        editTitleInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            fontSize: 14,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        editSubtitleInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            fontSize: 12,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        editContentInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 12,
            lineHeight: 18,
            color: colors.textPrimary,
            minHeight: 80,
            textAlignVertical: 'top',
        },

        // Navigation indicators
        navigationRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingHorizontal: 4,
        },
        progressDots: {
            flexDirection: 'row',
            gap: 6,
        },
        dot: {
            width: 14,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.surfaceSoft,
        },
        dotActive: {
            backgroundColor: '#0D9488',
        },
        navControls: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        navBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        navBtnPrimary: {
            backgroundColor: '#0D9488',
        },
        pageIndicator: {
            fontSize: 12,
            fontWeight: '800',
            color: colors.textPrimary,
        },
    });
}
