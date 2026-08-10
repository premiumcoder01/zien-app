import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSocialPosts, SocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAL_MARGIN = 16;
const CELL_PCT = `${100 / 7}%` as any;
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Event Detail Modal ─────────────────────────────────────────────
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

  const statusLabel = post.status === 2 ? 'Published' : post.status === 3 ? 'Failed' : 'Scheduled';
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
export default function SchedulerScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toDateKey(new Date()));

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts-all'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    posts.forEach(p => {
      if (p.scheduled_at) {
        const key = toDateKey(new Date(p.scheduled_at));
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    });
    return map;
  }, [posts]);

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; dateKey: string; isExtra: boolean; isToday: boolean }[] = [];
    const todayKey = toDateKey(new Date());

    // Previous month filler
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ day: d, dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isExtra: true, isToday: false });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateKey: key, isExtra: false, isToday: key === todayKey });
    }

    // Next month filler
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({ day: i, dateKey: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isExtra: true, isToday: false });
    }

    return days;
  }, [currentDate]);

  // Posts for the selected day (bottom sheet)
  const selectedDayPosts = selectedDay ? (postsByDate[selectedDay] || []) : [];

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

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient as any} style={{ flex: 1, paddingTop: insets.top }}>
        <PageHeader
          title="Scheduler"
          subtitle="View and manage your publishing schedule across all platforms."
          onBack={() => router.back()}
        />

        {/* Month Navigation */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 20, marginBottom: 16, gap: 4,
        }}>
          <Pressable onPress={handlePrevMonth} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardBackground,
            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder,
          }}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={{
            backgroundColor: colors.cardBackground, paddingHorizontal: 24, paddingVertical: 10,
            borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, minWidth: 160, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.3 }}>{monthLabel}</Text>
          </View>
          <Pressable onPress={handleNextMonth} style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: colors.cardBackground,
            alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder,
          }}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textPrimary} />
          </Pressable>
        </Animated.View>

        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{
          flex: 1, backgroundColor: colors.cardBackground, borderRadius: 24,
          marginHorizontal: CAL_MARGIN, overflow: 'hidden',
          borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20,
          ...Platform.select({
            ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16 },
            android: { elevation: 6 },
          }),
        }}>
          {/* Weekday Headers */}
          <View style={{
            flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
            backgroundColor: colors.surfaceSoft, paddingHorizontal: 2,
          }}>
            {WEEKDAYS.map(day => (
              <View key={day} style={{ width: CELL_PCT, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.5 }}>{day}</Text>
              </View>
            ))}
          </View>

          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <ActivityIndicator size="large" color={colors.accentTeal} />
              <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '700', color: colors.textMuted }}>Loading schedule...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 2 }}>
                {calendarDays.map((dayObj, idx) => {
                  const dayPosts = postsByDate[dayObj.dateKey] || [];
                  const hasPosts = dayPosts.length > 0;
                  const isSelected = selectedDay === dayObj.dateKey;

                  return (
                    <Pressable
                      key={dayObj.dateKey + idx}
                      onPress={() => {
                        setSelectedDay(dayObj.dateKey);
                      }}
                      style={{
                        width: CELL_PCT,
                        height: 62,
                        borderRightWidth: (idx + 1) % 7 === 0 ? 0 : 0.5,
                        borderBottomWidth: 0.5,
                        borderColor: colors.cardBorder,
                        paddingVertical: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? `${colors.accentTeal}08` : 'transparent',
                      }}
                    >
                      {/* Day Number */}
                      <View style={{
                        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? colors.accentTeal : dayObj.isToday ? `${colors.accentTeal}30` : 'transparent',
                        marginBottom: 4,
                      }}>
                        <Text style={{
                          fontSize: 13, fontWeight: isSelected || dayObj.isToday ? '900' : '700',
                          color: isSelected ? '#FFF' : dayObj.isToday ? colors.accentTeal : dayObj.isExtra ? `${colors.textMuted}60` : colors.textPrimary,
                        }}>{dayObj.day}</Text>
                      </View>

                      {/* Event Indicators */}
                      {hasPosts && (
                        <View style={{ flexDirection: 'row', gap: 3, height: 6, alignItems: 'center', justifyContent: 'center' }}>
                          {dayPosts.slice(0, 3).map((post) => {
                            const statusColor = post.status === 2 ? '#10B981' : post.status === 3 ? '#EF4444' : colors.accentTeal;
                            return (
                              <View
                                key={post.id}
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: 2.5,
                                  backgroundColor: statusColor,
                                }}
                              />
                            );
                          })}
                          {dayPosts.length > 3 && (
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted }} />
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Selected Day Posts List */}
              {selectedDay && (
                <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>
                      {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>

                  {selectedDayPosts.length > 0 ? (
                    selectedDayPosts.map((post) => {
                      const mediaUrl = post.media?.[0]?.media_url;
                      const label = (post.caption || '').split('\n')[0].trim();
                      const time = post.scheduled_at ? formatTime(post.scheduled_at) : '';

                      const platforms = post.post_platforms?.map(p => p.account?.platform?.toLowerCase()).filter(Boolean) || [];

                      const statusLabel = post.status === 2 ? 'Published' : post.status === 3 ? 'Failed' : 'Scheduled';
                      const statusColor = post.status === 2 ? '#10B981' : post.status === 3 ? '#EF4444' : colors.accentTeal;
                      const statusBg = post.status === 2 ? 'rgba(16, 185, 129, 0.08)' : post.status === 3 ? 'rgba(239, 68, 68, 0.08)' : `${colors.accentTeal}12`;

                      return (
                        <Pressable
                          key={post.id}
                          onPress={() => setSelectedPost(post)}
                          style={{
                            flexDirection: 'row', gap: 12, padding: 14, marginBottom: 10,
                            backgroundColor: colors.surfaceSoft, borderRadius: 18,
                            borderWidth: 1, borderColor: colors.cardBorder,
                          }}
                        >
                          {mediaUrl ? (
                            <Image source={{ uri: mediaUrl }} style={{ width: 52, height: 52, borderRadius: 14 }} contentFit="cover" />
                          ) : (
                            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                              <MaterialCommunityIcons name="image-outline" size={22} color={colors.textMuted} />
                            </View>
                          )}
                          <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }} numberOfLines={1}>{label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <MaterialCommunityIcons name="clock-outline" size={11} color={colors.textMuted} />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{time}</Text>
                              </View>

                              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted }} />

                              <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                                backgroundColor: statusBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6
                              }}>
                                <MaterialCommunityIcons
                                  name={post.status === 2 ? 'check-circle' : post.status === 3 ? 'alert-circle' : 'clock-outline'}
                                  size={10}
                                  color={statusColor}
                                />
                                <Text style={{ fontSize: 9, fontWeight: '900', color: statusColor, letterSpacing: 0.3 }}>{statusLabel}</Text>
                              </View>

                              {platforms.length > 0 && (
                                <>
                                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted }} />
                                  <View style={{ flexDirection: 'row', gap: 3 }}>
                                    {platforms.map((plat, idx) => {
                                      const iconName = plat === 'instagram' ? 'instagram' :
                                        plat === 'facebook' ? 'facebook' :
                                          plat === 'linkedin' ? 'linkedin' :
                                            plat === 'twitter' ? 'twitter' : 'layers-outline';
                                      return (
                                        <MaterialCommunityIcons key={plat + idx} name={iconName} size={12} color={colors.textPrimary} />
                                      );
                                    })}
                                  </View>
                                </>
                              )}
                            </View>
                            {post.error_message && (
                              <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600', marginTop: 4 }} numberOfLines={1}>
                                Error: {post.error_message}
                              </Text>
                            )}
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} style={{ alignSelf: 'center' }} />
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="calendar-blank" size={24} color={colors.textMuted} />
                      </View>
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>No posts scheduled</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>
                          Create a post to publish on this day.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          router.push({
                            pathname: '/(main)/social-hub/create-post',
                            params: { defaultDate: selectedDay },
                          });
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          backgroundColor: colors.accentTeal, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
                          marginTop: 4,
                        }}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFF' }}>Schedule Post</Text>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              )}
            </ScrollView>
          )}
        </Animated.View>

        {/* Post Detail Modal */}
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={handleEdit}
        />

        {/* Floating Action Button */}
        <Pressable
          style={{
            position: 'absolute',
            right: 24,
            bottom: insets.bottom + 24,
            borderRadius: 28,
            overflow: 'hidden',
            ...Platform.select({
              ios: { shadowColor: '#0a2341', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
              android: { elevation: 10 },
            }),
          }}
          onPress={() => router.push('/(main)/social-hub/create-post')}
        >
          <LinearGradient
            colors={['#0a2341', '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 20,
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>Create Post</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
