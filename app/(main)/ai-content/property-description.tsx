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

export default function PropertyDescriptionLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { prefill, content, address } = useLocalSearchParams<{ prefill?: string; content?: string; address?: string }>();

    // Generator states
    const [inputFeatures, setInputFeatures] = useState(prefill || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [output, setOutput] = useState(content || '');
    const [hasGenerated, setHasGenerated] = useState(!!content);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedTone, setSelectedTone] = useState('seo-optimized');

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
        }
    }, [prefill, content]);

    // Generate narrative via real AI API
    const handleGenerate = async () => {
        if (!inputFeatures.trim() || !accessToken) return;
        Keyboard.dismiss();

        setIsGenerating(true);
        setHasGenerated(false);
        setOutput('');

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
            setHasGenerated(false);
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
            await saveAiContent(
                {
                    type: 'property-description',
                    content: output,
                    metadata: {
                        input_details: inputFeatures || '',
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
                            router.back()
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

                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
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

                    {/* Preview & Multimedia — Dark Output Card */}
                    <View style={styles.outputCard}>
                        <View style={styles.outputHeader}>
                            <View style={styles.outputHeaderLeft}>
                                <View style={styles.outputDot} />
                                <Text style={styles.outputHeaderTitle}>PREVIEW & MULTIMEDIA</Text>
                            </View>
                            <View style={styles.outputHeaderActions}>
                                <Pressable
                                    style={[styles.copyIconBtn, !output && styles.btnDisabledDark]}
                                    onPress={handleCopy}
                                    disabled={!output}
                                >
                                    <MaterialCommunityIcons
                                        name={copied ? "check-all" : "content-copy"}
                                        size={16}
                                        color={output ? "#94A3B8" : "#334155"}
                                    />
                                </Pressable>
                                <Pressable
                                    style={[styles.exportBtn, (!output || isSaving) && styles.btnDisabledExport]}
                                    onPress={handleExportNarrative}
                                    disabled={!output || isSaving}
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
                        </View>

                        <View style={styles.outputBody}>
                            {isGenerating ? (
                                <View style={styles.outputPlaceholder}>
                                    <ActivityIndicator size="large" color="#0a2341" />
                                    <Text style={styles.outputPlaceholderTitle}>AI is Synthesizing...</Text>
                                    <Text style={styles.outputPlaceholderSub}>Crafting your premium narrative</Text>
                                </View>
                            ) : hasGenerated ? (
                                <ScrollView
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator={false}
                                    style={styles.outputScrollArea}
                                >
                                    <TextInput
                                        style={styles.outputText}
                                        multiline
                                        value={output}
                                        onChangeText={setOutput}
                                        textAlignVertical="top"
                                        scrollEnabled={false}
                                    />
                                </ScrollView>
                            ) : (
                                <View style={styles.outputPlaceholder}>
                                    <MaterialCommunityIcons name="lightning-bolt-outline" size={44} color="#334155" />
                                    <Text style={styles.outputPlaceholderTitle}>Creative Studio Ready</Text>
                                    <Text style={styles.outputPlaceholderSub}>Select a context to begin synthesis</Text>
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
            height: 140,
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '500',
            marginBottom: 16,
            fontFamily: 'monospace',
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

        // Dark Output Card
        outputCard: {
            backgroundColor: '#0F1D2E',
            borderRadius: 24,
            padding: 20,
            minHeight: 360,
            marginBottom: 32,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 30,
            elevation: 8,
            borderWidth: 1,
            borderColor: '#1E3045',
        },
        outputHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 10,
        },
        outputHeaderLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        outputDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#0a2341',
            marginRight: 10,
        },
        outputHeaderTitle: {
            fontSize: 12,
            fontWeight: '900',
            color: '#E2E8F0',
            letterSpacing: 0.8,
        },
        outputHeaderActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        copyIconBtn: {
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: '#1E3045',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#2D4156',
        },
        exportBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
        },
        exportBtnText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.5,
        },
        btnDisabledDark: {
            opacity: 0.4,
        },
        btnDisabledExport: {
            opacity: 0.5,
        },
        outputBody: {
            flex: 1,
            backgroundColor: '#162234',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#1E3045',
            minHeight: 260,
        },
        outputScrollArea: {
            flex: 1,
            padding: 18,
        },
        outputText: {
            fontSize: 15,
            color: '#CBD5E1',
            lineHeight: 26,
            fontWeight: '500',
        },
        outputPlaceholder: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
        },
        outputPlaceholderTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: '#475569',
            marginTop: 14,
            fontStyle: 'italic',
        },
        outputPlaceholderSub: {
            fontSize: 13,
            color: '#334155',
            marginTop: 4,
            fontWeight: '500',
        },
    });
}
