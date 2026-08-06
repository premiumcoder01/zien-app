import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { createOpenHouse, getOpenHouses } from '@/services/openHouseService';
import { deleteProperty, extractPriceNumber, formatPropertyPrice, getProperties, PropertyStats, RawPropertyItem, updatePropertyStatus } from '@/services/propertyService';
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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
            <Text style={styles.statLabel}>{label}</Text>
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

// ── Status Helpers & Pill ───────────────────────────────────────────────────
function getStatusStyle(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('ready') || s.includes('active')) {
    return { bg: 'rgba(13,148,136,0.12)', color: '#0D9488', dot: '#0D9488', label: 'READY' };
  }
  if (s.includes('pending')) {
    return { bg: 'rgba(234,88,12,0.12)', color: '#EA580C', dot: '#EA580C', label: 'PENDING' };
  }
  if (s.includes('sold')) {
    return { bg: 'rgba(59,130,246,0.12)', color: '#2563EB', dot: '#2563EB', label: 'SOLD' };
  }
  if (s.includes('off') || s.includes('cancel')) {
    return { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', dot: '#EF4444', label: s.includes('off') ? 'OFF MARKET' : 'CANCELED' };
  }
  if (s.includes('review')) {
    return { bg: 'rgba(234,88,12,0.12)', color: '#C2410C', dot: '#C2410C', label: 'NEED REVIEW' };
  }
  return { bg: 'rgba(100,116,139,0.10)', color: '#64748B', dot: '#94A3B8', label: 'DRAFT' };
}

function StatusPill({ status, onPress }: { status: string; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const { bg, color, dot, label } = getStatusStyle(status);

  return (
    <TouchableOpacity
      style={[styles.statusPill, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statusDot, { backgroundColor: dot }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-down" size={14} color={color} style={{ marginLeft: 2 }} />
    </TouchableOpacity>
  );
}

// ── Status Picker Modal ────────────────────────────────────────────────────────
function StatusPickerModal({
  visible,
  currentStatus,
  onClose,
  onSelectStatus,
}: {
  visible: boolean;
  currentStatus: string;
  onClose: () => void;
  onSelectStatus: (status: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const statusOptions = ['Ready', 'Active', 'Pending', 'Sold', 'Off Market', 'Canceled'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.statusDropdownCard}>
          <Text style={styles.statusDropdownTitle}>Select Property Status</Text>
          <View style={styles.statusDivider} />
          {statusOptions.map((option) => {
            const isSelected = currentStatus.toLowerCase() === option.toLowerCase();
            const { color } = getStatusStyle(option);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.statusOptionRow, isSelected && styles.statusOptionSelected]}
                onPress={() => {
                  onSelectStatus(option);
                  onClose();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusOptionText, isSelected && { fontWeight: '900', color: colors.accentTeal }]}>
                    {option}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.accentTeal} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
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

// ── Property Row Card (Image 2 Design) ─────────────────────────────────────────
function PropertyRowCard({
  property,
  onManage,
  onEdit,
  onDeletePress,
  onStatusChange,
}: {
  property: Property;
  onManage: (p: Property) => void;
  onEdit: (p: Property) => void;
  onDeletePress: (p: Property) => void;
  onStatusChange: (p: Property, newStatus: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { accessToken } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);

  return (
    <View style={styles.propertyCard}>
      {/* Top Header Row with Square Thumbnail, Address, ID, and Status Dropdown */}
      <View style={styles.cardHeaderRow}>
        <Image
          source={{ uri: property.image }}
          style={styles.cardThumbImage}
          contentFit="cover"
        />

        <View style={styles.headerInfoCol}>
          <Text style={styles.cardAddress} numberOfLines={1}>
            {property.address}
          </Text>
          {property.cityState ? (
            <Text style={styles.cardCityState} numberOfLines={1}>
              {property.cityState}
            </Text>
          ) : null}
        </View>

        <StatusPill status={property.status} onPress={() => setShowStatusModal(true)} />
      </View>

      {/* 3-Column Metadata Row: Listing Type | Valuation | Confidence */}
      <View style={styles.metaThreeColGrid}>
        <View style={styles.metaColItem}>
          <Text style={styles.metaColLabel}>LISTING TYPE</Text>
          <Text style={styles.metaColValue} numberOfLines={1}>{property.type}</Text>
        </View>

        <View style={styles.metaColItem}>
          <Text style={styles.metaColLabel}>VALUATION</Text>
          <Text style={styles.metaColValue} numberOfLines={1}>{property.value}</Text>
        </View>

        <View style={styles.metaColItem}>
          <Text style={styles.metaColLabel}>CONFIDENCE</Text>
          <ConfidenceBar value={property.confidence} />
        </View>
      </View>

      {/* Bottom Sync & Action Buttons Row */}
      <View style={styles.bottomBarRow}>
        <View style={styles.syncContainer}>
          <MaterialCommunityIcons name="cloud-check" size={14} color={colors.accentTeal} />
          <Text style={styles.cardSyncText}>{property.syncStatus}</Text>
        </View>

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
            onPress={() => onDeletePress(property)}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <StatusPickerModal
        visible={showStatusModal}
        currentStatus={property.status}
        onClose={() => setShowStatusModal(false)}
        onSelectStatus={(newStatus) => onStatusChange(property, newStatus)}
      />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const filteredProperties = properties.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.address.toLowerCase().includes(q) ||
      p.cityState.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.value.toLowerCase().includes(q)
    );
  });

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
    const formattedPrice = formatPropertyPrice(d);

    const propConfidence = typeof d.confidence === 'number' && d.confidence > 0
      ? d.confidence
      : (typeof d.data_confidence === 'number' && d.data_confidence > 0
        ? d.data_confidence
        : (typeof (raw as any).confidence === 'number' && (raw as any).confidence > 0
          ? (raw as any).confidence
          : (stats?.avgConfidence ? Math.round(stats.avgConfidence) : 94)));

    return {
      id: raw.id.toString(),
      address: d.StreetNumber ? `${d.StreetNumber} ${d.StreetName} ${d.StreetSuffix || ''}`.trim() : raw.address,
      cityState: d.City ? `${d.City}, ${d.StateOrProvince || ''}` : '',
      type: d.PropertySubType || d.PropertyType || 'Residential',
      status: (d.StandardStatus || d.MlsStatus || 'Ready') as PropertyStatus,
      value: formattedPrice,
      confidence: propConfidence,
      image: extractFirstImage(raw),
      syncStatus: 'Synced',
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

  const calculatedAvg = properties.length > 0
    ? Math.round(properties.reduce((acc, p) => acc + (p.confidence || 94), 0) / properties.length)
    : 94;
  const avgConfidence = properties.length > 0 ? calculatedAvg : (stats?.avgConfidence ?? 94);

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

  const handleStatusChange = (targetProp: Property, newStatus: string) => {
    setProperties(prev =>
      prev.map(p => (p.id === targetProp.id ? { ...p, status: newStatus as PropertyStatus } : p))
    );
    if (accessToken) {
      updatePropertyStatus(targetProp.id, newStatus, accessToken);
    }
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

        {/* ── SEARCH BAR ── */}
        {!isLoading && !error && properties.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filter properties by address, city, type..."
                placeholderTextColor={colors.textMuted || '#94A3B8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

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

        {!isLoading && !error && properties.length > 0 && filteredProperties.length === 0 && (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="home-search-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No properties match "{searchQuery}"</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setSearchQuery('')}>
              <Text style={styles.retryBtnText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LIST HEADER (Only show if properties exist) ── */}
        {!isLoading && !error && filteredProperties.length > 0 && (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>Property Identity</Text>
          </View>
        )}

        {/* ── PROPERTY LIST ── */}
        {!isLoading && !error && filteredProperties.length > 0 && (
          <View style={styles.listContainer}>
            {filteredProperties.map((property) => (
              <PropertyRowCard
                key={property.id}
                property={property}
                onManage={handleManageData}
                onEdit={handleEditProperty}
                onDeletePress={handleDeletePress}
                onStatusChange={handleStatusChange}
              />
            ))}
          </View>
        )}

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

    // ── Search Bar ──
    searchContainer: {
      paddingHorizontal: H_PADDING,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      padding: 0,
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
    // ── Section Header ──
    sectionHeaderRow: {
      paddingHorizontal: H_PADDING + 4,
      marginBottom: 10,
    },
    sectionHeaderText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    propertyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardThumbImage: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
    },
    headerInfoCol: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
      justifyContent: 'center',
    },
    cardAddress: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    cardCityState: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    cardIdText: {
      fontSize: 11,
      color: colors.textMuted || colors.textSecondary,
      fontWeight: '700',
      marginTop: 2,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    metaThreeColGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.cardBorder + '60',
    },
    metaColItem: {
      flex: 1,
    },
    metaColLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.textMuted || colors.inputPlaceholder,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    metaColValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    bottomBarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.cardBorder + '60',
    },
    syncContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardSyncText: {
      fontSize: 10,
      color: colors.accentTeal,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceIcon + '50',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#FECACA',
    },

    // ── Status Picker Modal ──
    statusDropdownCard: {
      width: '85%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    statusDropdownTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    statusDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginBottom: 10,
    },
    statusOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 4,
    },
    statusOptionSelected: {
      backgroundColor: colors.accentTeal + '15',
    },
    statusOptionText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
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