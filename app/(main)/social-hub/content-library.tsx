import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { uploadPropertyImage } from '@/services/propertyService';
import { getSocialPosts, deleteSocialPost, SocialPost, updateSocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  Image as RNImage,
  ScrollView,
  Share,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { id: 'all', label: 'All', icon: 'view-grid-outline' as const },
  { id: 'property', label: 'Property', icon: 'home-outline' as const },
  { id: 'open-house', label: 'Open House', icon: 'door-open' as const },
  { id: 'campaign', label: 'Campaign', icon: 'flag-outline' as const },
] as const;

type TabId = (typeof TABS)[number]['id'];

function getPostTag(item: SocialPost): { label: string; color: string; bgColor: string } {
  if (item.property_id) return { label: 'PROPERTY', color: '#0a2341', bgColor: 'rgba(11, 160, 178, 0.12)' };
  if (item.campaign_id) return { label: 'CAMPAIGN', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.12)' };
  if (item.caption?.toLowerCase().includes('open house')) return { label: 'OPEN HOUSE', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' };
  return { label: 'CUSTOM', color: '#64748B', bgColor: 'rgba(100, 116, 139, 0.12)' };
}

function getStatusInfo(item: SocialPost): { label: string; color: string; icon: string } {
  if (item.published_at) return { label: 'Published', color: '#10B981', icon: 'check-circle-outline' };
  if (item.status === 1) return { label: 'Scheduled', color: '#0a2341', icon: 'clock-outline' };
  return { label: 'Draft', color: '#F59E0B', icon: 'file-document-edit-outline' };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const CATEGORIES = ['AI Generated', 'Property', 'Open House', 'Custom'];
const PLATFORMS_LIST = ['Instagram', 'Facebook', 'TikTok', 'Multi'];

// ─── Edit Post Modal ────────────────────────────────────────────────
function EditPostModal({
  visible, item, onClose, accessToken,
}: {
  visible: boolean;
  item: SocialPost | null;
  onClose: (updated?: boolean) => void;
  accessToken: string;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState('Property');
  const [customCategory, setCustomCategory] = useState('');
  const [platformVal, setPlatformVal] = useState('Multi');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [localMediaUri, setLocalMediaUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  useEffect(() => {
    if (item && visible) {
      const firstLine = (item.caption || '').split('\n')[0].trim();
      setAssetName(firstLine);
      setCaption(item.caption || '');
      setMediaUrl(item.media?.[0]?.media_url || null);
      setLocalMediaUri(null);
      setCategory(item.property_id ? 'Property' : 'AI Generated');
      setCustomCategory('');
      setPlatformVal('Multi');
    }
  }, [item, visible]);

  const pickImage = (useCamera: boolean) => {
    setShowImagePicker(false);
    setTimeout(async () => {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable access in settings.');
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) {
        setLocalMediaUri(result.assets[0].uri);
        setMediaUrl(null);
      }
    }, 300);
  };

  const handleSave = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      let finalMediaUrl = localMediaUri || mediaUrl;

      if (localMediaUri && (localMediaUri.startsWith('file://') || localMediaUri.startsWith('/'))) {
        const uploadRes = await uploadPropertyImage(localMediaUri, accessToken);
        finalMediaUrl = uploadRes.url;
      }

      const payload: any = {
        caption,
        media: finalMediaUrl ? [{ media_url: finalMediaUrl, media_type: 'image' }] : [],
      };

      await updateSocialPost(accessToken, item.id, payload);
      onClose(true);
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayImage = localMediaUri || mediaUrl;

  if (!visible || !item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: colors.cardBackground }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 }}>Edit Library Asset</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>Modify your high-performing social content</Text>
          </View>
          <Pressable
            onPress={() => onClose()}
            style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSoft,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder,
            }}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Preview */}
          <View style={{
            borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceSoft,
            marginBottom: 28, borderWidth: 1, borderColor: colors.cardBorder, position: 'relative',
          }}>
            {displayImage ? (
              <>
                <RNImage source={{ uri: displayImage }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                <Pressable
                  onPress={() => { setMediaUrl(null); setLocalMediaUri(null); }}
                  style={{
                    position: 'absolute', top: 14, left: 14,
                    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="close" size={16} color="#FFF" />
                </Pressable>
                <Pressable
                  onPress={() => setShowImagePicker(true)}
                  style={{
                    position: 'absolute', top: 14, right: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
                  }}
                >
                  <MaterialCommunityIcons name="camera-outline" size={14} color="#FFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>Change</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setShowImagePicker(true)}
                style={{
                  height: 180, alignItems: 'center', justifyContent: 'center', gap: 10,
                  borderWidth: 2, borderStyle: 'dashed', borderColor: colors.cardBorder, borderRadius: 24,
                }}
              >
                <View style={{
                  width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.accentTeal}12`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialCommunityIcons name="cloud-upload" size={28} color={colors.accentTeal} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>Upload Media</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>JPG, PNG, or MP4</Text>
              </Pressable>
            )}
          </View>

          {/* Asset Identity */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Asset Identity</Text>
            <TextInput
              style={{
                height: 54, backgroundColor: colors.surfaceSoft, borderRadius: 16,
                borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 18,
                fontSize: 14, fontWeight: '600', color: colors.textPrimary,
              }}
              value={assetName}
              onChangeText={setAssetName}
              placeholder="e.g. Modern Exterior - Bel Air"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Creative Description */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.2 }}>Creative Description</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="star-four-points" size={12} color={colors.accentTeal} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentTeal }}>AI Generate</Text>
              </View>
            </View>
            <TextInput
              style={{
                minHeight: 120, backgroundColor: colors.surfaceSoft, borderRadius: 16,
                borderWidth: 1.5, borderColor: colors.cardBorder, padding: 18,
                fontSize: 14, fontWeight: '600', color: colors.textPrimary,
                textAlignVertical: 'top', lineHeight: 22,
              }}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Write your caption..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Category Type Dropdown */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Category Type</Text>
            <Pressable
              onPress={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowPlatformDropdown(false); }}
              style={{
                height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: colors.surfaceSoft, borderRadius: 16,
                borderWidth: showCategoryDropdown ? 2 : 1.5, borderColor: showCategoryDropdown ? colors.textPrimary : colors.cardBorder,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{category}</Text>
              <MaterialCommunityIcons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textPrimary} />
            </Pressable>

            {showCategoryDropdown && (
              <Animated.View entering={FadeIn.duration(150)} style={{
                marginTop: 6, backgroundColor: colors.cardBackground, borderRadius: 16,
                borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
                ...Platform.select({
                  ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
                  android: { elevation: 8 },
                }),
              }}>
                {CATEGORIES.map((cat, idx) => (
                  <Pressable
                    key={cat}
                    onPress={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18,
                      borderBottomWidth: idx < CATEGORIES.length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder,
                      backgroundColor: category === cat ? `${colors.accentTeal}08` : 'transparent',
                    }}
                  >
                    {category === cat && (
                      <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} style={{ marginRight: 10 }} />
                    )}
                    <Text style={{
                      fontSize: 14, fontWeight: category === cat ? '800' : '600', color: colors.textPrimary,
                    }}>{cat}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </View>

          {/* Custom category + Platform row */}
          {category === 'Custom' ? (
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Manual Category Name</Text>
                <TextInput
                  style={{
                    height: 54, backgroundColor: colors.surfaceSoft, borderRadius: 16,
                    borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 18,
                    fontSize: 14, fontWeight: '600', color: colors.textPrimary,
                  }}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="e.g. Market Report"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Primary Platform</Text>
                <View style={{
                  height: 54, backgroundColor: colors.surfaceSoft, borderRadius: 16,
                  borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 18,
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{platformVal}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Primary Platform</Text>
              <Pressable
                onPress={() => { setShowPlatformDropdown(!showPlatformDropdown); setShowCategoryDropdown(false); }}
                style={{
                  height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: colors.surfaceSoft, borderRadius: 16,
                  borderWidth: showPlatformDropdown ? 2 : 1.5, borderColor: showPlatformDropdown ? colors.textPrimary : colors.cardBorder,
                  paddingHorizontal: 18,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{platformVal}</Text>
                <MaterialCommunityIcons name={showPlatformDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textPrimary} />
              </Pressable>

              {showPlatformDropdown && (
                <Animated.View entering={FadeIn.duration(150)} style={{
                  marginTop: 6, backgroundColor: colors.cardBackground, borderRadius: 16,
                  borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
                    android: { elevation: 8 },
                  }),
                }}>
                  {PLATFORMS_LIST.map((p, idx) => (
                    <Pressable
                      key={p}
                      onPress={() => { setPlatformVal(p); setShowPlatformDropdown(false); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18,
                        borderBottomWidth: idx < PLATFORMS_LIST.length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder,
                        backgroundColor: platformVal === p ? `${colors.accentTeal}08` : 'transparent',
                      }}
                    >
                      {platformVal === p && (
                        <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} style={{ marginRight: 10 }} />
                      )}
                      <Text style={{
                        fontSize: 14, fontWeight: platformVal === p ? '800' : '600', color: colors.textPrimary,
                      }}>{p}</Text>
                    </Pressable>
                  ))}
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Sticky Footer Buttons */}
        <View style={{
          flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 24),
          backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.cardBorder,
        }}>
          <Pressable
            onPress={() => onClose()}
            style={{
              flex: 1, height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: colors.cardBorder,
              backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={{ flex: 1.5, height: 56, borderRadius: 18, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#0a2341', '#0D9488']} style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Image Picker Bottom Sheet */}
        <Modal visible={showImagePicker} transparent animationType="fade" onRequestClose={() => setShowImagePicker(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(11,35,65,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowImagePicker(false)}>
            <View style={{
              backgroundColor: colors.cardBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28,
              padding: 24, paddingBottom: Math.max(insets.bottom, 32),
            }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: 16 }} />
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary }}>Upload Content</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 28 }}>
                <Pressable onPress={() => pickImage(true)} style={{ alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="camera" size={28} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Camera</Text>
                </Pressable>
                <Pressable onPress={() => pickImage(false)} style={{ alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="image-multiple" size={28} color="#22C55E" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Gallery</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowImagePicker(false)}
                style={{ height: 52, borderRadius: 16, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

function formatCardDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeFormatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateFormatted}, ${timeFormatted}`;
}

// ─── Premium Content Card ───────────────────────────────────────────
function ContentCardItem({
  item,
  index,
  onDelete,
  onEdit,
}: {
  item: SocialPost;
  index: number;
  onDelete: (id: number) => void;
  onEdit: (item: SocialPost) => void;
}) {
  const { colors } = useAppTheme();
  const tag = getPostTag(item);
  const status = getStatusInfo(item);
  const mediaUrl = item.media?.[0]?.media_url;
  const captionPreview = (item.caption || 'Untitled Content').split('\n')[0].trim();
  const fullCaption = item.caption || '';
  const dateStr = formatCardDate(item.scheduled_at || item.created_at);
  const mediaCount = item.media?.length || 0;
  const usedCount = 1;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)} style={{
      backgroundColor: colors.cardBackground, borderRadius: 24, overflow: 'hidden',
      borderWidth: 1.5, borderColor: colors.cardBorder, marginBottom: 16,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
        android: { elevation: 3 },
      }),
    }}>
      {/* Media Top Section */}
      <Pressable onPress={() => onEdit(item)} style={{ position: 'relative', height: 180, backgroundColor: colors.surfaceSoft }}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="image-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        {/* Tag Overlay - top left */}
        <View style={{
          position: 'absolute', top: 12, left: 12,
          backgroundColor: tag.bgColor, paddingVertical: 4, paddingHorizontal: 10,
          borderRadius: 8, borderWidth: 1, borderColor: `${tag.color}20`,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: tag.color, letterSpacing: 0.8 }}>{tag.label}</Text>
        </View>

        {/* Status Overlay - top right */}
        <View style={{
          position: 'absolute', top: 12, right: 12,
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
        }}>
          <MaterialCommunityIcons name={status.icon as any} size={11} color={status.color} />
          <Text style={{ fontSize: 9, fontWeight: '900', color: status.color }}>{status.label}</Text>
        </View>

        {/* Media count badge */}
        {mediaCount > 1 && (
          <View style={{
            position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8,
          }}>
            <MaterialCommunityIcons name="image-multiple" size={10} color="#FFF" />
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>{mediaCount}</Text>
          </View>
        )}
      </Pressable>

      {/* Info details */}
      <Pressable onPress={() => onEdit(item)} style={{ padding: 16 }}>
        {/* Title */}
        <Text style={{
          fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 6, lineHeight: 20
        }} numberOfLines={1}>
          {captionPreview}
        </Text>

        {/* Date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MaterialCommunityIcons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{dateStr}</Text>
        </View>

        {/* Caption snippet */}
        {fullCaption.length > captionPreview.length && (
          <Text style={{
            fontSize: 12, color: colors.textSecondary, lineHeight: 18, fontWeight: '600'
          }} numberOfLines={2}>
            {fullCaption.replace(captionPreview, '').trim() || fullCaption}
          </Text>
        )}
      </Pressable>

      {/* Action Footer Bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: colors.cardBorder,
        backgroundColor: colors.surfaceSoft,
      }}>
        {/* Used count */}
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
          Used {usedCount} times
        </Text>

        {/* Action Icons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Eye Icon (View / Preview) */}
          <Pressable
            onPress={() => onEdit(item)}
            style={{
              width: 34, height: 34, borderRadius: 10, backgroundColor: colors.cardBackground,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder,
            }}
          >
            <MaterialCommunityIcons name="eye-outline" size={16} color={colors.textMuted} />
          </Pressable>

          {/* Share Icon */}
          <Pressable
            onPress={async () => {
              try {
                await Share.share({
                  message: item.caption || 'Untitled Content',
                });
              } catch (error) {
                console.log('Error sharing post:', error);
              }
            }}
            style={{
              width: 34, height: 34, borderRadius: 10, backgroundColor: colors.cardBackground,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder,
            }}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={16} color={colors.textMuted} />
          </Pressable>

          {/* Delete Icon */}
          <Pressable
            onPress={() => onDelete(item.id)}
            style={{
              width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.05)',
              alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Delete Confirmation Modal ──────────────────────────────────────
function DeleteConfirmationModal({
  visible, onClose, onConfirm, isDeleting,
}: { visible: boolean; onClose: () => void; onConfirm: () => void; isDeleting: boolean; }) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1, backgroundColor: 'rgba(11, 35, 65, 0.5)', justifyContent: 'center',
        alignItems: 'center', padding: 24,
      }}>
        <Animated.View entering={FadeIn.duration(200)} style={{
          backgroundColor: colors.cardBackground, width: '100%', maxWidth: 340,
          borderRadius: 28, padding: 28, alignItems: 'center',
          ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24 }, android: { elevation: 12 } }),
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.1)',
            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          }}>
            <MaterialCommunityIcons name="trash-can-outline" size={32} color="#EF4444" />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 10 }}>Delete Asset?</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
            This action cannot be undone. This asset will be permanently removed from your content library.
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <Pressable disabled={isDeleting} onPress={onClose} style={{
              flex: 1, height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.cardBorder,
              backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>Cancel</Text>
            </Pressable>
            <Pressable disabled={isDeleting} onPress={onConfirm} style={{
              flex: 1, height: 50, borderRadius: 16, backgroundColor: '#EF4444',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>Delete</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Dropdown Options Configuration ────────────────────────────────
const DROPDOWN_OPTIONS = {
  type: [
    { id: 'all', label: 'All Types' },
    { id: 'property', label: 'Property' },
    { id: 'open-house', label: 'Open House' },
    { id: 'campaign', label: 'Campaign' },
    { id: 'custom', label: 'Custom' },
  ],
  status: [
    { id: 'all', label: 'All Statuses' },
    { id: 'draft', label: 'Drafts' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'published', label: 'Published' },
  ],
  date: [
    { id: 'oldest', label: 'Oldest First' },
    { id: 'newest', label: 'Newest First' },
  ],
} as const;

// ─── Main Screen ────────────────────────────────────────────────────
export default function ContentLibraryScreen() {
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeType, setActiveType] = useState<'all' | 'property' | 'open-house' | 'campaign' | 'custom'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [activeSort, setActiveSort] = useState<'oldest' | 'newest'>('oldest');
  const [activeDropdown, setActiveDropdown] = useState<'type' | 'status' | 'date' | null>(null);

  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialPost | null>(null);
  const queryClient = useQueryClient();

  const { data: contentList = [], isLoading } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  const filteredCards = useMemo(() => {
    let list = [...contentList];

    // Filter by Type
    if (activeType !== 'all') {
      if (activeType === 'property') list = list.filter(c => c.property_id);
      else if (activeType === 'open-house') list = list.filter(c => c.caption?.toLowerCase().includes('open house'));
      else if (activeType === 'campaign') list = list.filter(c => c.campaign_id);
      else if (activeType === 'custom') list = list.filter(c => !c.property_id && !c.campaign_id && !c.caption?.toLowerCase().includes('open house'));
    }

    // Filter by Status
    if (activeStatus !== 'all') {
      if (activeStatus === 'draft') list = list.filter(c => !c.published_at && c.status !== 1);
      else if (activeStatus === 'scheduled') list = list.filter(c => c.status === 1);
      else if (activeStatus === 'published') list = list.filter(c => c.published_at);
    }

    // Sort by Date
    list.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.created_at).getTime();
      const dateB = new Date(b.scheduled_at || b.created_at).getTime();
      return activeSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [contentList, activeType, activeStatus, activeSort]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSocialPost(accessToken || '', itemToDelete);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      Alert.alert('Error', error?.message || 'Failed to delete asset. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: SocialPost) => {
    setEditingItem(item);
  };

  const handleEditClose = (updated?: boolean) => {
    setEditingItem(null);
    if (updated) {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    }
  };

  const activeTypeLabel = DROPDOWN_OPTIONS.type.find(o => o.id === activeType)?.label.replace('All Types', 'All') || 'All';
  const activeStatusLabel = DROPDOWN_OPTIONS.status.find(o => o.id === activeStatus)?.label.replace('All Statuses', 'All') || 'All';
  const activeDateLabel = DROPDOWN_OPTIONS.date.find(o => o.id === activeSort)?.label || 'Oldest First';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <PageHeader
          title="Content Library"
          subtitle="Manage and reuse your high-performing social assets."
          onBack={() => router.back()}
        />

        <DeleteConfirmationModal
          visible={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />

        <EditPostModal
          visible={!!editingItem}
          item={editingItem}
          onClose={handleEditClose}
          accessToken={accessToken || ''}
        />

        {/* Filter Dropdowns Bar */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ marginTop: 6, marginBottom: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {/* Type Dropdown */}
            <Pressable
              onPress={() => setActiveDropdown('type')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: colors.cardBackground,
                borderWidth: 1.5, borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                Type: {activeTypeLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            {/* Status Dropdown */}
            <Pressable
              onPress={() => setActiveDropdown('status')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: colors.cardBackground,
                borderWidth: 1.5, borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                Status: {activeStatusLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            {/* Date/Sort Dropdown */}
            <Pressable
              onPress={() => setActiveDropdown('date')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: colors.cardBackground,
                borderWidth: 1.5, borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                Date: {activeDateLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>
          </ScrollView>
        </Animated.View>

        {/* Main Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
              <ActivityIndicator size="large" color={colors.accentTeal} />
              <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Loading your library...</Text>
            </View>
          ) : filteredCards.length === 0 ? (
            <Animated.View entering={FadeIn.duration(500)} style={{
              alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40,
            }}>
              <View style={{
                width: 100, height: 100, borderRadius: 50, backgroundColor: colors.cardBackground,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                borderWidth: 1, borderColor: colors.cardBorder,
                ...Platform.select({
                  ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
                  android: { elevation: 6 },
                }),
              }}>
                <MaterialCommunityIcons name="folder-open-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 }}>No content yet</Text>
              <Text style={{
                fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, fontWeight: '600',
              }}>Start building your library by creating posts or generating content with AI.</Text>
              <Pressable
                onPress={() => router.push('/(main)/social-hub/create-post')}
                style={{ marginTop: 28, overflow: 'hidden', borderRadius: 16 }}
              >
                <LinearGradient colors={['#0a2341', '#0D9488']} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 14, paddingHorizontal: 24,
                }}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFF" />
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFF' }}>Create First Post</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              {filteredCards.map((item, index) => (
                <ContentCardItem
                  key={item.id}
                  item={item}
                  index={index}
                  onDelete={(id) => setItemToDelete(id)}
                  onEdit={handleEdit}
                />
              ))}
            </View>
          )}
        </ScrollView>

      </LinearGradient>

      {/* Dropdown Options Bottom Sheet Modal */}
      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: 'rgba(11, 35, 65, 0.55)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: Math.max(insets.bottom, 24),
            paddingHorizontal: 24,
            paddingTop: 16,
          }}>
            {/* Grab Handle */}
            <View style={{
              width: 36,
              height: 4,
              backgroundColor: colors.cardBorder,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20,
            }} />

            {/* Title */}
            <Text style={{
              fontSize: 15,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Select {activeDropdown === 'type' ? 'Content Type' : activeDropdown === 'status' ? 'Publication Status' : 'Sort Order'}
            </Text>

            {/* Options List */}
            {activeDropdown && DROPDOWN_OPTIONS[activeDropdown].map((opt) => {
              const isSelected = 
                activeDropdown === 'type' ? activeType === opt.id :
                activeDropdown === 'status' ? activeStatus === opt.id :
                activeSort === opt.id;

              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    if (activeDropdown === 'type') setActiveType(opt.id as any);
                    else if (activeDropdown === 'status') setActiveStatus(opt.id as any);
                    else setActiveSort(opt.id as any);
                    setActiveDropdown(null);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? colors.accentTeal : colors.textPrimary,
                  }}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color={colors.accentTeal} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
