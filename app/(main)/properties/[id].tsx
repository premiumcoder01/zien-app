import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getPropertyDetails } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TABS = ['Structural', 'Exterior', 'Interior', 'Utilities', 'Legal', 'Remarks', 'Media'];

// --- Helper Components ---
function PropertyStatItem({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ width: '48%', marginBottom: 20, backgroundColor: colors.surfaceIcon + '50', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon && <MaterialCommunityIcons name={icon as any} size={12} color={colors.textMuted} />}
        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }}>{value || '—'}</Text>
    </View>
  );
}

function FeaturePillSection({ title, data }: { title: string; data: string[] | undefined }) {
  const { colors } = useAppTheme();
  if (!data || data.length === 0) return null;
  return (
    <View style={{ width: '100%', marginBottom: 24 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 12 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data.map((item, idx) => (
          <View key={idx} style={{ backgroundColor: colors.accentTeal + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.accentTeal + '20' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentTeal }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PropertyDetailScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState('Structural');
  const [currImageIndex, setCurrImageIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const carouselRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  const handleShare = async () => {
    if (!property) return;
    try {
      await Share.share({
        message: `Check out this property: ${property.address} - ${property.price}`,
      });
    } catch (error) {
      console.log('Error sharing property:', error);
    }
  };

  // Fetch Real Data
  const { data: property, isLoading } = useQuery({
    queryKey: ['property-detail', id],
    queryFn: async () => {
      const res = await getPropertyDetails(id as string, accessToken!);

      if (res.success) {
        const d = res.data.data;
        console.log(JSON.stringify(d), "propert data")
        const coords = d.Coordinates || [-95.399529, 29.74878];
        return {
          id: id,
          address: d.UnparsedAddress || d.address || 'Unknown Address',
          price: d.ListPrice ? `$${d.ListPrice.toLocaleString()}` : (d.price || '—'),
          beds: d.BedroomsTotal || d.beds || '0',
          baths: (parseFloat(d.BathroomsFull || d.bathsFull || '0')) + (d.BathroomsHalf || d.bathsHalf ? 0.5 : 0),
          sqft: d.BuildingAreaTotal || d.sqft || '—',
          year: d.YearBuilt || d.year || '—',
          type: d.PropertySubType || d.type || 'Residential',
          mlsImages: (d.Media || []).map((m: any) => (typeof m === 'string' ? m : m.MediaURL || m.MediaUrl || m.url || m.URL)).filter(Boolean),
          userImages: (d.user_images || []).map((m: any) => (typeof m === 'string' ? m : m.url || m.uri || m.MediaURL)).filter(Boolean),
          remarks: d.PublicRemarks || d.publicRemarks || '',
          stories: d.Stories || d.stories || '—',
          lotSize: d.LotSizeArea || d.lotSize || '—',
          roof: d.Roof || d.roof || '—',
          cooling: d.Cooling || d.cooling || '—',
          heating: d.Heating || d.heating || '—',
          flooring: d.Flooring || d.flooring || [],
          status: d.StandardStatus || 'Ready for Use',
          confidence: 98,
          lastSync: '2 min ago',
          listingId: d.ListingId || d.listingId || '—',
          parking: d.ParkingTotal || '2',
          foundation: d.FoundationDetails || 'Slab',
          lotFeatures: d.LotFeatures || 'On Street',
          zienAvm: '$734,020',
          walkScore: 88,
          walkLabel: 'EXTREMELY WALKABLE',
          coordinates: { latitude: coords[1], longitude: coords[0] },
          // Nested Data
          appliances: d.Appliances || d.appliances || [],
          interiorFeatures: d.InteriorFeatures || d.interiorFeatures || [],
          kitchenFeatures: d.RoomKitchenFeatures || [],
          bathroomFeatures: d.RoomMasterBathroomFeatures || [],
          laundryFeatures: d.LaundryFeatures || [],
          listingTerms: d.ListingTerms || [],
          exemptions: d.TaxExemptions || [],
          fencing: d.Fencing || d.fencing || [],
          exteriorFeatures: d.ExteriorFeatures || d.exteriorFeatures || []
        };
      }
      throw new Error("Failed to fetch");
    },
    enabled: !!id && !!accessToken
  });

  const allImages = useMemo(() => {
    if (!property) return [];
    return [...property.userImages, ...property.mlsImages];
  }, [property]);

  const isFallbackUsed = useMemo(() => {
    if (!property) return false;
    return property.userImages.length === 0 && property.mlsImages.length === 0;
  }, [property]);


  if (isLoading || !property) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground }}><ActivityIndicator size="large" color={colors.accentTeal} /></View>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Structural':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 }}>
            <PropertyStatItem label="PROPERTY TYPE" value={property.type} icon="home-outline" />
            <PropertyStatItem label="YEAR BUILT" value={property.year} icon="calendar-outline" />
            <PropertyStatItem label="STORIES" value={property.stories} icon="layers-outline" />
            <PropertyStatItem label="LIVING AREA" value={`${property.sqft} sqft`} icon="arrow-expand-all" />
            <PropertyStatItem label="LOT SIZE" value={`${property.lotSize} sqft`} icon="texture-box" />
            <PropertyStatItem label="ROOF MATERIAL" value={Array.isArray(property.roof) ? property.roof[0] : (property.roof || 'Composition')} icon="home-roof" />
            <PropertyStatItem label="FOUNDATION" value={property.foundation} icon="floor-plan" />
          </View>
        );
      case 'Exterior':
        return (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <PropertyStatItem label="PARKING" value={property.parking} icon="car-outline" />
              <PropertyStatItem label="LOT FEATURES" value={Array.isArray(property.lotFeatures) ? property.lotFeatures[0] : property.lotFeatures} icon="sprout-outline" />
            </View>
            <FeaturePillSection title="EXTERIOR FEATURES" data={property.exteriorFeatures} />
            <FeaturePillSection title="FENCING" data={property.fencing} />
          </View>
        );
      case 'Interior':
        return (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <PropertyStatItem label="BEDS" value={property.beds} icon="bed-outline" />
              <PropertyStatItem label="BATHS" value={property.baths} icon="bathtub-outline" />
            </View>
            <FeaturePillSection title="FLOORING" data={property.flooring} />
            <FeaturePillSection title="APPLIANCES" data={property.appliances} />
            <FeaturePillSection title="INTERIOR" data={property.interiorFeatures} />
            <FeaturePillSection title="KITCHEN" data={property.kitchenFeatures} />
            <FeaturePillSection title="BATHROOM" data={property.bathroomFeatures} />
            <FeaturePillSection title="LAUNDRY" data={property.laundryFeatures} />
          </View>
        );
      case 'Utilities':
        return (
          <View style={{ marginTop: 20 }}>
            <FeaturePillSection title="HEATING" data={Array.isArray(property.heating) ? property.heating : [property.heating]} />
            <FeaturePillSection title="COOLING" data={Array.isArray(property.cooling) ? property.cooling : [property.cooling]} />
            <PropertyStatItem label="SEWER" value="Public Sewer" icon="water-outline" />
          </View>
        )
      case 'Legal':
        return (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <PropertyStatItem label="LISTING ID" value={property.listingId} icon="tag-outline" />
              <PropertyStatItem label="STATUS" value={property.status} icon="check-circle-outline" />
            </View>
            <FeaturePillSection title="TERMS" data={property.listingTerms} />
            <FeaturePillSection title="EXEMPTIONS" data={property.exemptions} />
          </View>
        )
      case 'Remarks':
        return (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.neighborhoodLabel}>NEIGHBORHOOD CONTEXT</Text>
            <Text style={styles.remarksText}>{property.remarks || 'No remarks available.'}</Text>
          </View>
        );
      case 'Media':
        return (
          <View style={{ marginTop: 20 }}>
            {property.userImages.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={styles.mediaLabel}>USER UPLOADED ASSETS ({property.userImages.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {property.userImages.map((img: string, i: number) => {
                    const isSingle = property.userImages.length === 1;
                    const itemWidth = isSingle ? (SCREEN_WIDTH - 80) : (SCREEN_WIDTH - 90) / 2;
                    return (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.8}
                        onPress={() => {
                          mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                          carouselRef.current?.scrollTo({ x: i * (SCREEN_WIDTH - 40), animated: true });
                        }}
                      >
                        <Image source={{ uri: img }} style={{ width: itemWidth, height: 200, borderRadius: 16 }} contentFit="cover" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            <View>
              <Text style={styles.mediaLabel}>MLS SYNCHRONIZATION ({property.mlsImages.length})</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {property.mlsImages.map((img: string, i: number) => {
                  const isSingle = property.mlsImages.length === 1;
                  const itemWidth = isSingle ? (SCREEN_WIDTH - 80) : (SCREEN_WIDTH - 100) / 2;
                  const globalIndex = property.userImages.length + i;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.8}
                      onPress={() => {
                        mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                        carouselRef.current?.scrollTo({ x: globalIndex * (SCREEN_WIDTH - 40), animated: true });
                      }}
                    >
                      <Image source={{ uri: img }} style={{ width: itemWidth, height: 160, borderRadius: 16, backgroundColor: colors.surfaceIcon }} contentFit="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient as any} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <View style={{ paddingTop: insets.top }}>
        <PageHeader title="Property Details" onBack={() => router.back()} />
      </View>

      <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Info */}
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <Text style={styles.bigTitle}>{property.address}</Text>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.statusBadge}><View style={styles.statusDot} /><Text style={styles.statusText}>{property.status}</Text></View>
              <Text style={styles.metaText}>Last sync: {property.lastSync}</Text>
            </View>
            <Text style={[styles.metaText, { fontSize: 12, fontWeight: '700', color: colors.textSecondary }]}>
              {property.type}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 12, marginTop: 16, paddingHorizontal: 20 }}>
          <View style={styles.confidenceBarContainer}>
            <View style={styles.confidenceTrack}><View style={[styles.confidenceFill, { width: '98%' }]} /></View>
            <Text style={styles.confidenceText}>98% Confidence</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <MaterialCommunityIcons name="share-variant" size={16} color={colors.textPrimary} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Carousel / Custom Zien Placeholder */}
        {isFallbackUsed ? (
          <View style={styles.placeholderCardWrap}>
            <LinearGradient
              colors={[colors.cardBackground, colors.surfaceIcon + '40']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.placeholderGlow} />
            <MaterialCommunityIcons name="home-city-outline" size={48} color={colors.accentTeal} style={{ marginBottom: 16 }} />
            <Text style={styles.placeholderBrandText}>Zien</Text>
            <Text style={styles.placeholderSubText}>No visual assets synchronized yet</Text>
            <View style={styles.placeholderStatusBadge}>
              <MaterialCommunityIcons name="sync-off" size={10} color={colors.textMuted} style={{ marginRight: 2 }} />
              <Text style={styles.placeholderStatusText}>MLS MEDIA SYNC PENDING</Text>
            </View>
          </View>
        ) : (
          <View style={styles.carouselWrap}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setCurrImageIndex(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40)))}
            >
              {allImages.map((img: string, i: number) => (
                <Image key={i} source={{ uri: img }} style={{ width: SCREEN_WIDTH - 40, height: 320, borderRadius: 16 }} contentFit="cover" />
              ))}
            </ScrollView>

            {allImages.length > 1 && (
              <View style={styles.carouselNav}>
                <TouchableOpacity onPress={() => carouselRef.current?.scrollTo({ x: (currImageIndex - 1) * (SCREEN_WIDTH - 40), animated: true })} style={styles.navCirc}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => carouselRef.current?.scrollTo({ x: (currImageIndex + 1) * (SCREEN_WIDTH - 40), animated: true })} style={styles.navCirc}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseBadgeText}>
                {currImageIndex + 1} / {allImages.length} ASSETS READY
              </Text>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20 }}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={styles.cardIconBox}>
                    <MaterialCommunityIcons name="office-building-cog" size={18} color={colors.accentTeal} />
                  </View>
                  <Text style={styles.cardTitle}>Property Profile</Text>
                </View>
                <Text style={styles.cardSubtitle}>Comprehensive assessment</Text>
              </View>
              <TouchableOpacity style={styles.autoScanBadge} activeOpacity={0.8}>
                <LinearGradient
                  colors={[colors.accentTeal + '20', colors.accentTeal + '05']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <MaterialCommunityIcons name="shimmer" size={12} color={colors.accentTeal} />
                <Text style={styles.autoScanText}>
                  ARCHITECTURAL <Text style={styles.autoScanTextBold}>AUTO-SCAN</Text>
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tabOuterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer} contentContainerStyle={{ gap: 8 }}>
                {TABS.map(t => (
                  <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabItem, activeTab === t && styles.activeTabItem]}>
                    <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={{ marginTop: 8 }}>
              {renderTabContent()}
            </View>
          </View>

          <View style={styles.valuationCard}>
            <LinearGradient
              colors={[colors.textPrimary + '05', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.valHeader}>
              <View style={styles.valPill}>
                <MaterialCommunityIcons name="robot" size={10} color="#FFF" />
                <Text style={styles.valPillText}>AI VALUATION</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={styles.valPrice}>{property.price}</Text>
              <MaterialCommunityIcons name="trending-up" size={20} color={colors.accentTeal} />
            </View>
            <Text style={styles.valSubLabel}>Current Estimated Market Value</Text>

            <View style={styles.valStatsGrid}>
              <View style={styles.valRow}>
                <Text style={styles.valKey}>MLS List Price</Text>
                <Text style={styles.valVal}>{property.price}</Text>
              </View>
              <View style={styles.avmRow}>
                <Text style={styles.avmKey}>Zien AVM Est.</Text>
                <Text style={styles.avmVal}>{property.zienAvm}</Text>
              </View>
            </View>
            <View style={styles.insightBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="information-outline" size={16} color={colors.accentTeal} />
                <Text style={styles.insightTitle}>AUTOMATED INSIGHT</Text>
              </View>
              <Text style={styles.insightText}>Our AI suggests this property is priced 2% below market based on recent Houston luxury comps.</Text>
            </View>
          </View>

          <View style={styles.locationCard}>
            <Text style={styles.sectionHead}>LOCATION ANALYSIS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name="map-marker-outline" size={24} color={colors.textPrimary} />
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary }}>88</Text>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: colors.textMuted }}>WALK SCORE</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '900', color: colors.accentTeal }}>{property.walkLabel}</Text>
            </View>
            <TouchableOpacity style={styles.mapBtn} onPress={() => setShowMap(true)}><Text style={styles.mapBtnText}>View Neighborhood Map</Text></TouchableOpacity>
          </View>

          <View style={styles.integrityCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.sectionHead}>DATA INTEGRITY SCORE</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.accentTeal }}>98%</Text>
            </View>
            <View style={styles.integrityTrack}><View style={[styles.integrityFill, { width: '98%' }]} /></View>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.floatingEditBtn} onPress={() => router.push(`/(main)/properties/edit/${id}`)}>
        <LinearGradient colors={[colors.accentTeal, '#0D9488']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="pencil" size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <NeighborhoodMapModal visible={showMap} onClose={() => setShowMap(false)} property={property as any} />
    </View>
  );
}

// --- Map Modal Component ---
function NeighborhoodMapModal({ visible, onClose, property }: { visible: boolean; onClose: () => void; property: any }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const initialRegion = {
    latitude: property?.coordinates?.latitude || 29.74878,
    longitude: property?.coordinates?.longitude || -95.399529,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };


  const styles = StyleSheet.create({
    modal: { flex: 1, backgroundColor: colors.cardBackground },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10)
    },
    title: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceIcon, justifyContent: 'center', alignItems: 'center' },
    map: { width: "100%", height: 380 },
    infoBox: { padding: 20 },
    addressText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    coordsText: { fontSize: 12, color: colors.textMuted, marginTop: 4 }
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Neighborhood View</Text>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <MapView
            scrollEnabled
            showsCompass
            followsUserLocation
            showsScale
            provider={
              Platform.OS === 'android'
                ? PROVIDER_GOOGLE
                : PROVIDER_DEFAULT
            }
            style={styles.map}
            initialRegion={initialRegion}
            mapType="standard"
            showsUserLocation={true}
            onMapReady={() => console.log('Map is ready and initialized')}
            onRegionChangeComplete={(reg) => console.log('Region change complete:', reg)}
          >
            <Marker
              key={`marker-${property?.id}`}
              coordinate={{
                latitude: property?.coordinates?.latitude || 29.74878,
                longitude: property?.coordinates?.longitude || -95.399529,
              }}
              title={property?.address}
              tracksViewChanges={false}
            >
              <View style={{ padding: 5 }}>
                <View style={{ backgroundColor: colors.accentTeal, padding: 5, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 5 }}>
                  <MaterialCommunityIcons name="home" size={15} color="#FFF" />
                </View>
              </View>
            </Marker>
          </MapView>

          <View style={styles.infoBox}>
            <Text style={styles.addressText}>{property?.address}</Text>
            <Text style={styles.coordsText}>LAT: {property?.coordinates?.latitude} / LONG: {property?.coordinates?.longitude}</Text>

            <View style={{ marginTop: 24 }}>
              <ScoreRow label="Walk Score" value={property?.walkScore || 88} color={colors.accentTeal} />
              <ScoreRow label="Transit Score" value={property?.transitScore || 72} color="#8B5CF6" />
              <ScoreRow label="Bike Score" value={property?.bikeScore || 65} color="#EC4899" />
            </View>

            <View style={{ marginTop: 24, padding: 16, backgroundColor: colors.surfaceIcon, borderRadius: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>LOCATION INSIGHT</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                This property is located in the Montrose district, known for its mix of new developments and historic charm. With an 88 walk score, most errands can be accomplished on foot.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>{label}</Text>
        <View style={{ width: '100%', height: 6, backgroundColor: colors.surfaceIcon, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
          <View style={{ width: `${value}%`, height: '100%', backgroundColor: color }} />
        </View>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '900', color, marginLeft: 16 }}>{value}</Text>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    bigTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentTeal + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentTeal },
    statusText: { fontSize: 10, fontWeight: '800', color: colors.accentTeal },
    metaText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    confidenceBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cardBackground, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
    confidenceTrack: { width: 40, height: 4, backgroundColor: colors.surfaceIcon, borderRadius: 2, overflow: 'hidden' },
    confidenceFill: { height: '100%', backgroundColor: colors.accentTeal },
    confidenceText: { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
    shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
    shareBtnText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
    carouselWrap: { margin: 20, position: 'relative' },
    carouselNav: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
    navCirc: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    phaseBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.accentTeal, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    phaseBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    profileCard: { backgroundColor: colors.cardBackground, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
    cardIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentTeal + '10', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.accentTeal + '20' },
    cardTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
    cardSubtitle: { fontSize: 12, color: colors.textMuted, lineHeight: 18, fontWeight: '500' },
    autoScanBadge: { width: '100%', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.accentTeal + '40', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    badgeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    autoScanText: { fontSize: 11, fontWeight: '700', color: colors.accentTeal, letterSpacing: 1.5 },
    autoScanTextBold: { fontSize: 11, fontWeight: '900', color: colors.accentTeal, letterSpacing: 1.5 },
    tabOuterContainer: { marginTop: 20, marginBottom: 4 },
    tabContainer: { flexDirection: 'row' },
    tabItem: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surfaceIcon + '30',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTabItem: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    activeTabText: { color: '#FFF', fontWeight: '900' },
    neighborhoodLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
    remarksText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22, marginTop: 12 },
    mediaLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 },
    valuationCard: { backgroundColor: colors.cardBackground, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
    valHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
    valPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.textPrimary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    valPillText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    valPrice: { fontSize: 36, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1 },
    valSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
    valStatsGrid: { marginTop: 24, gap: 12 },
    valRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.surfaceIcon + '80', borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder },
    valKey: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    valVal: { fontSize: 15, color: colors.textPrimary, fontWeight: '900' },
    avmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#FFF7ED', borderRadius: 16, borderWidth: 1.5, borderColor: '#FED7AA', borderStyle: 'dashed' },
    avmKey: { fontSize: 13, color: '#C2410C', fontWeight: '800' },
    avmVal: { fontSize: 15, color: '#C2410C', fontWeight: '900' },
    insightBox: { marginTop: 20, padding: 16, backgroundColor: colors.accentTeal + '10', borderRadius: 16, borderWidth: 1, borderColor: colors.accentTeal + '20' },
    insightTitle: { fontSize: 10, fontWeight: '900', color: colors.accentTeal, letterSpacing: 1 },
    insightText: { fontSize: 13, color: colors.textPrimary, lineHeight: 18, marginTop: 4 },
    locationCard: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
    sectionHead: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 },
    mapBtn: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
    mapBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    integrityCard: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
    integrityTrack: { width: '100%', height: 8, backgroundColor: colors.surfaceIcon, borderRadius: 4, overflow: 'hidden' },
    integrityFill: { height: '100%', backgroundColor: colors.accentTeal },
    floatingEditBtn: { position: 'absolute', bottom: 60, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentTeal, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    placeholderCardWrap: {
      margin: 20,
      height: 320,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    placeholderGlow: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.accentTeal + '15',
      opacity: 0.6,
      top: '25%',
    },
    placeholderBrandText: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 4,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    placeholderSubText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: 16,
    },
    placeholderStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceIcon + '40',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    placeholderStatusText: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5
    }
  });
}
