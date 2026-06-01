import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PropertyContext {
    id: string;
    title: string;
    address: string;
    image: string;
}

const PROPERTIES: PropertyContext[] = [
    { id: 'generic', title: 'Generic / No Context', address: 'Manual Brief Only', image: '' },
    { id: 'la_villa', title: 'Los Angeles Villa', address: '123 Business Way', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=100&q=80' },
    { id: 'malibu_villa', title: 'Malibu Villa', address: '88 Gold Coast', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=100&q=80' },
    { id: 'beverly_hills', title: 'Beverly Hills Villa', address: '45 Sunset Blvd', image: 'https://images.unsplash.com/photo-1600596542815-6ad4c727dddf?auto=format&fit=crop&w=100&q=80' },
    { id: 'miami_villa', title: 'Miami Villa', address: '22 Ocean Drive', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=100&q=80' },
];

const NARRATIVE_STYLES = [
    { id: 'luxury', title: 'Luxury Executive', icon: 'book-open-variant' },
    { id: 'minimal', title: 'Modern Minimal', icon: 'view-quilt', color: '#0a2341' },
    { id: 'bold', title: 'Bold Investment', icon: 'file-document-outline', color: '#F97316' },
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

    const [property, setProperty] = useState(PROPERTIES[0]);
    const [style, setStyle] = useState(NARRATIVE_STYLES[0]);
    const [brief, setBrief] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Dropdown visibility
    const [showPropDropdown, setShowPropDropdown] = useState(false);
    const [showStyleDropdown, setShowStyleDropdown] = useState(false);

    const handleGenerate = () => {
        if (isGenerating) return;
        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);

        setTimeout(() => {
            setIsGenerating(false);
            setHasGenerated(true);
            setCurrentSlideIndex(0);
        }, 3000);
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

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={!showPropDropdown && !showStyleDropdown}
                >
                    {/* Selectors Row */}
                    <View style={[styles.selectorsRow, { zIndex: (showPropDropdown || showStyleDropdown) ? 5000 : 100 }]}>
                        <View style={[styles.selectorWrapper, { zIndex: showPropDropdown ? 2000 : 100 }]}>
                            <Text style={styles.selectorLabel}>TARGET PROPERTY</Text>
                            <Pressable
                                style={[styles.selectorBtn, showPropDropdown && styles.selectorBtnActive]}
                                onPress={() => {
                                    setShowPropDropdown(!showPropDropdown);
                                    setShowStyleDropdown(false);
                                }}
                            >
                                <MaterialCommunityIcons name="cube-outline" size={18} color={colors.textPrimary} />
                                <Text style={styles.selectorValue} numberOfLines={1}>
                                    {property.id === 'generic' ? 'Select Property Context' : property.title}
                                </Text>
                                <MaterialCommunityIcons name={showPropDropdown ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
                            </Pressable>

                            {showPropDropdown && (
                                <View style={styles.dropdown}>
                                    {PROPERTIES.map((p) => (
                                        <Pressable
                                            key={p.id}
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setProperty(p);
                                                setShowPropDropdown(false);
                                            }}
                                        >
                                            {p.image ? (
                                                <Image source={{ uri: p.image }} style={styles.optionImage} />
                                            ) : (
                                                <View style={styles.optionIconPlaceholder}>
                                                    <MaterialCommunityIcons name="cube-outline" size={16} color={colors.textPrimary} />
                                                </View>
                                            )}
                                            <View style={styles.optionTextCenter}>
                                                <Text style={styles.optionTitle}>{p.title}</Text>
                                                <Text style={styles.optionSubtitle}>{p.address}</Text>
                                            </View>
                                            {property.id === p.id && <MaterialCommunityIcons name="check" size={16} color="#0a2341" />}
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={[styles.selectorWrapper, { zIndex: showStyleDropdown ? 2000 : 50 }]}>
                            <Text style={styles.selectorLabel}>VISUAL NARRATIVE STYLE</Text>
                            <Pressable
                                style={[styles.selectorBtn, showStyleDropdown && styles.selectorBtnActive]}
                                onPress={() => {
                                    setShowStyleDropdown(!showStyleDropdown);
                                    setShowPropDropdown(false);
                                }}
                            >
                                <MaterialCommunityIcons name={style.icon as any} size={18} color={style.color || colors.textPrimary} />
                                <Text style={styles.selectorValue}>{style.title}</Text>
                                <MaterialCommunityIcons name={showStyleDropdown ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
                            </Pressable>

                            {showStyleDropdown && (
                                <View style={styles.dropdown}>
                                    {NARRATIVE_STYLES.map((s) => (
                                        <Pressable
                                            key={s.id}
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setStyle(s);
                                                setShowStyleDropdown(false);
                                            }}
                                        >
                                            <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color || colors.textPrimary} />
                                            <Text style={styles.optionTitleStyle}>{s.title}</Text>
                                            {style.id === s.id && <MaterialCommunityIcons name="check" size={16} color="#0a2341" />}
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Brief Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.cardHeading}>Deck Objective</Text>
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
                            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
                            onPress={handleGenerate}
                            disabled={isGenerating}
                        >
                            <Text style={styles.generateBtnText}>Generate</Text>
                        </Pressable>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillList} scrollEnabled={false}>
                            {['PDF Export', 'Dynamic Charts', 'Brand Assets', 'Multi-Device'].map((pill) => (
                                <View key={pill} style={styles.pill}><Text style={styles.pillText}>{pill}</Text></View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Preview Engine Card */}
                    <View style={styles.outputCard}>
                        <View style={styles.outputHeader}>
                            <View style={styles.outputStatus}>
                                <View style={styles.statusDot} />
                                <Text style={styles.outputTitle}>PREVIEW ENGINE</Text>
                            </View>
                            <View style={styles.outputActions}>
                                <Pressable style={styles.iconAction}>
                                    <MaterialCommunityIcons name="download" size={16} color="#94A3B8" />
                                </Pressable>
                                {hasGenerated && (
                                    <View style={styles.mainActions}>
                                        <Pressable style={styles.editBtn}>
                                            <MaterialCommunityIcons name="pencil-outline" size={14} color="#CBD5E1" />
                                        </Pressable>
                                        <Pressable style={styles.exportBtn}>
                                            <MaterialCommunityIcons name="share-variant-outline" size={14} color="#FFFFFF" />
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.outputContent}>
                            {isGenerating ? (
                                <View style={styles.loaderState}>
                                    <ActivityIndicator size="large" color="#0a2341" />
                                    <Text style={styles.loaderText}>Assembling architectural deck...</Text>
                                </View>
                            ) : hasGenerated ? (
                                <View style={styles.presentationView}>
                                    <View style={styles.slideContainer}>
                                        <Image source={{ uri: SLIDES[currentSlideIndex].image }} style={styles.slideImage} />
                                        <View style={styles.slideContent}>
                                            <Text style={styles.slideChapter}>{SLIDES[currentSlideIndex].chapter}</Text>
                                            <Text style={styles.slideTitle}>{SLIDES[currentSlideIndex].title}</Text>
                                            <Text style={styles.slideSubtitle}>{SLIDES[currentSlideIndex].subtitle}</Text>
                                            <View style={styles.slideDivider} />
                                            <Text style={styles.slideDescription}>{SLIDES[currentSlideIndex].description}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.navigationRow}>
                                        <View style={styles.progressDots}>
                                            {SLIDES.map((_, i) => (
                                                <View key={i} style={[styles.dot, currentSlideIndex === i && styles.dotActive]} />
                                            ))}
                                        </View>
                                        <View style={styles.navControls}>
                                            <Pressable
                                                style={styles.navBtn}
                                                onPress={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                                            >
                                                <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
                                            </Pressable>
                                            <Text style={styles.pageIndicator}>
                                                {String(currentSlideIndex + 1).padStart(2, '0')}/{String(SLIDES.length).padStart(2, '0')}
                                            </Text>
                                            <Pressable
                                                style={[styles.navBtn, styles.navBtnPrimary]}
                                                onPress={() => setCurrentSlideIndex(Math.min(SLIDES.length - 1, currentSlideIndex + 1))}
                                            >
                                                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.placeholderState}>
                                    <MaterialCommunityIcons name="lightning-bolt-outline" size={48} color="#1E293B" />
                                    <Text style={styles.placeholderTitle}>Presentation Lab Ready</Text>
                                    <Text style={styles.placeholderSubtitle}>Enter your property brief and select a template to generate a professional deck.</Text>
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

        // Selectors
        selectorsRow: {
            gap: 16,
            marginBottom: 24,
        },
        selectorWrapper: {
            width: '100%',
            gap: 8,
            position: 'relative',
        },
        selectorLabel: {
            fontSize: 11,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: 0.8,
            marginBottom: 4,
        },
        selectorBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 12,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.02,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 1,
        },
        selectorBtnActive: {
            borderColor: '#0a2341',
            borderWidth: 2,
        },
        selectorValue: {
            flex: 1,
            fontSize: 14,
            fontWeight: '700',
            color: colors.textPrimary,
        },

        // Dropdown
        dropdown: {
            position: 'absolute',
            top: 84,
            left: 0,
            right: 0,
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 8,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 20,
            zIndex: 2000,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        dropdownOption: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            borderRadius: 14,
            gap: 12,
        },
        optionImage: {
            width: 40,
            height: 40,
            borderRadius: 10,
        },
        optionIconPlaceholder: {
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        optionTextCenter: {
            flex: 1,
        },
        optionTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        optionSubtitle: {
            fontSize: 11,
            color: colors.textMuted,
        },
        optionTitleStyle: {
            flex: 1,
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },

        // Brief Card
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
            height: 150,
            fontSize: 15,
            color: colors.textPrimary,
            fontWeight: '600',
            marginBottom: 20,
        },
        generateBtn: {
            backgroundColor: colors.accentTeal,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 20,
        },
        generateBtnDisabled: { opacity: 0.6 },
        generateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
        pillList: { flexDirection: 'row', gap: 8 },
        pill: { backgroundColor: colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
        pillText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

        // Output Card
        outputCard: {
            backgroundColor: colors.cardBackgroundSemi,
            borderRadius: 24,
            padding: 16,
            minHeight: 550,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        outputHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
        },
        outputStatus: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        statusDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#0a2341',
            marginRight: 8
        },
        outputTitle: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: 1.2
        },
        outputActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
        },
        mainActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        iconAction: {
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center'
        },
        editBtn: {
            width: 34,
            height: 34,
            backgroundColor: colors.surfaceSoft,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        editBtnText: { color: '#CBD5E1', fontSize: 8, fontWeight: '900' },
        exportBtn: {
            backgroundColor: '#0a2341',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
        },
        exportBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },

        // Presentation View
        outputContent: { flex: 1 },
        presentationView: { flex: 1 },
        slideContainer: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            overflow: 'hidden',
            minHeight: 480,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        slideImage: { width: '100%', height: 220, resizeMode: 'cover' },
        slideContent: { padding: 20, justifyContent: 'flex-start' },
        slideChapter: { fontSize: 10, fontWeight: '900', color: colors.textMuted, marginBottom: 6, letterSpacing: 1 },
        slideTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, lineHeight: 28, marginBottom: 8 },
        slideSubtitle: { fontSize: 14, fontWeight: '700', color: '#0a2341', marginBottom: 12 },
        slideDivider: { width: 30, height: 2, backgroundColor: colors.textPrimary, marginBottom: 16 },
        slideDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

        // Nav
        navigationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
        progressDots: { flexDirection: 'row', gap: 6 },
        dot: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surfaceSoft },
        dotActive: { backgroundColor: '#0a2341' },
        navControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
        navBtnPrimary: { borderWidth: 2, borderColor: '#0a2341' },
        pageIndicator: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },

        // States
        loaderState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        loaderText: { color: colors.textMuted, marginTop: 16, fontSize: 14 },
        placeholderState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
        placeholderTitle: { fontSize: 16, fontWeight: '900', color: colors.textSecondary, marginTop: 16 },
        placeholderSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 18 },
    });
};
