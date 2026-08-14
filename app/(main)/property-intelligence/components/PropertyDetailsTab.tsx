import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PropertyDetailsTabProps {
    property: any;
    apiData?: any;
}

function fmtVal(v: any): string {
    if (v === null || v === undefined || v === '') return 'N/A';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'N/A';
    return String(v);
}

export const PropertyDetailsTab: React.FC<PropertyDetailsTabProps> = ({ property, apiData }) => {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);

    const d = apiData || {};

    const sections = [
        {
            title: 'Location & Listing',
            icon: 'map-marker-outline',
            items: [
                { label: 'STATUS CHANGE TIMESTAMP', value: d.StatusChangeTimestamp || '2025-01-03T14:58:20.710Z' },
                { label: 'LISTING KEY NUMERIC', value: d.ListingKeyNumeric || '140334254' },
                { label: 'MLS AREA MAJOR', value: d.MLSAreaMajor || '44' },
                { label: 'COUNTY OR PARISH', value: d.CountyOrParish || 'Polk' },
                { label: 'MLS STATUS', value: d.MLSStatus || 'Active' },
                { label: 'LISTING KEY', value: d.ListingKey || '0c173a2d312972c36bbd09a2749ffa42' },
                { label: 'STANDARD STATUS', value: d.StandardStatus || 'Active' },
                { label: 'INTERNET ADDRESS DISPLAY Y N', value: d.InternetAddressDisplayYN ?? true },
                { label: 'H A R_ PRICE ACRE LIST', value: d.HAR_PriceAcreList || '71954.57' },
                { label: 'LIST AGENT PREFERRED PHONE', value: d.ListAgentPreferredPhone || '1+936-327-5736' },
                { label: 'LISTING AGREEMENT', value: d.ListingAgreement || 'Exclusive Right to Sell/Lease' },
                { label: 'LISTING ID', value: d.ListingId || '169186764' },
                { label: 'CITY', value: d.City || 'Onalaska' },
                { label: 'INTERNET ENTIRE LISTING DISPLAY Y N', value: d.InternetEntireListingDisplayYN ?? true },
                { label: 'LIST AGENT KEY', value: d.ListAgentKey || 'e1e03a06d375a45338cf789b76b3e929' },
                { label: 'H A R_ LOT PRICE SQ FT LIST', value: d.HAR_LotPriceSqFtList || '1.65' },
                { label: 'LIST AGENT EMAIL', value: d.ListAgentEmail || 'davidejsr@gmail.com' },
                { label: 'LISTING CONTRACT DATE', value: d.ListingContractDate || '2017-09-08' },
                { label: 'LIST OFFICE NAME', value: d.ListOfficeName || 'Evans and Associates' },
                { label: 'LIST PRICE', value: d.ListPrice ? `$${Number(d.ListPrice).toLocaleString()}` : '$299,000' },
                { label: 'LIST OFFICE PHONE', value: d.ListOfficePhone || '936-327-5736' },
                { label: 'STATE OR PROVINCE', value: d.StateOrProvince || 'TX' },
                { label: 'LIST OFFICE KEY', value: d.ListOfficeKey || 'be038ddad736f567d01e3ee811c208d7' },
                { label: 'LIST AGENT FULL NAME', value: d.ListAgentFullName || 'David Jones' },
                { label: 'UNPARSED ADDRESS', value: d.UnparsedAddress || '0000 Fm 190, Onalaska TX 77360' },
            ],
        },
        {
            title: 'Interior Features',
            icon: 'home-outline',
            items: [
                { label: 'BATHROOMS TOTAL INTEGER', value: d.BathroomsTotalInteger ?? 0 },
                { label: 'BEDROOMS TOTAL', value: d.BedroomsTotal ?? 0 },
                { label: 'LIVING AREA', value: d.LivingArea ? `${Number(d.LivingArea).toLocaleString()} sqft` : 'N/A' },
                { label: 'YEAR BUILT', value: d.YearBuilt || 'N/A' },
            ],
        },
        {
            title: 'Exterior & Building',
            icon: 'domain',
            items: [
                { label: 'POOL PRIVATE Y N', value: d.PoolPrivateYN ?? false },
                { label: 'LOT SIZE ACRES', value: d.LotSizeAcres || '4.1554' },
                { label: 'LOT SIZE SOURCE', value: d.LotSizeSource || 'Appraisal District' },
                { label: 'LOT SIZE UNITS', value: d.LotSizeUnits || 'Acres' },
                { label: 'GARAGE Y N', value: d.GarageYN ?? false },
                { label: 'LOT SIZE AREA', value: d.LotSizeArea || '4.1554' },
                { label: 'NEW CONSTRUCTION Y N', value: d.NewConstructionYN ?? false },
                { label: 'LOT SIZE SQUARE FEET', value: d.LotSizeSquareFeet || '181009.224' },
            ],
        },
        {
            title: 'Utilities & Systems',
            icon: 'lightning-bolt-outline',
            items: [
                { label: 'WATER SOURCE', value: d.WaterSource || 'Public' },
                { label: 'SEWER', value: d.Sewer || 'Public Sewer' },
                { label: 'COOLING', value: d.Cooling || 'N/A' },
                { label: 'HEATING', value: d.Heating || 'N/A' },
                { label: 'H A R_ UTILITY DISTRICT', value: d.HAR_UtilityDistrict ?? true },
            ],
        },
        {
            title: 'Financial & Tax',
            icon: 'currency-usd',
            items: [
                { label: 'TAX LEGAL DESCRIPTION', value: d.TaxLegalDescription || 'Tract 34-1' },
                { label: 'H A R_ PRICE ACRE SALES', value: d.HAR_PriceAcreSales || '0' },
                { label: 'H A R_ MAINTENANCE FEE YES NO', value: d.HAR_MaintenanceFeeYesNo ?? false },
                { label: 'H A R_ FEE OTHER', value: d.HAR_FeeOther ?? false },
                { label: 'H A R_ CURRENT PRICE', value: d.HAR_CurrentPrice || '299000' },
                { label: 'H A R_ FEE OTHER AMOUNT', value: d.HAR_FeeOtherAmount || '0' },
            ],
        },
        {
            title: 'Other Details',
            icon: 'pound',
            items: [
                { label: 'LIVING AREA UNITS', value: d.LivingAreaUnits || 'Square Feet' },
                { label: 'H A R_ CONTRACT TYPE', value: d.HAR_ContractType || 'Unimproved Property' },
                { label: 'PHOTOS COUNT', value: d.PhotosCount || '12' },
                { label: 'DOCUMENTS COUNT', value: d.DocumentsCount || '0' },
                { label: 'ORIGINATING SYSTEM KEY', value: d.OriginatingSystemKey || 'har' },
                { label: 'PROPERTY TYPE', value: d.PropertyType || 'Land' },
                { label: 'ORIGINATING SYSTEM NAME', value: d.OriginatingSystemName || 'Houston Association of Realtors' },
                { label: 'STREET NUMBER', value: d.StreetNumber || '0000' },
                { label: 'ELEMENTARY SCHOOL', value: d.ElementarySchool || 'Onalaska Elementary School' },
                { label: 'DIRECTIONS', value: d.Directions || 'Located beside Sonic on FM 190 in Onalaska.' },
                { label: 'H A R_ LOCATION', value: d.HAR_Location || '141 - Onalaska' },
                { label: 'H A R_ DATACOOP A V M', value: d.HAR_DataCoopAVM ?? true },
                { label: 'PROPERTY SUB TYPE', value: d.PropertySubType || 'Lots' },
                { label: 'SUBDIVISION NAME', value: d.SubdivisionName || 'City' },
                { label: 'DAYS ON MARKET', value: d.DaysOnMarket || '3008' },
                { label: 'STREET NUMBER NUMERIC', value: d.StreetNumberNumeric || '0' },
                { label: 'CUMULATIVE DAYS ON MARKET', value: d.CumulativeDaysOnMarket || '3144' },
                { label: 'H A R_ GP EXT_ GEO CODE DATE', value: d.HAR_GPExt_GeoCodeDate || '2017-09-08' },
                { label: 'H A R_ PROPERTY TYPE', value: d.HAR_PropertyType || 'Lots' },
                { label: 'H A R_ MASTER PLANNED COMMUNITY Y N', value: d.HAR_MasterPlannedCommunityYN ?? false },
                { label: 'MAP COORDINATE', value: d.MapCoordinate || '999z' },
                { label: 'H A R_ V O W', value: d.HAR_VOW ?? true },
                { label: 'INTERNET AUTOMATED VALUATION DISPLAY Y N', value: d.InternetAutomatedValuationDisplayYN ?? true },
                { label: 'PRIVATE REMARKS', value: d.PrivateRemarks || 'Please verify all information independently.' },
                { label: 'INTERNET CONSUMER COMMENT Y N', value: d.InternetConsumerCommentYN ?? true },
                { label: 'LONGITUDE', value: d.Longitude || '-95.108708' },
                { label: 'CARPORT Y N', value: d.CarportYN ?? false },
                { label: 'PUBLIC REMARKS', value: d.PublicRemarks || '4.1554 Acres of commercial property with 441\' of HWY frontage on FM 190. This property is located on the East side of Sonic. The property runs behind Sonic.' },
                { label: 'LATITUDE', value: d.Latitude || '30.813365' },
                { label: 'PHOTOS CHANGE TIMESTAMP', value: d.PhotosChangeTimestamp || '2025-07-23T17:42:14.506Z' },
                { label: 'MIDDLE OR JUNIOR SCHOOL', value: d.MiddleOrJuniorSchool || 'Onalaska Jr/Sr High School' },
                { label: 'BRIDGE MODIFICATION TIMESTAMP', value: d.BridgeModificationTimestamp || '2026-03-09T22:11:35.434Z' },
                { label: 'PARCEL NUMBER', value: d.ParcelNumber || '22419' },
                { label: 'H A R_ ACTIVE COMMUNITYSS Y N', value: d.HAR_ActiveCommunitySSYN ?? false },
                { label: 'H A R_ GEO MARKET AREA', value: d.HAR_GeoMarketArea || 'Lake Livingston Area' },
                { label: 'HIGH SCHOOL', value: d.HighSchool || 'Onalaska Jr/Sr High School' },
                { label: 'I D X PARTICIPATION Y N', value: d.IDXParticipationYN ?? true },
                { label: 'H A R_ PHONE APPT DESC', value: d.HAR_PhoneApptDesc || 'Call Agent' },
                { label: 'H A R_ PHONE APPT DESK', value: d.HAR_PhoneApptDesk || '936-328-7272' },
                { label: 'MODIFICATION TIMESTAMP', value: d.ModificationTimestamp || '2025-12-22T16:52:50.680Z' },
                { label: 'COUNTRY', value: d.Country || 'US' },
                { label: 'H A R_ LEGAL SUBDIVISION', value: d.HAR_LegalSubdivision || 'OTHER - 77360' },
                { label: 'STREET NAME', value: d.StreetName || 'Fm 190' },
                { label: 'HIGH SCHOOL DISTRICT', value: d.HighSchoolDistrict || '104 - Onalaska' },
                { label: 'SOURCE SYSTEM KEY', value: d.SourceSystemKey || '140334254' },
                { label: 'H A R_ DID SELL AGENT REP BUYER', value: d.HAR_DidSellAgentRepBuyer ?? true },
                { label: 'POSTAL CODE', value: d.PostalCode || '77360' },
                { label: 'URL', value: d.URL || 'api.bridgedataoutput.com/api/v2/har/listings/0c173a2d312972c36bbd09a2749ffa42' },
            ],
        },
    ];

    return (
        <View style={styles.container}>
            {sections.map((section, sIdx) => {
                const validItems = section.items.filter(i => i.value !== undefined && i.value !== null);
                if (validItems.length === 0) return null;

                return (
                    <View key={sIdx} style={styles.sectionCard}>
                        <View style={styles.sectionHeaderRow}>
                            <MaterialCommunityIcons name={section.icon as any} size={18} color="#06B6D4" />
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>

                        <View style={styles.grid}>
                            {validItems.map((item, idx) => (
                                <View key={idx} style={styles.gridBox}>
                                    <Text style={styles.boxLabel}>{item.label}</Text>
                                    <Text style={styles.boxValue} numberOfLines={3}>
                                        {fmtVal(item.value)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

function getStyles(colors: any) {
    return StyleSheet.create({
        container: { gap: 18, paddingBottom: 24 },
        sectionCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 14,
        },
        sectionHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '900',
            color: colors.textPrimary,
        },

        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        gridBox: {
            width: '48.2%',
            backgroundColor: colors.surfaceSoft,
            borderRadius: 10,
            padding: 12,
            gap: 4,
        },
        boxLabel: {
            fontSize: 8.5,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 0.6,
        },
        boxValue: {
            fontSize: 12.5,
            fontWeight: '800',
            color: colors.textPrimary,
            lineHeight: 16,
        },
    });
}
