import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { createOpenHouse, getOpenHouses } from '@/services/openHouseService';
import { deleteProperty, getProperties, PropertyStats, RawPropertyItem } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;

const PLACEHOLDER_HOUSE =
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800';


type PropertyStatus = 'Ready' | 'REVIEW NEEDED' | 'DRAFT';

type Property = {
  id: string;
  address: string;
  cityState: string;
  type: string;
  status: PropertyStatus;
  value: string;
  confidence: number;
  image: string;
  syncStatus: string;
};


// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  value,
  label,
  accentColor,
  fullWidth,
}: {
  icon: string;
  value: string;
  label: string;
  accentColor: string;
  fullWidth?: boolean;
}) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const isDark = theme === 'dark';

  return (
    <View style={[styles.statCardContainer, fullWidth && { width: '100%' }]}>
      <LinearGradient
        colors={isDark
          ? [accentColor + '15', accentColor + '05']
          : [accentColor + '10', '#FFFFFF']
        }
        style={[styles.statCard, { borderColor: accentColor + (isDark ? '25' : '15') }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.statHeader]}>
          <View style={[styles.statIconBox, { backgroundColor: accentColor + '15' }]}>
            <MaterialCommunityIcons name={icon as any} size={20} color={accentColor} />
          </View>
          <View style={[styles.statTrend, { backgroundColor: accentColor + '10' }]}>
            <MaterialCommunityIcons name="trending-up" size={12} color={accentColor} />
          </View>
        </View>

        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
            {label === 'Data Confidence' && (
              <View style={styles.tinyDotWrap}>
                <View style={[styles.tinyDot, { backgroundColor: accentColor }]} />
              </View>
            )}
          </View>
        </View>

        {/* Subtle decorative element */}
        <View style={[styles.statDecoration, { backgroundColor: accentColor + '08' }]} />
      </LinearGradient>
    </View>
  );
}

// ── Confidence Bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const barColor =
    value >= 85 ? '#0D9488' : value >= 60 ? '#EA580C' : '#DC2626';
  return (
    <View style={styles.confidenceWrap}>
      <Text style={[styles.confidencePct, { color: barColor }]}>{value}%</Text>
      <View style={styles.confidenceTrack}>
        <View
          style={[
            styles.confidenceFill,
            { width: `${Math.min(100, value)}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: PropertyStatus }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const isReady = status === 'Ready';
  const isReview = status === 'REVIEW NEEDED';
  const bg = isReady
    ? 'rgba(13,148,136,0.12)'
    : isReview
      ? 'rgba(234,88,12,0.12)'
      : 'rgba(100,116,139,0.10)';
  const color = isReady ? '#0D9488' : isReview ? '#C2410C' : '#64748B';
  const dot = isReady ? '#0D9488' : isReview ? '#C2410C' : '#94A3B8';
  const label = isReady ? 'READY' : isReview ? 'REVIEW' : 'DRAFT';

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: dot }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  property,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  property: Property | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <Modal
      visible={!!property}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalCard} onPress={() => { }}>
          {/* Icon */}
          <View style={styles.modalIconWrap}>
            <MaterialCommunityIcons name="trash-can-outline" size={30} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>Delete Property?</Text>

          {/* Body */}
          <Text style={styles.modalBody}>
            {'Are you sure you want to delete '}
            {'?\nThis action cannot be undone.'}
          </Text>

          {/* Buttons */}
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalDeleteBtn, isDeleting && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.modalDeleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Property Row Card ─────────────────────────────────────────────────────────
function PropertyRowCard({
  property,
  onManage,
  onEdit,
  onDeletePress,
}: {
  property: Property;
  onManage: (p: Property) => void;
  onEdit: (p: Property) => void;
  onDeletePress: (p: Property) => void;
}) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { accessToken } = useAuth();

  return (
    <View style={styles.propertyCard}>
      {/* Top Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.image }}
          style={styles.cardImage}
          contentFit="cover"
        />
        
        {/* Floating Header Badges */}
        <View style={styles.floatingHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{property.type}</Text>
          </View>
          <StatusPill status={property.status} />
        </View>

        {/* Floating Price overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
          style={styles.imageOverlay}
        >
          <Text style={styles.overlayPrice}>{property.value}</Text>
        </LinearGradient>
      </View>

      {/* Card Info Body */}
      <View style={styles.cardBody}>
        {/* Address and ID Row */}
        <View style={styles.bodyHeader}>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {property.address}
          </Text>
          {property.cityState ? (
            <Text style={styles.cardCityState} numberOfLines={1}>
              {property.cityState}
            </Text>
          ) : null}
          
          <View style={styles.idAndSyncRow}>
            <Text style={styles.cardIdText}>ID: {property.id}</Text>
            <View style={styles.bulletSeparator} />
            <View style={styles.syncContainer}>
              <MaterialCommunityIcons name="cloud-check" size={13} color={colors.accentTeal} />
              <Text style={styles.cardSyncText}>{property.syncStatus}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Confidence Section */}
        <View style={styles.middleInfoRow}>
          <Text style={styles.confidenceLabel}>DATA CONFIDENCE</Text>
          <View style={styles.confidenceValRow}>
            <ConfidenceBar value={property.confidence} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => onManage(property)}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={colors.accentTeal} />
          </Pressable>
          <Pressable
            onPress={() => onEdit(property)}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={async () => {
              try {
                const events = await getOpenHouses(accessToken || '');
                const existingEvent = events.find(e => e.property_id === Number(property.id));
                if (existingEvent) {
                  router.push(`/(main)/open-house/edit/${existingEvent.id}` as any);
                } else {
                  const defaultDate = new Date();
                  defaultDate.setDate(defaultDate.getDate() + 7);
                  const dateStr = defaultDate.toISOString().split('T')[0];

                  const payload = {
                    property_id: Number(property.id),
                    date: dateStr,
                    start_time: "10:00",
                    end_time: "12:00",
                    agent_details: {
                      name: "sweta",
                      brokerage: "zien",
                      license: "23243654765",
                      email: "sweta.isynbus@gmail.com",
                      phone: "+91 93196-14264"
                    },
                    ai_description: "Breathtaking Luxury estate featuring rare architectural details, bespoke imported finishes, and a seamless connection to private, manicured grounds. This residence offers an unparalleled lifestyle for those who demand excellence in every square inch.",
                    brand_color: "#0B2D3E",
                    gallery_images: [],
                    logo_text: "sweta",
                    ai_tone: "Luxury",
                    visitor_registration: true,
                    send_report: true,
                  };

                  const res = await createOpenHouse(accessToken || '', payload);
                  const newEventId = res?.data?.id || res?.id;
                  if (newEventId) {
                    router.push(`/(main)/open-house/edit/${newEventId}` as any);
                  } else {
                    Alert.alert('Error', 'Failed to create open house event.');
                  }
                }
              } catch (err) {
                console.error(err);
                Alert.alert('Error', 'An error occurred while routing to the open house page.');
              }
            }}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={colors.accentTeal} />
          </Pressable>
          <Pressable
            onPress={() => {
              const cleanAddress = [property.address, property.cityState].filter(Boolean).join(', ');
              const fullAddress = cleanAddress.toLowerCase().includes('usa') ? cleanAddress : `${cleanAddress}, USA`;
              router.push({
                pathname: '/(main)/crm/campaigns',
                params: {
                  openAiModal: 'true',
                  aiPrompt: `Write a persuasive email campaign promoting my new listing at ${fullAddress}. Include a strong call to action for the recipient to click the link to view the property photos and RSVP.`
                }
              });
            }}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="bullhorn-outline" size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/social-hub/create-post')}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={18} color="#EA580C" />
          </Pressable>
          <Pressable
            onPress={() => onDeletePress(property)}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function PropertyInventoryScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getProperties(accessToken!);
      if (res.success) {
        const mapped = res.properties.map(mapRawToProperty);
        setProperties(mapped);
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setError('Failed to load properties');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const extractFirstImage = (raw: RawPropertyItem): string => {
    const d = raw.data || {};
    
    const getArray = (field: any): any[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
      return [];
    };

    // 1. Try user_images
    const userImages = getArray(d.user_images || d.userImages);
    if (userImages.length > 0) {
      const first = userImages[0];
      const url = typeof first === 'string' ? first : (first.url || first.uri || first.MediaURL || first.MediaUrl);
      if (url) return url;
    }

    // 2. Try images / Images
    const images = getArray(d.images || d.Images || (raw as any).images || (raw as any).Images);
    if (images.length > 0) {
      const first = images[0];
      const url = typeof first === 'string' ? first : (first.url || first.uri || first.MediaURL || first.MediaUrl || first.URL);
      if (url) return url;
    }

    // 3. Try Media / media
    const media = getArray(d.Media || d.media);
    if (media.length > 0) {
      const first = media[0];
      const url = typeof first === 'string' ? first : (first.MediaURL || first.MediaUrl || first.url || first.URL || first.uri);
      if (url) return url;
    }

    return PLACEHOLDER_HOUSE;
  };

  const mapRawToProperty = (raw: RawPropertyItem): Property => {
    const d = raw.data;
    const price = d.ListPrice || 0;
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

    return {
      id: raw.id.toString(),
      address: d.StreetNumber ? `${d.StreetNumber} ${d.StreetName} ${d.StreetSuffix || ''}`.trim() : raw.address,
      cityState: d.City ? `${d.City}, ${d.StateOrProvince || ''}` : '',
      type: d.PropertyType || 'Residential',
      status: 'Ready', // Default to Ready as per user request
      value: formattedPrice,
      confidence: 94,
      image: extractFirstImage(raw),
      syncStatus: 'SYNCED',
    };
  };

  // ── Stats Calculations ──
  const totalValueNum = stats
    ? stats.totalValue
    : properties.reduce((acc, p) => {
      const val = parseFloat(p.value.replace(/[$,]/g, '')) || 0;
      return acc + val;
    }, 0);

  const formattedPortfolioValue = totalValueNum >= 1000000
    ? `$${(totalValueNum / 1000000).toFixed(1)}M`
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValueNum);

  const activeCount = stats ? stats.activeCount : properties.length;
  const draftCount = stats ? stats.draftCount : 0;
  const avgConfidence = stats ? stats.avgConfidence : 94;

  const handleCreateListing = () => {
    router.push('/(main)/properties/create');
  };

  const handleManageData = (property: Property) => {
    router.push({
      pathname: '/(main)/properties/[id]',
      params: { id: property.id },
    });
  };

  const handleEditProperty = (property: Property) => {
    router.push({
      pathname: '/(main)/properties/edit/[id]',
      params: { id: property.id },
    });
  };

  const handleDeletePress = (property: Property) => {
    setDeleteTarget(property);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !accessToken) return;

    try {
      setIsLoading(true);
      const res = await deleteProperty(parseInt(deleteTarget.id), accessToken);

      if (res.success) {
        setDeleteTarget(null);
        await fetchData();
      } else {
        alert(res.message || "Failed to delete property");
      }
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(err.message || "An error occurred during deletion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <PageHeader
        title="Property "
        subtitle="Manage your high-confidence property data."
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 3 STAT CARDS ── */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="currency-usd"
            value={formattedPortfolioValue}
            label="Portfolio Value"
            accentColor={colors.accentTeal}
          />
          <StatCard
            icon="home-outline"
            value={`${activeCount} Active`}
            label="Total Properties"
            accentColor={colors.accentBlue}
          />
          <StatCard
            icon="chart-bell-curve-cumulative"
            value={`${Math.round(avgConfidence)}% Avg.`}
            label="Data Confidence"
            accentColor={colors.accentGreen}
            fullWidth
          />
        </View>

        {isLoading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.statusInfoText}>Loading properties...</Text>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && properties.length === 0 && (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="home-city-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No properties found.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleCreateListing}>
              <Text style={styles.retryBtnText}>Add Your First Property</Text>
            </TouchableOpacity>
          </View>
        )}



        {/* ── LIST HEADER (Only show if properties exist) ── */}
        {properties.length > 0 && (
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderText}>PROPERTY IDENTITY</Text>
            <Text style={styles.tableHeaderText}>STATUS</Text>
          </View>
        )}

        {/* ── PROPERTY LIST ── */}
        <View style={styles.listContainer}>
          {properties.map((property) => (
            <PropertyRowCard
              key={property.id}
              property={property}
              onManage={handleManageData}
              onEdit={handleEditProperty}
              onDeletePress={handleDeletePress}
            />
          ))}
        </View>

        {/* ── DELETE MODAL ── */}
        <DeleteConfirmModal
          property={deleteTarget}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          isDeleting={isLoading}
        />

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Floating Add Property Button ── */}
      <Pressable
        onPress={handleCreateListing}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24 },
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        ]}
      >
        <LinearGradient
          colors={['#0D2F45', '#0B3B50']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.fabText}>Add Property</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_GAP = 12;
const CARD_W = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },



    // ── Scroll ──
    scrollContent: {
      paddingBottom: 20,
      paddingTop: 4,
    },

    // ── Stat Cards Grid ──
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: H_PADDING,
      gap: CARD_GAP,
      marginBottom: 20,
    },
    statCardContainer: {
      width: CARD_W,
      borderRadius: 22,
      overflow: 'hidden',
    },
    statCard: {
      padding: 16,
      height: 120, // fixed height for consistency
      justifyContent: 'space-between',
      borderWidth: 1.5,
    },
    statHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statTrend: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statContent: {
      marginTop: 8,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    statLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statLabel: {
      fontSize: 9,
      color: colors.textSecondary,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    tinyDotWrap: {
      width: 4,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    tinyDot: {
      flex: 1,
    },
    statDecoration: {
      position: 'absolute',
      right: -10,
      bottom: -10,
      width: 50,
      height: 50,
      borderRadius: 25,
      zIndex: -1,
    },



    // ── Table header row ──
    tableHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: H_PADDING + 4,
      marginBottom: 10,
    },
    tableHeaderText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // ── List ──
    listContainer: {
      paddingHorizontal: H_PADDING,
      gap: 14,
    },

    // ── Property Card ──
    propertyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    imageContainer: {
      height: 170,
      width: '100%',
      position: 'relative',
      backgroundColor: colors.surfaceSoft,
    },
    cardImage: {
      width: '100%',
      height: '100%',
    },
    floatingHeader: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 2,
    },
    typeBadge: {
      backgroundColor: 'rgba(26, 36, 47, 0.75)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    typeBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 10,
      zIndex: 1,
    },
    overlayPrice: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    cardBody: {
      padding: 16,
    },
    bodyHeader: {
      marginBottom: 8,
    },
    cardAddress: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    cardCityState: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: 6,
    },
    idAndSyncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    cardIdText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    bulletSeparator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.inputPlaceholder,
      marginHorizontal: 8,
    },
    syncContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardSyncText: {
      fontSize: 11,
      color: colors.accentTeal,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
    },
    middleInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    confidenceLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.inputPlaceholder,
      letterSpacing: 0.8,
    },
    confidenceValRow: {
      width: 120,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },

    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    confidenceWrap: {
      gap: 4,
    },
    confidencePct: {
      fontSize: 13,
      fontWeight: '800',
    },
    confidenceTrack: {
      height: 5,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: 'hidden',
    },
    confidenceFill: {
      height: '100%',
      borderRadius: 3,
    },

    // ── Delete Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(11, 45, 62, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      paddingHorizontal: 28,
      paddingTop: 32,
      paddingBottom: 28,
      alignItems: 'center',
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    modalIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(239,68,68,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 10,
      textAlign: 'center',
    },
    modalBody: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },
    modalBodyBold: {
      fontWeight: '800',
      color: colors.textPrimary,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalDeleteBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDeleteText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ── Status States ──
    centerBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    statusInfoText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    retryBtn: {
      marginTop: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    retryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accentTeal,
    },

    // ── Floating Action Button ──
    fab: {
      position: 'absolute',
      right: H_PADDING,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#0a2341',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    fabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    fabText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.2,
    },
  });
}