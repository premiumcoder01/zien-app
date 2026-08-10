import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { deleteOpenHouse, getOpenHouses, OpenHouseEvent } from '@/services/openHouseService';
import { getAllPropertyImages } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EventCard({ event, variant, onDelete }: { event: any; variant: 'live' | 'upcoming' | 'completed'; onDelete: () => void }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const isLive = variant === 'live';
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: event.image }} style={styles.cardImage} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{event.tag}</Text>
        </View>
        {isLive && (
          <View style={styles.liveBadgeFloating}>
            <View style={styles.pulseDot} />
            <Text style={[styles.liveBadgeText, { color: "#fff" }]}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.address}</Text>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{event.date} • {event.time}</Text>
        </View>

        <View style={styles.statsRowRefined}>
          <View style={styles.statItemRefined}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.accentTeal} />
            <Text style={styles.statValueRefined}>{event.visitors}</Text>
            <Text style={styles.statLabelRefined}>Check-ins</Text>
          </View>
          <View style={styles.dividerDot} />
          <View style={styles.statItemRefined}>
            <MaterialCommunityIcons name="fire" size={16} color="#EA580C" />
            <Text style={styles.statValueRefined}>{event.hotLeads}</Text>
            <Text style={styles.statLabelRefined}>Hot Leads</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              router.push({
                pathname: '/(main)/open-house/[id]',
                params: { id: event.id, mode: isLive ? 'live' : 'view' }
              });
            }}
          >
            <MaterialCommunityIcons name={isLive ? "chart-timeline-variant" : "eye-outline"} size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{isLive ? 'Manage Live' : 'View'}</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push(`/(main)/open-house/edit/${event.id}` as any)}>
              <MaterialCommunityIcons name="square-edit-outline" size={18} color={colors.textPrimary} />
            </Pressable>

            <Pressable style={styles.iconBtnDanger} onPress={onDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function OpenHouseScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['open-houses'],
    queryFn: () => getOpenHouses(accessToken || ''),
    enabled: !!accessToken,
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteOpenHouse(accessToken || '', id),
    onSuccess: () => {
      Alert.alert('Success', 'Open house deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['open-houses'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete open house');
    },
  });

  const handleDelete = (id: string | number) => {
    Alert.alert(
      'Delete Open House',
      'Are you sure you want to delete this open house event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id);
          }
        },
      ]
    );
  };

  const mapApiToUi = (event: OpenHouseEvent) => ({
    id: event.id,
    tag: `OH-${event.id.toString().padStart(3, '0')}`,
    address: event.property?.address || 'Unnamed Property',
    date: event.date || 'No Date',
    time: `${event.start_time} - ${event.end_time}`,
    image: event.gallery_images?.[0] || getAllPropertyImages(event.property)[0] || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    visitors: event.visitors_count || 0,
    hotLeads: event.hot_leads_count || 0,
    isLive: event.status === 'live',
  });

  const liveEvents = data?.filter(e => e.status === 'live').map(mapApiToUi) || [];
  const upcomingEvents = data?.filter(e => e.status === 'upcoming').map(mapApiToUi) || [];
  const completedEvents = data?.filter(e => e.status === 'completed').map(mapApiToUi) || [];

  const totalLeads = data?.reduce((acc, curr) => acc + (curr.visitors_count || 0), 0) || 0;
  const avgHotScore = data?.length ? Math.round((data.reduce((acc, curr) => acc + (curr.hot_leads_count || 0), 0) / (totalLeads || 1)) * 100) || 0 : 0;

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      {/* Header Section */}
      <PageHeader
        title="Open House Management"
        subtitle="Track live visitor engagement and measure convention performance."
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accentTeal} />
        }
      >
        <View style={styles.headerControls}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>{totalLeads}</Text>
              <Text style={styles.kpiLabel}>Total Leads</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, { color: colors.accentTeal }]}>{avgHotScore}%</Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Hot Score</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={{ marginTop: 16, color: colors.textSecondary, fontWeight: '600' }}>Loading your events...</Text>
          </View>
        ) : data?.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="calendar-search" size={40} color={colors.accentTeal} />
            </View>
            <Text style={styles.emptyTitle}>No Open Houses Found</Text>
            <Text style={styles.emptySubtitle}>You haven't created any open house events yet. Tap the + button to get started.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(main)/open-house/create')}>
              <Text style={styles.emptyBtnText}>Create Your First Event</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.contentSection}>
            {/* Live Today */}
            {liveEvents.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live Today</Text>
                  <View style={styles.liveBadge}>
                    <MaterialCommunityIcons name="play" size={10} color="#EF4444" />
                    <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                  </View>
                </View>
                {liveEvents.map(event => (
                  <EventCard key={event.id} event={event} variant="live" onDelete={() => handleDelete(event.id)} />
                ))}
              </>
            )}

            {/* Upcoming */}
            {upcomingEvents.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginVertical: 20 }]}>Upcoming</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                  {upcomingEvents.map(event => (
                    <View key={event.id} style={{ width: SCREEN_WIDTH * 0.85 }}>
                      <EventCard event={event} variant="upcoming" onDelete={() => handleDelete(event.id)} />
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Completed */}
            {completedEvents.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginVertical: 20 }]}>Completed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  {completedEvents.map(event => (
                    <View key={event.id} style={{ width: SCREEN_WIDTH * 0.85, marginRight: 16 }}>
                      <EventCard event={event} variant="completed" onDelete={() => handleDelete(event.id)} />
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9, scale: 0.98 }]}
        onPress={() => router.push('/(main)/open-house/create')}
      >
        <LinearGradient
          colors={[colors.accentTeal, '#0D9488']}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
        </LinearGradient>
      </Pressable>

    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    header: {
      paddingTop: 20,
      paddingBottom: 20,
    },
    headerControls: {
      paddingHorizontal: 20,
      marginBottom: 20
    },
    kpiCard: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'space-around'
    },
    kpiItem: {
      alignItems: 'center',
      flex: 1,
    },
    kpiValue: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 4,
    },
    kpiDivider: {
      width: 1,
      height: 30,
      backgroundColor: colors.cardBorder,
    },

    contentSection: {
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.dangerBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      gap: 4,
    },
    liveBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.danger,
      letterSpacing: 0.5,
    },

    // Card
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 3,
    },
    cardImageContainer: {
      height: 140,
      backgroundColor: colors.surfaceSoft,
      position: 'relative',
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    tagBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    liveBadgeFloating: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#EF4444',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    pulseDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#FFF',
    },

    cardContent: {
      padding: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
      letterSpacing: -0.3
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },

    statsRowRefined: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: colors.surfaceIcon + '08',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    statItemRefined: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statValueRefined: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statLabelRefined: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    dividerDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 12,
    },

    cardActions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentTeal,
      paddingVertical: 10,
      borderRadius: 10,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    secondaryActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
    },
    iconBtnDanger: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 10,
    },

    fab: {
      position: 'absolute',
      bottom: 80,
      right: 10,
      width: 60,
      height: 60,
      borderRadius: 30,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    fabGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      marginTop: 60,
    },
    emptyIconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.accentTeal + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    emptyBtn: {
      backgroundColor: colors.accentTeal,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 16,
    },
    emptyBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
    },
  });
}