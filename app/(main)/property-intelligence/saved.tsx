import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SavedProperty {
    id: string;
    address: string;
    cityState: string;
    type: string;
    growth: string;
    beds: number;
    baths: number;
    sqft: string;
    estValue: string;
    estRent: string;
    yield: string;
    savedDate: string;
    image: string;
    icon: any;
}

const SAVED_PROPERTIES: SavedProperty[] = [
    {
        id: '1',
        address: '101 Sunset Blvd',
        cityState: 'Los Angeles, CA 90028',
        type: 'Single Family',
        growth: '+8.2% YoY',
        beds: 5,
        baths: 4,
        sqft: '4,800 sqft',
        estValue: '$3,200,000',
        estRent: '$15,000/mo',
        yield: '5.6%',
        savedDate: 'Mar 12, 2025',
        image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800',
        icon: 'home-outline'
    },
    {
        id: '2',
        address: '202 Terrace Way',
        cityState: 'Pasadena, CA 91103',
        type: 'Condo',
        growth: '+4.1% YoY',
        beds: 3,
        baths: 2,
        sqft: '1,900 sqft',
        estValue: '$1,100,000',
        estRent: '$5,500/mo',
        yield: '6.0%',
        savedDate: 'Mar 10, 2025',
        image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800',
        icon: 'office-building-outline'
    },
    {
        id: '3',
        address: '812 Rosecrans Ave',
        cityState: 'Manhattan Beach, CA 90266',
        type: 'Townhouse',
        growth: '+4.1% YoY',
        beds: 4,
        baths: 3,
        sqft: '2,600 sqft',
        estValue: '$1,870,000',
        estRent: '$8,200/mo',
        yield: '5.3%',
        savedDate: 'Mar 8, 2025',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
        icon: 'home-group'
    },
    {
        id: '4',
        address: '4521 Wilshire Blvd',
        cityState: 'Los Angeles, CA 90010',
        type: 'Multi-family',
        growth: '+6.8% YoY',
        beds: 4,
        baths: 3.5,
        sqft: '3,240 sqft',
        estValue: '$1,285,000',
        estRent: '$5,800/mo',
        yield: '5.4%',
        savedDate: 'Mar 6, 2025',
        image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
        icon: 'home-outline'
    },
];

export default function SavedPropertiesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Newest'); // 'Newest', 'Value', 'Yield'

    const filteredProperties = useMemo(() => {
        let result = SAVED_PROPERTIES.filter(p =>
            p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.cityState.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sorting logic based on activeTab
        if (activeTab === 'Value') {
            result.sort((a, b) => {
                const valA = parseFloat(a.estValue.replace(/[$,]/g, ''));
                const valB = parseFloat(b.estValue.replace(/[$,]/g, ''));
                return valB - valA;
            });
        } else if (activeTab === 'Yield') {
            result.sort((a, b) => {
                const yieldA = parseFloat(a.yield.replace(/[%]/g, ''));
                const yieldB = parseFloat(b.yield.replace(/[%]/g, ''));
                return yieldB - yieldA;
            });
        } else {
            // Newest (Default mock order or date parsing)
            // For mock data, we'll stick to the original order as "newest"
        }

        return result;
    }, [searchQuery, activeTab]);

    const renderCard = ({ item }: { item: SavedProperty }) => (
        <View style={styles.card}>
            <View style={styles.imageSection}>
                <Image source={{ uri: item.image }} style={styles.propertyImage} />
                <View style={styles.imageOverlay}>
                    <View style={[styles.badge, styles.typeBadge]}>
                        <Text style={styles.typeText}>{item.type}</Text>
                    </View>
                    <View style={[styles.badge, styles.growthBadge]}>
                        <Text style={styles.growthText}>{item.growth}</Text>
                    </View>
                </View>
                <Pressable style={styles.deleteBtn}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color="#EF4444" />
                </Pressable>
            </View>

            <View style={styles.detailsSection}>
                <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.cardLocation} numberOfLines={1}>{item.cityState}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statChip}><Text style={styles.statChipText}>{item.beds} Beds</Text></View>
                    <View style={styles.statChip}><Text style={styles.statChipText}>{item.baths} Baths</Text></View>
                    <View style={styles.statChip}><Text style={styles.statChipText}>{item.sqft}</Text></View>
                </View>

                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>EST. VALUE</Text>
                        <Text style={styles.metricValue}>{item.estValue}</Text>
                    </View>
                    <View style={[styles.metricItem, styles.metricBorder]}>
                        <Text style={styles.metricLabel}>EST. RENT</Text>
                        <Text style={[styles.metricValue, { color: colors.accent }]}>{item.estRent}</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>YIELD</Text>
                        <Text style={[styles.metricValue, { color: colors.accentGreen || '#16A34A' }]}>{item.yield}</Text>
                    </View>
                </View>

                <Pressable style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>View Intelligence</Text>
                    <MaterialCommunityIcons name="arrow-top-right" size={14} color="#FFF" />
                </Pressable>

                <View style={styles.cardFooter}>
                    <Text style={styles.savedDate}>Saved {item.savedDate}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                    </View>
                    <View>
                        <Text style={styles.title}>Saved Properties</Text>
                        <Text style={styles.subtitle}>{SAVED_PROPERTIES.length} properties saved for monitoring</Text>
                    </View>
                </View>
            </View>

            {/* Control Bar */}
            <View style={styles.controls}>
                <View style={styles.searchRow}>
                  <View style={styles.searchBar}>
                      <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                      <TextInput
                          style={styles.searchInput}
                          placeholder="Filter saved properties..."
                          placeholderTextColor={colors.textSecondary}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                      />
                  </View>
                </View>
                
                <View style={styles.tabsRow}>
                  <View style={styles.tabs}>
                      {['Newest', 'Value', 'Yield'].map(tab => (
                          <Pressable
                              key={tab}
                              onPress={() => setActiveTab(tab)}
                              style={[styles.tab, activeTab === tab && styles.tabActive]}
                          >
                              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                          </Pressable>
                      ))}
                  </View>
                </View>
            </View>

            <FlatList
                data={filteredProperties}
                renderItem={renderCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="bookmark-off-outline" size={64} color={colors.surfaceMuted} />
                        <Text style={styles.emptyText}>No matches found</Text>
                    </View>
                }
            />
        </View>
    );
}

function getStyles(colors: any) {
    const { width } = Dimensions.get('window');
    const cardWidth = (width - 60) / 2;

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },
        header: {
            paddingHorizontal: 20,
            paddingVertical: 20,
        },
        titleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        iconBox: {
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            fontSize: 24,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: 13,
            color: colors.textSecondary,
            fontWeight: '600',
            marginTop: 2,
        },
        controls: {
            paddingHorizontal: 20,
            marginBottom: 24,
            gap: 16,
        },
        searchRow: {
          width: '100%',
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            height: 48,
            borderRadius: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.02,
            shadowRadius: 10,
        },
        searchInput: {
            flex: 1,
            fontSize: 14,
            paddingHorizontal: 10,
            color: colors.textPrimary,
        },
        tabsRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          width: '100%',
        },
        tabs: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceSoft,
            padding: 4,
            borderRadius: 12,
        },
        tab: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
        },
        tabActive: {
            backgroundColor: colors.cardBackground,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        tabText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        tabTextActive: {
            color: colors.textPrimary,
        },
        listContent: {
            paddingHorizontal: 20,
            paddingBottom: 40,
            gap: 15
        },
        row: {
            justifyContent: 'space-between',
            marginBottom: 20,
        },
        card: {
            width: "100%",
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
        },
        imageSection: {
            width: '100%',
            height: 120,
        },
        propertyImage: {
            width: '100%',
            height: '100%',
        },
        imageOverlay: {
            position: 'absolute',
            top: 10,
            left: 10,
            right: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        badge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        typeBadge: {
            backgroundColor: colors.accent,
        },
        growthBadge: {
            backgroundColor: '#16A34A',
        },
        typeText: {
            fontSize: 9,
            fontWeight: '900',
            color: '#FFF',
        },
        growthText: {
            fontSize: 9,
            fontWeight: '900',
            color: '#FFF',
        },
        deleteBtn: {
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.95)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        detailsSection: {
            padding: 12,
        },
        cardAddress: {
            fontSize: 15,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 4,
        },
        locationRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 10,
        },
        cardLocation: {
            fontSize: 11,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        statsRow: {
            flexDirection: 'row',
            gap: 6,
            marginBottom: 12,
        },
        statChip: {
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        statChipText: {
            fontSize: 9,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        metricsGrid: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 10,
            paddingVertical: 8,
            marginBottom: 12,
        },
        metricItem: {
            flex: 1,
            alignItems: 'center',
        },
        metricBorder: {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.cardBorder,
        },
        metricLabel: {
            fontSize: 7,
            fontWeight: '900',
            color: colors.textSecondary,
            marginBottom: 2,
        },
        metricValue: {
            fontSize: 11,
            fontWeight: '900',
            color: colors.textPrimary,
        },
        viewBtn: {
            backgroundColor: '#0B2D3E',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 10,
            marginBottom: 8,
        },
        viewBtnText: {
            color: '#FFF',
            fontSize: 11,
            fontWeight: '900',
        },
        cardFooter: {
            alignItems: 'flex-end',
        },
        savedDate: {
            fontSize: 9,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        emptyState: {
            paddingTop: 60,
            alignItems: 'center',
        },
        emptyText: {
            marginTop: 12,
            fontSize: 16,
            fontWeight: '700',
            color: colors.textSecondary,
        }
    });
}
