import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ASSET_TYPES = [
    { id: 'virtual_staging', title: 'Virtual Staging' },
    { id: 'twilight', title: 'Twilight Conversion' },
    { id: 'upscaling', title: '4K Upscaling' },
    { id: 'sky_ replacement', title: 'Sky Replacement' },
];

const STYLE_LABELS = ['Photorealistic', 'High Dynamic Range', '8K Raw', 'Architectural Style'];

const MOCK_BASE_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
const MOCK_ENHANCED_IMAGE = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80';

export default function VisualAssetLabScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedType, setSelectedType] = useState('virtual_staging');
    const [visionBrief, setVisionBrief] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [imageUri, setImageUri] = useState<string>(MOCK_BASE_IMAGE);
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

    const handlePickImage = async (useCamera: boolean) => {
        setIsUploadModalVisible(false);
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Camera access is required to take photos.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    // allowsEditing: true,
                    aspect: [4, 3],
                    quality: 1,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    // allowsEditing: true,
                    aspect: [4, 3],
                    quality: 1,
                });
            }

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
                setHasGenerated(false);
            }
        } catch (error) {
            console.log('Image Picker Error:', error);
        }
    };

    const handleGenerate = () => {
        if (isGenerating) return;

        Keyboard.dismiss();
        setIsGenerating(true);
        setHasGenerated(false);

        // Simulate AI rendering process
        setTimeout(() => {
            setIsGenerating(false);
            setHasGenerated(true);
            // In a real app, the URI would be the processed result
            // Here we just keep the base or switch to enhanced if it was already enhanced
            setImageUri(MOCK_ENHANCED_IMAGE);
        }, 3500);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <PageHeader
                    title="Visual Asset Lab"
                    subtitle="Generate or enhance architectural visuals with precision Zien AI."
                    onBack={() => router.back()}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Asset Type Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeTabs}
                    >
                        {ASSET_TYPES.map((type) => (
                            <Pressable
                                key={type.id}
                                style={[
                                    styles.typeTab,
                                    selectedType === type.id && styles.typeTabActive,
                                ]}
                                onPress={() => setSelectedType(type.id)}
                            >
                                <Text style={[
                                    styles.typeTabText,
                                    selectedType === type.id && styles.typeTabTextActive,
                                ]}>
                                    {type.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Vision Brief Card */}
                    <View style={styles.inputCard}>
                        <Text style={styles.cardHeading}>Vision Brief</Text>
                        <Text style={styles.cardSubtitle}>
                            Describe the desired visual transformation or generate a new scene from architectural keywords.
                        </Text>

                        <TextInput
                            style={styles.textArea}
                            multiline
                            placeholder="e.g. Add luxury modern furniture to this living room, floor-to-ceiling windows with sunset Malibu views, Italian leather accents..."
                            placeholderTextColor="#94A3B8"
                            value={visionBrief}
                            onChangeText={setVisionBrief}
                            textAlignVertical="top"
                        />

                        <View style={styles.inputFooter}>
                            <Pressable
                                style={styles.uploadBtn}
                                onPress={() => setIsUploadModalVisible(true)}
                            >
                                <MaterialCommunityIcons name="upload" size={18} color={colors.textPrimary} />
                                <Text style={styles.uploadBtnText}>Upload Base</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
                                onPress={handleGenerate}
                                disabled={isGenerating}
                            >
                                <Text style={styles.generateBtnText}>Generate</Text>
                            </Pressable>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleList}>
                            {STYLE_LABELS.map((style) => (
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

                    {/* Output Card */}
                    <View style={styles.outputCard}>
                        <View style={styles.outputHeader}>
                            <View style={styles.outputStatus}>
                                <View style={styles.statusDot} />
                                <Text style={styles.outputTitle}>AI RENDERING OUTPUT</Text>
                            </View>
                            <View style={styles.outputActions}>
                                <Pressable style={styles.iconAction}>
                                    <MaterialCommunityIcons name="download" size={18} color="#94A3B8" />
                                </Pressable>
                                <Pressable style={styles.saveBtn}>
                                    <MaterialCommunityIcons name="content-save-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.saveBtnText}>SAVE TO ASSETS</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.outputContent}>
                            {isGenerating ? (
                                <View style={styles.loaderArea}>
                                    <View style={styles.progressCircle}>
                                        <ActivityIndicator size="large" color="#0a2341" />
                                    </View>
                                    <Text style={styles.loaderTitle}>Upscaling Pixels...</Text>
                                    <Text style={styles.loaderSubtitle}>Synthesizing textures and calculating light bounces.</Text>
                                </View>
                            ) : (
                                <View style={styles.imageWrapper}>
                                    <Image source={{ uri: imageUri }} style={styles.mainImage} />
                                    {hasGenerated && (
                                        <View style={styles.enhancedBadge}>
                                            <Text style={styles.enhancedBadgeText}>AI ENHANCED 8K</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Upload Options Modal */}
            <Modal
                transparent
                visible={isUploadModalVisible}
                animationType="fade"
                onRequestClose={() => setIsUploadModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsUploadModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Image Source</Text>
                        <Pressable style={styles.modalOption} onPress={() => handlePickImage(true)}>
                            <MaterialCommunityIcons name="camera" size={24} color={colors.textPrimary} />
                            <Text style={styles.modalOptionText}>Take Picture</Text>
                        </Pressable>
                        <Pressable style={styles.modalOption} onPress={() => handlePickImage(false)}>
                            <MaterialCommunityIcons name="image" size={24} color={colors.textPrimary} />
                            <Text style={styles.modalOptionText}>Upload from Gallery</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20 },

        // Tabs
        typeTabs: {
            paddingVertical: 10,
            gap: 8,
            marginBottom: 20,
        },
        typeTab: {
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginRight: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        typeTabActive: {
            backgroundColor: '#0B2341',
            borderColor: '#0B2341',
        },
        typeTabText: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        typeTabTextActive: {
            color: '#FFFFFF',
        },

        // Card
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
        inputFooter: {
            flexDirection: 'row',
            gap: 12,
            marginBottom: 20,
        },
        uploadBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 12,
            paddingVertical: 14,
            backgroundColor: colors.cardBackground,
        },
        uploadBtnText: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '800',
        },
        generateBtn: {
            backgroundColor: colors.accentTeal,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        generateBtnDisabled: { opacity: 0.6 },
        generateBtnText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '800',
        },
        styleList: { marginTop: 10 },
        stylePill: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            marginRight: 8,
            justifyContent: 'center',
        },
        stylePillActive: {
            backgroundColor: colors.surfaceMuted,
        },
        stylePillText: {
            fontSize: 11,
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
            minHeight: 450,
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
            marginBottom: 20,
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
        saveBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0a2341',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
            gap: 6,
        },
        saveBtnText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '900',
        },
        outputContent: { flex: 1 },
        imageWrapper: {
            width: '100%',
            aspectRatio: 1.2,
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
        },
        mainImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        enhancedBadge: {
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(0,0,0,0.4)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
        },
        enhancedBadgeText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
        },
        loaderArea: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
        },
        progressCircle: {
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        loaderTitle: {
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '900',
            marginBottom: 8,
        },
        loaderSubtitle: {
            color: colors.textMuted,
            fontSize: 13,
            textAlign: 'center',
            paddingHorizontal: 40,
            lineHeight: 18,
        },

        // Modal
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 32,
            gap: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 16,
            textAlign: 'center',
        },
        modalOption: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSoft,
            padding: 20,
            borderRadius: 16,
            gap: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        modalOptionText: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.textPrimary,
        },
    });
}
