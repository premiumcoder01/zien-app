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
    View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STYLE_LABELS = ['SEO Optimized', 'Luxury Tone', 'Concise', 'Storytelling'];

const MOCK_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

export default function PropertyDescriptionLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id, prefill, content, address } = useLocalSearchParams<{ id?: string; prefill?: string; content?: string; address?: string }>();

    // Generator states
    const [inputFeatures, setInputFeatures] = useState(prefill || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [output, setOutput] = useState(content || '');
    const [hasGenerated, setHasGenerated] = useState(!!content);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedTone, setSelectedTone] = useState('seo-optimized');

    // Sub-tab workspace view controller
    const [activeViewTab, setActiveViewTab] = useState<'form' | 'preview'>('form');

    // Properties list states
    const [properties, setProperties] = useState<RawPropertyItem[]>([]);
    const [propertiesLoading, setPropertiesLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | number>('custom');

    // Scroll ref
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
            console.error('[PropertyDescription] Error fetching properties:', err);
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
        if (prefill) setInputFeatures(prefill);
        if (content) {
            setOutput(content);
            setHasGenerated(true);
            setActiveViewTab('form'); // Default to Configure Post tab when editing
        }
    }, [prefill, content]);

    // Generate narrative via AI API
    const handleGenerate = async () => {
        if (!inputFeatures.trim() || !accessToken) return;
        Keyboard.dismiss();

        setIsGenerating(true);
        setActiveViewTab('preview'); // Instantly go to preview loader

        try {
            let promptFeatures = inputFeatures.trim();
            if (selectedPropertyId !== 'custom') {
                const prop = properties.find((p) => p.id === selectedPropertyId);
                if (prop) {
                    const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                    promptFeatures = `Property: ${prop.address}\nPrice: ${prop.data?.price || prop.data?.ListPrice || ''}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || ''}/${prop.data?.bathsFull || prop.data?.BathroomsFull || ''}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || ''}\nRemarks: ${remarks}\nUser Context: ${inputFeatures.trim()}`;
                }
            }

            const toneLabel = selectedTone === 'seo-optimized' ? 'SEO Optimized' : selectedTone === 'luxury-tone' ? 'Luxury Tone' : selectedTone === 'concise' ? 'Concise' : 'Storytelling';
            const prompt = `Write a luxury real estate property description. Key features to include: ${promptFeatures}.  Make it engaging, professional, and high-converting. DO NOT use any markdown formatting like asterisks (**) for bolding. Important stylistic rules to apply: ${toneLabel}.`;
            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                setOutput(response.result);
                setHasGenerated(true);
            } else {
                throw new Error('No result received from AI.');
            }
        } catch (err: any) {
            console.error('[PropertyDescription] Generation failed:', err);
            setActiveViewTab('form'); // Fallback to form tab on failure
            Alert.alert('Generation Failed', err?.message || 'Could not generate narrative. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Copy output
    const handleCopy = async () => {
        if (!output) return;
        await Clipboard.setStringAsync(output);
        setCopied(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    // Export / Save narrative to API
    const handleExportNarrative = async () => {
        if (!output || !accessToken) return;
        setIsSaving(true);
        try {
            const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
            const payload = {
                type: 'property-description',
                content: output,
                metadata: {
                    input_details: inputFeatures || '',
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
                            router.replace('/(main)/ai-content');
                        }
                    }
                ]
            );
        } catch (err: any) {
            console.error('[PropertyDescription] Export failed:', err);
            Alert.alert('Export Failed', err?.message || 'Could not save the narrative. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderListingPreview = () => {
        const prop = selectedPropertyId !== 'custom' ? properties.find((p) => p.id === selectedPropertyId) : null;
        const firstImage = prop ? (prop.data?.Media?.[0]?.MediaURL || prop.data?.user_images?.[0]) : null;
        const activeImage = firstImage || MOCK_IMAGE;
        
        const propertyTitle = prop ? prop.address.split(',')[0] : 'Luxury Estate Listing';
        const propertyLocation = prop ? prop.address.split(',').slice(1).join(',').trim() : 'Premium Real Estate';
        const price = prop?.data?.price || prop?.data?.ListPrice || '$1,295,000';
        const beds = prop?.data?.beds || prop?.data?.BedroomsTotal || '4';
        const baths = prop?.data?.bathsFull || prop?.data?.BathroomsFull || '3.5';
        const sqft = prop?.data?.sqft || prop?.data?.LivingArea || '3,200';

        if (isGenerating) {
            return (
                <View style={styles.previewLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.previewLoadingText}>Synthesizing property description...</Text>
                </View>
            );
        }

        if (!output.trim()) {
            return (
                <View style={styles.previewPlaceholderContainer}>
                    <View style={styles.previewPlaceholderIcon}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={styles.previewPlaceholderTitle}>No description generated yet</Text>
                    <Text style={styles.previewPlaceholderDesc}>
                        Go to the "Configure Post" tab to generate a custom property description.
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
            <View style={styles.listingCard}>
                {/* Image Section with Stats Overlay */}
                <View style={styles.listingImageContainer}>
                    <Image source={{ uri: activeImage }} style={styles.listingImage} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.listingStatsOverlay}
                    >
                        <Text style={styles.listingPrice}>{typeof price === 'number' ? `$${price.toLocaleString()}` : price}</Text>
                        <Text style={styles.listingSpecs}>
                            {beds} Beds  •  {baths} Baths  •  {sqft} Sq Ft
                        </Text>
                    </LinearGradient>
                </View>

                {/* Details Section */}
                <View style={styles.listingDetails}>
                    <Text style={styles.listingAddressTitle}>{propertyTitle}</Text>
                    <Text style={styles.listingAddressSub}>{propertyLocation}</Text>
                    
                    <View style={styles.listingDivider} />
                    
                    <Text style={styles.listingSectionTitle}>Property Overview</Text>
                    
                    {/* Editable Description Text Input */}
                    <TextInput
                        style={styles.listingDescriptionInput}
                        multiline
                        scrollEnabled={false}
                        value={output}
                        onChangeText={setOutput}
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
                    title="Property Description Lab"
                    subtitle="Transform raw property details into high-converting architectural narratives."
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

                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        ref={scrollRef}
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {activeViewTab === 'form' ? (
                            <>
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
                                            setInputFeatures(prefill || '');
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
                                                    // Auto-populate the narrative context with remarks/details
                                                    const remarks = prop.data?.publicRemarks || prop.data?.privateRemarks || '';
                                                    const details = `Property details for ${prop.address}:\nPrice: ${prop.data?.price || prop.data?.ListPrice || 'N/A'}\nBeds/Baths: ${prop.data?.beds || prop.data?.BedroomsTotal || 'N/A'}/${prop.data?.bathsFull || prop.data?.BathroomsFull || 'N/A'}\nSqft: ${prop.data?.sqft || prop.data?.LivingArea || 'N/A'}\nRemarks: ${remarks}`;
                                                    setInputFeatures(remarks || details);
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

                                {/* Narrative Context Card */}
                                <View style={styles.inputCard}>
                                    <Text style={styles.cardTitle}>Narrative Context</Text>
                                    <Text style={styles.cardSubtitle}>
                                        Describe the property, key features, architectural style, or the mood you want to convey.
                                    </Text>

                                    <TextInput
                                        style={styles.textArea}
                                        multiline
                                        placeholder="e.g. Modern Malibu mansion with sunrise lighting, architectural pool shot. Mention the 5 bed, 7 bath features..."
                                        placeholderTextColor="#94A3B8"
                                        value={inputFeatures}
                                        onChangeText={setInputFeatures}
                                        textAlignVertical="top"
                                    />

                                    <Pressable
                                        style={[styles.generateBtn, !inputFeatures.trim() && styles.generateBtnDisabled]}
                                        onPress={handleGenerate}
                                        disabled={isGenerating || !inputFeatures.trim()}
                                    >
                                        {isGenerating ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.generateBtnText}>Generate</Text>
                                        )}
                                    </Pressable>

                                    {/* Tone Selector Pills */}
                                    <View style={styles.toneContainer}>
                                        {[
                                            { id: 'seo-optimized', label: 'SEO Optimized' },
                                            { id: 'luxury-tone', label: 'Luxury Tone' },
                                            { id: 'concise', label: 'Concise' },
                                            { id: 'storytelling', label: 'Storytelling' }
                                        ].map((tone) => {
                                            const isActive = selectedTone === tone.id;
                                            return (
                                                <Pressable
                                                    key={tone.id}
                                                    style={[
                                                        styles.tonePill,
                                                        isActive ? styles.tonePillActive : styles.tonePillInactive
                                                    ]}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setSelectedTone(tone.id);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.tonePillText,
                                                            isActive ? styles.tonePillTextActive : styles.tonePillTextInactive
                                                        ]}
                                                    >
                                                        {tone.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.previewContainer}>
                                {/* Listing card mock layout preview */}
                                {renderListingPreview()}

                                {/* Symmetrical Action Row buttons */}
                                {output.trim().length > 0 && (
                                    <View style={styles.previewActionsRow}>
                                        <Pressable
                                            style={[
                                                styles.previewActionBtn,
                                                styles.previewCopyBtn,
                                                copied && styles.previewCopyBtnSuccess
                                            ]}
                                            onPress={handleCopy}
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
                                                {copied ? "Copied" : "Copy Description"}
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
                </KeyboardAvoidingView>
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
        toneContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 16,
        },
        tonePill: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        tonePillActive: {
            backgroundColor: '#0D9488',
        },
        tonePillInactive: {
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        tonePillText: {
            fontSize: 12,
            fontWeight: '700',
        },
        tonePillTextActive: {
            color: '#FFFFFF',
        },
        tonePillTextInactive: {
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

        // Premium simulated Listing Details page mockup
        listingCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 4,
        },
        listingImageContainer: {
            width: '100%',
            height: 220,
            backgroundColor: colors.surfaceSoft,
            position: 'relative',
        },
        listingImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        listingStatsOverlay: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            paddingTop: 30,
        },
        listingPrice: {
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '900',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: -1, height: 1 },
            textShadowRadius: 4,
        },
        listingSpecs: {
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: -1, height: 1 },
            textShadowRadius: 4,
        },
        listingDetails: {
            padding: 20,
        },
        listingAddressTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        listingAddressSub: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 4,
        },
        listingDivider: {
            height: 1,
            backgroundColor: colors.cardBorder,
            marginVertical: 16,
        },
        listingSectionTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 10,
        },
        listingDescriptionInput: {
            fontSize: 14,
            color: colors.textPrimary,
            lineHeight: 22,
            fontWeight: '500',
            padding: 0,
            margin: 0,
            textAlignVertical: 'top',
        },
    });
}
