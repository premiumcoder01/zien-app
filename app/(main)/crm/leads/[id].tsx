import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    convertCRMLead,
    deleteCRMLead,
    getCRMLeadDetail,
    getCRMLeads,
    getCRMMeta,
    updateCRMLead,
    CRMLead,
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LeadDetailScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(colors, isDark);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();

    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    // Edit form state
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editSource, setEditSource] = useState('');

    // Fetch single lead detail
    const {
        data: fetchedLead,
        isLoading,
        isRefetching,
        refetch,
        error,
    } = useQuery({
        queryKey: ['crm-lead', id],
        queryFn: async () => {
            try {
                return await getCRMLeadDetail(accessToken!, id!);
            } catch (e) {
                // Fallback to checking leads list
                const allLeads = await getCRMLeads(accessToken!);
                const found = allLeads.find((l) => String(l.id) === String(id));
                if (found) return found;
                throw e;
            }
        },
        enabled: !!accessToken && !!id,
    });

    // Also check cached leads if query pending
    const cachedLeads = queryClient.getQueryData<CRMLead[]>(['crm-leads']);
    const lead: CRMLead | undefined =
        fetchedLead || cachedLeads?.find((l) => String(l.id) === String(id));

    // Fetch CRM Meta
    const { data: metaData } = useQuery({
        queryKey: ['crm-meta'],
        queryFn: () => getCRMMeta(accessToken!),
        enabled: !!accessToken,
    });

    // Group & Tag name resolution
    const groupName = useMemo(() => {
        if (!lead) return '—';
        if (lead.group?.name) return lead.group.name;
        if ((lead as any).group_name) return (lead as any).group_name;
        if (lead.group_id && metaData?.groups) {
            const found = metaData.groups.find((g: any) => g.id === lead.group_id);
            if (found?.name) return found.name;
        }
        return 'Digital Cards';
    }, [lead, metaData]);

    const tagObj = useMemo(() => {
        if (!lead) return { name: 'Hot Lead', color: '#FF6B00' };
        if (lead.tag) return { name: lead.tag.name, color: lead.tag.tag_color || '#FF6B00' };
        if ((lead as any).tag_name) return { name: (lead as any).tag_name, color: (lead as any).tag_color || '#FF6B00' };
        if (lead.tag_id && metaData?.tags) {
            const found = metaData.tags.find((t: any) => t.id === lead.tag_id);
            if (found) return { name: found.name, color: found.tag_color || '#FF6B00' };
        }
        return { name: 'Hot Lead', color: '#FF6B00' };
    }, [lead, metaData]);

    // Convert Lead Mutation
    const convertMutation = useMutation({
        mutationFn: () => convertCRMLead(accessToken!, id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-lead', id] });
            queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
            Alert.alert('Success', 'Lead successfully converted to Contact!');
        },
        onError: (err: any) => {
            Alert.alert('Conversion Failed', err.message || 'Unable to convert lead.');
        },
    });

    // Toggle Archive Mutation
    const archiveMutation = useMutation({
        mutationFn: (newStatus: number) => updateCRMLead(accessToken!, id!, { status: newStatus }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-lead', id] });
            Alert.alert('Updated', 'Lead status updated.');
        },
        onError: (err: any) => {
            Alert.alert('Update Failed', err.message || 'Unable to update status.');
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: () => deleteCRMLead(accessToken!, id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            Alert.alert('Deleted', 'Lead has been removed.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (err: any) => {
            Alert.alert('Delete Failed', err.message || 'Unable to delete lead.');
        },
    });

    // Save Edit Mutation
    const updateMutation = useMutation({
        mutationFn: (payload: any) => updateCRMLead(accessToken!, id!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
            queryClient.invalidateQueries({ queryKey: ['crm-lead', id] });
            setIsEditModalVisible(false);
            Alert.alert('Success', 'Lead details updated.');
        },
        onError: (err: any) => {
            Alert.alert('Update Failed', err.message || 'Unable to update lead.');
        },
    });

    const openEditModal = () => {
        if (lead) {
            setEditFirstName(lead.first_name || '');
            setEditLastName(lead.last_name || '');
            setEditEmail(lead.email || '');
            setEditPhone(lead.phone || '');
            setEditSource(lead.source || '');
            setIsEditModalVisible(true);
        }
    };

    const handleSaveEdit = () => {
        updateMutation.mutate({
            first_name: editFirstName,
            last_name: editLastName,
            email: editEmail,
            phone: editPhone,
            source: editSource,
        });
    };

    if (isLoading && !lead) {
        return (
            <View style={[styles.centerScreen, { backgroundColor: colors.cardBackground }]}>
                <ActivityIndicator size="large" color={colors.accentTeal || '#0a2341'} />
                <Text style={styles.loadingText}>Loading lead details...</Text>
            </View>
        );
    }

    if (error && !lead) {
        return (
            <View style={[styles.centerScreen, { backgroundColor: colors.cardBackground, padding: 30 }]}>
                <MaterialCommunityIcons name="account-search-outline" size={60} color={colors.textMuted} />
                <Text style={styles.errorTitle}>Lead Not Found</Text>
                <Text style={styles.errorSub}>The requested lead profile could not be loaded.</Text>
                <Pressable onPress={() => router.back()} style={styles.backBtnLarge}>
                    <Text style={styles.backBtnLargeText}>Back to Leads</Text>
                </Pressable>
            </View>
        );
    }

    const leadItem = lead!;
    const fullName = `${leadItem.first_name || ''} ${leadItem.last_name || ''}`.trim() || 'Untitled Lead';
    const score = leadItem.score ?? 85;
    const isHot = score >= 80;
    const isConverted = leadItem.lead_date_label === 'Converted';
    const isActive = leadItem.status === 1;

    const badgeLabel = isConverted ? 'CONVERTED' : isActive ? 'ACTIVE' : 'INACTIVE';
    const badgeBg = isConverted ? '#E0E7FF' : isActive ? '#DCFCE7' : '#FEE2E2';
    const badgeTextColor = isConverted ? '#2563EB' : isActive ? '#16A34A' : '#DC2626';

    const utmSource = (leadItem as any).utm_source || (leadItem as any).utmSource;
    const utmMedium = (leadItem as any).utm_medium || (leadItem as any).utmMedium;
    const utmCampaign = (leadItem as any).utm_campaign || (leadItem as any).utmCampaign;
    const utmTerm = (leadItem as any).utm_term || (leadItem as any).utmTerm;
    const utmContent = (leadItem as any).utm_content || (leadItem as any).utmContent;

    const timelineEvents = (leadItem as any).intent_timeline || [
        {
            title: 'Lead captured via ' + (leadItem.source || 'Digital Cards'),
            subtitle: 'Initial Capture',
            time: 'Captured ' + (leadItem.lead_date_label || 'Today'),
            icon: 'web',
            iconBg: '#E0F2FE',
            iconColor: '#0284C7',
        },
        {
            title: 'AI qualification inquiry initiated automatically',
            subtitle: 'Automated Response',
            time: '1 hour later',
            icon: 'robot-outline',
            iconBg: '#F3E8FF',
            iconColor: '#9333EA',
        },
        {
            title: 'High engagement detected: Lead opened campaign details',
            subtitle: 'Behavior Signal',
            time: '1 day later',
            icon: 'email-open-outline',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
        },
        {
            title: '🔥 High Intent: Registered for Open House or completed chatbot profiling',
            subtitle: 'High Intent Signal',
            time: 'Just now',
            icon: 'fire',
            iconBg: '#FFEDD5',
            iconColor: '#EA580C',
        },
    ];

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        Clipboard.setString(text);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    };

    const handleCall = () => {
        if (leadItem.phone) {
            Linking.openURL(`tel:${leadItem.country_code || ''}${leadItem.phone}`);
        }
    };

    const handleEmail = () => {
        if (leadItem.email) {
            Linking.openURL(`mailto:${leadItem.email}`);
        }
    };

    const handleWhatsApp = () => {
        if (leadItem.phone) {
            const cleanPhone = `${leadItem.country_code || ''}${leadItem.phone}`.replace(/[^0-9]/g, '');
            Linking.openURL(`https://wa.me/${cleanPhone}`);
        }
    };

    return (
        <View style={[styles.screen, { backgroundColor: colors.cardBackground }]}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.cardBackground }}>
                <View style={styles.headerRow}>
                    <Pressable style={styles.backBtnHeader} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                        <Text style={styles.backText}>Back to Leads</Text>
                    </Pressable>
                </View>

                <View style={styles.leadTitleBlock}>
                    <View style={styles.leadNameRow}>
                        <Text style={styles.leadFullName}>{fullName}</Text>
                        <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.badgePillText, { color: badgeTextColor }]}>{badgeLabel}</Text>
                        </View>
                    </View>
                    <Text style={styles.leadTagline}>Captured {leadItem.lead_date_label || 'Today'}</Text>
                </View>
            </SafeAreaView>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Section 1: Lead Profiling */}
                <View style={styles.cardSection}>
                    <View style={styles.sectionHeaderRow}>
                        <MaterialCommunityIcons name="account-details-outline" size={20} color={colors.accentTeal || '#0a2341'} />
                        <Text style={styles.sectionTitle}>Lead Profiling</Text>
                    </View>

                    <View style={styles.profileGrid}>
                        <View style={styles.profileItem}>
                            <Text style={styles.profileLabel}>EMAIL</Text>
                            <Pressable
                                style={styles.profileValueRow}
                                onPress={() => copyToClipboard(leadItem.email, 'Email')}
                            >
                                <Text style={styles.profileValue} numberOfLines={1}>
                                    {leadItem.email || 'No email provided'}
                                </Text>
                                {leadItem.email ? (
                                    <MaterialCommunityIcons name="content-copy" size={14} color={colors.textMuted} />
                                ) : null}
                            </Pressable>
                        </View>

                        <View style={styles.profileItem}>
                            <Text style={styles.profileLabel}>PHONE</Text>
                            <Pressable
                                style={styles.profileValueRow}
                                onPress={() => copyToClipboard(leadItem.phone, 'Phone')}
                            >
                                <Text style={styles.profileValue}>
                                    {leadItem.phone ? `${leadItem.country_code || ''} ${leadItem.phone}` : 'No phone provided'}
                                </Text>
                                {leadItem.phone ? (
                                    <MaterialCommunityIcons name="content-copy" size={14} color={colors.textMuted} />
                                ) : null}
                            </Pressable>
                        </View>

                        <View style={styles.profileItemHalf}>
                            <Text style={styles.profileLabel}>SOURCE</Text>
                            <Text style={styles.profileValueBold}>{leadItem.source || '—'}</Text>
                        </View>

                        {!!utmSource && (
                            <View style={styles.profileItemHalf}>
                                <Text style={styles.profileLabel}>UTM SOURCE</Text>
                                <Text style={styles.profileValueBold}>{utmSource}</Text>
                            </View>
                        )}

                        {!!utmMedium && (
                            <View style={styles.profileItemHalf}>
                                <Text style={styles.profileLabel}>UTM MEDIUM</Text>
                                <Text style={styles.profileValueBold}>{utmMedium}</Text>
                            </View>
                        )}

                        {!!utmCampaign && (
                            <View style={styles.profileItemHalf}>
                                <Text style={styles.profileLabel}>UTM CAMPAIGN</Text>
                                <Text style={styles.profileValueBold}>{utmCampaign}</Text>
                            </View>
                        )}

                        {!!utmTerm && (
                            <View style={styles.profileItemHalf}>
                                <Text style={styles.profileLabel}>UTM TERM</Text>
                                <Text style={styles.profileValueBold}>{utmTerm}</Text>
                            </View>
                        )}

                        {!!utmContent && (
                            <View style={styles.profileItemHalf}>
                                <Text style={styles.profileLabel}>UTM CONTENT</Text>
                                <Text style={styles.profileValueBold}>{utmContent}</Text>
                            </View>
                        )}

                        <View style={styles.profileItemHalf}>
                            <Text style={styles.profileLabel}>GROUP</Text>
                            <Text style={styles.profileValueBold}>{groupName}</Text>
                        </View>

                        <View style={styles.profileItem}>
                            <Text style={styles.profileLabel}>TAG</Text>
                            <View style={[styles.tagBadgePill, { backgroundColor: `${tagObj.color}15`, borderColor: `${tagObj.color}40` }]}>
                                <View style={[styles.tagDot, { backgroundColor: tagObj.color }]} />
                                <Text style={[styles.tagBadgeText, { color: tagObj.color }]}>{tagObj.name}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Section 2: Zien Prediction */}
                <View style={styles.predictionCard}>
                    <LinearGradient
                        colors={isDark ? ['#0F172A', '#1E293B'] : ['#0A2341', '#1E3A8A']}
                        style={styles.predictionGradient}
                    >
                        <View style={styles.predictionTopRow}>
                            <Text style={styles.predictionTitle}>Zien Prediction</Text>
                            <View style={styles.predictionScoreCircle}>
                                <Text style={styles.predictionScoreBig}>{score}</Text>
                                <Text style={styles.predictionScoreDenom}>/100</Text>
                            </View>
                        </View>

                        <View style={styles.intentPill}>
                            <MaterialCommunityIcons name="fire" size={14} color="#FFFFFF" />
                            <Text style={styles.intentPillText}>
                                {isHot ? 'HOT HIGH INTENT LEAD' : score >= 50 ? 'WARM ENGAGED LEAD' : 'COLD LEAD'}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Section 3: Lead Intent Timeline */}
                <View style={styles.cardSection}>
                    <View style={styles.sectionHeaderRow}>
                        <MaterialCommunityIcons name="timeline-text-outline" size={20} color={colors.accentTeal || '#0a2341'} />
                        <Text style={styles.sectionTitle}>Lead Intent Timeline</Text>
                    </View>

                    <View style={styles.timelineContainer}>
                        {timelineEvents.map((item: any, idx: number) => {
                            const isLast = idx === timelineEvents.length - 1;
                            const itemKey = String(item.id || `timeline-item-${idx}-${item.title || ''}`);
                            return (
                                <View key={itemKey} style={styles.timelineRow}>
                                    <View style={styles.timelineLeftCol}>
                                        <View style={[styles.timelineIconCircle, { backgroundColor: item.iconBg || '#E0F2FE' }]}>
                                            <MaterialCommunityIcons name={item.icon || 'star-outline'} size={16} color={item.iconColor || '#0284C7'} />
                                        </View>
                                        {!isLast && <View style={styles.timelineLine} />}
                                    </View>

                                    <View style={styles.timelineRightCol}>
                                        <Text style={styles.timelineEventTitle}>{item.title}</Text>
                                        <View style={styles.timelineMetaRow}>
                                            <Text style={styles.timelineSubtitle}>{item.subtitle}</Text>
                                            <Text style={styles.timelineDotSep}>•</Text>
                                            <Text style={styles.timelineTime}>{item.time}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Edit Lead Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Lead</Text>
                            <Pressable onPress={() => setIsEditModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                value={editFirstName}
                                onChangeText={setEditFirstName}
                                placeholder="First Name"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                value={editLastName}
                                onChangeText={setEditLastName}
                                placeholder="Last Name"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                value={editEmail}
                                onChangeText={setEditEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="Email"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Phone</Text>
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                value={editPhone}
                                onChangeText={setEditPhone}
                                keyboardType="phone-pad"
                                placeholder="Phone"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.inputLabel}>Source</Text>
                            <TextInput
                                style={[styles.input, { color: colors.textPrimary, borderColor: colors.cardBorder }]}
                                value={editSource}
                                onChangeText={setEditSource}
                                placeholder="Source"
                                placeholderTextColor={colors.textMuted}
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable
                                style={styles.cancelModalBtn}
                                onPress={() => setIsEditModalVisible(false)}
                            >
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={styles.saveModalBtn}
                                onPress={handleSaveEdit}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveModalBtnText}>Save Changes</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={isDeleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDeleteModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsDeleteModalVisible(false)}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
                        <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign: 'center' }]}>Delete Lead?</Text>
                        <Text style={[styles.modalSub, { color: colors.textSecondary, textAlign: 'center', marginVertical: 8 }]}>
                            Are you sure you want to delete {fullName}? This action cannot be undone.
                        </Text>
                        <View style={styles.modalFooter}>
                            <Pressable
                                style={styles.cancelModalBtn}
                                onPress={() => setIsDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelModalBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveModalBtn, { backgroundColor: '#EF4444' }]}
                                onPress={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveModalBtnText}>Delete</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any, isDark: boolean) =>
    StyleSheet.create({
        screen: {
            flex: 1,
        },
        centerScreen: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loadingText: {
            marginTop: 12,
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        errorTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 16,
        },
        errorSub: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 6,
            textAlign: 'center',
        },
        backBtnLarge: {
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: colors.accentTeal || '#0a2341',
        },
        backBtnLargeText: {
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: 14,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
        },
        backBtnHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        backText: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        headerRightActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        headerIconBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.cardBackgroundSemi || colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        deleteHeaderBtn: {
            borderColor: '#FEE2E2',
            backgroundColor: '#FEF2F2',
        },
        leadTitleBlock: {
            paddingHorizontal: 16,
            paddingBottom: 16,
        },
        leadNameRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        leadFullName: {
            fontSize: 24,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        badgePill: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        badgePillText: {
            fontSize: 11,
            fontWeight: '700',
        },
        leadTagline: {
            fontSize: 13,
            color: colors.textMuted,
            marginTop: 2,
        },
        scrollContent: {
            padding: 16,
            gap: 16,
        },
        actionGrid: {
            flexDirection: 'row',
            gap: 10,
        },
        actionGridBtn: {
            flex: 1,
            backgroundColor: colors.cardBackground,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
        },
        actionGridBtnDisabled: {
            opacity: 0.4,
        },
        actionIconCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionGridText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        cardSection: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 14,
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
        },
        sectionHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        sectionTitle: {
            fontSize: 17,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        profileGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        profileItem: {
            width: '100%',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            padding: 12,
            borderRadius: 10,
        },
        profileItemHalf: {
            width: '48%',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            padding: 12,
            borderRadius: 10,
        },
        profileLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textMuted,
            letterSpacing: 0.5,

        },
        profileValueRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
        },
        profileValue: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.textPrimary,
            flex: 1,
        },
        profileValueBold: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textPrimary,
            marginTop: 4,
        },
        tagBadgePill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            marginTop: 4,
        },
        tagDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
        },
        tagBadgeText: {
            fontSize: 12,
            fontWeight: '700',
        },
        predictionCard: {
            borderRadius: 16,
            overflow: 'hidden',
        },
        predictionGradient: {
            padding: 20,
            borderRadius: 16,
            gap: 12,
        },
        predictionTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        predictionTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: '#FFFFFF',
        },
        predictionScoreCircle: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        predictionScoreBig: {
            fontSize: 36,
            fontWeight: '900',
            color: '#FF8E3C',
        },
        predictionScoreDenom: {
            fontSize: 16,
            fontWeight: '600',
            color: '#94A3B8',
            marginLeft: 2,
        },
        intentPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            backgroundColor: '#FF6B0025',
            borderWidth: 1,
            borderColor: '#FF6B0050',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
        },
        intentPillText: {
            fontSize: 12,
            fontWeight: '800',
            color: '#FF8E3C',
            letterSpacing: 0.5,
        },
        timelineContainer: {
            paddingLeft: 4,
        },
        timelineRow: {
            flexDirection: 'row',
            gap: 12,
        },
        timelineLeftCol: {
            alignItems: 'center',
            width: 24,
        },
        timelineIconCircle: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        timelineLine: {
            width: 2,
            flex: 1,
            backgroundColor: colors.cardBorder,
            marginVertical: 4,
        },
        timelineRightCol: {
            flex: 1,
            paddingBottom: 20,
        },
        timelineEventTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        timelineMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
        },
        timelineSubtitle: {
            fontSize: 12,
            color: colors.textMuted,
        },
        timelineDotSep: {
            fontSize: 12,
            color: colors.textMuted,
        },
        timelineTime: {
            fontSize: 12,
            fontWeight: '500',
            color: colors.textSecondary,
        },
        bottomButtonsRow: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
        },
        archiveBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
        },
        archiveBtnText: {
            fontSize: 14,
            fontWeight: '600',
        },
        deleteBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FEE2E2',
            alignItems: 'center',
        },
        deleteBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#EF4444',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalCard: {
            width: '100%',
            borderRadius: 20,
            padding: 20,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '700',
        },
        modalSub: {
            fontSize: 14,
        },
        inputLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 4,
            marginTop: 10,
        },
        input: {
            height: 44,
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            fontSize: 14,
        },
        modalFooter: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 20,
        },
        cancelModalBtn: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: 'center',
        },
        cancelModalBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        saveModalBtn: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: colors.accentTeal || '#0a2341',
            alignItems: 'center',
        },
        saveModalBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: '#FFFFFF',
        },
    });
