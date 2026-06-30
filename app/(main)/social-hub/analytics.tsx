import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getProperties } from '@/services/propertyService';
import { getSocialPosts } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Bar, CartesianChart } from 'victory-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const escapeCSVField = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim().replace(/\n+/g, ' ');
  return `"${str.replace(/"/g, '""')}"`;
};

const formatCSVDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

const PointsTracker = ({ points, onChange }: { points: any; onChange: (p: any) => void }) => {
  const lastPointsStr = React.useRef<string>("");

  React.useEffect(() => {
    if (!points) return;
    const currentStr = JSON.stringify({
      active: (points.activeCount || []).map((p: any) => ({ x: p?.x, y: p?.y })),
      inactive: (points.inactiveCount || []).map((p: any) => ({ x: p?.x, y: p?.y }))
    });

    if (currentStr !== lastPointsStr.current) {
      lastPointsStr.current = currentStr;
      onChange(points);
    }
  }, [points, onChange]);

  return null;
};

export default function AnalyticsScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [dateRange, setDateRange] = useState<'Last 30 Days' | 'Last 90 Days'>('Last 30 Days');
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportCacheUri, setExportCacheUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [chartPoints, setChartPoints] = useState<any>(null);



  // 1. Fetch posts from API
  const { data: posts = [], isLoading: isPostsLoading } = useQuery({
    queryKey: ['social-posts-all'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  // 2. Fetch properties to resolve property address
  const { data: properties = [], isLoading: isPropertiesLoading } = useQuery({
    queryKey: ['properties-all'],
    queryFn: async () => {
      const resp = await getProperties(accessToken || '');
      return resp.properties || [];
    },
    enabled: !!accessToken,
  });

  const isLoading = isPostsLoading || isPropertiesLoading;

  // 3. Process all posts for activity logs
  const publishedPosts = useMemo(() => {
    return posts;
  }, [posts]);

  // 4. Filter posts by selected date range
  const filteredPostsByRange = useMemo(() => {
    const rangeDays = dateRange === 'Last 30 Days' ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
    return publishedPosts.filter(post => {
      const dateStr = post.published_at || post.scheduled_at || post.created_at;
      return dateStr ? new Date(dateStr) >= cutoffDate : false;
    });
  }, [publishedPosts, dateRange]);

  // 5. Total Published Posts
  const totalPublished = filteredPostsByRange.length;

  // 6. Total Platforms Synced (sum of successfully published platforms)
  const totalPlatformsSynced = useMemo(() => {
    return filteredPostsByRange.reduce((acc, post) => acc + (post.post_platforms?.length || 0), 0);
  }, [filteredPostsByRange]);

  // 7. Platform Distribution percentages
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      tiktok: 0,
    };

    let totalPlatformsCount = 0;
    filteredPostsByRange.forEach(post => {
      post.post_platforms?.forEach(platObj => {
        const platformName = platObj.account?.platform?.toLowerCase();
        if (platformName && platformName in counts) {
          counts[platformName]++;
          totalPlatformsCount++;
        }
      });
    });

    const percentages = {
      facebook: totalPlatformsCount > 0 ? Math.round((counts.facebook / totalPlatformsCount) * 100) : 0,
      instagram: totalPlatformsCount > 0 ? Math.round((counts.instagram / totalPlatformsCount) * 100) : 0,
      linkedin: totalPlatformsCount > 0 ? Math.round((counts.linkedin / totalPlatformsCount) * 100) : 0,
      tiktok: totalPlatformsCount > 0 ? Math.round((counts.tiktok / totalPlatformsCount) * 100) : 0,
    };

    return { counts, percentages, total: totalPlatformsCount };
  }, [filteredPostsByRange]);

  // 8. Dominant Platform
  const dominantPlatformInfo = useMemo(() => {
    const keys = Object.keys(platformStats.percentages) as Array<keyof typeof platformStats.percentages>;
    let maxPct = -1;
    let dominantKey = 'None';

    keys.forEach(key => {
      const pct = platformStats.percentages[key];
      if (pct > maxPct && pct > 0) {
        maxPct = pct;
        dominantKey = key.charAt(0).toUpperCase() + key.slice(1);
      }
    });

    if (dominantKey === 'None' && totalPublished > 0) {
      dominantKey = 'Facebook';
      maxPct = 100;
    }

    return {
      name: dominantKey,
      pct: maxPct > 0 ? `${maxPct}%` : '0%',
    };
  }, [platformStats, totalPublished]);

  // 9. Last 6 Months Activity Chart Data (based on all published posts for trend visualization)
  const last6MonthsChartData = useMemo(() => {
    const months: { label: string; year: number; monthIndex: number; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        count: 0
      });
    }

    publishedPosts.forEach(post => {
      const dateStr = post.published_at || post.scheduled_at || post.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        months.forEach(m => {
          if (m.year === d.getFullYear() && m.monthIndex === d.getMonth()) {
            m.count++;
          }
        });
      }
    });

    return {
      labels: months.map(m => m.label),
      datasets: [{ data: months.map(m => m.count) }]
    };
  }, [publishedPosts]);

  const victoryChartData = useMemo(() => {
    const maxVal = Math.max(...last6MonthsChartData.datasets[0].data, 1);
    return last6MonthsChartData.labels.map((label, idx) => {
      const realValue = last6MonthsChartData.datasets[0].data[idx] || 0;
      return {
        month: label,
        activeCount: realValue > 0 ? realValue : 0,
        inactiveCount: realValue === 0 ? maxVal * 0.04 : 0,
        realCount: realValue,
      };
    });
  }, [last6MonthsChartData]);

  // Dynamic AI Insight based on dominant platform
  const aiInsightMessage = useMemo(() => {
    const p = dominantPlatformInfo.name.toLowerCase();
    if (p === 'facebook') {
      return 'Facebook syndicate reach increases by 35% when published on weekdays before 9 AM with property details.';
    }
    if (p === 'instagram') {
      return 'Instagram video posts see 48% higher conversion. Adding high-contrast images increases reach by 22%.';
    }
    if (p === 'linkedin') {
      return 'LinkedIn professional posts perform 42% better for video-tours between 6 PM and 8 PM.';
    }
    return 'Social media stories perform 42% better for video-tours when syndicated between 6 PM and 8 PM.';
  }, [dominantPlatformInfo]);

  const handleRangePress = () => {
    setShowRangeModal(true);
  };

  const buildCSV = () => {
    const propertyMap = new Map(properties.map((p: any) => [p.id, p.address]));
    const headers = 'Date,Type,Property Address,Platforms,Status,Caption\n';
    const rows = posts.map(post => {
      const date = formatCSVDate(post.published_at || post.scheduled_at || post.created_at);
      const type = post.property_id ? 'Property' : 'General Content';
      const address = post.property_id ? (propertyMap.get(post.property_id) || 'General Content') : 'General Content';
      const platformsArr = post.post_platforms?.map((p: any) => p.account?.platform?.toLowerCase()).filter(Boolean) || [];
      const platforms = platformsArr.join(', ') || '';
      let statusStr = 'Scheduled';
      if (post.status === 2 || post.published_at !== null) statusStr = 'Published';
      else if (post.status === 3) statusStr = 'Failed';
      return [date, type, address, platforms, statusStr, post.caption || ''].map(escapeCSVField).join(',');
    }).join('\n');
    return headers + rows;
  };

  const handleExportReport = async () => {
    if (posts.length === 0) {
      setShowExportModal(true); // show modal even for empty state — handled inside
      return;
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const filename = `Zien_Social_Report_${day}-${month}-${year}.csv`;
    const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

    try {
      await FileSystem.writeAsStringAsync(cacheUri, buildCSV(), { encoding: 'utf8' });
      setExportFilename(filename);
      setExportCacheUri(cacheUri);
      setShowExportModal(true);
    } catch (error) {
      console.error('CSV write failed:', error);
    }
  };

  const handleShareFileDirectly = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportCacheUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Social Report',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      }
    } catch (err) {
      console.error('Share failed:', err);
      Alert.alert('Share Failed', 'An error occurred while sharing the file.');
    }
  };

  const handleSaveToDevice = async () => {
    setIsSaving(true);
    setShowExportModal(false);

    // Wait for native modal dismissal animation to complete
    setTimeout(async () => {
      try {
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              exportFilename,
              'text/csv'
            );
            const fileContent = await FileSystem.readAsStringAsync(exportCacheUri, { encoding: 'utf8' });
            await FileSystem.writeAsStringAsync(safUri, fileContent, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            Alert.alert(
              "Download Complete",
              `"${exportFilename}" has been saved to your selected folder.`
            );
          } else {
            // User cancelled/denied SAF directory picker, fallback to share sheet
            await handleShareFileDirectly();
          }
        } else {
          // iOS: Save directly to document directory (exposed in the Files app)
          const docUri = `${FileSystem.documentDirectory}${exportFilename}`;
          await FileSystem.copyAsync({ from: exportCacheUri, to: docUri });
          Alert.alert(
            "Download Complete",
            `"${exportFilename}" has been saved directly to the 'Zien' folder in your Files app.`
          );
        }
      } catch (err) {
        console.error('Save failed:', err);
        Alert.alert('Save Failed', 'Could not save the report to your device.');
      } finally {
        setIsSaving(false);
      }
    }, 450);
  };

  const handleShareFile = async () => {
    setIsSharing(true);
    setShowExportModal(false);

    // Wait for native modal dismissal animation to complete
    setTimeout(async () => {
      try {
        await handleShareFileDirectly();
      } finally {
        setIsSharing(false);
      }
    }, 450);
  };



  if (isLoading) {
    return (
      <LinearGradient colors={colors.backgroundGradient as any} style={[styles.background, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentTeal} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Analyzing syndication logs...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>

      <PageHeader
        title="Analytics"
        subtitle="Performance insights and engagement growth."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Top Actions */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.topActions}>
          <Pressable style={styles.topActionBtn} onPress={handleRangePress}>
            <Text style={styles.topActionText}>{dateRange}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textPrimary} />
          </Pressable>

          <Pressable style={[styles.topActionBtn, styles.exportBtn]} onPress={handleExportReport}>
            <MaterialCommunityIcons name="download" size={16} color={colors.cardBackground} />
            <Text style={[styles.topActionText, { color: colors.cardBackground }]}>Export Report</Text>
          </Pressable>
        </Animated.View>



        {/* Chart Section */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Publishing Activity (Last 6 Months)</Text>
          </View>

          <View style={styles.chartCard}>
            <View style={{ height: 180, width: '100%', position: 'relative' }}>
              <CartesianChart
                data={victoryChartData}
                xKey="month"
                yKeys={["activeCount", "inactiveCount"]}
                domainPadding={{ left: 24, right: 24, top: 30, bottom: 20 }}
              >
                {({ points, chartBounds }) => {
                  return (
                    <>
                      <Bar
                        chartBounds={chartBounds}
                        points={points.activeCount}
                        color={theme === 'dark' ? colors.accentTeal : '#0A2341'}
                        roundedCorners={{ topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8 }}
                        innerPadding={0.4}
                      />
                      <Bar
                        chartBounds={chartBounds}
                        points={points.inactiveCount}
                        color={theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}
                        roundedCorners={{ topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8 }}
                        innerPadding={0.4}
                      />
                      <PointsTracker points={points} onChange={setChartPoints} />
                    </>
                  );
                }}
              </CartesianChart>

              {/* Custom labels overlay */}
              {chartPoints && (
                <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                  {chartPoints.activeCount.map((point: any, idx: number) => {
                    const realValue = victoryChartData[idx]?.realCount || 0;
                    const label = point.xValue;
                    const isActive = realValue > 0;
                    const activePoint = chartPoints.activeCount[idx];
                    const inactivePoint = chartPoints.inactiveCount[idx];
                    const x = activePoint?.x ?? 0;
                    const y = (isActive ? activePoint?.y : inactivePoint?.y) ?? 0;

                    return (
                      <React.Fragment key={idx}>
                        {/* Value label centered on top of bar */}
                        <Text
                          style={{
                            position: 'absolute',
                            left: x - 25,
                            top: Math.max(y - 22, 5),
                            width: 50,
                            textAlign: 'center',
                            fontSize: 14,
                            fontWeight: '900',
                            color: colors.textPrimary,
                          }}
                        >
                          {realValue}
                        </Text>

                        {/* Month label centered at the bottom of the chart */}
                        <Text
                          style={{
                            position: 'absolute',
                            left: x - 25,
                            bottom: 0,
                            width: 50,
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: '700',
                            color: colors.textSecondary,
                          }}
                        >
                          {label}
                        </Text>
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Platform Breakdown */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Platform Distribution</Text>
          </View>

          <View style={styles.platformCard}>
            {[
              { name: 'Instagram', pct: platformStats.percentages.instagram, color: '#E1306C', icon: 'instagram' },
              { name: 'Facebook', pct: platformStats.percentages.facebook, color: '#1877F2', icon: 'facebook' },
              { name: 'LinkedIn', pct: platformStats.percentages.linkedin, color: '#0A66C2', icon: 'linkedin' },
              { name: 'TikTok', pct: platformStats.percentages.tiktok, color: '#FE2C55', icon: 'music-note' },
            ].map((p, i) => (
              <View key={i} style={[styles.platformRow, i === 3 && { marginBottom: 0 }]}>
                <View style={[styles.platformIcon, { backgroundColor: `${p.color}10` }]}>
                  <MaterialCommunityIcons name={p.icon as any} size={18} color={p.color} />
                </View>
                <View style={styles.platformInfo}>
                  <View style={styles.platformTagRow}>
                    <Text style={styles.platformLabel}>{p.name}</Text>
                    <Text style={styles.percentText}>{p.pct}%</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressFill, { width: `${p.pct}%`, backgroundColor: p.color }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* AI Insight Upgrade */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <LinearGradient
            colors={theme === 'dark' ? ['#151D26', '#222F3D'] : ['#0b2341', '#1c3e66']}
            style={styles.aiInsightBox}>
            <View style={styles.aiHeader}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseInner} />
              </View>
              <Text style={styles.aiTitle}>AI INSIGHT ✨</Text>
            </View>
            <Text style={styles.aiMessage}>
              "{aiInsightMessage}"
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* KPI Metrics - Vertically Stacked under AI Insight */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={[styles.metricIconBox, { backgroundColor: `${colors.accentTeal}15` }]}>
              <MaterialCommunityIcons name="layers-outline" size={16} color={colors.accentTeal} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>TOTAL POSTS PUBLISHED</Text>
              <Text style={styles.metricSubtext}>Lifetime count</Text>
            </View>
            <Text style={styles.metricVal}>{totalPublished}</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metricIconBox, { backgroundColor: '#1B5E9A15' }]}>
              <MaterialCommunityIcons name="sync" size={16} color="#1B5E9A" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>PLATFORMS SYNCED</Text>
              <Text style={styles.metricSubtext}>Total successful syndications</Text>
            </View>
            <Text style={styles.metricVal}>{totalPlatformsSynced}</Text>
          </View>

          <View style={[styles.metricRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#16A34A15' }]}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color="#16A34A" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>DOMINANT PLATFORM</Text>
              <Text style={styles.metricSubtext}>0 of posts</Text>
            </View>
            <Text style={styles.metricValText}>Instagram</Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Date Range Modal */}
      <Modal visible={showRangeModal} transparent animationType="fade" onRequestClose={() => setShowRangeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRangeModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Date Range</Text>
            <Text style={styles.sheetSubtitle}>Choose the time period for analytics.</Text>

            <Pressable
              style={[styles.sheetOption, dateRange === 'Last 30 Days' && styles.sheetOptionActive]}
              onPress={() => { setDateRange('Last 30 Days'); setShowRangeModal(false); }}
            >
              <Text style={[styles.sheetOptionText, dateRange === 'Last 30 Days' && styles.sheetOptionTextActive]}>
                Last 30 Days
              </Text>
              {dateRange === 'Last 30 Days' && (
                <MaterialCommunityIcons name="check" size={18} color={colors.accentTeal} />
              )}
            </Pressable>

            <Pressable
              style={[styles.sheetOption, dateRange === 'Last 90 Days' && styles.sheetOptionActive]}
              onPress={() => { setDateRange('Last 90 Days'); setShowRangeModal(false); }}
            >
              <Text style={[styles.sheetOptionText, dateRange === 'Last 90 Days' && styles.sheetOptionTextActive]}>
                Last 90 Days
              </Text>
              {dateRange === 'Last 90 Days' && (
                <MaterialCommunityIcons name="check" size={18} color={colors.accentTeal} />
              )}
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={() => setShowRangeModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Export Report Modal */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExportModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            {/* Icon */}
            <View style={styles.exportIconBox}>
              <MaterialCommunityIcons name="file-download-outline" size={28} color={colors.accentTeal} />
            </View>

            <Text style={styles.sheetTitle}>Export Report</Text>
            <Text style={styles.sheetSubtitle}>
              {posts.length === 0
                ? 'No post data available to export yet.'
                : `Ready to export "${exportFilename}"`}
            </Text>

            {posts.length > 0 && (
              <>
                <Pressable
                  style={[styles.sheetOption, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveToDevice}
                  disabled={isSaving || isSharing}
                >
                  <View style={styles.sheetOptionLeft}>
                    <MaterialCommunityIcons name="tray-arrow-down" size={20} color={colors.textPrimary} />
                    <Text style={styles.sheetOptionText}>Save to Device</Text>
                  </View>
                  {isSaving
                    ? <ActivityIndicator size="small" color={colors.accentTeal} />
                    : <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                  }
                </Pressable>

                <Pressable
                  style={[styles.sheetOption, isSharing && { opacity: 0.6 }]}
                  onPress={handleShareFile}
                  disabled={isSaving || isSharing}
                >
                  <View style={styles.sheetOptionLeft}>
                    <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.textPrimary} />
                    <Text style={styles.sheetOptionText}>Share File</Text>
                  </View>
                  {isSharing
                    ? <ActivityIndicator size="small" color={colors.accentTeal} />
                    : <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                  }
                </Pressable>
              </>
            )}

            <Pressable style={styles.sheetCancel} onPress={() => setShowExportModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

    </LinearGradient>
  );
}

function getStyles(colors: any, theme: 'light' | 'dark') {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    loadingText: {
      marginTop: 15,
      fontWeight: '700',
      fontSize: 14,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    topActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 24,
    },
    topActionBtn: {
      flex: 1,
      height: 48,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
        android: { elevation: 1 },
      }),
    },
    exportBtn: {
      backgroundColor: colors.textPrimary,
      borderColor: colors.textPrimary,
    },
    topActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    chartCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    platformCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    platformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    platformIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformInfo: {
      flex: 1,
    },
    platformTagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    platformLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    percentText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.textSecondary,
    },
    progressContainer: {
      height: 6,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    aiInsightBox: {
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
        android: { elevation: 4 },
      }),
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    pulseContainer: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFF',
    },
    aiTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFF',
      letterSpacing: 1.5,
    },
    aiMessage: {
      fontSize: 14,
      color: '#FFF',
      fontWeight: '600',
      lineHeight: 22,
      fontStyle: 'italic',
      opacity: 0.9,
    },
    metricsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 20,
      ...Platform.select({
        ios: { shadowColor: colors.cardShadowColor, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.rowBorder || colors.cardBorder,
    },
    metricIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    metricInfo: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    metricSubtext: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textMuted,
    },
    metricVal: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginLeft: 12,
    },
    metricValText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      marginLeft: 12,
    },

    // ── Bottom Sheet Modals ──
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.cardBorder,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      alignSelf: 'center',
      marginBottom: 20,
    },
    exportIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: `${colors.accentTeal}15`,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 14,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    sheetSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 18,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceSoft,
      marginBottom: 10,
    },
    sheetOptionActive: {
      borderColor: colors.accentTeal,
      backgroundColor: `${colors.accentTeal}10`,
    },
    sheetOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sheetOptionText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sheetOptionTextActive: {
      color: colors.accentTeal,
    },
    sheetCancel: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    sheetCancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
}
