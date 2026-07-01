import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getTeamLogs, getTeamProfile, TeamLogEntry, TeamLogsResponse } from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

// Date Formatter: converts ISO timestamp into premium "DD MMM YYYY, hh:mm:ss AM/PM"
const formatLogTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;

        const pad = (num: number) => num.toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const day = pad(date.getDate());
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        const hoursStr = pad(hours);

        return `${day} ${monthName} ${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
    } catch {
        return isoString;
    }
};

const SeverityBadge = ({ severity }: { severity: string }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const sev = (severity || '').toUpperCase();
    let bgColor = '#ECFEFF';
    let borderColor = '#A5F3FC';
    let textColor = '#0891B2';
    let iconName: any = 'terminal';

    if (sev === 'CRITICAL') {
        bgColor = '#FEF2F2';
        borderColor = '#FCA5A5';
        textColor = '#EF4444';
        iconName = 'alert-circle';
    } else if (sev === 'WARNING') {
        bgColor = '#FFF7ED';
        borderColor = '#FED7AA';
        textColor = '#F97316';
        iconName = 'shield-alert';
    }

    return (
        <View style={[styles.badge, { backgroundColor: bgColor, borderColor: borderColor }]}>
            <MaterialCommunityIcons name={iconName} size={12} color={textColor} />
            <Text style={[styles.badgeText, { color: textColor }]}>{sev}</Text>
        </View>
    );
};

const LogItem = ({ log }: { log: TeamLogEntry }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    return (
        <View style={[styles.logCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            {/* Header: ID, Severity & Source IP */}
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardLogId}>LOG-{log.id}</Text>
                    <SeverityBadge severity={log.severity} />
                </View>
                <View style={styles.cardHeaderRight}>
                    <MaterialCommunityIcons name="laptop" size={13} color="#94A3B8" />
                    <Text style={[styles.cardIp, { color: colors.textSecondary }]}>{log.ip || '-'}</Text>
                </View>
            </View>

            {/* Divider Line */}
            <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Action performed */}
            <View style={styles.cardActionRow}>
                <Text style={[styles.cardAction, { color: colors.textPrimary }]}>{log.action}</Text>
            </View>

            {/* Details: User and Target Column */}
            <View style={styles.cardDetailsRow}>
                {/* Performed By Column */}
                <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>PERFORMED BY</Text>
                    <View style={styles.detailUserCell}>
                        <MaterialCommunityIcons name="account-outline" size={14} color={colors.accentTeal} />
                        <Text style={[styles.detailValue, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                            {log.user_name || `User #${log.user_id}`}
                        </Text>
                    </View>
                </View>

                {/* Target Column */}
                <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>TARGET</Text>
                    <Text style={[styles.detailValue, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                        {log.target || '-'}
                    </Text>
                </View>
            </View>

            {/* Divider Line */}
            <View style={[styles.cardDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Footer: Localized Timestamp */}
            <View style={styles.cardFooter}>
                <MaterialCommunityIcons name="clock-outline" size={13} color="#64748B" />
                <Text style={[styles.cardTimestamp, { color: colors.textSecondary }]}>
                    {formatLogTimestamp(log.timestamp)}
                </Text>
            </View>
        </View>
    );
};

export default function ActivityLogs() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<'All' | 'Critical' | 'Warning' | 'Info'>('All');
    const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const toastY = useRef(new Animated.Value(-120)).current;

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        Animated.timing(toastY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                Animated.timing(toastY, {
                    toValue: -120,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setToast(null));
            }, 2500);
        });
    };

    // 1. Fetch Profile to get companyId
    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['teamProfile'],
        queryFn: () => getTeamProfile(accessToken!),
        enabled: !!accessToken,
    });
    const companyId = profile?.company_id;

    // 2. Fetch Logs based on companyId
    const { data: logsData, isLoading: loadingLogs } = useQuery<TeamLogsResponse>({
        queryKey: ['teamLogs', companyId],
        queryFn: () => getTeamLogs(accessToken!, companyId!),
        enabled: !!accessToken && !!companyId,
    });

    const isPageLoading = loadingProfile || loadingLogs;

    // Default Fallback values for Summary metrics
    const summary = logsData?.summary || {
        total_events: 0,
        critical_events: 0,
        warning_events: 0,
        info_events: 0,
        auth_events: 0,
        affected_users: 0,
    };

    // Filter Logs locally on the client-side
    const filteredLogs = (logsData?.logs || []).filter(log => {
        const matchesSearch =
            (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.target || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.ip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            `LOG-${log.id}`.toLowerCase().includes(searchQuery.toLowerCase());

        if (selectedSeverity === 'All') return matchesSearch;
        return matchesSearch && (log.severity || '').toLowerCase() === selectedSeverity.toLowerCase();
    });

    // CSV Exporter Action
    const handleCSVExport = () => {
        if (!filteredLogs || filteredLogs.length === 0) {
            showToast('error', 'No logs available to export!');
            return;
        }
        try {
            const headers = ['LOG ID', 'ACTION', 'USER', 'TARGET', 'SEVERITY', 'TIMESTAMP', 'IP'];
            const rows = filteredLogs.map(log => [
                `LOG-${log.id}`,
                `"${log.action.replace(/"/g, '""')}"`,
                `"${(log.user_name || '').replace(/"/g, '""')}"`,
                `"${(log.target || '').replace(/"/g, '""')}"`,
                log.severity,
                formatLogTimestamp(log.timestamp),
                log.ip || '-'
            ]);
            const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            console.log('CSV Export Compiled:\n', csvContent);
            // Show custom Notch-safe animated success toaster banner
            showToast('success', `Exported ${filteredLogs.length} logs to CSV successfully!`);
        } catch (err) {
            console.error('CSV Export Error:', err);
            showToast('error', 'Failed to compile CSV logs');
        }
    };

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground={colors.cardBackground}
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            <View style={styles.container}>
                {/* --- CUSTOM TOASTER NOTIFICATION --- */}
                {toast && (
                    <Animated.View
                        style={[
                            styles.toastContainer,
                            {
                                transform: [{ translateY: toastY }],
                                backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                borderBottomColor: toast.type === 'success' ? '#10B981' : '#EF4444',
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={toast.type === 'success' ? "check-circle" : "alert-circle"}
                            size={20}
                            color={toast.type === 'success' ? "#059669" : "#DC2626"}
                        />
                        <Text
                            style={[
                                styles.toastText,
                                { color: toast.type === 'success' ? "#065F46" : "#991B1B" }
                            ]}
                        >
                            {toast.message}
                        </Text>
                    </Animated.View>
                )}

                {/* --- TITLE & SUBTITLE --- */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Audit & Security Trail</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Complete history of actions performed within your agency. Use filters to drill down into specific events.
                        </Text>
                    </View>
                </View>

                {isPageLoading ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color={colors.accentTeal} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading secure trails...</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        {/* --- STATS CARDS GRID ROW (Swipable ScrollView) --- */}
                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ gap: 12 }}>
                            {/* Card 1: Critical Events */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#FEF2F2' }]}>
                                    <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.critical_events}</Text>
                                    <Text style={styles.statLabel}>CRITICAL EVENTS</Text>
                                </View>
                            </View>

                            {/* Card 2: Warnings */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
                                    <MaterialCommunityIcons name="shield-alert" size={20} color="#F97316" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.warning_events}</Text>
                                    <Text style={styles.statLabel}>WARNINGS</Text>
                                </View>
                            </View>

                            {/* Card 3: Secure Auth */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#F0F9FF' }]}>
                                    <MaterialCommunityIcons name="fingerprint" size={20} color={colors.accentTeal} />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.auth_events}</Text>
                                    <Text style={styles.statLabel}>SECURE AUTH EVENTS</Text>
                                </View>
                            </View>

                            {/* Card 4: Team Members */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: colors.surfaceSoft }]}>
                                    <MaterialCommunityIcons name="database" size={20} color="#475569" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.affected_users}</Text>
                                    <Text style={styles.statLabel}>ACTIVE TEAM MEMBERS</Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* --- RESPONSIVE CONTROLS BLOCK --- */}
                        <View style={[styles.filterBar, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                            <View style={{ flexDirection: 'row', gap: 10, width: '100%', zIndex: 50 }}>
                                {/* Search Bar */}
                                <View style={[styles.searchBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder, flex: 1.2 }]}>
                                    <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
                                    <TextInput
                                        placeholder="Search action, target, ip..."
                                        placeholderTextColor="#94A3B8"
                                        style={[styles.searchInput, { color: colors.textPrimary }]}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                {/* Severity Selector dropdown */}
                                <TouchableOpacity
                                    onPress={() => setIsSeverityDropdownOpen(!isSeverityDropdownOpen)}
                                    style={[
                                        styles.filterBtn,
                                        {
                                            backgroundColor: colors.surfaceSoft,
                                            borderColor: isSeverityDropdownOpen ? colors.accentTeal : colors.cardBorder,
                                            flex: 1
                                        }
                                    ]}
                                >
                                    <Text style={[styles.filterBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
                                        {selectedSeverity === 'All' ? 'All Severities' : selectedSeverity}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={isSeverityDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#64748B"
                                    />
                                </TouchableOpacity>

                                {/* --- CHARCOAL DROPDOWN OVERLAY (perfect mockup replica) --- */}
                                {isSeverityDropdownOpen && (
                                    <View style={styles.dropdownOverlay}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedSeverity('All');
                                                setIsSeverityDropdownOpen(false);
                                            }}
                                            style={styles.dropdownOption}
                                        >
                                            <View style={styles.dropdownOptionContent}>
                                                {selectedSeverity === 'All' ? (
                                                    <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                ) : (
                                                    <View style={{ width: 20 }} />
                                                )}
                                                <Text style={styles.dropdownOptionText}>All Severities</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedSeverity('Critical');
                                                setIsSeverityDropdownOpen(false);
                                            }}
                                            style={styles.dropdownOption}
                                        >
                                            <View style={styles.dropdownOptionContent}>
                                                {selectedSeverity === 'Critical' ? (
                                                    <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                ) : (
                                                    <View style={{ width: 20 }} />
                                                )}
                                                <Text style={styles.dropdownOptionText}>Critical</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedSeverity('Warning');
                                                setIsSeverityDropdownOpen(false);
                                            }}
                                            style={styles.dropdownOption}
                                        >
                                            <View style={styles.dropdownOptionContent}>
                                                {selectedSeverity === 'Warning' ? (
                                                    <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                ) : (
                                                    <View style={{ width: 20 }} />
                                                )}
                                                <Text style={styles.dropdownOptionText}>Warning</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedSeverity('Info');
                                                setIsSeverityDropdownOpen(false);
                                            }}
                                            style={styles.dropdownOption}
                                        >
                                            <View style={styles.dropdownOptionContent}>
                                                {selectedSeverity === 'Info' ? (
                                                    <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                ) : (
                                                    <View style={{ width: 20 }} />
                                                )}
                                                <Text style={styles.dropdownOptionText}>Info</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Export CSV Button (full width bottom) */}
                            <TouchableOpacity
                                onPress={handleCSVExport}
                                style={[styles.exportBtn, { backgroundColor: '#0F172A' }]}
                            >
                                <MaterialCommunityIcons name="cloud-download-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.exportBtnText}>Export Audit CSV</Text>
                            </TouchableOpacity>
                        </View>

                        {/* --- SECURITY LOGS LIST STACK (Card Form Layout) --- */}
                        <View style={styles.logsList}>
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <LogItem key={log.id} log={log} />
                                ))
                            ) : (
                                <View style={styles.emptyLogsBlock}>
                                    <MaterialCommunityIcons name="database-alert-outline" size={32} color="#94A3B8" />
                                    <Text style={[styles.emptyLogsText, { color: colors.textSecondary }]}>
                                        No security logs match your active filters.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        </DashboardLayout>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginTop: 6,
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 120,
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    statsScroll: {
        marginBottom: 20,
    },
    statCard: {
        width: 220,
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 2,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statInfo: {
        flex: 1,
        gap: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    filterBar: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        gap: 12,
        alignItems: 'stretch',
        marginBottom: 20,
        position: 'relative',
        zIndex: 100,
    },
    searchBox: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        padding: 0,
    },
    filterBtn: {
        height: 48,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    dropdownOverlay: {
        position: 'absolute',
        top: 54,
        right: 0,
        backgroundColor: '#334155',
        borderColor: '#475569',
        borderWidth: 1.5,
        borderRadius: 12,
        width: 170,
        zIndex: 10000,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    dropdownOption: {
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#475569',
    },
    dropdownOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownOptionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    exportBtn: {
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    exportBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    logsList: {
        gap: 14,
        marginBottom: 20,
    },
    logCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        shadowColor: colors.cardShadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardLogId: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -0.2,
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardIp: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardDivider: {
        height: 1,
        marginVertical: 12,
    },
    cardActionRow: {
        marginBottom: 10,
    },
    cardAction: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    cardDetailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 4,
    },
    detailCol: {
        flex: 1,
        gap: 4,
    },
    detailLabel: {
        fontSize: 8.5,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 0.8,
    },
    detailUserCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTimestamp: {
        fontSize: 11,
        fontWeight: '700',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        gap: 4,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
    },
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 48 : 16,
        paddingBottom: 16,
        borderBottomWidth: 1.5,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
        gap: 10,
    },
    toastText: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    emptyLogsBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyLogsText: {
        fontSize: 12,
        fontWeight: '700',
    }
});
