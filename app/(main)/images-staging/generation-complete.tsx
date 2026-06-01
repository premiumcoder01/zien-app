import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RAW_IMAGE = 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800';
const STAGED_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPARE_HEIGHT = 280;

// Custom Before/After image slider (react-before-after-slider-component is web-only; this is RN-native)
function BeforeAfterSlider({
  beforeUri,
  afterUri,
  height,
}: {
  beforeUri: string;
  afterUri: string;
  height: number;
}) {
  const position = useSharedValue(0.5);
  const startPosition = useSharedValue(0.5);
  const trackWidthRef = useRef(SCREEN_WIDTH - 32);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) trackWidthRef.current = w;
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startPosition.value = position.value;
    })
    .onUpdate((e) => {
      const w = trackWidthRef.current;
      if (w <= 0) return;
      const delta = e.translationX / w;
      position.value = Math.max(0, Math.min(1, startPosition.value + delta));
    })
    .onEnd(() => {
      position.value = withSpring(position.value, { damping: 22, stiffness: 220 });
    });

  const clipStyle = useAnimatedStyle(() => ({
    width: `${position.value * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${position.value * 100}%`,
    marginLeft: -14,
  }));

  return (
    <View style={[styles.compareContainer, { height }]} onLayout={onLayout}>
      <Image source={{ uri: beforeUri }} style={styles.compareFullImage} contentFit="cover" />
      <Animated.View style={[styles.compareClip, clipStyle]}>
        <Image source={{ uri: afterUri }} style={styles.compareFullImage} contentFit="cover" />
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.compareThumb, thumbStyle]}>
          <MaterialCommunityIcons name="drag-horizontal" size={20} color="#0B2D3E" />
        </Animated.View>
      </GestureDetector>
      <View style={styles.rawLabel}>
        <Text style={styles.rawLabelText}>RAW SOURCE</Text>
      </View>
      <View style={styles.stagedLabel}>
        <Text style={styles.stagedLabelText}>MASTER OUTPUT</Text>
      </View>
    </View>
  );
}

export default function GenerationCompleteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [materialRealism, setMaterialRealism] = useState<'Auto' | 'Linear' | 'Log'>('Auto');
  const [structuralDetail, setStructuralDetail] = useState(0.4);

  return (
    <LinearGradient
      colors={['#CAD8E4', '#D7E9F2', '#F3E1D7']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0B2D3E" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Neural Generation Complete</Text>
          <Text style={styles.subtitle}>
            Review the calibrated architectural asset and verify visual compliance.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Action buttons: Process New + Download 4K Master */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.processNewBtn, pressed && styles.btnPressed]}
            onPress={() => router.replace('/(main)/images-staging')}>
            <MaterialCommunityIcons name="refresh" size={18} color="#0B2D3E" />
            <Text style={styles.processNewText}>Process New</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.download4kBtn, pressed && styles.btnPressed]}
            onPress={() => { }}>
            <MaterialCommunityIcons name="download" size={18} color="#FFFFFF" />
            <Text style={styles.download4kText}>Download 4K Master</Text>
          </Pressable>
        </View>

        {/* Before/After comparison card */}
        <View style={styles.compareCard}>
          <BeforeAfterSlider
            beforeUri={RAW_IMAGE}
            afterUri={STAGED_IMAGE}
            height={COMPARE_HEIGHT}
          />
        </View>

        {/* Post-Process Tuning card */}
        <View style={styles.tuneCard}>
          <Text style={styles.cardTitle}>Post-Process Tuning</Text>
          <Text style={styles.controlLabel}>Material Realism</Text>
          <View style={styles.pillRow}>
            {(['Auto', 'Linear', 'Log'] as const).map((opt) => (
              <Pressable
                key={opt}
                style={[styles.pill, materialRealism === opt && styles.pillSelected]}
                onPress={() => setMaterialRealism(opt)}>
                <Text style={[styles.pillText, materialRealism === opt && styles.pillTextSelected]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.controlLabel, { marginTop: 16 }]}>Structural Detail</Text>
          <Slider
            style={styles.slider}
            value={structuralDetail}
            onValueChange={setStructuralDetail}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="#0B2D3E"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#0B2D3E"
          />
          <Pressable style={styles.regenerateBtn}>
            <MaterialCommunityIcons name="wrench" size={18} color="#0B2D3E" />
            <Text style={styles.regenerateText}>Regenerate calibrated variant</Text>
          </Pressable>
        </View>

        {/* Governance Check card */}
        <View style={styles.exportCard}>
          <Text style={styles.cardTitle}>Governance Check</Text>
          <Text style={styles.exportDesc}>
            This asset has been verified against Zien's architectural compliance standards and is
            ready for high-fidelity deployment.
          </Text>
          <View style={styles.exportRow}>
            <Pressable style={styles.syncMlsBtn}>
              <Text style={styles.syncMlsText}>Sync to MLS</Text>
            </Pressable>
            <Pressable style={styles.saveVaultBtn}>
              <Text style={styles.saveVaultText}>Save to Vault</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 45, 62, 0.08)',
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2D3E',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#5B6B7A',
    fontWeight: '600',
    lineHeight: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  processNewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3ECF4',
    backgroundColor: '#FFFFFF',
  },
  processNewText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
  },
  download4kBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0B2D3E',
  },
  download4kText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnPressed: { opacity: 0.88 },

  // Before/After comparison
  compareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  compareContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  compareFullImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  compareClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  compareThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 28,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a2341',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rawLabel: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rawLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stagedLabel: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#0B2D3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stagedLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Fine-Tuning card
  tuneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(11, 45, 62, 0.06)',
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B2D3E',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: '#0B2D3E',
    borderColor: '#0B2D3E',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  pillTextSelected: { color: '#FFFFFF' },
  slider: {
    width: '100%',
    height: 40,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3ECF4',
    backgroundColor: '#F8FAFC',
  },
  regenerateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2D3E',
  },

  // Export card
  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(11, 45, 62, 0.06)',
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  exportDesc: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 18,
  },
  exportRow: { flexDirection: 'row', gap: 12 },
  syncMlsBtn: {
    flex: 1,
    backgroundColor: '#0B2D3E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncMlsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  saveVaultBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3ECF4',
  },
  saveVaultText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
  },
});
