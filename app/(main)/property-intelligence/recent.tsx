import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface HistoryItem {
    id: number;
    user_id: number;
    query: string;
    property_type: string;
    created_at: string;
    updated_at: string;
}

export default function RecentSearchesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const { accessToken } = useAuth();

    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchHistory = async () => {
        if (!accessToken) return;
        setIsLoading(true);
        try {
            const url = 'https://staging.zien.ai/api/solo/properties/intelligence/history';
            console.log('[RecentSearches] Fetching history:', url);
            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const json = await res.json();
            console.log('[RecentSearches] API Response:', res.status, json);
            if (json?.success && Array.isArray(json.data)) {
                setHistoryList(json.data);
            }
        } catch (e) {
            console.error('[RecentSearches] Network Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [accessToken]);

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return historyList;
        return historyList.filter(item =>
            item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.property_type?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [historyList, searchQuery]);

    // Grouping by Date (DD/MM/YYYY) matching Web UI
    const groupedData = useMemo(() => {
        const groups: { dateTitle: string; items: HistoryItem[] }[] = [];

        filteredList.forEach(item => {
            let dateStr = 'Recent';
            if (item.created_at) {
                const d = new Date(item.created_at);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    dateStr = `${day}/${month}/${year}`;
                }
            }

            const existingGroup = groups.find(g => g.dateTitle === dateStr);
            if (existingGroup) {
                existingGroup.items.push(item);
            } else {
                groups.push({ dateTitle: dateStr, items: [item] });
            }
        });

        return groups;
    }, [filteredList]);

    const handleClearAll = () => {
        Alert.alert(
            "Clear All Search History",
            "Are you sure you want to delete your entire search history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        setHistoryList([]);
                        try {
                            const url = 'https://staging.zien.ai/api/solo/properties/intelligence/history/all';
                            console.log('[RecentSearches] 🗑️ CLEAR ALL REQUEST:', url);
                            const res = await fetch(url, {
                                method: 'DELETE',
                                headers: {
                                    'Accept': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                            });
                            const json = await res.json();
                            console.log('[RecentSearches] ✅ CLEAR ALL RESPONSE:', res.status, json);
                        } catch (e) {
                            console.error('[RecentSearches] 💥 Failed to clear all history:', e);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteItem = (id: number) => {
        Alert.alert(
            "Remove Search History",
            "Are you sure you want to delete this search history item?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistically remove from state
                        setHistoryList(prev => prev.filter(item => item.id !== id));

                        try {
                            const url = `https://staging.zien.ai/api/solo/properties/intelligence/history/${id}`;
                            console.log('[RecentSearches] 🗑️ DELETE REQUEST:', url);
                            const res = await fetch(url, {
                                method: 'DELETE',
                                headers: {
                                    'Accept': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                            });
                            const json = await res.json();
                            console.log('[RecentSearches] ✅ DELETE RESPONSE:', res.status, json);
                        } catch (e) {
                            console.error('[RecentSearches] 💥 Failed to delete history item:', e);
                        }
                    }
                }
            ]
        );
    };

    const handleItemPress = (queryAddress: string) => {
        router.replace({
            pathname: '/(main)/property-intelligence',
            params: { address: queryAddress, ts: String(Date.now()) },
        });
    };

    const renderHistoryItem = (item: HistoryItem) => {
        // Format time HH:mm:ss
        let timeStr = '';
        if (item.created_at) {
            const d = new Date(item.created_at);
            if (!isNaN(d.getTime())) {
                const hours = String(d.getHours()).padStart(2, '0');
                const mins = String(d.getMinutes()).padStart(2, '0');
                const secs = String(d.getSeconds()).padStart(2, '0');
                timeStr = `${hours}:${mins}:${secs}`;
            }
        }

        const addressParts = item.query.split(',');
        const primaryAddress = addressParts[0] || item.query;
        const secondaryAddress = addressParts.slice(1).join(',').trim();

        return (
            <Pressable
                key={item.id}
                style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.8 }]}
                onPress={() => handleItemPress(item.query)}
            >
                <View style={styles.pinIconBadge}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#06B6D4" />
                </View>

                <View style={styles.itemMainInfo}>
                    <Text style={styles.primaryAddress} numberOfLines={1}>
                        {primaryAddress}
                    </Text>
                    {secondaryAddress ? (
                        <Text style={styles.secondaryAddress} numberOfLines={1}>
                            {secondaryAddress}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.itemRight}>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{item.property_type || 'Land'}</Text>
                    </View>

                    {timeStr ? <Text style={styles.timeText}>{timeStr}</Text> : null}

                    {/* Red Delete Button with Confirmation Alert & DELETE API Call */}
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                        }}
                        hitSlop={8}
                        style={styles.deleteBtn}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={16} color="#EF4444" />
                    </Pressable>

                    <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.headerIconBadge}>
                        <MaterialCommunityIcons name="history" size={20} color="#06B6D4" />
                    </View>
                    <View>
                        <Text style={styles.title}>Recent Searches</Text>
                        <Text style={styles.subtitle}>{historyList.length} properties analyzed</Text>
                    </View>
                </View>

                {historyList.length > 0 && (
                    <Pressable style={styles.clearBtn} onPress={handleClearAll}>
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </Pressable>
                )}
            </View>

            {/* Filter Search Input */}
            <View style={styles.filterCard}>
                <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
                <TextInput
                    style={styles.filterInput}
                    placeholder="Filter by address or city..."
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

            {/* Content Area */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#06B6D4" />
                    <Text style={styles.loadingText}>Loading search history...</Text>
                </View>
            ) : groupedData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="history" size={48} color={colors.surfaceMuted} />
                    <Text style={styles.emptyTitle}>No recent searches</Text>
                    <Text style={styles.emptySub}>Properties you search for will appear here for quick access.</Text>
                </View>
            ) : (
                <FlatList
                    data={groupedData}
                    keyExtractor={(group) => group.dateTitle}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: group }) => (
                        <View style={styles.groupContainer}>
                            <View style={styles.groupHeader}>
                                <Text style={styles.groupDate}>{group.dateTitle}</Text>
                                <Text style={styles.groupCount}>{group.items.length} searches</Text>
                            </View>

                            <View style={styles.groupCardsWrapper}>
                                {group.items.map(item => renderHistoryItem(item))}
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        headerIconBadge: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: 'rgba(6,182,212,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
        subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
        clearBtn: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.3)',
            backgroundColor: 'rgba(239,68,68,0.08)',
        },
        clearBtnText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },

        filterCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            marginBottom: 16,
            gap: 8,
        },
        filterInput: {
            flex: 1,
            fontSize: 13,
            color: colors.textPrimary,
            padding: 0,
        },

        loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
        loadingText: { fontSize: 13, color: colors.textSecondary },

        emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
        emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
        emptySub: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 },

        listContent: { paddingBottom: 30, gap: 18 },
        groupContainer: { gap: 8 },
        groupHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 4,
        },
        groupDate: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
        groupCount: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
        groupCardsWrapper: { gap: 8 },

        itemCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 10,
        },
        pinIconBadge: {
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: 'rgba(6,182,212,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        itemMainInfo: { flex: 1, gap: 2 },
        primaryAddress: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
        secondaryAddress: { fontSize: 11, color: colors.textSecondary },

        itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        typeBadge: {
            backgroundColor: 'rgba(6,182,212,0.1)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#06B6D4' },
        timeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
        deleteBtn: {
            padding: 6,
            borderRadius: 8,
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.2)',
        },
    });
}
