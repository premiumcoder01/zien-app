import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSocialPosts, deleteSocialPost, SocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Post Detail Modal (Bottom Sheet Style) ─────────────────────────
function PostDetailModal({
  post, onClose, onEdit,
}: {
  post: SocialPost | null;
  onClose: () => void;
  onEdit: (post: SocialPost) => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!post) return null;

  const mediaUrl = post.media?.[0]?.media_url;
  const captionFirstLine = (post.caption || '').split('\n')[0].trim();
  
  const platforms = post.post_platforms?.map(p => p.account?.platform?.toLowerCase()).filter(Boolean) || [];
  const mainPlatform = platforms[0];

  const statusLabel = post.status === 2 ? 'PUBLISHED' : post.status === 3 ? 'FAILED' : 'SCHEDULED';
  const statusColor = post.status === 2 ? '#10B981' : post.status === 3 ? '#EF4444' : colors.accentTeal;
  const timeStr = post.scheduled_at ? formatTime(post.scheduled_at) : '';

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable 
        style={{
          flex: 1, 
          backgroundColor: 'rgba(11, 35, 65, 0.55)',
          justifyContent: 'flex-end',
        }} 
        onPress={onClose}
      >
        <Animated.View 
          entering={FadeInDown.duration(250)} 
          style={{
            width: '100%', 
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            overflow: 'hidden',
            paddingBottom: Math.max(insets.bottom, 20),
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: -10 }, shadowRadius: 24 },
              android: { elevation: 24 },
            }),
          }}
        >
          {/* Grab Handle */}
          <View style={{
            width: 40,
            height: 5,
            backgroundColor: colors.cardBorder || '#E2E8F0',
            borderRadius: 2.5,
            alignSelf: 'center',
            marginTop: 12,
            marginBottom: 16,
          }} />

          {/* Image */}
          <View style={{ height: 180, backgroundColor: colors.surfaceSoft, position: 'relative', marginHorizontal: 20, borderRadius: 20, overflow: 'hidden' }}>
            {mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="image-outline" size={48} color={colors.textMuted} />
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            }} />
            <Pressable onPress={onClose} style={{
              position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
            }}>
              <MaterialCommunityIcons name="close" size={18} color="#0b2341" />
            </Pressable>
            {mainPlatform && (
              <View style={{
                position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#0b2341', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
              }}>
                <MaterialCommunityIcons 
                  name={
                    mainPlatform === 'instagram' ? 'instagram' :
                    mainPlatform === 'facebook' ? 'facebook' :
                    mainPlatform === 'linkedin' ? 'linkedin' :
                    mainPlatform === 'twitter' ? 'twitter' : 'layers-outline'
                  } 
                  size={14} 
                  color="#FFF" 
                />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {platforms.length > 1 ? 'MULTIPLE' : mainPlatform}
                </Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: colors.textPrimary, lineHeight: 24 }}>{captionFirstLine}</Text>
              <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 2 }}>STATUS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name={post.status === 2 ? 'check-circle' : post.status === 3 ? 'alert-circle' : 'clock-outline'} size={12} color={statusColor} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: statusColor, letterSpacing: 0.3 }}>{statusLabel}</Text>
                </View>
              </View>
            </View>

            {/* Time & Platforms */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {timeStr && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>{timeStr}</Text>
                </View>
              )}

              {platforms.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {platforms.map((plat, idx) => {
                    const iconName = plat === 'instagram' ? 'instagram' :
                                     plat === 'facebook' ? 'facebook' :
                                     plat === 'linkedin' ? 'linkedin' :
                                     plat === 'twitter' ? 'twitter' : 'layers-outline';
                    return (
                      <MaterialCommunityIcons key={plat + idx} name={iconName} size={14} color={colors.textPrimary} />
                    );
                  })}
                </View>
              )}
            </View>

            {/* Error Message */}
            {post.error_message && (
              <View style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1,
                padding: 12, borderRadius: 16, marginBottom: 16,
              }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', marginBottom: 2 }}>PUBLISH ERROR</Text>
                  <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>{post.error_message}</Text>
                </View>
              </View>
            )}

            {/* Caption Preview */}
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '600', marginBottom: 24 }} numberOfLines={4}>
              {(post.caption || '').replace(/\n+/g, ' ')}
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {post.status !== 2 && (
                <Pressable
                  onPress={() => { onClose(); onEdit(post); }}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.cardBorder,
                    backgroundColor: colors.cardBackground,
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textPrimary} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>Edit Post</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                style={{ flex: 1, height: 48, borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#0b2341', '#0b2341']} style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFF' }}>Close</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function PostHistoryScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['social-posts-all'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (p.caption || '').toLowerCase().includes(q);
    });
  }, [posts, searchQuery]);

  const isAllSelected = useMemo(() => {
    if (filteredPosts.length === 0) return false;
    return filteredPosts.every(p => selectedIds.includes(p.id));
  }, [filteredPosts, selectedIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredPosts.some(p => p.id === id)));
    } else {
      setSelectedIds(prev => {
        const otherSelected = prev.filter(id => !filteredPosts.some(p => p.id === id));
        return [...otherSelected, ...filteredPosts.map(p => p.id)];
      });
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => deleteSocialPost(accessToken || '', id)));
      setSelectedIds([]);
      setDeleteModalVisible(false);
      refetch();
    } catch (error: any) {
      console.error('Failed to delete posts:', error);
      Alert.alert('Error', error?.message || 'Failed to delete selected posts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (post: SocialPost) => {
    router.push({
      pathname: '/(main)/social-hub/create-post',
      params: {
        postId: String(post.id),
        propertyId: post.property_id ? String(post.property_id) : '',
        editCaption: post.caption || '',
        editMedia: JSON.stringify(post.media || []),
        editScheduledAt: post.scheduled_at || '',
      },
    });
  };

  const renderPostCard = ({ item }: { item: SocialPost }) => {
    const mediaUrl = item.media?.[0]?.media_url;
    const dateLabel = item.scheduled_at ? formatDate(item.scheduled_at) : '';
    const timeLabel = item.scheduled_at ? formatTime(item.scheduled_at) : '';
    const captionSnippet = (item.caption || '').split('\n')[0].trim() || 'Untitled Post';

    const platforms = item.post_platforms?.map(p => p.account?.platform?.toLowerCase()).filter(Boolean) || [];

    const statusLabel = item.status === 2 ? 'PUBLISHED' : item.status === 3 ? 'FAILED' : 'SCHEDULED';
    const statusColor = item.status === 2 ? '#10B981' : item.status === 3 ? '#EF4444' : colors.accentTeal;
    const statusBg = item.status === 2 ? 'rgba(16, 185, 129, 0.08)' : item.status === 3 ? 'rgba(239, 68, 68, 0.08)' : `${colors.accentTeal}12`;

    const isSelected = selectedIds.includes(item.id);

    return (
      <Pressable
        onPress={() => setSelectedPost(item)}
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 22,
          padding: 16,
          marginBottom: 14,
          borderWidth: 1.5,
          borderColor: colors.cardBorder,
          flexDirection: 'row',
          alignItems: 'center',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
            android: { elevation: 2 },
          }),
        }}
      >
        {/* Checkbox on the left */}
        <Pressable
          onPress={() => handleToggleSelect(item.id)}
          style={{
            paddingRight: 14,
            paddingVertical: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: isSelected ? colors.accentTeal : colors.textMuted,
            backgroundColor: isSelected ? colors.accentTeal : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isSelected && (
              <MaterialCommunityIcons name="check" size={13} color="#FFF" />
            )}
          </View>
        </Pressable>

        {/* Content on the right */}
        <View style={{ flex: 1 }}>
        {/* Top Date & Status Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{dateLabel} {timeLabel}</Text>
          </View>

          <View style={{ 
            flexDirection: 'row', alignItems: 'center', gap: 4, 
            backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 
          }}>
            <MaterialCommunityIcons 
              name={item.status === 2 ? 'check-circle' : item.status === 3 ? 'alert-circle' : 'clock-outline'} 
              size={11} 
              color={statusColor} 
            />
            <Text style={{ fontSize: 9, fontWeight: '900', color: statusColor, letterSpacing: 0.3 }}>{statusLabel}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {mediaUrl ? (
            <Image source={{ uri: mediaUrl }} style={{ width: 64, height: 64, borderRadius: 14 }} contentFit="cover" />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder }}>
              <MaterialCommunityIcons name="image-outline" size={24} color={colors.textMuted} />
            </View>
          )}
          
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 6, lineHeight: 18 }} numberOfLines={2}>{captionSnippet}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>General Content</Text>
            </View>
          </View>
        </View>

        {/* Footer Platforms / Errors Section */}
        {platforms.length > 0 && (
          <View style={{ 
            flexDirection: 'row', alignItems: 'center', gap: 6, 
            borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10, marginTop: 4 
          }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, marginRight: 2 }}>PLATFORMS:</Text>
            {platforms.map((plat, idx) => {
              const iconName = plat === 'instagram' ? 'instagram' :
                               plat === 'facebook' ? 'facebook' :
                               plat === 'linkedin' ? 'linkedin' :
                               plat === 'twitter' ? 'twitter' : 'layers-outline';
              return (
                <View key={plat + idx} style={{ 
                  flexDirection: 'row', alignItems: 'center', gap: 4, 
                  backgroundColor: colors.surfaceSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 
                }}>
                  <MaterialCommunityIcons name={iconName} size={11} color={colors.textPrimary} />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' }}>{plat}</Text>
                </View>
              );
            })}
          </View>
        )}

        {item.error_message && (
          <View style={{ 
            borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10, marginTop: 4,
            flexDirection: 'row', alignItems: 'center', gap: 6
          }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={12} color="#EF4444" />
            <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {item.error_message}
            </Text>
          </View>
        )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient as any} style={{ flex: 1, paddingTop: insets.top }}>
        <PageHeader
          title="Post History"
          subtitle="View your history of direct social media publications."
          onBack={() => router.back()}
        />

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.cardBackground, borderRadius: 16,
            paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: colors.cardBorder,
          }}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, height: '100%', fontSize: 13, fontWeight: '700', color: colors.textPrimary }}
              placeholder="Search by address or caption..."
              placeholderTextColor={colors.textMuted || '#8DA4B5'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        {/* Selection / Action Row */}
        {filteredPosts.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(75).duration(400)} 
            style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingHorizontal: 20, 
              marginBottom: 14 
            }}
          >
            <Pressable 
              onPress={handleToggleSelectAll}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: isAllSelected ? colors.accentTeal : colors.textMuted,
                backgroundColor: isAllSelected ? colors.accentTeal : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isAllSelected && (
                  <MaterialCommunityIcons name="check" size={13} color="#FFF" />
                )}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                Select All ({filteredPosts.length})
              </Text>
            </Pressable>

            {selectedIds.length > 0 && (
              <Pressable
                onPress={() => setDeleteModalVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  borderWidth: 1.2,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: "#EF4444" }}>
                  Delete Selected ({selectedIds.length})
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* List of Publications */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '700', color: colors.textMuted }}>Loading publications...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="history" size={32} color={colors.textMuted} />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>No publications found</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center', maxWidth: 260 }}>
                {searchQuery ? "Try searching for a different keyword or caption." : "Your direct social media publication logs will show up here."}
              </Text>
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ flex: 1 }}>
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderPostCard}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              refreshing={isLoading}
              onRefresh={refetch}
            />
          </Animated.View>
        )}

        {/* Detail Bottom Sheet Modal */}
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={handleEdit}
        />

        {/* Batch Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isDeleting) setDeleteModalVisible(false);
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(11, 35, 65, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{
                width: '100%',
                maxWidth: 340,
                backgroundColor: colors.cardBackground,
                borderRadius: 24,
                padding: 24,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: colors.cardBorder,
                ...Platform.select({
                  ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
                  android: { elevation: 10 },
                }),
              }}
            >
              {/* Warning Triangle Icon */}
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <MaterialCommunityIcons name="alert-outline" size={28} color="#EF4444" />
              </View>

              {/* Title */}
              <Text style={{
                fontSize: 18,
                fontWeight: '900',
                color: colors.textPrimary,
                textAlign: 'center',
                marginBottom: 10,
              }}>
                Delete Selected Posts?
              </Text>

              {/* Description */}
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.textMuted || '#8DA4B5',
                textAlign: 'center',
                lineHeight: 18,
                marginBottom: 24,
              }}>
                Are you sure you want to delete these {selectedIds.length} posts? This action cannot be undone and it will be permanently removed from your history.
              </Text>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <Pressable
                  disabled={isDeleting}
                  onPress={() => setDeleteModalVisible(false)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.cardBackground,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isDeleting}
                  onPress={handleBatchDelete}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                      Delete
                    </Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}
