import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AiContentItem, deleteAiContent, generateAiText, getAiContentList, saveAiContent } from '@/services/aiContentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PropertyDescriptionLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { prefill, content } = useLocalSearchParams<{ prefill?: string; content?: string }>();

    // Generator states
    const [inputFeatures, setInputFeatures] = useState(prefill || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [output, setOutput] = useState(content || '');
    const [hasGenerated, setHasGenerated] = useState(!!content);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Library states
    const [libraryEntries, setLibraryEntries] = useState<AiContentItem[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Preview modal
    const [selectedItem, setSelectedItem] = useState<AiContentItem | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Scroll ref
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (prefill) setInputFeatures(prefill);
        if (content) {
            setOutput(content);
            setHasGenerated(true);
        }
    }, [prefill, content]);

    // Fetch library entries filtered by type
    const fetchLibrary = useCallback(async (isRefresh = false) => {
        if (!accessToken) return;
        if (isRefresh) setRefreshing(true);
        else setLibraryLoading(true);

        try {
            const response = await getAiContentList(accessToken, 'property-description');
            if (response.success && Array.isArray(response.data)) {
                const sorted = response.data.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setLibraryEntries(sorted);
            }
        } catch (err) {
            console.error('[PropertyDescription] Error fetching library:', err);
        } finally {
            setLibraryLoading(false);
            setRefreshing(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchLibrary();
    }, [fetchLibrary]);

    // Generate narrative via real AI API
    const handleGenerate = async () => {
        if (!inputFeatures.trim() || !accessToken) return;
        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);
        setOutput('');

        try {
            const prompt = `Write a luxury real estate property description. Key features to include: ${inputFeatures.trim()}.  Make it engaging, professional, and high-converting.`;
            const response = await generateAiText(prompt, accessToken, 'complex');

            if (response.result) {
                setHasGenerated(true);
                // Typing animation for premium feel
                let index = 0;
                const textToType = response.result;
                const speed = 10;
                const timer = setInterval(() => {
                    if (index < textToType.length) {
                        setOutput((prev) => prev + textToType.charAt(index));
                        index++;
                    } else {
                        clearInterval(timer);
                    }
                }, speed);
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
            await saveAiContent(
                {
                    type: 'property-description',
                    content: output,
                    metadata: {
                        input_details: inputFeatures || '',
                    },
                },
                accessToken
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Refresh library to show the newly saved item
            fetchLibrary(true);
            Alert.alert('Saved', 'Narrative exported to your AI Sweep Library.');
        } catch (err: any) {
            console.error('[PropertyDescription] Export failed:', err);
            Alert.alert('Export Failed', err?.message || 'Could not save the narrative. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete library item
    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Content',
            'Are you sure you want to delete this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLibraryEntries((prev) => prev.filter((item) => item.id.toString() !== id));
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        if (accessToken) {
                            try {
                                await deleteAiContent(id, accessToken);
                            } catch (err) {
                                console.warn('[PropertyDescription] Delete failed:', err);
                            }
                        }
                    },
                },
            ]
        );
    };

    // Re-load item into preview output
    const handleReload = (item: AiContentItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOutput(item.content);
        setHasGenerated(true);
        // Scroll to top so user sees the Preview & Multimedia card
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
    };

    // Strip markdown for preview
    const formatPreview = (text: string) => {
        if (!text) return '';
        return text.replace(/\*\*|#|\*|`|•/g, '').trim();
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchLibrary(true)}
                            tintColor={colors.accentTeal}
                            colors={[colors.accentTeal]}
                        />
                    }
                >
                    {/* Custom Input Badge */}
                    <View style={styles.customInputRow}>
                        <View style={styles.customInputBadge}>
                            <MaterialCommunityIcons name="cube-outline" size={18} color={colors.accentTeal} />
                            <Text style={styles.customInputText}>CUSTOM INPUT</Text>
                        </View>
                    </View>

                    {/* Narrative Inputs Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.cardLabel}>NARRATIVE INPUTS</Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            placeholder="Describe the mood, key features, or architectural style..."
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
                                <>
                                    <MaterialCommunityIcons name="creation" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateBtnText}>Generate Narrative</Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>ACCURACY</Text>
                            <Text style={[styles.statValue, { color: colors.accentTeal }]}>98.4%</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TIME SAVED</Text>
                            <Text style={styles.statValue}>2.4h</Text>
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
                                            <Text style={styles.exportBtnText}>EXPORT NARRATIVE</Text>
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

                    {/* AI Sweep Library Section */}
                    <View style={styles.librarySection}>
                        <View style={styles.librarySectionHeader}>
                            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textPrimary} />
                            <Text style={styles.librarySectionTitle}>AI Sweep Library</Text>
                        </View>

                        {libraryLoading ? (
                            <View style={styles.libraryLoadingContainer}>
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <View key={i} style={styles.librarySkeletonCard}>
                                        <View style={styles.librarySkeletonBar} />
                                        <View style={[styles.librarySkeletonBar, { width: '70%', marginTop: 8 }]} />
                                        <View style={[styles.librarySkeletonBar, { width: '50%', marginTop: 8 }]} />
                                    </View>
                                ))}
                            </View>
                        ) : libraryEntries.length === 0 ? (
                            <View style={styles.libraryEmpty}>
                                <MaterialCommunityIcons name="folder-open-outline" size={32} color={colors.textMuted} />
                                <Text style={styles.libraryEmptyText}>No saved descriptions yet</Text>
                                <Text style={styles.libraryEmptySubtext}>Generate a narrative to see it here</Text>
                            </View>
                        ) : (
                            libraryEntries.map((item) => (
                                <View key={item.id} style={styles.libraryCard}>
                                    <Pressable
                                        onPress={() => {
                                            setSelectedItem(item);
                                            setShowModal(true);
                                        }}
                                        style={styles.libraryCardContent}
                                    >
                                        <View style={styles.libraryCardTitleRow}>
                                            <View style={styles.libraryCardDot} />
                                            <Text style={styles.libraryCardTitle}>Custom Generation</Text>
                                        </View>
                                        <Text style={styles.libraryCardPreview} numberOfLines={3}>
                                            {formatPreview(item.content)}
                                        </Text>
                                    </Pressable>
                                    <View style={styles.libraryCardActions}>
                                        <Pressable
                                            style={styles.reloadBtn}
                                            onPress={() => handleReload(item)}
                                        >
                                            <Text style={styles.reloadBtnText}>Re-load</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.deleteBtn}
                                            onPress={() => handleDelete(item.id.toString())}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Content Preview Modal */}
            {selectedItem && (
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showModal}
                    onRequestClose={() => setShowModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
                            <View style={styles.modalOverlayBg} />
                        </TouchableWithoutFeedback>

                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalTitleColumn}>
                                    <Text style={styles.modalTitle}>Content Preview</Text>
                                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                                        {selectedItem.metadata?.input_details || 'Generic Property'}
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                                    <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <View style={styles.modalBody}>
                                <ScrollView
                                    style={styles.modalTextBox}
                                    contentContainerStyle={styles.modalTextBoxContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <Text style={styles.modalContentText}>{selectedItem.content}</Text>
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20 },

        // Custom Input Badge
        customInputRow: {
            marginBottom: 20,
            marginTop: 4,
        },
        customInputBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            borderWidth: 2,
            borderColor: colors.accentTeal,
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 12,
            backgroundColor: colors.cardBackground,
            gap: 8,
        },
        customInputText: {
            fontSize: 12,
            fontWeight: '900',
            color: colors.accentTeal,
            letterSpacing: 1,
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
        cardLabel: {
            fontSize: 13,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: 0.8,
            marginBottom: 16,
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

        // Stats Row
        statsRow: {
            flexDirection: 'row',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
            marginBottom: 20,
            alignItems: 'center',
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
            gap: 4,
        },
        statDivider: {
            width: 1,
            height: 36,
            backgroundColor: colors.cardBorder,
        },
        statLabel: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textMuted,
            letterSpacing: 0.8,
        },
        statValue: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.textPrimary,
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

        // AI Sweep Library Section
        librarySection: {
            marginBottom: 20,
        },
        librarySectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
        },
        librarySectionTitle: {
            fontSize: 16,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.3,
        },
        libraryLoadingContainer: {
            gap: 12,
        },
        librarySkeletonCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            opacity: 0.6,
        },
        librarySkeletonBar: {
            height: 14,
            borderRadius: 4,
            backgroundColor: colors.surfaceSoft,
            width: '90%',
        },
        libraryEmpty: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 36,
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        libraryEmptyText: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.textPrimary,
            marginTop: 10,
        },
        libraryEmptySubtext: {
            fontSize: 13,
            color: colors.textMuted,
            marginTop: 4,
            fontWeight: '500',
        },
        libraryCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 12,
            overflow: 'hidden',
        },
        libraryCardContent: {
            padding: 16,
        },
        libraryCardTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
        },
        libraryCardDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#10B981',
        },
        libraryCardTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        libraryCardPreview: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            fontWeight: '500',
        },
        libraryCardActions: {
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 10,
        },
        reloadBtn: {
            flex: 1,
            backgroundColor: colors.surfaceSoft,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        reloadBtnText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        deleteBtn: {
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: '#EF444410',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#EF444420',
        },

        // Content Preview Modal
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        modalOverlayBg: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(11, 22, 33, 0.45)',
        },
        modalContent: {
            backgroundColor: colors.cardBackground,
            borderRadius: 28,
            width: '100%',
            maxHeight: '80%',
            paddingVertical: 24,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            elevation: 10,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingBottom: 16,
        },
        modalTitleColumn: {
            flex: 1,
            gap: 4,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        modalSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            fontWeight: '600',
            marginTop: 2,
        },
        modalCloseBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        modalBody: {
            paddingHorizontal: 24,
            marginTop: 8,
            flex: 1,
            minHeight: 300,
        },
        modalTextBox: {
            backgroundColor: colors.surfaceSoft,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            flex: 1,
        },
        modalTextBoxContent: {
            padding: 20,
        },
        modalContentText: {
            fontSize: 15,
            color: colors.textPrimary,
            lineHeight: 24,
            fontWeight: '500',
        },
    });
}
