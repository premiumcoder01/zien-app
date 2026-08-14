import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Slot, usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.62), 260);

const NAV_ITEMS = [
    { id: 'index',  label: 'Search', icon: 'magnify',         route: '/(main)/property-intelligence' },
    { id: 'recent', label: 'Recent', icon: 'history',          route: '/(main)/property-intelligence/recent' },
    { id: 'saved',  label: 'Saved',  icon: 'bookmark-outline', route: '/(main)/property-intelligence/saved' },
];

// Sub-tabs injected from index.tsx via global state
export let _drawerSubTabs: string[] = [];
export let _drawerActiveSubTab: string = '';
export let _drawerOnSubTabPress: ((tab: string) => void) | null = null;

export function setDrawerSubTabs(
    tabs: string[],
    active: string,
    onPress: (tab: string) => void,
) {
    _drawerSubTabs = tabs;
    _drawerActiveSubTab = active;
    _drawerOnSubTabPress = onPress;
}

export default function PropertyIntelligenceLayout() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const translateX = React.useRef(new Animated.Value(DRAWER_WIDTH)).current;

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    };

    const closeDrawer = () => {
        Animated.timing(translateX, {
            toValue: DRAWER_WIDTH,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setDrawerOpen(false));
    };

    const currentTabId = pathname.endsWith('property-intelligence')
        ? 'index'
        : pathname.split('/').pop() || 'index';

    const handleNavPress = (route: string) => {
        closeDrawer();
        setTimeout(() => router.replace(route as any), 220);
    };

    const handleSubTabPress = (tab: string) => {
        _drawerOnSubTabPress?.(tab);
        closeDrawer();
    };

    const subTabs = _drawerSubTabs;
    const activeSubTab = _drawerActiveSubTab;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={colors.backgroundGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header with 3-line menu icon */}
                <PageHeader
                    title="Property Intelligence"
                    onBack={() => router.back()}
                    rightIcon="menu"
                    onRightPress={openDrawer}
                    rightIconColor={colors.textPrimary}
                />

                <View style={styles.content}>
                    <Slot />
                </View>
            </SafeAreaView>

            {/* Drawer Modal */}
            <Modal
                visible={drawerOpen}
                transparent
                animationType="none"
                onRequestClose={closeDrawer}
                statusBarTranslucent
            >
                {/* Backdrop */}
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={closeDrawer}
                />

                {/* Drawer Panel - Narrower width & clean top safe padding */}
                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX }] },
                    ]}
                >
                    <View style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
                        <View style={styles.drawerTitleRow}>
                            <View style={styles.titleIconBadge}>
                                <MaterialCommunityIcons name="domain" size={16} color="#06B6D4" />
                            </View>
                            <Text style={styles.drawerTitle} numberOfLines={1}>Menu</Text>
                        </View>
                        <Pressable onPress={closeDrawer} style={styles.closeBtn} hitSlop={8}>
                            <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <SafeAreaView edges={['bottom']} style={styles.drawerSafe}>
                        {/* Navigation Section */}
                        <View style={styles.drawerSection}>
                            <Text style={styles.drawerSectionLabel}>NAVIGATION</Text>
                            {NAV_ITEMS.map((item) => {
                                const isActive = currentTabId === item.id;
                                return (
                                    <Pressable
                                        key={item.id}
                                        style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                                        onPress={() => handleNavPress(item.route)}
                                    >
                                        <View style={[styles.drawerItemIcon, isActive && styles.drawerItemIconActive]}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={16}
                                                color={isActive ? '#06B6D4' : colors.textSecondary}
                                            />
                                        </View>
                                        <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]} numberOfLines={1}>
                                            {item.label}
                                        </Text>
                                        {isActive && (
                                            <MaterialCommunityIcons name="chevron-right" size={14} color="#06B6D4" />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Sub-tabs Section (Property Analysis) */}
                        {subTabs.length > 0 && (
                            <>
                                <View style={styles.drawerDivider} />
                                <View style={styles.drawerSection}>
                                    <Text style={styles.drawerSectionLabel}>PROPERTY ANALYSIS</Text>
                                    {subTabs.map((tab) => {
                                        const isActive = activeSubTab === tab;
                                        const iconMap: Record<string, string> = {
                                            'Overview': 'home-outline',
                                            'Comparable Listings': 'home-city-outline',
                                            'Market Trends': 'trending-up',
                                            'Property Details': 'clipboard-text-outline',
                                            'Demographics': 'chart-pie-outline',
                                            'Map View': 'map-marker-radius-outline',
                                        };
                                        return (
                                            <Pressable
                                                key={tab}
                                                style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                                                onPress={() => handleSubTabPress(tab)}
                                            >
                                                <View style={[styles.drawerItemIcon, isActive && styles.drawerItemIconActive]}>
                                                    <MaterialCommunityIcons
                                                        name={(iconMap[tab] || 'circle-outline') as any}
                                                        size={16}
                                                        color={isActive ? '#06B6D4' : colors.textSecondary}
                                                    />
                                                </View>
                                                <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]} numberOfLines={1}>
                                                    {tab}
                                                </Text>
                                                {isActive && (
                                                    <View style={styles.activeDot} />
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </SafeAreaView>
                </Animated.View>
            </Modal>
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        safeArea: { flex: 1 },
        content: { flex: 1 },

        // Backdrop
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
        },

        // Drawer Panel (Narrower width & clean white background)
        drawer: {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: -4, height: 0 },
            elevation: 10,
        },
        drawerSafe: { flex: 1, backgroundColor: '#FFFFFF' },
        drawerHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: '#FFFFFF',
        },
        drawerTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
        },
        titleIconBadge: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'rgba(6,182,212,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        drawerTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: '#0F172A',
        },
        closeBtn: {
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E8F0',
        },

        // Drawer items
        drawerSection: { paddingHorizontal: 12, paddingTop: 14, gap: 3 },
        drawerSectionLabel: {
            fontSize: 9,
            fontWeight: '900',
            color: '#94A3B8',
            letterSpacing: 1.1,
            paddingHorizontal: 6,
            marginBottom: 4,
        },
        drawerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 9,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: 'transparent',
        },
        drawerItemActive: {
            backgroundColor: 'rgba(6,182,212,0.08)',
        },
        drawerItemIcon: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#F1F5F9',
        },
        drawerItemIconActive: {
            backgroundColor: 'rgba(6,182,212,0.15)',
            borderColor: 'rgba(6,182,212,0.25)',
        },
        drawerItemText: {
            flex: 1,
            fontSize: 13,
            fontWeight: '600',
            color: '#475569',
        },
        drawerItemTextActive: {
            color: '#0F172A',
            fontWeight: '800',
        },
        activeDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#06B6D4',
        },
        drawerDivider: {
            height: 1,
            backgroundColor: '#F1F5F9',
            marginHorizontal: 16,
            marginTop: 12,
        },
    });
}
