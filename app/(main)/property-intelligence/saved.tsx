import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface SavedProperty {
    id: string;
    rawAddress: string;
    address: string;
    cityState: string;
    type: string;
    estValue: string;
    yield: string;
    savedDate: string;
    image: string;
}

export default function SavedPropertiesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const { accessToken } = useAuth();

    const [savedList, setSavedList] = useState<SavedProperty[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Newest'); // 'Newest', 'Value', 'Yield'

    const fetchSavedProperties = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const url = 'https://staging.zien.ai/api/solo/properties/intelligence/saved';
            console.log('[SavedProperties] Fetching saved properties:', url);
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const json = await res.json();
            console.log('[SavedProperties] API Response status:', res.status, JSON.stringify(json, null, 2));

            if (json?.success && Array.isArray(json.data)) {
                const mapped: SavedProperty[] = json.data.map((item: any, idx: number) => {
                    const dataObj = item.data || item.propertyData || {};
                    const detailsObj = dataObj.details || {};
                    const valObj = dataObj.valuation || {};

                    const addr = item.address || detailsObj.address || dataObj.UnparsedAddress || '8826 W Humble Westfield Road, Humble TX 77338';
                    const parts = addr.split(',');
                    const primary = parts[0] || addr;
                    const secondary = parts.slice(1).join(',').trim() || `${detailsObj.city || 'Humble'}, ${detailsObj.state || 'TX'} ${detailsObj.zip || '77338'}`;

                    // Extract image
                    let mediaUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800';
                    if (Array.isArray(detailsObj.images) && detailsObj.images.length > 0) {
                        mediaUrl = detailsObj.images[0];
                    } else if (Array.isArray(dataObj.Media) && dataObj.Media.length > 0) {
                        mediaUrl = dataObj.Media[0]?.MediaURL || mediaUrl;
                    }

                    // Extract estimated value
                    let valStr = '$303,000';
                    if (valObj.estimatedValue) {
                        valStr = `$${Number(valObj.estimatedValue).toLocaleString()}`;
                    } else if (dataObj.ListPrice) {
                        valStr = `$${Number(dataObj.ListPrice).toLocaleString()}`;
                    }

                    // Extract date
                    let dateStr = '13/08/2026';
                    if (item.created_at) {
                        const d = new Date(item.created_at);
                        if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            dateStr = `${day}/${month}/${year}`;
                        }
                    }

                    return {
                        id: String(item.id || idx),
                        rawAddress: addr,
                        address: primary,
                        cityState: secondary,
                        type: detailsObj.type || dataObj.PropertySubType || dataObj.PropertyType || 'Land',
                        estValue: valStr,
                        yield: valObj.rentYield || 'N/A',
                        savedDate: dateStr,
                        image: mediaUrl,
                    };
                });
                setSavedList(mapped);
            }
        } catch (e) {
            console.error('[SavedProperties] Network Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSavedProperties();
    }, [accessToken]);

    const filteredProperties = useMemo(() => {
        let list = savedList.filter(item =>
            item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.cityState.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.rawAddress.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (activeTab === 'Value') {
            list = [...list].sort((a, b) => {
                const valA = parseInt(a.estValue.replace(/[^0-9]/g, '')) || 0;
                const valB = parseInt(b.estValue.replace(/[^0-9]/g, '')) || 0;
                return valB - valA;
            });
        }
        return list;
    }, [savedList, searchQuery, activeTab]);

    const handleRemoveSaved = async (id: string) => {
        Alert.alert(
            "Remove Saved Property",
            "Are you sure you want to remove this property from your saved list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistically remove from list
                        setSavedList(prev => prev.filter(item => item.id !== id));
                        try {
                            const url = `https://staging.zien.ai/api/solo/properties/intelligence/saved/${id}`;
                            console.log('────────────────────────────────────────');
                            console.log('[SavedProperties] 🗑️ DELETE REQUEST URL:', url);
                            console.log('[SavedProperties] TOKEN  :', accessToken ? `Bearer ${accessToken.substring(0, 20)}...` : 'NO TOKEN');
                            console.log('────────────────────────────────────────');

                            const res = await fetch(url, {
                                method: 'DELETE',
                                headers: {
                                    'Accept': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                            });
                            const json = await res.json();
                            console.log('[SavedProperties] ✅ DELETE RESPONSE STATUS:', res.status);
                            console.log('[SavedProperties] 📦 DELETE RESPONSE DATA  :', json);
                            console.log('────────────────────────────────────────');
                        } catch (e) {
                            console.error(`[SavedProperties] 💥 Delete error for item ${id}:`, e);
                        }
                    }
                }
            ]
        );
    };

    const handlePropertyPress = (address: string) => {
        router.replace({
            pathname: '/(main)/property-intelligence',
            params: { address, ts: String(Date.now()) },
        });
    };

    const renderCard = ({ item }: { item: SavedProperty }) => (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            onPress={() => handlePropertyPress(item.rawAddress)}
        >
            {/* Image Header with Land Badge & Trash Icon */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />

                <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                </View>

                <Pressable
                    style={styles.deleteBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveSaved(item.id);
                    }}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons name="delete-outline" size={18} color="#EF4444" />
                </Pressable>
            </View>

            {/* Card Content matching Web UI */}
            <View style={styles.cardContent}>
                <Text style={styles.addressTitle} numberOfLines={2}>
                    {item.rawAddress}
                </Text>

                <View style={styles.cityRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.cityText} numberOfLines={1}>{item.cityState}</Text>
                </View>

                {/* 2-Column EST VALUE / YIELD Box */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>EST. VALUE</Text>
                        <Text style={styles.statValue}>{item.estValue}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>YIELD</Text>
                        <Text style={styles.statValue}>{item.yield}</Text>
                    </View>
                </View>

                {/* View Intelligence Dark Button */}
                <Pressable
                    style={styles.viewBtn}
                    onPress={() => handlePropertyPress(item.rawAddress)}
                >
                    <Text style={styles.viewBtnText}>View Intelligence</Text>
                    <MaterialCommunityIcons name="arrow-top-right" size={16} color="#FFFFFF" />
                </Pressable>

                {/* Saved Date */}
                <View style={styles.footerRow}>
                    <Text style={styles.savedDateText}>Saved {item.savedDate}</Text>
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {/* Header section */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.headerIconBadge}>
                        <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                    </View>
                    <View>
                        <Text style={styles.title}>Saved Properties</Text>
                        <Text style={styles.subtitle}>{savedList.length} property saved for monitoring</Text>
                    </View>
                </View>
            </View>

            {/* Filter Search Input */}
            <View style={styles.filterCard}>
                <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
                <TextInput
                    style={styles.filterInput}
                    placeholder="Filter saved properties..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                    <Pressable onPress={() => setSearchQuery('')}>
                        <MaterialCommunityIcons name="close-circle" size={16} color={colors.textSecondary} />
                    </Pressable>
                ) : null}
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
                {['Newest', 'Value', 'Yield'].map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <Pressable
                            key={tab}
                            style={[styles.tabChip, isActive && styles.tabChipActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Content List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#06B6D4" />
                    <Text style={styles.loadingText}>Loading saved properties...</Text>
                </View>
            ) : filteredProperties.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="star-outline" size={48} color={colors.surfaceMuted} />
                    <Text style={styles.emptyTitle}>No saved properties</Text>
                    <Text style={styles.emptySub}>Search a property to see your history here.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
        header: { marginBottom: 14 },
        headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        headerIconBadge: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(245,158,11,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
        subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

        filterCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 12,
            gap: 8,
        },
        filterInput: { flex: 1, fontSize: 13, color: colors.textPrimary, padding: 0 },

        tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
        tabChip: {
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: colors.surfaceSoft,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        tabChipActive: { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        tabText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
        tabTextActive: { color: colors.textPrimary, fontWeight: '900' },

        loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
        loadingText: { fontSize: 13, color: colors.textSecondary },

        emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
        emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
        emptySub: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 },

        listContent: { paddingBottom: 30, gap: 16 },
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        imageContainer: { height: 180, width: '100%', position: 'relative' },
        image: { width: '100%', height: '100%' },
        typeBadge: {
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: '#06B6D4',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
        },
        typeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
        deleteBtn: {
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
        },

        cardContent: { padding: 16, gap: 10 },
        addressTitle: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, lineHeight: 20 },
        cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        cityText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

        statsGrid: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 12,
            padding: 12,
            marginTop: 4,
        },
        statCol: { flex: 1, gap: 2 },
        statLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.8 },
        statValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },

        viewBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            borderRadius: 10,
            paddingVertical: 12,
            gap: 6,
            marginTop: 4,
        },
        viewBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

        footerRow: { alignItems: 'flex-end', marginTop: 2 },
        savedDateText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
    });
}
