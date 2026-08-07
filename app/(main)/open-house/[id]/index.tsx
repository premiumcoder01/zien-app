import GradientButton from '@/components/ui/GradientButton';
import OutlineButton from '@/components/ui/OutlineButton';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { deleteOpenHouse, getOpenHouseById, triggerOpenHouseAction, updateOpenHouse } from '@/services/openHouseService';
import { extractPropertyBaths, extractPropertyBeds, extractPropertySqft, formatPropertyPrice, getAllPropertyImages } from '@/services/propertyService';
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
    const eventBeds = extractPropertyBeds(pData, 'N/A');
    const eventBaths = extractPropertyBaths(pData, 'N/A');
    const eventSqft = extractPropertySqft(pData, 'N/A');
    const agentName = openHouseData?.agent_details?.name || 'Agent Name';
    const agentTitle = [openHouseData?.agent_details?.brokerage, openHouseData?.agent_details?.license ? `License: ${openHouseData.agent_details.license}` : ''].filter(Boolean).join(' | ') || 'Real Estate Professional';
    const agentEmail = openHouseData?.agent_details?.email || 'email@example.com';
    const agentPhone = openHouseData?.agent_details?.phone || '';

    const getLeadStatusBadge = (visitor: any): { label: string; bg: string; text: string } => {
        if (!visitor) return { label: 'EXPLORING', bg: '#F1F5F9', text: '#475569' };

        const sig = String(visitor.signal || visitor.status || visitor.lead_type || visitor.type || '').toLowerCase();
        const isExplicitHot = visitor.is_hot || visitor.isHot || visitor.hot_lead || visitor.hotLead || visitor.is_hot_lead || sig.includes('hot');

        const rawScore = String(visitor.score || visitor.lead_score || visitor.score_display || '0');
        const scoreVal = parseInt(rawScore.replace(/[^0-9]/g, ''), 10);

        const isImmediate = (visitor.timeline || '').toLowerCase().includes('immediate');
        const isPreApproved = (visitor.preApproved || visitor.pre_approved || '').toString().toLowerCase() === 'yes';

        if (isExplicitHot || scoreVal >= 70 || (isImmediate && isPreApproved)) {
            return { label: '🔥 HOT LEAD', bg: '#FFE4E6', text: '#E11D48' };
        }
        if (sig.includes('warm') || (scoreVal >= 40 && scoreVal < 70) || isImmediate || isPreApproved) {
            return { label: '⚡ WARM LEAD', bg: '#FEF3C7', text: '#D97706' };
        }
        return { label: (visitor.signal || '❄️ COLD LEAD').toUpperCase(), bg: '#F1F5F9', text: '#475569' };
    };

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
    const [automationRules, setAutomationRules] = useState({ crm: true, alert: true, email24: true, similar3d: true, ghost: true });
    const [activeSequence, setActiveSequence] = useState('Standard Open House Welcome + Property Kit');
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
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [activeActionLoading, setActiveActionLoading] = useState<string | null>(null);

    const handleTriggerAction = async (actionType: string, visitorEmail: string, successMessage: string) => {
        if (!accessToken || !id || !visitorEmail) {
            Alert.alert('Error', 'Missing required details for this action.');
            return;
        }

        setActiveActionLoading(actionType);
        try {
            const res = await triggerOpenHouseAction(accessToken, id as string, visitorEmail, actionType);
            Alert.alert('Success', res?.message || successMessage);
        } catch (err: any) {
            console.error('Trigger action error:', err);
            Alert.alert('Action Failed', err.message || 'Failed to trigger action. Please try again.');
        } finally {
            setActiveActionLoading(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        setIsDownloadingPdf(true);
        try {
            const pdfUrl = `https://staging.zien.ai/open-house/${id}/pdf`;
            const filename = `open-house-${id}-brochure.pdf`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);

            if (downloadResult.status === 200) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Download Open House Brochure PDF',
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('PDF Downloaded', `PDF file saved successfully to your device.`);
                }
            } else {
                throw new Error(`Server returned status ${downloadResult.status}`);
            }
        } catch (error: any) {
            console.error('PDF download error:', error);
            try {
                const { openBrowserAsync, WebBrowserPresentationStyle } = await import('expo-web-browser');
                await openBrowserAsync(`https://staging.zien.ai/open-house/${id}/pdf`, {
                    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
                });
            } catch (_) {
                Alert.alert('Download Failed', 'Could not download PDF. Please try again.');
            }
        } finally {
            setIsDownloadingPdf(false);
        }
    };

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
        } else if (openHouseData?.property) {
            const extracted = getAllPropertyImages(openHouseData.property);
            if (extracted.length > 0) {
                setPropertyPhotos(extracted);
            }
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

    const handleToggleSetting = async (key: string, val: boolean) => {
        let newRealtime = notifRealtime;
        let newHotLead = notifHotLead;
        let newEmailSummary = notifEmailSummary;
        let newEnableCheckIn = qrEnableCheckIn;
        let newRequireEmail = qrRequireEmail;
        let newRequirePhone = qrRequirePhone;

        if (key === 'realtimeAlerts') { setNotifRealtime(val); newRealtime = val; }
        else if (key === 'hotLeadAlerts') { setNotifHotLead(val); newHotLead = val; }
        else if (key === 'emailSummaries') { setNotifEmailSummary(val); newEmailSummary = val; }
        else if (key === 'enableCheckIn') { setQrEnableCheckIn(val); newEnableCheckIn = val; }
        else if (key === 'requireEmail') { setQrRequireEmail(val); newRequireEmail = val; }
        else if (key === 'requirePhone') { setQrRequirePhone(val); newRequirePhone = val; }

        if (!accessToken || !id) return;

        try {
            await updateOpenHouse(accessToken, id as string, {
                settings: {
                    enableCheckIn: newEnableCheckIn,
                    requireEmail: newRequireEmail,
                    requirePhone: newRequirePhone,
                    realtimeAlerts: newRealtime,
                    hotLeadAlerts: newHotLead,
                    emailSummaries: newEmailSummary,
                }
            });
            queryClient.invalidateQueries({ queryKey: ['open-house', id] });
        } catch (err: any) {
            console.error('Failed to update settings toggle:', err);
        }
    };

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
            settings: {
                enableCheckIn: qrEnableCheckIn,
                requireEmail: qrRequireEmail,
                requirePhone: qrRequirePhone,
                realtimeAlerts: notifRealtime,
                hotLeadAlerts: notifHotLead,
                emailSummaries: notifEmailSummary,
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

    const handleExportVisitorsCsv = async () => {
        const enquiries = openHouseData?.enquiries || [];
        if (enquiries.length === 0) {
            Alert.alert("No Visitors", "There are no visitor check-ins to export yet.");
            return;
        }

        try {
            const headers = ["Name", "Email", "Phone", "Lead Status", "Timeline", "Pre-Approved", "Budget", "Lead Score", "Check-in Date"];
            const rows = enquiries.map((v: any) => {
                const badge = getLeadStatusBadge(v);
                return [
                    `"${(v.name || 'Anonymous').replace(/"/g, '""')}"`,
                    `"${(v.email || '').replace(/"/g, '""')}"`,
                    `"${(v.phone || '').replace(/"/g, '""')}"`,
                    `"${badge.label.replace('🔥 ', '').replace('⚡ ', '').replace('❄️ ', '')}"`,
                    `"${(v.timeline || 'Immediate').replace(/"/g, '""')}"`,
                    `"${(v.preApproved || v.pre_approved || 'Yes').replace(/"/g, '""')}"`,
                    `"${(v.budget || 'Under $300k').replace(/"/g, '""')}"`,
                    `"${v.score || v.lead_score || '85/100'}"`,
                    `"${v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}"`
                ].join(',');
            });

            const csvString = [headers.join(','), ...rows].join('\n');
            const fileUri = `${FileSystem.documentDirectory}open_house_visitors_${id || 'event'}.csv`;

            await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Download Visitors CSV' });
        } catch (error: any) {
            console.error('Export CSV Error:', error);
            Alert.alert('Export Error', 'Failed to generate CSV file. Please try again.');
        }
    };

    const handleDownloadQRCode = async () => {
        try {
            if (qrRef.current && typeof qrRef.current.toDataURL === 'function') {
                qrRef.current.toDataURL(async (data: string) => {
                    try {
                        const filePath = `${FileSystem.documentDirectory}qrcode-${id || 'event'}.png`;
                        await FileSystem.writeAsStringAsync(filePath, data, { encoding: FileSystem.EncodingType.Base64 });
                        await Sharing.shareAsync(filePath, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Download QR Code' });
                    } catch (e) {
                        console.error('Error saving via dataURL:', e);
                        fallbackDownload();
                    }
                });
            } else {
                await fallbackDownload();
            }
        } catch (err) {
            console.error('QR download error:', err);
            fallbackDownload();
        }

        async function fallbackDownload() {
            try {
                const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(checkInUrl)}`;
                const filePath = `${FileSystem.documentDirectory}qrcode-${id || 'event'}.png`;
                const downloadResult = await FileSystem.downloadAsync(qrApiUrl, filePath);
                await Sharing.shareAsync(downloadResult.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Download QR Code' });
            } catch (fallbackErr) {
                console.error('Fallback QR download error:', fallbackErr);
                Alert.alert('Download Failed', 'Could not download QR code. Please try again.');
            }
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
                    const badge = getLeadStatusBadge(visitor);
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
                                <View style={[styles.vSignalBadge, { backgroundColor: badge.bg }]}>
                                    <Text style={[styles.vSignalText, { color: badge.text }]}>
                                        {badge.label}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.vCardStats}>
                                <View style={styles.vStatItem}>
                                    <MaterialCommunityIcons name="timeline-outline" size={14} color={colors.textMuted} />
                                    <Text style={styles.vStatText}>{visitor.timeline || 'Exploring'}</Text>
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
            {/* Immediate Welcome Email (Triggered on Scan) */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Immediate Welcome Email (Triggered on Scan)</Text>
                <View style={styles.automationSelector}>
                    <Text style={styles.selectorLabel}>ACTIVE AUTOMATION SEQUENCE</Text>
                    <Pressable style={styles.selectorBox} onPress={() => setShowSequenceDropdown(true)}>
                        <Text style={styles.selectorValue} numberOfLines={1}>{activeSequence}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.selectorHint}>This email sequence is sent instantly when a visitor checks in via QR Code.</Text>
                </View>

                {/* TEMPLATE PREVIEW */}
                <View style={styles.templatePreviewCard}>
                    <View style={styles.templateHeader}>
                        <Text style={styles.templateBadge}>TEMPLATE PREVIEW</Text>
                        <Pressable style={styles.editBuilderLink} onPress={() => router.push('/(main)/crm/templates' as any)}>
                            <Text style={[styles.editBuilderText, { color: '#2563EB' }]}>EDIT INLINE</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.templateSubject}>{"\"Thank you for visiting {{property_address}}!\""}</Text>
                    <View style={{ gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 20 }}>
                            Hi {"{{first_name}}"},
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 20 }}>
                            It was great meeting you today! As promised, I've included the complete property overview, photos, and my contact details below so you have everything in one place.
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 20 }}>
                            Let me know if you'd like to schedule a private second showing!
                        </Text>
                    </View>
                </View>
            </View>

            {/* Smart Post-Event Workflows (Timers) */}
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Smart Post-Event Workflows (Timers)</Text>
                <Text style={[styles.selectorHint, { marginTop: -15, marginBottom: 18 }]}>
                    These actions run automatically in the background after the Open House based on the visitor's interactions and time elapsed.
                </Text>

                <View style={styles.rulesList}>
                    {[
                        { id: 'crm', label: "Sync to CRM & Apply 'Open House' Tag", icon: 'chart-line-variant' },
                        { id: 'alert', label: "Agent Alert: VIP / Hot Lead Detection", icon: 'fire' },
                        { id: 'email24', label: "Send 24-Hour Feedback Request Email", icon: 'email-outline' },
                        { id: 'similar3d', label: "Send 3-Day Similar Listing Matches Email", icon: 'home-city-outline' },
                        { id: 'ghost', label: "Activate 'Ghost Protocol' (30-Day Inactive Re-Engagement)", icon: 'shield-account-outline' },
                    ].map((rule) => (
                        <View key={rule.id} style={styles.ruleRowPremium}>
                            <View style={styles.ruleInfoRow}>
                                <MaterialCommunityIcons name={rule.icon as any} size={20} color={colors.textSecondary} />
                                <Text style={styles.ruleLabelPremium}>{rule.label}</Text>
                            </View>
                            <Switch
                                value={!!(automationRules as any)[rule.id]}
                                onValueChange={(val) => setAutomationRules(prev => ({ ...prev, [rule.id]: val }))}
                                trackColor={{ false: '#CBD5E1', true: '#0B2D3E' }}
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
                            onValueChange={(val) => handleToggleSetting('realtimeAlerts', val)}
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
                            onValueChange={(val) => handleToggleSetting('hotLeadAlerts', val)}
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
                            onValueChange={(val) => handleToggleSetting('emailSummaries', val)}
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
                            onValueChange={(val) => handleToggleSetting('enableCheckIn', val)}
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
                            onValueChange={(val) => handleToggleSetting('requireEmail', val)}
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
                            onValueChange={(val) => handleToggleSetting('requirePhone', val)}
                            trackColor={{ false: '#E2E8F0', true: currentColor }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>
                <Pressable
                    style={[styles.modalActionBtn, { backgroundColor: '#0B2D3E', marginTop: 18, flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    onPress={handleDownloadQRCode}
                >
                    <MaterialCommunityIcons name="qrcode-scan" size={18} color="#FFFFFF" />
                    <Text style={styles.modalActionText}>Download QR Code</Text>
                </Pressable>
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
                            onPress={handleExportVisitorsCsv}
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

    const renderSellerReport = () => {
        const totalVisitorsCount = (openHouseData?.enquiries || []).length;
        const hotLeadsCount = (openHouseData?.enquiries || []).filter((v: any) => getLeadStatusBadge(v).label.includes('HOT')).length;
        const hotLeadRatioStr = totalVisitorsCount > 0 
            ? `${Math.round((hotLeadsCount / totalVisitorsCount) * 100)}%` 
            : '100%';

        const bannerImg = propertyPhotos[0] || PLACEHOLDER_IMAGE;

        return (
            <View style={styles.tabContentPremium}>
                {/* Dark Hero Banner matching Web */}
                <View style={styles.sellerBannerCard}>
                    <Image source={{ uri: bannerImg }} style={styles.sellerBannerImg} />
                    <View style={styles.sellerBannerOverlay}>
                        <Text style={styles.sellerBannerTag}>SELLER PERFORMANCE REPORT</Text>
                        <Text style={styles.sellerBannerTitle} numberOfLines={1}>{streetAddress || eventAddress}</Text>
                        <Text style={styles.sellerBannerSub}>Live Event Statistics & Feedback</Text>
                    </View>
                </View>

                {/* 3 KPI Cards Grid matching Web */}
                <View style={styles.kpiCardsGrid}>
                    <View style={styles.kpiCardItem}>
                        <View style={styles.kpiCardHeaderRow}>
                            <View style={styles.kpiIconBox}>
                                <MaterialCommunityIcons name="account-group-outline" size={18} color={colors.textSecondary} />
                            </View>
                        </View>
                        <Text style={styles.kpiCardLabel}>TOTAL VISITORS</Text>
                        <Text style={styles.kpiCardValue}>{totalVisitorsCount || eventVisitors || 2}</Text>
                    </View>

                    <View style={styles.kpiCardItem}>
                        <View style={styles.kpiCardHeaderRow}>
                            <View style={styles.kpiIconBox}>
                                <MaterialCommunityIcons name="trending-up" size={18} color={colors.textSecondary} />
                            </View>
                        </View>
                        <Text style={styles.kpiCardLabel}>HOT LEAD RATIO</Text>
                        <Text style={styles.kpiCardValue}>{hotLeadRatioStr}</Text>
                    </View>

                    <View style={styles.kpiCardItem}>
                        <View style={styles.kpiCardHeaderRow}>
                            <View style={styles.kpiIconBox}>
                                <MaterialCommunityIcons name="target" size={18} color={colors.textSecondary} />
                            </View>
                        </View>
                        <Text style={styles.kpiCardLabel}>HOT LEADS</Text>
                        <Text style={styles.kpiCardValue}>{hotLeadsCount || eventHotLeads || 2}</Text>
                    </View>
                </View>
            </View>
        );
    };

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
                                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                                isDownloadingPdf && { opacity: 0.7 }
                            ]}
                            disabled={isDownloadingPdf}
                            onPress={handleDownloadPdf}
                        >
                            {isDownloadingPdf ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="file-pdf-box" size={16} color="#FFF" />
                                    <Text style={styles.overviewPrimaryBtnText}>Generate (PDF)</Text>
                                </>
                            )}
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
                    <Pressable style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24), maxHeight: '90%' }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        {selectedVisitor && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                {/* Modal Header */}
                                <View style={styles.modalHeaderRow}>
                                    <View style={[styles.modalAvatar, { backgroundColor: currentColor }]}>
                                        <Text style={styles.modalAvatarText}>{(selectedVisitor.name || 'A')[0].toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <Text style={styles.modalName}>{selectedVisitor.name || 'Anonymous'}</Text>
                                            {(() => {
                                                const badge = getLeadStatusBadge(selectedVisitor);
                                                return (
                                                    <View style={[styles.vSignalBadge, { backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }]}>
                                                        <Text style={[styles.vSignalText, { color: badge.text, fontSize: 10, fontWeight: '800' }]}>
                                                            {badge.label}
                                                        </Text>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                        <Text style={[styles.modalEmail, { marginTop: 2 }]}>
                                            {selectedVisitor.email || ''}
                                        </Text>
                                        {selectedVisitor.phone ? (
                                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3, fontWeight: '600' }}>
                                                📞 {formatPhoneNumber(selectedVisitor.phone)}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable onPress={() => setSelectedVisitor(null)} hitSlop={10}>
                                        <MaterialCommunityIcons name="close-circle" size={26} color={colors.textMuted} />
                                    </Pressable>
                                </View>

                                {/* VISITOR CONTEXT CARD */}
                                <View style={styles.contextCard}>
                                    <Text style={styles.contextCardTitle}>VISITOR CONTEXT</Text>
                                    
                                    <View style={styles.contextRow}>
                                        <Text style={styles.contextLabel}>Timeline</Text>
                                        <Text style={styles.contextValue}>{selectedVisitor.timeline || 'Immediate'}</Text>
                                    </View>
                                    
                                    <View style={styles.contextRow}>
                                        <Text style={styles.contextLabel}>Pre-Approved</Text>
                                        <Text style={[
                                            styles.contextValue,
                                            { color: (selectedVisitor.preApproved || selectedVisitor.pre_approved || '').toString().toLowerCase() === 'yes' ? '#10B981' : '#F43F5E' }
                                        ]}>
                                            {(selectedVisitor.preApproved || selectedVisitor.pre_approved || 'Yes').toUpperCase()}
                                        </Text>
                                    </View>

                                    <View style={styles.contextRow}>
                                        <Text style={styles.contextLabel}>Budget</Text>
                                        <Text style={styles.contextValue}>{selectedVisitor.budget || 'Under $300k'}</Text>
                                    </View>

                                    <View style={styles.contextRow}>
                                        <Text style={styles.contextLabel}>Lead Score</Text>
                                        <Text style={[styles.contextValue, { color: currentColor, fontWeight: '900' }]}>
                                            {selectedVisitor.score || selectedVisitor.lead_score || '85/100'}
                                        </Text>
                                    </View>

                                    <Pressable
                                        style={styles.crmLinkBtn}
                                        onPress={() => {
                                            setSelectedVisitor(null);
                                            router.push('/(main)/crm/leads' as any);
                                        }}
                                    >
                                        <Text style={styles.crmLinkText}>View Full Profile & Notes in CRM</Text>
                                        <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textSecondary} />
                                    </Pressable>
                                </View>

                                {/* SMART FOLLOW-UP CARD */}
                                <View style={styles.smartFollowupCard}>
                                    <Text style={styles.contextCardTitle}>SMART FOLLOW-UP</Text>

                                    <Pressable
                                        style={[styles.smartBtnPrimary, activeActionLoading === 'analysis' && { opacity: 0.7 }]}
                                        disabled={activeActionLoading !== null}
                                        onPress={() => handleTriggerAction('analysis', selectedVisitor.email, 'Investment Analysis generated and sent successfully!')}
                                    >
                                        {activeActionLoading === 'analysis' ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.smartBtnPrimaryText}>Send Investment Analysis</Text>
                                                <MaterialCommunityIcons name="magic-staff" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                                            </>
                                        )}
                                    </Pressable>

                                    <Pressable
                                        style={[styles.smartBtnOutline, activeActionLoading === 'showing' && { opacity: 0.7 }]}
                                        disabled={activeActionLoading !== null}
                                        onPress={() => handleTriggerAction('showing', selectedVisitor.email, 'Private showing invitation sent via email.')}
                                    >
                                        {activeActionLoading === 'showing' ? (
                                            <ActivityIndicator size="small" color={colors.textPrimary} />
                                        ) : (
                                            <Text style={styles.smartBtnOutlineText}>Schedule Private Showing</Text>
                                        )}
                                    </Pressable>

                                    <Pressable
                                        style={[styles.smartBtnOutline, activeActionLoading === 'similar' && { opacity: 0.7 }]}
                                        disabled={activeActionLoading !== null}
                                        onPress={() => handleTriggerAction('similar', selectedVisitor.email, '3 Similar listings found and emailed to lead.')}
                                    >
                                        {activeActionLoading === 'similar' ? (
                                            <ActivityIndicator size="small" color={colors.textPrimary} />
                                        ) : (
                                            <Text style={styles.smartBtnOutlineText}>Send Similar Listings</Text>
                                        )}
                                    </Pressable>
                                </View>

                                {/* CRM Navigation Action */}
                                <Pressable
                                    style={[styles.modalActionBtn, { backgroundColor: '#0B2D3E', marginTop: 6 }]}
                                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                                    onPress={() => {
                                        setSelectedVisitor(null);
                                        router.push('/(main)/crm/leads' as any);
                                    }}
                                >
                                    <Text style={styles.modalActionText}>View Full Profile & Notes in CRM</Text>
                                </Pressable>
                            </ScrollView>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Active Automation Sequence Selection Modal */}
            <Modal visible={showSequenceDropdown} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setShowSequenceDropdown(false)}>
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalHeaderTitle}>Select Follow-up Sequence</Text>
                        {[
                            'Standard Open House Welcome + Property Kit',
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
    sellerBannerCard: { height: 150, borderRadius: 24, overflow: 'hidden', marginBottom: 16, position: 'relative' },
    sellerBannerImg: { width: '100%', height: '100%' },
    sellerBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.72)', padding: 20, justifyContent: 'center' },
    sellerBannerTag: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
    sellerBannerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
    sellerBannerSub: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },
    kpiCardsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    kpiCardItem: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
    kpiCardHeaderRow: { marginBottom: 10 },
    kpiIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    kpiCardLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
    kpiCardValue: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
    sellerReportHeader: { marginBottom: 20 },
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
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    contextCard: { backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 },
    contextCardTitle: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 12, textTransform: 'uppercase' },
    contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    contextLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    contextValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    crmLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 4 },
    crmLinkText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textDecorationLine: 'underline' },
    smartFollowupCard: { backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14, gap: 10 },
    smartBtnPrimary: { backgroundColor: '#0B2D3E', borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    smartBtnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    smartBtnOutline: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
    smartBtnOutlineText: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24 },
    modalHandle: { width: 44, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 30 },
    modalAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modalAvatarText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    modalName: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    modalEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
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