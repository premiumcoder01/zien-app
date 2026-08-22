import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getTeamLogs, TeamLogEntry, TeamLogsResponse } from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    const [selectedMember, setSelectedMember] = useState<string>('All');
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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

    // Always use company_id=1 — same as web (staging.zien.ai/api/teams/logs?company_id=1)
    const COMPANY_ID = 1;

    // Fetch Logs with fixed company_id=1
    const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useQuery<TeamLogsResponse>({
        queryKey: ['teamLogs', COMPANY_ID],
        queryFn: async () => {
            const result = await getTeamLogs(accessToken!, COMPANY_ID);
            console.log('=== [RAW API RESPONSE] ===');
            console.log(JSON.stringify(result, null, 2));
            return result;
        },
        enabled: !!accessToken,
        staleTime: 0,
        gcTime: 0,
    });

    const isPageLoading = loadingLogs;

    // API returns: { summary: {...}, logs: [...] }
    // Direct extraction — no complex nesting needed
    const anyLogsData = logsData as any;
    const summaryData: any =
        anyLogsData?.summary ??
        anyLogsData?.data?.summary ??
        null;

    const rawLogs: TeamLogEntry[] =
        Array.isArray(anyLogsData?.logs) ? anyLogsData.logs :
        Array.isArray(anyLogsData?.data?.logs) ? anyLogsData.data.logs :
        Array.isArray(anyLogsData?.data) ? anyLogsData.data :
        [];

    // Summary values — ONLY from API summary object, NO fallback calculations
    const summary = {
        total_events:    summaryData ? Number(summaryData.total_events ?? 0)    : 0,
        critical_events: summaryData ? Number(summaryData.critical_events ?? 0) : 0,
        warning_events:  summaryData ? Number(summaryData.warning_events ?? 0)  : 0,
        info_events:     summaryData ? Number(summaryData.info_events ?? 0)     : 0,
        auth_events:     summaryData ? Number(summaryData.auth_events ?? 0)     : 0,
        affected_users:  summaryData ? Number(summaryData.affected_users ?? 0)  : 0,
    };

    console.log('=== [ACTIVITY LOGS DEBUG] ===');
    console.log('summaryData from API:', JSON.stringify(summaryData));
    console.log('parsed summary:', JSON.stringify(summary));
    console.log('rawLogs count:', rawLogs.length);

    // Unique team members list from logs for filter dropdown
    const teamMembers: string[] = Array.from(
        new Set(rawLogs.map(l => l.user_name).filter(Boolean))
    ) as string[];

    const filteredLogs = rawLogs.filter(log => {
        const matchesSearch =
            (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.target || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.ip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            `LOG-${log.id}`.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSeverity = selectedSeverity === 'All' || (log.severity || '').toLowerCase() === selectedSeverity.toLowerCase();
        const matchesMember = selectedMember === 'All' || (log.user_name || '') === selectedMember;

        return matchesSearch && matchesSeverity && matchesMember;
    });

    // CSV Exporter Action with real FileSystem download & native Sharing
    const handleCSVExport = async () => {
        if (!filteredLogs || filteredLogs.length === 0) {
            showToast('error', 'No logs available to export!');
            return;
        }
        setIsExporting(true);
        try {
            const headers = ['LOG ID', 'ACTION', 'USER', 'TARGET', 'SEVERITY', 'TIMESTAMP', 'IP'];
            const rows = filteredLogs.map(log => [
                `LOG-${log.id}`,
                `"${(log.action || '').replace(/"/g, '""')}"`,
                `"${(log.user_name || '').replace(/"/g, '""')}"`,
                `"${(log.target || '').replace(/"/g, '""')}"`,
                `"${(log.severity || '').replace(/"/g, '""')}"`,
                `"${formatLogTimestamp(log.timestamp).replace(/"/g, '""')}"`,
                `"${(log.ip || '-').replace(/"/g, '""')}"`
            ]);
            const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `Audit_Logs_${dateStr}_${Date.now()}.csv`;
            const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
            const docUri = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(cacheUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

            if (Platform.OS === 'android') {
                try {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
                            permissions.directoryUri,
                            fileName,
                            'text/csv'
                        );
                        await FileSystem.writeAsStringAsync(safUri, csvContent, {
                            encoding: FileSystem.EncodingType.UTF8,
                        });
                        showToast('success', `"${fileName}" saved to your folder!`);
                        return;
                    }
                } catch (safError) {
                    console.warn('StorageAccessFramework fallback to share:', safError);
                }

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(cacheUri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Export Audit Logs',
                        UTI: 'public.comma-separated-values-text',
                    });
                    showToast('success', `Exported ${filteredLogs.length} logs successfully!`);
                } else {
                    Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
                }
            } else {
                await FileSystem.writeAsStringAsync(docUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(docUri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Export Audit Logs',
                        UTI: 'public.comma-separated-values-text',
                    });
                }
                showToast('success', `Exported ${filteredLogs.length} logs successfully!`);
            }
        } catch (err) {
            console.error('CSV Export Error:', err);
            showToast('error', 'Failed to export CSV logs');
        } finally {
            setIsExporting(false);
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
                        {/* --- STATS CARDS 2x2 GRID (matching web) --- */}
                        <View style={styles.statsGrid}>
                            {/* Card 1: Critical Events */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#F8FAFC' }]}>
                                    <MaterialCommunityIcons name="alert-outline" size={18} color="#0F172A" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.critical_events}</Text>
                                    <Text style={styles.statLabel}>CRITICAL EVENTS</Text>
                                </View>
                            </View>

                            {/* Card 2: Warnings */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#F8FAFC' }]}>
                                    <MaterialCommunityIcons name="shield-outline" size={18} color="#0F172A" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.warning_events}</Text>
                                    <Text style={styles.statLabel}>WARNINGS</Text>
                                </View>
                            </View>

                            {/* Card 3: Secure Auth Events */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#F8FAFC' }]}>
                                    <MaterialCommunityIcons name="fingerprint" size={18} color="#0F172A" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.auth_events}</Text>
                                    <Text style={styles.statLabel}>SECURE AUTH EVENTS</Text>
                                </View>
                            </View>

                            {/* Card 4: Active Team Members */}
                            <View style={[styles.statCard, { borderColor: colors.cardBorder }]}>
                                <View style={[styles.statIconBox, { backgroundColor: '#F8FAFC' }]}>
                                    <MaterialCommunityIcons name="database-outline" size={18} color="#0F172A" />
                                </View>
                                <View style={styles.statInfo}>
                                    <Text style={styles.statValue}>{summary.affected_users}</Text>
                                    <Text style={styles.statLabel}>ACTIVE TEAM MEMBERS</Text>
                                </View>
                            </View>
                        </View>

                        {/* --- RESPONSIVE CONTROLS BLOCK --- */}
                        <View style={[styles.filterBar, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                            {/* Row 1: Search Bar — full width */}
                            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder, width: '100%' }]}>
                                <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
                                <TextInput
                                    placeholder="Search action, target, ip..."
                                    placeholderTextColor="#94A3B8"
                                    style={[styles.searchInput, { color: colors.textPrimary }]}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            {/* Row 2: Dropdowns — half half, with overlays */}
                            <View style={{ flexDirection: 'row', gap: 10, width: '100%', zIndex: 50 }}>
                                {/* Severity Selector dropdown */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsSeverityDropdownOpen(!isSeverityDropdownOpen);
                                        setIsMemberDropdownOpen(false);
                                    }}
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

                                {/* All Team Members dropdown button */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsMemberDropdownOpen(!isMemberDropdownOpen);
                                        setIsSeverityDropdownOpen(false);
                                    }}
                                    style={[
                                        styles.filterBtn,
                                        {
                                            backgroundColor: colors.surfaceSoft,
                                            borderColor: isMemberDropdownOpen ? colors.accentTeal : colors.cardBorder,
                                            flex: 1
                                        }
                                    ]}
                                >
                                    <Text style={[styles.filterBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
                                        {selectedMember === 'All' ? 'All Members' : selectedMember}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={isMemberDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#64748B"
                                    />
                                </TouchableOpacity>


                                {/* --- SEVERITY DROPDOWN OVERLAY --- */}
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

                                {/* --- TEAM MEMBERS DROPDOWN OVERLAY --- */}
                                {isMemberDropdownOpen && (
                                    <View style={[styles.dropdownOverlay, { right: 0, left: 'auto' }]}>
                                        {/* All Team Members option */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedMember('All');
                                                setIsMemberDropdownOpen(false);
                                            }}
                                            style={styles.dropdownOption}
                                        >
                                            <View style={styles.dropdownOptionContent}>
                                                {selectedMember === 'All' ? (
                                                    <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                ) : (
                                                    <View style={{ width: 20 }} />
                                                )}
                                                <Text style={styles.dropdownOptionText}>All Team Members</Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Dynamic unique members from logs */}
                                        {teamMembers.map((member) => (
                                            <TouchableOpacity
                                                key={member}
                                                onPress={() => {
                                                    setSelectedMember(member);
                                                    setIsMemberDropdownOpen(false);
                                                }}
                                                style={styles.dropdownOption}
                                            >
                                                <View style={styles.dropdownOptionContent}>
                                                    {selectedMember === member ? (
                                                        <MaterialCommunityIcons name="check" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                                                    ) : (
                                                        <View style={{ width: 20 }} />
                                                    )}
                                                    <Text style={styles.dropdownOptionText}>{member}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Export CSV Button (full width bottom) */}
                            <TouchableOpacity
                                onPress={handleCSVExport}
                                disabled={isExporting}
                                style={[styles.exportBtn, { backgroundColor: '#0F172A', opacity: isExporting ? 0.7 : 1 }]}
                            >
                                {isExporting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <MaterialCommunityIcons name="cloud-download-outline" size={18} color="#FFFFFF" />
                                )}
                                <Text style={styles.exportBtnText}>
                                    {isExporting ? 'Exporting CSV...' : 'Export Audit CSV'}
                                </Text>
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 4,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
