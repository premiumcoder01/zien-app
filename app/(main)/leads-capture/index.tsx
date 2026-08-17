import { ExternalLink } from '@/components/external-link';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface LandingPageElement {
    id: string;
    landing_page_id: string;
    type: string;
    data: any;
    styles: any;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface LandingPageItem {
    id: string;
    user_id: number;
    category: string;
    name: string;
    slug: string;
    status: number;
    bg_color: string;
    text_color: string;
    theme_color: string;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
    elements: LandingPageElement[];
    stats: any[];
    leads_count?: number;
    visitor_count?: number;
}

export default function LeadsCaptureScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const { width: windowWidth } = useWindowDimensions();
    const isTablet = windowWidth >= 768;
    const styles = getStyles(colors, isDark, isTablet);

    const router = useRouter();
    const { accessToken } = useAuth();

    const [landingPages, setLandingPages] = useState<LandingPageItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [selectedPageForLeads, setSelectedPageForLeads] = useState<LandingPageItem | null>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [isLeadsLoading, setIsLeadsLoading] = useState(false);
    const [leadsError, setLeadsError] = useState<string | null>(null);

    const fetchLeads = async (page: LandingPageItem) => {
        if (!accessToken) return;
        setSelectedPageForLeads(page);
        setIsLeadsLoading(true);
        setLeadsError(null);
        setLeads([]);
        try {
            const response = await fetch(`https://staging.zien.ai/api/solo/landing-pages/${page.id}/leads`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error: ${response.status}`);
            }
            const leadsArray = Array.isArray(data) ? data : (data.leads || data.data || []);
            setLeads(leadsArray);
        } catch (err: any) {
            console.error('Error fetching page leads:', err);
            setLeadsError(err.message || 'Failed to load leads');
        } finally {
            setIsLeadsLoading(false);
        }
    };

    // Helpers to safely count leads and visitors
    const getPageLeadsCount = (page: any): number => {
        if (typeof page.leads_count === 'number') return page.leads_count;
        if (typeof page.leads === 'number') return page.leads;
        if (Array.isArray(page.stats)) {
            return page.stats.reduce((acc: number, s: any) => acc + (s.leads || s.leads_count || 0), 0);
        }
        if (page.stats && typeof page.stats === 'object') {
            return page.stats.leads || page.stats.leads_count || 0;
        }
        return 0;
    };

    const getPageVisitorsCount = (page: any): number => {
        if (typeof page.visitors_count === 'number') return page.visitors_count;
        if (typeof page.visitor_count === 'number') return page.visitor_count;
        if (typeof page.visitors === 'number') return page.visitors;
        if (Array.isArray(page.stats)) {
            return page.stats.reduce((acc: number, s: any) => acc + (s.visitors || s.visitors_count || s.visitor_count || s.views || 0), 0);
        }
        if (page.stats && typeof page.stats === 'object') {
            return page.stats.visitors || page.stats.visitors_count || page.stats.visitor_count || page.stats.views || 0;
        }
        return 0;
    };

    const getCategoryLabel = (category: string) => {
        if (!category) return 'Landing Page';
        switch (category.toLowerCase()) {
            case 'property':
                return 'Property Page';
            case 'open-house':
            case 'open_house':
                return 'Open House Page';
            case 'bio-link':
            case 'bio_link':
                return 'Bio-Link Page';
            default:
                return `${category.charAt(0).toUpperCase()}${category.slice(1)} Page`;
        }
    };

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 1:
                return 'DRAFT';
            case 2:
                return 'LIVE';
            case 3:
                return 'OPTIMIZING';
            default:
                return 'LIVE';
        }
    };

    const fetchLandingPages = async (showLoadingIndicator = true) => {
        if (!accessToken) return;
        try {
            if (showLoadingIndicator) setIsLoading(true);
            setError(null);
            const response = await fetch('https://staging-api.zien.ai/api/solo/landing-pages', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error: ${response.status}`);
            }
            setLandingPages(data || []);
        } catch (err: any) {
            console.error('Error fetching landing pages:', err);
            setError(err.message || 'Failed to fetch landing pages');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const deleteLandingPage = async (id: string) => {
        if (!accessToken) return;
        try {
            const response = await fetch(`https://staging-api.zien.ai/api/solo/landing-pages/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || `Server error: ${response.status}`);
            }
            // Remove from state
            setLandingPages(prev => prev.filter(item => item.id !== id));
            Alert.alert('Success', 'Landing page deleted successfully.');
        } catch (err: any) {
            console.error('Error deleting landing page:', err);
            Alert.alert('Error', err.message || 'Failed to delete landing page.');
        }
    };

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            "Delete Lead Capture",
            `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteLandingPage(id)
                }
            ]
        );
    };

    useEffect(() => {
        fetchLandingPages();
    }, [accessToken]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLandingPages(false);
    };

    // Calculate aggregated metrics
    const activePagesCount = landingPages.length;
    const totalVisitors = landingPages.reduce((acc, page) => acc + getPageVisitorsCount(page), 0);
    const totalLeads = landingPages.reduce((acc, page) => acc + getPageLeadsCount(page), 0);

    const METRICS = [
        { label: 'Active Pages', value: activePagesCount.toString(), icon: 'star-four-points-outline' as const },
        { label: 'Total Visitors', value: totalVisitors.toString(), icon: 'account-group-outline' as const },
        { label: 'Total Leads Captured', value: totalLeads.toString(), icon: 'flash-outline' as const },
    ];

    // Dynamic width for responsive table view on mobile vs tablet
    const tableMinWidth = isTablet ? '100%' : 750;

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={isDark ? ['#1A242F', '#161F29', '#1A242F'] : ['#D8E9F6', '#F1F6FB', '#F5E6DB']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
                }
            >
                {/* Custom Responsive Header */}
                <View style={[styles.headerContainer, isTablet ? styles.headerRow : styles.headerCol]}>
                    <View style={styles.headerLeft}>
                        <View style={styles.titleRow}>
                            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
                                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
                            </Pressable>
                            <Text style={styles.headerTitle}>Lead Capture</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>
                            Deploy high-conversion funnels for every stage of the real estate lifecycle.
                        </Text>
                    </View>
                    {isTablet && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.headerCreateBtn,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => setShowModal(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                            <Text style={styles.headerCreateBtnText}>Create New Lead Capture</Text>
                        </Pressable>
                    )}
                </View>

                {/* Metrics Row */}
                <View style={styles.metricsRow}>
                    {METRICS.map((item, index) => (
                        <View key={index} style={styles.metricCard}>
                            <View style={styles.metricIconContainer}>
                                <MaterialCommunityIcons name={item.icon} size={18} color={colors.textSecondary} />
                            </View>
                            <View style={styles.metricTextContainer}>
                                <Text style={styles.metricLabel}>{item.label}</Text>
                                <Text style={styles.metricValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Active Lead Capture Section Header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Lead Capture</Text>
                    <Text style={styles.sectionSubtitle}>
                        Real-time performance metrics for your distributed capture network.
                    </Text>
                </View>

                {/* Loading / Error States */}
                {isLoading && !refreshing ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>Loading captures...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable style={styles.retryBtn} onPress={() => fetchLandingPages()}>
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        {isTablet ? (
                            /* Table Container Card (Tablet/Desktop) */
                            <View style={styles.tableCard}>
                                <ScrollView horizontal={false} showsHorizontalScrollIndicator={false}>
                                    <View style={[styles.tableInner, { minWidth: tableMinWidth }]}>
                                        {/* Table Headers */}
                                        <View style={styles.tableHeaderRow}>
                                            <Text style={[styles.tableHeaderText, { flex: 3 }]}>PAGE IDENTITY</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'center' }]}>TOTAL LEADS</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
                                            <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>CONTROL</Text>
                                        </View>

                                        {/* Table Body Rows */}
                                        {landingPages.length === 0 ? (
                                            <View style={styles.emptyContainer}>
                                                <MaterialCommunityIcons name="file-document-outline" size={36} color={colors.textSecondary} />
                                                <Text style={styles.emptyText}>No active lead captures. Create one to get started.</Text>
                                            </View>
                                        ) : (
                                            landingPages.map((item, index) => {
                                                const pageLeads = getPageLeadsCount(item);
                                                const categoryLabel = getCategoryLabel(item.category);
                                                const statusLabel = getStatusLabel(item.status);
                                                const previewUrl = `https://staging.zien.ai/l/${item.slug}`;

                                                return (
                                                    <View
                                                        key={item.id}
                                                        style={[
                                                            styles.tableRow,
                                                            index === landingPages.length - 1 && { borderBottomWidth: 0 }
                                                        ]}
                                                    >
                                                        {/* Page Identity */}
                                                        <View style={[styles.tableColIdentity, { flex: 3 }]}>
                                                            <View style={styles.identityIconBox}>
                                                                <MaterialCommunityIcons name="link-variant" size={16} color={colors.textSecondary} />
                                                            </View>
                                                            <View style={styles.identityTextContainer}>
                                                                <Text style={styles.pageNameText} numberOfLines={1}>
                                                                    {item.name || 'Untitled Landing Page'}
                                                                </Text>
                                                                <Text style={styles.pageCategoryText}>{categoryLabel}</Text>
                                                            </View>
                                                        </View>

                                                        {/* Total Leads */}
                                                        <View style={styles.tableColLeads}>
                                                            <Text style={styles.totalLeadsText}>{pageLeads}</Text>
                                                        </View>

                                                        {/* Status Badge */}
                                                        <View style={styles.tableColStatus}>
                                                            <View style={[
                                                                styles.statusBadge,
                                                                { backgroundColor: item.status === 2 ? '#ECFDF5' : '#FFF7ED' }
                                                            ]}>
                                                                <View style={[
                                                                    styles.statusDot,
                                                                    { backgroundColor: item.status === 2 ? '#10B981' : '#F97316' }
                                                                ]} />
                                                                <Text style={[
                                                                    styles.statusText,
                                                                    { color: item.status === 2 ? '#059669' : '#D97706' }
                                                                ]}>
                                                                    {statusLabel}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {/* Control Actions */}
                                                        <View style={[styles.tableColControl, { flex: 2 }]}>
                                                            <ExternalLink href={previewUrl}>
                                                                <View style={styles.miniActionBtn}>
                                                                    <MaterialCommunityIcons name="open-in-new" size={16} color={colors.textSecondary} />
                                                                </View>
                                                            </ExternalLink>
                                                            <Pressable
                                                                style={styles.miniActionBtn}
                                                                onPress={() => fetchLeads(item)}
                                                            >
                                                                <MaterialCommunityIcons name="account-multiple-outline" size={16} color={colors.textSecondary} />
                                                            </Pressable>
                                                            <Pressable
                                                                style={[styles.miniActionBtn, styles.deleteBtn]}
                                                                onPress={() => handleDelete(item.id, item.name || 'Untitled Landing Page')}
                                                            >
                                                                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                </ScrollView>
                            </View>
                        ) : (
                            /* Mobile Cards List (Mobile Phone UI) */
                            <View style={styles.mobileCardsContainer}>
                                {landingPages.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textSecondary} />
                                        <Text style={styles.emptyText}>No active lead captures. Create one to get started.</Text>
                                    </View>
                                ) : (
                                    landingPages.map((item) => {
                                        const pageLeads = getPageLeadsCount(item);
                                        const pageVisitors = getPageVisitorsCount(item);
                                        const categoryLabel = getCategoryLabel(item.category);
                                        const statusLabel = getStatusLabel(item.status);
                                        const previewUrl = `https://staging.zien.ai/l/${item.slug}`;

                                        return (
                                            <View key={item.id} style={styles.mobileCard}>
                                                {/* Header Details */}
                                                <View style={styles.mobileCardHeader}>
                                                    <View style={styles.mobileCardIconBox}>
                                                        <MaterialCommunityIcons name="link-variant" size={18} color={colors.textSecondary} />
                                                    </View>
                                                    <View style={styles.mobileCardHeaderDetails}>
                                                        <Text style={styles.mobileCardTitle} numberOfLines={1}>
                                                            {item.name || 'Untitled Landing Page'}
                                                        </Text>
                                                        <Text style={styles.mobileCardCategory}>{categoryLabel}</Text>
                                                    </View>
                                                    <View style={[
                                                        styles.statusBadge,
                                                        { backgroundColor: item.status === 2 ? '#ECFDF5' : '#FFF7ED' }
                                                    ]}>
                                                        <View style={[
                                                            styles.statusDot,
                                                            { backgroundColor: item.status === 2 ? '#10B981' : '#F97316' }
                                                        ]} />
                                                        <Text style={[
                                                            styles.statusText,
                                                            { color: item.status === 2 ? '#059669' : '#D97706' }
                                                        ]}>
                                                            {statusLabel}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Card Divider */}
                                                <View style={styles.mobileCardDivider} />

                                                {/* Statistics section inside card */}
                                                <View style={styles.mobileCardStatsRow}>
                                                    <View style={styles.mobileCardStatItem}>
                                                        <MaterialCommunityIcons name="flash-outline" size={16} color={colors.textSecondary} />
                                                        <Text style={styles.mobileCardStatLabel}>Leads:</Text>
                                                        <Text style={styles.mobileCardStatValue}>{pageLeads}</Text>
                                                    </View>
                                                    <View style={styles.mobileCardStatItem}>
                                                        <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.textSecondary} />
                                                        <Text style={styles.mobileCardStatLabel}>Visitors:</Text>
                                                        <Text style={styles.mobileCardStatValue}>{pageVisitors}</Text>
                                                    </View>
                                                </View>

                                                {/* Control Action Buttons */}
                                                <View style={styles.mobileCardActionsRow}>
                                                    <ExternalLink href={previewUrl} style={styles.mobileCardActionBtn}>
                                                        <View style={styles.mobileCardActionBtnInner}>
                                                            <MaterialCommunityIcons name="open-in-new" size={15} color={colors.textSecondary} />
                                                            <Text style={styles.mobileCardActionBtnText}>View</Text>
                                                        </View>
                                                    </ExternalLink>
                                                    <Pressable
                                                        style={[styles.mobileCardActionBtn, { flex: 0, width: 44 }]}
                                                        onPress={() => fetchLeads(item)}
                                                    >
                                                        <View style={[styles.mobileCardActionBtnInner, { paddingHorizontal: 0 }]}>
                                                            <MaterialCommunityIcons name="account-multiple-outline" size={18} color={colors.textSecondary} />
                                                        </View>
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.mobileCardActionBtn, styles.mobileCardDeleteBtn]}
                                                        onPress={() => handleDelete(item.id, item.name || 'Untitled Landing Page')}
                                                    >
                                                        <View style={styles.mobileCardActionBtnInner}>
                                                            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#EF4444" />
                                                            <Text style={[styles.mobileCardActionBtnText, { color: '#EF4444' }]}>Delete</Text>
                                                        </View>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        )}

                    </>
                )}
            </ScrollView>



            {/* Captured Leads Modal */}
            <Modal
                visible={selectedPageForLeads !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedPageForLeads(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.leadsModalContent}>
                        {/* Header */}
                        <View style={styles.leadsModalHeader}>
                            <View style={styles.leadsModalHeaderLeft}>
                                <Text style={styles.leadsModalTitle}>Captured Leads</Text>
                                <Text style={styles.leadsModalSubtitle}>
                                    Data stream from {selectedPageForLeads?.name || 'Untitled Landing Page'}
                                </Text>
                            </View>
                            <Pressable 
                                style={styles.leadsModalCloseBtn} 
                                onPress={() => setSelectedPageForLeads(null)}
                                hitSlop={8}
                            >
                                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        {isLeadsLoading ? (
                            <View style={styles.leadsModalCenterBox}>
                                <ActivityIndicator size="large" color={colors.accent || '#0a2341'} />
                                <Text style={styles.leadsModalLoadingText}>Loading leads...</Text>
                            </View>
                        ) : leadsError ? (
                            <View style={styles.leadsModalCenterBox}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                                <Text style={styles.leadsModalErrorText}>{leadsError}</Text>
                                <Pressable 
                                    style={styles.leadsModalRetryBtn} 
                                    onPress={() => selectedPageForLeads && fetchLeads(selectedPageForLeads)}
                                >
                                    <Text style={styles.leadsModalRetryBtnText}>Retry</Text>
                                </Pressable>
                            </View>
                        ) : leads.length === 0 ? (
                            /* Empty State matches design mockup */
                            <View style={styles.leadsModalCenterBox}>
                                <View style={styles.leadsModalEmptyIconBox}>
                                    <MaterialCommunityIcons name="account-group-outline" size={48} color="#CBD5E1" />
                                </View>
                                <Text style={styles.leadsModalEmptyTitle}>No leads captured yet.</Text>
                                <Text style={styles.leadsModalEmptySubtitle}>
                                    Once visitors fill out your form, they will appear here.
                                </Text>
                            </View>
                        ) : (
                            /* Leads List */
                            <ScrollView 
                                style={styles.leadsModalList}
                                contentContainerStyle={styles.leadsModalListContent}
                                showsVerticalScrollIndicator={true}
                            >
                                {leads.map((lead, idx) => {
                                    // Parse lead data
                                    const leadData = lead.data || {};
                                    const leadName = lead.name || leadData.name || leadData.Name || 'Anonymous Visitor';
                                    const leadEmail = lead.email || leadData.email || leadData.Email || '';
                                    const leadPhone = lead.phone || leadData.phone || leadData.Phone || '';
                                    
                                    // Filter out already shown/internal keys from extra details
                                    const skipKeys = ['name', 'Name', 'email', 'Email', 'phone', 'Phone'];
                                    const extraDetails = Object.entries(leadData).filter(
                                        ([k]) => !skipKeys.includes(k)
                                    );

                                    // Format Date
                                    let leadDateStr = '';
                                    try {
                                        if (lead.created_at) {
                                            const d = new Date(lead.created_at);
                                            leadDateStr = d.toLocaleDateString(undefined, { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            }) + ' at ' + d.toLocaleTimeString(undefined, { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            });
                                        }
                                    } catch (_) {}

                                    return (
                                        <Pressable 
                                            key={lead.id || idx} 
                                            style={styles.leadCard}
                                            onPress={() => {
                                                if (lead.id || lead.lead_id) {
                                                    setSelectedPageForLeads(null);
                                                    router.push({ pathname: '/(main)/crm/leads/[id]', params: { id: lead.id || lead.lead_id } });
                                                }
                                            }}
                                        >
                                            <View style={styles.leadCardHeader}>
                                                <View style={styles.leadAvatarBox}>
                                                    <MaterialCommunityIcons name="account" size={18} color="#FFFFFF" />
                                                </View>
                                                <View style={styles.leadHeaderInfo}>
                                                    <Text style={styles.leadCardName}>{leadName}</Text>
                                                    {leadDateStr ? (
                                                        <Text style={styles.leadCardDate}>{leadDateStr}</Text>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {(leadEmail || leadPhone) && (
                                                <View style={styles.leadContactBlock}>
                                                    {leadEmail ? (
                                                        <View style={styles.leadContactItem}>
                                                            <MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} />
                                                            <Text style={styles.leadContactText} numberOfLines={1}>{leadEmail}</Text>
                                                        </View>
                                                    ) : null}
                                                    {leadPhone ? (
                                                        <View style={styles.leadContactItem}>
                                                            <MaterialCommunityIcons name="phone-outline" size={14} color={colors.textSecondary} />
                                                            <Text style={styles.leadContactText} numberOfLines={1}>{leadPhone}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            )}

                                            {extraDetails.length > 0 && (
                                                <View style={styles.leadExtraBlock}>
                                                    {extraDetails.map(([key, val]) => (
                                                        <View key={key} style={styles.leadExtraItem}>
                                                            <Text style={styles.leadExtraLabel}>{key.toUpperCase()}:</Text>
                                                            <Text style={styles.leadExtraValue}>{String(val)}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Feature Limit Warning Modal */}
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

const getStyles = (colors: any, isDark: boolean, isTablet: boolean) => StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: isTablet ? 60 : 30,
    },
    headerContainer: {
        gap: 12,
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerCol: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
        gap: 6,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.cardBackgroundSemi || 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        maxWidth: '90%',
    },
    headerCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a2341', // Dark navy brand color
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
        shadowColor: '#0a2341',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    headerCreateBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
    },
    metricCard: {
        flex: 1,
        minWidth: 150,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackgroundSemi || 'rgba(255, 255, 255, 0.9)',
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
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricTextContainer: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 3,
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
    centerBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: '#0a2341',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    tableCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
        overflow: 'hidden',
    },
    tableInner: {
        padding: 16,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: colors.divider || '#EEF2F7',
        marginBottom: 8,
    },
    tableHeaderText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted || '#8A98A8',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: colors.rowBorder || '#EEF2F7',
    },
    tableColIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    identityIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    identityTextContainer: {
        flex: 1,
        gap: 2,
    },
    pageNameText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    pageCategoryText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    tableColLeads: {
        flex: 1.2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totalLeadsText: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    tableColStatus: {
        flex: 1.2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    tableColControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    miniActionBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    deleteBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    leadsModalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxWidth: 480,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    leadsModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    leadsModalHeaderLeft: {
        flex: 1,
        marginRight: 12,
        gap: 2,
    },
    leadsModalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    leadsModalSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    leadsModalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    leadsModalCenterBox: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    leadsModalLoadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    leadsModalErrorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
    },
    leadsModalRetryBtn: {
        backgroundColor: '#0a2341',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 6,
    },
    leadsModalRetryBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    leadsModalEmptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    leadsModalEmptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    leadsModalEmptySubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 260,
    },
    leadsModalList: {
        flexGrow: 0,
        marginTop: 4,
    },
    leadsModalListContent: {
        gap: 12,
        paddingBottom: 8,
    },
    leadCard: {
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    leadCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    leadAvatarBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0a2341',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadHeaderInfo: {
        flex: 1,
        gap: 1,
    },
    leadCardName: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    leadCardDate: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    leadContactBlock: {
        marginTop: 10,
        gap: 6,
    },
    leadContactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    leadContactText: {
        fontSize: 13,
        color: colors.textPrimary,
    },
    leadExtraBlock: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderColor: colors.cardBorder,
        gap: 4,
    },
    leadExtraItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    leadExtraLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        width: 80,
    },
    leadExtraValue: {
        flex: 1,
        fontSize: 12,
        color: colors.textPrimary,
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
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
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
    bottomBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: isDark ? 'rgba(22, 31, 41, 0.95)' : 'rgba(241, 246, 251, 0.95)',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderColor: colors.cardBorder,
    },
    floatingCreateBtn: {
        height: 54,
        borderRadius: 27,
        backgroundColor: '#0a2341',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    floatingCreateBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    mobileCardsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    mobileCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    mobileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    mobileCardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    mobileCardHeaderDetails: {
        flex: 1,
        gap: 2,
    },
    mobileCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    mobileCardCategory: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    mobileCardDivider: {
        height: 1,
        backgroundColor: colors.divider || '#EEF2F7',
        marginVertical: 14,
    },
    mobileCardStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        paddingHorizontal: 4,
    },
    mobileCardStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mobileCardStatLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    mobileCardStatValue: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    mobileCardActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    mobileCardActionBtn: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft || '#F3F6FA',
        borderWidth: 1,
        borderColor: colors.cardBorder,
        overflow: 'hidden',
    },
    mobileCardActionBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
        width: '100%',
    },
    mobileCardActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    mobileCardDeleteBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.15)',
    },
});
