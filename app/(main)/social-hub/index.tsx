import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSocialOverview, getSocialPosts, SocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HUB_TOOLS = [
  { id: 'Library', label: 'Library', icon: 'image-outline' as const, route: '/(main)/social-hub/content-library' },
  { id: 'Scheduler', label: 'Schedule', icon: 'calendar-blank-outline' as const, route: '/(main)/social-hub/scheduler' },
  { id: 'Campaigns', label: 'Campaigns', icon: 'flag-outline' as const, route: '/(main)/social-hub/campaigns' },
  { id: 'Templates', label: 'Templates', icon: 'content-copy' as const, route: '/(main)/social-hub/templates' },
  { id: 'Analytics', label: 'Analytics', icon: 'chart-bar' as const, route: '/(main)/social-hub/analytics' },
  { id: 'Automation', label: 'Automation', icon: 'lightning-bolt-outline' as const, route: '/(main)/social-hub/automation-rules' },
];



const PLACEHOLDER_POST_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400';

function formatScheduledDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

function getPostTitle(post: SocialPost): string {
  // Use the first line of the caption, truncated
  const firstLine = (post.caption || '').split('\n')[0].trim();
  return firstLine || 'Untitled Post';
}

export default function SocialHubScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  // Fetch social overview (live stats)
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['social-overview'],
    queryFn: () => getSocialOverview(accessToken || ''),
    enabled: !!accessToken,
  });

  // Fetch upcoming posts (status=1)
  const { data: upcomingPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['social-posts', 'upcoming'],
    queryFn: () => getSocialPosts(accessToken || '', 1),
    enabled: !!accessToken,
  });

  const statCards = [
    {
      title: 'SCHEDULED POSTS',
      value: overview ? String(overview.scheduled_posts?.length ?? 0) : '0',
      meta: '+2',
      icon: 'calendar-clock-outline' as const
    },
    {
      title: 'PUBLISHED (30D)',
      value: overview ? String(overview.published_posts_count ?? 0) : '0',
      meta: '+15%',
      icon: 'share-outline' as const
    },
    {
      title: 'ENGAGEMENT RATE',
      value: '4.8%',
      meta: '+0.6%',
      icon: 'heart-outline' as const
    },
    {
      title: 'BEST PLATFORM',
      value: 'Instagram',
      meta: '92% reach',
      icon: 'instagram' as const
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={[styles.background, { paddingTop: insets.top }]}
      >
        <PageHeader
          title="Social Hub"
          subtitle="Manage and automate your social presence."
          onBack={() => router.back()}
        >
          <Pressable onPress={() => router.push('/(main)/social-hub/accounts')} style={styles.headerCircleBtn}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </PageHeader>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Performance Summary */}
          <View style={styles.sectionHeaderPremium}>
            <Text style={styles.sectionTitlePremium}>Performance Summary</Text>
          </View>

          <View style={styles.statsGrid}>
            {statCards.map((card, i) => (
              <View key={i} style={styles.statCardPremium}>
                <View style={styles.statCardHeader}>
                  <View style={styles.statIconBox}>
                    <MaterialCommunityIcons name={card.icon} size={16} color={colors.accentTeal} />
                  </View>
                  <Text style={styles.statMetaPremium}>{card.meta}</Text>
                </View>
                <View style={styles.statCardBody}>
                  <Text style={styles.statLabelPremium} numberOfLines={1}>
                    {card.title}
                  </Text>
                  <Text
                    style={[
                      styles.statValuePremium,
                      card.value.length > 5 && { fontSize: 13.5 }
                    ]}
                    numberOfLines={1}
                  >
                    {card.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Upcoming Content — Live from API */}
          <View style={styles.sectionHeaderPremium}>
            <Text style={styles.sectionTitlePremium}>Upcoming Content</Text>
            <Pressable onPress={() => router.push('/(main)/social-hub/scheduler')}>
              <Text style={styles.sectionLinkPremium}>View All</Text>
            </Pressable>
          </View>

          {postsLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : upcomingPosts && upcomingPosts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {upcomingPosts.map((post) => {
                const imageUrl = post.media?.[0]?.media_url || PLACEHOLDER_POST_IMAGE;
                const title = getPostTitle(post);
                const when = post.scheduled_at ? formatScheduledDate(post.scheduled_at) : 'Draft';
                const platformName = post.post_platforms?.[0]?.platform || 'calendar-clock-outline';

                return (
                  <Pressable key={post.id} style={styles.postCardPremium}>
                    <Image source={{ uri: imageUrl }} style={styles.postCardImage} contentFit="cover" transition={300} />
                    <View style={styles.postCardOverlay}>
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

                      {/* Top Action Buttons */}
                      <View style={styles.postCardActions}>
                        <Pressable style={styles.actionIconBtn} onPress={() => router.push({
                          pathname: '/(main)/social-hub/create-post',
                          params: {
                            postId: String(post.id),
                            propertyId: post.property_id ? String(post.property_id) : '',
                            editCaption: post.caption || '',
                            editMedia: JSON.stringify(post.media || []),
                            editScheduledAt: post.scheduled_at || '',
                          }
                        })}>
                          <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFF" />
                        </Pressable>
                        <Pressable style={styles.actionIconBtn} onPress={() => Alert.alert('Delete')}>
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFF" />
                        </Pressable>
                      </View>

                      <View style={styles.postCardContent}>
                        <Text style={styles.postCardTitle} numberOfLines={2}>{title}</Text>
                        <View style={styles.postCardFooter}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color="#FFF" />
                          <Text style={styles.postCardSubText}>{when}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyPostsBox}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyPostsText}>No upcoming posts</Text>
              <Text style={styles.emptyPostsSub}>Tap + to create your first post</Text>
            </View>
          )}

          {/* Tools & Utilities Grid */}
          <View style={styles.sectionHeaderPremium}>
            <Text style={styles.sectionTitlePremium}>Hub Tools</Text>
          </View>

          <View style={styles.toolsGrid}>
            {HUB_TOOLS.map((tool) => (
              <Pressable
                key={tool.id}
                style={styles.toolCardPremium}
                onPress={() => router.push(tool.route as any)}
              >
                <View style={styles.toolIconCircle}>
                  <MaterialCommunityIcons name={tool.icon} size={20} color={colors.textPrimary} />
                </View>
                <Text style={styles.toolLabelPremium}>{tool.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* AI Credits */}
          <View style={styles.usageCardPremium}>
            <View style={styles.usageHeader}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.accentTeal} />
              <Text style={styles.usageTitle}>AI Generation Credits</Text>
              <Text style={styles.usageCount}>150 / 1000</Text>
            </View>
            <View style={styles.usageBar}>
              <View style={[styles.usageFill, { width: '15%' }]} />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/(main)/social-hub/create-post')}
      >
        <LinearGradient colors={['#0a2341', '#0D9488']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSoft },
    background: { flex: 1 },
    headerCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    sectionHeaderPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 20 },
    sectionTitlePremium: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.2 },
    sectionLinkPremium: { fontSize: 13, fontWeight: '800', color: colors.accentTeal },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCardPremium: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'column', alignItems: 'stretch', gap: 12 },
    statCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statCardBody: { gap: 4 },
    statIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    statLabelPremium: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.3 },
    statValuePremium: { fontSize: 15.5, fontWeight: '900', color: colors.textPrimary },
    statMetaPremium: { fontSize: 10, fontWeight: '800', color: '#10B981' },
    statRow: { flexDirection: 'row', alignItems: 'center' },
    horizontalScroll: { gap: 12, paddingRight: 20 },
    postCardPremium: { width: 220, height: 140, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder },
    postCardImage: { width: '100%', height: '100%' },
    postCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end' },
    postCardContent: { padding: 12 },
    postCardTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    postCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    postCardSubText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    postCardActions: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6 },
    actionIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    loaderBox: { height: 140, alignItems: 'center', justifyContent: 'center' },
    emptyPostsBox: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.cardBorder },
    emptyPostsText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    emptyPostsSub: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    toolCardPremium: { width: (SCREEN_WIDTH - 64) / 3, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, gap: 8 },
    toolIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    toolLabelPremium: { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
    usageCardPremium: { marginTop: 30, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
    usageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    usageTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.textPrimary },
    usageCount: { fontSize: 12, fontWeight: '900', color: colors.accentTeal },
    usageBar: { height: 6, backgroundColor: colors.surfaceSoft, borderRadius: 3, overflow: 'hidden' },
    usageFill: { height: '100%', backgroundColor: colors.accentTeal, borderRadius: 3 },
    fab: { position: 'absolute', right: 20, borderRadius: 28, ...Platform.select({ ios: { shadowColor: '#0a2341', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, android: { elevation: 8 } }) },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  });
}
