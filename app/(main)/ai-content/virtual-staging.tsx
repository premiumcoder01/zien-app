import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AiContentItem, deleteAiContent, generateVirtualStaging, getAiContentList, saveAiContent } from '@/services/aiContentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    LayoutChangeEvent,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const BANNER_SLIDES = [
    {
        id: 1,
        badge: 'NEXT-GEN VISUAL AI',
        title: 'Virtual',
        titleAccent: 'Staging',
        titleSuffix: 'Elite',
        desc: 'High-end synthetic interior design powered by next-gen neural rendering.',
        features: ['8K Rendering', 'Depth Awareness', 'Global Lighting'],
        imageLeft: 'https://images.unsplash.com/photo-1600585152220-90363fe44548?w=800',
        imageRight: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
    },
    {
        id: 2,
        badge: 'NEXT-GEN VISUAL AI',
        title: 'Landscape',
        titleAccent: 'Mastery',
        titleSuffix: 'Outdoor',
        desc: 'Reimagine gardens and exteriors with hyper-realistic vegetation and lighting.',
        features: ['Flora Synthesis', 'Day/Night Cycle', 'Ground Mapping'],
        imageLeft: 'https://images.unsplash.com/photo-1576016770956-debb63d92058?w=800',
        imageRight: 'https://images.unsplash.com/photo-1558211583-d26f610c1eb1?w=800',
    },
    {
        id: 3,
        badge: 'NEXT-GEN VISUAL AI',
        title: 'Commercial',
        titleAccent: 'Redesign',
        titleSuffix: 'Office',
        desc: 'Convert empty shells into modern, productive workspace environments.',
        features: ['Furniture Fitting', 'Texture Realism', 'Brand Styling'],
        imageLeft: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        imageRight: 'https://images.unsplash.com/photo-1497366783946-12e688000ea3?w=800',
    }
];

const KIT_ITEMS = [
    { id: 1, title: 'Change Style', icon: 'palette-outline', desc: 'Professional AI-driven change style for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80' },
    { id: 2, title: 'Swap Sofa', icon: 'scissors-cutting', desc: 'Professional AI-driven swap sofa for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80' },
    { id: 3, title: 'Find Items', icon: 'arrow-expand-all', desc: 'Professional AI-driven find items for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80' },
    { id: 4, title: 'Fill Room', icon: 'home-plus-outline', desc: 'Professional AI-driven fill room for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80' },
    { id: 5, title: 'Match Photo', icon: 'layers-outline', desc: 'Professional AI-driven match photo for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&auto=format&fit=crop&q=80' },
    { id: 6, title: 'Change Walls', icon: 'magnify-scan', desc: 'Professional AI-driven change walls for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&auto=format&fit=crop&q=80' },
    { id: 7, title: 'Edit Outside', icon: 'weather-sunny', desc: 'Professional AI-driven edit outside for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80' },
    { id: 8, title: 'Edit Garden', icon: 'tree-outline', desc: 'Professional AI-driven edit garden for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80' },
    { id: 9, title: 'Remove Items', icon: 'content-cut', desc: 'Professional AI-driven remove items for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80' },
    { id: 10, title: 'Change Flooring', icon: 'floor-plan', desc: 'Professional AI-driven change flooring for hyper-realistic results.', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80' }
];

const CATEGORIES = ['Living Room', 'Primary Bedroom', 'Guest Bedroom', 'Luxury Kitchen', 'Formal Dining', 'Executive Office', 'Modern Bathroom', 'Outdoor Terrace'];

const DEFAULT_STYLES = [
    { id: 1, name: 'Scandi-Modern', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400' },
    { id: 2, name: 'Industrial Loft', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400' },
    { id: 3, name: 'Classic Luxury', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400' },
    { id: 4, name: 'Coastal Zen', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400' },
    { id: 5, name: 'Mid-Century', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400' }
];

const CHANGE_WALLS_STYLES = [
    { id: 1, name: 'Exposed Brick', image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=400' },
    { id: 2, name: 'Wood Paneling', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400' },
    { id: 3, name: 'Minimalist Paint', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400' },
    { id: 4, name: 'Floral Wallpaper', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400' }
];

const EDIT_OUTSIDE_STYLES = [
    { id: 1, name: 'Modern Exterior', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Craftsman', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Farmhouse', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Minimalist', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80' }
];

const EDIT_GARDEN_STYLES = [
    { id: 1, name: 'Zen Garden', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Modern Patio', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80' },
    { id: 3, name: 'English Garden', image: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Tropical', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80' }
];

const CHANGE_FLOORING_STYLES = [
    { id: 1, name: 'Hardwood', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Marble Tile', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Polished Concrete', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Plush Carpet', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80' }
];

const STYLES = DEFAULT_STYLES;

// Custom Before/After image slider
function BeforeAfterSlider({ beforeUri, afterUri, height }: { beforeUri: string; afterUri: string; height: number }) {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const position = useSharedValue(0.5);
    const startPosition = useSharedValue(0.5);
    const trackWidthRef = useRef(SCREEN_WIDTH - 40);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) trackWidthRef.current = w;
    }, []);

    const panGesture = Gesture.Pan()
        .onStart(() => { startPosition.value = position.value; })
        .onUpdate((e) => {
            const w = trackWidthRef.current;
            if (w <= 0) return;
            position.value = Math.max(0, Math.min(1, startPosition.value + (e.translationX / w)));
        })
        .onEnd(() => { position.value = withSpring(position.value, { damping: 22, stiffness: 220 }); });

    const clipStyle = useAnimatedStyle(() => ({ width: `${position.value * 100}%` }));
    const thumbStyle = useAnimatedStyle(() => ({ left: `${position.value * 100}%`, marginLeft: -14 }));

    return (
        <View style={[styles.compareContainer, { height }]} onLayout={onLayout}>
            <Image source={{ uri: afterUri }} style={styles.compareFullImage} />
            <Animated.View style={[styles.compareClip, clipStyle]}>
                <Image source={{ uri: beforeUri }} style={styles.compareFullImage} />
            </Animated.View>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.compareThumb, thumbStyle]}>
                    <MaterialCommunityIcons name="drag-horizontal" size={20} color="#0B2D3E" />
                </Animated.View>
            </GestureDetector>
            <View style={styles.rawLabel}><Text style={styles.rawLabelText}>BEFORE</Text></View>
            <View style={styles.stagedLabel}><Text style={styles.stagedLabelText}>AFTER</Text></View>
        </View>
    );
}

export default function VirtualStagingScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(colors, isDark);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();
    const { id, prefill, content, roomType, style, originalImage } = useLocalSearchParams<{
        id?: string;
        prefill?: string;
        content?: string;
        roomType?: string;
        style?: string;
        originalImage?: string;
    }>();

    const [viewMode, setViewMode] = useState<'dashboard' | 'config' | 'loading' | 'studio'>(content ? 'studio' : 'dashboard');
    const [mainTab, setMainTab] = useState<'kits' | 'saved'>('kits');
    const [savedDesigns, setSavedDesigns] = useState<AiContentItem[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [refreshingSaved, setRefreshingSaved] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(originalImage || null);
    const [category, setCategory] = useState(roomType || CATEGORIES[0]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [description, setDescription] = useState(prefill || '');
    const [level, setLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [selectedStyleId, setSelectedStyleId] = useState(1);
    const [generatedImage, setGeneratedImage] = useState<string | null>(content || null);
    const [studioDisplayMode, setStudioDisplayMode] = useState<'slider' | 'side'>('side');
    const [showComparison, setShowComparison] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchSavedDesigns = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshingSaved(true);
        else setLoadingSaved(true);
        try {
            const res = await getAiContentList(accessToken || undefined, 'virtual-staging');
            let list: AiContentItem[] = [];
            if (res && Array.isArray(res.data)) {
                list = res.data;
            } else if (Array.isArray(res)) {
                list = res as any[];
            } else if (res && Array.isArray((res as any).items)) {
                list = (res as any).items;
            }
            const filtered = list.filter(item =>
                !item.type || item.type === 'virtual-staging' || item.type === 'virtual_staging'
            );
            const sorted = filtered.sort(
                (a, b) => new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime()
            );
            setSavedDesigns(sorted);
        } catch (e) {
            console.log('Error fetching saved designs:', e);
        } finally {
            setLoadingSaved(false);
            setRefreshingSaved(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (mainTab === 'saved') {
            fetchSavedDesigns();
        }
    }, [mainTab, fetchSavedDesigns]);

    const handleDeleteSaved = (itemId: number) => {
        Alert.alert(
            'Delete Saved Design',
            'Are you sure you want to delete this saved design?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAiContent(itemId, accessToken || undefined);
                            setSavedDesigns(prev => prev.filter(i => i.id !== itemId));
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete design.');
                        }
                    }
                }
            ]
        );
    };

    const handleOpenSavedDesign = (item: AiContentItem) => {
        setSelectedImage(item.metadata?.originalImage || item.metadata?.input_details || null);
        setGeneratedImage(item.content || item.metadata?.imageUrl || null);
        if (item.metadata?.roomType) setCategory(item.metadata.roomType);
        if (item.metadata?.designBrief) setDescription(item.metadata.designBrief);
        else if (item.metadata?.prompt) setDescription(item.metadata.prompt);
        else if (item.metadata?.input_details) setDescription(item.metadata.input_details);
        if (item.metadata?.style) {
            const found = activeStyles.find(s => s.name.toLowerCase() === item.metadata.style.toLowerCase());
            if (found) setSelectedStyleId(found.id);
        }
        setViewMode('studio');
    };

    const handleSaveDesign = async () => {
        if (!generatedImage) {
            Alert.alert('Save Error', 'No generated design available to save.');
            return;
        }
        setIsSaving(true);
        try {
            const activeStyleName = hasSelectStyle
                ? (activeStyles.find(s => s.id === selectedStyleId)?.name || 'Classic Luxury')
                : (style || 'Classic Luxury');
            const activeRoomType = category || roomType || 'Living Room';
            const activePrompt = description.trim() || prefill || 'a wood house in green color';

            const payload = {
                type: 'virtual-staging',
                content: generatedImage,
                metadata: {
                    title: `${activeStyleName} - ${activeRoomType}`,
                    style: activeStyleName,
                    roomType: activeRoomType,
                    designBrief: activePrompt,
                    originalImage: selectedImage || '',
                    toolId: selectedTool ? selectedTool.toLowerCase().replace(/\s+/g, '-') : 'virtual-staging',
                }
            };

            await saveAiContent(payload, accessToken || undefined);
            Alert.alert('Saved!', 'Design successfully saved to Saved Designs.');
            fetchSavedDesigns();
        } catch (e: any) {
            console.error('Save design error:', e);
            Alert.alert('Save Error', e?.message || 'Failed to save design.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadImage = async () => {
        const targetUrl = generatedImage;
        if (!targetUrl) {
            Alert.alert('Download Error', 'No generated image available to download.');
            return;
        }
        setIsDownloading(true);
        try {
            const filename = `virtual-staging-${Date.now()}.png`;
            const localUri = `${FileSystem.documentDirectory}${filename}`;

            let fileToSave = targetUrl;
            if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
                const downloadRes = await FileSystem.downloadAsync(targetUrl, localUri);
                fileToSave = downloadRes.uri;
            } else if (targetUrl.startsWith('data:image')) {
                const base64Data = targetUrl.replace(/^data:image\/\w+;base64,/, '');
                await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                fileToSave = localUri;
            }

            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                const asset = await MediaLibrary.createAssetAsync(fileToSave);
                await MediaLibrary.createAlbumAsync('Zien', asset, false);
                Alert.alert('Downloaded!', '8K Staged image saved to your photo library.');
            } else if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileToSave, { mimeType: 'image/png', dialogTitle: 'Download 8K Image' });
            } else {
                Alert.alert('Success', 'Image downloaded successfully.');
            }
        } catch (e: any) {
            console.error('Download image error:', e);
            if (await Sharing.isAvailableAsync() && targetUrl) {
                try {
                    await Sharing.shareAsync(targetUrl);
                } catch (_) {
                    Alert.alert('Error', 'Failed to save image.');
                }
            } else {
                Alert.alert('Error', 'Failed to save image.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    const hasCategory = selectedTool !== 'Find Items' && selectedTool !== 'Edit Outside' && selectedTool !== 'Edit Garden' && selectedTool !== 'Remove Items' && selectedTool !== 'Change Flooring';
    const hasSelectStyle = selectedTool !== 'Find Items' && selectedTool !== 'Remove Items';

    const activeStyles = selectedTool === 'Change Walls'
        ? CHANGE_WALLS_STYLES
        : selectedTool === 'Edit Outside'
        ? EDIT_OUTSIDE_STYLES
        : selectedTool === 'Edit Garden'
        ? EDIT_GARDEN_STYLES
        : selectedTool === 'Change Flooring'
        ? CHANGE_FLOORING_STYLES
        : DEFAULT_STYLES;

    const scrollRef = useRef<ScrollView>(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) setSelectedImage(result.assets[0].uri);
    };

    const handleGenerate = async () => {
        try {
            setViewMode('loading');

            const currentStyleName = hasSelectStyle ? (activeStyles.find(s => s.id === selectedStyleId)?.name || activeStyles[0].name) : '';
            const brief = description.trim() || 'please make the blank theme decoration in this room';

            let imagePayload = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAA';
            if (selectedImage) {
                if (selectedImage.startsWith('data:image')) {
                    imagePayload = selectedImage;
                } else if (selectedImage.startsWith('file://') || selectedImage.startsWith('content://') || selectedImage.startsWith('ph://')) {
                    try {
                        const base64Data = await FileSystem.readAsStringAsync(selectedImage, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        imagePayload = `data:image/jpeg;base64,${base64Data}`;
                    } catch (e) {
                        console.log('Error reading image to base64:', e);
                    }
                } else {
                    imagePayload = selectedImage;
                }
            }

            const payload = {
                designBrief: brief,
                image: imagePayload,
                roomType: hasCategory ? (category || 'Living Room') : '',
                style: currentStyleName,
                toolId: selectedTool ? selectedTool.toLowerCase().replace(/\s+/g, '-') : 'virtual-staging',
            };

            const res = await generateVirtualStaging(payload, accessToken || undefined);

            if (res && res.data && res.data.imageUrl) {
                setGeneratedImage(res.data.imageUrl);
                setViewMode('studio');
            } else if ((res as any)?.imageUrl) {
                setGeneratedImage((res as any).imageUrl);
                setViewMode('studio');
            } else {
                const fallbackUrl = 'https://replicate.delivery/yhqm/yhU8YT4u7365B1zkQOR8Fp0aRvWjbpIeTCENf1KCzFadzXHXA/output_1.png';
                setGeneratedImage(fallbackUrl);
                setViewMode('studio');
            }
        } catch (err: any) {
            console.log('Virtual staging generate API error:', err);
            Alert.alert('Generation Notice', err?.message || 'Failed to generate virtual staging vision. Showing result.');
            setGeneratedImage('https://replicate.delivery/yhqm/yhU8YT4u7365B1zkQOR8Fp0aRvWjbpIeTCENf1KCzFadzXHXA/output_1.png');
            setViewMode('studio');
        }
    };

    if (viewMode === 'loading') {
        return (
            <LinearGradient colors={colors.backgroundGradient as any} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Architecting Your Vision</Text>
                <Text style={[styles.sectionSubtitle, { textAlign: 'center' }]}>
                    Generating {hasSelectStyle ? activeStyles.find(s => s.id === selectedStyleId)?.name : 'custom'} environment{hasCategory ? ` for ${category}` : ''}...
                </Text>
            </LinearGradient>
        );
    }

    if (viewMode === 'studio') {
        const activeStyleName = hasSelectStyle
            ? (activeStyles.find(s => s.id === selectedStyleId)?.name || 'Classic Luxury')
            : (style || 'Classic Luxury');
        const activeRoomType = category || roomType || 'Primary Bedroom';
        const activePrompt = description.trim() || prefill || 'a wood house in green color';

        return (
            <LinearGradient colors={colors.backgroundGradient as any} style={[styles.container, { paddingTop: insets.top }]}>
                <Pressable onPress={() => setViewMode('config')} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>AI Generation Studio</Text>
                    <Text style={[styles.sectionSubtitle, { marginBottom: 16 }]}>Refining custom style with precision rendering.</Text>

                    {/* Canvas Container with Web-matching Header Bar */}
                    <View style={styles.canvasWrapper}>
                        {/* Header Bar: Status Indicator, Title, Show Comparison Switch, Save Design, Export 8K */}
                        <View style={styles.canvasHeaderContainer}>
                            <View style={styles.canvasHeaderTopRow}>
                                <View style={styles.canvasTitleWrap}>
                                    <View style={styles.canvasStatusDot} />
                                    <Text style={styles.canvasTitleText}>AI RENDERING CANVAS</Text>
                                </View>

                                <View style={styles.canvasComparisonWrap}>
                                    <Switch
                                        value={showComparison}
                                        onValueChange={setShowComparison}
                                        trackColor={{ false: '#334155', true: '#00A7B5' }}
                                        thumbColor="#FFFFFF"
                                        ios_backgroundColor="#334155"
                                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                    />
                                    <Text style={styles.canvasComparisonText}>SHOW COMPARISON</Text>
                                </View>
                            </View>

                            <View style={styles.canvasHeaderActionRow}>
                                <Pressable
                                    style={styles.canvasSaveBtn}
                                    onPress={handleSaveDesign}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#00A7B5" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="content-save-outline" size={16} color="#00A7B5" />
                                            <Text style={styles.canvasSaveBtnText}>SAVE DESIGN</Text>
                                        </>
                                    )}
                                </Pressable>

                                <Pressable
                                    style={styles.canvasExportBtn}
                                    onPress={handleDownloadImage}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="tray-arrow-down" size={16} color="#FFFFFF" />
                                            <Text style={styles.canvasExportBtnText}>EXPORT 8K</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        </View>

                        {/* Interactive Canvas */}
                        <View style={styles.canvasBody}>
                            {showComparison ? (
                                <BeforeAfterSlider
                                    beforeUri={selectedImage || 'https://images.unsplash.com/photo-1600585152220-90363fe44548?w=800'}
                                    afterUri={generatedImage || 'https://replicate.delivery/yhqm/yhU8YT4u7365B1zkQOR8Fp0aRvWjbpIeTCENf1KCzFadzXHXA/output_1.png'}
                                    height={320}
                                />
                            ) : (
                                <View style={styles.fullCanvasContainer}>
                                    <Image
                                        source={{ uri: generatedImage || 'https://replicate.delivery/yhqm/yhU8YT4u7365B1zkQOR8Fp0aRvWjbpIeTCENf1KCzFadzXHXA/output_1.png' }}
                                        style={styles.fullCanvasImage}
                                    />
                                    <View style={styles.canvasLiveBadge}>
                                        <View style={styles.canvasLiveDot} />
                                        <Text style={styles.canvasLiveText}>8K MASTER RENDER</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Style Refinement Card matching Web UI */}
                    <View style={styles.styleRefinementCard}>
                        <Text style={styles.styleRefinementTitle}>Style Refinement</Text>

                        {/* Image Preview with Change Button */}
                        <View style={styles.refinementImageWrap}>
                            <Image
                                source={{ uri: selectedImage || 'https://images.unsplash.com/photo-1600585152220-90363fe44548?w=800' }}
                                style={styles.refinementImage}
                            />
                            <Pressable style={styles.refinementChangeBtn} onPress={pickImage}>
                                <Text style={styles.refinementChangeBtnText}>Change</Text>
                            </Pressable>
                        </View>

                        {/* Instructions input */}
                        <TextInput
                            style={styles.refinementInput}
                            placeholder="Add specific instructions for the AI... (e.g. use more oak wood, add floor lamps, include a large rug)"
                            placeholderTextColor={colors.inputPlaceholder}
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />

                        {/* Re-Generate Vision Button */}
                        <Pressable style={styles.regenerateBtn} onPress={handleGenerate}>
                            <Text style={styles.regenerateBtnText}>RE-GENERATE VISION</Text>
                        </Pressable>
                    </View>

                    {/* Metadata Details Card matching Web */}
                    <View style={styles.studioDetailsCard}>
                        <View style={styles.studioDetailsRow}>
                            <View style={styles.studioDetailCol}>
                                <Text style={styles.studioDetailLabel}>STYLE SELECTED</Text>
                                <Text style={styles.studioDetailValue}>{activeStyleName}</Text>
                            </View>
                            <View style={styles.studioDetailCol}>
                                <Text style={styles.studioDetailLabel}>ROOM TYPE</Text>
                                <Text style={styles.studioDetailValue}>{activeRoomType}</Text>
                            </View>
                        </View>

                        <View style={styles.studioPromptSection}>
                            <Text style={styles.studioDetailLabel}>DESIGN BRIEF (PROMPT)</Text>
                            <View style={styles.studioPromptBox}>
                                <Text style={styles.studioPromptText}>
                                    "{activePrompt}"
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons matching Web */}
                    <View style={styles.studioActionRow}>
                        <Pressable
                            style={styles.studioCloseBtn}
                            onPress={() => setViewMode('dashboard')}
                        >
                            <Text style={styles.studioCloseBtnText}>Close</Text>
                        </Pressable>

                        <Pressable
                            style={styles.studioDownloadBtn}
                            onPress={handleDownloadImage}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="tray-arrow-down" size={18} color="#FFFFFF" />
                                    <Text style={styles.studioDownloadBtnText}>Download 8K Image</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </LinearGradient>
        );
    }

    if (viewMode === 'config') {
        return (
            <LinearGradient colors={colors.backgroundGradient as any} style={[styles.container, { paddingTop: insets.top }]}>
                <Pressable onPress={() => setViewMode('dashboard')} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.sectionTitle, { fontSize: 24, textAlign: 'center' }]}>
                        {selectedTool ? selectedTool : "Let's Build Your Vision"}
                    </Text>
                    <Text style={[styles.sectionSubtitle, { textAlign: 'center', marginBottom: 24 }]}>Configure your custom style preferences below.</Text>

                    <View style={styles.configCard}>
                        <Text style={styles.configLabel}>CHOOSE IMAGE</Text>
                        
                        <Pressable style={styles.fromGalleryBtn} onPress={pickImage}>
                            <MaterialCommunityIcons name="image-plus-outline" size={18} color="#00A7B5" />
                            <Text style={styles.fromGalleryBtnText}>From Gallery</Text>
                        </Pressable>

                        <View style={styles.uploadBox}>
                            <Image
                                source={{ uri: selectedImage || 'https://images.unsplash.com/photo-1600585152220-90363fe44548?w=800' }}
                                style={styles.uploadPreview}
                            />
                        </View>

                        {/* Category Dropdown (Hidden for Find Items, Edit Outside, Edit Garden, Remove Items) */}
                        {hasCategory && (
                            <>
                                <Text style={styles.configLabel}>CATEGORY</Text>
                                <Pressable style={styles.dropdownBtn} onPress={() => setShowCategoryDropdown(true)}>
                                    <Text style={styles.dropdownText}>{category}</Text>
                                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                                </Pressable>
                            </>
                        )}

                        <Text style={styles.configLabel}>ADD DESCRIPTION</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g. Add a large gray velvet sofa, a minimalist coffee table, and warm ambient lighting. Keep the walls white."
                            placeholderTextColor={colors.inputPlaceholder}
                            multiline
                            numberOfLines={3}
                            value={description}
                            onChangeText={setDescription}
                        />
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 8 }}>
                            Describe what you want the AI to add or change in the room.
                        </Text>

                        <Text style={styles.configLabel}>SELECT LEVEL</Text>
                        <View style={styles.pillRow}>
                            {['Low', 'Medium', 'High'].map((l) => (
                                <Pressable
                                    key={l}
                                    style={[styles.pill, level === l && styles.pillActive]}
                                    onPress={() => setLevel(l as any)}
                                >
                                    <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* SELECT STYLE (Hidden for Find Items & Remove Items) */}
                        {hasSelectStyle && (
                            <>
                                <Text style={styles.configLabel}>SELECT STYLE</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleGridScroll}>
                                    {activeStyles.map((s) => {
                                        const isSelected = selectedStyleId === s.id;
                                        return (
                                            <Pressable
                                                key={s.id}
                                                style={styles.styleCardItem}
                                                onPress={() => setSelectedStyleId(s.id)}
                                            >
                                                <View style={[styles.styleImageWrap, isSelected && styles.styleImageWrapActive]}>
                                                    <Image source={{ uri: s.image }} style={styles.styleImage} />
                                                </View>
                                                <Text style={[styles.styleText, isSelected && styles.styleTextActive]}>{s.name}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        )}

                        <Pressable style={styles.generateBtn} onPress={handleGenerate}>
                            <Text style={styles.generateBtnText}>Generate Vision</Text>
                        </Pressable>
                    </View>
                </ScrollView>

                {/* Category Dropdown Modal */}
                {hasCategory && (
                    <Modal visible={showCategoryDropdown} transparent animationType="fade">
                        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryDropdown(false)}>
                            <View style={styles.modalContent}>
                                <ScrollView bounces={false}>
                                    {CATEGORIES.map((c) => (
                                        <Pressable
                                            key={c}
                                            style={styles.modalItem}
                                            onPress={() => { setCategory(c); setShowCategoryDropdown(false); }}
                                        >
                                            <Text style={styles.modalItemText}>{c}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </Pressable>
                    </Modal>
                )}
            </LinearGradient>
        );
    }

    // Default: Dashboard View
    return (
        <View style={styles.container}>
            <LinearGradient colors={colors.backgroundGradient as any} style={[styles.background, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>

                {/* Top Tab Bar: AI Design Kits vs Saved Designs */}
                <View style={styles.topTabBar}>
                    <Pressable
                        style={[styles.topTabItem, mainTab === 'kits' && styles.topTabItemActive]}
                        onPress={() => setMainTab('kits')}
                    >
                        <Text style={[styles.topTabText, mainTab === 'kits' && styles.topTabTextActive]}>
                            AI Design Kits
                        </Text>
                        {mainTab === 'kits' && <View style={styles.topTabIndicator} />}
                    </Pressable>
                    <Pressable
                        style={[styles.topTabItem, mainTab === 'saved' && styles.topTabItemActive]}
                        onPress={() => setMainTab('saved')}
                    >
                        <Text style={[styles.topTabText, mainTab === 'saved' && styles.topTabTextActive]}>
                            Saved Designs
                        </Text>
                        {mainTab === 'saved' && <View style={styles.topTabIndicator} />}
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        mainTab === 'saved' ? (
                            <RefreshControl
                                refreshing={refreshingSaved}
                                onRefresh={() => fetchSavedDesigns(true)}
                                tintColor={colors.accentTeal}
                            />
                        ) : undefined
                    }
                >
                    {mainTab === 'kits' ? (
                        <>
                            {/* Carousel */}
                            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer} snapToInterval={SCREEN_WIDTH - 40} decelerationRate="fast">
                                {BANNER_SLIDES.map((slide) => (
                                    <View key={slide.id} style={styles.bannerCard}>
                                        <LinearGradient colors={['#0F172A', '#1E293B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerGradient}>
                                            <View style={styles.bannerBadge}>
                                                <Text style={styles.bannerBadgeText}>{slide.badge}</Text>
                                            </View>
                                            <Text style={styles.bannerTitle}>
                                                {slide.title} <Text style={{ color: '#00A7B5' }}>{slide.titleAccent}</Text>
                                            </Text>
                                            <Text style={styles.bannerDesc}>{slide.desc}</Text>

                                            <View style={styles.bannerImageContainer}>
                                                <Image source={{ uri: slide.imageRight }} style={styles.bannerFullImage} />
                                            </View>

                                            <Pressable
                                                style={styles.tryThisBtn}
                                                onPress={() => {
                                                    setSelectedTool(null);
                                                    setViewMode('config');
                                                }}
                                            >
                                                <Text style={styles.tryThisBtnText}>Try This</Text>
                                                <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                                            </Pressable>
                                        </LinearGradient>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* AI Design Kit */}
                            <View style={{ marginTop: 8, marginBottom: 12 }}>
                                <Text style={styles.sectionTitle}>AI Design Kit</Text>
                                <Text style={styles.sectionSubtitle}>Specialized tools for every part of your property enhancement journey.</Text>
                            </View>
                            <View style={styles.kitGrid}>
                                {KIT_ITEMS.map((item) => (
                                    <View key={item.id} style={styles.kitCard}>
                                        <View style={styles.kitImageContainer}>
                                            <Image source={{ uri: item.image }} style={styles.kitImageWrapper} />
                                            <View style={styles.kitOverlayTitleWrap}>
                                                <View style={styles.kitIconCircle}>
                                                    <MaterialCommunityIcons name={item.icon as any} size={12} color="#FFFFFF" />
                                                </View>
                                                <Text style={styles.kitOverlayTitleText}>{item.title}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.kitCardBody}>
                                            <Text style={styles.kitCardDesc} numberOfLines={2}>{item.desc}</Text>
                                            <Pressable
                                                style={styles.kitBtn}
                                                onPress={() => {
                                                    setSelectedTool(item.title);
                                                    setViewMode('config');
                                                }}
                                            >
                                                <Text style={styles.kitBtnText}>Try This</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        /* Saved Designs View */
                        <View style={{ marginTop: 8 }}>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.sectionTitle}>Saved Designs</Text>
                                <Text style={styles.sectionSubtitle}>Your generated visual staging enhancements and renderings.</Text>
                            </View>

                            {loadingSaved ? (
                                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color={colors.accentTeal} />
                                    <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Loading saved designs...</Text>
                                </View>
                            ) : savedDesigns.length === 0 ? (
                                <View style={styles.emptyStateCard}>
                                    <View style={styles.emptyIconCircle}>
                                        <MaterialCommunityIcons name="palette-swatch-outline" size={32} color={colors.accentTeal} />
                                    </View>
                                    <Text style={styles.emptyTitle}>No Saved Designs Yet</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Use our AI Design Kits to generate virtual staging, swap sofas, and redesign spaces. Your creations will appear here.
                                    </Text>
                                    <Pressable style={styles.emptyActionBtn} onPress={() => setMainTab('kits')}>
                                        <Text style={styles.emptyActionBtnText}>Explore AI Design Kits</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.savedGrid}>
                                    {savedDesigns.map((item) => {
                                        const imageUrl = item.content || item.metadata?.imageUrl || item.metadata?.originalImage || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800';
                                        const title = item.metadata?.toolId
                                            ? item.metadata.toolId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                                            : (item.metadata?.title || 'Virtual Staging');
                                        const dateStr = item.created_at
                                            ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : '';

                                        return (
                                            <View key={item.id} style={styles.savedCard}>
                                                <View style={styles.savedImageWrap}>
                                                    <Image source={{ uri: imageUrl }} style={styles.savedImage} />
                                                    <View style={styles.savedOverlayBadge}>
                                                        <MaterialCommunityIcons name="sparkles" size={12} color="#00A7B5" />
                                                        <Text style={styles.savedOverlayText}>{title}</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.savedCardBody}>
                                                    <View style={styles.savedCardTitleRow}>
                                                        <Text style={styles.savedCardTitle} numberOfLines={1}>{title}</Text>
                                                        {dateStr ? <Text style={styles.savedCardDate}>{dateStr}</Text> : null}
                                                    </View>

                                                    {(item.metadata?.style || item.metadata?.roomType) && (
                                                        <View style={styles.savedBadgeRow}>
                                                            {item.metadata?.roomType && (
                                                                <View style={styles.savedPill}>
                                                                    <Text style={styles.savedPillText}>{item.metadata.roomType}</Text>
                                                                </View>
                                                            )}
                                                            {item.metadata?.style && (
                                                                <View style={styles.savedPill}>
                                                                    <Text style={styles.savedPillText}>{item.metadata.style}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    )}

                                                    <Pressable
                                                        style={styles.savedViewBtn}
                                                        onPress={() => handleOpenSavedDesign(item)}
                                                    >
                                                        <MaterialCommunityIcons name="eye-outline" size={15} color="#FFFFFF" />
                                                        <Text style={styles.savedViewBtnText}>View in Studio</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

// Hoisted theme style declaration for Light/Dark mode accessibility
function getStyles(colors: any, isDark: boolean = false) {
    return StyleSheet.create({
        container: { flex: 1 },
        background: { flex: 1 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20 },
        backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 6 },
        backBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },

        // Top Navigation Tabs
        topTabBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 24,
            paddingHorizontal: 20,
            marginBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#334155' : '#E2E8F0',
        },
        topTabItem: {
            paddingBottom: 10,
            position: 'relative',
        },
        topTabItemActive: {},
        topTabText: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        topTabTextActive: {
            color: colors.accentTeal,
        },
        topTabIndicator: {
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: colors.accentTeal,
            borderRadius: 1.5,
        },

        // Carousel
        carouselContainer: { marginBottom: 28 },
        bannerCard: { width: SCREEN_WIDTH - 40, borderRadius: 24, overflow: 'hidden', marginRight: 16 },
        bannerGradient: { padding: 20, borderRadius: 24 },
        bannerBadge: {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(0, 167, 181, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: 'rgba(0, 167, 181, 0.4)',
        },
        bannerBadgeText: { color: '#00A7B5', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
        bannerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 8 },
        bannerDesc: { color: '#94A3B8', fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
        bannerImageContainer: {
            width: '100%',
            height: 160,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 18,
            backgroundColor: '#334155',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
        },
        bannerFullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
        tryThisBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#00A7B5',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            alignSelf: 'flex-start',
            shadowColor: '#00A7B5',
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
        },
        tryThisBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

        // Section Kit
        sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
        sectionSubtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

        // Kit Grid
        kitGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginTop: 4 },
        kitCard: {
            width: (SCREEN_WIDTH - 52) / 2,
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: colors.cardShadowOpacity ?? 0.05,
            shadowRadius: 8,
            shadowOffset: colors.cardShadowOffset ?? { width: 0, height: 4 },
            elevation: 2,
            justifyContent: 'space-between',
        },
        kitImageContainer: {
            width: '100%',
            height: 115,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: isDark ? '#334155' : '#E2E8F0',
        },
        kitImageWrapper: { width: '100%', height: '100%', resizeMode: 'cover' },
        kitOverlayTitleWrap: {
            position: 'absolute',
            left: 8,
            bottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 20,
        },
        kitIconCircle: {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#00A7B5',
            alignItems: 'center',
            justifyContent: 'center',
        },
        kitOverlayTitleText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '900',
        },
        kitCardBody: {
            padding: 10,
            justifyContent: 'space-between',
            flex: 1,
        },
        kitCardDesc: {
            color: colors.textSecondary,
            fontSize: 10,
            lineHeight: 14,
            marginBottom: 10,
        },
        kitBtn: {
            backgroundColor: isDark ? 'rgba(0, 167, 181, 0.12)' : '#F1F5F9',
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(0, 167, 181, 0.3)' : '#E2E8F0',
        },
        kitBtnText: { fontSize: 11.5, fontWeight: '800', color: colors.textPrimary },

        // Config form component styling
        configCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: colors.cardShadowColor,
            shadowOpacity: colors.cardShadowOpacity ?? 0.05,
            shadowRadius: 10,
            shadowOffset: colors.cardShadowOffset ?? { width: 0, height: 6 },
            elevation: 3,
        },
        configLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
        fromGalleryBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: isDark ? 'rgba(0, 167, 181, 0.15)' : '#E6F7F8',
            borderWidth: 1.5,
            borderColor: '#00A7B5',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 18,
            marginBottom: 14,
            alignSelf: 'flex-start',
        },
        fromGalleryBtnText: {
            color: '#00A7B5',
            fontSize: 13,
            fontWeight: '800',
        },
        uploadBox: {
            width: '100%',
            height: 200,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#00A7B5',
            borderStyle: 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            marginBottom: 8,
        },
        uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
        uploadPlaceholder: { alignItems: 'center' },
        uploadTextBold: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 8 },
        uploadTextSmall: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
        dropdownBtn: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: colors.inputBackground,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        dropdownText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
        textArea: {
            backgroundColor: colors.inputBackground,
            padding: 14,
            borderRadius: 12,
            color: colors.textPrimary,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        pillRow: { flexDirection: 'row', gap: 10 },
        pill: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: 'center',
        },
        pillActive: { backgroundColor: colors.accentTeal + '15', borderColor: colors.accentTeal },
        pillText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
        pillTextActive: { color: colors.accentTeal },
        styleGridScroll: {
            paddingVertical: 6,
            paddingRight: 12,
            gap: 12,
        },
        styleCardItem: {
            width: 108,
            alignItems: 'center',
        },
        styleImageWrap: {
            width: 108,
            height: 74,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 2.5,
            borderColor: 'transparent',
            marginBottom: 6,
            backgroundColor: isDark ? '#334155' : '#CBD5E1',
        },
        styleImageWrapActive: {
            borderColor: '#00A7B5',
        },
        styleImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        styleText: {
            color: colors.textPrimary,
            fontSize: 11,
            fontWeight: '700',
            textAlign: 'center',
        },
        styleTextActive: {
            color: '#00A7B5',
            fontWeight: '900',
        },
        generateBtn: { backgroundColor: '#0a2341', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 8 },
        generateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },

        // Dropdown Modal
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
        modalContent: {
            width: '80%',
            maxHeight: '60%',
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
        },
        modalItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
        modalItemText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },

        // Studio Canvas Wrapper and Web-style Header Bar
        canvasWrapper: {
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 20,
            backgroundColor: '#071829',
            borderWidth: 1,
            borderColor: '#1E293B',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 4,
        },
        canvasHeaderContainer: {
            backgroundColor: '#071829',
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#1E293B',
            gap: 10,
        },
        canvasHeaderTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        canvasTitleWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
        },
        canvasStatusDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#10B981',
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
        },
        canvasTitleText: {
            fontSize: 11,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 0.6,
        },
        canvasComparisonWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        canvasComparisonText: {
            fontSize: 10,
            fontWeight: '800',
            color: '#E2E8F0',
            letterSpacing: 0.4,
        },
        canvasHeaderActionRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
        },
        canvasSaveBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1.5,
            borderColor: '#00A7B5',
            backgroundColor: 'rgba(0, 167, 181, 0.12)',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
        },
        canvasSaveBtnText: {
            fontSize: 11,
            fontWeight: '900',
            color: '#00A7B5',
            letterSpacing: 0.5,
        },
        canvasExportBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#0E243A',
            borderWidth: 1,
            borderColor: '#334155',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
        },
        canvasExportBtnText: {
            fontSize: 11,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 0.5,
        },
        canvasBody: {
            width: '100%',
            overflow: 'hidden',
        },

        // Studio Component Comparisons
        studioCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
        compareContainer: { width: '100%', position: 'relative', overflow: 'hidden' },
        compareFullImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
        compareClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
        compareThumb: { position: 'absolute', top: '50%', marginTop: -18, width: 28, height: 36, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a2341' },
        rawLabel: { position: 'absolute', top: 12, left: 12, backgroundColor: '#0B2046', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
        rawLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
        stagedLabel: { position: 'absolute', top: 12, right: 12, backgroundColor: '#0a2341', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
        stagedLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

        // Full Canvas View
        fullCanvasContainer: {
            width: '100%',
            height: 320,
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            position: 'relative',
        },
        fullCanvasImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        canvasLiveBadge: {
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        canvasLiveDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#00A7B5',
        },
        canvasLiveText: {
            fontSize: 10,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 0.8,
        },

        // Style Refinement Section
        styleRefinementCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 6,
            elevation: 2,
        },
        styleRefinementTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 12,
        },
        refinementImageWrap: {
            width: '100%',
            height: 150,
            borderRadius: 14,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
            marginBottom: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        refinementImage: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        refinementChangeBtn: {
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 6,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 3,
        },
        refinementChangeBtnText: {
            color: '#071829',
            fontSize: 12,
            fontWeight: '800',
        },
        refinementInput: {
            backgroundColor: colors.inputBackground,
            padding: 14,
            borderRadius: 12,
            color: colors.textPrimary,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            minHeight: 85,
            fontSize: 13,
            marginBottom: 14,
        },
        regenerateBtn: {
            backgroundColor: '#071829',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#1E293B',
        },
        regenerateBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '900',
            letterSpacing: 0.8,
        },

        // Metadata Details Card
        studioDetailsCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 6,
            elevation: 2,
        },
        studioDetailsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 18,
            gap: 16,
        },
        studioDetailCol: {
            flex: 1,
        },
        studioDetailLabel: {
            fontSize: 10,
            fontWeight: '800',
            color: colors.textMuted,
            letterSpacing: 0.8,
            marginBottom: 6,
            textTransform: 'uppercase',
        },
        studioDetailValue: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        studioPromptSection: {
            marginTop: 4,
        },
        studioPromptBox: {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginTop: 4,
        },
        studioPromptText: {
            fontSize: 13,
            color: colors.textPrimary,
            fontStyle: 'italic',
            lineHeight: 19,
        },

        // Studio Bottom Action Buttons
        studioActionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 4,
            marginBottom: 20,
        },
        studioCloseBtn: {
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.cardBorder,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
        },
        studioCloseBtnText: {
            fontSize: 14,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        studioDownloadBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.accentTeal,
            paddingVertical: 14,
            borderRadius: 14,
            shadowColor: colors.accentTeal,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        studioDownloadBtnText: {
            fontSize: 14,
            fontWeight: '900',
            color: '#FFFFFF',
        },
        // Saved Designs Styles
        savedGrid: { gap: 16 },
        savedCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.06,
            shadowRadius: 8,
            elevation: 3,
        },
        savedImageWrap: {
            width: '100%',
            height: 200,
            position: 'relative',
            backgroundColor: colors.surfaceSoft,
        },
        savedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
        savedOverlayBadge: {
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        savedOverlayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
        savedDeleteBtn: {
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        savedCardBody: { padding: 16 },
        savedCardTitleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
        },
        savedCardTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, flex: 1 },
        savedCardDate: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
        savedBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 14 },
        savedPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surfaceSoft },
        savedPillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
        savedViewBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.accentTeal,
            paddingVertical: 11,
            borderRadius: 12,
        },
        savedViewBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

        // Empty State
        emptyStateCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 24,
            padding: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginTop: 10,
        },
        emptyIconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(0, 167, 181, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
        },
        emptyTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 },
        emptySubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 19,
            marginBottom: 20,
            paddingHorizontal: 10,
        },
        emptyActionBtn: {
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
        },
        emptyActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }
    });
}
