import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RecentSearch {
    id: string;
    address: string;
    cityState: string;
    type: string;
    price: string;
    time: string;
    dateGroup: string;
    icon: any;
}

const INITIAL_RECENT: RecentSearch[] = [
    { id: '1', address: '4521 Wilshire Blvd', cityState: 'Los Angeles, CA 90010', type: 'Single Family', price: '$1.28M', time: '2 hours ago', dateGroup: 'TODAY', icon: 'home-outline' },
    { id: '2', address: '123 Ocean View Drive', cityState: 'Malibu, CA 90265', type: 'Single Family', price: '$4.1M', time: '5 hours ago', dateGroup: 'TODAY', icon: 'home-outline' },
    { id: '3', address: '456 Hillside Ave', cityState: 'Beverly Hills, CA 90210', type: 'Condo', price: '$2.4M', time: '8 hours ago', dateGroup: 'TODAY', icon: 'office-building-outline' },
    { id: '4', address: '789 Palm Blvd', cityState: 'Santa Monica, CA 90401', type: 'Multi-family', price: '$3.7M', time: '1 day ago', dateGroup: 'YESTERDAY', icon: 'home-group' },
    { id: '5', address: '2901 Ocean Ave', cityState: 'Santa Monica, CA 90405', type: 'Condo', price: '$2.1M', time: '2 days ago', dateGroup: 'YESTERDAY', icon: 'office-building-outline' },
    { id: '6', address: '812 Rosecrans Ave', cityState: 'Manhattan Beach, CA 90266', type: 'Single Family', price: '$1.87M', time: '3 days ago', dateGroup: 'MAR 14', icon: 'home-outline' },
];

export default function RecentSearchesScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [recentList, setRecentList] = useState<RecentSearch[]>(INITIAL_RECENT);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredList = useMemo(() => {
        return recentList.filter(item =>
            item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.cityState.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recentList, searchQuery]);

    // Grouping logic for the list
    const groupedData = useMemo(() => {
        const groups: { title: string; data: RecentSearch[] }[] = [];
        filteredList.forEach(item => {
            const group = groups.find(g => g.title === item.dateGroup);
            if (group) {
                group.data.push(item);
            } else {
                groups.push({ title: item.dateGroup, data: [item] });
            }
        });
        return groups;
    }, [filteredList]);

    const handleClearAll = () => {
        Alert.alert(
            "Clear All Searches",
            "Are you sure you want to permanently delete your entire search history?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", style: "destructive", onPress: () => setRecentList([]) }
            ]
        );
    };

    const handleDeleteItem = (id: string) => {
        Alert.alert(
            "Remove Item",
            "Delete this property from your recent searches?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => setRecentList(prev => prev.filter(item => item.id !== id))
                }
            ]
        );
    };

    const handleItemPress = (item: RecentSearch) => {
        // Logic to navigate back to search with this property
        // For now we'll just go back to main hub
        router.push("/(main)/property-intelligence");
    };

    const renderItem = ({ item }: { item: RecentSearch }) => (
        <Pressable
            style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.8 }]}
            onPress={() => handleItemPress(item)}
        >
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={colors.accent} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemAddress} numberOfLines={1}>{item.address}</Text>
                    <View style={styles.itemSubRow}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{item.type}</Text>
                        </View>
                        <Text style={styles.itemCity} numberOfLines={1}>{item.cityState}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.itemRight}>
                <View style={styles.priceContainer}>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                    <Text style={styles.itemTime}>{item.time}</Text>
                </View>

                <View style={styles.itemActions}>
                    <Pressable
                        onPress={() => handleDeleteItem(item.id)}
                        hitSlop={8}
                        style={styles.deleteBtn}
                    >
                        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <View>
                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="clock-outline" size={24} color={colors.accent} />
                        <Text style={styles.title}>Recent Searches</Text>
                    </View>
                    <Text style={styles.subtitle}>{recentList.length} properties analyzed</Text>
                </View>
                <Pressable style={styles.clearBtn} onPress={handleClearAll}>
                    <Text style={styles.clearBtnText}>Clear All</Text>
                </Pressable>
            </View>

            {/* Filter Bar */}
            <View style={styles.filterContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                <TextInput
                    style={styles.filterInput}
                    placeholder="Filter by address or city..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={groupedData}
                keyExtractor={(item) => item.title}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.groupSection}>
                        <View style={styles.groupHeader}>
                            <Text style={styles.groupTitle}>{item.title}</Text>
                            <View style={styles.groupLine} />
                            <Text style={styles.groupCount}>{item.data.length} searches</Text>
                        </View>
                        <View style={styles.groupData}>
                            {item.data.map(search => (
                                <React.Fragment key={search.id}>
                                    {renderItem({ item: search })}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="history" size={64} color={colors.surfaceMuted} />
                        <Text style={styles.emptyTitle}>No Recent Searches</Text>
                        <Text style={styles.emptySubtitle}>Your search history will appear here once you analyze properties.</Text>
                    </View>
                }
            />
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.cardBackground,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
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
        },
        clearBtn: {
            borderWidth: .5,
            borderColor: '#FCA5A5',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
        },
        clearBtnText: {
            color: '#EF4444',
            fontSize: 13,
            fontWeight: '800',
        },
        filterContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            marginHorizontal: 20,
            marginBottom: 24,
            paddingHorizontal: 12,
            height: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        filterInput: {
            flex: 1,
            fontSize: 14,
            color: colors.textPrimary,
            paddingHorizontal: 10,
        },
        listContent: {
            paddingHorizontal: 20,
            paddingBottom: 40,
        },
        groupSection: {
            marginBottom: 24,
        },
        groupHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
        },
        groupTitle: {
            fontSize: 11,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 1,
            textTransform: 'uppercase',
        },
        groupLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.borderLight,
        },
        groupCount: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        groupData: {
            gap: 12,
        },
        itemCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.cardBackground,
            padding: 16,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        itemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: 12,
        },
        iconContainer: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
        },
        itemInfo: {
            flex: 1,
            justifyContent: 'center',
        },
        itemAddress: {
            fontSize: 16,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 4,
            letterSpacing: -0.3,
        },
        itemSubRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        itemCity: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: '500',
            flex: 1,
        },
        itemRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        priceContainer: {
            alignItems: 'flex-end',
            minWidth: 60,
        },
        typeBadge: {
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        typeText: {
            fontSize: 9,
            fontWeight: '800',
            color: colors.accent,
            textTransform: 'uppercase',
        },
        itemPrice: {
            fontSize: 15,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        itemTime: {
            fontSize: 10,
            color: colors.textSecondary,
            marginTop: 2,
            fontWeight: '600',
        },
        itemActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderLeftWidth: 1,
            borderLeftColor: colors.borderLight,
            paddingLeft: 8,
            marginLeft: 4,
        },
        deleteBtn: {
            padding: 4,
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 80,
        },
        emptyTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            marginTop: 16,
        },
        emptySubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: 8,
            paddingHorizontal: 40,
            lineHeight: 22,
        },
    });
}
