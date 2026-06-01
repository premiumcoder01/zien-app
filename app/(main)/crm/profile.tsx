import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { appendCRMEvent, appendCRMNote, getCRMContactDetail } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const { colors, theme } = useAppTheme();
    const isDark = theme === 'dark';
    const styles = getStyles(colors, isDark);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();

    const { data: contact, isLoading, error } = useQuery({
        queryKey: ['crm-contact', id],
        queryFn: () => getCRMContactDetail(accessToken!, id!),
        enabled: !!accessToken && !!id,
    });

    const [newNote, setNewNote] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState<Date | null>(null);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const { mutate: addNoteMutation, isPending: isAddingNotePending } = useMutation({
        mutationFn: (content: string) => appendCRMNote(accessToken!, id!, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contact', id] });
            setIsAddingNote(false);
            setNewNote('');
        },
        onError: (err: any) => {
            Alert.alert('Sync Conflict', err.message);
        }
    });

    const { mutate: addEventMutation, isPending: isAddingEventPending } = useMutation({
        mutationFn: (data: { title: string, date: string }) => appendCRMEvent(accessToken!, id!, data.title, data.date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contact', id] });
            setIsAddingEvent(false);
            setNewEventTitle('');
            setNewEventDate(null);
        },
        onError: (err: any) => {
            Alert.alert('Sync Conflict', err.message);
        }
    });

    if (isLoading) {
        return (
            <LinearGradient
                colors={colors.backgroundGradient as any}
                style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={styles.loaderText}>Loading profile...</Text>
            </LinearGradient>
        );
    }

    if (error || !contact) {
        return (
            <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
                <MaterialCommunityIcons name="account-search-outline" size={64} color={colors.textMuted} />
                <Text style={styles.errorTitle}>Profile Not Found</Text>
                <Text style={styles.errorSub}>This lead profile could not be retrieved.</Text>
                <Pressable onPress={() => router.back()} style={styles.errorBtn}>
                    <Text style={styles.errorBtnText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const fullName = `${contact.first_name} ${contact.last_name}`;
    const groupName = contact.group?.name;
    const tagName = contact.tag?.name;
    const tagColor = contact.tag?.tag_color || colors.accentTeal;
    const isActive = contact.status === 1;
    const dateJoined = new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleEmail = () => Linking.openURL(`mailto:${contact.email}`);
    const handleCall = () => contact.phone && Linking.openURL(`tel:${contact.country_code}${contact.phone}`);
    const handleWhatsApp = () => contact.phone && Linking.openURL(`https://wa.me/${contact.country_code.replace('+', '')}${contact.phone}`);
    const handleSMS = () => contact.phone && Linking.openURL(`sms:${contact.country_code}${contact.phone}`);

    // Build intel items — only include ones with actual data
    const intelItems: { label: string; value: string; icon: string; color: string }[] = [];
    if (contact.budget !== null && contact.budget !== undefined) {
        const val = typeof contact.budget === 'number' ? `$${contact.budget.toLocaleString()}` : String(contact.budget);
        intelItems.push({ label: 'Budget', value: val, icon: 'currency-usd', color: '#10B981' });
    }
    if (contact.timeline) {
        intelItems.push({ label: 'Timeline', value: String(contact.timeline), icon: 'calendar-clock', color: colors.accentTeal });
    }
    if (contact.pre_approved !== null && contact.pre_approved !== undefined) {
        intelItems.push({
            label: 'Pre-Approved',
            value: contact.pre_approved ? 'Yes' : 'No',
            icon: contact.pre_approved ? 'check-decagram' : 'close-circle-outline',
            color: contact.pre_approved ? '#10B981' : '#EF4444',
        });
    }

    // Contact info rows — skip null values
    const infoRows: { label: string; value: string }[] = [
        { label: 'Email', value: contact.email },
        contact.phone ? { label: 'Phone', value: `${contact.country_code} ${contact.phone}` } : null,
        contact.source ? { label: 'Source', value: contact.source } : null,
        { label: 'Joined', value: dateJoined },
        { label: 'Last Update', value: new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    ].filter(Boolean) as { label: string; value: string }[];

    const heatIndex = contact.heat_index ?? null;
    const showHeatIndex = heatIndex !== null && heatIndex !== undefined;

    const handleSaveNote = () => {
        if (!newNote.trim()) return;
        addNoteMutation(newNote.trim());
    };


    const handleSaveEvent = () => {
        if (!newEventTitle.trim() || !newEventDate) return;
        const formatted = newEventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        addEventMutation({ title: newEventTitle.trim(), date: formatted });
    };

    const formattedEventDate = newEventDate
        ? newEventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <View style={styles.screen}>
            {/* Fixed Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <PageHeader title="" onBack={() => router.back()} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
                showsVerticalScrollIndicator={false}>

                {/* Hero section now scrolls with the content */}
                <View style={styles.hero}>
                    <View style={styles.avatarWrap}>
                        <LinearGradient colors={[tagColor, colors.accentTeal]} style={styles.avatar}>
                            <Text style={styles.avatarLetter}>{contact.first_name.charAt(0).toUpperCase()}</Text>
                        </LinearGradient>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#64748B' }]} />
                    </View>

                    <View style={styles.heroInfo}>
                        <Text style={styles.heroName}>{fullName}</Text>
                        <Text style={styles.heroEmail}>{contact.email}</Text>

                        <View style={styles.heroBadgeRow}>
                            {groupName ? (
                                <View style={styles.heroBadge}>
                                    <MaterialCommunityIcons name="account-group-outline" size={11} color={colors.textSecondary} />
                                    <Text style={styles.heroBadgeText}>{groupName}</Text>
                                </View>
                            ) : null}
                            {tagName ? (
                                <View style={[styles.heroBadge, { backgroundColor: `${tagColor}15`, borderColor: `${tagColor}40`, borderWidth: 1 }]}>
                                    <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                                    <Text style={[styles.heroBadgeText, { color: tagColor }]}>{tagName}</Text>
                                </View>
                            ) : null}
                            <View style={[styles.heroBadge, { backgroundColor: isActive ? '#10B98115' : '#64748B15', borderColor: isActive ? '#10B98140' : '#64748B40', borderWidth: 1 }]}>
                                <View style={[styles.tagDot, { backgroundColor: isActive ? '#10B981' : '#64748B' }]} />
                                <Text style={[styles.heroBadgeText, { color: isActive ? '#10B981' : colors.textMuted }]}>{isActive ? 'Active' : 'Inactive'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <ActionButton
                        icon="phone"
                        label="Call"
                        color={colors.accentTeal}
                        disabled={!contact.phone}
                        onPress={handleCall}
                        isDark={isDark}
                        colors={colors}
                    />
                    <ActionButton
                        icon="whatsapp"
                        label="WhatsApp"
                        color="#25D366"
                        disabled={!contact.phone}
                        onPress={handleWhatsApp}
                        isDark={isDark}
                        colors={colors}
                    />
                    <ActionButton
                        icon="email-outline"
                        label="Email"
                        color={colors.accentTeal}
                        disabled={false}
                        onPress={handleEmail}
                        isDark={isDark}
                        colors={colors}
                    />
                    <ActionButton
                        icon="message-outline"
                        label="SMS"
                        color={colors.accentTeal}
                        disabled={!contact.phone}
                        onPress={handleSMS}
                        isDark={isDark}
                        colors={colors}
                    />
                </View>

                {/* Intel Cards — only if data exists */}
                {intelItems.length > 0 && (
                    <View style={styles.intelRow}>
                        {intelItems.map((item) => (
                            <View key={item.label} style={[styles.intelCard, { flex: 1 }]}>
                                <View style={[styles.intelIcon, { backgroundColor: `${item.color}15` }]}>
                                    <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
                                </View>
                                <Text style={styles.intelLabel}>{item.label}</Text>
                                <Text style={[styles.intelValue, { color: item.color }]}>{item.value}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Heat Index — only if present */}
                {showHeatIndex && (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <View>
                                <Text style={styles.cardTitle}>Heat Index</Text>
                                <Text style={styles.cardSub}>Engagement score</Text>
                            </View>
                            <View style={[styles.heatBadge, { backgroundColor: heatIndex! > 70 ? '#EF444415' : `${colors.accentTeal}15` }]}>
                                <MaterialCommunityIcons name="fire" size={16} color={heatIndex! > 70 ? '#EF4444' : colors.accentTeal} />
                                <Text style={[styles.heatVal, { color: heatIndex! > 70 ? '#EF4444' : colors.accentTeal }]}>{heatIndex}</Text>
                            </View>
                        </View>
                        <View style={styles.gaugeTrack}>
                            <LinearGradient
                                colors={['#3B82F6', '#0a2341', '#10B981', '#F59E0B', '#EF4444']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.gaugeFill, { width: `${Math.min(heatIndex!, 100)}%` as any }]}
                            />
                        </View>
                        <View style={styles.gaugeLabels}>
                            <Text style={styles.gaugeLabel}>Cold</Text>
                            <Text style={styles.gaugeLabel}>Warm</Text>
                            <Text style={styles.gaugeLabel}>Hot</Text>
                        </View>
                    </View>
                )}

                {/* Notes */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Internal notes</Text>
                    <Pressable style={styles.textAddBtn} onPress={() => setIsAddingNote(true)}>
                        <View style={styles.textAddBtnBg}>
                            <MaterialCommunityIcons name="plus" size={14} color={colors.accentTeal} />
                            <Text style={styles.textAddBtnText}>Add Note</Text>
                        </View>
                    </Pressable>
                </View>


                {contact.notes && contact.notes.length > 0 ? (
                    <View style={styles.listStack}>
                        {[...contact.notes].reverse().map((note: any, idx: number) => (
                            <View key={idx} style={styles.noteCard}>
                                <View style={[styles.noteBar, { backgroundColor: colors.accentTeal }]} />
                                <View style={styles.noteBody}>
                                    <Text style={styles.noteText}>{note.content || note.text}</Text>
                                    <Text style={styles.noteDate}>
                                        {new Date(note.created_at || note.date).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="note-text-outline" size={28} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No notes yet</Text>
                    </View>
                )}

                {/* Activity Timeline */}
                <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                    <Text style={styles.sectionTitle}>Important events</Text>
                    <Pressable style={styles.textAddBtn} onPress={() => setIsAddingEvent(true)}>
                        <View style={styles.textAddBtnBg}>
                            <MaterialCommunityIcons name="plus" size={14} color={colors.accentTeal} />
                            <Text style={styles.textAddBtnText}>Add event</Text>
                        </View>
                    </Pressable>
                </View>


                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={(date) => { setNewEventDate(date); setDatePickerVisible(false); }}
                    onCancel={() => setDatePickerVisible(false)}
                />

                <View style={styles.eventList}>
                    {contact.events && contact.events.length > 0 ? contact.events.map((event: any, idx: number) => (
                        <View key={idx} style={[styles.eventRow, idx !== contact.events.length - 1 && styles.eventBorder]}>
                            <View style={styles.eventIconContainer}>
                                <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.accentTeal} />
                            </View>
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventDate}>{event.date}</Text>
                            </View>
                        </View>
                    )) : (
                        <View style={styles.emptyEvents}>
                            <Text style={styles.emptyEventsText}>No important events scheduled.</Text>
                        </View>
                    )}
                </View>

                {/* Contact Info */}
                <View style={[styles.card, { marginTop: 32, padding: 0, overflow: 'hidden' }]}>
                    {infoRows.map((row, idx) => (
                        <View
                            key={row.label}
                            style={[styles.infoRow, idx < infoRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                            <Text style={styles.infoLabel}>{row.label}</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>

            {/* Note Modal */}
            <Modal visible={isAddingNote} transparent animationType="fade" onRequestClose={() => { setIsAddingNote(false); setNewNote(''); }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Internal Note</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Write a note about this lead..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            autoFocus
                            value={newNote}
                            onChangeText={setNewNote}
                        />
                        <View style={styles.inputActions}>
                            <Pressable onPress={() => { setIsAddingNote(false); setNewNote(''); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveBtn, (!newNote.trim() || isAddingNotePending) && { opacity: 0.4 }]}
                                onPress={handleSaveNote}
                                disabled={!newNote.trim() || isAddingNotePending}>
                                {isAddingNotePending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Note</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Event Modal */}
            <Modal visible={isAddingEvent} transparent animationType="fade" onRequestClose={() => { setIsAddingEvent(false); setNewEventTitle(''); setNewEventDate(null); }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Important Event</Text>
                        <TextInput
                            style={styles.singleInput}
                            placeholder="Event title (e.g. Site visit, Follow-up call)"
                            placeholderTextColor={colors.textMuted}
                            autoFocus
                            value={newEventTitle}
                            onChangeText={setNewEventTitle}
                        />
                        <Pressable style={styles.datePicker} onPress={() => setDatePickerVisible(true)}>
                            <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textMuted} />
                            <Text style={formattedEventDate ? styles.datePickerValue : styles.datePickerPlaceholder}>
                                {formattedEventDate || 'Select date'}
                            </Text>
                        </Pressable>
                        <View style={styles.inputActions}>
                            <Pressable onPress={() => { setIsAddingEvent(false); setNewEventTitle(''); setNewEventDate(null); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.saveBtn, (!newEventTitle.trim() || !newEventDate || isAddingEventPending) && { opacity: 0.4 }]}
                                onPress={handleSaveEvent}
                                disabled={!newEventTitle.trim() || !newEventDate || isAddingEventPending}>
                                {isAddingEventPending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Event</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({ icon, label, color, disabled, onPress, isDark, colors }: any) {
    return (
        <Pressable style={{ alignItems: 'center', flex: 1 }} onPress={onPress} disabled={disabled}>
            <View style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: disabled
                    ? (isDark ? '#1E2C3A' : '#F1F5FA')
                    : (isDark ? `${color}18` : `${color}12`),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                borderWidth: 1,
                borderColor: disabled
                    ? colors.borderLight
                    : `${color}30`,
                opacity: disabled ? 0.45 : 1,
            }}>
                <MaterialCommunityIcons name={icon} size={22} color={disabled ? colors.textMuted : color} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: disabled ? colors.textMuted : colors.textSecondary }}>
                {label}
            </Text>
        </Pressable>
    );
}

function TimelineItem({ title, date, dotColor, isLast, colors }: any) {
    return (
        <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center', width: 18 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor, marginTop: 2 }} />
                {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: colors.borderLight, marginTop: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 22 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 3, fontWeight: '600' }}>{date}</Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: any, isDark: boolean) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: isDark ? '#111923' : '#F4F7FB',
        },
        loaderText: {
            marginTop: 12,
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        errorTitle: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.textPrimary,
            marginTop: 20,
        },
        errorSub: {
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
        },
        errorBtn: {
            marginTop: 28,
            backgroundColor: colors.accentTeal,
            paddingHorizontal: 28,
            paddingVertical: 13,
            borderRadius: 14,
        },
        errorBtnText: {
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: 15,
        },

        // Header
        header: {
            backgroundColor: 'transparent',
        },
        hero: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
        },
        avatarWrap: {
            position: 'relative',
        },
        avatar: {
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.borderLight,
        },
        avatarLetter: {
            fontSize: 28,
            fontWeight: '900',
            color: '#FFFFFF',
        },
        statusDot: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            borderRadius: 8,
            borderWidth: 2.5,
            borderColor: isDark ? '#111923' : '#FFFFFF',
        },
        heroInfo: {
            flex: 1,
            justifyContent: 'center',
        },
        heroName: {
            fontSize: 22,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        heroEmail: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
            fontWeight: '500',
        },
        heroBadgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
        },
        heroBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        heroBadgeText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        tagDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
        },

        scroll: { flex: 1 },
        scrollContent: {
            paddingHorizontal: 20,
            paddingTop: 24,
        },

        // Actions
        actionRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
        },

        // Intel
        intelRow: {
            flexDirection: 'row',
            gap: 10,
            marginBottom: 20,
        },
        intelCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        intelIcon: {
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
        },
        intelLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: 4,
        },
        intelValue: {
            fontSize: 13,
            fontWeight: '800',
        },

        // Heat Index
        card: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        cardHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        cardTitle: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        cardSub: {
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 2,
            fontWeight: '600',
        },
        heatBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
        },
        heatVal: {
            fontSize: 18,
            fontWeight: '900',
        },
        gaugeTrack: {
            height: 8,
            backgroundColor: isDark ? '#1E2C3A' : '#EEF2F7',
            borderRadius: 4,
            overflow: 'hidden',
        },
        gaugeFill: {
            height: '100%',
            borderRadius: 4,
        },
        gaugeLabels: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8,
        },
        gaugeLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textMuted,
        },

        // Sections
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.3,
        },
        // Important Events
        eventList: {
            backgroundColor: colors.cardBackground,
            borderRadius: 18,
            paddingVertical: 4,
        },
        eventRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 12,
            gap: 14,
        },
        eventBorder: {
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        eventIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.surfaceSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        eventInfo: {
            flex: 1,
        },
        eventTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        eventDate: {
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 2,
            fontWeight: '600',
        },
        emptyEvents: {
            padding: 24,
            alignItems: 'center',
        },
        emptyEventsText: {
            fontSize: 13,
            color: colors.textMuted,
            fontWeight: '600',
        },
        textAddBtn: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        textAddBtnBg: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: `${colors.accentTeal}10`,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: `${colors.accentTeal}25`,
        },
        textAddBtnText: {
            fontSize: 12,
            fontWeight: '800',
            color: colors.accentTeal,
        },

        // Modals
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'center',
            padding: 24,
        },
        modalContent: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 16,
        },
        textArea: {
            fontSize: 15,
            color: colors.textPrimary,
            minHeight: 90,
            textAlignVertical: 'top',
            fontWeight: '500',
            lineHeight: 22,
        },
        singleInput: {
            fontSize: 15,
            color: colors.textPrimary,
            paddingVertical: 8,
            fontWeight: '500',
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            marginBottom: 12,
        },
        datePicker: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 10,
            marginBottom: 4,
        },
        datePickerPlaceholder: {
            fontSize: 14,
            color: colors.textMuted,
            fontWeight: '500',
        },
        datePickerValue: {
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '700',
        },
        inputActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            paddingTop: 12,
        },
        cancelText: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textMuted,
        },
        saveBtn: {
            backgroundColor: '#0B213E',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
        },
        saveBtnText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '800',
        },

        // Notes
        listStack: {
            gap: 10,
            marginBottom: 4,
        },
        noteCard: {
            flexDirection: 'row',
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        noteBar: {
            width: 4,
        },
        noteBody: {
            flex: 1,
            padding: 14,
        },
        noteText: {
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '500',
            lineHeight: 20,
        },
        noteDate: {
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 6,
            fontWeight: '600',
        },

        // Empty state
        emptyState: {
            alignItems: 'center',
            paddingVertical: 28,
            backgroundColor: isDark ? '#151D26' : '#F7FAFE',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.borderLight,
            borderStyle: 'dashed',
            gap: 8,
        },
        emptyText: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textMuted,
        },

        // Info table
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingVertical: 14,
        },
        infoLabel: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textMuted,
        },
        infoValue: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
            maxWidth: '60%',
            textAlign: 'right',
        },
    });
}
