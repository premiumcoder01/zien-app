import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

interface NearbyPlacesTabProps {
  property: any;
}

export const NearbyPlacesTab: React.FC<NearbyPlacesTabProps> = ({ property }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  const HOUSTON_COORDS = {
    latitude: 29.7604,
    longitude: -95.3698,
  };



  return (
    <View style={styles.container}>
      {/* 1. Map Section */}
      <View style={styles.mapCard}>
        <MapComponent
          style={styles.map}
          cameraPosition={{
            coordinates: HOUSTON_COORDS,
            zoom: 14,
          }}
          markers={[
            {
              id: 'property',
              coordinates: HOUSTON_COORDS,
              title: property?.address || 'Property Location',
            },
          ]}
        />

        <View style={styles.mapOverlay}>
          <Text style={styles.overlayLabel}>PROPERTY LOCATION</Text>
          <Text style={styles.overlayAddress}>{property?.address || '2901 Ocean Ave, Houston, TX'}</Text>
        </View>
      </View>

      {/* 2. Category Summary Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBar}>
        {[
          { icon: 'school-outline' as const, label: 'Schools', count: '4' },
          { icon: 'bus-clock' as const, label: 'Transit', count: '3' },
          { icon: 'hospital-building' as const, label: 'Hospitals', count: '2' },
          { icon: 'silverware-fork-knife' as const, label: 'Restaurants', count: '4+' },
          { icon: 'tree-outline' as const, label: 'Parks', count: '3' },
        ].map((cat, i) => (
          <View key={i} style={styles.categoryChip}>
            <MaterialCommunityIcons name={cat.icon} size={16} color={colors.textSecondary} />
            <View>
              <Text style={styles.catCount}>{cat.count}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 3. Detailed Lists Grid */}
      <View style={styles.listsGrid}>
        {/* Nearby Schools */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Nearby Schools</Text>
          <View style={styles.placeList}>
            {[
              { name: 'Wilshire Crest Elementary', type: 'Public · K-5 · 0.4 mi', rating: '8/10' },
              { name: 'Hancock Park Elementary', type: 'Public · K-5 · 0.7 mi', rating: '9/10' },
              { name: 'Marlborough School', type: 'Private · 7-12 · 1.1 mi', rating: '10/10' },
              { name: 'Fairfax Senior High School', type: 'Public · 9-12 · 1.6 mi', rating: '7/10' },
            ].map((item, i) => (
              <View key={i} style={styles.placeItem}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="school" size={16} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeSub}>{item.type}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Public Transit */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Public Transit</Text>
          <View style={styles.placeList}>
            {[
              { name: 'Wilshire / Western Station', type: 'Metro Rail · Purple Line (D)', dist: '0.3 mi' },
              { name: 'Wilshire / Normandie Station', type: 'Metro Rail · Purple Line (D)', dist: '0.6 mi' },
              { name: 'Bus Stop – Rapid 720', type: 'Metro Bus · Rapid 720', dist: '0.1 mi' },
            ].map((item, i) => (
              <View key={i} style={styles.placeItem}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="bus" size={16} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeSub}>{item.type}</Text>
                </View>
                <Text style={styles.distText}>{item.dist}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Medical Facilities */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Medical Facilities</Text>
          <View style={styles.placeList}>
            {[
              { name: 'Cedars-Sinai Medical Center', type: 'Major Hospital · 2.1 mi', rating: '5-Star' },
              { name: 'Good Samaritan Hospital', type: 'General Hospital · 1.4 mi', rating: '4-Star' },
            ].map((item, i) => (
              <View key={i} style={styles.placeItem}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="hospital-building" size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeSub}>{item.type}</Text>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Restaurants Nearby */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Restaurants Nearby</Text>
          <View style={styles.placeList}>
            {[
              { name: 'Perino\'s', type: 'Italian', dist: '0.3 mi' },
              { name: 'Catch LA', type: 'Seafood', dist: '1.1 mi' },
              { name: 'Gyu-Kaku', type: 'Japanese BBQ', dist: '0.6 mi' },
              { name: 'The Grove Farmers Market', type: 'Market', dist: '1.4 mi' },
            ].map((item, i) => (
              <View key={i} style={styles.placeItem}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeSub}>{item.type}</Text>
                </View>
                <Text style={styles.distText}>{item.dist}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Parks & Recreation */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Parks & Recreation</Text>
          <View style={styles.placeList}>
            {[
              { name: 'Hancock Park', type: 'City Park', dist: '0.5 mi' },
              { name: 'La Brea Tar Pits Park', type: 'Landmark Park', dist: '0.9 mi' },
              { name: 'Cahuenga Peak Trail', type: 'Hiking', dist: '3.2 mi' },
            ].map((item, i) => (
              <View key={i} style={styles.placeItem}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="tree" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeSub}>{item.type}</Text>
                </View>
                <Text style={styles.distText}>{item.dist}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Grocery & Essentials */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Grocery & Essentials</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.essentialsScroll}>
            {[
              { name: 'Whole Foods Market', sub: 'Premium Grocery · 0.5 mi', icon: 'cart-outline' },
              { name: 'Ralph\'s', sub: 'Grocery · 0.8 mi', icon: 'basket-outline' },
              { name: 'Trader Joe\'s', sub: 'Grocery · 1.2 mi', icon: 'shopping-outline' },
            ].map((item, i) => (
              <View key={i} style={styles.essentialCard}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color="#F59E0B" />
                <View>
                  <Text style={styles.essentialName}>{item.name}</Text>
                  <Text style={styles.essentialSub}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
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
    mapCard: {
      height: 220,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      position: 'relative',
    },
    map: {
      flex: 1,
    },
    navButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      zIndex: 10,
    },
    mapOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    overlayLabel: {
      fontSize: 8,
      fontWeight: '900',
      color: colors.accent,
      marginBottom: 4,
      letterSpacing: 1,
    },
    overlayAddress: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    categoryBar: {
      gap: 10,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      minWidth: 100,
    },
    catCount: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    catLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    listsGrid: {
      gap: 20,
    },
    listSection: {
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    placeList: {
      gap: 12,
    },
    placeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    placeSub: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    ratingBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#10B981',
    },
    distText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
    },
    essentialsScroll: {
      gap: 12,
    },
    essentialCard: {
      width: 180,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceSoft,
      padding: 12,
      borderRadius: 16,
    },
    essentialName: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    essentialSub: {
      fontSize: 10,
      color: colors.textSecondary,
    },
  });
}

export { NearbyPlacesTab as default };
