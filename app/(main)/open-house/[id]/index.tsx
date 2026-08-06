import GradientButton from '@/components/ui/GradientButton';
import OutlineButton from '@/components/ui/OutlineButton';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { deleteOpenHouse, getOpenHouseById, updateOpenHouse } from '@/services/openHouseService';
import { formatPropertyPrice } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Overview', 'Enquiries', 'Automation', 'Assets & Design', 'Settings', 'Seller Report'];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800';

const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const clean = phone.replace(/\s+/g, '');
    if (!clean.startsWith('+')) return phone;

    // Check common country codes (3-digit first, then 2-digit, then 1-digit)
    const countryCodes3 = ['380', '971', '964', '966', '359', '234', '254', '263', '353', '358', '372', '385', '420', '502', '506', '593', '852', '853', '961', '962', '965', '968', '972', '973', '974', '994', '998'];
    const countryCodes2 = ['91', '44', '61', '33', '49', '39', '34', '31', '32', '41', '43', '46', '47', '48', '30', '36', '45', '55', '52', '60', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '92', '93', '94', '95', '98', '20', '27', '36', '38', '51', '54', '56', '57', '58', '99'];
    const countryCodes1 = ['1', '7'];

    const digits = clean.substring(1); // remove +
    for (const code of countryCodes3) {
        if (digits.startsWith(code)) {
            return `+${code} ${digits.substring(code.length)}`;
        }
    }
    for (const code of countryCodes2) {
        if (digits.startsWith(code)) {
            return `+${code} ${digits.substring(code.length)}`;
        }
    }
    for (const code of countryCodes1) {
        if (digits.startsWith(code)) {
            return `+${code} ${digits.substring(code.length)}`;
        }
    }

    // Fallback: if we can't match, just split after 3 digits if total length > 10
    if (digits.length > 10) {
        return `+${digits.substring(0, 3)} ${digits.substring(3)}`;
    } else if (digits.length > 7) {
        return `+${digits.substring(0, 2)} ${digits.substring(2)}`;
    }
    return phone;
};

export default function EventDashboardScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();

    const { data: openHouseData, isLoading } = useQuery({
        queryKey: ['open-house', id],
        queryFn: () => getOpenHouseById(accessToken || '', id as string),
        enabled: !!accessToken && !!id,
    });

    // Derived display values
    const eventAddress = openHouseData?.property?.address || 'Property Address';
    const eventVisitors = openHouseData?.visitors_count ?? 0;
    const eventHotLeads = openHouseData?.hot_leads_count ?? 0;
    const eventRating = openHouseData?.feedback_rating ? `${openHouseData.feedback_rating}★` : '—';
    const pData = openHouseData?.property?.data;

    const eventPrice = formatPropertyPrice(pData, 'N/A');
    const eventStatus = openHouseData?.status?.toUpperCase() || 'UPCOMING';
    const eventBeds = pData?.beds || pData?.BedroomsTotal || 'N/A';
    const eventBaths = pData?.bathsFull || pData?.BathroomsFull || 'N/A';
    const eventSqft = pData?.sqft || pData?.LivingArea || 'N/A';
    const agentName = openHouseData?.agent_details?.name || 'Agent Name';
    const agentTitle = [openHouseData?.agent_details?.brokerage, openHouseData?.agent_details?.license ? `License: ${openHouseData.agent_details.license}` : ''].filter(Boolean).join(' | ') || 'Real Estate Professional';
    const agentEmail = openHouseData?.agent_details?.email || 'email@example.com';
    const agentPhone = openHouseData?.agent_details?.phone || '';

    // Computed extras
    const checkInUrl = `https://staging.zien.ai/open-house/check-in/${encodeURIComponent(eventAddress)}`;
    const eventDateFormatted = openHouseData?.date
        ? new Date(openHouseData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : '';
    const eventTimeFormatted = openHouseData?.start_time && openHouseData?.end_time
        ? `${openHouseData.start_time} - ${openHouseData.end_time}`
        : '';
    const addressParts = eventAddress.split(',');
    const streetAddress = addressParts[0]?.trim() || eventAddress;
    const cityStateZip = addressParts.slice(1).join(',').trim();
    const propDescription = (openHouseData?.ai_description && openHouseData.ai_description.trim())
        ? openHouseData.ai_description
        : pData?.PrivateRemarks
            ? pData.PrivateRemarks.substring(0, 160) + (pData.PrivateRemarks.length > 160 ? '...' : '')
            : 'Join us for an exclusive open house event. Discover this beautiful property and explore its features.';

    // Dynamic brand tint color
    const currentColor = openHouseData?.brand_color || colors.accentTeal || '#0D9488';

    const [activeTab, setActiveTab] = useState('Overview');
    const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
    const [propertyPhotos, setPropertyPhotos] = useState<string[]>([]);
    const [automationRules, setAutomationRules] = useState({ tag: true, crm: true, alert: true, sms: false, dwell: true, ghost: true });
    const [activeSequence, setActiveSequence] = useState('Open House: Instant Digital Portfolio');
    const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);

    const [anonymizeLeads, setAnonymizeLeads] = useState(true);
    const [hideVisitorNames, setHideVisitorNames] = useState(true);

    // Notification & QR settings — seeded from API, user-editable locally
    const [notifRealtime, setNotifRealtime] = useState(true);
    const [notifHotLead, setNotifHotLead] = useState(true);
    const [notifEmailSummary, setNotifEmailSummary] = useState(true);
    const [qrEnableCheckIn, setQrEnableCheckIn] = useState(true);
    const [qrRequireEmail, setQrRequireEmail] = useState(false);
    const [qrRequirePhone, setQrRequirePhone] = useState(true);

    const scrollViewRef = useRef<ScrollView>(null);
    const qrRef = useRef<any>(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    const onScrollEnd = (e: any) => {
        const contentOffset = e.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        setActivePhotoIndex(index);
    };

    useEffect(() => {
        const photos = propertyPhotos.length > 0 ? propertyPhotos : [PLACEHOLDER_IMAGE];
        if (photos.length <= 1) return;

        const timer = setTimeout(() => {
            const nextIndex = (activePhotoIndex + 1) % photos.length;
            scrollViewRef.current?.scrollTo({
                x: nextIndex * SCREEN_WIDTH,
                animated: true
            });
            setActivePhotoIndex(nextIndex);
        }, 3000);

        return () => clearTimeout(timer);
    }, [activePhotoIndex, propertyPhotos]);

    // Settings fields local states
    const [settingsEventName, setSettingsEventName] = useState('');
    const [settingsDateStr, setSettingsDateStr] = useState('');
    const [settingsTimeStr, setSettingsTimeStr] = useState('');
    const [settingsAddress, setSettingsAddress] = useState('');
    const [settingsAgentName, setSettingsAgentName] = useState('');

    useEffect(() => {
        if (openHouseData?.gallery_images?.length) {
            setPropertyPhotos(openHouseData.gallery_images);
        } else if (openHouseData?.property?.data?.Media?.length) {
            const mediaImages = openHouseData.property.data.Media.filter((m: any) => m.MediaURL).map((m: any) => m.MediaURL);
            setPropertyPhotos(mediaImages);
        }

        if (openHouseData) {
            const shortAddr = openHouseData.property?.address?.split(',')[0] || '';
            setSettingsEventName(openHouseData.property?.address ? `${shortAddr} Open House` : 'Open House Event');
            setSettingsDateStr(openHouseData.date || '');
            setSettingsTimeStr(openHouseData.start_time && openHouseData.end_time ? `${openHouseData.start_time} - ${openHouseData.end_time}` : '');
            setSettingsAddress(openHouseData.property?.address || '');
            setSettingsAgentName(openHouseData.agent_details?.name || '');

            // Seed notification & QR toggles from API settings
            setNotifRealtime(openHouseData.settings?.realtimeAlerts ?? true);
            setNotifHotLead(openHouseData.settings?.hotLeadAlerts ?? true);
            setNotifEmailSummary(openHouseData.settings?.emailSummaries ?? true);
            setQrEnableCheckIn(openHouseData.settings?.enableCheckIn ?? true);
            setQrRequireEmail(openHouseData.settings?.requireEmail ?? false);
            setQrRequirePhone(openHouseData.settings?.requirePhone ?? true);
        }
    }, [openHouseData]);

    const updateMutation = useMutation({
        mutationFn: (payload: any) => updateOpenHouse(accessToken || '', id as string, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['open-houses'] });
            queryClient.invalidateQueries({ queryKey: ['open-house', id] });
            Alert.alert('Success', 'Event details saved successfully!');
        },
        onError: (error: any) => {
            console.error('Update Event Settings Error:', error);
            Alert.alert('Error', 'Failed to save event details. Please try again.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteOpenHouse(accessToken || '', id as string),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['open-houses'] });
            Alert.alert('Deleted', 'Open house event has been successfully deleted.', [
                { text: 'OK', onPress: () => router.replace('/(main)/dashboard' as any) }
            ]);
        },
        onError: (error: any) => {
            console.error('Delete Event Error:', error);
            Alert.alert('Error', 'Failed to delete event. Please try again.');
        }
    });

    const handleSaveChanges = async () => {
        if (!settingsEventName.trim()) {
            Alert.alert('Event Name Required', 'Please enter an event name.');
            return;
        }

        let startTime = openHouseData?.start_time || '13:00';
        let endTime = openHouseData?.end_time || '16:00';
        if (settingsTimeStr.includes('-')) {
            const parts = settingsTimeStr.split('-');
            startTime = parts[0].trim();
            endTime = parts[1].trim();
        }

        const payload = {
            date: settingsDateStr,
            start_time: startTime,
            end_time: endTime,
            agent_details: {
                ...openHouseData?.agent_details,
                name: settingsAgentName,
            },
            visitor_registration: automationRules.tag,
            send_report: openHouseData?.send_report ?? true,
        };

        updateMutation.mutate(payload);
    };

    const handleDeleteEvent = () => {
        Alert.alert(
            'Delete Event',
            'Are you absolutely sure you want to permanently delete this open house event? All guest logs and templates will be lost forever.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() }
            ]
        );
    };

    const handleAddPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });
        if (!result.canceled) setPropertyPhotos([...propertyPhotos, ...result.assets.map(a => a.uri)]);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out the digital portfolio for ${eventAddress}: ${checkInUrl}`,
                url: checkInUrl,
                title: `Digital Portfolio - ${eventAddress}`,
            });
        } catch (error) {
            console.error('Error sharing portfolio:', error);
        }
    };

    const handleCopyLink = async () => {
        try {
            await Clipboard.setStringAsync(checkInUrl);
            Alert.alert('Copied!', 'Check-in link has been copied to clipboard.');
        } catch (e) {
            Alert.alert('Error', 'Could not copy link.');
        }
    };

    const handleDownloadQR = () => {
        if (!qrRef.current) {
            Alert.alert('Not Ready', 'QR code is not ready yet. Please try again.');
            return;
        }
        qrRef.current.toDataURL(async (data: string) => {
            try {
                const filePath = `${FileSystem.documentDirectory}qrcode-${id}.png`;
                await FileSystem.writeAsStringAsync(filePath, data, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(filePath, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Save QR Code' });
            } catch (e) {
                Alert.alert('Error', 'Failed to download QR code.');
            }
        });
    };

    const handleSaveQR = () => {
        if (!qrRef.current) {
            Alert.alert('Not Ready', 'QR code is not ready yet. Please try again.');
            return;
        }
        qrRef.current.toDataURL(async (data: string) => {
            try {
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please allow access to your photo library to save the QR code.');
                    return;
                }
                const filePath = `${FileSystem.cacheDirectory}qrcode-${id}.png`;
                await FileSystem.writeAsStringAsync(filePath, data, { encoding: FileSystem.EncodingType.Base64 });
                await MediaLibrary.saveToLibraryAsync(filePath);
                Alert.alert('Saved', 'QR code has been saved to your photo library.');
            } catch (e) {
                Alert.alert('Error', 'Failed to save QR code to your library.');
            }
        });
    };

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerTop}>
                <Pressable onPress={() => router.back()} style={styles.headerCircleBtn} hitSlop={10}>
                    <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{eventAddress}</Text>
                    <View style={styles.headerStatusRow}>
                        <View style={[styles.liveDot, { backgroundColor: openHouseData?.status === 'live' ? '#10B981' : currentColor }]} />
                        <Text style={styles.headerStatusText}>{eventStatus}</Text>
                    </View>
                </View>
                {/* <Pressable onPress={handleShare} style={styles.headerCircleBtn} hitSlop={10}>
                    <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.textPrimary} />
                </Pressable> */}
            </View>
        </View>
    );

    const renderHero = () => {
        const photos = propertyPhotos.length > 0 ? propertyPhotos : [PLACEHOLDER_IMAGE];
        return (
            <View style={styles.heroSection}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScrollEnd}
                    style={StyleSheet.absoluteFill}
                >
                    {photos.map((photo, index) => (
                        <View key={index} style={{ width: SCREEN_WIDTH, height: 280 }}>
                            <Image
                                source={{ uri: photo }}
                                style={styles.heroImage}
                                contentFit="cover"
                                transition={600}
                            />
                        </View>
                    ))}
                </ScrollView>
                <LinearGradient colors={['transparent', 'rgba(15, 23, 42, 0.9)']} style={styles.heroGradient} />
                <View style={styles.heroContent}>
                    <View style={[styles.heroPriceBadge, { backgroundColor: currentColor }]}>
                        <Text style={styles.heroPriceText}>{eventPrice}</Text>
                    </View>
                    <Text style={styles.heroAddressText} numberOfLines={2}>{eventAddress}</Text>
                    <View style={styles.heroMetaRow}>
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="bed-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventBeds} Beds</Text>
                        </View>
                        <View style={styles.heroMetaDivider} />
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="bathtub-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventBaths} Baths</Text>
                        </View>
                        <View style={styles.heroMetaDivider} />
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="vector-square" size={15} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventSqft} Sqft</Text>
                        </View>
                    </View>
                </View>
                {photos.length > 1 && (
                    <View style={styles.counterBadge}>
                        <Text style={styles.counterText}>
                            {activePhotoIndex + 1}/{photos.length}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderTabs = () => (
        <View style={styles.tabBarContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}
                style={{ backgroundColor: colors.surfaceSoft }}
            >
                {TABS.map((tab) => (
                    <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}>
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive, activeTab === tab && { color: colors.textPrimary }]}>{tab}</Text>
                        {activeTab === tab && <View style={[styles.tabIndicator, { backgroundColor: currentColor }]} />}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderOverview = () => (
        <View style={styles.tabContentPremium}>

            {/* ── Property Info Card ── */}
            <View style={styles.propInfoCard}>
                {/* Date & Time */}
                <View style={styles.propDateTimeRow}>
                    <View style={styles.propDateBox}>
                        <MaterialCommunityIcons name="calendar-outline" size={13} color={currentColor} />
                        <Text style={[styles.propDateText, { color: currentColor }]} numberOfLines={1}>{eventDateFormatted}</Text>
                    </View>
                    {eventTimeFormatted ? (
                        <View style={styles.propTimeBox}>
                            <MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSecondary} />
                            <Text style={styles.propTimeText}>{eventTimeFormatted}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Description */}
                <Text style={styles.propDesc} numberOfLines={3}>{propDescription}</Text>
            </View>

            {/* ── Live Stats Card ── */}
            <View style={styles.liveStatsCard}>
                <Text style={styles.liveStatsHeader}>Live Stats</Text>
                <View style={styles.statsGridRow}>
                    <View style={styles.statGridCellItem}>
                        <Text style={styles.statGridValueText}>{eventVisitors}</Text>
                        <Text style={styles.statGridLabelText}>CHECK-INS</Text>
                    </View>
                    <View style={styles.statGridCellItem}>
                        <Text style={[styles.statGridValueText, { color: '#F43F5E' }]}>{eventHotLeads}</Text>
                        <Text style={styles.statGridLabelText}>HOT LEADS</Text>
                    </View>
                    <View style={[styles.statGridCellItem, styles.hotScoreCellItem, { borderColor: currentColor + '40', backgroundColor: currentColor + '08' }]}>
                        <Text style={[styles.statGridValueText, { color: currentColor }]}>
                            {eventVisitors > 0 ? `${Math.round((eventHotLeads / eventVisitors) * 100)}%` : '0%'}
                        </Text>
                        <Text style={[styles.statGridLabelText, { color: currentColor }]}>HOT SCORE</Text>
                    </View>
                </View>
            </View>

            {/* ── QR Check-In Card (dark navy) ── */}
            <View style={styles.qrDarkCard}>
                <Text style={styles.qrDarkTitle}>EVENT CHECK-IN</Text>
                <Text style={styles.qrDarkSub}>SCAN TO CAPTURE LEAD</Text>
                <View style={styles.qrDarkCode}>
                    <QRCode
                        value={checkInUrl || 'https://staging.zien.ai'}
                        size={130}
                        color="#0B2D3E"
                        backgroundColor="#FFFFFF"
                        {...({ getRef: (ref: any) => { qrRef.current = ref; } } as any)}
                    />
                </View>
                <View style={styles.qrDarkBtnsRow}>
                    <Pressable
                        style={({ pressed }) => [styles.qrDarkBtn, pressed && { opacity: 0.75 }]}
                        onPress={handleSaveQR}
                    >
                        <MaterialCommunityIcons name="tray-arrow-down" size={16} color="#FFFFFF" />
                        <Text style={styles.qrDarkBtnText}>Save</Text>
                    </Pressable>
                    <View style={styles.qrDarkBtnDivider} />
                    <Pressable
                        style={({ pressed }) => [styles.qrDarkBtn, pressed && { opacity: 0.75 }]}
                        onPress={handleDownloadQR}
                    >
                        <MaterialCommunityIcons name="download-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.qrDarkBtnText}>Share</Text>
                    </Pressable>
                    <View style={styles.qrDarkBtnDivider} />
                    <Pressable
                        style={({ pressed }) => [styles.qrDarkBtn, pressed && { opacity: 0.75 }]}
                        onPress={handleCopyLink}
                    >
                        <MaterialCommunityIcons name="link-variant" size={16} color="#FFFFFF" />
                        <Text style={styles.qrDarkBtnText}>Copy Link</Text>
                    </Pressable>
                </View>
            </View>

            {/* ── Agent & Brokerage Card ── */}
            <View style={styles.agentCardPremium}>
                <View style={styles.agentCardTopRow}>
                    <Text style={styles.agentCardHeader}>Agent & Brokerage</Text>
                    <View style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={13} color={currentColor} />
                        <Text style={[styles.verifiedText, { color: currentColor }]}>VERIFIED</Text>
                    </View>
                </View>
                <View style={styles.agentInfoRow}>
                    <View style={[styles.agentAvatarBox, { backgroundColor: currentColor }]}>
                        <Text style={styles.agentAvatarText}>{agentName[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.agentNameBox}>
                        <Text style={styles.agentNamePremium}>{agentName}</Text>
                        <Text style={styles.agentTitlePremium} numberOfLines={1}>{agentTitle}</Text>
                    </View>
                </View>
                <View style={styles.agentContactPremium}>
                    <View style={styles.contactItemPremium}>
                        <MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.contactTextPremium}>{agentEmail}</Text>
                    </View>
                    {agentPhone ? (
                        <View style={[styles.contactItemPremium, { marginTop: 10 }]}>
                            <MaterialCommunityIcons name="phone-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.contactTextPremium}>{formatPhoneNumber(agentPhone)}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

        </View>
    );

    const renderEnquiries = () => (
        <View style={styles.tabContentPremium}>
            {(openHouseData?.enquiries || []).length > 0 ? (
                (openHouseData?.enquiries || []).map((visitor: any) => {
                    const isHot = (visitor.signal || '').toLowerCase() === 'hot';
                    return (
                        <Pressable key={visitor.id} style={styles.visitorCardPremium} onPress={() => setSelectedVisitor(visitor)}>
                            <View style={styles.vCardHeader}>
                                <View style={styles.vAvatarBox}>
                                    <Text style={styles.vAvatarText}>{(visitor.name || 'A')[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.vInfoBox}>
                                    <Text style={styles.vNameText}>{visitor.name || 'Anonymous'}</Text>
                                    <Text style={styles.vEmailText} numberOfLines={1}>{visitor.email || 'No email provided'}</Text>
                                </View>
                                <View style={[styles.vSignalBadge, { backgroundColor: isHot ? '#F43F5E' : colors.badgeMutedBg }]}>
                                    <Text style={[styles.vSignalText, { color: isHot ? '#FFFFFF' : colors.textSecondary }]}>
                                        {(visitor.signal || 'Cold').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.vCardStats}>
                                <View style={styles.vStatItem}>
                                    <MaterialCommunityIcons name="timeline-outline" size={14} color={colors.textMuted} />
                                    <Text style={styles.vStatText}>{visitor.timeline || 'Exploring'}</Text>
                                </View>
                                <View style={styles.vStatItem}>
                                    <MaterialCommunityIcons name="check-decagram-outline" size={14} color={colors.textMuted} />
                                    <Text style={styles.vStatText}>PRE: {visitor.preApproved || 'No'}</Text>
                                </View>
                                <View style={{ marginLeft: 'auto' }}>
                                    <Text style={styles.vTimeText}>{new Date(visitor.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>
                        </Pressable>
                    );
                })
            ) : (
                <View style={styles.emptyActivityBox}>
                    <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyActivityText}>No lead check-ins recorded yet.</Text>
                </View>
            )}
        </View>
    );

    const renderAutomation = () => (
        <View style={styles.tabContentPremium}>
            {/* Follow-up sequence picker */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Follow-Up Sequence Control</Text>
                <View style={styles.automationSelector}>
                    <Text style={styles.selectorLabel}>ACTIVE AUTOMATION SEQUENCE</Text>
                    <Pressable style={styles.selectorBox} onPress={() => setShowSequenceDropdown(true)}>
                        <Text style={styles.selectorValue}>{activeSequence}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.selectorHint}>This sequence triggers automatically for every person who scans the QR code.</Text>
                </View>

                {/* Automation Sequence email preview card */}
                <View style={styles.templatePreviewCard}>
                    <View style={styles.templateHeader}>
                        <Text style={styles.templateBadge}>TEMPLATE PREVIEW</Text>
                        <Pressable style={styles.editBuilderLink} onPress={() => router.push('/(main)/crm/templates' as any)}>
                            <Text style={[styles.editBuilderText, { color: currentColor }]}>EDIT IN BUILDER</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.templateSubject}>{"\"Thank you for visiting " + streetAddress + "!\""}</Text>
                    <Text style={styles.templateBody}>
                        {"Hi {{first_name}}, it was great meeting you today. I've attached the property dossier including the virtual tour and local market report we discussed..."}
                    </Text>
                    <View style={styles.attachmentsRow}>
                        <View style={styles.attachmentIconBox}>
                            <MaterialCommunityIcons name="file-document-outline" size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.attachmentIconBox}>
                            <MaterialCommunityIcons name="pulse" size={16} color={colors.textSecondary} />
                        </View>
                        <Text style={styles.attachmentsCount}>+3 attachments</Text>
                    </View>
                </View>
            </View>

            {/* Ghost Protocol Re-Engagement */}
            <View style={styles.premiumCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={styles.ghostTitle}>Ghost Protocol Re-Engagement</Text>
                        <Text style={styles.ghostSub}>Automatically re-engage leads who go silent after 48 hours.</Text>
                    </View>
                    <Switch
                        value={automationRules.ghost}
                        onValueChange={(val) => setAutomationRules(prev => ({ ...prev, ghost: val }))}
                        trackColor={{ false: '#E2E8F0', true: currentColor }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            </View>

            {/* Event Specific Rules */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Event-Specific Rules</Text>
                <View style={styles.rulesList}>
                    {[
                        { id: 'tag', label: "Apply 'Open House' Tag", icon: 'tag-outline' },
                        { id: 'crm', label: 'Sync to Zien CRM Instantly', icon: 'sync' },
                        { id: 'alert', label: "Mobile Alert for 'Hot' Leads", icon: 'bell-ring-outline' },
                        { id: 'sms', label: 'Send SMS Confirmation', icon: 'message-text-outline' },
                        { id: 'dwell', label: 'Auto-Notify Seller on Dwell > 5m', icon: 'clock-outline' },
                    ].map((rule) => (
                        <View key={rule.id} style={styles.ruleRowPremium}>
                            <View style={styles.ruleInfoRow}>
                                <MaterialCommunityIcons name={rule.icon as any} size={20} color={colors.textSecondary} />
                                <Text style={styles.ruleLabelPremium}>{rule.label}</Text>
                            </View>
                            <Switch
                                value={(automationRules as any)[rule.id]}
                                onValueChange={(val) => setAutomationRules(prev => ({ ...prev, [rule.id]: val }))}
                                trackColor={{ false: '#E2E8F0', true: currentColor }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderAssets = () => (
        <View style={styles.tabContentPremium}>
            {/* Property Specs grid layout */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Property Specs</Text>
                <View style={styles.specsContainer}>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Listing Price</Text>
                        <Text style={styles.specValue}>{eventPrice}</Text>
                    </View>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Square Footage</Text>
                        <Text style={styles.specValue}>{eventSqft} sqft</Text>
                    </View>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Bedrooms</Text>
                        <Text style={styles.specValue}>{eventBeds} Bedrooms</Text>
                    </View>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Bathrooms</Text>
                        <Text style={styles.specValue}>{eventBaths} Bathrooms</Text>
                    </View>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Lot Size</Text>
                        <Text style={styles.specValue}>{pData?.LotSizeArea ? `${pData.LotSizeArea} Acres` : 'N/A'}</Text>
                    </View>
                    <View style={styles.specRow}>
                        <Text style={styles.specLabel}>Year Built</Text>
                        <Text style={styles.specValue}>{pData?.YearBuilt || '1968'}</Text>
                    </View>
                </View>
                <View style={styles.aiDescriptionBox}>
                    <Text style={[styles.aiDescriptionTitle, { color: currentColor }]}>AI DESCRIPTION SUMMARY</Text>
                    <Text style={styles.aiDescriptionText}>{"\"" + propDescription + "\""}</Text>
                </View>
                <Pressable style={[styles.pdfExportBtn, { backgroundColor: currentColor }]} android_ripple={{ color: 'rgba(255,255,255,0.15)' }}>
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfExportText}>Export PDF Portfolio</Text>
                </Pressable>
            </View>

            {/* Media Gallery grid selection */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Property Gallery</Text>
                <View style={styles.galleryGridPremium}>
                    {propertyPhotos.map((photo, idx) => (
                        <View key={idx} style={styles.galleryItemPremium}>
                            <Image source={{ uri: photo }} style={styles.galleryImgPremium} contentFit="cover" />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderSettings = () => (
        <View style={styles.tabContentPremium}>
            {/* Notification preferences — driven by API settings */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Notification Settings</Text>
                <View style={styles.preferencesList}>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.preferenceTitle}>Real-time Check-in Alerts</Text>
                            <Text style={styles.preferenceDesc}>Get notified when visitors check in</Text>
                        </View>
                        <Switch
                            value={notifRealtime}
                            onValueChange={setNotifRealtime}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.preferenceTitle}>Hot Lead Notifications</Text>
                            <Text style={styles.preferenceDesc}>Alert when high-interest leads arrive</Text>
                        </View>
                        <Switch
                            value={notifHotLead}
                            onValueChange={setNotifHotLead}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.preferenceTitle}>Email Summaries</Text>
                            <Text style={styles.preferenceDesc}>Daily recap of visitor activity</Text>
                        </View>
                        <Switch
                            value={notifEmailSummary}
                            onValueChange={setNotifEmailSummary}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>
            </View>

            {/* QR Code Preferences — driven by API settings */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>QR Code Settings</Text>
                <View style={styles.preferencesList}>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.preferenceTitle}>Enable QR Check-in</Text>
                        </View>
                        <Switch
                            value={qrEnableCheckIn}
                            onValueChange={setQrEnableCheckIn}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.preferenceTitle}>Require Email</Text>
                        </View>
                        <Switch
                            value={qrRequireEmail}
                            onValueChange={setQrRequireEmail}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={styles.preferenceRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.preferenceTitle}>Require Phone</Text>
                        </View>
                        <Switch
                            value={qrRequirePhone}
                            onValueChange={setQrRequirePhone}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable style={[styles.downloadQrBtnFilled, { flex: 1 }]} onPress={handleSaveQR} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                        <MaterialCommunityIcons name="tray-arrow-down" size={16} color="#FFFFFF" />
                        <Text style={styles.downloadQrTextFilled}>Save to Library</Text>
                    </Pressable>
                    <Pressable style={[styles.downloadQrBtnFilled, { flex: 1 }]} onPress={handleDownloadQR} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
                        <MaterialCommunityIcons name="share-variant-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.downloadQrTextFilled}>Share QR Code</Text>
                    </Pressable>
                </View>
            </View>

            {/* Data & Privacy Actions */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Data & Privacy</Text>
                <View style={styles.dataVerticalList}>
                    <View style={styles.dataListItemPremium}>
                        <View style={styles.dataListItemLeft}>
                            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.textPrimary} />
                            <Text style={styles.dataListItemTitle}>Export Visitors</Text>
                        </View>
                        <Pressable
                            style={styles.dataListItemBtn}
                            onPress={() => {
                                if (eventVisitors === 0) {
                                    Alert.alert("No visitors to export yet.");
                                } else {
                                    Alert.alert("Export", "Exporting visitors as CSV...");
                                }
                            }}
                        >
                            <Text style={styles.dataListItemBtnText}>Download CSV</Text>
                        </Pressable>
                    </View>
                    <View style={styles.dataListItemPremium}>
                        <View style={styles.dataListItemLeft}>
                            <MaterialCommunityIcons name="email-outline" size={22} color={colors.textPrimary} />
                            <Text style={styles.dataListItemTitle}>Emails Templates</Text>
                        </View>
                        <Pressable style={styles.dataListItemBtn} onPress={() => router.push('/(main)/crm/templates' as any)}>
                            <Text style={styles.dataListItemBtnText}>Customize</Text>
                        </Pressable>
                    </View>
                    <View style={styles.dataListItemPremium}>
                        <View style={styles.dataListItemLeft}>
                            <MaterialCommunityIcons name="pulse" size={22} color={colors.textPrimary} />
                            <Text style={styles.dataListItemTitle}>Analytics</Text>
                        </View>
                        <Pressable style={styles.dataListItemBtn} onPress={() => setActiveTab('Seller Report')}>
                            <Text style={styles.dataListItemBtnText}>View Report</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Danger Zone */}
            <View style={[styles.premiumCard, styles.dangerCard]}>
                <Text style={[styles.premiumCardHeader, { color: '#EF4444', marginBottom: 15 }]}>Danger Zone</Text>
                <Text style={styles.dangerText}>
                    Permanently delete this open house event and all associated data
                </Text>
                <Pressable style={styles.deleteEventBtnPremium} onPress={handleDeleteEvent}>
                    <Text style={styles.deleteEventTextPremium}>Delete Event</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderSellerReport = () => (
        <View style={styles.tabContentPremium}>
            {/* Seller Performance Report Card */}
            <View style={styles.premiumCard}>
                <View style={styles.sellerReportHeader}>
                    <Text style={styles.sellerReportTitle}>SELLER PERFORMANCE REPORT</Text>
                    <Text style={styles.sellerReportSubtitle}>{eventAddress.toUpperCase()} • LIVE STATS</Text>
                </View>

                {/* KPI stats belt row */}
                <View style={styles.sellerKpiRow}>
                    <View style={styles.sellerKpiItem}>
                        <Text style={styles.sellerKpiVal}>{eventVisitors}</Text>
                        <Text style={styles.sellerKpiLabel}>CURR. VISITORS</Text>
                    </View>
                    <View style={styles.sellerKpiDivider} />
                    <View style={styles.sellerKpiItem}>
                        <Text style={styles.sellerKpiVal}>
                            {eventVisitors > 0 ? `${((eventHotLeads / eventVisitors) * 100).toFixed(0)}%` : '25%'}
                        </Text>
                        <Text style={styles.sellerKpiLabel}>HOT LEAD RATIO</Text>
                    </View>
                    <View style={styles.sellerKpiDivider} />
                    <View style={styles.sellerKpiItem}>
                        <Text style={styles.sellerKpiVal}>{eventRating !== '—' ? eventRating.replace('★', '') : '9.5'}</Text>
                        <Text style={styles.sellerKpiLabel}>AVG INTEREST</Text>
                    </View>
                </View>

                {/* Sentiment Breakdown */}
                <Text style={styles.sentimentTitle}>Market Sentiment Breakdown</Text>

                <View style={styles.sentimentItem}>
                    <View style={styles.sentimentHeaderRow}>
                        <Text style={styles.sentimentLabel}>High Price Concern</Text>
                        <Text style={styles.sentimentValue}>15%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: '15%', backgroundColor: currentColor }]} />
                    </View>
                </View>

                <View style={styles.sentimentItem}>
                    <View style={styles.sentimentHeaderRow}>
                        <Text style={styles.sentimentLabel}>Love the Kitchen Reno</Text>
                        <Text style={styles.sentimentValue}>65%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: '65%', backgroundColor: currentColor }]} />
                    </View>
                </View>

                <View style={styles.sentimentItem}>
                    <View style={styles.sentimentHeaderRow}>
                        <Text style={styles.sentimentLabel}>Backyard is smaller than thought</Text>
                        <Text style={styles.sentimentValue}>20%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: '20%', backgroundColor: currentColor }]} />
                    </View>
                </View>
            </View>

            {/* Seller Visibility Card */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Seller Visibility</Text>
                <Text style={styles.sellerDescPremium}>
                    Control what the seller sees in their dashboard.
                </Text>

                <Pressable onPress={() => setAnonymizeLeads(!anonymizeLeads)} style={styles.visibilityRow}>
                    <Text style={styles.visibilityLabel}>Anonymize Leads</Text>
                    <MaterialCommunityIcons
                        name={anonymizeLeads ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={24}
                        color={anonymizeLeads ? currentColor : colors.textMuted}
                    />
                </Pressable>

                <Pressable onPress={() => setHideVisitorNames(!hideVisitorNames)} style={[styles.visibilityRow, { borderBottomWidth: 0, marginBottom: 15 }]}>
                    <Text style={styles.visibilityLabel}>Hide Visitor Names</Text>
                    <MaterialCommunityIcons
                        name={hideVisitorNames ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={24}
                        color={hideVisitorNames ? currentColor : colors.textMuted}
                    />
                </Pressable>

                <Pressable
                    style={[styles.pushReportBtn, { backgroundColor: currentColor }]}
                    onPress={() => Alert.alert('Success', 'Live performance report successfully pushed to seller!')}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                    <Text style={styles.pushReportBtnText}>Push Live Report to Seller</Text>
                </Pressable>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentTeal} />
                <Text style={styles.loadingText}>Loading event details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]}
                contentContainerStyle={{ backgroundColor: colors.surfaceSoft }}
            >
                {renderHero()}

                {renderTabs()}

                <View style={styles.mainContent}>
                    {activeTab === 'Overview' && renderOverview()}
                    {activeTab === 'Enquiries' && renderEnquiries()}
                    {activeTab === 'Automation' && renderAutomation()}
                    {activeTab === 'Assets & Design' && renderAssets()}
                    {activeTab === 'Settings' && renderSettings()}
                    {activeTab === 'Seller Report' && renderSellerReport()}
                </View>
                <View style={{ height: 160 }} />
            </ScrollView>

            {/* Overview bottom fixed action buttons */}
            {activeTab === 'Overview' && (
                <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.fixedBtnRow}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.overviewSecondaryBtn,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={async () => {
                                try {
                                    const { openBrowserAsync, WebBrowserPresentationStyle } = await import('expo-web-browser');
                                    await openBrowserAsync(checkInUrl, {
                                        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                                    });
                                } catch (e) {
                                    console.error('Failed to open browser:', e);
                                }
                            }}
                        >
                            <MaterialCommunityIcons name="open-in-new" size={15} color={colors.textPrimary} />
                            <Text style={styles.overviewSecondaryBtnText}>Open Public Check-In</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.overviewPrimaryBtn,
                                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => {
                                Alert.alert(
                                    "Coming Soon",
                                    "We are finalising Zien's dynamic sheet generation. Soon you will be able to export and print custom physical check-in sheets!"
                                );
                            }}
                        >
                            <Text style={styles.overviewPrimaryBtnText}>Generate Sheet</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Settings bottom fixed action buttons ( Cancel / Save Changes ) */}
            {activeTab === 'Settings' && (
                <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.fixedBtnRow}>
                        <OutlineButton
                            title="Cancel"
                            onPress={() => setActiveTab('Overview')}
                            style={styles.fixedSecondaryBtn}
                            textStyle={styles.fixedBtnText}
                        />
                        <GradientButton
                            title="Save Changes"
                            isLoading={updateMutation.isPending}
                            onPress={handleSaveChanges}
                            colors={[currentColor, currentColor]}
                            style={styles.fixedPrimaryBtnHalf}
                            textStyle={styles.fixedBtnText}
                        />
                    </View>
                </View>
            )}

            {/* Lead Intelligence Details Modal bottom sheet */}
            <Modal visible={!!selectedVisitor} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedVisitor(null)}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                        <View style={styles.modalHandle} />
                        {selectedVisitor && (
                            <View>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalAvatar, { backgroundColor: currentColor }]}>
                                        <Text style={styles.modalAvatarText}>{(selectedVisitor.name || 'A')[0].toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalName}>{selectedVisitor.name || 'Anonymous'}</Text>
                                        <Text style={styles.modalEmail}>{selectedVisitor.email || 'No email'}</Text>
                                    </View>
                                    <Pressable onPress={() => setSelectedVisitor(null)} hitSlop={10}>
                                        <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
                                    </Pressable>
                                </View>
                                <View style={styles.intelGrid}>
                                    <View style={styles.intelCard}>
                                        <Text style={styles.intelLabel}>SIGNALS</Text>
                                        <Text style={[styles.intelVal, { color: (selectedVisitor.signal || '').toLowerCase() === 'hot' ? '#F43F5E' : currentColor }]}>
                                            {(selectedVisitor.signal || 'Exploring').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.intelCard}>
                                        <Text style={styles.intelLabel}>PRE-APPROVED</Text>
                                        <Text style={[styles.intelVal, { color: (selectedVisitor.preApproved || '').toLowerCase() === 'yes' ? '#10B981' : '#F43F5E' }]}>
                                            {(selectedVisitor.preApproved || 'No').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.intelCardFull}>
                                    <Text style={styles.intelLabel}>KEY DETAILS & TIMELINE</Text>
                                    <Text style={styles.intelValSmall}>
                                        Timeline: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{selectedVisitor.timeline || 'Immediate'}</Text>
                                    </Text>
                                    <Text style={[styles.intelValSmall, { marginTop: 6 }]}>
                                        Phone: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{formatPhoneNumber(selectedVisitor.phone) || 'No phone provided'}</Text>
                                    </Text>
                                </View>
                                <Pressable style={[styles.modalActionBtn, { backgroundColor: currentColor }]} android_ripple={{ color: 'rgba(255,255,255,0.15)' }}>
                                    <Text style={styles.modalActionText}>Push to Zien CRM</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </Pressable>
            </Modal>

            {/* Active Automation Sequence Selection Modal */}
            <Modal visible={showSequenceDropdown} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setShowSequenceDropdown(false)}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalHeaderTitle}>Select Follow-up Sequence</Text>
                        {[
                            'Open House: Instant Digital Portfolio',
                            'Luxury Listing: VIP Walkthrough Nurture',
                            'Drip: 7-Day Market Insights',
                            'None (Manual Follow-up Only)'
                        ].map((seq) => {
                            const isSelected = seq === activeSequence;
                            return (
                                <Pressable
                                    key={seq}
                                    style={[
                                        styles.sequenceOptionRow,
                                        isSelected && { backgroundColor: currentColor + '08', borderColor: currentColor + '40' }
                                    ]}
                                    onPress={() => {
                                        setActiveSequence(seq);
                                        setShowSequenceDropdown(false);
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            styles.sequenceOptionText,
                                            isSelected && { color: currentColor, fontWeight: '700' }
                                        ]}>
                                            {seq}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <MaterialCommunityIcons name="check" size={20} color={currentColor} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSoft },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSoft },
    loadingText: { marginTop: 12, color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
    header: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.surfaceSoft, zIndex: 2000 },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    headerCircleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    headerStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    headerStatusText: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 },
    heroSection: { height: 280, position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%' },
    heroContent: { position: 'absolute', bottom: 35, left: 20, right: 20 },
    heroPriceBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
    heroPriceText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    heroAddressText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 15 },
    heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroMetaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    heroMetaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
    counterBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    counterText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    kpiBelt: { flexDirection: 'row', backgroundColor: colors.cardBackground, marginHorizontal: 20, marginTop: -30, borderRadius: 24, padding: 25, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8, alignItems: 'center', justifyContent: 'space-around', zIndex: 10 },
    beltItem: { alignItems: 'center' },
    beltVal: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
    beltLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 6, letterSpacing: 0.5 },
    beltDivider: { width: 1, height: 35, backgroundColor: colors.cardBorder },
    tabBarContainer: { backgroundColor: colors.surfaceSoft, zIndex: 1000, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4 },
    tabsScroll: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 15, gap: 30, backgroundColor: colors.surfaceSoft },
    tabItem: { paddingBottom: 10, position: 'relative' },
    tabItemActive: {},
    tabText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
    tabTextActive: { color: colors.textPrimary },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 1.5 },
    mainContent: { paddingHorizontal: 20, paddingTop: 25, backgroundColor: colors.surfaceSoft },
    tabContentPremium: { gap: 24 },
    kpiRow: { flexDirection: 'row', gap: 15 },
    kpiCard: { flex: 1, borderRadius: 20, padding: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder },
    kpiIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    kpiValue: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
    kpiLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 4, letterSpacing: 0.6 },
    // ── Property Info Card ──
    propInfoCard: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.cardBorder },
    propDateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    propDateBox: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    propDateText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
    propTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    propTimeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    propPrice: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
    propStreet: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, lineHeight: 26 },
    propCityState: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginTop: 3, marginBottom: 18 },
    propSpecsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
    propSpecBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
    propSpecText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    propDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '500', marginTop: 14 },
    // ── Live Stats Card ──
    liveStatsCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    liveStatsHeader: {
        fontSize: 17,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    statsGridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statGridCellItem: {
        flex: 1,
        backgroundColor: colors.surfaceSoft,
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    statGridValueText: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    statGridLabelText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        marginTop: 6,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    hotScoreCellItem: {
        borderWidth: 1.5,
    },
    // ── QR Dark Card ──
    qrDarkCard: { backgroundColor: '#0B2D3E', borderRadius: 24, padding: 24, alignItems: 'center' },
    qrDarkTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5, marginBottom: 4 },
    qrDarkSub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2, marginBottom: 20 },
    qrDarkCode: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 20 },
    qrDarkBtnsRow: { flexDirection: 'row', width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    qrDarkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.1)' },
    qrDarkBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    qrDarkBtnDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    // ── Agent Card extras ──
    agentCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    agentCardHeader: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
    qrHeroPremium: { flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, alignItems: 'center', gap: 20, borderWidth: 1, borderColor: colors.cardBorder },
    qrHeroDetails: { flex: 1 },
    qrHeroTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    qrHeroSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    qrShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 15 },
    qrShareBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    qrContainerPremium: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 16 },
    qrActionsRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
    qrActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    qrActionBtnPrimary: { backgroundColor: '#0B2D3E', borderColor: '#0B2D3E' },
    qrActionBtnSecondary: { backgroundColor: colors.surfaceSoft, borderColor: colors.cardBorder },
    qrActionBtnText: { fontSize: 13, fontWeight: '800' },
    qrActionBtnTextPrimary: { color: '#FFFFFF' },
    qrActionBtnTextSecondary: { color: colors.textPrimary },
    sectionHeaderPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
    sectionTitlePremium: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    sectionLinkPremium: { fontSize: 13, fontWeight: '800' },
    activityFeed: { gap: 15, position: 'relative' },
    timelineConnector: { position: 'absolute', left: 34, top: 22, bottom: 22, width: 2, zIndex: 1 },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, zIndex: 2 },
    timelineDot: { position: 'absolute', left: -10, top: '50%', marginTop: -5, width: 10, height: 10, borderRadius: 5, zIndex: 3, borderWidth: 2, borderColor: '#FFFFFF' },
    activityAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    activityAvatarText: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
    activityInfo: { flex: 1, marginLeft: 15 },
    activityTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    activityTime: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    activitySignal: { width: 10, height: 10, borderRadius: 5 },
    emptyActivityBox: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.cardBackground, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.cardBorder },
    emptyActivityText: { fontSize: 14, color: colors.textMuted, fontWeight: '700' },
    visitorCardPremium: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: colors.cardBorder },
    vCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    vAvatarBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    vAvatarText: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    vInfoBox: { flex: 1 },
    vNameText: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
    vEmailText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    vSignalBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    vSignalText: { fontSize: 10, fontWeight: '900' },
    vCardStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.surfaceSoft, gap: 18 },
    vStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vStatText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    vTimeText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    premiumCard: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20 },
    premiumCardHeader: { fontSize: 19, fontWeight: '900', color: colors.textPrimary, marginBottom: 25 },
    automationSelector: { marginBottom: 24, position: 'relative', zIndex: 100 },
    selectorLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
    selectorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSoft, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.cardBorder },
    selectorValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    selectorHint: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 18, fontWeight: '500' },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    sequenceOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    sequenceOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    templatePreviewCard: { backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
    templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    templateBadge: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.5 },
    editBuilderLink: { padding: 4 },
    editBuilderText: { fontSize: 11, fontWeight: '800' },
    templateSubject: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    templateBody: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
    attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    attachmentIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    attachmentsCount: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
    ghostTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    ghostSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18, fontWeight: '500' },
    rulesList: { gap: 15 },
    ruleRowPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSoft, padding: 16, borderRadius: 18 },
    ruleInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 },
    ruleLabelPremium: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
    specsContainer: { gap: 15, marginBottom: 24 },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    specLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    specValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    aiDescriptionBox: { backgroundColor: colors.surfaceSoft, padding: 20, borderRadius: 18, marginTop: 20 },
    aiDescriptionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 10 },
    aiDescriptionText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22, fontWeight: '500', fontStyle: 'italic' },
    pdfExportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 20 },
    pdfExportText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    galleryGridPremium: { gap: 16 },
    galleryItemPremium: { width: '100%', height: 180, borderRadius: 18, overflow: 'hidden' },
    galleryImgPremium: { width: '100%', height: '100%' },
    addMediaBtn: { width: '100%', height: 120, borderRadius: 18, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8 },
    addMediaText: { fontSize: 12, fontWeight: '900' },
    formField: { marginBottom: 20 },
    formLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
    formInputWrap: { backgroundColor: colors.surfaceSoft, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 14, height: 48, justifyContent: 'center' },
    formInput: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, padding: 0 },
    preferencesList: { gap: 16 },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    preferenceTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    preferenceDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    downloadQrBtnFilled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentTeal, borderRadius: 14, paddingVertical: 14, marginTop: 20 },
    downloadQrTextFilled: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    dataVerticalList: {
        gap: 12,
    },
    dataListItemPremium: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceSoft,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    dataListItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 10,
    },
    dataListItemTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    dataListItemBtn: {
        backgroundColor: colors.cardBackground,
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataListItemBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    dangerCard: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
    dangerText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '500', marginBottom: 20 },
    deleteEventBtnPremium: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteEventTextPremium: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '800',
    },
    sellerDescPremium: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '500', marginBottom: 20 },
    actionBtnPrimaryPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 18, paddingVertical: 18, marginTop: 25 },
    actionBtnTextPremium: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    sellerReportHeader: { alignItems: 'center', marginBottom: 25 },
    sellerReportTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 },
    sellerReportSubtitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, marginTop: 4, letterSpacing: 0.8 },
    sellerKpiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, marginBottom: 25 },
    sellerKpiItem: { alignItems: 'center', flex: 1 },
    sellerKpiVal: { fontSize: 24, fontWeight: '900', color: colors.textPrimary },
    sellerKpiLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 6, letterSpacing: 0.5, textAlign: 'center' },
    sellerKpiDivider: { width: 1, height: 35, backgroundColor: colors.cardBorder },
    sentimentTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 18 },
    sentimentItem: { marginBottom: 18 },
    sentimentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    sentimentLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    sentimentValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    progressBarTrack: { height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    visibilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceSoft },
    visibilityLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    pushReportBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
    pushReportBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    agentCardPremium: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.cardBorder },
    agentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
    agentAvatarBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    agentAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    agentNameBox: { flex: 1 },
    agentNamePremium: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(13, 148, 136, 0.08)' },
    verifiedText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    agentTitlePremium: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
    agentContactPremium: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 18 },
    contactItemPremium: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    contactTextPremium: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 30 },
    modalHandle: { width: 44, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 30 },
    modalAvatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    modalAvatarText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
    modalName: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
    modalEmail: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    intelGrid: { flexDirection: 'row', gap: 18, marginBottom: 18 },
    intelCard: { flex: 1, backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.cardBorder },
    intelCardFull: { backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 30 },
    intelLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 10 },
    intelVal: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    intelValSmall: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, lineHeight: 20 },
    modalActionBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
    modalActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    fixedBottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.cardBackground,
        borderTopWidth: 1,
        borderColor: colors.cardBorder,
        paddingHorizontal: 18,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
    },
    fixedBtnRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    fixedPrimaryBtnHalf: {
        flex: 1,
        height: 54,
    },
    fixedSecondaryBtn: {
        flex: 1,
        height: 54,
        paddingVertical: 0,
    },
    fixedBtnText: {
        fontSize: 13.5,
    },
    overviewSecondaryBtn: {
        flex: 3,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        backgroundColor: colors.surfaceSoft,
    },
    overviewSecondaryBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    overviewPrimaryBtn: {
        flex: 2,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 13,
        backgroundColor: colors.accentTeal,
    },
    overviewPrimaryBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});