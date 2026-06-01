import { ExternalLink } from '@/components/external-link';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LeadCaptureItem = {
    id: string;
    title: string;
    type: string;
    visitorDensity: string;
    trend: string;
    trendType: 'up' | 'down';
    conversion: string;
    leads: number;
    status: 'LIVE' | 'OPTIMIZING' | 'DRAFT';
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    url: string;
};

const CAPTURE_HISTORY: LeadCaptureItem[] = [
    {
        id: '1',
        title: 'Malibu Villa Listing',
        type: 'Property Page',
        visitorDensity: '1.4k',
        trend: '+12%',
        trendType: 'up',
        conversion: '3.0%',
        leads: 42,
        status: 'LIVE',
        icon: 'home-city-outline',
        color: '#6366F1',
        url: 'https://zien.com/preview/malibu-villa',
    },
    {
        id: '2',
        title: 'Beverly Hills Open House',
        type: 'Check-In Page',
        visitorDensity: '856',
        trend: '+24%',
        trendType: 'up',
        conversion: '14.9%',
        leads: 128,
        status: 'LIVE',
        icon: 'account-group-outline',
        color: '#0EA5E9',
        url: 'https://zien.com/preview/beverly-hills',
    },
    {
        id: '3',
        title: 'Agent Bio - Becker',
        type: 'Bio-Link Page',
        visitorDensity: '2.1k',
        trend: '-2%',
        trendType: 'down',
        conversion: '0.7%',
        leads: 15,
        status: 'OPTIMIZING',
        icon: 'account-badge-outline',
        color: '#F97316',
        url: 'https://zien.com/preview/agent-becker',
    },
];

const METRICS = [
    { label: 'TOTAL REACH', value: '4.3k', icon: 'account-group' },
    { label: 'CAPTURE RATE', value: '18.4%', icon: 'chart-arc' },
    { label: 'AVG. ENGAGEMENT', value: '2m 14s', icon: 'clock-outline' },
];

export default function LeadsCaptureScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(colors);

    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [captureHistory, setCaptureHistory] = useState<LeadCaptureItem[]>(CAPTURE_HISTORY);

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            "Delete Lead Capture",
            `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setCaptureHistory(prev => prev.filter(item => item.id !== id));
                    }
                }
            ]
        );
    };

    const renderMetric = (item: typeof METRICS[0], index: number) => (
        <View key={index} style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.textSecondary} />
            </View>
            <View>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={styles.metricValue}>{item.value}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: LeadCaptureItem }) => (
        <View style={styles.leadCard}>
            <View style={styles.leadCardHeader}>
                <View style={[styles.leadIconBox, { backgroundColor: `${item.color}15` }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.leadTitleContent}>
                    <Text style={styles.leadTitle}>{item.title}</Text>
                    <Text style={styles.leadType}>{item.type}</Text>
                </View>
                <View style={styles.actionRow}>
                    <ExternalLink href={item.url}>
                        <View style={styles.miniActionBtn}>
                            <MaterialCommunityIcons name="open-in-new" size={16} color={colors.textSecondary} />
                        </View>
                    </ExternalLink>
                    <Pressable style={styles.miniActionBtn} onPress={() => setShowModal(true)}>
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                        style={[styles.miniActionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(item.id, item.title)}
                    >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                    </Pressable>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.leadStatsRow}>
                <View style={styles.leadStatItem}>
                    <Text style={styles.leadStatLabel}>VISITOR DENSITY</Text>
                    <View style={styles.row}>
                        <Text style={styles.leadStatValue}>{item.visitorDensity}</Text>
                        <View style={[
                            styles.trendBadge,
                            { backgroundColor: item.trendType === 'up' ? '#ECFDF5' : '#FEF2F2' }
                        ]}>
                            <Text style={[
                                styles.trendText,
                                { color: item.trendType === 'up' ? '#10B981' : '#EF4444' }
                            ]}>
                                {item.trend}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.leadStatItem}>
                    <Text style={styles.leadStatLabel}>CONVERSION</Text>
                    <Text style={styles.leadStatValue}>
                        {item.conversion} <Text style={styles.leadsCount}>({item.leads} leads)</Text>
                    </Text>
                </View>
            </View>

            <View style={styles.leadCardFooter}>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'LIVE' ? '#ECFDF5' : '#FFF7ED' }
                ]}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: item.status === 'LIVE' ? '#10B981' : '#F97316' }
                    ]} />
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'LIVE' ? '#059669' : '#D97706' }
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader
                title="Lead Capture"
                subtitle="Deploy high-conversion architectural funnels for every stage of the real estate lifecycle."
                onBack={() => router.back()}

            />

            <FlatList
                data={captureHistory}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={
                    <View style={styles.headerContent}>
                        <View style={styles.metricsRow}>
                            {METRICS.map(renderMetric)}
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Lead Capture</Text>
                            <Text style={styles.sectionSubtitle}>
                                Real-time performance metrics for your distributed capture network.
                            </Text>
                        </View>
                    </View>
                }
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            <View style={styles.fabContainer}>
                <Pressable
                    style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
                    onPress={() => setShowModal(true)}
                >
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                    <Text style={styles.fabText}>Create New Lead Capture</Text>
                </Pressable>
            </View>
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <MaterialCommunityIcons name="web-off" size={48} color={colors.accentTeal} />
                        </View>
                        <Text style={styles.modalTitle}>Feature Limited</Text>
                        <Text style={styles.modalDescription}>
                            This feature is currently not available on the app version. Please try this on our web for the full experience.
                        </Text>
                        <Pressable
                            style={styles.modalButton}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundGradient[0] || colors.cardBackground,
    },
    headerCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0B2D3E',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
    },
    headerCreateBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    headerContent: {
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    heroSection: {
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    heroDesc: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
        maxWidth: '90%',
    },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    metricIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    listContainer: {
        paddingBottom: 100,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a2341',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
        shadowColor: '#0a2341',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    fabText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    leadCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        marginHorizontal: 18,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    leadCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    leadIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    leadTitleContent: {
        flex: 1,
    },
    leadTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    leadType: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 6,
    },
    miniActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    deleteBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    divider: {
        height: 1,
        backgroundColor: colors.cardBorder,
        marginBottom: 14,
    },
    leadStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    leadStatItem: {
        flex: 1,
    },
    leadStatLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    leadStatValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    leadsCount: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '400',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trendBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    trendText: {
        fontSize: 10,
        fontWeight: '700',
    },
    leadCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalButton: {
        backgroundColor: '#0a2341',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
