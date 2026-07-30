import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { generateAiText } from '@/services/aiContentService';
import { getProperties, getPropertyDetails, uploadPropertyImage } from '@/services/propertyService';
import { createSocialPost, getSocialAccounts, getSocialPostById, updateSocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STEPS = [
  { id: 1, label: 'Configuration' },
  { id: 2, label: 'Media' },
  { id: 3, label: 'Scheduling' },
] as const;

type StepId = 1 | 2 | 3;
type PlatformId = 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
type StrategyId = 'immediate' | 'optimal' | 'custom';

const PLATFORMS: { id: PlatformId; label: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  // { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'tiktok', label: 'TikTok', icon: 'music-note' },
];

const HASHTAG_CHIPS = ['#Luxury', '#OpenHouse', '#ZienRealty', '#LALiving'];

const DEFAULT_CAPTION = `JUST LISTED: 1601 Welch Street, Houston TX 77006\n\nExperience luxury living at its finest. This stunning property is now available for private tours.\n\nDM for details! #Zien #RealEstate #JustListed`;

const MEDIA_GRID = [
  { id: 'm1', uri: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800' },
  { id: 'm2', uri: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=800' },
  { id: 'm3', uri: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800' },
  { id: 'm4', uri: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800' },
  { id: 'm5', uri: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800' },
  { id: 'm6', uri: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800' },
];

const STRATEGIES: { id: StrategyId; title: string; desc: string; icon: string }[] = [
  { id: 'immediate', title: 'Publish Immediately', desc: 'Push to all connected platforms right now.', icon: 'lightning-bolt-outline' },
  { id: 'optimal', title: 'Schedule for Optimal Time', desc: 'AI suggests Today @ 6:45 PM based on activity.', icon: 'chart-line' },
  { id: 'custom', title: 'Custom Schedule', desc: 'Pick specific date and time for each platform.', icon: 'calendar-blank-outline' },
];

function ProgressStepper({ currentStep }: { currentStep: number }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.stepperOuterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepperScrollContent}
      >
        {STEPS.map((step, idx) => {
          const isActive = step.id === (currentStep as number);
          const isPast = (step.id as number) < (currentStep as number);
          const isLast = idx === STEPS.length - 1;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isPast && styles.stepCirclePast
                ]}>
                  {isActive && (
                    <View style={styles.stepGlow} />
                  )}
                  {isPast ? (
                    <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                  ) : (
                    <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{step.id}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabelText, isActive && styles.stepLabelTextActive]} numberOfLines={1}>
                  {step.label}
                </Text>
              </View>

              {!isLast && (
                <View style={styles.connectorContainer}>
                  <View style={[styles.connectorLine, isPast && styles.connectorLineActive]} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PostPreviewCard({
  caption,
  previewPlatform,
  selectedMedia,
  selectedPlatforms,
  onPreviewPlatformChange,
}: {
  caption: string;
  previewPlatform: PlatformId;
  selectedMedia?: string;
  selectedPlatforms?: PlatformId[];
  onPreviewPlatformChange?: (p: PlatformId) => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const truncated = caption.length > 120 ? caption.slice(0, 120) + '...' : caption;
  return (
    <View style={[styles.previewCard, { borderWidth: 0, shadowOpacity: 0, elevation: 0, borderRadius: 0, marginBottom: 0, backgroundColor: 'transparent' }]}>
      <View style={styles.previewCardHeader}>
        <View style={styles.previewTabsContainer}>
          {PLATFORMS.filter(p => !selectedPlatforms || selectedPlatforms.includes(p.id)).map((p) => (
            <Pressable
              key={p.id}
              style={[styles.previewIconTab, previewPlatform === p.id && styles.previewIconTabActive]}
              onPress={() => onPreviewPlatformChange?.(p.id)}>
              <MaterialCommunityIcons
                name={p.icon as any}
                size={16}
                color={previewPlatform === p.id ? colors.accentTeal : colors.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.previewBody}>
        <View style={styles.previewHeader}>
          <View style={styles.previewProfile}>
            <LinearGradient colors={['#0a2341', '#0D9488']} style={styles.previewAvatar}>
              <MaterialCommunityIcons name="account" size={16} color="#FFF" />
            </LinearGradient>
            <View>
              <Text style={styles.previewProfileName}>
                {previewPlatform === 'instagram' && '@your_handle'}
                {previewPlatform === 'facebook' && 'Your Real Estate Page'}
                {previewPlatform === 'linkedin' && 'Your Name'}
                {previewPlatform === 'tiktok' && '@your_tiktok'}
              </Text>
              <Text style={styles.previewProfileLoc}>{previewPlatform === 'linkedin' ? 'Real Estate Agent' : 'Sponsored'}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.previewMediaWrap}>
          {selectedMedia ? (
            <Image
              source={{ uri: selectedMedia }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient colors={[colors.surfaceSoft, colors.cardBorder]} style={styles.previewImagePlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={48} color={colors.textMuted} />
              <Text style={styles.previewImagePlaceholderText}>Your media will appear here</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.previewFooterActions}>
          <View style={styles.previewActionsLeft}>
            <MaterialCommunityIcons name="heart-outline" size={24} color={colors.textPrimary} />
            <MaterialCommunityIcons name="comment-outline" size={24} color={colors.textPrimary} />
            <MaterialCommunityIcons name="send-outline" size={24} color={colors.textPrimary} />
          </View>
          <MaterialCommunityIcons name="bookmark-outline" size={24} color={colors.textPrimary} />
        </View>

        <View style={styles.previewCaptionContainer}>
          <Text style={styles.previewCaption}>
            <Text style={styles.previewCaptionName}>
              {previewPlatform === 'instagram' ? 'your_handle ' : 'You '}
            </Text>
            {truncated || 'Caption details will display here...'}
          </Text>
          <Text style={styles.previewTime}>JUST NOW</Text>
        </View>
      </View>
    </View>
  );
}

export default function CreatePostScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { postId, propertyId, editCaption, editMedia, editScheduledAt } = useLocalSearchParams<{
    postId?: string;
    propertyId?: string;
    editCaption?: string;
    editMedia?: string;
    editScheduledAt?: string;
  }>();
  const isEditMode = !!postId;
  const hasPrefilledRef = useRef(false);
  const [step, setStep] = useState<StepId | 'success'>(1);
  const [targetContent, setTargetContent] = useState('Custom Post / Market Update');
  const [caption, setCaption] = useState(isEditMode ? '' : DEFAULT_CAPTION);
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<PlatformId>('instagram');
  const [hasInitializedPlatforms, setHasInitializedPlatforms] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{ id: string, uri: string }[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [lastSelectedMediaUri, setLastSelectedMediaUri] = useState<string | undefined>(undefined);
  const [strategy, setStrategy] = useState<StrategyId>('optimal');
  const [acquisitionType, setAcquisitionType] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [captionContext, setCaptionContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTargetDropdownVisible, setIsTargetDropdownVisible] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(isEditMode);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const previewTranslateX = useSharedValue(SCREEN_WIDTH);

  // Prefill data for edit mode using route params
  useEffect(() => {
    if (!isEditMode || hasPrefilledRef.current) return;
    (async () => {
      try {
        setIsLoadingPost(true);
        hasPrefilledRef.current = true;

        // Prefill caption from route params
        if (editCaption) setCaption(editCaption);

        // Prefill scheduled date
        if (editScheduledAt) {
          setScheduledDate(new Date(editScheduledAt));
          setStrategy('custom');
        }

        // Prefill media from route params
        if (editMedia) {
          try {
            const mediaArr = JSON.parse(editMedia);
            if (Array.isArray(mediaArr) && mediaArr.length > 0) {
              const prefillMedia = mediaArr.map((m: any, i: number) => ({
                id: `existing-${m.id || i}`,
                uri: m.media_url,
              }));
              setUploadedMedia(prefillMedia);
              setSelectedMediaIds(prefillMedia.map((m: any) => m.id));
              setLastSelectedMediaUri(prefillMedia[0].uri);
            }
          } catch { /* media parse failed */ }
        }

        // Prefill property target using property details API
        if (propertyId && accessToken) {
          try {
            const propRes = await getPropertyDetails(propertyId, accessToken);
            if (propRes.data?.address) {
              setTargetContent(`${propRes.data.address} (Property)`);
            }
          } catch { /* property fetch failed, use default */ }
        }

        // Prefill platforms from post details API if in edit mode
        if (postId && accessToken) {
          try {
            const postDetails = await getSocialPostById(accessToken, Number(postId));
            if (postDetails && Array.isArray(postDetails.post_platforms)) {
              const postPlatformIds = postDetails.post_platforms
                .map((pp: any) => pp.platform?.toLowerCase())
                .filter((platformId: any) => PLATFORMS.some(p => p.id === platformId)) as PlatformId[];

              if (postPlatformIds.length > 0) {
                setPlatforms(postPlatformIds);
                setHasInitializedPlatforms(true);
                if (!postPlatformIds.includes(previewPlatform)) {
                  setPreviewPlatform(postPlatformIds[0]);
                }
              }
            }
          } catch (err) {
            console.warn('[CreatePost] Failed to fetch post details for platforms prefill:', err);
          }
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load post data');
        router.back();
      } finally {
        setIsLoadingPost(false);
      }
    })();
  }, [isEditMode, postId, accessToken]);

  useEffect(() => {
    previewTranslateX.value = withTiming(isPreviewOpen ? 0 : SCREEN_WIDTH, { duration: 300 });
  }, [isPreviewOpen]);

  const previewPanelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: previewTranslateX.value }]
    };
  });

  const previewBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isPreviewOpen ? 1 : 0, { duration: 300 }),
    };
  });

  const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(accessToken || ''),
    enabled: !!accessToken,
  });

  const properties = propertiesData?.properties || [];

  const { data: socialAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['socialAccounts'],
    queryFn: () => getSocialAccounts(accessToken || ''),
    enabled: !!accessToken,
  });

  // Default platforms initialization for new posts
  useEffect(() => {
    if (!isEditMode && socialAccounts && Array.isArray(socialAccounts) && !hasInitializedPlatforms) {
      const activePlatformIds = socialAccounts
        .filter((acc: any) => acc && acc.status === 1)
        .map((acc: any) => acc.platform?.toLowerCase())
        .filter((platformId: any) => PLATFORMS.some(p => p.id === platformId)) as PlatformId[];

      setPlatforms(activePlatformIds);
      setHasInitializedPlatforms(true);
      if (activePlatformIds.length > 0 && !activePlatformIds.includes(previewPlatform)) {
        setPreviewPlatform(activePlatformIds[0]);
      }
    }
  }, [socialAccounts, isEditMode, hasInitializedPlatforms]);

  useEffect(() => {
    if (isEditMode && hasPrefilledRef.current) return; // Don't override edit prefill
    if (!isLoadingProperties) {
      if (properties.length > 0) {
        if (propertyId) {
          const found = properties.find((p: any) => String(p.id) === String(propertyId));
          if (found) {
            setTargetContent(`${found.address} (Property)`);
            setCaption(`JUST LISTED: ${found.address}\n\nExperience luxury living at its finest. This stunning property is now available for private tours.\n\nDM for details! #Zien #RealEstate #JustListed`);
            return;
          }
        }
        if (targetContent === 'Custom Post / Market Update') {
          const firstProp = properties[0];
          setTargetContent(`${firstProp.address} (Property)`);
          setCaption(`JUST LISTED: ${firstProp.address}\n\nExperience luxury living at its finest. This stunning property is now available for private tours.\n\nDM for details! #Zien #RealEstate #JustListed`);
        }
      } else {
        setTargetContent('Custom Post / Market Update');
      }
    }
  }, [isLoadingProperties, properties, propertyId]);

  const selectedProperty = useMemo(() => {
    return properties.find((p: any) => `${p.address} (Property)` === targetContent);
  }, [properties, targetContent]);

  const hashtagChips = useMemo(() => {
    return ['#Zien', '#RealEstate', '#JustListed'];
  }, []);

  const handleGenerateAICaption = async () => {
    if (!accessToken) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    try {
      const propertyText = selectedProperty?.address ? ` Use this as property context if available: ${selectedProperty.address}` : '';
      const fullPrompt = `Write a professional, engaging social media caption for a real estate property. Include relevant hashtags. Additional Context from user: ${captionContext}.${propertyText}`;

      const res = await generateAiText(fullPrompt, accessToken, 'complex');
      if (res && res.result) {
        setCaption(res.result);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error: any) {
      Alert.alert('AI Generation Failed', error.message || 'Something went wrong.');
    } finally {
      setIsGenerating(false);
    }
  };

  const progress = useSharedValue(1);

  const triggerHaptic = (type: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(type);
    }
  };

  const togglePlatform = useCallback((id: PlatformId) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const handleMediaSelect = useCallback((m: typeof MEDIA_GRID[0]) => {
    setSelectedMediaIds((prev) => {
      const exists = prev.includes(m.id);
      if (exists) {
        const filtered = prev.filter((id) => id !== m.id);
        if (m.uri === lastSelectedMediaUri && filtered.length > 0) {
          const nextId = filtered[filtered.length - 1];
          const nextMedia = MEDIA_GRID.find(item => item.id === nextId);
          if (nextMedia) setLastSelectedMediaUri(nextMedia.uri);
        }
        return filtered;
      } else {
        setLastSelectedMediaUri(m.uri);
        return [...prev, m.id];
      }
    });
  }, [lastSelectedMediaUri]);

  const mediaItems = useMemo(() => uploadedMedia.map((m) => ({ ...m, selected: selectedMediaIds.includes(m.id) })), [uploadedMedia, selectedMediaIds]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && libraryStatus === 'granted';
  };

  const pickImage = (useCamera: boolean) => {
    setIsPickerVisible(false);
    setTimeout(async () => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Please enable camera and gallery access in settings.');
        return;
      }

      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const newUri = result.assets[0].uri;
        const newId = `u-${Date.now()}`;
        const newMedia = { id: newId, uri: newUri };
        setUploadedMedia(prev => [newMedia, ...prev]);
        setLastSelectedMediaUri(newUri);
        setSelectedMediaIds(prev => [...prev, newId]);
      }
    }, 300);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setScheduledDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const goNext = useCallback(async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 1) {
      if (platforms.length === 0) {
        Alert.alert(
          'Selection Required',
          'Please select at least one connected social media channel to proceed.'
        );
        return;
      }
      setStep(2);
    }
    else if (step === 2) setStep(3);
    else if (step === 3) {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        let finalMediaUrl = lastSelectedMediaUri;

        // 1. Upload media if it's a local file
        if (lastSelectedMediaUri && (lastSelectedMediaUri.startsWith('file://') || lastSelectedMediaUri.startsWith('content://') || lastSelectedMediaUri.startsWith('/'))) {
          const uploadRes = await uploadPropertyImage(lastSelectedMediaUri, accessToken || '');
          finalMediaUrl = uploadRes.url;
        }

        const platformAccountIds = platforms.map(platformId => {
          const matchedAcc = (socialAccounts || []).find(
            (acc: any) => acc.platform?.toLowerCase() === platformId.toLowerCase()
          );
          return matchedAcc?.id;
        }).filter(id => id !== undefined && id !== null);

        // 2. Prepare payload
        const payload = {
          caption,
          property_id: selectedProperty?.id || null,
          status: 1, // Scheduled
          scheduled_at: strategy === 'custom' ? scheduledDate.toISOString() : new Date().toISOString(),
          media: finalMediaUrl ? [
            {
              media_url: finalMediaUrl,
              media_type: 'image'
            }
          ] : [],
          platform_account_ids: platformAccountIds
        };

        // 3. Call API — create or update
        if (isEditMode) {
          await updateSocialPost(accessToken || '', Number(postId), payload);
        } else {
          await createSocialPost(accessToken || '', payload);
        }

        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        setStep('success');
      } catch (error: any) {
        Alert.alert(isEditMode ? 'Update Failed' : 'Scheduling Failed', error.message || 'Something went wrong.');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [step, isSubmitting, caption, selectedProperty, strategy, scheduledDate, lastSelectedMediaUri, accessToken, isEditMode, postId, platforms, socialAccounts]);

  const goBack = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }, [step]);

  if (step === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceSoft }]}>
        <LinearGradient colors={colors.backgroundGradient as any} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeInRight} style={[styles.successWrapper, { paddingTop: insets.top + 40 }]}>
          <View style={styles.successIconOuter}>
            <LinearGradient colors={['#0a2341', '#0D9488']} style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check-bold" size={60} color="#FFF" />
            </LinearGradient>
            <Animated.View entering={FadeInRight} style={styles.successIconRing} />
          </View>
          <Text style={styles.successTitleText}>{isEditMode ? 'Post Updated!' : 'Post Scheduled!'}</Text>
          <Text style={styles.successSubText}>
            Your masterpiece is in the queue. We'll handle the heavy lifting and notify you the moment it's live.
          </Text>
          <View style={styles.successButtonContainer}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                router.replace('/(main)/social-hub');
              }}
            >
              <LinearGradient colors={['#0b2341', '#0b2341']} style={StyleSheet.absoluteFill} />
              <Text style={styles.primaryBtnText}>Go to Scheduler</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setStep(1);
              }}
            >
              <Text style={styles.secondaryBtnText}>Create Another</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (isLoadingPost) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={colors.backgroundGradient as any} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.accentTeal} />
        <Text style={[styles.headerSubtitle, { marginTop: 16 }]}>Loading post data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: colors.surfaceSoft }]}
    >
      <LinearGradient colors={colors.backgroundGradient as any} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Post' : 'Create New Post'}</Text>
          <Text style={styles.headerSubtitle}>{isEditMode ? 'Update your post details' : 'Ready to engage your audience?'}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      >
        <ProgressStepper currentStep={step} />

        {step === 1 && (
          <View style={styles.stepFade}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Target Content</Text>
              <Pressable
                style={styles.premiumDropdown}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setIsTargetDropdownVisible(true);
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.dropdownValue} numberOfLines={1}>{targetContent}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>

              {selectedProperty && (
                <View style={styles.selectedPropertyDetails}>
                  <View style={styles.selectedPropertyThumbWrap}>
                    {selectedProperty.data?.user_images?.[0] || selectedProperty.data?.Media?.[0]?.MediaURL ? (
                      <Image
                        source={{ uri: selectedProperty.data?.user_images?.[0] || selectedProperty.data?.Media?.[0]?.MediaURL }}
                        style={styles.selectedPropertyThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.selectedPropertyThumbPlaceholder}>
                        <MaterialCommunityIcons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.selectedPropertyInfo}>
                    <Text style={styles.selectedPropertyTitle}>{selectedProperty.address}</Text>
                    <View style={styles.selectedPropertyBadges}>
                      {(selectedProperty.data?.MlsStatus || selectedProperty.status === 1) && (
                        <View style={[styles.badge, styles.badgeActive]}>
                          <Text style={styles.badgeActiveText}>{selectedProperty.data?.MlsStatus?.toUpperCase() || 'ACTIVE'}</Text>
                        </View>
                      )}
                      {selectedProperty.data?.PropertyType && (
                        <View style={[styles.badge, styles.badgeBlue]}>
                          <Text style={styles.badgeBlueText}>{selectedProperty.data.PropertyType}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardLabel, { marginBottom: 12 }]}>Caption</Text>

              <View style={styles.aiInputContainer}>
                <TextInput
                  style={styles.aiContextInputFull}
                  value={captionContext}
                  onChangeText={setCaptionContext}
                  placeholder="Write your caption...  "
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable
                  style={[styles.generateAiBtnFull, isGenerating && styles.generateAiBtnDisabled]}
                  onPress={handleGenerateAICaption}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="star-four-points" size={14} color="#FFF" />
                      <Text style={styles.generateAiBtnText}>Generate AI</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <TextInput
                style={styles.premiumInput}
                value={caption}
                onChangeText={setCaption}
                multiline
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.hashtagBox}>
                {hashtagChips.map(tag => (
                  <Pressable
                    key={tag}
                    style={styles.hashtag}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      setCaption(prev => prev ? `${prev} ${tag}` : tag);
                    }}
                  >
                    <Text style={styles.hashtagText}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Select Platforms</Text>
              <View style={styles.platformSelectionGrid}>
                {PLATFORMS.map(p => {
                  const isConnected = (socialAccounts || []).some(
                    (acc: any) => acc.platform?.toLowerCase() === p.id.toLowerCase() && acc.status === 1
                  );
                  const isSelected = platforms.includes(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        styles.platformOption,
                        isSelected && styles.platformOptionSelected,
                        !isConnected && styles.platformOptionDisabled
                      ]}
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        if (isConnected) {
                          togglePlatform(p.id);
                        } else {
                          Alert.alert(
                            'Channel Not Connected',
                            `Please connect your ${p.label} account in Account Settings to publish posts.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Go to Settings', onPress: () => router.push('/(main)/social-hub/accounts') }
                            ]
                          );
                        }
                      }}
                    >
                      <LinearGradient
                        colors={isSelected ? ['#0a2341', '#0D9488'] : [colors.surfaceSoft, colors.surfaceSoft]}
                        style={styles.platformIconCircle}
                      >
                        <MaterialCommunityIcons
                          name={p.icon as any}
                          size={20}
                          color={isSelected ? '#FFF' : colors.textMuted}
                        />
                      </LinearGradient>
                      <View style={styles.platformTextInfo}>
                        <Text style={[
                          styles.platformLabel,
                          isSelected && styles.platformLabelActive,
                          !isConnected && { color: colors.textMuted }
                        ]}>
                          {p.label}
                        </Text>
                        <Text style={styles.platformStatus}>
                          {isConnected ? 'Connected' : 'Not Connected'}
                        </Text>
                      </View>
                      {isConnected && isSelected && (
                        <Animated.View entering={FadeInRight} style={styles.platformCheckBadge}>
                          <MaterialCommunityIcons name="check" size={10} color="#FFF" />
                        </Animated.View>
                      )}
                      {!isConnected && (
                        <View style={styles.notConnectedBadge}>
                          <Text style={styles.notConnectedBadgeText}>NOT CONNECTED</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInRight} style={styles.stepFade}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Media Asset Acquisition</Text>
              <View style={styles.segmentedControl}>
                {['manual', 'ai'].map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.segment, acquisitionType === type && styles.segmentActive]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      setAcquisitionType(type as 'manual' | 'ai');
                    }}
                  >
                    <Text style={[styles.segmentText, acquisitionType === type && styles.segmentTextActive]}>
                      {type === 'manual' ? 'Manual Upload' : 'AI Generation'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {acquisitionType === 'manual' ? (
                <Pressable
                  style={styles.uploadDropzone}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    setIsPickerVisible(true);
                  }}
                >
                  <LinearGradient colors={['rgba(11, 160, 178, 0.08)', 'rgba(13, 148, 136, 0.08)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.uploadIconContainer}>
                    <MaterialCommunityIcons name="cloud-upload" size={32} color={colors.accentTeal} />
                  </View>
                  <Text style={styles.uploadPrimaryText}>Tap to Upload Media</Text>
                  <Text style={styles.uploadSecondaryText}>Supports high-res JPG, PNG, and 4K MP4</Text>
                </Pressable>
              ) : (
                <View style={styles.aiGenerationWrapper}>
                  <TextInput
                    style={styles.aiPromptInput}
                    placeholder="Describe the cinematic visual you want to generate..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                  />
                  <View style={styles.aiPromptFooter}>
                    <Pressable
                      style={styles.aiGenerateBtn}
                      onPress={() => triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy)}
                    >
                      <LinearGradient colors={['#0a2341', '#0D9488']} style={styles.aiGenerateBtnGradient}>
                        <MaterialCommunityIcons name="star-four-points" size={16} color="#FFF" />
                        <Text style={styles.aiGenerateBtnText}>Generate Magic</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>Asset Gallery</Text>
                <Text style={styles.galleryCount}>{selectedMediaIds.length} Selected</Text>
              </View>
              <View style={styles.modernMediaGrid}>
                {mediaItems.map(m => (
                  <Pressable
                    key={m.id}
                    style={[styles.modernMediaCell, m.selected && styles.modernMediaCellSelected]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      handleMediaSelect(m);
                    }}
                  >
                    <Image source={{ uri: m.uri }} style={styles.modernMediaImage} />
                    {m.selected && (
                      <Animated.View entering={FadeInRight} style={styles.modernMediaCheck}>
                        <MaterialCommunityIcons name="check-bold" size={10} color="#FFF" />
                      </Animated.View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeInRight} style={styles.stepFade}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Publishing Strategy</Text>
              <View style={styles.strategyContainer}>
                {STRATEGIES.map(s => {
                  const isSelected = strategy === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.strategyCard, isSelected && styles.strategyCardActive]}
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setStrategy(s.id);
                      }}
                    >
                      <View style={[styles.strategyIconBox, isSelected && styles.strategyIconBoxActive]}>
                        <MaterialCommunityIcons name={s.icon as any} size={22} color={isSelected ? colors.accentTeal : colors.textMuted} />
                      </View>
                      <View style={styles.strategyContent}>
                        <Text style={[styles.strategyTitle, isSelected && styles.strategyTitleActive]}>{s.title}</Text>
                        <Text style={styles.strategyDesc}>{s.desc}</Text>
                      </View>
                      <View style={[styles.strategyRadio, isSelected && styles.strategyRadioActive]}>
                        {isSelected && <Animated.View entering={FadeInRight} style={styles.strategyRadioInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {strategy === 'custom' && (
                <Animated.View entering={FadeInRight} style={styles.customScheduleContainer}>
                  <View style={styles.customScheduleRow}>
                    <View style={styles.customScheduleCol}>
                      <Text style={styles.customScheduleLabel}>Date</Text>
                      <Pressable
                        style={styles.customScheduleInput}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.customScheduleValue}>
                          {scheduledDate.toLocaleDateString('en-GB')}
                        </Text>
                        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                    <View style={styles.customScheduleCol}>
                      <Text style={styles.customScheduleLabel}>Time</Text>
                      <Pressable
                        style={styles.customScheduleInput}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.customScheduleValue}>
                          {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display="spinner"
                      is24Hour={false}
                      onChange={onTimeChange}
                    />
                  )}
                </Animated.View>
              )}
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Floating Preview Button */}
      {!isPreviewOpen && (
        <Animated.View entering={FadeInRight} style={styles.floatingPreviewBtnWrapper}>
          <Pressable
            style={styles.floatingPreviewBtn}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              setIsPreviewOpen(true);
            }}
          >
            <MaterialCommunityIcons name="eye-outline" size={24} color="#FFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* Sliding Preview Overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.previewBackdrop, previewBackdropStyle]}
        pointerEvents={isPreviewOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsPreviewOpen(false)} />
      </Animated.View>

      <Animated.View style={[styles.previewSidePanel, previewPanelStyle]}>
        <View style={[styles.previewPanelHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.previewPanelTitle}>Live Preview</Text>
          <Pressable onPress={() => setIsPreviewOpen(false)} style={styles.previewPanelCloseBtn}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.previewPanelScroll, { padding: 0 }]} showsVerticalScrollIndicator={false}>
          <PostPreviewCard
            caption={caption}
            previewPlatform={previewPlatform}
            selectedMedia={
              selectedMediaIds.length > 0
                ? lastSelectedMediaUri
                : (selectedProperty?.data?.user_images?.[0] || selectedProperty?.data?.Media?.[0]?.MediaURL || undefined)
            }
            selectedPlatforms={platforms}
            onPreviewPlatformChange={setPreviewPlatform}
          />
        </ScrollView>
      </Animated.View>

      {/* Sticky Bottom Actions */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.footerRow}>
          {step > 1 ? (
            <Pressable style={styles.footerBackBtn} onPress={goBack}>
              <Text style={styles.footerBackBtnText}>Back</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.footerBackBtn} onPress={() => router.back()}>
              <Text style={styles.footerBackBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable style={styles.footerContinueBtn} onPress={goNext}>
            <LinearGradient
              colors={['#0a2341', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.footerContinueBtnText}>
                {step === 3 ? (isSubmitting ? (isEditMode ? 'Updating...' : 'Scheduling...') : (isEditMode ? 'Update Post' : 'Confirm Schedule')) : 'Continue'}
              </Text>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 8 }} />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Media Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetKnob} />
              <Text style={styles.sheetTitle}>Upload Asset</Text>
            </View>
            <View style={styles.pickerOptions}>
              <Pressable style={styles.pickerOption} onPress={() => pickImage(true)}>
                <View style={[styles.pickerIconContainer, { backgroundColor: '#F0FDFA' }]}>
                  <MaterialCommunityIcons name="camera-outline" size={24} color="#0D9488" />
                </View>
                <Text style={styles.pickerOptionText}>Take Photo</Text>
              </Pressable>
              <View style={styles.pickerDivider} />
              <Pressable style={styles.pickerOption} onPress={() => pickImage(false)}>
                <View style={[styles.pickerIconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="image-multiple-outline" size={24} color="#2563EB" />
                </View>
                <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.sheetCancelBtn}
              onPress={() => setIsPickerVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Target Content Dropdown Modal */}
      <Modal
        visible={isTargetDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTargetDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsTargetDropdownVisible(false)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetKnob} />
              <Text style={styles.sheetTitle}>Select Target Content</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerOptions}>
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setTargetContent('Custom Post / Market Update');
                    setCaption(DEFAULT_CAPTION);
                    setIsTargetDropdownVisible(false);
                  }}
                >
                  <View style={styles.dropdownOptionLeft}>
                    <Text style={[
                      styles.dropdownOptionText,
                      targetContent === 'Custom Post / Market Update' && styles.dropdownOptionTextActive
                    ]}>
                      Custom Post / Market Update
                    </Text>
                  </View>
                  {targetContent === 'Custom Post / Market Update' && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />
                  )}
                </Pressable>

                <View style={styles.pickerDivider} />

                {isLoadingProperties ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.accentTeal} />
                  </View>
                ) : (
                  properties.map((prop, idx) => {
                    const label = `${prop.address} (Property)`;
                    const isSelected = targetContent === label;
                    return (
                      <View key={prop.id || idx}>
                        <Pressable
                          style={styles.dropdownOption}
                          onPress={() => {
                            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                            setTargetContent(label);
                            setCaption(`JUST LISTED: ${prop.address}\n\nExperience luxury living at its finest. This stunning property is now available for private tours.\n\nDM for details! #Zien #RealEstate #JustListed`);
                            setIsTargetDropdownVisible(false);
                          }}
                        >
                          <View style={styles.dropdownOptionLeft}>
                            <Text style={[
                              styles.dropdownOptionText,
                              isSelected && styles.dropdownOptionTextActive
                            ]}>
                              {label}
                            </Text>
                          </View>
                          {isSelected && (
                            <MaterialCommunityIcons name="check" size={20} color={colors.accentTeal} />
                          )}
                        </Pressable>
                        {idx < properties.length - 1 && <View style={styles.pickerDivider} />}
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
    headerBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    stepperOuterContainer: { marginHorizontal: -20, marginBottom: 32 },
    stepperScrollContent: { paddingHorizontal: 20, alignItems: 'flex-start' },
    stepWrapper: { flexDirection: 'row', alignItems: 'flex-start' },
    stepItem: { alignItems: 'center', width: 110 },
    stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.cardBorder, zIndex: 2 },
    stepCircleActive: { backgroundColor: colors.cardBackground, borderColor: colors.accentTeal },
    stepCirclePast: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    stepGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 17, backgroundColor: colors.accentTeal, opacity: 0.15, transform: [{ scale: 1.3 }] },
    stepNumber: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
    stepNumberActive: { color: colors.accentTeal },
    stepLabelText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
    stepLabelTextActive: { color: colors.textPrimary },
    connectorContainer: { width: 40, height: 34, justifyContent: 'center', alignItems: 'center' },
    connectorLine: { height: 2, width: '100%', backgroundColor: colors.cardBorder },
    connectorLineActive: { backgroundColor: colors.accentTeal },
    stepFade: { flex: 1 },
    card: { backgroundColor: colors.cardBackground, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.cardShadowColor, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, elevation: 4 },
    cardLabel: { fontSize: 12, fontWeight: '900', color: colors.textPrimary, marginBottom: 16, letterSpacing: -0.3 },
    premiumDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, backgroundColor: colors.surfaceSoft, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder },
    dropdownValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    aiActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.textPrimary, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, shadowColor: colors.textPrimary, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
    aiActionText: { fontSize: 10, fontWeight: '800', color: colors.cardBackground },
    premiumInput: { backgroundColor: colors.surfaceSoft, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder, padding: 18, fontSize: 12, color: colors.textPrimary, minHeight: 140, lineHeight: 24, textAlignVertical: 'top' },
    aiInputContainer: { gap: 12, marginBottom: 16 },
    aiContextInputFull: { backgroundColor: colors.surfaceSoft, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 16, height: 52, fontSize: 13, color: colors.textPrimary, width: '100%' },
    generateAiBtnFull: { height: 52, borderRadius: 20, backgroundColor: '#0C2340', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#0C2340', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 3, width: '100%' },
    generateAiBtnDisabled: { opacity: 0.6 },
    generateAiBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    hashtagBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    hashtag: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.cardBorder },
    hashtagText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    platformSelectionGrid: { flexDirection: 'column', gap: 16 },
    platformOption: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground, position: 'relative' },
    platformOptionSelected: { borderColor: colors.accentTeal, shadowColor: colors.accentTeal, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
    platformOptionDisabled: { borderColor: colors.cardBorder, opacity: 0.7 },
    notConnectedBadge: { position: 'absolute', top: -8, right: 12, backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    notConnectedBadgeText: { fontSize: 8.5, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.5 },
    platformIconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    platformTextInfo: { flex: 1 },
    platformStatus: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    platformCheckBadge: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cardBackground },
    platformLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
    platformLabelActive: { color: colors.textPrimary },
    segmentedControl: { flexDirection: 'row', backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: colors.cardBorder },
    segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
    segmentActive: { backgroundColor: colors.cardBackground, shadowColor: colors.cardShadowColor, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3 },
    segmentText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    segmentTextActive: { color: colors.textPrimary },
    uploadDropzone: { height: 180, borderRadius: 28, borderWidth: 2, borderColor: colors.accentTeal, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' },
    uploadIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(11, 160, 178, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    uploadPrimaryText: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
    uploadSecondaryText: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' },
    aiGenerationWrapper: { gap: 12 },
    aiPromptInput: { backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 18, fontSize: 12, color: colors.textPrimary, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.cardBorder },
    aiPromptFooter: { alignItems: 'flex-end' },
    aiGenerateBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: colors.accentTeal, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
    aiGenerateBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20 },
    aiGenerateBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    modernMediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    modernMediaCell: { width: (SCREEN_WIDTH - 94) / 3, aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceSoft, borderWidth: 2, borderColor: 'transparent' },
    modernMediaCellSelected: { borderColor: colors.accentTeal },
    modernMediaImage: { width: '100%', height: '100%' },
    modernMediaCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    galleryCount: { fontSize: 12, fontWeight: '800', color: colors.accentTeal, backgroundColor: 'rgba(11, 160, 178, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
    strategyContainer: { gap: 14 },
    strategyCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
    strategyCardActive: { borderColor: colors.accentTeal, backgroundColor: 'rgba(11, 160, 178, 0.02)', shadowColor: colors.accentTeal, shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
    strategyIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    strategyIconBoxActive: { backgroundColor: 'rgba(11, 160, 178, 0.1)' },
    strategyContent: { flex: 1 },
    strategyTitle: { fontSize: 12, fontWeight: '900', color: colors.textPrimary },
    strategyTitleActive: { color: colors.accentTeal },
    strategyDesc: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600', lineHeight: 15 },
    strategyRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    strategyRadioActive: { borderColor: colors.accentTeal },
    strategyRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accentTeal },
    customScheduleContainer: { marginTop: 20 },
    customScheduleRow: { flexDirection: 'row', gap: 16 },
    customScheduleCol: { flex: 1, gap: 8 },
    customScheduleLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    customScheduleInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: 16, height: 48, backgroundColor: colors.surfaceSoft },
    customScheduleValue: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, fontFamily: 'monospace' },
    floatingPreviewBtnWrapper: { position: 'absolute', right: 0, top: '50%', marginTop: -24, zIndex: 40, shadowColor: colors.accentTeal, shadowOpacity: 0.3, shadowOffset: { width: -2, height: 4 }, shadowRadius: 10 },
    floatingPreviewBtn: { backgroundColor: colors.accentTeal, paddingVertical: 12, paddingHorizontal: 14, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
    previewBackdrop: { backgroundColor: 'rgba(11, 45, 62, 0.6)', zIndex: 50 },
    previewSidePanel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: SCREEN_WIDTH * 0.85, maxWidth: 400, backgroundColor: colors.cardBackground, zIndex: 51, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: -4, height: 0 }, shadowRadius: 20 },
    previewPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    previewPanelTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    previewPanelCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    previewPanelScroll: { paddingBottom: 60 },
    previewCard: { backgroundColor: colors.cardBackground, borderRadius: 32, marginBottom: 24, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: colors.cardShadowColor, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 8, overflow: 'hidden' },
    previewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surfaceSoft },
    previewCardHeaderTitle: { fontSize: 13, fontWeight: '900', color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: 1.2 },
    previewTabsContainer: { flexDirection: 'row', gap: 8 },
    previewIconTab: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
    previewIconTabActive: { backgroundColor: 'rgba(11, 160, 178, 0.1)' },
    previewBody: { padding: 0 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    previewProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    previewAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    previewProfileName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    previewProfileLoc: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    previewMediaWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceSoft },
    previewImage: { width: '100%', height: '100%' },
    previewImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    previewImagePlaceholderText: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    previewFooterActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
    previewActionsLeft: { flexDirection: 'row', gap: 18 },
    previewCaptionContainer: { paddingHorizontal: 14, paddingBottom: 24 },
    previewCaption: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
    previewCaptionName: { fontWeight: '900' },
    previewTime: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 8, textTransform: 'uppercase' },
    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cardBackgroundSemi, borderTopWidth: 1, borderTopColor: colors.cardBorder, padding: 20, paddingTop: 16 },
    footerRow: { flexDirection: 'row', gap: 12 },
    footerBackBtn: { flex: 1, height: 58, borderRadius: 20, backgroundColor: colors.surfaceSoft, borderWidth: 2, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    footerBackBtnText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    footerContinueBtn: { flex: 2, height: 58, borderRadius: 20, overflow: 'hidden', shadowColor: colors.accentTeal, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
    gradientBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    footerContinueBtnText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
    successWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    successIconOuter: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 40, position: 'relative' },
    successIconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', zIndex: 2, shadowColor: colors.accentTeal, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
    successIconRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderColor: colors.accentTeal, opacity: 0.1, borderWidth: 2 },
    successTitleText: { fontSize: 34, fontWeight: '900', color: colors.textPrimary, marginBottom: 16, textAlign: 'center', letterSpacing: -1 },
    successSubText: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 26, fontWeight: '600' },
    successButtonContainer: { width: '100%', gap: 14, marginTop: 56 },
    primaryBtn: { height: 64, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#FFF', zIndex: 1 },
    secondaryBtn: { height: 64, borderRadius: 22, borderWidth: 2, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground },
    secondaryBtnText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 45, 62, 0.6)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 48 },
    sheetHeader: { alignItems: 'center', marginBottom: 32 },
    sheetKnob: { width: 44, height: 6, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
    pickerOptions: { gap: 0 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 20 },
    pickerIconContainer: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    pickerOptionText: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
    pickerDivider: { height: 1, backgroundColor: colors.cardBorder },
    sheetCancelBtn: { marginTop: 32, height: 60, borderRadius: 20, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    sheetCancelText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    dropdownSheet: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 48, maxHeight: SCREEN_HEIGHT * 0.7 },
    dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
    dropdownOptionLeft: { flex: 1, paddingRight: 16 },
    dropdownOptionText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    dropdownOptionTextActive: { color: colors.accentTeal, fontWeight: '800' },
    selectedPropertyDetails: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: colors.surfaceSoft, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
    selectedPropertyThumbWrap: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.cardBackground, marginRight: 16, overflow: 'hidden' },
    selectedPropertyThumb: { width: '100%', height: '100%' },
    selectedPropertyThumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    selectedPropertyInfo: { flex: 1, justifyContent: 'center' },
    selectedPropertyTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    selectedPropertyBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    badgeActiveText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
    badgeBlue: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
    badgeBlueText: { fontSize: 10, fontWeight: '800', color: '#2563EB' },
  });
}
