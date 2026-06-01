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
  const statusLabel = post.published_at ? 'PUBLISHED' : 'SCHEDULED';
  const statusColor = post.published_at ? '#10B981' : '#0a2341';
  const timeStr = post.scheduled_at ? formatTime(post.scheduled_at) : '';

  return (
    <Modal visible={!!post} transparent animationType="fade">
      <Pressable style={{
        flex: 1, backgroundColor: 'rgba(11, 35, 65, 0.55)',
        justifyContent: 'center', alignItems: 'center', padding: 20,
      }} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={{
          width: '100%', maxWidth: 380, backgroundColor: colors.cardBackground,
          borderRadius: 28, overflow: 'hidden',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 16 }, shadowRadius: 32 },
            android: { elevation: 16 },
          }),
        }}>
          {/* Image */}
          <View style={{ height: 200, backgroundColor: colors.surfaceSoft, position: 'relative' }}>
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
            <View style={{
              position: 'absolute', bottom: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#0b2341', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
            }}>
              <MaterialCommunityIcons name="instagram" size={14} color="#FFF" />
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.8 }}>INSTAGRAM</Text>
            </View>
          </View>

          {/* Body */}
          <View style={{ padding: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: colors.textPrimary, lineHeight: 24 }}>{captionFirstLine}</Text>
              <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 2 }}>STATUS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name={post.published_at ? 'check-circle' : 'clock-outline'} size={12} color={statusColor} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: statusColor, letterSpacing: 0.3 }}>{statusLabel}</Text>
                </View>
              </View>
            </View>

            {/* Time & Location */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {timeStr && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>{timeStr}</Text>
                </View>
              )}
            </View>

            {/* Caption Preview */}
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '600', marginBottom: 24 }} numberOfLines={4}>
              {(post.caption || '').replace(/\n+/g, ' ')}
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts-scheduled'],
    queryFn: () => getSocialPosts(accessToken || '', 1),
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
          subtitle="View and manage your publishing schedule."
          onBack={() => router.back()}
          rightIcon="plus"
          onRightPress={() => router.push('/(main)/social-hub/create-post')}
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
                        if (hasPosts) {
                          if (dayPosts.length === 1) {
                            setSelectedPost(dayPosts[0]);
                          } else {
                            setSelectedDay(isSelected ? null : dayObj.dateKey);
                          }
                        }
                      }}
                      style={{
                        width: CELL_PCT,
                        minHeight: 90,
                        borderRightWidth: (idx + 1) % 7 === 0 ? 0 : 0.5,
                        borderBottomWidth: 0.5,
                        borderColor: colors.cardBorder,
                        padding: 6,
                        backgroundColor: isSelected ? `${colors.accentTeal}08` : 'transparent',
                      }}
                    >
                      {/* Day Number */}
                      <View style={{
                        width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: dayObj.isToday ? colors.accentTeal : 'transparent',
                        marginBottom: 4,
                      }}>
                        <Text style={{
                          fontSize: 13, fontWeight: dayObj.isToday ? '900' : '700',
                          color: dayObj.isToday ? '#FFF' : dayObj.isExtra ? `${colors.textMuted}80` : colors.textPrimary,
                        }}>{dayObj.day}</Text>
                      </View>

                      {/* Event Indicators */}
                      {hasPosts && (
                        <View style={{ gap: 3 }}>
                          {dayPosts.slice(0, 2).map((post) => (
                            <Pressable
                              key={post.id}
                              onPress={() => setSelectedPost(post)}
                              style={{
                                flexDirection: 'row', alignItems: 'center', gap: 3,
                                backgroundColor: `${colors.accentTeal}12`, paddingVertical: 3, paddingHorizontal: 4,
                                borderRadius: 6,
                              }}
                            >
                              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentTeal }} />
                              <Text style={{ fontSize: 7, fontWeight: '800', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                                {(post.caption || '').split('\n')[0].substring(0, 18)}
                              </Text>
                            </Pressable>
                          ))}
                          {dayPosts.length > 2 && (
                            <Text style={{ fontSize: 8, fontWeight: '800', color: colors.accentTeal, paddingLeft: 2 }}>+{dayPosts.length - 2}</Text>
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Expanded Day Posts */}
              {selectedDay && selectedDayPosts.length > 0 && (
                <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>
                      {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    <Pressable onPress={() => setSelectedDay(null)} style={{
                      width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  {selectedDayPosts.map((post) => {
                    const mediaUrl = post.media?.[0]?.media_url;
                    const label = (post.caption || '').split('\n')[0].trim();
                    const time = post.scheduled_at ? formatTime(post.scheduled_at) : '';
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={colors.accentTeal} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{time}</Text>
                            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted, marginHorizontal: 4 }} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accentTeal }}>SCHEDULED</Text>
                          </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} style={{ alignSelf: 'center' }} />
                      </Pressable>
                    );
                  })}
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
      </LinearGradient>
    </View>
  );
}
