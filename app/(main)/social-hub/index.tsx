import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getAutomationRules, getSocialOverview, getSocialPosts, SocialPost } from '@/services/socialService';
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
  { id: 'Analytics', label: 'Analytics', icon: 'chart-bar' as const, route: '/(main)/social-hub/analytics' },
  { id: 'Automation', label: 'Automation Rules', icon: 'lightning-bolt-outline' as const, route: '/(main)/social-hub/automation-rules' },
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

  // Fetch automation rules for active count
  const { data: automationRules = [] } = useQuery({
    queryKey: ['social-automation-rules'],
    queryFn: () => getAutomationRules(accessToken || ''),
    enabled: !!accessToken,
  });

  // --- Dynamic stat computations matching Web ---
  const publishedCount = overview?.published_posts_count ?? 0;
  const scheduledCount = overview?.scheduled_posts?.length ?? upcomingPosts?.length ?? 0;
  const activeAutomationsCount = Array.isArray(automationRules)
    ? automationRules.filter((r) => r.is_active).length
    : 0;

  // Determine Best Platform from posts
  const platformCounts: Record<string, number> = {};
  allPosts.forEach((post) => {
    if (post.post_platforms && Array.isArray(post.post_platforms)) {
      post.post_platforms.forEach((p: any) => {
        const name = typeof p === 'string' ? p : p?.platform;
        if (name) {
          platformCounts[name.toLowerCase()] = (platformCounts[name.toLowerCase()] || 0) + 1;
        }
      });
    }
  });

  let bestPlatform = 'Facebook';
  let maxCount = 0;
  Object.entries(platformCounts).forEach(([plat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestPlatform = plat.charAt(0).toUpperCase() + plat.slice(1);
    }
  });

  const bestPlatformLower = bestPlatform.toLowerCase();
  const bestPlatformIcon = bestPlatformLower.includes('face')
    ? 'facebook'
    : bestPlatformLower.includes('insta')
    ? 'instagram'
    : bestPlatformLower.includes('tik')
    ? 'music-note'
    : bestPlatformLower.includes('link')
    ? 'linkedin'
    : 'facebook';

  const carouselPostsList =
    overview?.scheduled_posts && overview.scheduled_posts.length > 0
      ? overview.scheduled_posts
      : upcomingPosts && upcomingPosts.length > 0
      ? upcomingPosts
      : [];

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
          {/* Top Quick Actions (Matching Web) */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={styles.outlineActionBtn}
              onPress={() => router.push('/(main)/social-hub/accounts')}
            >
              <MaterialCommunityIcons name="cog-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.outlineActionBtnText}>Account Settings</Text>
            </Pressable>

            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => router.push('/(main)/social-hub/create-post')}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Create New Post</Text>
            </Pressable>
          </View>

          {/* Web-Style Overview Stat Cards Grid */}
          <View style={styles.statsGrid}>
            {/* Card 1: Scheduled Posts */}
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.statLabel}>Scheduled Posts</Text>
              <Text style={styles.statValue}>{scheduledCount}</Text>
            </View>

            {/* Card 2: Published (30 Days) */}
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="share-variant-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.statLabel}>Published (30 Days)</Text>
              <Text style={styles.statValue}>{publishedCount}</Text>
            </View>

            {/* Card 3: Active Automations */}
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.statLabel}>Active Automations</Text>
              <Text style={styles.statValue}>{activeAutomationsCount}</Text>
            </View>

            {/* Card 4: Best Platform */}
            <View style={styles.statCard}>
              <MaterialCommunityIcons name={bestPlatformIcon as any} size={22} color={colors.textSecondary} />
              <Text style={styles.statLabel}>Best Platform</Text>
              <View style={styles.bestPlatformRow}>
                <Text style={styles.statValueText}>{bestPlatform}</Text>
                <Text style={styles.bestPlatformSubText}>Based on recent posts</Text>
              </View>
            </View>
          </View>

          {/* Upcoming Posts Section (Matching Web) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Posts</Text>
            <Pressable
              onPress={() => router.push('/(main)/social-hub/scheduler')}
              style={styles.viewCalendarBtn}
            >
              <Text style={styles.viewCalendarText}>View Calendar</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={14}
                color={theme === 'dark' ? '#38BDF8' : colors.accentTeal}
              />
            </Pressable>
          </View>

          {postsLoading && !overview ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : carouselPostsList.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {carouselPostsList.map((post) => {
                const imageUrl = post.media?.[0]?.media_url || PLACEHOLDER_POST_IMAGE;
                const title = getPostTitle(post);
                const when = post.scheduled_at
                  ? formatScheduledDate(post.scheduled_at)
                  : post.created_at
                  ? formatScheduledDate(post.created_at)
                  : 'Draft';

                return (
                  <Pressable key={post.id} style={styles.postCardPremium}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.postCardImage}
                      contentFit="cover"
                      transition={300}
                    />
                    <View style={styles.postCardOverlay}>
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Top Action Buttons */}
                      <View style={styles.postCardActions}>
                        <Pressable
                          style={styles.actionIconBtn}
                          onPress={() =>
                            router.push({
                              pathname: '/(main)/social-hub/create-post',
                              params: {
                                postId: String(post.id),
                                propertyId: post.property_id ? String(post.property_id) : '',
                                editCaption: post.caption || '',
                                editMedia: JSON.stringify(post.media || []),
                                editScheduledAt: post.scheduled_at || '',
                              },
                            })
                          }
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFF" />
                        </Pressable>
                        <Pressable
                          style={styles.actionIconBtn}
                          onPress={() => Alert.alert('Delete Post')}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFF" />
                        </Pressable>
                      </View>

                      <View style={styles.postCardContent}>
                        <Text style={styles.postCardTitle} numberOfLines={2}>
                          {title}
                        </Text>
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
            /* Web-Style Dashed Empty Box */
            <View style={styles.dashedEmptyBox}>
              <Text style={styles.dashedEmptyTitle}>No Upcoming Posts</Text>
              <Text style={styles.dashedEmptySub}>You have a clear schedule.</Text>
              <Pressable
                onPress={() => router.push('/(main)/social-hub/create-post')}
                style={styles.scheduleActionBtn}
              >
                <Text style={styles.scheduleActionText}>+ Schedule a Post</Text>
              </Pressable>
            </View>
          )}

          {/* Power-Ups (Matching Web with LinkedIn Coming Soon) */}
          <View style={styles.powerUpsWrapper}>
            <LinearGradient
              colors={['#081B33', '#0F2C54']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.powerUpsCard}
            >
              <View style={styles.powerUpsContent}>
                <Text style={styles.powerUpsTitle}>Power-Ups</Text>
                <Text style={styles.powerUpsDescription}>
                  Connect more accounts to unlock advanced analytics and seamless multi-platform
                  broadcasting.
                </Text>

                <View style={styles.powerUpsPlatformsRow}>
                  {/* Instagram */}
                  <Pressable
                    style={styles.platformIconBox}
                    onPress={() => router.push('/(main)/social-hub/accounts')}
                  >
                    <MaterialCommunityIcons name="instagram" size={24} color="#FFFFFF" />
                  </Pressable>

                  {/* Facebook */}
                  <Pressable
                    style={styles.platformIconBox}
                    onPress={() => router.push('/(main)/social-hub/accounts')}
                  >
                    <MaterialCommunityIcons name="facebook" size={24} color="#FFFFFF" />
                  </Pressable>

                  {/* TikTok */}
                  <Pressable
                    style={styles.platformIconBox}
                    onPress={() => router.push('/(main)/social-hub/accounts')}
                  >
                    <MaterialCommunityIcons name="music-note" size={24} color="#FFFFFF" />
                  </Pressable>

                  {/* LinkedIn with COMING SOON badge */}
                  <View style={styles.linkedinBoxWrapper}>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>COMING SOON</Text>
                    </View>
                    <Pressable
                      style={[styles.platformIconBox, { opacity: 0.85 }]}
                      onPress={() => router.push('/(main)/social-hub/accounts')}
                    >
                      <MaterialCommunityIcons name="linkedin" size={24} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Social Templates Section */}
          <View style={styles.sectionHeaderWithSubtitle}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Social Templates</Text>
              <Pressable
                onPress={() => router.push('/(main)/social-hub/templates')}
                style={styles.manageLinkRow}
              >
                <Text style={styles.viewCalendarText}>Manage</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={14}
                  color={theme === 'dark' ? '#38BDF8' : colors.accentTeal}
                />
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitle}>Ready-to-use designs for instant publishing.</Text>
          </View>

          {overviewLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={colors.accentTeal} />
            </View>
          ) : (overview?.templates || []).length > 0 ? (
            <View style={{ gap: 8 }}>
              {(overview?.templates || []).map((tpl: any) => {
                const platformLower = (tpl.platform || '').toLowerCase();
                const platformIcon =
                  platformLower === 'instagram'
                    ? 'instagram'
                    : platformLower === 'facebook'
                    ? 'facebook'
                    : platformLower === 'linkedin'
                    ? 'linkedin'
                    : platformLower === 'tiktok'
                    ? 'music-note'
                    : 'layers-outline';

                return (
                  <Pressable
                    key={tpl.id}
                    style={styles.templateCard}
                    onPress={() => router.push('/(main)/social-hub/templates')}
                  >
                    <View style={styles.templateIconBox}>
                      <MaterialCommunityIcons
                        name={platformIcon as any}
                        size={22}
                        color={theme === 'dark' ? '#FFFFFF' : colors.accentTeal}
                      />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{tpl.name}</Text>
                      <View style={styles.templatePlatformRow}>
                        <MaterialCommunityIcons
                          name="creation"
                          size={12}
                          color="#f97316"
                          style={{ marginRight: 2 }}
                        />
                        <Text style={styles.templatePlatformText}>{tpl.platform}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyTemplateBox}>
              <MaterialCommunityIcons name="layers-off-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTemplateText}>No templates created</Text>
              <Text style={styles.emptyTemplateSub}>Manage templates to add your first design</Text>
            </View>
          )}

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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.drawerScrollContent}
            >
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
                    const count =
                      tool.id === 'Scheduler'
                        ? upcomingPosts?.length ?? overview?.scheduled_posts?.length ?? 0
                        : tool.id === 'Templates'
                        ? overview?.templates?.length ?? 0
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
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={12}
                    color={colors.textMuted || '#9CA3AF'}
                  />
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
  const accentColor = theme === 'dark' ? '#38BDF8' : colors.accentTeal;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSoft },
    background: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 10 },

    // Action Buttons Row (Matching Web)
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      marginBottom: 16,
    },
    outlineActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    outlineActionBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    primaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: '#0a2341',
    },
    primaryActionBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Stat Cards Grid (Matching Web)
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    statCard: {
      width: (SCREEN_WIDTH - 42) / 2,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'space-between',
      minHeight: 100,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary || colors.textMuted,
      marginTop: 8,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginTop: 2,
    },
    bestPlatformRow: {
      marginTop: 2,
    },
    statValueText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    bestPlatformSubText: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textMuted,
      marginTop: 2,
    },

    // Section Headers
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    viewCalendarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewCalendarText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: accentColor,
    },

    // Dashed Empty Upcoming Posts Box (Matching Web)
    dashedEmptyBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder || '#D1D5DB',
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    dashedEmptyTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    dashedEmptySub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 12,
    },
    scheduleActionBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    scheduleActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: accentColor,
    },

    // Horizontal Scroll for Upcoming Posts
    horizontalScroll: { gap: 12, paddingRight: 20, marginBottom: 20 },
    postCardPremium: {
      width: 220,
      height: 140,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    postCardImage: { width: '100%', height: '100%' },
    postCardOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '100%',
      justifyContent: 'flex-end',
    },
    postCardContent: { padding: 12 },
    postCardTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    postCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    postCardSubText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    postCardActions: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6 },
    actionIconBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    loaderBox: { height: 120, alignItems: 'center', justifyContent: 'center' },

    // Power-Ups (Matching Web)
    powerUpsWrapper: {
      marginBottom: 20,
    },
    powerUpsCard: {
      borderRadius: 18,
      overflow: 'hidden',
    },
    powerUpsContent: {
      padding: 18,
    },
    powerUpsTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: '#FFFFFF',
      marginBottom: 6,
    },
    powerUpsDescription: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: 17,
      marginBottom: 18,
    },
    powerUpsPlatformsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 4,
    },
    platformIconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkedinBoxWrapper: {
      alignItems: 'center',
    },
    comingSoonBadge: {
      backgroundColor: '#EAB308',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    comingSoonText: {
      fontSize: 7.5,
      fontWeight: '900',
      color: '#1E293B',
      letterSpacing: 0.4,
    },

    // Social Templates Section
    sectionHeaderWithSubtitle: {
      marginTop: 6,
      marginBottom: 12,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
      marginTop: 2,
    },
    manageLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    templateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 8,
    },
    templateIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: 'rgba(13, 148, 136, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateInfo: {
      flex: 1,
      marginLeft: 12,
    },
    templateName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 3,
    },
    templatePlatformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    templatePlatformText: {
      fontSize: 11.5,
      color: colors.textMuted,
      fontWeight: '500',
    },
    emptyTemplateBox: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyTemplateText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyTemplateSub: {
      fontSize: 11.5,
      fontWeight: '500',
      color: colors.textMuted,
    },

    // Drawer Menu
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
      width: Dimensions.get('window').width * 0.55,
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

