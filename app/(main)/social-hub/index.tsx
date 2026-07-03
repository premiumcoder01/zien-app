import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSocialOverview, getSocialPosts, SocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
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
  { id: 'CreatePost', label: 'Create Post', icon: 'plus-circle-outline' as const, route: '/(main)/social-hub/create-post' },
  { id: 'Library', label: 'Content Library', icon: 'image-outline' as const, route: '/(main)/social-hub/content-library' },
  { id: 'Scheduler', label: 'Scheduler', icon: 'calendar-blank-outline' as const, route: '/(main)/social-hub/scheduler' },
  { id: 'History', label: 'Post History', icon: 'history' as const, route: '/(main)/social-hub/post-history' },
  { id: 'Templates', label: 'Templates', icon: 'content-copy' as const, route: '/(main)/social-hub/templates' },
  { id: 'Analytics', label: 'Analytics', icon: 'chart-bar' as const, route: '/(main)/social-hub/analytics' },
  { id: 'Automation', label: 'Automations Rules', icon: 'lightning-bolt-outline' as const, route: '/(main)/social-hub/automation-rules' },
  { id: 'Accounts', label: 'Account Settings', icon: 'cog-outline' as const, route: '/(main)/social-hub/accounts' },
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
  const { theme, colors } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

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

  // Fetch ALL posts to compute dynamic stats
  const { data: allPosts = [] } = useQuery({
    queryKey: ['social-posts-all-index'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  // --- Dynamic stat computations ---

  // Published count (30D) from overview
  const publishedCount = overview?.published_posts_count ?? 0;

  // Published % change: published vs total posts ratio as a percentage
  const totalPostsCount = allPosts.length;
  const publishedMeta = totalPostsCount > 0
    ? `${Math.round((publishedCount / totalPostsCount) * 100)}% of total`
    : '0% of total';

  // Engagement rate: published posts / total posts (as a proxy since no likes/comments in API)
  const engagementRate = totalPostsCount > 0
    ? ((publishedCount / totalPostsCount) * 100).toFixed(1) + '%'
    : '0.0%';

  // Posts with media vs without (as engagement quality proxy)
  const withMediaCount = allPosts.filter(p => p.media && p.media.length > 0).length;
  const engagementMeta = totalPostsCount > 0
    ? `${Math.round((withMediaCount / totalPostsCount) * 100)}% with media`
    : '0% with media';

  // Best platform from post_platforms
  const platformCounts: Record<string, number> = {};
  allPosts.forEach(post => {
    post.post_platforms?.forEach((pp: any) => {
      const name = pp.account?.platform || pp.platform || '';
      if (name) platformCounts[name.toLowerCase()] = (platformCounts[name.toLowerCase()] || 0) + 1;
    });
  });
  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0);
  const bestPlatformKey = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestPlatformName = bestPlatformKey
    ? bestPlatformKey.charAt(0).toUpperCase() + bestPlatformKey.slice(1)
    : 'None';
  const bestPlatformPct = bestPlatformKey && totalPlatformPosts > 0
    ? `${Math.round((platformCounts[bestPlatformKey] / totalPlatformPosts) * 100)}% reach`
    : '—';
  const bestPlatformIcon: any = bestPlatformKey === 'instagram' ? 'instagram'
    : bestPlatformKey === 'facebook' ? 'facebook'
      : bestPlatformKey === 'linkedin' ? 'linkedin'
        : bestPlatformKey === 'tiktok' ? 'music-note'
          : 'trophy-outline';

  const statCards = [
    {
      title: 'SCHEDULED POSTS',
      value: overview ? String(overview.scheduled_posts?.length ?? 0) : '0',
      meta: `${upcomingPosts?.length ?? 0} upcoming`,
      icon: 'calendar-clock-outline' as const
    },
    {
      title: 'PUBLISHED (30D)',
      value: String(publishedCount),
      meta: publishedMeta,
      icon: 'share-outline' as const
    },
    {
      title: 'ENGAGEMENT RATE',
      value: engagementRate,
      meta: engagementMeta,
      icon: 'heart-outline' as const
    },
    {
      title: 'BEST PLATFORM',
      value: bestPlatformName,
      meta: bestPlatformPct,
      icon: bestPlatformIcon
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={[styles.background, { paddingTop: insets.top }]}
      >
        <PageHeader
          title="Social Media"
          subtitle="Automate your property promotion and engage with your audience."
          onBack={() => router.back()}
          rightIcon="menu"
          onRightPress={openMenu}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Performance Summary */}
          <View style={styles.sectionHeaderPremium}>
            <Text style={styles.sectionTitlePremium}>Performance Summary</Text>
          </View>

          <View style={styles.statsGrid}>
            {statCards.map((card, i) => {
              const isBestPlatform = card.title === 'BEST PLATFORM';
              const metaColor = isBestPlatform
                ? (colors.textMuted || '#8DA4B5')
                : '#10B981';

              return (
                <View key={i} style={styles.statCardPremium}>
                  <View style={styles.statCardHeader}>
                    <View style={styles.statIconBox}>
                      <MaterialCommunityIcons name={card.icon} size={16} color={theme === 'dark' ? '#FFFFFF' : colors.accentTeal} />
                    </View>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: metaColor,
                    }}>
                      {card.meta}
                    </Text>
                  </View>
                  <View style={styles.statCardBody}>
                    <Text style={styles.statLabelPremium} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                      <Text
                        style={[
                          styles.statValuePremium,
                          card.value.length > 8 && { fontSize: 13.5 }
                        ]}
                        numberOfLines={1}
                      >
                        {card.value}
                      </Text>

                    </View>
                  </View>
                </View>
              );
            })}
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

          {/* Power-Ups */}
          <Pressable onPress={() => router.push('/(main)/social-hub/accounts')}>
            <LinearGradient
              colors={['#0a2341', '#1B5E9A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.powerUpsCard}
            >
              <View style={styles.powerUpsContent}>
                <Text style={styles.powerUpsTitle}>Power-Ups</Text>
                <Text style={styles.powerUpsDescription}>
                  Connect more accounts to unlock advanced analytics and seamless multi-platform broadcasting.
                </Text>
                <View style={styles.powerUpsPlatformsRow}>
                  {['instagram', 'facebook', 'music-note'].map((icon, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.platformIconBtn}
                      onPress={() => router.push('/(main)/social-hub/accounts')}
                    >
                      <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
                    </Pressable>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Social Templates Section */}
          <View style={styles.sectionHeaderPremiumWithSubtitle}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitlePremium}>Social Templates</Text>
              <Pressable
                onPress={() => router.push('/(main)/social-hub/templates')}
                style={styles.manageLinkRow}
              >
                <Text style={styles.sectionLinkPremium}>Manage</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color={theme === 'dark' ? '#FFFFFF' : colors.accentTeal} />
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitlePremium}>Ready-to-use designs for instant publishing.</Text>
          </View>

          {overviewLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : (overview?.templates || []).length > 0 ? (
            <View style={{ gap: 8 }}>
              {(overview?.templates || []).map((tpl: any) => {
                const platformLower = (tpl.platform || '').toLowerCase();
                const platformIcon = platformLower === 'instagram' ? 'instagram' :
                  platformLower === 'facebook' ? 'facebook' :
                    platformLower === 'linkedin' ? 'linkedin' :
                      platformLower === 'tiktok' ? 'music-note' : 'layers-outline';

                return (
                  <Pressable
                    key={tpl.id}
                    style={styles.templateCardPremium}
                    onPress={() => router.push('/(main)/social-hub/templates')}
                  >
                    <View style={styles.templateIconBox}>
                      <MaterialCommunityIcons name={platformIcon as any} size={22} color={theme === 'dark' ? '#FFFFFF' : colors.accentTeal} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{tpl.name}</Text>
                      <View style={styles.templatePlatformRow}>
                        <MaterialCommunityIcons name="creation" size={12} color="#f97316" style={{ marginRight: 2 }} />
                        <Text style={styles.templatePlatformText}>{tpl.platform}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyPostsBox}>
              <MaterialCommunityIcons name="layers-off-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyPostsText}>No templates created</Text>
              <Text style={styles.emptyPostsSub}>Manage templates to add your first design</Text>
            </View>
          )}

          <View style={{ height: 16 }} />

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      {/* Sidebar Drawer Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.drawerContent,
              {
                transform: [{ translateX: slideAnim }],
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Social Hub Menu</Text>
              <Pressable onPress={closeMenu} style={styles.drawerCloseBtn} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Menu items */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerScrollContent}>
              {HUB_TOOLS.map((tool) => (
                <Pressable
                  key={tool.id}
                  style={({ pressed }) => [styles.drawerItem, pressed && styles.drawerItemPressed]}
                  onPress={() => {
                    closeMenu();
                    router.push(tool.route as any);
                  }}
                >
                  <View style={styles.drawerItemIconWrap}>
                    <MaterialCommunityIcons
                      name={tool.icon}
                      size={14}
                      color={colors.textPrimary}
                    />
                  </View>
                  <Text style={styles.drawerItemLabel}>{tool.label}</Text>
                  {(() => {
                    const count = tool.id === 'Scheduler'
                      ? (upcomingPosts?.length ?? overview?.scheduled_posts?.length ?? 0)
                      : tool.id === 'Templates'
                        ? (overview?.templates?.length ?? 0)
                        : null;
                    if (count !== null && count > 0) {
                      return (
                        <View style={styles.drawerItemBadge}>
                          <Text style={styles.drawerItemBadgeText}>{count}</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <MaterialCommunityIcons name="chevron-right" size={12} color={colors.textMuted || '#9CA3AF'} />
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function getStyles(colors: any, theme: string) {
  const accentColor = theme === 'dark' ? '#FFFFFF' : colors.accentTeal;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSoft },
    background: { flex: 1 },
    headerCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    sectionHeaderPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 20 },
    sectionTitlePremium: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.2 },
    sectionLinkPremium: { fontSize: 13, fontWeight: '800', color: accentColor },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCardPremium: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'column', alignItems: 'stretch', gap: 12 },
    statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    toolsGrid: { flexDirection: 'column', gap: 10 },
    toolCardPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder
    },
    toolLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toolIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    toolLabelPremium: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    usageCardPremium: { marginTop: 30, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
    usageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    usageTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.textPrimary },
    usageCount: { fontSize: 12, fontWeight: '900', color: accentColor },
    usageBar: { height: 6, backgroundColor: colors.surfaceSoft, borderRadius: 3, overflow: 'hidden' },
    usageFill: { height: '100%', backgroundColor: accentColor, borderRadius: 3 },
    fab: { position: 'absolute', right: 20, borderRadius: 28, ...Platform.select({ ios: { shadowColor: '#0a2341', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, android: { elevation: 8 } }) },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    powerUpsCard: { borderRadius: 20, overflow: 'hidden', marginTop: 24, marginBottom: 12 },
    powerUpsContent: { padding: 20 },
    powerUpsTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
    powerUpsDescription: { fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 18, marginBottom: 20 },
    powerUpsPlatformsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    platformIconBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
    sectionHeaderPremiumWithSubtitle: { marginTop: 24, marginBottom: 16 },
    sectionSubtitlePremium: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
    manageLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    templateCardPremium: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
    templateIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(13, 148, 136, 0.08)', alignItems: 'center', justifyContent: 'center' },
    templateInfo: { flex: 1, marginLeft: 14 },
    templateName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    templatePlatformRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    templatePlatformText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    drawerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 27, 42, 0.75)',
    },
    drawerContent: {
      width: Dimensions.get('window').width * 0.52,
      height: '100%',
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
      borderLeftWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: -3, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      marginBottom: 10,
    },
    drawerTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    drawerCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerScrollContent: {
      paddingBottom: 24,
      gap: 3,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      gap: 8,
      borderRadius: 10,
      marginBottom: 2,
    },
    drawerItemPressed: {
      backgroundColor: colors.surfaceSoft,
    },
    drawerItemIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerItemLabel: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    drawerItemBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 8,
      minWidth: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    drawerItemBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textSecondary,
    },
  });
}
