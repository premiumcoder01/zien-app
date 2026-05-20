import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getOpenHouseById } from '@/services/openHouseService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
    Share
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Overview', 'Visitors', 'Automation', 'Assets & Design', 'Settings', 'Seller Report'];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800';

function formatDate(dateStr: string): string {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12(timeStr: string): string {
    if (!timeStr) return 'TBD';
    const [h, m] = timeStr.split(':').map(Number);
    const am = h < 12;
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

export default function EventDashboardScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { id, mode } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { accessToken } = useAuth();

    const { data: openHouseData, isLoading } = useQuery({
        queryKey: ['open-house', id],
        queryFn: () => getOpenHouseById(accessToken || '', id as string),
        enabled: !!accessToken && !!id,
    });

    // Derived display values
    const eventAddress = openHouseData?.property?.address || 'Property Address';
    const eventId = openHouseData?.id ? `OH-${String(openHouseData.id).padStart(3, '0')}` : 'N/A';
    const eventVisitors = openHouseData?.visitors_count ?? 0;
    const eventHotLeads = openHouseData?.hot_leads_count ?? 0;
    const pData = openHouseData?.property?.data;

    const eventPrice = pData?.price || (pData?.ListPrice ? `$${Number(pData.ListPrice).toLocaleString()}` : 'N/A');
    const eventStatus = openHouseData?.status?.toUpperCase() || 'UPCOMING';
    const eventDescription = openHouseData?.ai_description || 'A premium real estate opportunity.';
    const eventBeds = pData?.beds || pData?.BedroomsTotal || 'N/A';
    const eventBaths = pData?.bathsFull || pData?.BathroomsFull || 'N/A';
    const eventSqft = pData?.sqft || pData?.LivingArea || 'N/A';
    const eventDate = openHouseData?.date ? formatDate(openHouseData.date) : 'TBD';
    const eventTime = openHouseData?.start_time && openHouseData?.end_time
        ? `${formatTime12(openHouseData.start_time)} - ${formatTime12(openHouseData.end_time)}`
        : 'TBD';
    const agentName = openHouseData?.agent_details?.name || 'Agent Name';
    const agentTitle = [openHouseData?.agent_details?.brokerage, openHouseData?.agent_details?.license ? `DRE# ${openHouseData.agent_details.license}` : ''].filter(Boolean).join(' | ') || 'Real Estate Professional';
    const agentEmail = openHouseData?.agent_details?.email || 'email@example.com';

    const [activeTab, setActiveTab] = useState('Overview');
    const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
    const [propertyPhotos, setPropertyPhotos] = useState<string[]>([]);
    const [automationRules, setAutomationRules] = useState({ tag: true, crm: true, alert: true, sms: false, dwell: true, ghost: true });
    const [activeSequence, setActiveSequence] = useState('Open House: Instant Digital Portfolio');
    const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);
    const [anonymizeLeads, setAnonymizeLeads] = useState(true);
    const [hideVisitorNames, setHideVisitorNames] = useState(false);

    useEffect(() => {
        if (openHouseData?.gallery_images?.length) {
            setPropertyPhotos(openHouseData.gallery_images);
        } else if (openHouseData?.property?.data?.Media?.length) {
            const mediaImages = openHouseData.property.data.Media.filter((m: any) => m.MediaURL).map((m: any) => m.MediaURL);
            setPropertyPhotos(mediaImages);
        }
    }, [openHouseData]);

    const handleAddPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });
        if (!result.canceled) setPropertyPhotos([...propertyPhotos, ...result.assets.map(a => a.uri)]);
    };

    const handleShare = async () => {
        const shareUrl = `http://18.219.170.119:3000/check-in/OH-${id}/`;
        try {
            await Share.share({
                message: `Check out the digital portfolio for ${eventAddress}: ${shareUrl}`,
                url: shareUrl,
                title: `Digital Portfolio - ${eventAddress}`,
            });
        } catch (error) {
            console.error('Error sharing portfolio:', error);
        }
    };

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerTop}>
                <Pressable onPress={() => router.back()} style={styles.headerCircleBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{eventAddress}</Text>
                    <View style={styles.headerStatusRow}>
                        <View style={[styles.liveDot, { backgroundColor: openHouseData?.status === 'live' ? '#10B981' : '#F59E0B' }]} />
                        <Text style={styles.headerStatusText}>{eventStatus}</Text>
                    </View>
                </View>
                <Pressable onPress={handleShare} style={styles.headerCircleBtn}>
                    <MaterialCommunityIcons name="share-variant-outline" size={22} color={colors.textPrimary} />
                </Pressable>
            </View>
        </View>
    );

    const renderHero = () => {
        const photos = propertyPhotos.length > 0 ? propertyPhotos : [PLACEHOLDER_IMAGE];
        return (
            <View style={styles.heroSection}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={StyleSheet.absoluteFill}
                >
                    {photos.map((photo, index) => (
                        <View key={index} style={{ width: SCREEN_WIDTH, height: 280 }}>
                            <Image
                                source={{ uri: photo }}
                                style={styles.heroImage}
                                contentFit="cover"
                                transition={1000}
                            />
                        </View>
                    ))}
                </ScrollView>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.heroGradient} />
                <View style={styles.heroContent}>
                    <View style={styles.heroPriceBadge}>
                        <Text style={styles.heroPriceText}>{eventPrice}</Text>
                    </View>
                    <Text style={styles.heroAddressText} numberOfLines={2}>{eventAddress}</Text>
                    <View style={styles.heroMetaRow}>
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="bed-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventBeds} Beds</Text>
                        </View>
                        <View style={styles.heroMetaDivider} />
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="bathtub-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventBaths} Baths</Text>
                        </View>
                        <View style={styles.heroMetaDivider} />
                        <View style={styles.heroMetaItem}>
                            <MaterialCommunityIcons name="vector-square" size={16} color="#FFFFFF" />
                            <Text style={styles.heroMetaText}>{eventSqft} Sqft</Text>
                        </View>
                    </View>
                </View>
                {photos.length > 1 && (
                    <View style={styles.carouselPagination}>
                        {photos.map((_, i) => (
                            <View key={i} style={styles.paginationDot} />
                        ))}
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
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        {activeTab === tab && <View style={styles.tabIndicator} />}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderOverview = () => (
        <View style={styles.tabContentPremium}>
            <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                    <View style={styles.kpiIconBox}><MaterialCommunityIcons name="account-group" size={20} color={colors.accentTeal} /></View>
                    <Text style={styles.kpiValue}>{eventVisitors}</Text>
                    <Text style={styles.kpiLabel}>TOTAL VISITORS</Text>
                </View>
                <View style={styles.kpiCard}>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}><MaterialCommunityIcons name="fire" size={20} color="#F43F5E" /></View>
                    <Text style={styles.kpiValue}>{eventHotLeads}</Text>
                    <Text style={styles.kpiLabel}>HOT LEADS</Text>
                </View>
            </View>

            <View style={styles.qrHeroPremium}>
                <View style={styles.qrHeroDetails}>
                    <Text style={styles.qrHeroTitle}>Event QR Code</Text>
                    <Text style={styles.qrHeroSub}>Scan to access digital portfolio</Text>
                    <Pressable onPress={handleShare} style={styles.qrShareBtn}><MaterialCommunityIcons name="share-variant" size={16} color="#FFFFFF" /><Text style={styles.qrShareBtnText}>Share Portfolio Link</Text></Pressable>
                </View>
                <View style={styles.qrContainerPremium}><QRCode value={`http://18.219.170.119:3000/check-in/OH-${id}/`} size={70} color="#0F172A" backgroundColor="transparent" /></View>
            </View>

            <View style={styles.sectionHeaderPremium}>
                <Text style={styles.sectionTitlePremium}>Live Activity Feed</Text>
                <Pressable onPress={() => setActiveTab('Visitors')}><Text style={styles.sectionLinkPremium}>View All</Text></Pressable>
            </View>

            <View style={styles.activityFeed}>
                {(openHouseData?.enquiries || []).length > 0 ? (openHouseData?.enquiries || []).slice(0, 3).map((v: any, i: number) => (
                    <View key={i} style={styles.activityItem}>
                        <View style={styles.activityAvatar}><Text style={styles.activityAvatarText}>{(v.name || 'A')[0].toUpperCase()}</Text></View>
                        <View style={styles.activityInfo}><Text style={styles.activityTitle}>{v.name || 'Anonymous'}</Text><Text style={styles.activityTime}>{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                        <View style={[styles.activitySignal, { backgroundColor: (v.signal || '').toLowerCase() === 'hot' ? '#F43F5E' : colors.accentTeal }]} />
                    </View>
                )) : (
                    <View style={styles.emptyActivityBox}><MaterialCommunityIcons name="radar" size={40} color={colors.textMuted} /><Text style={styles.emptyActivityText}>Waiting for visitors...</Text></View>
                )}
            </View>

            <View style={styles.agentCardPremium}>
                <View style={styles.agentInfoRow}>
                    <View style={styles.agentAvatarBox}><Text style={styles.agentAvatarText}>{agentName[0].toUpperCase()}</Text></View>
                    <View style={styles.agentNameBox}>
                        <Text style={styles.agentNamePremium}>{agentName}</Text>
                        <Text style={styles.agentTitlePremium}>{agentTitle}</Text>
                    </View>
                </View>
                <View style={styles.agentContactPremium}>
                    <View style={styles.contactItemPremium}><MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} /><Text style={styles.contactTextPremium}>{agentEmail}</Text></View>
                </View>
            </View>
        </View>
    );

    const renderVisitors = () => (
        <View style={styles.tabContentPremium}>
            {(openHouseData?.enquiries || []).length > 0 ? (openHouseData?.enquiries || []).map((visitor: any) => (
                <Pressable key={visitor.id} style={styles.visitorCardPremium} onPress={() => setSelectedVisitor(visitor)}>
                    <View style={styles.vCardHeader}>
                        <View style={styles.vAvatarBox}><Text style={styles.vAvatarText}>{(visitor.name || 'A')[0].toUpperCase()}</Text></View>
                        <View style={styles.vInfoBox}><Text style={styles.vNameText}>{visitor.name || 'Anonymous'}</Text><Text style={styles.vEmailText}>{visitor.email || 'No email provided'}</Text></View>
                        <View style={[styles.vSignalBadge, { backgroundColor: (visitor.signal || '').toLowerCase() === 'hot' ? '#F43F5E' : '#E2E8F0' }]}>
                            <Text style={[styles.vSignalText, { color: (visitor.signal || '').toLowerCase() === 'hot' ? '#FFFFFF' : '#475569' }]}>{(visitor.signal || 'Cold').toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.vCardStats}>
                        <View style={styles.vStatItem}><MaterialCommunityIcons name="timeline-outline" size={14} color={colors.textMuted} /><Text style={styles.vStatText}>{visitor.timeline || 'Exploring'}</Text></View>
                        <View style={styles.vStatItem}><MaterialCommunityIcons name="check-decagram-outline" size={14} color={colors.textMuted} /><Text style={styles.vStatText}>PRE: {visitor.preApproved || 'No'}</Text></View>
                        <View style={{ marginLeft: 'auto' }}><Text style={styles.vTimeText}>{new Date(visitor.created_at).toLocaleDateString()}</Text></View>
                    </View>
                </Pressable>
            )) : (
                <View style={styles.emptyActivityBox}><MaterialCommunityIcons name="account-group-outline" size={48} color={colors.textMuted} /><Text style={styles.emptyActivityText}>No leads collected yet</Text></View>
            )}
        </View>
    );

    const renderAutomation = () => (
        <View style={styles.tabContentPremium}>
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Follow-up Strategy</Text>
                <View style={styles.automationSelector}>
                    <Text style={styles.selectorLabel}>ACTIVE SEQUENCE</Text>
                    <Pressable style={styles.selectorBox} onPress={() => setShowSequenceDropdown(!showSequenceDropdown)}>
                        <Text style={styles.selectorValue}>{activeSequence}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textPrimary} />
                    </Pressable>
                </View>
                <View style={styles.rulesList}>
                    {[
                        { id: 'tag', label: 'Auto-Tag Visitors', icon: 'tag-outline' },
                        { id: 'crm', label: 'Sync to Zien CRM', icon: 'sync' },
                        { id: 'alert', label: 'Hot Lead Mobile Alert', icon: 'bell-ring-outline' },
                        { id: 'sms', label: 'Send Welcome SMS', icon: 'message-text-outline' },
                    ].map((rule) => (
                        <View key={rule.id} style={styles.ruleRowPremium}>
                            <View style={styles.ruleInfoRow}><MaterialCommunityIcons name={rule.icon as any} size={20} color={colors.textSecondary} /><Text style={styles.ruleLabelPremium}>{rule.label}</Text></View>
                            <Switch value={(automationRules as any)[rule.id]} onValueChange={(val) => setAutomationRules(prev => ({ ...prev, [rule.id]: val }))} trackColor={{ false: '#E2E8F0', true: colors.accentTeal }} />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderAssets = () => (
        <View style={styles.tabContentPremium}>
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Media Library</Text>
                <View style={styles.galleryGridPremium}>
                    {propertyPhotos.map((photo, idx) => (
                        <View key={idx} style={styles.galleryItemPremium}>
                            <Image source={{ uri: photo }} style={styles.galleryImgPremium} contentFit="cover" />
                        </View>
                    ))}
                    <Pressable style={styles.addMediaBtn} onPress={handleAddPhoto}><MaterialCommunityIcons name="plus" size={24} color={colors.accentTeal} /><Text style={styles.addMediaText}>Add Media</Text></Pressable>
                </View>
            </View>
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Property Specs</Text>
                <View style={styles.specsContainer}>
                    <View style={styles.specRow}><Text style={styles.specLabel}>Listing Price</Text><Text style={styles.specValue}>{eventPrice}</Text></View>
                    <View style={styles.specRow}><Text style={styles.specLabel}>Square Footage</Text><Text style={styles.specValue}>{eventSqft}</Text></View>
                    <View style={styles.specRow}><Text style={styles.specLabel}>Bedrooms</Text><Text style={styles.specValue}>{eventBeds}</Text></View>
                    <View style={styles.specRow}><Text style={styles.specLabel}>Bathrooms</Text><Text style={styles.specValue}>{eventBaths}</Text></View>
                </View>
                <View style={styles.aiDescriptionBox}><Text style={styles.aiDescriptionTitle}>AI SUMMARY</Text><Text style={styles.aiDescriptionText}>"{eventDescription}"</Text></View>
            </View>
        </View>
    );

    const renderSettings = () => (
        <View style={styles.tabContentPremium}>
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Dashboard Preferences</Text>
                <View style={styles.settingItemPremium}>
                    <View><Text style={styles.settingTitlePremium}>Visitor Privacy Mode</Text><Text style={styles.settingDescPremium}>Anonymize lead names on dashboard</Text></View>
                    <Switch value={hideVisitorNames} onValueChange={setHideVisitorNames} trackColor={{ false: '#E2E8F0', true: colors.accentTeal }} />
                </View>
                <View style={styles.settingItemPremium}>
                    <View><Text style={styles.settingTitlePremium}>Anonymize Seller Report</Text><Text style={styles.settingDescPremium}>Hide lead details in shared reports</Text></View>
                    <Switch value={anonymizeLeads} onValueChange={setAnonymizeLeads} trackColor={{ false: '#E2E8F0', true: colors.accentTeal }} />
                </View>
            </View>
        </View>
    );

    const renderSellerReport = () => (
        <View style={styles.tabContentPremium}>
            <View style={styles.premiumCard}>
                <Text style={styles.premiumCardHeader}>Seller Insight Dashboard</Text>
                <Text style={styles.sellerDescPremium}>This report is synchronized live with the seller's portal. Any check-ins will appear instantly for the client.</Text>
                <Pressable style={styles.actionBtnPrimaryPremium}><MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFFFFF" /><Text style={styles.actionBtnTextPremium}>Generate PDF Report</Text></Pressable>
            </View>
        </View>
    );

    if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.accentTeal} /><Text style={styles.loadingText}>Loading Premium Dashboard...</Text></View>;

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[2]}
                contentContainerStyle={{ backgroundColor: colors.surfaceSoft }}
            >
                {renderHero()}
                <View style={styles.kpiBelt}>
                    <View style={styles.beltItem}><Text style={styles.beltVal}>{eventVisitors}</Text><Text style={styles.beltLabel}>VISITORS</Text></View>
                    <View style={styles.beltDivider} />
                    <View style={styles.beltItem}><Text style={[styles.beltVal, { color: '#F43F5E' }]}>{eventHotLeads}</Text><Text style={styles.beltLabel}>HOT LEADS</Text></View>
                    <View style={styles.beltDivider} />
                    <View style={styles.beltItem}><Text style={styles.beltVal}>12m</Text><Text style={styles.beltLabel}>AVG. DWELL</Text></View>
                </View>
                {renderTabs()}
                <View style={styles.mainContent}>
                    {activeTab === 'Overview' && renderOverview()}
                    {activeTab === 'Visitors' && renderVisitors()}
                    {activeTab === 'Automation' && renderAutomation()}
                    {activeTab === 'Assets & Design' && renderAssets()}
                    {activeTab === 'Settings' && renderSettings()}
                    {activeTab === 'Seller Report' && renderSellerReport()}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>


            {/* Lead Intelligence Modal */}
            <Modal visible={!!selectedVisitor} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedVisitor(null)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        {selectedVisitor && (
                            <View>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalAvatar}><Text style={styles.modalAvatarText}>{(selectedVisitor.name || 'A')[0].toUpperCase()}</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalName}>{selectedVisitor.name || 'Anonymous'}</Text>
                                        <Text style={styles.modalEmail}>{selectedVisitor.email || 'No email'}</Text>
                                    </View>
                                    <Pressable onPress={() => setSelectedVisitor(null)}><MaterialCommunityIcons name="close-circle" size={28} color={colors.textMuted} /></Pressable>
                                </View>
                                <View style={styles.intelGrid}>
                                    <View style={styles.intelCard}><Text style={styles.intelLabel}>SIGNALS</Text><Text style={[styles.intelVal, { color: (selectedVisitor.signal || '').toLowerCase() === 'hot' ? '#F43F5E' : colors.accentTeal }]}>{selectedVisitor.signal || 'Exploring'}</Text></View>
                                    <View style={styles.intelCard}><Text style={styles.intelLabel}>PRE-APPROVED</Text><Text style={[styles.intelVal, { color: (selectedVisitor.preApproved || '').toLowerCase() === 'yes' ? '#10B981' : '#F43F5E' }]}>{selectedVisitor.preApproved || 'No'}</Text></View>
                                </View>
                                <View style={styles.intelCardFull}><Text style={styles.intelLabel}>KEY INTERESTS</Text><Text style={styles.intelValSmall}>Primary residence, school districts, kitchen upgrades.</Text></View>
                                <Pressable style={styles.modalActionBtn}><Text style={styles.modalActionText}>Push to Zien CRM</Text></Pressable>
                            </View>
                        )}
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
    header: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.surfaceSoft, zIndex: 200 },
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
    heroPriceBadge: { backgroundColor: colors.accentTeal, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
    heroPriceText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    heroAddressText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 15 },
    heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroMetaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    heroMetaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
    carouselPagination: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', gap: 6 },
    paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    kpiBelt: { flexDirection: 'row', backgroundColor: colors.cardBackground, marginHorizontal: 20, marginTop: -30, borderRadius: 24, padding: 25, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8, alignItems: 'center', justifyContent: 'space-around', zIndex: 10 },
    beltItem: { alignItems: 'center' },
    beltVal: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
    beltLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 6, letterSpacing: 0.5 },
    beltDivider: { width: 1, height: 35, backgroundColor: colors.cardBorder },
    tabBarContainer: { backgroundColor: colors.surfaceSoft, zIndex: 100, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4 },
    tabsScroll: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 15, gap: 30, backgroundColor: colors.surfaceSoft },
    tabItem: { paddingBottom: 10, position: 'relative' },
    tabItemActive: {},
    tabText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
    tabTextActive: { color: colors.textPrimary },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.accentTeal, borderRadius: 1.5 },
    mainContent: { paddingHorizontal: 20, paddingTop: 25, backgroundColor: colors.surfaceSoft },
    tabContentPremium: { gap: 24 },
    kpiRow: { flexDirection: 'row', gap: 15 },
    kpiCard: { flex: 1, borderRadius: 20, padding: 20, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder },
    kpiIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(13, 148, 136, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    kpiValue: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
    kpiLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 4, letterSpacing: 0.6 },
    qrHeroPremium: { flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, alignItems: 'center', gap: 20, borderWidth: 1, borderColor: colors.cardBorder },
    qrHeroDetails: { flex: 1 },
    qrHeroTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    qrHeroSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
    qrShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentTeal, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 15 },
    qrShareBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    qrContainerPremium: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 16 },
    sectionHeaderPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
    sectionTitlePremium: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    sectionLinkPremium: { fontSize: 13, fontWeight: '800', color: colors.accentTeal },
    activityFeed: { gap: 15 },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder },
    activityAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
    activityAvatarText: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
    activityInfo: { flex: 1, marginLeft: 15 },
    activityTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    activityTime: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    activitySignal: { width: 10, height: 10, borderRadius: 5 },
    emptyActivityBox: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: colors.surfaceSoft, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.cardBorder },
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
    premiumCard: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.cardBorder },
    premiumCardHeader: { fontSize: 19, fontWeight: '900', color: colors.textPrimary, marginBottom: 25 },
    automationSelector: { marginBottom: 24 },
    selectorLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
    selectorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.cardBorder },
    selectorValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    rulesList: { marginTop: 20, gap: 15 },
    ruleRowPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSoft, padding: 16, borderRadius: 18 },
    ruleInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    ruleLabelPremium: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    galleryGridPremium: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    galleryItemPremium: { width: (SCREEN_WIDTH - 125) / 2, height: 130, borderRadius: 18, overflow: 'hidden' },
    galleryImgPremium: { width: '100%', height: '100%' },
    addMediaBtn: { width: (SCREEN_WIDTH - 125) / 2, height: 130, borderRadius: 18, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center', gap: 10 },
    addMediaText: { fontSize: 12, fontWeight: '900', color: colors.accentTeal },
    specsContainer: { gap: 15, marginBottom: 24 },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    specLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    specValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    aiDescriptionBox: { backgroundColor: colors.surfaceSoft, padding: 20, borderRadius: 18, marginTop: 20 },
    aiDescriptionTitle: { fontSize: 10, fontWeight: '900', color: colors.accentTeal, letterSpacing: 0.8, marginBottom: 10 },
    aiDescriptionText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22, fontWeight: '500', fontStyle: 'italic' },
    settingItemPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSoft, padding: 18, borderRadius: 18, marginBottom: 15 },
    settingTitlePremium: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    settingDescPremium: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
    sellerDescPremium: { fontSize: 15, color: colors.textSecondary, lineHeight: 24, fontWeight: '500' },
    actionBtnPrimaryPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.accentTeal, borderRadius: 18, paddingVertical: 18, marginTop: 25 },
    actionBtnTextPremium: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    agentCardPremium: { marginTop: 30, backgroundColor: colors.surfaceSoft, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.cardBorder },
    agentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
    agentAvatarBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center' },
    agentAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    agentNameBox: { flex: 1 },
    agentNamePremium: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    agentTitlePremium: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    agentContactPremium: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 18 },
    contactItemPremium: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    contactTextPremium: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
    fabGoLive: { position: 'absolute', bottom: 35, left: 25, right: 25, borderRadius: 22, overflow: 'hidden', shadowColor: '#0D9488', shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 },
    fabGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 14 },
    fabText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1.2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 30, paddingBottom: 60 },
    modalHandle: { width: 44, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 30 },
    modalAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center' },
    modalAvatarText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
    modalName: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
    modalEmail: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    intelGrid: { flexDirection: 'row', gap: 18, marginBottom: 18 },
    intelCard: { flex: 1, backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.cardBorder },
    intelCardFull: { backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 30 },
    intelLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 10 },
    intelVal: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    intelValSmall: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, lineHeight: 20 },
    modalActionBtn: { backgroundColor: colors.textPrimary, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
    modalActionText: { color: colors.background, fontSize: 16, fontWeight: '800' },
});