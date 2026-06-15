import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateAiText, saveAiContent } from '@/services/aiContentService';
import { getProperties, RawPropertyItem } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

// ── Hero Carousel Slides ─────────────────────────────────────────────
const HERO_SLIDES = [
    {
        id: 1,
        badge: 'ARCHITECTURAL AI',
        title: 'Presentation',
        titleAccent: 'Studio',
        titleSuffix: 'Pro',
        desc: 'Compose premium listing decks and market reports with autonomous AI-powered design intelligence.',
        features: ['4-Slide Decks', 'Smart Layout', 'Brand Themes'],
        imageLeft: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
        imageRight: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 2,
        badge: 'MARKET INTELLIGENCE',
        title: 'Investment',
        titleAccent: 'Reports',
        titleSuffix: 'Elite',
        desc: 'Generate data-driven investment decks with comparative market analysis and ROI projections.',
        features: ['CMA Reports', 'ROI Visuals', 'Trend Analysis'],
        imageLeft: 'https://images.unsplash.com/photo-1600607687940-47a04b50975a?auto=format&fit=crop&w=800&q=80',
        imageRight: 'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 3,
        badge: 'CREATIVE ENGINE',
        title: 'Luxury',
        titleAccent: 'Showcase',
        titleSuffix: 'Premium',
        desc: 'Craft visually stunning showcase decks for ultra-luxury properties and exclusive portfolios.',
        features: ['8K Imagery', 'Gold Accents', 'Custom Fonts'],
        imageLeft: 'https://images.unsplash.com/photo-1600596542815-6ad4c727dddf?auto=format&fit=crop&w=800&q=80',
        imageRight: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80',
    },
];

// ── Template Kit Items ───────────────────────────────────────────────
const TEMPLATE_KIT = [
    { id: 1, title: 'Luxury Executive', icon: 'book-open-variant', desc: 'Premium listing decks with elegant typography and gold accents.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80', styleId: 'luxury' },
    { id: 2, title: 'Modern Minimal', icon: 'view-quilt', desc: 'Clean, contemporary layouts with bold whitespace and modern fonts.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80', styleId: 'minimal' },
    { id: 3, title: 'Bold Investment', icon: 'file-document-outline', desc: 'Data-driven investor pitch decks with strong visual hierarchy.', image: 'https://images.unsplash.com/photo-1600607687940-47a04b50975a?auto=format&fit=crop&w=400&q=80', styleId: 'bold' },
    { id: 4, title: 'Market Report', icon: 'chart-line', desc: 'Analytical market overview decks with comparative data points.', image: 'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=400&q=80', styleId: 'luxury' },
];

// ── Narrative Styles ─────────────────────────────────────────────────
const NARRATIVE_STYLES = [
    { id: 'luxury', title: 'Luxury Executive', icon: 'book-open-variant' },
    { id: 'minimal', title: 'Modern Minimal', icon: 'view-quilt' },
    { id: 'bold', title: 'Bold Investment', icon: 'file-document-outline' },
];

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

export default function PresentationBuilderScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { prefill, content, address } = useLocalSearchParams<{ prefill?: string; content?: string; address?: string }>();

    // View modes: dashboard → config → preview
    const [viewMode, setViewMode] = useState<'dashboard' | 'config' | 'preview'>(() => {
        if (content) return 'preview';
        return 'dashboard';
    });

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
                    setViewMode('preview');
                }
            } catch (e) {
                console.error('[PresentationBuilder] Failed to parse content:', e);
            }
        }
    }, [prefill, content]);

    const handleGenerate = async () => {
        if (!brief.trim() || !accessToken) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);
        setCurrentSlideIndex(0);
        setViewMode('preview');

        try {
            let promptDetails = brief.trim();
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            if (prop) {
                const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                promptDetails = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${brief.trim()}`;
            }

            const propertyAddress = prop ? prop.address : 'N/A';
            const prompt = `Create a real estate presentation deck consisting of 4 slides.\nTheme: ${selectedStyle.title}.\nDetails: ${promptDetails}.\nProperty Address: ${propertyAddress}\n\nYou must return EXACTLY and ONLY a valid JSON array of 4 objects. Do NOT wrap it in markdown code blocks like \`\`\`json. Do NOT use asterisks (**) for bolding.\nEach object must have the following string keys: "title", "subtitle", "content".`;

            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                let rawResult = response.result.trim();
                if (rawResult.startsWith('```')) {
                    rawResult = rawResult.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
                }

                const parsed = JSON.parse(rawResult);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSlides(parsed);
                    setHasGenerated(true);
                } else {
                    throw new Error('Invalid presentation array response format.');
                }
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[PresentationBuilder] Generation failed:', err);
            setHasGenerated(false);
            Alert.alert('Generation Failed', err?.message || 'Could not generate presentation. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportNarrative = async () => {
        if (slides.length === 0 || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const contentString = JSON.stringify(slides);

            await saveAiContent(
                {
                    type: 'presentation-builder',
                    content: contentString,
                    metadata: {
                        theme: selectedStyle.title,
                        property_id: prop ? prop.id : null,
                        address: prop ? prop.address : '',
                    },
                },
                accessToken
            );
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

    const getSlideImage = (index: number) => {
        const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
        const propertyImages = prop ? (prop.data?.Media?.map((m: any) => m.MediaURL) || prop.data?.user_images || []) : [];
        if (propertyImages && propertyImages[index]) {
            return propertyImages[index];
        }
        const defaultMockImages = [
            'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1600607687940-47a04b50975a?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&w=800&q=80'
        ];
        return defaultMockImages[index % defaultMockImages.length];
    };

    // ── PREVIEW MODE ─────────────────────────────────────────────────
    if (viewMode === 'preview') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={colors.backgroundGradient as any}
                    style={[styles.background, { paddingTop: insets.top }]}
                >
                    {/* Back Navigation */}
                    <Pressable onPress={() => setViewMode('config')} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                        <Text style={styles.backBtnText}>Back to Builder</Text>
                    </Pressable>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Section Title */}
                        <Text style={styles.sectionTitle}>Preview Engine</Text>
                        <Text style={styles.sectionSubtitle}>Review your AI-generated presentation slides below.</Text>

                        {/* Preview Card */}
                        <View style={styles.previewCard}>
                            <View style={styles.previewHeader}>
                                <View style={styles.previewStatus}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.previewHeaderTitle}>PRESENTATION PREVIEW</Text>
                                </View>
                                {hasGenerated && (
                                    <View style={styles.previewActions}>
                                        <Pressable
                                            style={[styles.iconBtn, isEditingSlide && styles.iconBtnActive]}
                                            onPress={() => setIsEditingSlide(!isEditingSlide)}
                                        >
                                            <MaterialCommunityIcons
                                                name={isEditingSlide ? "check" : "pencil-outline"}
                                                size={18}
                                                color={isEditingSlide ? "#FFFFFF" : colors.textPrimary}
                                            />
                                        </Pressable>
                                        <Pressable
                                            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                                            onPress={handleExportNarrative}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
                                            )}
                                        </Pressable>
                                    </View>
                                )}
                            </View>

                            <View style={styles.previewContent}>
                                {isGenerating ? (
                                    <View style={styles.loaderState}>
                                        <ActivityIndicator size="large" color={colors.accentTeal} />
                                        <Text style={styles.loaderTitle}>Composing Your Deck</Text>
                                        <Text style={styles.loaderSubtitle}>Our AI is crafting {selectedStyle.title} slides with architectural precision...</Text>
                                    </View>
                                ) : hasGenerated && slides.length > 0 ? (
                                    <View style={styles.slideWrapper}>
                                        <View style={styles.slideContainer}>
                                            <Image
                                                source={{ uri: getSlideImage(currentSlideIndex) }}
                                                style={styles.slideImage}
                                            />
                                            <LinearGradient
                                                colors={['transparent', 'rgba(0,0,0,0.6)']}
                                                style={styles.slideImageOverlay}
                                            />
                                            <View style={styles.slideContent}>
                                                <View style={styles.slideChapterBadge}>
                                                    <Text style={styles.slideChapterText}>{`SLIDE ${String(currentSlideIndex + 1).padStart(2, '0')}`}</Text>
                                                </View>

                                                {isEditingSlide ? (
                                                    <View style={styles.editSlideContainer}>
                                                        <Text style={styles.editLabel}>Title</Text>
                                                        <TextInput
                                                            style={styles.editTitleInput}
                                                            value={slides[currentSlideIndex].title}
                                                            onChangeText={(text) => {
                                                                const updated = [...slides];
                                                                updated[currentSlideIndex].title = text;
                                                                setSlides(updated);
                                                            }}
                                                        />
                                                        <Text style={styles.editLabel}>Subtitle</Text>
                                                        <TextInput
                                                            style={styles.editSubtitleInput}
                                                            value={slides[currentSlideIndex].subtitle}
                                                            onChangeText={(text) => {
                                                                const updated = [...slides];
                                                                updated[currentSlideIndex].subtitle = text;
                                                                setSlides(updated);
                                                            }}
                                                        />
                                                        <Text style={styles.editLabel}>Content</Text>
                                                        <TextInput
                                                            style={styles.editContentInput}
                                                            multiline
                                                            value={slides[currentSlideIndex].content || (slides[currentSlideIndex] as any).description || ''}
                                                            onChangeText={(text) => {
                                                                const updated = [...slides];
                                                                updated[currentSlideIndex].content = text;
                                                                (updated[currentSlideIndex] as any).description = text;
                                                                setSlides(updated);
                                                            }}
                                                        />
                                                    </View>
                                                ) : (
                                                    <>
                                                        <Text style={styles.slideTitle}>{slides[currentSlideIndex].title}</Text>
                                                        <Text style={styles.slideSubtitle}>{slides[currentSlideIndex].subtitle}</Text>
                                                        <View style={styles.slideDivider} />
                                                        <Text style={styles.slideDescription}>
                                                            {slides[currentSlideIndex].content || (slides[currentSlideIndex] as any).description || ''}
                                                        </Text>
                                                    </>
                                                )}
                                            </View>
                                        </View>

                                        {/* Navigation Controls */}
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
                                                >
                                                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textSecondary} />
                                                </Pressable>
                                                <Text style={styles.pageIndicator}>
                                                    {String(currentSlideIndex + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
                                                </Text>
                                                <Pressable
                                                    style={[styles.navBtn, styles.navBtnPrimary]}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1));
                                                    }}
                                                >
                                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.placeholderState}>
                                        <MaterialCommunityIcons name="presentation" size={48} color={colors.textMuted} />
                                        <Text style={styles.placeholderTitle}>No Deck Generated</Text>
                                        <Text style={styles.placeholderSubtitle}>Go back and configure your deck to generate slides.</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </View>
        );
    }

    // ── CONFIG MODE (Builder) ────────────────────────────────────────
    if (viewMode === 'config') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={colors.backgroundGradient as any}
                    style={[styles.background, { paddingTop: insets.top }]}
                >
                    {/* Back Navigation */}
                    <Pressable onPress={() => setViewMode('dashboard')} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                        <Text style={styles.backBtnText}>Back</Text>
                    </Pressable>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={[styles.sectionTitle, { fontSize: 24, textAlign: 'center' }]}>Build Your Deck</Text>
                        <Text style={[styles.sectionSubtitle, { textAlign: 'center', marginBottom: 24 }]}>Configure your presentation style and property context below.</Text>

                        {/* Builder Card */}
                        <View style={styles.configCard}>
                            {/* Theme Selection */}
                            <Text style={styles.configLabel}>DECK THEME</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.themeTabsContent}
                            >
                                {NARRATIVE_STYLES.map((styleOption) => {
                                    const isActive = selectedStyle.id === styleOption.id;
                                    return (
                                        <Pressable
                                            key={styleOption.id}
                                            style={[
                                                styles.themeTab,
                                                isActive && styles.themeTabActive,
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedStyle(styleOption);
                                            }}
                                        >
                                            <MaterialCommunityIcons
                                                name={styleOption.icon as any}
                                                size={16}
                                                color={isActive ? '#FFFFFF' : colors.textSecondary}
                                            />
                                            <Text style={[
                                                styles.themeTabText,
                                                isActive && styles.themeTabTextActive,
                                            ]}>
                                                {styleOption.title}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Property Selection */}
                            <Text style={styles.configLabel}>SELECT PROPERTY</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
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

                            {/* Brief Input */}
                            <Text style={styles.configLabel}>DECK OBJECTIVE</Text>
                            <TextInput
                                style={styles.textArea}
                                multiline
                                placeholder="e.g. Luxury listing deck for 123 Malibu Ocean Drive. Mention the recent market appreciation of 12% in the area and the premium smart-home features."
                                placeholderTextColor="#94A3B8"
                                value={brief}
                                onChangeText={setBrief}
                                textAlignVertical="top"
                            />

                            {/* Generate Button */}
                            <Pressable
                                style={[styles.generateBtn, (!brief.trim() || isGenerating) && styles.generateBtnDisabled]}
                                onPress={handleGenerate}
                                disabled={isGenerating || !brief.trim()}
                            >
                                {isGenerating ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="auto-fix" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.generateBtnText}>Generate Presentation</Text>
                                    </>
                                )}
                            </Pressable>

                            {/* Feature Pills */}
                            <View style={styles.featurePillRow}>
                                {['PDF Export', 'Dynamic Charts', 'Brand Assets', 'Multi-Device'].map((pill) => (
                                    <View key={pill} style={styles.featurePill}>
                                        <Text style={styles.featurePillText}>{pill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </View>
        );
    }

    // ── DASHBOARD MODE (Default) ─────────────────────────────────────
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>

                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Hero Carousel ─────────────────────────────────── */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.carouselContainer}
                        snapToInterval={SCREEN_WIDTH - 40}
                        decelerationRate="fast"
                    >
                        {HERO_SLIDES.map((slide) => (
                            <View key={slide.id} style={styles.bannerCard}>
                                <LinearGradient
                                    colors={['#0B2046', '#1A365D']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.bannerGradient}
                                >
                                    {/* Dual Image Row */}
                                    <View style={styles.bannerImageContainer}>
                                        <Image source={{ uri: slide.imageLeft }} style={styles.bannerHalfImage} />
                                        <Image source={{ uri: slide.imageRight }} style={styles.bannerHalfImage} />
                                    </View>

                                    {/* Banner Content */}
                                    <View style={styles.bannerContent}>
                                        <View style={styles.bannerBadge}>
                                            <Text style={styles.bannerBadgeText}>{slide.badge}</Text>
                                        </View>
                                        <Text style={styles.bannerTitle}>
                                            {slide.title}{' '}
                                            <Text style={{ color: '#0D9488' }}>{slide.titleAccent}</Text>
                                        </Text>
                                        <Text style={styles.bannerDesc}>{slide.desc}</Text>

                                        {/* Feature Pills */}
                                        <View style={styles.bannerFeatureRow}>
                                            {slide.features.map((f) => (
                                                <View key={f} style={styles.bannerFeaturePill}>
                                                    <Text style={styles.bannerFeaturePillText}>{f}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <Pressable
                                            style={styles.tryThisBtn}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setViewMode('config');
                                            }}
                                        >
                                            <Text style={styles.tryThisBtnText}>Build Deck</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                                        </Pressable>
                                    </View>
                                </LinearGradient>
                            </View>
                        ))}
                    </ScrollView>

                    {/* ── Deck Templates Grid ─────────────────────────── */}
                    <Text style={styles.sectionTitle}>Deck Templates</Text>
                    <Text style={[styles.sectionSubtitle, { marginBottom: 16 }]}>Choose a template to start building your professional presentation.</Text>

                    <View style={styles.kitGrid}>
                        {TEMPLATE_KIT.map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.kitCard}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    const matchingStyle = NARRATIVE_STYLES.find(s => s.id === item.styleId);
                                    if (matchingStyle) setSelectedStyle(matchingStyle);
                                    setViewMode('config');
                                }}
                            >
                                <Image source={{ uri: item.image }} style={styles.kitImage} />
                                <View style={styles.kitCardContent}>
                                    <Text style={styles.kitCardTitle}>{item.title}</Text>
                                    <Text style={styles.kitCardDesc} numberOfLines={2}>{item.desc}</Text>
                                    <View style={styles.kitBtn}>
                                        <Text style={styles.kitBtnText}>Use Template</Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>

                    {/* ── Capabilities Strip ──────────────────────────── */}
                    <View style={styles.capabilitiesCard}>
                        <LinearGradient
                            colors={['#0B2046', '#162D50']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.capabilitiesGradient}
                        >
                            <View style={styles.capRow}>
                                <View style={styles.capItem}>
                                    <MaterialCommunityIcons name="lightning-bolt" size={22} color="#0D9488" />
                                    <Text style={styles.capValue}>4</Text>
                                    <Text style={styles.capLabel}>Slides</Text>
                                </View>
                                <View style={styles.capDivider} />
                                <View style={styles.capItem}>
                                    <MaterialCommunityIcons name="palette-swatch-outline" size={22} color="#0D9488" />
                                    <Text style={styles.capValue}>3</Text>
                                    <Text style={styles.capLabel}>Themes</Text>
                                </View>
                                <View style={styles.capDivider} />
                                <View style={styles.capItem}>
                                    <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#0D9488" />
                                    <Text style={styles.capValue}>AI</Text>
                                    <Text style={styles.capLabel}>Generated</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════
function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20 },

        // ── Back Button ──────────────────────────────────────────────
        backBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            gap: 6,
        },
        backBtnText: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },

        // ── Section Headers ──────────────────────────────────────────
        sectionTitle: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 4,
        },
        sectionSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            lineHeight: 18,
        },

        // ── Hero Carousel ────────────────────────────────────────────
        carouselContainer: {
            marginBottom: 32,
        },
        bannerCard: {
            width: SCREEN_WIDTH - 40,
            borderRadius: 24,
            overflow: 'hidden',
            marginRight: 12,
        },
        bannerGradient: {
            padding: 16,
        },
        bannerImageContainer: {
            width: '100%',
            aspectRatio: 1.6,
            borderRadius: 16,
            overflow: 'hidden',
            flexDirection: 'row',
            marginBottom: 20,
        },
        bannerHalfImage: {
            width: '50%',
            height: '100%',
            resizeMode: 'cover',
        },
        bannerContent: {
            flex: 1,
        },
        bannerBadge: {
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            alignSelf: 'flex-start',
            marginBottom: 10,
        },
        bannerBadgeText: {
            color: '#0D9488',
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 1.5,
        },
        bannerTitle: {
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '900',
            marginBottom: 8,
        },
        bannerDesc: {
            color: '#94A3B8',
            fontSize: 12,
            lineHeight: 18,
            marginBottom: 16,
        },
        bannerFeatureRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 16,
        },
        bannerFeaturePill: {
            backgroundColor: 'rgba(255,255,255,0.08)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
        },
        bannerFeaturePillText: {
            color: '#CBD5E1',
            fontSize: 10,
            fontWeight: '700',
        },
        tryThisBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0D9488',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            alignSelf: 'flex-start',
        },
        tryThisBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '900',
        },

        // ── Deck Templates Grid ─────────────────────────────────────
        kitGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            rowGap: 16,
        },
        kitCard: {
            width: (SCREEN_WIDTH - 52) / 2,
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
        },
        kitImage: {
            width: '100%',
            aspectRatio: 1.3,
            resizeMode: 'cover',
        },
        kitCardContent: {
            padding: 12,
        },
        kitCardTitle: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '800',
            marginBottom: 4,
        },
        kitCardDesc: {
            color: colors.textSecondary,
            fontSize: 10,
            lineHeight: 14,
            marginBottom: 10,
        },
        kitBtn: {
            backgroundColor: colors.surfaceSoft,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        kitBtnText: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.accentTeal,
        },

        // ── Capabilities Card ────────────────────────────────────────
        capabilitiesCard: {
            marginTop: 24,
            borderRadius: 20,
            overflow: 'hidden',
        },
        capabilitiesGradient: {
            padding: 24,
        },
        capRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
        },
        capItem: {
            alignItems: 'center',
            gap: 4,
        },
        capValue: {
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '900',
        },
        capLabel: {
            color: '#94A3B8',
            fontSize: 10,
            fontWeight: '700',
        },
        capDivider: {
            width: 1,
            height: 40,
            backgroundColor: 'rgba(255,255,255,0.1)',
        },

        // ── Config Card (Builder) ────────────────────────────────────
        configCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
        },
        configLabel: {
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1,
            marginTop: 16,
            marginBottom: 10,
        },

        // Theme Tabs
        themeTabsContent: {
            gap: 8,
        },
        themeTab: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 6,
        },
        themeTabActive: {
            backgroundColor: '#0D9488',
            borderColor: '#0D9488',
        },
        themeTabText: {
            fontSize: 12,
            fontWeight: '800',
            color: colors.textSecondary,
        },
        themeTabTextActive: {
            color: '#FFFFFF',
        },

        // Property Selector
        propertySelectorContent: {
            gap: 12,
            paddingRight: 20,
        },
        selectorCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 14,
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
            backgroundColor: colors.accentTeal + '08',
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
            backgroundColor: colors.cardBackground,
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

        // Text Area
        textArea: {
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 14,
            padding: 16,
            height: 130,
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '600',
            marginBottom: 16,
        },

        // Generate Button
        generateBtn: {
            backgroundColor: '#0D9488',
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        },
        generateBtnDisabled: { opacity: 0.5 },
        generateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

        // Feature Pills
        featurePillRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 16,
            flexWrap: 'wrap',
        },
        featurePill: {
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
        },
        featurePillText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
        },

        // ── Preview Card ─────────────────────────────────────────────
        previewCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 16,
            marginTop: 16,
            minHeight: 500,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 30,
            elevation: 6,
        },
        previewHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
        },
        previewStatus: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        statusDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#0D9488',
            marginRight: 8,
        },
        previewHeaderTitle: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: 1.2,
        },
        previewActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        iconBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        iconBtnActive: {
            backgroundColor: '#0D9488',
            borderColor: '#0D9488',
        },
        saveBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#0B2046',
            alignItems: 'center',
            justifyContent: 'center',
        },
        saveBtnDisabled: {
            opacity: 0.5,
        },

        // ── Preview Content ──────────────────────────────────────────
        previewContent: { flex: 1 },
        slideWrapper: { flex: 1 },
        slideContainer: {
            borderRadius: 20,
            overflow: 'hidden',
            minHeight: 460,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.surfaceSoft,
        },
        slideImage: {
            width: '100%',
            height: 220,
            resizeMode: 'cover',
        },
        slideImageOverlay: {
            position: 'absolute',
            top: 140,
            left: 0,
            right: 0,
            height: 80,
        },
        slideContent: {
            padding: 20,
            justifyContent: 'flex-start',
        },
        slideChapterBadge: {
            backgroundColor: colors.accentTeal + '15',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            alignSelf: 'flex-start',
            marginBottom: 12,
        },
        slideChapterText: {
            fontSize: 9,
            fontWeight: '900',
            color: colors.accentTeal,
            letterSpacing: 1.5,
        },
        slideTitle: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.textPrimary,
            lineHeight: 28,
            marginBottom: 6,
        },
        slideSubtitle: {
            fontSize: 14,
            fontWeight: '700',
            color: '#0D9488',
            marginBottom: 12,
        },
        slideDivider: {
            width: 30,
            height: 2,
            backgroundColor: colors.accentTeal,
            marginBottom: 16,
            borderRadius: 1,
        },
        slideDescription: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 20,
        },

        // ── Slide Editing ────────────────────────────────────────────
        editSlideContainer: {
            gap: 10,
            marginTop: 4,
            width: '100%',
        },
        editLabel: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 0.5,
        },
        editTitleInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 10,
            padding: 10,
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        editSubtitleInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        editContentInput: {
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            color: colors.textPrimary,
            lineHeight: 18,
            minHeight: 100,
            textAlignVertical: 'top',
        },

        // ── Navigation ──────────────────────────────────────────────
        navigationRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
        },
        progressDots: {
            flexDirection: 'row',
            gap: 6,
        },
        dot: {
            width: 36,
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
            gap: 12,
        },
        navBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        navBtnPrimary: {
            backgroundColor: '#0D9488',
        },
        pageIndicator: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '900',
        },

        // ── States ──────────────────────────────────────────────────
        loaderState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 80,
        },
        loaderTitle: {
            color: colors.textPrimary,
            marginTop: 20,
            fontSize: 16,
            fontWeight: '900',
        },
        loaderSubtitle: {
            color: colors.textMuted,
            marginTop: 8,
            fontSize: 13,
            textAlign: 'center',
            paddingHorizontal: 30,
            lineHeight: 18,
        },
        placeholderState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 80,
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
    });
}
