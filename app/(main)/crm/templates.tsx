import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CRMTemplate, deleteCRMTemplate, duplicateCRMTemplate, getCRMTemplates, patchCRMTemplateStatus } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function CRM_TemplatesScreen() {
    const { colors, theme } = useAppTheme();
    const styles = getStyles(colors, theme);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();

    const { data: templateList, isLoading, refetch } = useQuery({
        queryKey: ['crmTemplates'],
        queryFn: () => getCRMTemplates(accessToken || ''),
        enabled: !!accessToken,
    });

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [webOnlyModalVisible, setWebOnlyModalVisible] = useState(false);

    const queryClient = useQueryClient();

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: number }) =>
            patchCRMTemplateStatus(accessToken || '', id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to update status. Please try again.');
            console.error(error);
        }
    });

    const toggleTemplateStatus = (id: string, newStatus: number) => {
        statusMutation.mutate({ id, status: newStatus });
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteCRMTemplate(accessToken || '', id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to delete template. Please try again.');
            console.error(error);
        }
    });

    const deleteTemplate = (id: string) => {
        setTemplateToDelete(id);
        setConfirmDeleteVisible(true);
    };

    const handleConfirmDelete = () => {
        if (templateToDelete) {
            deleteMutation.mutate(templateToDelete);
            setConfirmDeleteVisible(false);
            setTemplateToDelete(null);
        }
    };

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => duplicateCRMTemplate(accessToken || '', id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
            Alert.alert('Success', 'Template duplicated successfully.');
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to duplicate template. Please try again.');
            console.error(error);
        }
    });

    const handleDuplicateTemplate = (id: string) => {
        duplicateMutation.mutate(id);
    };

    const handleSelectTemplateType = () => {
        setCreateModalVisible(false);
        setTimeout(() => {
            setWebOnlyModalVisible(true);
        }, 300);
    };

    const getChannelConfig = (type: string) => {
        const upper = type.toUpperCase();
        if (upper === 'EMAIL') return {
            icon: 'email-open-outline' as const,
            color: '#60A5FA',
            gradientColors: ['rgba(59,130,246,0.18)', 'rgba(59,130,246,0.04)'],
            label: 'Email',
            accentBorder: 'rgba(96,165,250,0.35)',
        };
        if (upper === 'SMS') return {
            icon: 'message-text-outline' as const,
            color: '#34D399',
            gradientColors: ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.04)'],
            label: 'SMS',
            accentBorder: 'rgba(52,211,153,0.35)',
        };
        return {
            icon: 'whatsapp' as const,
            color: '#4ADE80',
            gradientColors: ['rgba(37,211,102,0.18)', 'rgba(37,211,102,0.04)'],
            label: 'WhatsApp',
            accentBorder: 'rgba(74,222,128,0.35)',
        };
    };

    const renderTemplateCard = (template: CRMTemplate) => {
        const channel = getChannelConfig(template.template_type);
        const isActive = template.status === 1;

        const firstTextBlock = template.content_json?.components?.find(
            (c: any) => c.type === 'Text Block'
        )?.content || 'No preview available';
        const previewText = template.subject || firstTextBlock;

        return (
            <View key={template.id} style={styles.card}>
                {/* Subtle top accent line */}
                <View style={[styles.cardAccentLine, { backgroundColor: channel.color }]} />

                {/* Card Header */}
                <View style={styles.cardHeader}>
                    {/* Channel badge + name */}
                    <View style={styles.channelBadge}>
                        <LinearGradient
                            colors={channel.gradientColors as any}
                            style={styles.channelIconGradient}
                        >
                            <MaterialCommunityIcons name={channel.icon} size={18} color={channel.color} />
                        </LinearGradient>
                        <View style={[styles.channelTypeTag, { borderColor: channel.accentBorder }]}>
                            <View style={[styles.channelDot, { backgroundColor: channel.color }]} />
                            <Text style={[styles.channelTypeText, { color: channel.color }]}>{channel.label}</Text>
                        </View>
                    </View>

                    {/* Action icons */}
                    <View style={styles.actionGroup}>
                        <Pressable
                            onPress={() => setWebOnlyModalVisible(true)}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                        >
                            <MaterialCommunityIcons name="eye-outline" size={14} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                            onPress={() => handleDuplicateTemplate(template.id)}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                            disabled={duplicateMutation.isPending}
                        >
                            {duplicateMutation.isPending && duplicateMutation.variables === template.id ? (
                                <ActivityIndicator size="small" color={colors.accentTeal} style={{ transform: [{ scale: 0.7 }] }} />
                            ) : (
                                <MaterialCommunityIcons name="content-copy" size={14} color={colors.textSecondary} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => deleteTemplate(template.id)}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && styles.actionBtnPressed]}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#F87171" />
                        </Pressable>
                    </View>
                </View>

                {/* Template Name */}
                <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Subject + Status row */}
                <View style={styles.metaRow}>
                    <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>SUBJECT</Text>
                        <Text style={styles.metaValue} numberOfLines={2}>{previewText}</Text>
                    </View>
                    <View style={styles.metaBlockStatus}>
                        <Text style={styles.metaLabel}>STATUS</Text>
                        <View style={[
                            styles.statusPill,
                            { borderColor: isActive ? 'rgba(52,211,153,0.4)' : 'rgba(148,163,184,0.2)' }
                        ]}>
                            <Switch
                                value={isActive}
                                onValueChange={(val) => toggleTemplateStatus(template.id, val ? 1 : 2)}
                                trackColor={{ false: 'rgba(148,163,184,0.25)', true: 'rgba(52,211,153,0.35)' }}
                                thumbColor={isActive ? '#34D399' : '#64748B'}
                                ios_backgroundColor="rgba(148,163,184,0.2)"
                                style={{ transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] }}
                            />
                            <Text style={[
                                styles.statusLabel,
                                { color: isActive ? '#34D399' : '#64748B' }
                            ]}>
                                {isActive ? 'LIVE' : 'PAUSED'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Edit Button */}
                <Pressable
                    style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
                    onPress={() => setWebOnlyModalVisible(true)}
                >
                    <Text style={styles.editBtnText}>Edit Template</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textSecondary} />
                </Pressable>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={colors.backgroundGradient as any}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <PageHeader
                title="Templates"
                subtitle="Set once, and let Zien nurture your leads based on time and behavior."
                onBack={() => router.back()}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentTeal} />
                }
            >
                {/* Stats ribbon */}
                {!isLoading && templateList && templateList.length > 0 && (
                    <View style={styles.statsRibbon}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{templateList.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#34D399' }]}>
                                {templateList.filter(t => t.status === 1).length}
                            </Text>
                            <Text style={styles.statLabel}>Active</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#60A5FA' }]}>
                                {templateList.filter(t => t.template_type.toUpperCase() === 'EMAIL').length}
                            </Text>
                            <Text style={styles.statLabel}>Email</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#4ADE80' }]}>
                                {templateList.filter(t => t.template_type.toUpperCase() === 'WHATSAPP').length}
                            </Text>
                            <Text style={styles.statLabel}>WhatsApp</Text>
                        </View>
                    </View>
                )}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accentTeal} />
                        <Text style={styles.loadingText}>Loading templates…</Text>
                    </View>
                ) : templateList && templateList.length > 0 ? (
                    templateList.map(renderTemplateCard)
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="file-document-outline" size={36} color={colors.accentTeal} />
                        </View>
                        <Text style={styles.emptyTitle}>No templates yet</Text>
                        <Text style={styles.emptySubtitle}>Tap the + button to create your first template</Text>
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 28 }, pressed && styles.fabPressed]}
                onPress={() => setCreateModalVisible(true)}
            >
                <LinearGradient
                    colors={['#1A4A60', '#0B2D3E']}
                    style={styles.fabGradient}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
                </LinearGradient>
            </Pressable>

            {/* ── DELETE CONFIRM MODAL ── */}
            <Modal visible={confirmDeleteVisible} transparent animationType="fade" onRequestClose={() => setConfirmDeleteVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.centeredModal}>
                        <View style={styles.dangerIconRing}>
                            <View style={styles.dangerIconInner}>
                                <MaterialCommunityIcons name="trash-can-outline" size={28} color="#F87171" />
                            </View>
                        </View>
                        <Text style={styles.modalTitle}>Delete Template?</Text>
                        <Text style={styles.modalBody}>
                            This template will be permanently removed and cannot be recovered.
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <Pressable style={styles.ghostBtn} onPress={() => setConfirmDeleteVisible(false)}>
                                <Text style={styles.ghostBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.dangerBtn} onPress={handleConfirmDelete}>
                                <Text style={styles.dangerBtnText}>Delete</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── CREATE MODAL ── */}
            <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.sheetModal}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>New Template</Text>
                                <Text style={styles.sheetSub}>Choose a channel to get started</Text>
                            </View>
                            <Pressable style={styles.closeCircle} onPress={() => setCreateModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.channelGrid}>
                            {[
                                { icon: 'email-outline', label: 'Email', sub: 'Rich HTML campaigns', color: '#60A5FA', bg: 'rgba(59,130,246,0.1)' },
                                { icon: 'cellphone', label: 'SMS', sub: 'Short text updates', color: '#34D399', bg: 'rgba(16,185,129,0.1)' },
                                { icon: 'whatsapp', label: 'WhatsApp', sub: 'Direct engagement', color: '#4ADE80', bg: 'rgba(37,211,102,0.1)' },
                            ].map((ch) => (
                                <Pressable
                                    key={ch.label}
                                    style={({ pressed }) => [styles.channelCard, pressed && styles.channelCardPressed]}
                                    onPress={handleSelectTemplateType}
                                >
                                    <View style={[styles.channelCardIcon, { backgroundColor: ch.bg }]}>
                                        <MaterialCommunityIcons name={ch.icon as any} size={26} color={ch.color} />
                                    </View>
                                    <Text style={[styles.channelCardTitle, { color: ch.color }]}>{ch.label}</Text>
                                    <Text style={styles.channelCardSub}>{ch.sub}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── WEB ONLY MODAL ── */}
            <Modal visible={webOnlyModalVisible} transparent animationType="fade" onRequestClose={() => setWebOnlyModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.centeredModal}>
                        <View style={styles.webIconRing}>
                            <MaterialCommunityIcons name="monitor-shimmer" size={28} color={colors.accentTeal} />
                        </View>
                        <Text style={styles.modalTitle}>Web Experience</Text>
                        <Text style={styles.modalBody}>
                            Advanced template editing is available on our web platform for the full design experience.
                        </Text>
                        <Pressable style={styles.tealBtn} onPress={() => setWebOnlyModalVisible(false)}>
                            <Text style={styles.tealBtnText}>Got It</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

function getStyles(colors: any, theme?: string) {
    const isDark = theme === 'dark';
    const glassBase = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)';
    const glassBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    // iOS uses gorgeous translucent glassmorphism; Android uses solid card backgrounds
    const cardBg = Platform.OS === 'ios' ? glassBase : colors.cardBackground;
    const borderCol = Platform.OS === 'ios' ? glassBorder : colors.cardBorder;

    return StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1 },
        scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

        // Stats ribbon
        statsRibbon: {
            flexDirection: 'row',
            backgroundColor: cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: borderCol,
            paddingVertical: 16,
            paddingHorizontal: 8,
            marginBottom: 24,
            alignItems: 'center',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 16,
                },
                android: {
                    elevation: 2,
                },
            }),
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
        },
        statNumber: {
            fontSize: 22,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        statLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
            marginTop: 2,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        statDivider: {
            width: 1,
            height: 32,
            backgroundColor: borderCol,
        },

        // Card
        card: {
            backgroundColor: cardBg,
            borderRadius: 28,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderCol,
            overflow: 'hidden',
            // Premium shadow styling
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 20,
                },
                android: {
                    elevation: 4,
                },
            }),
        },
        cardAccentLine: {
            height: 2.5,
            width: '30%',
            borderRadius: 2,
            marginHorizontal: 20,
            marginTop: 16,
            opacity: 0.7,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 4,
        },
        channelBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        channelIconGradient: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        channelTypeTag: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        channelDot: {
            width: 5,
            height: 5,
            borderRadius: 3,
        },
        channelTypeText: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
        },
        actionGroup: {
            flexDirection: 'row',
            gap: 6,
        },
        actionBtn: {
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionBtnDanger: {
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
        },
        actionBtnPressed: {
            opacity: 0.6,
            transform: [{ scale: 0.94 }],
        },
        templateName: {
            fontSize: 17,
            fontWeight: '800',
            color: colors.textPrimary,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 4,
            letterSpacing: -0.3,
        },
        cardDivider: {
            height: 1,
            backgroundColor: borderCol,
            marginHorizontal: 16,
            marginVertical: 12,
        },

        // Meta grid
        metaRow: {
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 16,
            marginBottom: 12,
        },
        metaBlock: {
            flex: 1.4,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 12,
        },
        metaBlockStatus: {
            flex: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 12,
        },
        metaLabel: {
            fontSize: 8,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 1.2,
            marginBottom: 6,
        },
        metaValue: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
            lineHeight: 16,
        },
        statusPill: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 12,
            paddingRight: 6,
        },
        statusLabel: {
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 0.8,
        },

        // Edit button
        editBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginHorizontal: 16,
            marginBottom: 14,
            paddingVertical: 11,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        },
        editBtnPressed: { opacity: 0.7 },
        editBtnText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 0.2,
        },

        // Loading & empty
        loadingContainer: {
            padding: 60,
            alignItems: 'center',
            gap: 16,
        },
        loadingText: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        emptyContainer: {
            padding: 60,
            alignItems: 'center',
            gap: 12,
        },
        emptyIconWrap: {
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        emptySubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '500',
            textAlign: 'center',
        },

        // FAB
        fab: {
            position: 'absolute',
            right: 24,
            width: 50,
            height: 50,
            borderRadius: 15,
            overflow: 'hidden',
            shadowColor: '#0B2D3E',
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.5,
            shadowRadius: 22,
            elevation: 14,
            zIndex: 1000,
        },
        fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
        fabGradient: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },

        // Modal base
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(5, 10, 20, 0.72)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
        },
        centeredModal: {
            width: '100%',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderRadius: 32,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 24,
        },

        // Delete modal
        dangerIconRing: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(239,68,68,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        dangerIconInner: {
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: 'rgba(239,68,68,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalTitle: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 10,
            letterSpacing: -0.5,
        },
        modalBody: {
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 28,
            fontWeight: '500',
        },
        modalBtnRow: {
            flexDirection: 'row',
            gap: 10,
            width: '100%',
        },
        ghostBtn: {
            flex: 1,
            height: 52,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        ghostBtnText: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        dangerBtn: {
            flex: 1,
            height: 52,
            borderRadius: 16,
            backgroundColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
        },
        dangerBtnText: {
            fontSize: 15,
            fontWeight: '800',
            color: '#FFFFFF',
        },

        // Web modal
        webIconRing: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: 'rgba(11,160,178,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(11,160,178,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        tealBtn: {
            width: '100%',
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.accentTeal,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accentTeal,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 8,
        },
        tealBtnText: {
            fontSize: 15,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 1.2,
        },

        // Create / sheet modal
        sheetModal: {
            width: '100%',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderRadius: 32,
            padding: 28,
            borderWidth: 1,
            borderColor: borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 24,
        },
        sheetHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: borderCol,
            alignSelf: 'center',
            marginBottom: 20,
        },
        sheetHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
        },
        sheetTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 3,
        },
        sheetSub: {
            fontSize: 13,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        closeCircle: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
        },
        channelGrid: {
            gap: 10,
        },
        channelCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        },
        channelCardPressed: {
            opacity: 0.7,
            transform: [{ scale: 0.98 }],
        },
        channelCardIcon: {
            width: 48,
            height: 48,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        channelCardTitle: {
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 2,
        },
        channelCardSub: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: '500',
        },
    });
}