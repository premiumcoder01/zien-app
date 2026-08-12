import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSocialPosts, deleteSocialPost, SocialPost } from '@/services/socialService';
import { getAllPropertyImages, getProperties } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
const FALLBACK_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800';

function getSocialPostImage(item: SocialPost | null, propertiesList: any[] = []): string {
  if (!item) return FALLBACK_PROPERTY_IMAGE;

  // 1. Check item.media array or JSON string
  if (item.media) {
    let mediaArr = item.media;
    if (typeof mediaArr === 'string') {
      try {
        mediaArr = JSON.parse(mediaArr);
      } catch (_) {}
    }
    if (Array.isArray(mediaArr) && mediaArr.length > 0) {
      for (const m of mediaArr) {
        if (typeof m === 'string' && (m.startsWith('http://') || m.startsWith('https://') || m.startsWith('file://'))) {
          return m;
        }
        if (m && typeof m === 'object') {
          const url = m.media_url || (m as any).url || (m as any).MediaURL || (m as any).uri || (m as any).MediaUrl;
          if (typeof url === 'string' && url.trim() !== '') {
            return url.startsWith('/') ? `https://staging-api.zien.ai${url}` : url;
          }
        }
      }
    }
  }

  // 2. Direct property image attributes on item
  const directPropUrl = (item as any).image || (item as any).image_url || (item as any).cover_image || (item as any).property_image || (item as any).media_url;
  if (typeof directPropUrl === 'string' && directPropUrl.trim() !== '') {
    return directPropUrl.startsWith('/') ? `https://staging-api.zien.ai${directPropUrl}` : directPropUrl;
  }

  // 3. Check attached item.property object
  if ((item as any).property) {
    const propImages = getAllPropertyImages((item as any).property);
    if (propImages.length > 0) return propImages[0];
  }

  // 4. Fallback lookup via property_id from properties list
  if (item.property_id && Array.isArray(propertiesList) && propertiesList.length > 0) {
    const foundProp = propertiesList.find((p: any) => String(p.id) === String(item.property_id));
    if (foundProp) {
      const propImages = getAllPropertyImages(foundProp);
      if (propImages.length > 0) return propImages[0];
    }
  }

  // 5. Fallback lookup via caption address match
  if (Array.isArray(propertiesList) && propertiesList.length > 0 && item.caption) {
    const captionLower = item.caption.toLowerCase();
    const matchedProp = propertiesList.find((p: any) => p.address && captionLower.includes(p.address.toLowerCase().split(',')[0].trim()));
    if (matchedProp) {
      const propImages = getAllPropertyImages(matchedProp);
      if (propImages.length > 0) return propImages[0];
    }
  }

  // 6. Default fallback image if post is property-tagged
  return FALLBACK_PROPERTY_IMAGE;
}

function getSocialPostShareUrl(item: SocialPost | null): string | null {
  if (!item) return null;

  // 1. Direct post URL properties on post item
  const directUrl = (item as any).post_url || (item as any).published_url || (item as any).url || (item as any).share_url || (item as any).link || (item as any).external_url;
  if (typeof directUrl === 'string' && directUrl.startsWith('http')) {
    return directUrl;
  }

  // 2. Check post_platforms for platform-specific URLs (e.g. Instagram post link, Facebook post link, etc.)
  if (Array.isArray(item.post_platforms)) {
    for (const p of item.post_platforms) {
      if (!p) continue;
      const pUrl = p.post_url || p.platform_post_url || p.url || p.permalink || p.link || p.external_url;
      if (typeof pUrl === 'string' && pUrl.startsWith('http')) {
        return pUrl;
      }
    }
  }

  // 3. Check property URL if attached
  if ((item as any).property?.url && typeof (item as any).property.url === 'string' && (item as any).property.url.startsWith('http')) {
    return (item as any).property.url;
  }

  // 4. Default direct published post / asset link using Zien app domain
  if (item.id) {
    return `https://app.zien.ai/post/${item.id}`;
  }

  if (item.property_id) {
    return `https://app.zien.ai/property/${item.property_id}`;
  }

  return null;
}

// ─── View Library Asset Modal ──────────────────────────────────────
function ViewPostModal({
  visible, item, onClose, propertiesList = [],
}: {
  visible: boolean;
  item: SocialPost | null;
  onClose: () => void;
  propertiesList?: any[];
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState('Property');
  const [platformVal, setPlatformVal] = useState('Multi');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item && visible) {
      const firstLine = (item.caption || '').split('\n')[0].trim();
      setAssetName(firstLine);
      setCaption(item.caption || '');
      setMediaUrl(getSocialPostImage(item, propertiesList));
      setCategory(item.property_id ? 'Property' : 'AI Generated');
      setPlatformVal('Multi');
    }
  }, [item, visible, propertiesList]);

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
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 }}>Library Asset</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>View your high-performing social content</Text>
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
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Preview */}
          {mediaUrl ? (
            <View style={{
              borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceSoft,
              marginBottom: 28, borderWidth: 1, borderColor: colors.cardBorder,
            }}>
              <RNImage source={{ uri: mediaUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
            </View>
          ) : null}

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
              editable={false}
            />
          </View>

          {/* Creative Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Creative Description</Text>
            <TextInput
              style={{
                minHeight: 120, backgroundColor: colors.surfaceSoft, borderRadius: 16,
                borderWidth: 1.5, borderColor: colors.cardBorder, padding: 18,
                fontSize: 14, fontWeight: '600', color: colors.textPrimary,
                textAlignVertical: 'top', lineHeight: 22,
              }}
              value={caption}
              editable={false}
              multiline
            />
          </View>

          {/* Category Type */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Category Type</Text>
            <View style={{
              height: 54, backgroundColor: colors.surfaceSoft, borderRadius: 16,
              borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 18,
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{category}</Text>
            </View>
          </View>

          {/* Primary Platform */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 }}>Primary Platform</Text>
            <View style={{
              height: 54, backgroundColor: colors.surfaceSoft, borderRadius: 16,
              borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 18,
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{platformVal}</Text>
            </View>
          </View>
        </ScrollView>
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
  propertiesList = [],
}: {
  item: SocialPost;
  index: number;
  onDelete: (id: number) => void;
  onEdit: (item: SocialPost) => void;
  propertiesList?: any[];
}) {
  const { colors } = useAppTheme();
  const tag = getPostTag(item);
  const status = getStatusInfo(item);
  const mediaUrl = getSocialPostImage(item, propertiesList);
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
                const postUrl = getSocialPostShareUrl(item);
                const captionText = item.caption || 'Library Asset';
                const message = postUrl
                  ? `${captionText}\n\n🔗 View Published Post:\n${postUrl}`
                  : captionText;

                await Share.share({
                  message,
                  url: postUrl || undefined,
                  title: captionText.split('\n')[0].trim() || 'Library Asset',
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
    { id: 'all', label: 'Type: All' },
    { id: 'custom', label: 'Type: Custom' },
  ],
  status: [
    { id: 'all', label: 'Status: All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'published', label: 'Published' },
  ],
  date: [
    { id: 'newest', label: 'Date: Newest First' },
    { id: 'oldest', label: 'Date: Oldest First' },
  ],
} as const;

// ─── Main Screen ────────────────────────────────────────────────────
export default function ContentLibraryScreen() {
  const { colors } = useAppTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeType, setActiveType] = useState<'all' | 'custom'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [activeSort, setActiveSort] = useState<'newest' | 'oldest'>('newest');
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

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => getProperties(accessToken || ''),
    enabled: !!accessToken,
  });

  const propertiesList = propertiesData?.properties || [];

  const filteredCards = useMemo(() => {
    let list = [...contentList];

    // Filter by Type
    if (activeType === 'custom') {
      list = list.filter(c => !c.property_id && !c.campaign_id && !c.caption?.toLowerCase().includes('open house'));
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

  const activeTypeLabel = DROPDOWN_OPTIONS.type.find(o => o.id === activeType)?.label || 'Type: All';
  const activeStatusLabel = DROPDOWN_OPTIONS.status.find(o => o.id === activeStatus)?.label || 'Status: All';
  const activeDateLabel = DROPDOWN_OPTIONS.date.find(o => o.id === activeSort)?.label || 'Date: Newest First';

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

        <ViewPostModal
          visible={!!editingItem}
          item={editingItem}
          onClose={handleEditClose}
          propertiesList={propertiesList}
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
                {activeTypeLabel}
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
                {activeStatusLabel}
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
                {activeDateLabel}
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
                  propertiesList={propertiesList}
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
              fontSize: 16,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: 16,
              letterSpacing: -0.2,
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
