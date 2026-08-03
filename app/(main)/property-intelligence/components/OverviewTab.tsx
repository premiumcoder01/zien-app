import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface OverviewTabProps {
  property: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ property }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const IMAGES = [
    property?.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800',
  ];

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % IMAGES.length);
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + IMAGES.length) % IMAGES.length);

  return (
    <View style={styles.container}>
      {/* 1. Gallery Section */}
      <View style={styles.galleryWrapper}>
        <View style={styles.mainImageContainer}>
          <Image
            source={{ uri: IMAGES[activeIndex] }}
            style={styles.mainImage}
            borderRadius={16}
          />
          <View style={styles.galleryTopHeader}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>Single Family Residence</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeIndex + 1} / {IMAGES.length}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.navArrow, { left: 12 }]}
            onPress={handlePrev}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
          </Pressable>
          <Pressable
            style={[styles.navArrow, { right: 12 }]}
            onPress={handleNext}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.paginationDots}>
            {IMAGES.slice(0, 4).map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, activeIndex === idx && styles.dotActive]}
              />
            ))}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsScroll}>
          {IMAGES.map((img, i) => (
            <Pressable
              key={i}
              style={[styles.thumbItem, i === activeIndex && styles.thumbActive]}
              onPress={() => setActiveIndex(i)}
            >
              <Image source={{ uri: img }} style={styles.thumbImg} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 2. Valuation Card */}
      <View style={styles.valuationCard}>
        <View style={styles.valuationHeader}>
          <Text style={styles.valuationLabel}>ESTIMATED MARKET VALUE</Text>
          <Text style={styles.valuationPrice}>$1285K</Text>
          <Text style={styles.valuationRange}>Range: $1195K – $1375K</Text>
        </View>
        <View style={styles.valuationStats}>
          <View>
            <Text style={styles.statLabel}>SINCE PURCHASE</Text>
            <Text style={styles.statValueGreen}>+31.1% since last sale</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>CONFIDENCE</Text>
            <Text style={styles.confidenceHigh}>High</Text>
          </View>
        </View>
      </View>

      {/* 3. Quick Stats Grid - 4 items (2x2) */}
      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStatBox}>
          <MaterialCommunityIcons name="pound" size={16} color={colors.accent} />
          <View>
            <Text style={styles.qsLabel}>PRICE / SQFT</Text>
            <Text style={styles.qsValue}>$397</Text>
          </View>
        </View>
        <View style={styles.quickStatBox}>
          <MaterialCommunityIcons name="currency-usd" size={16} color={colors.accent} />
          <View>
            <Text style={styles.qsLabel}>EST. RENT/MO</Text>
            <Text style={styles.qsValue}>$5,800</Text>
          </View>
        </View>
        <View style={styles.quickStatBox}>
          <MaterialCommunityIcons name="trending-up" size={16} color={colors.accent} />
          <View>
            <Text style={styles.qsLabel}>GROSS YIELD</Text>
            <Text style={styles.qsValue}>5.4%</Text>
          </View>
        </View>
        <View style={styles.quickStatBox}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.accent} />
          <View>
            <Text style={styles.qsLabel}>AVG DOM</Text>
            <Text style={styles.qsValue}>22 days</Text>
          </View>
        </View>
      </View>

      {/* 4. Core Features */}
      <View style={styles.coreFeaturesCard}>
        <View style={styles.addressSection}>
          <Text style={styles.detailAddress}>{property?.address}</Text>
          <Text style={styles.detailSubAddress}>Los Angeles, CA 90010 · Los Angeles County</Text>
          <Text style={styles.apnText}>APN: 5089-014-021</Text>
        </View>
        <View style={styles.featuresIconGrid}>
          {[
            { icon: 'bed-king-outline' as const, label: '4 Beds' },
            { icon: 'shower' as const, label: '3.5 Baths' },
            { icon: 'vector-square' as const, label: '3,240 sqft' },
            { icon: 'calendar-range' as const, label: 'Built 2001' },
            { icon: 'garage' as const, label: '2-Car Attached' },
            { icon: 'pool' as const, label: 'Pool' },
            { icon: 'layers-outline' as const, label: '2 Story' },
            { icon: 'washing-machine' as const, label: 'In-Unit Washer' },
          ].map((item, idx) => (
            <View key={idx} style={styles.featureIconItem}>
              <MaterialCommunityIcons name={item.icon} size={16} color={colors.textSecondary} />
              <Text style={styles.featureIconText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 5. Construction Details */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Construction & Systems</Text>
        <View style={styles.infoGrid}>
          {[
            { label: 'LOT SIZE', value: '8,500 sqft' },
            { label: 'ROOF TYPE', value: 'Composition Shingle' },
            { label: 'EXTERIOR', value: 'Stucco' },
            { label: 'BASEMENT', value: 'None' },
            { label: 'COOLING', value: 'Central AC' },
            { label: 'HEATING', value: 'Forced Air – Gas' },
            { label: 'WATER SOURCE', value: 'Public (LADWP)' },
            { label: 'SEWAGE', value: 'Public Sewer' },
            { label: 'FIREPLACES', value: '2' },
            { label: 'PARKING SPACES', value: '4' },
            { label: 'SCHOOL DISTRICT', value: 'Los Angeles Unified School District' },
            { label: 'LAST PERMIT', value: 'Kitchen Remodel – Mar 2022' },
            { label: 'ZONING', value: 'R1 – Single Family Residential' },
            { label: 'FLOOD ZONE', value: 'Zone X – Minimal Flood Hazard' },
          ].map((item, idx) => (
            <View key={idx} style={styles.infoGridItem}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 6. Ownership Snapshot */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Ownership Snapshot</Text>
        <View style={styles.snapshotTable}>
          {[
            { label: 'Owner', value: 'Martinez Family Trust' },
            { label: 'Type', value: 'Revocable Trust' },
            { label: 'Owned Since', value: '2019' },
            { label: 'Occupancy', value: 'Owner Occupied' },
            { label: 'Annual Tax', value: '$12,480' },
            { label: 'HOA', value: 'No HOA' },
            { label: 'Liens', value: 'None on Record' },
          ].map((item, idx) => (
            <View key={idx} style={styles.snapshotRow}>
              <Text style={styles.snapshotLabel}>{item.label}</Text>
              <Text style={styles.snapshotValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 7. Walkability Scores */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Walkability Scores</Text>
        <View style={styles.scoresContainer}>
          {[
            { label: 'Walk Score', value: 82, color: '#06B6D4' },
            { label: 'Transit Score', value: 74, color: '#8B5CF6' },
            { label: 'Bike Score', value: 58, color: '#10B981' },
          ].map((item, idx) => (
            <View key={idx} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{item.label}</Text>
              <View style={styles.scoreBarContainer}>
                <View style={[styles.scoreBarBase, { backgroundColor: colors.surfaceSoft }]}>
                  <View style={[styles.scoreBarFill, { width: `${item.value}%`, backgroundColor: item.color }]} />
                </View>
              </View>
              <Text style={styles.scoreValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 8. Amenities */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Property Amenities</Text>
        <View style={styles.amenitiesContainer}>
          {[
            'Swimming Pool', 'Jacuzzi / Hot Tub', 'Outdoor Kitchen', 'Home Theater',
            'Smart Home System', 'Solar Panels', 'EV Charging Station', 'Security System',
            'Wine Cellar', 'Walk-in Closets'
          ].map((item) => (
            <View key={item} style={styles.amenityTag}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={colors.accent} />
              <Text style={styles.amenityText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      gap: 20,
      paddingBottom: 20,
    },
    galleryWrapper: {
      gap: 12,
    },
    mainImageContainer: {
      width: '100%',
      height: 250,
      position: 'relative',
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    galleryTopHeader: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    typeBadge: {
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    typeBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    countBadge: {
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    navArrow: {
      position: 'absolute',
      top: '45%',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    paginationDots: {
      position: 'absolute',
      bottom: 12,
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    dotActive: {
      backgroundColor: '#FFFFFF',
      width: 14,
    },
    thumbsScroll: {
      gap: 10,
    },
    thumbItem: {
      width: 60,
      height: 44,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbActive: {
      borderColor: colors.accent,
    },
    thumbImg: {
      width: '100%',
      height: '100%',
    },
    valuationCard: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    valuationHeader: {
      marginBottom: 20,
    },
    valuationLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 8,
    },
    valuationPrice: {
      fontSize: 32,
      fontWeight: '900',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    valuationRange: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    valuationStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    statValueGreen: {
      fontSize: 13,
      fontWeight: '700',
      color: '#10B981',
    },
    confidenceHigh: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    quickStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickStatBox: {
      width: '48%', // Approx 2 columns
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    qsLabel: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    qsValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    coreFeaturesCard: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    addressSection: {
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    detailAddress: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    detailSubAddress: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    apnText: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.4)',
      fontWeight: '600',
    },
    featuresIconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    featureIconItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '45%',
    },
    featureIconText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    infoSection: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 16,
    },
    infoSectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    infoGridItem: {
      width: '45%',
      gap: 4,
    },
    infoLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    amenitiesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    amenityTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    amenityText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    snapshotTable: {
      gap: 2,
    },
    snapshotRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    snapshotLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    snapshotValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scoresContainer: {
      gap: 12,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    scoreLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 100,
    },
    scoreBarContainer: {
      flex: 1,
    },
    scoreBarBase: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    scoreBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    scoreValue: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
      width: 24,
      textAlign: 'right',
    },
  });
}

export { OverviewTab as default };
