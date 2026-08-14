import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface OverviewTabProps {
    property: any;
    apiData?: any;
}

function fmtK(v: number): string {
    if (!v) return 'N/A';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
    return `$${v}`;
}
function fmtFull(v: number): string {
    if (!v) return 'N/A';
    return `$${Math.round(v).toLocaleString()}`;
}
function orNA(v: any): string {
    if (v === null || v === undefined || v === '' || v === 0) return 'N/A';
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'N/A';
    return String(v);
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ property, apiData }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const [activeIndex, setActiveIndex] = React.useState(0);

    // ── Photos ────────────────────────────────────────────────────────────
    const photos: string[] = apiData?.Media
        ? apiData.Media.map((m: any) => m.MediaURL).filter(Boolean)
        : property?.image ? [property.image] : [];

    // ── Core fields from API ──────────────────────────────────────────────
    const addr1 = apiData?.StreetNumber
        ? `${apiData.StreetDirPrefix ? apiData.StreetDirPrefix + ' ' : ''}${apiData.StreetNumber} ${apiData.StreetName || ''}`.trim()
        : apiData?.UnparsedAddress?.split(',')[0] || property?.address?.split(',')[0] || '';
    const city = apiData?.City || '';
    const state = apiData?.StateOrProvince || '';
    const zip = apiData?.PostalCode || '';
    const county = apiData?.CountyOrParish || '';
    const apn = apiData?.ParcelNumber || '';
    const fullAddress = apiData?.UnparsedAddress || property?.address || '';

    const beds = apiData?.BedroomsTotal ?? 0;
    const baths = apiData?.BathroomsTotalDecimal ?? 0;
    const sqft = apiData?.LivingArea ?? 0;
    const yearBuilt = apiData?.YearBuilt ?? 0;
    const garage = apiData?.GarageSpaces || apiData?.AttachedGarageYN ? `${apiData.GarageSpaces || 1} Garage` : 'No Garage';
    const pool = apiData?.PoolYN || apiData?.PoolFeatures?.length > 0 ? 'Pool' : 'No Pool';
    const stories = apiData?.StoriesTotal || apiData?.Levels || 0;

    // ── Construction & Systems ─────────────────────────────────────────────
    const lotSqft = apiData?.LotSizeSquareFeet || 0;
    const roofType = orNA(apiData?.Roof?.join?.(', ') || apiData?.Roof);
    const exteriorMaterial = orNA(apiData?.ExteriorFeatures?.join?.(', '));
    const basement = orNA(apiData?.Basement?.join?.(', ') || apiData?.Basement);
    const cooling = orNA(apiData?.Cooling?.join?.(', ') || apiData?.Cooling);
    const heating = orNA(apiData?.Heating?.join?.(', ') || apiData?.Heating);
    const waterSource = orNA(apiData?.WaterSource?.join?.(', ') || apiData?.WaterSource);
    const sewer = orNA(apiData?.Sewer?.join?.(', ') || apiData?.Sewer);
    const fireplaces = apiData?.FireplacesTotal ?? 0;
    const parkingSpaces = apiData?.ParkingTotal ?? apiData?.CoveredSpaces ?? 0;
    const schoolDistrict = orNA(apiData?.HighSchoolDistrict || apiData?.ElementarySchoolDistrict);
    const zoning = orNA(apiData?.ZoningDescription || apiData?.Zoning);
    const floodZone = orNA(apiData?.HAR_FloodZone);
    const lastPermit = 'N/A';

    // Lot features / amenities
    const lotFeatures: string[] = apiData?.LotFeatures || [];
    const waterfrontFeatures: string[] = apiData?.WaterfrontFeatures || [];
    const amenities = [...lotFeatures, ...waterfrontFeatures].filter(Boolean);

    // ── ZienAI Valuation ──────────────────────────────────────────────────
    const valuation = apiData?.valuation;
    const valuationPrice = valuation?.price ?? null;
    const valLow = valuation?.priceRangeLow ?? null;
    const valHigh = valuation?.priceRangeHigh ?? null;
    const listPrice = apiData?.ListPrice ?? null;
    const displayPrice = valuationPrice || listPrice;

    // ── Market Trends ──────────────────────────────────────────────────────
    const saleData = apiData?.marketTrends?.marketTrendsData?.saleData;
    // Use DaysOnMarket from listing data (same as web), fallback to market trends
    const avgDOM = apiData?.DaysOnMarket ?? saleData?.averageDaysOnMarket ?? null;
    const avgPricePerSqft = saleData?.averagePricePerSquareFoot ?? null;

    // ── 3-Year Forecast ───────────────────────────────────────────────────
    const appreciation = 0.04; // 4% annual
    const forecastVal = displayPrice ? Math.round(displayPrice * Math.pow(1 + appreciation, 3)) : null;
    const rentEstimate = displayPrice ? Math.round(displayPrice * 0.0075) : null; // 0.75% fallback ratio
    const projCapRate = rentEstimate && displayPrice
        ? parseFloat(((rentEstimate * 12 * 0.65) / displayPrice * 100).toFixed(2))
        : 5.85;
    const downPct = 0.20;
    const loanAmt = displayPrice ? displayPrice * (1 - downPct) : 0;
    const annualDebtService = loanAmt * 0.065;
    const noi = rentEstimate ? rentEstimate * 12 * 0.65 : 0;
    const cashFlow = noi - annualDebtService;
    const downPayment = displayPrice ? displayPrice * downPct : 1;
    const cocReturn = displayPrice ? parseFloat(((cashFlow / downPayment) * 100).toFixed(2)) : -1.09;

    // ── Insights text ──────────────────────────────────────────────────────
    const propType = apiData?.PropertyType || apiData?.PropertySubType || 'Property';
    const insightsText = displayPrice
        ? `This ${propType} is valued at ${fmtFull(displayPrice)}.${avgDOM ? ` Homes in this area stay on the market for an average of ${Math.round(avgDOM)} days.` : ''}`
        : null;

    const handleNext = () => setActiveIndex((p) => (p + 1) % photos.length);
    const handlePrev = () => setActiveIndex((p) => (p - 1 + photos.length) % photos.length);

    return (
        <View style={styles.container}>

            {/* ── 1. Photo Gallery ── */}
            {photos.length > 0 && (
                <View style={styles.galleryWrapper}>
                    <View style={styles.mainImageContainer}>
                        <Image
                            source={{ uri: photos[activeIndex] }}
                            style={styles.mainImage}
                            resizeMode="cover"
                        />
                        {photos.length > 1 && (
                            <>
                                <Pressable style={[styles.navArrow, { left: 10 }]} onPress={handlePrev}>
                                    <MaterialCommunityIcons name="chevron-left" size={22} color="#FFF" />
                                </Pressable>
                                <Pressable style={[styles.navArrow, { right: 10 }]} onPress={handleNext}>
                                    <MaterialCommunityIcons name="chevron-right" size={22} color="#FFF" />
                                </Pressable>
                                <View style={styles.photoCount}>
                                    <MaterialCommunityIcons name="image-multiple-outline" size={12} color="#FFF" />
                                    <Text style={styles.photoCountText}>{activeIndex + 1}/{photos.length}</Text>
                                </View>
                            </>
                        )}
                    </View>
                    {photos.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsRow}>
                            {photos.map((img, i) => (
                                <Pressable key={i} onPress={() => setActiveIndex(i)}
                                    style={[styles.thumbWrap, i === activeIndex && styles.thumbActive]}>
                                    <Image source={{ uri: img }} style={styles.thumbImg} />
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* ── 2. ZienAI Insights Banner ── */}
            {insightsText && (
                <LinearGradient
                    colors={['#0B213E', '#163866']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.insightsBanner}
                >
                    <View style={styles.insightsIconRow}>
                        <View style={styles.insightsIconBadge}>
                            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#06B6D4" />
                        </View>
                        <Text style={styles.insightsTitle}>ZienAI Insights</Text>
                    </View>
                    <Text style={styles.insightsText}>{insightsText}</Text>
                </LinearGradient>
            )}

            {/* ── 3. Address + Feature Icons ── */}
            <View style={styles.card}>
                <View style={styles.addressRow}>
                    <MaterialCommunityIcons name="map-marker" size={18} color="#06B6D4" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressMain}>{addr1 || fullAddress.split(',')[0]}</Text>
                        <Text style={styles.addressSub}>
                            {[city, state, zip].filter(Boolean).join(', ')}{county ? ` · ${county}` : ''}
                        </Text>
                        {apn ? <Text style={styles.apnText}>APN: {apn}</Text> : null}
                    </View>
                </View>

                <View style={styles.featureIconsRow}>
                    {[
                        { icon: 'home-outline', label: `${beds} Beds` },
                        { icon: 'shower-head', label: `${baths} Baths` },
                        { icon: 'vector-square', label: `${Number(sqft).toLocaleString()} sqft` },
                        { icon: 'calendar-blank-outline', label: `Built ${yearBuilt}` },
                        { icon: 'garage', label: garage },
                        { icon: 'pool', label: pool },
                        { icon: 'layers-outline', label: `${stories} Story` },
                    ].map((f, i) => (
                        <View key={i} style={styles.featureIconItem}>
                            <MaterialCommunityIcons name={f.icon as any} size={14} color={colors.textSecondary} />
                            <Text style={styles.featureIconText}>{f.label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ── 4. Construction & Systems ── */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Construction & Systems</Text>
                <View style={styles.detailGrid}>
                    {[
                        { label: 'LOT SIZE', value: lotSqft ? `${Number(lotSqft).toLocaleString()} sqft` : 'N/A' },
                        { label: 'ROOF TYPE', value: roofType },
                        { label: 'EXTERIOR MATERIAL', value: exteriorMaterial },
                        { label: 'BASEMENT', value: basement },
                        { label: 'COOLING', value: cooling },
                        { label: 'HEATING', value: heating },
                        { label: 'WATER SOURCE', value: waterSource },
                        { label: 'SEWAGE', value: sewer },
                        { label: 'FIREPLACES', value: String(fireplaces) },
                        { label: 'PARKING SPACES', value: String(parkingSpaces) },
                        { label: 'SCHOOL DISTRICT', value: schoolDistrict },
                        { label: 'LAST PERMIT', value: lastPermit },
                        { label: 'ZONING', value: zoning },
                        { label: 'FLOOD ZONE', value: floodZone },
                    ].map((item, i) => (
                        <View key={i} style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{item.label}</Text>
                            <Text style={styles.detailValue}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ── 5. Property Amenities ── */}
            {amenities.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Property Amenities</Text>
                    <View style={styles.amenitiesWrap}>
                        {amenities.map((item, i) => (
                            <View key={i} style={styles.amenityTag}>
                                <MaterialCommunityIcons name="check-circle-outline" size={13} color="#06B6D4" />
                                <Text style={styles.amenityText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* ── 6. ZienAI Valuation Card ── */}
            {displayPrice && (
                <View style={styles.valuationCard}>
                    <View style={styles.valuationTopRow}>
                        <View style={styles.valuationLabelRow}>
                            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#06B6D4" />
                            <Text style={styles.valuationTopLabel}>ZIENAI VALUATION</Text>
                        </View>
                        <View style={styles.liveDataBadge}>
                            <MaterialCommunityIcons name="pulse" size={10} color="#10B981" />
                            <Text style={styles.liveDataText}>Live Data</Text>
                        </View>
                    </View>

                    <Text style={styles.valuationPrice}>{fmtK(displayPrice)}</Text>
                    {valLow && valHigh && (
                        <Text style={styles.valuationRange}>
                            Market Range: {fmtK(valLow)} – {fmtK(valHigh)}
                        </Text>
                    )}

                    <View style={styles.valuationDivider} />

                    <View style={styles.valuationStatsRow}>
                        <View>
                            <Text style={styles.valuationStatLabel}>APPRECIATION</Text>
                            <Text style={styles.valuationStatNA}>N/A</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.valuationStatLabel}>AI CONFIDENCE</Text>
                            <Text style={styles.valuationStatNA}>N/A</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* ── 7. Quick Stats Grid ── */}
            {displayPrice && (
                <View style={styles.statsGrid}>
                    {[
                        {
                            icon: 'pound',
                            label: 'PRICE / SQFT',
                            value: sqft && displayPrice ? `$${Math.round(displayPrice / sqft)}` : 'N/A',
                            color: '#8B5CF6',
                        },
                        {
                            icon: 'currency-usd',
                            label: 'EST. RENT/MO',
                            value: rentEstimate ? fmtFull(rentEstimate) : 'N/A',
                            color: '#F59E0B',
                        },
                        {
                            icon: 'trending-up',
                            label: 'GROSS YIELD',
                            value: rentEstimate && displayPrice
                                ? `${((rentEstimate * 12 / displayPrice) * 100).toFixed(1)}%`
                                : 'N/A',
                            color: '#10B981',
                        },
                        {
                            icon: 'clock-outline',
                            label: 'AVG DOM',
                            value: avgDOM ? `${Math.round(avgDOM)} days` : 'N/A',
                            color: '#06B6D4',
                        },
                    ].map((s, i) => (
                        <View key={i} style={styles.statBox}>
                            <View style={[styles.statIconWrap, { backgroundColor: `${s.color}20` }]}>
                                <MaterialCommunityIcons name={s.icon as any} size={16} color={s.color} />
                            </View>
                            <Text style={styles.statBoxLabel}>{s.label}</Text>
                            <Text style={[styles.statBoxValue, s.value === 'N/A' && { color: colors.textSecondary }]}>
                                {s.value}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* ── 8. ZienAI 3-Year Forecast ── */}
            {displayPrice && (
                <View style={styles.card}>
                    <View style={styles.forecastTitleRow}>
                        <MaterialCommunityIcons name="pulse" size={16} color="#06B6D4" />
                        <Text style={styles.sectionTitle}>ZienAI 3-Year Forecast</Text>
                    </View>

                    <View style={styles.forecastRow}>
                        <Text style={styles.forecastLabel}>Projected Cap Rate</Text>
                        <Text style={styles.forecastValueGreen}>{projCapRate}%</Text>
                    </View>
                    <View style={styles.forecastDivider} />

                    <View style={styles.forecastRow}>
                        <Text style={styles.forecastLabel}>Cash-on-Cash Return (20% down)</Text>
                        <Text style={[styles.forecastValueGreen, cocReturn < 0 && { color: '#EF4444' }]}>
                            {cocReturn > 0 ? '+' : ''}{cocReturn}%
                        </Text>
                    </View>
                    <View style={styles.forecastDivider} />

                    <View style={styles.forecastRow}>
                        <Text style={styles.forecastLabel}>Estimated Value (Year 3)</Text>
                        <Text style={styles.forecastValueCyan}>{fmtK(forecastVal!)}</Text>
                    </View>

                    <Text style={styles.forecastFootnote}>
                        *Forecast assumes 35% operating expenses, 4% annual appreciation, and 6.5% interest rate.
                        {!rentEstimate || rentEstimate === 0
                            ? ' Since market rent data was unavailable, a 0.75% rent-to-value ratio is assumed.'
                            : ''}
                    </Text>
                </View>
            )}

        </View>
    );
};

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { gap: 16, paddingBottom: 24 },

        // Gallery
        galleryWrapper: { gap: 10 },
        mainImageContainer: { width: '100%', height: 240, borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: colors.surfaceSoft },
        mainImage: { width: '100%', height: '100%' },
        navArrow: { position: 'absolute', top: '40%', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
        photoCount: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
        photoCountText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
        thumbsRow: { gap: 8, paddingHorizontal: 2 },
        thumbWrap: { width: 58, height: 42, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
        thumbActive: { borderColor: '#06B6D4' },
        thumbImg: { width: '100%', height: '100%' },

        // ZienAI Insights Banner
        insightsBanner: { borderRadius: 16, padding: 18, gap: 10 },
        insightsIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        insightsIconBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(6,182,212,0.15)', alignItems: 'center', justifyContent: 'center' },
        insightsTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
        insightsText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

        // Card
        card: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, gap: 14 },
        sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

        // Address
        addressRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
        addressMain: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, lineHeight: 22 },
        addressSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        apnText: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontWeight: '600' },

        // Feature Icons
        featureIconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.borderLight },
        featureIconItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        featureIconText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

        // Detail Grid (2 columns)
        detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
        detailItem: { width: '50%', paddingVertical: 12, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
        detailLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 4 },
        detailValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

        // Amenities
        amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        amenityTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
        amenityText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

        // Valuation Card
        valuationCard: { backgroundColor: '#0D1B2E', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)', gap: 8 },
        valuationTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        valuationLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
        valuationTopLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
        liveDataBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
        liveDataText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
        valuationPrice: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
        valuationRange: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: -4 },
        valuationDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
        valuationStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
        valuationStatLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, marginBottom: 4 },
        valuationStatNA: { fontSize: 14, fontWeight: '800', color: '#06B6D4' },

        // Quick Stats Grid
        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        statBox: { width: '47.5%', backgroundColor: colors.cardBackground, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 },
        statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        statBoxLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
        statBoxValue: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },

        // 3-Year Forecast
        forecastTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        forecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
        forecastDivider: { height: 1, backgroundColor: colors.borderLight },
        forecastLabel: { fontSize: 14, color: colors.textSecondary, flex: 1 },
        forecastValueGreen: { fontSize: 15, fontWeight: '800', color: '#10B981' },
        forecastValueCyan: { fontSize: 15, fontWeight: '800', color: '#06B6D4' },
        forecastFootnote: { fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 16, marginTop: 8, fontStyle: 'italic' },
    });
}
