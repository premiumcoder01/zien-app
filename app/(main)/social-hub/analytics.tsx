import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getProperties } from '@/services/propertyService';
import { getSocialPosts, type SocialPost } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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

type TimeframeType = 'Today' | 'Month-Wise' | 'Year-Wise';

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

const checkIsAutomated = (post: any): boolean => {
  if (!post) return false;
  return (
    post.is_automated === true ||
    post.is_automated === 1 ||
    post.is_automated === '1' ||
    post.is_automated === 'true'
  );
};

export default function AnalyticsScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [timeframe, setTimeframe] = useState<TimeframeType>('Month-Wise');
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState('');
  const [exportCacheUri, setExportCacheUri] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Fetch posts from API
  const { data: posts = [], isLoading: isPostsLoading } = useQuery({
    queryKey: ['social-posts-all'],
    queryFn: () => getSocialPosts(accessToken || ''),
    enabled: !!accessToken,
  });

  // 2. Fetch properties to resolve property address for CSV export
  const { data: properties = [], isLoading: isPropertiesLoading } = useQuery({
    queryKey: ['properties-all'],
    queryFn: async () => {
      const resp = await getProperties(accessToken || '');
      return resp.properties || [];
    },
    enabled: !!accessToken,
  });

  const isLoading = isPostsLoading || isPropertiesLoading;

  // 3. Filter posts based on selected Timeframe ('Today' | 'Month-Wise' | 'Year-Wise')
  const filteredPosts = useMemo(() => {
    if (!posts || !Array.isArray(posts)) return [];
    const now = new Date();

    return posts.filter((post: SocialPost) => {
      const dateStr = post.published_at || post.scheduled_at || post.created_at;
      if (!dateStr) return false;
      const postDate = new Date(dateStr);
      if (isNaN(postDate.getTime())) return false;

      if (timeframe === 'Today') {
        // Strict Today filter matching Web UI (same calendar day)
        return (
          postDate.getFullYear() === now.getFullYear() &&
          postDate.getMonth() === now.getMonth() &&
          postDate.getDate() === now.getDate()
        );
      } else if (timeframe === 'Month-Wise') {
        // Last 12 months (365 days)
        const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 365;
      } else {
        // Year-Wise: Last 5 Years
        const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 1825;
      }
    });
  }, [posts, timeframe]);

  // Use filtered posts directly matching Web UI
  const displayPosts = filteredPosts;

  // Reset selected bar when timeframe changes
  const handleTimeframeChange = (tf: TimeframeType) => {
    setTimeframe(tf);
    setSelectedBarIdx(null);
  };

  // 4. Platform Syndications Breakdown
  const platformStats = useMemo(() => {
    const counts = { instagram: 0, facebook: 0, tiktok: 0, linkedin: 0 };
    let totalSyndications = 0;

    displayPosts.forEach(post => {
      post.post_platforms?.forEach((platObj: any) => {
        const pName = platObj.account?.platform?.toLowerCase();
        if (pName && pName in counts) {
          counts[pName as keyof typeof counts]++;
          totalSyndications++;
        }
      });
    });

    const percentages = {
      instagram: totalSyndications > 0 ? Math.round((counts.instagram / totalSyndications) * 100) : 0,
      facebook: totalSyndications > 0 ? Math.round((counts.facebook / totalSyndications) * 100) : 0,
      tiktok: totalSyndications > 0 ? Math.round((counts.tiktok / totalSyndications) * 100) : 0,
      linkedin: totalSyndications > 0 ? Math.round((counts.linkedin / totalSyndications) * 100) : 0,
    };

    return { counts, percentages, total: totalSyndications };
  }, [displayPosts]);

  // 5. Automated vs Manual Publishing Breakdown
  const automatedCount = useMemo(() => {
    return displayPosts.filter(p => checkIsAutomated(p)).length;
  }, [displayPosts]);

  const manualCount = useMemo(() => {
    return displayPosts.length - automatedCount;
  }, [displayPosts, automatedCount]);

  const platformAutoManual = useMemo(() => {
    const data = {
      instagram: { auto: 0, manual: 0 },
      facebook: { auto: 0, manual: 0 },
      linkedin: { auto: 0, manual: 0 },
      tiktok: { auto: 0, manual: 0 },
    };

    displayPosts.forEach(post => {
      const isAuto = checkIsAutomated(post);
      post.post_platforms?.forEach((platObj: any) => {
        const pName = platObj.account?.platform?.toLowerCase();
        if (pName && pName in data) {
          if (isAuto) data[pName as keyof typeof data].auto++;
          else data[pName as keyof typeof data].manual++;
        }
      });
    });

    return data;
  }, [displayPosts]);

  const maxAutoManualVal = useMemo(() => {
    const vals = Object.values(platformAutoManual).flatMap(d => [d.auto, d.manual]);
    return Math.max(...vals, 8);
  }, [platformAutoManual]);

  // 6. Dominant Platform calculation
  const dominantPlatformInfo = useMemo(() => {
    const platforms = [
      { name: 'Instagram', count: platformStats.counts.instagram, pct: platformStats.percentages.instagram },
      { name: 'Facebook', count: platformStats.counts.facebook, pct: platformStats.percentages.facebook },
      { name: 'TikTok', count: platformStats.counts.tiktok, pct: platformStats.percentages.tiktok },
      { name: 'LinkedIn', count: platformStats.counts.linkedin, pct: platformStats.percentages.linkedin },
    ];

    let maxItem = platforms[0];
    platforms.forEach(p => {
      if (p.count > maxItem.count) maxItem = p;
    });

    return {
      name: maxItem.count > 0 ? maxItem.name : 'Instagram',
      pct: maxItem.count > 0 ? `${maxItem.pct}%` : '33%',
    };
  }, [platformStats]);

  // 7. Stacked Bar Chart Data for Platform Publishing Activity
  const activityBuckets = useMemo(() => {
    const now = new Date();
    let buckets: {
      label: string;
      fullLabel: string;
      facebook: number;
      instagram: number;
      linkedin: number;
      tiktok: number;
      total: number;
    }[] = [];

    if (timeframe === 'Today') {
      // 12 time slots: 1 AM, 3 AM, 5 AM, 7 AM, 9 AM, 11 AM, 1 PM, 3 PM, 5 PM, 7 PM, 9 PM, 11 PM
      const hours = ['1 AM', '3 AM', '5 AM', '7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM'];
      buckets = hours.map(h => ({
        label: h,
        fullLabel: `${h} (Today)`,
        facebook: 0,
        instagram: 0,
        linkedin: 0,
        tiktok: 0,
        total: 0,
      }));

      displayPosts.forEach(post => {
        const dStr = post.published_at || post.scheduled_at || post.created_at;
        if (!dStr) return;
        const d = new Date(dStr);
        const hour = d.getHours();
        const bucketIdx = Math.min(11, Math.floor(hour / 2));

        post.post_platforms?.forEach((platObj: any) => {
          const pName = platObj.account?.platform?.toLowerCase();
          if (pName && pName in buckets[bucketIdx]) {
            (buckets[bucketIdx] as any)[pName]++;
            buckets[bucketIdx].total++;
          }
        });
      });
    } else if (timeframe === 'Month-Wise') {
      // 12 Months: Last 12 months ending with current month (matching Web UI screenshot 1)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mLabel = monthNames[d.getMonth()];
        const year = d.getFullYear();
        buckets.push({
          label: mLabel,
          fullLabel: `${mLabel} ${year}`,
          facebook: 0,
          instagram: 0,
          linkedin: 0,
          tiktok: 0,
          total: 0,
        });
      }

      displayPosts.forEach(post => {
        const dStr = post.published_at || post.scheduled_at || post.created_at;
        if (!dStr) return;
        const d = new Date(dStr);
        const postMonth = monthNames[d.getMonth()];
        const postYear = d.getFullYear();

        buckets.forEach(b => {
          if (b.label === postMonth && b.fullLabel.includes(String(postYear))) {
            post.post_platforms?.forEach((platObj: any) => {
              const pName = platObj.account?.platform?.toLowerCase();
              if (pName && pName in b) {
                (b as any)[pName]++;
                b.total++;
              }
            });
          }
        });
      });
    } else {
      // 5 Years: Last 5 years (matching Web UI screenshot 2) e.g. 2022, 2023, 2024, 2025, 2026
      const currentYear = now.getFullYear();
      for (let i = 4; i >= 0; i--) {
        const y = currentYear - i;
        buckets.push({
          label: String(y),
          fullLabel: String(y),
          facebook: 0,
          instagram: 0,
          linkedin: 0,
          tiktok: 0,
          total: 0,
        });
      }

      displayPosts.forEach(post => {
        const dStr = post.published_at || post.scheduled_at || post.created_at;
        if (!dStr) return;
        const d = new Date(dStr);
        const postYear = String(d.getFullYear());

        buckets.forEach(b => {
          if (b.label === postYear) {
            post.post_platforms?.forEach((platObj: any) => {
              const pName = platObj.account?.platform?.toLowerCase();
              if (pName && pName in b) {
                (b as any)[pName]++;
                b.total++;
              }
            });
          }
        });
      });
    }

    return buckets;
  }, [displayPosts, timeframe]);

  const maxActivityTotal = useMemo(() => {
    return Math.max(...activityBuckets.map(b => b.total), 8);
  }, [activityBuckets]);

  // CSV Export Builder
  const buildCSV = () => {
    const propertyMap = new Map(properties.map((p: any) => [p.id, p.address]));
    const headers = 'Date,Type,Property Address,Platforms,Status,Caption\n';
    const rows = displayPosts.map(post => {
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
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const filename = `Zien_Social_Analytics_${day}-${month}-${year}.csv`;
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
            await handleShareFileDirectly();
          }
        } else {
          const docUri = `${FileSystem.documentDirectory}${exportFilename}`;
          await FileSystem.copyAsync({ from: exportCacheUri, to: docUri });
          Alert.alert(
            "Download Complete",
            `"${exportFilename}" has been saved directly to your Files app.`
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
        <ActivityIndicator size="large" color="#00a7b5" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Analyzing syndication logs...</Text>
      </LinearGradient>
    );
  }

  const timeframeSubtitle = timeframe === 'Today' ? '(Last 24 Hours)' : timeframe === 'Month-Wise' ? '(Last 12 Months)' : '(Last 5 Years)';
  const activeTooltip = selectedBarIdx !== null ? activityBuckets[selectedBarIdx] : null;

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.background, { paddingTop: insets.top }]}>

      <PageHeader
        title="Analytics"
        subtitle="Deep dive into your social publishing performance."
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header Controls: Timeframe Pills & Export Report */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.topControlsWrap}>
          <View style={styles.timeframeSegmentRow}>
            {(['Today', 'Month-Wise', 'Year-Wise'] as const).map((tf) => {
              const isActive = timeframe === tf;
              return (
                <Pressable
                  key={tf}
                  style={[styles.timeframePill, isActive && styles.timeframePillActive]}
                  onPress={() => handleTimeframeChange(tf)}
                >
                  <Text style={[styles.timeframeText, isActive && styles.timeframeTextActive]}>
                    {tf}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.exportBtn} onPress={handleExportReport}>
            <MaterialCommunityIcons name="download" size={15} color={colors.textPrimary} />
            <Text style={styles.exportBtnText}>Export Report</Text>
          </Pressable>
        </Animated.View>

        {/* Section 1: Platform Publishing Activity (Stacked Bar Chart with Interactive Click Tooltip) */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Platform Publishing Activity</Text>
              <Text style={styles.cardSubtitleTag}>{timeframeSubtitle}</Text>
            </View>

            <View style={styles.stackedChartWrapper}>
              {/* Interactive Tooltip Card Popover (Matching Web UI Screenshot 2) */}
              {activeTooltip && (
                <View style={styles.tooltipPopover}>
                  <Text style={styles.tooltipTitle}>{activeTooltip.fullLabel}</Text>
                  <Text style={[styles.tooltipText, { color: '#1877F2' }]}>
                    Facebook : <Text style={styles.tooltipValue}>{activeTooltip.facebook}</Text>
                  </Text>
                  <Text style={[styles.tooltipText, { color: '#E1306C' }]}>
                    Instagram : <Text style={styles.tooltipValue}>{activeTooltip.instagram}</Text>
                  </Text>
                  <Text style={[styles.tooltipText, { color: '#0A66C2' }]}>
                    LinkedIn : <Text style={styles.tooltipValue}>{activeTooltip.linkedin}</Text>
                  </Text>
                  <Text style={[styles.tooltipText, { color: isDark ? '#E2E8F0' : '#000000' }]}>
                    TikTok : <Text style={styles.tooltipValue}>{activeTooltip.tiktok}</Text>
                  </Text>
                </View>
              )}

              {/* Y-Axis Guidelines */}
              <View style={styles.yAxisOverlay}>
                {[maxActivityTotal, Math.round(maxActivityTotal * 0.75), Math.round(maxActivityTotal * 0.5), Math.round(maxActivityTotal * 0.25), 0].map((val, i) => (
                  <View key={i} style={styles.yAxisLineRow}>
                    <Text style={styles.yAxisText}>{val}</Text>
                    <View style={styles.dashedLine} />
                  </View>
                ))}
              </View>

              {/* Bars Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <View style={styles.barsContainer}>
                  {activityBuckets.map((bucket, idx) => {
                    const barHeightPct = bucket.total > 0 ? Math.max(15, Math.min(100, (bucket.total / maxActivityTotal) * 100)) : 0;
                    const fbPct = bucket.total > 0 ? (bucket.facebook / bucket.total) * 100 : 0;
                    const igPct = bucket.total > 0 ? (bucket.instagram / bucket.total) * 100 : 0;
                    const liPct = bucket.total > 0 ? (bucket.linkedin / bucket.total) * 100 : 0;
                    const ttPct = bucket.total > 0 ? (bucket.tiktok / bucket.total) * 100 : 0;
                    const isSelected = selectedBarIdx === idx;

                    return (
                      <Pressable
                        key={idx}
                        style={[styles.barColumn, isSelected && styles.barColumnSelected]}
                        onPress={() => setSelectedBarIdx(selectedBarIdx === idx ? null : idx)}
                        hitSlop={4}
                      >
                        {/* Number label above bar */}
                        <Text style={styles.barTopTotalText}>{bucket.total > 0 ? bucket.total : ''}</Text>

                        <View style={styles.barTrack}>
                          {bucket.total > 0 ? (
                            <View style={[styles.stackedBarPill, { height: `${barHeightPct}%` }, isSelected && styles.stackedBarPillSelected]}>
                              {/* Stacked Segments */}
                              {ttPct > 0 && <View style={{ height: `${ttPct}%`, backgroundColor: isDark ? '#F43F5E' : '#000000' }} />}
                              {liPct > 0 && <View style={{ height: `${liPct}%`, backgroundColor: '#0A66C2' }} />}
                              {fbPct > 0 && <View style={{ height: `${fbPct}%`, backgroundColor: '#1877F2' }} />}
                              {igPct > 0 && <View style={{ height: `${igPct}%`, backgroundColor: '#E1306C' }} />}
                            </View>
                          ) : (
                            <View style={styles.emptyBarBaseline} />
                          )}
                        </View>

                        <Text style={[styles.barXLabel, isSelected && styles.barXLabelSelected]}>{bucket.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Legend Row */}
              <View style={styles.legendRowCenter}>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: '#1877F2' }]} />
                  <Text style={styles.legendDotText}>Facebook</Text>
                </View>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: '#E1306C' }]} />
                  <Text style={styles.legendDotText}>Instagram</Text>
                </View>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: '#0A66C2' }]} />
                  <Text style={styles.legendDotText}>LinkedIn</Text>
                </View>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: isDark ? '#F43F5E' : '#000000' }]} />
                  <Text style={styles.legendDotText}>TikTok</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section 2: Platform Breakdown */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>Platform Breakdown</Text>

            <View style={styles.platformBreakdownList}>
              {[
                { name: 'Instagram', count: platformStats.counts.instagram, pct: platformStats.percentages.instagram, color: '#E1306C', icon: 'instagram' },
                { name: 'Facebook', count: platformStats.counts.facebook, pct: platformStats.percentages.facebook, color: '#1877F2', icon: 'facebook' },
                { name: 'TikTok', count: platformStats.counts.tiktok, pct: platformStats.percentages.tiktok, color: isDark ? '#E2E8F0' : '#000000', icon: 'music-note' },
                { name: 'LinkedIn', count: platformStats.counts.linkedin, pct: platformStats.percentages.linkedin, color: '#0A66C2', icon: 'linkedin' },
              ].map((p, idx) => (
                <View key={idx} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeaderRow}>
                    <Text style={styles.breakdownName}>{p.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.breakdownCountText}>{p.count} posts</Text>
                      <Text style={styles.breakdownPctText}>{p.pct}% of total</Text>
                    </View>
                  </View>
                  <View style={styles.breakdownTrack}>
                    <View style={[styles.breakdownFill, { width: `${p.pct}%`, backgroundColor: p.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Section 3: Automated vs Manual Publishing (Side-by-side Dual Vertical Bars for Automated & Manual) */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="star-four-points-outline" size={18} color="#00a7b5" />
                <Text style={styles.cardTitle}>Automated vs Manual Publishing</Text>
              </View>
              <View style={styles.autoManualPill}>
                <Text style={styles.autoManualPillText}>
                  Automated: <Text style={{ fontWeight: '900' }}>{automatedCount}</Text> | Manual: <Text style={{ fontWeight: '900' }}>{manualCount}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.autoManualChartWrap}>
              {/* Y-Axis Guidelines */}
              <View style={styles.yAxisOverlay}>
                {[maxAutoManualVal, Math.round(maxAutoManualVal * 0.75), Math.round(maxAutoManualVal * 0.5), Math.round(maxAutoManualVal * 0.25), 0].map((val, i) => (
                  <View key={i} style={styles.yAxisLineRow}>
                    <Text style={styles.yAxisText}>{val}</Text>
                    <View style={styles.dashedLine} />
                  </View>
                ))}
              </View>

              <View style={styles.autoManualBarsRow}>
                {[
                  { name: 'Instagram', data: platformAutoManual.instagram },
                  { name: 'Facebook', data: platformAutoManual.facebook },
                  { name: 'LinkedIn', data: platformAutoManual.linkedin },
                  { name: 'TikTok', data: platformAutoManual.tiktok },
                ].map((item, idx) => {
                  const autoPct = item.data.auto > 0 ? Math.max(12, (item.data.auto / maxAutoManualVal) * 100) : 0;
                  const manualPct = item.data.manual > 0 ? Math.max(12, (item.data.manual / maxAutoManualVal) * 100) : 0;

                  return (
                    <View key={idx} style={styles.autoManualGroupCol}>
                      <View style={styles.dualBarsPairRow}>
                        {/* Automated Bar (Teal) */}
                        <View style={styles.singleBarTrack}>
                          {item.data.auto > 0 ? (
                            <View style={[styles.autoBarFill, { height: `${autoPct}%` }]} />
                          ) : (
                            <View style={styles.emptyBarBaseline} />
                          )}
                        </View>

                        {/* Manual Bar (Navy) */}
                        <View style={styles.singleBarTrack}>
                          {item.data.manual > 0 ? (
                            <View style={[styles.manualBarFill, { height: `${manualPct}%` }]} />
                          ) : (
                            <View style={styles.emptyBarBaseline} />
                          )}
                        </View>
                      </View>

                      <Text style={styles.autoManualXLabel}>{item.name}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.legendRowCenter}>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: '#00a7b5' }]} />
                  <Text style={styles.legendDotText}>Automated</Text>
                </View>
                <View style={styles.legendDotItem}>
                  <View style={[styles.legendSquareDot, { backgroundColor: isDark ? '#38BDF8' : '#0B2D3E' }]} />
                  <Text style={styles.legendDotText}>Manual</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section 4: KPI Summary Cards (3 Cards Row) */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Total Posts Published</Text>
            <Text style={styles.summaryCardNumber}>{displayPosts.length}</Text>
            <Text style={styles.summaryCardSubtext}>In selected timeframe</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Platforms Synced</Text>
            <Text style={styles.summaryCardNumber}>{platformStats.total}</Text>
            <Text style={styles.summaryCardSubtext}>Total successful syndications</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Dominant Platform</Text>
            <Text style={styles.summaryCardDominantTitle}>{dominantPlatformInfo.name}</Text>
            <Text style={styles.summaryCardSubtext}>{dominantPlatformInfo.pct} of your posts</Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Export Report Modal */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExportModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.exportIconBox}>
              <MaterialCommunityIcons name="file-download-outline" size={28} color="#00a7b5" />
            </View>

            <Text style={styles.sheetTitle}>Export Report</Text>
            <Text style={styles.sheetSubtitle}>
              {displayPosts.length === 0
                ? 'No post data available to export.'
                : `Ready to export "${exportFilename}"`}
            </Text>

            {displayPosts.length > 0 && (
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
                    ? <ActivityIndicator size="small" color="#00a7b5" />
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
                    ? <ActivityIndicator size="small" color="#00a7b5" />
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

function getStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 10, gap: 16 },
    loadingText: {
      marginTop: 14,
      fontWeight: '700',
      fontSize: 13.5,
    },

    // Header Controls
    topControlsWrap: {
      flexDirection: 'column',
      gap: 12,
      marginBottom: 4,
    },
    timeframeSegmentRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(16, 27, 40, 0.85)' : '#F1F5F9',
      padding: 4,
      borderRadius: 14,
      gap: 4,
    },
    timeframePill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeframePillActive: {
      backgroundColor: colors.cardBackground,
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    timeframeText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    timeframeTextActive: {
      color: colors.textPrimary,
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      gap: 6,
      alignSelf: 'flex-end',
    },
    exportBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Main Cards
    cardContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
      gap: 8,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    cardSubtitleTag: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Interactive Tooltip Popover
    tooltipPopover: {
      position: 'absolute',
      top: 0,
      right: 8,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      zIndex: 20,
      minWidth: 135,
    },
    tooltipTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    tooltipText: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    tooltipValue: {
      fontWeight: '900',
    },

    // Stacked Bar Chart
    stackedChartWrapper: {
      position: 'relative',
      paddingTop: 10,
    },
    yAxisOverlay: {
      position: 'absolute',
      top: 10,
      left: 0,
      right: 0,
      height: 150,
      justifyContent: 'space-between',
      zIndex: 0,
    },
    yAxisLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    yAxisText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      width: 14,
    },
    dashedLine: {
      flex: 1,
      height: 1,
      borderStyle: 'dashed',
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    },
    barsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: 175,
      paddingLeft: 24,
      paddingBottom: 24,
      gap: 14,
      minWidth: '100%',
    },
    barColumn: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
      width: 34,
      paddingHorizontal: 2,
    },
    barColumnSelected: {
      backgroundColor: isDark ? 'rgba(0,167,181,0.12)' : 'rgba(0,167,181,0.06)',
      borderRadius: 8,
    },
    barTopTotalText: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
      height: 16,
    },
    barTrack: {
      width: 24,
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    stackedBarPill: {
      width: '100%',
      borderRadius: 6,
      overflow: 'hidden',
      flexDirection: 'column-reverse',
    },
    stackedBarPillSelected: {
      borderWidth: 1.5,
      borderColor: colors.textPrimary,
    },
    emptyBarBaseline: {
      width: '100%',
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      borderRadius: 2,
    },
    barXLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    barXLabelSelected: {
      fontWeight: '900',
      color: colors.textPrimary,
    },
    legendRowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginTop: 16,
      flexWrap: 'wrap',
    },
    legendDotItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendSquareDot: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    legendDotText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Platform Breakdown
    platformBreakdownList: {
      gap: 16,
      marginTop: 14,
    },
    breakdownItem: {
      gap: 6,
    },
    breakdownHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    breakdownName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    breakdownCountText: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    breakdownPctText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    breakdownTrack: {
      height: 7,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderRadius: 4,
      overflow: 'hidden',
    },
    breakdownFill: {
      height: '100%',
      borderRadius: 4,
    },

    // Automated vs Manual
    autoManualPill: {
      backgroundColor: isDark ? 'rgba(0,167,181,0.1)' : '#E6F6F7',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    autoManualPillText: {
      fontSize: 11.5,
      color: isDark ? '#00a7b5' : '#0B2D3E',
      fontWeight: '600',
    },
    autoManualChartWrap: {
      position: 'relative',
      marginTop: 16,
    },
    autoManualBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: 170,
      paddingLeft: 24,
      paddingBottom: 24,
    },
    autoManualGroupCol: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
      flex: 1,
    },
    dualBarsPairRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 6,
      flex: 1,
      width: '100%',
    },
    singleBarTrack: {
      width: 14,
      height: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    autoBarFill: {
      width: '100%',
      backgroundColor: '#00a7b5',
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    manualBarFill: {
      width: '100%',
      backgroundColor: isDark ? '#38BDF8' : '#0B2D3E',
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    autoManualXLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },

    // Summary 3 Cards Row
    summaryGrid: {
      flexDirection: 'column',
      gap: 12,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
      shadowColor: '#0B2D3E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1,
    },
    summaryCardLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    summaryCardNumber: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.textPrimary,
      marginVertical: 2,
    },
    summaryCardDominantTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      marginVertical: 2,
    },
    summaryCardSubtext: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Export Modal Bottom Sheet
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
      backgroundColor: 'rgba(0,167,181,0.1)',
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
