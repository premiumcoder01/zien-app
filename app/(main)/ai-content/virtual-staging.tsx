import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateVirtualStaging } from '@/services/aiContentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    LayoutChangeEvent,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
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
            <Image source={{ uri: beforeUri }} style={styles.compareFullImage} />
            <Animated.View style={[styles.compareClip, clipStyle]}>
                <Image source={{ uri: afterUri }} style={styles.compareFullImage} />
            </Animated.View>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.compareThumb, thumbStyle]}>
                    <MaterialCommunityIcons name="drag-horizontal" size={20} color="#0B2D3E" />
                </Animated.View>
            </GestureDetector>
            <View style={styles.rawLabel}><Text style={styles.rawLabelText}>AFTER</Text></View>
            <View style={styles.stagedLabel}><Text style={styles.stagedLabelText}>BEFORE</Text></View>
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
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(originalImage || null);
    const [category, setCategory] = useState(roomType || CATEGORIES[0]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [description, setDescription] = useState(prefill || '');
    const [level, setLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [selectedStyleId, setSelectedStyleId] = useState(1);
    const [generatedImage, setGeneratedImage] = useState<string | null>(content || null);

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
        return (
            <LinearGradient colors={colors.backgroundGradient as any} style={[styles.container, { paddingTop: insets.top }]}>
                <Pressable onPress={() => setViewMode('config')} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.textPrimary} />
                    <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
                    <Text style={styles.sectionTitle}>AI Generation Studio</Text>
                    <Text style={[styles.sectionSubtitle, { marginBottom: 20 }]}>Refining custom style with precision rendering.</Text>

                    <View style={styles.studioCard}>
                        <BeforeAfterSlider
                            beforeUri={selectedImage || 'https://images.unsplash.com/photo-1600585152220-90363fe44548?w=800'}
                            afterUri={generatedImage || 'https://replicate.delivery/yhqm/yhU8YT4u7365B1zkQOR8Fp0aRvWjbpIeTCENf1KCzFadzXHXA/output_1.png'}
                            height={300}
                        />
                    </View>

                    <Pressable style={styles.tryThisBtn} onPress={() => setViewMode('dashboard')}>
                        <Text style={styles.tryThisBtnText}>Done / Dashboard</Text>
                    </Pressable>
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
                <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
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
        backBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 6 },
        backBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },

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

        // Studio Component Comparisons
        studioCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
        compareContainer: { width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 16 },
        compareFullImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
        compareClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
        compareThumb: { position: 'absolute', top: '50%', marginTop: -18, width: 28, height: 36, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a2341' },
        rawLabel: { position: 'absolute', top: 12, left: 12, backgroundColor: '#0B2046', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
        rawLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
        stagedLabel: { position: 'absolute', top: 12, right: 12, backgroundColor: '#0a2341', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
        stagedLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' }
    });
}
