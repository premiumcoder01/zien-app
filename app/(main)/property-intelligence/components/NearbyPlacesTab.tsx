import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface NearbyPlacesTabProps {
    property: any;
    apiData?: any;
}

export const NearbyPlacesTab: React.FC<NearbyPlacesTabProps> = ({ property, apiData }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

    // Real coordinates from API
    const lat = apiData?.Latitude || apiData?.valuation?.latitude || property?.latitude || 30.813365;
    const lng = apiData?.Longitude || apiData?.valuation?.longitude || property?.longitude || -95.108708;

    const coords = { latitude: Number(lat), longitude: Number(lng) };
    const displayAddress = property?.address || apiData?.UnparsedAddress || '0000 Fm 190, Onalaska TX 77360';

    return (
        <View style={styles.container}>
            {/* Header Title + Coordinates Badge */}
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Map View</Text>
                <View style={styles.coordsBadge}>
                    <Text style={styles.coordsBadgeText}>Coordinates</Text>
                </View>
            </View>

            {/* Latitude & Longitude Card */}
            <View style={styles.coordsCard}>
                <View style={styles.coordBox}>
                    <Text style={styles.coordLabel}>LATITUDE</Text>
                    <Text style={styles.coordValue}>{Number(lat).toFixed(6)}</Text>
                </View>
                <View style={styles.coordDivider} />
                <View style={styles.coordBox}>
                    <Text style={styles.coordLabel}>LONGITUDE</Text>
                    <Text style={styles.coordValue}>{Number(lng).toFixed(6)}</Text>
                </View>
            </View>

            {/* Interactive Map */}
            <View style={styles.mapCard}>
                <MapComponent
                    style={styles.map}
                    cameraPosition={{
                        coordinates: coords,
                        zoom: 14,
                    }}
                    markers={[
                        {
                            id: 'property',
                            coordinates: coords,
                            title: displayAddress,
                        },
                    ]}
                />

                <View style={styles.mapOverlay}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#06B6D4" />
                    <Text style={styles.overlayAddress} numberOfLines={1}>{displayAddress}</Text>
                </View>
            </View>
        </View>
    );
};

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { gap: 14, paddingBottom: 24 },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginHorizontal: 2,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
        },
        coordsBadge: {
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        coordsBadgeText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
        },

        coordsCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
        },
        coordBox: { flex: 1, gap: 4 },
        coordDivider: { width: 1, height: 28, backgroundColor: colors.borderLight, marginHorizontal: 12 },
        coordLabel: {
            fontSize: 9,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 0.8,
        },
        coordValue: {
            fontSize: 18,
            fontWeight: '900',
            color: '#06B6D4',
        },

        mapCard: {
            height: 280,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            position: 'relative',
        },
        map: {
            width: '100%',
            height: '100%',
        },
        mapOverlay: {
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            backgroundColor: colors.cardBackground,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
        },
        overlayAddress: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textPrimary,
            flex: 1,
        },
    });
}
