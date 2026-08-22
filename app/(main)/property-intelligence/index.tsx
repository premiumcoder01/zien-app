import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { setDrawerSubTabs } from './_layout';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { BrokerDetailsTab } from './components/BrokerDetailsTab';
import { ComparableListingsTab } from './components/ComparableListingsTab';
import { DemographicsTab } from './components/DemographicsTab';
import { NearbyPlacesTab } from './components/NearbyPlacesTab';
import { OverviewTab } from './components/OverviewTab';
import { PriceTrendTab } from './components/PriceTrendTab';
import { PropertyDetailsTab } from './components/PropertyDetailsTab';
import { RiskEnvironmentTab } from './components/RiskEnvironmentTab';

const SUB_TABS = [
    'Overview',
    'Comparable Listings',
    'Market Trends',
    'Property Details',
    'Demographics',
    'Map View',
];

export default function PropertySearchScreen() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const router = useRouter();
    const params = useLocalSearchParams<{ address?: string }>();
    const { accessToken } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [apiData, setApiData] = useState<any>(null);
    const [activeSubTab, setActiveSubTab] = useState('Overview');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [userProperties, setUserProperties] = useState<any[]>([]);
    const [isLoadingUserProps, setIsLoadingUserProps] = useState(false);
    const [isSavingProperty, setIsSavingProperty] = useState(false);
    const [isPropertySaved, setIsPropertySaved] = useState(false);

    // Fetch user properties from staging.zien.ai/api/solo/properties (same as web)
    useEffect(() => {
        if (!accessToken) return;
        const fetchProperties = async () => {
            setIsLoadingUserProps(true);
            try {
                const res = await fetch('https://staging.zien.ai/api/solo/properties', {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
                const json = await res.json();
                console.log('[PropertyIntelligence] 🏠 USER PROPERTIES API RESPONSE:', res.status, json);
                if (json.success && Array.isArray(json.properties)) {
                    setUserProperties(json.properties);
                }
            } catch (err) {
                console.error('[PropertyIntelligence] Failed to fetch user properties:', err);
            } finally {
                setIsLoadingUserProps(false);
            }
        };
        fetchProperties();
    }, [accessToken]);

    // Handle auto-search when navigated from Recent Searches screen with address param
    useEffect(() => {
        if (params.address && accessToken) {
            handleSuggestionPress(String(params.address));
        }
    }, [params.address, params.ts, accessToken]);

    const handleSelectProperty = (property: any, data?: any) => {
        setSelectedProperty(property);
        setApiData(data || null);
        setActiveSubTab('Overview');
        setIsPropertySaved(false);
    };

    const handleSaveProperty = async () => {
        if (!selectedProperty || isSavingProperty) return;
        setIsSavingProperty(true);

        const targetAddress = selectedProperty?.address || apiData?.UnparsedAddress || searchQuery.trim();
        const payload = {
            address: targetAddress,
            propertyData: apiData || selectedProperty,
        };

        console.log('────────────────────────────────────────');
        console.log('[PropertyIntelligence] 💾 SAVE PROPERTY REQUEST');
        console.log('[PropertyIntelligence] URL     : https://staging.zien.ai/api/solo/properties/intelligence/saved');
        console.log('[PropertyIntelligence] PAYLOAD :', JSON.stringify(payload, null, 2));
        console.log('────────────────────────────────────────');

        try {
            const res = await fetch('https://staging.zien.ai/api/solo/properties/intelligence/saved', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            console.log('[PropertyIntelligence] ✅ SAVE PROPERTY RESPONSE STATUS:', res.status);
            console.log('[PropertyIntelligence] 📦 SAVE PROPERTY RESPONSE DATA:', json);
            console.log('────────────────────────────────────────');

            if (res.status === 200 || res.status === 201 || json.success) {
                setIsPropertySaved(true);
                Alert.alert('Success', 'Property saved successfully!');
            } else if (res.status === 409) {
                setIsPropertySaved(true);
                Alert.alert('Notice', 'This property is already in your saved list.');
            } else {
                setIsPropertySaved(true);
                Alert.alert('Saved', json.message || 'Property saved successfully!');
            }
        } catch (e) {
            console.error('[PropertyIntelligence] 💥 SAVE PROPERTY ERROR:', e);
            Alert.alert('Error', 'Failed to save property. Please check your network connection.');
        } finally {
            setIsSavingProperty(false);
        }
    };

    // Sync sub-tabs to the drawer whenever they change
    useEffect(() => {
        if (selectedProperty) {
            setDrawerSubTabs(SUB_TABS, activeSubTab, (tab) => setActiveSubTab(tab));
        } else {
            setDrawerSubTabs([], '', () => {});
        }
    }, [selectedProperty, activeSubTab]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError(null);
        try {
            const encoded = encodeURIComponent(searchQuery.trim());
            const url = `https://staging.zien.ai/api/solo/properties/intelligence?address=${encoded}`;

            console.log('────────────────────────────────────────');
            console.log('[PropertyIntelligence] 🔍 API REQUEST');
            console.log('[PropertyIntelligence] URL     :', url);
            console.log('[PropertyIntelligence] PAYLOAD :', { address: searchQuery.trim() });
            console.log('[PropertyIntelligence] TOKEN   :', accessToken ? `Bearer ${accessToken.substring(0, 20)}...` : 'NO TOKEN');
            console.log('────────────────────────────────────────');

            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const json = await res.json();

            console.log('[PropertyIntelligence] ✅ API RESPONSE STATUS:', res.status);
            console.log('[PropertyIntelligence] 📦 RESPONSE DATA:', JSON.stringify(json, null, 2));
            console.log('────────────────────────────────────────');

            if (json?.success && json?.data) {
                const d = json.data;
                const photos = (d.Media || []).map((m: any) => m.MediaURL).filter(Boolean);
                handleSelectProperty({
                    id: d.ListingKey || 'search',
                    type: d.PropertySubType || d.PropertyType || 'Property',
                    address: d.UnparsedAddress || searchQuery.trim(),
                    price: d.ListPrice ? `$${d.ListPrice.toLocaleString()}` : 'N/A',
                    appreciation: '+N/A',
                    image: photos[0] || 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800',
                }, json.data);
            } else {
                console.warn('[PropertyIntelligence] ❌ No data in response:', json);
                const errMsg = json?.error || json?.message || (res.status === 402 ? 'Insufficient AI Credits.' : 'Property not found. Please try a different address.');
                setSearchError(errMsg);
                setIsSearching(false);
            }
        } catch (e) {
            console.error('[PropertyIntelligence] 💥 NETWORK ERROR:', e);
            setSearchError('Network error. Please check your connection.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestionPress = async (addr: string, fallbackData?: any) => {
        setSearchQuery(addr);
        setIsSearching(true);
        setSearchError(null);
        try {
            const encoded = encodeURIComponent(addr);
            const url = `https://staging.zien.ai/api/solo/properties/intelligence?address=${encoded}`;

            console.log('────────────────────────────────────────');
            console.log('[PropertyIntelligence] 🔍 API REQUEST (Intelligence)');
            console.log('[PropertyIntelligence] URL     :', url);
            console.log('[PropertyIntelligence] PAYLOAD :', { address: addr });
            console.log('[PropertyIntelligence] TOKEN   :', accessToken ? `Bearer ${accessToken.substring(0, 20)}...` : 'NO TOKEN');
            console.log('────────────────────────────────────────');

            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const json = await res.json().catch(() => ({}));

            console.log('[PropertyIntelligence] ✅ API RESPONSE STATUS:', res.status);
            console.log('[PropertyIntelligence] 📦 RESPONSE DATA:', JSON.stringify(json, null, 2));
            console.log('────────────────────────────────────────');

            if (json?.success && json?.data) {
                const d = json.data;
                const photos = (d.Media || []).map((m: any) => m.MediaURL).filter(Boolean);
                handleSelectProperty({
                    id: d.ListingKey || 'suggestion',
                    type: d.PropertySubType || d.PropertyType || 'Property',
                    address: d.UnparsedAddress || addr,
                    price: d.ListPrice ? `$${d.ListPrice.toLocaleString()}` : 'N/A',
                    appreciation: '+N/A',
                    image: photos[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
                }, json.data);
            } else if (res.status === 402 || json?.error || (json?.message && json.message.toLowerCase().includes('credit'))) {
                console.warn('[PropertyIntelligence] ❌ Insufficient credits or error:', json);
                const errMsg = json?.error || json?.message || 'Insufficient AI Credits.';
                setSearchError(errMsg);
            } else if (fallbackData && res.ok) {
                console.log('[PropertyIntelligence] Using fallback property data');
                handleSelectProperty({
                    id: fallbackData.ListingKey || 'property',
                    type: fallbackData.PropertySubType || fallbackData.PropertyType || 'Property',
                    address: fallbackData.UnparsedAddress || addr,
                    price: fallbackData.ListPrice ? `$${fallbackData.ListPrice.toLocaleString()}` : 'N/A',
                    image: fallbackData.Media?.[0]?.MediaURL || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
                }, fallbackData);
            } else {
                console.warn('[PropertyIntelligence] ❌ No data in response:', json);
                const errMsg = json?.error || json?.message || (res.status === 402 ? 'Insufficient AI Credits.' : 'Property not found for this address.');
                setSearchError(errMsg);
            }
        } catch (e) {
            console.error('[PropertyIntelligence] 💥 NETWORK ERROR:', e);
            setSearchError('Network error. Please check your connection.');
        } finally {
            setIsSearching(false);
        }
    };

    const FEATURED_PROPERTIES = [
        {
            id: '1',
            type: 'SINGLE FAMILY',
            address: '4521 Wilshire Blvd, Los Angeles, CA',
            price: '$1,285,000',
            appreciation: '+6.8%',
            image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
        },
        {
            id: '2',
            type: 'CONDO',
            address: '2901 Ocean Ave, Santa Monica, CA',
            price: '$2,140,000',
            appreciation: '+9.2%',
            image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
        },
        {
            id: '3',
            type: 'TOWNHOUSE',
            address: '812 Rosecrans Ave, Manhattan Beach, CA',
            price: '$1,870,000',
            appreciation: '+4.1%',
            image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
        }
    ];

    const SUGGESTIONS = [
        '4521 Wilshire Blvd, Los Angeles, CA',
        '2901 Ocean Ave, Santa Monica, CA',
        '7845 Hillside Ave, Hollywood Hills, CA'
    ];

    const renderHeader = () => (
        <View style={styles.heroSection}>
            <LinearGradient
                colors={['#0B213E', '#163866']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContent}
            >
                <View style={styles.heroHeaderRow}>
                    <View style={styles.heroIconBadge}>
                        <MaterialCommunityIcons name="domain" size={22} color="#06B6D4" />
                    </View>
                    <Text style={styles.heroTitle}>Property Intelligence Hub</Text>
                </View>
                <Text style={styles.heroSubtitle}>
                    Structural data, valuation, risk, price trends & neighborhood insights — all in one place.
                </Text>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Enter US property address..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                if (searchError) setSearchError(null);
                            }}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        <Pressable style={styles.searchButton} onPress={handleSearch}>
                            {isSearching
                                ? <ActivityIndicator size="small" color="#FFFFFF" />
                                : <Text style={styles.searchButtonText}>Search</Text>
                            }
                        </Pressable>
                    </View>
                    {searchError ? (
                        <View style={styles.errorBanner}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
                            <Text style={styles.errorText}>{searchError}</Text>
                        </View>
                    ) : null}
                </View>
            </LinearGradient>
        </View>
    );



    const renderPropertyBar = () => (
        <View style={styles.propertyBar}>
            <View style={styles.propertyBarLeft}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.accent} />
                <Text style={styles.propertyBarAddress} numberOfLines={1}>
                    {selectedProperty?.address || '4521 Wilshire Blvd, Los Angeles, CA'}
                </Text>
            </View>

            <View style={styles.propertyBarActions}>
                <Pressable
                    style={[styles.savePropertyBtn, isPropertySaved && styles.savePropertyBtnActive]}
                    onPress={handleSaveProperty}
                    disabled={isSavingProperty}
                >
                    {isSavingProperty ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <MaterialCommunityIcons
                                name={isPropertySaved ? "bookmark" : "bookmark-outline"}
                                size={14}
                                color="#FFFFFF"
                            />
                            <Text style={styles.savePropertyBtnText}>
                                {isPropertySaved ? 'Saved' : 'Save Property'}
                            </Text>
                        </>
                    )}
                </Pressable>

                <Pressable
                    style={styles.newSearchBtn}
                    onPress={() => { setSelectedProperty(null); setSearchQuery(''); setIsPropertySaved(false); }}
                >
                    <Text style={styles.newSearchBtnText}>New Search</Text>
                    <MaterialCommunityIcons name="magnify" size={12} color={colors.textSecondary} />
                </Pressable>
            </View>
        </View>
    );

    const renderSubTabs = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTabsScroll}
        >
            {SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab;
                return (
                    <Pressable
                        key={tab}
                        style={[styles.subTab, isActive && styles.subTabActive]}
                        onPress={() => setActiveSubTab(tab)}
                    >
                        <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>{tab}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    const renderActiveTab = () => {
        switch (activeSubTab) {
            case 'Overview':
                return <OverviewTab property={selectedProperty} apiData={apiData} />;
            case 'Comparable Listings':
                return <ComparableListingsTab property={selectedProperty} apiData={apiData} />;
            case 'Market Trends':
                return <PriceTrendTab property={selectedProperty} apiData={apiData} />;
            case 'Property Details':
                return <PropertyDetailsTab property={selectedProperty} apiData={apiData} />;
            case 'Demographics':
                return <DemographicsTab property={selectedProperty} apiData={apiData} />;
            case 'Map View':
                return <NearbyPlacesTab property={selectedProperty} apiData={apiData} />;
            default:
                return <OverviewTab property={selectedProperty} apiData={apiData} />;
        }
    };

    const renderDetailView = () => (
        <View style={styles.detailContainer}>
            {renderPropertyBar()}
            {renderSubTabs()}
            {renderActiveTab()}
        </View>
    );

    const renderAddedPropertiesView = () => {
        const displayList = userProperties.length > 0 ? userProperties : FEATURED_PROPERTIES.map(p => ({
            id: p.id,
            address: p.address,
            data: {
                PropertyType: p.type,
                ListPrice: parseInt(p.price.replace(/[^0-9]/g, '')) || 1285000,
                Media: [{ MediaURL: p.image }],
                UnparsedAddress: p.address,
            }
        }));

        return (
            <>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialCommunityIcons name="trending-up" size={18} color={colors.accent} />
                        <Text style={styles.sectionTitle}>YOUR ADDED PROPERTIES</Text>
                    </View>
                </View>

                {isLoadingUserProps ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                ) : (
                    <FlatList
                        horizontal
                        data={displayList}
                        keyExtractor={(item) => String(item.id)}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredList}
                        renderItem={({ item }) => {
                            const pData = item.data || {};
                            const mediaUrl = pData.Media?.[0]?.MediaURL || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800';
                            const propType = (pData.PropertyType || pData.PropertySubType || 'LAND').toUpperCase();
                            const addr = item.address || pData.UnparsedAddress || 'Property Address';
                            const priceFormatted = pData.ListPrice ? `$${Number(pData.ListPrice).toLocaleString()}` : '$1,500,000';

                            return (
                                <Pressable
                                    style={styles.propertyCard}
                                    onPress={() => handleSuggestionPress(addr, pData)}
                                >
                                    <View style={styles.imageContainer}>
                                        <Image source={{ uri: mediaUrl }} style={styles.propertyImage} />
                                    </View>
                                    <View style={styles.propertyDetails}>
                                        <Text style={styles.propertyType}>{propType}</Text>
                                        <Text style={styles.propertyAddress} numberOfLines={2}>{addr}</Text>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.propertyPrice}>{priceFormatted}</Text>
                                            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        }}
                    />
                )}
            </>
        );
    };

    if (isSearching) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.searchLoadingBox}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>Analyzing property data...</Text>
                    <Text style={styles.loadingSubText}>Fetching valuation, risk scores, market trends</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={selectedProperty ? [1] : undefined}
            >
                {renderHeader()}

                {selectedProperty ? (
                    <View style={styles.stickyBarWrap}>
                        {renderPropertyBar()}
                        {renderSubTabs()}
                    </View>
                ) : null}

                {selectedProperty ? (
                    <View style={styles.detailContainer}>
                        {renderActiveTab()}
                    </View>
                ) : (
                    renderAddedPropertiesView()
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function getStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
        },
        searchLoadingBox: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 40,
            gap: 16,
        },
        loadingText: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            textAlign: 'center',
        },
        loadingSubText: {
            fontSize: 13,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 20,
        },
        heroSection: {
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 30,
        },
        heroContent: {
            borderRadius: 24,
            padding: 22,
            alignItems: 'flex-start',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
        },
        heroHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
        },
        heroIconBadge: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        heroTitle: {
            fontSize: 19,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 0.2,
        },
        heroSubtitle: {
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 18,
            marginBottom: 20,
        },
        searchContainer: {
            width: '100%',
            marginBottom: 16,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            paddingLeft: 12,
            paddingRight: 6,
            height: 50,
        },
        searchInput: {
            flex: 1,
            fontSize: 13,
            color: '#0F172A',
            paddingHorizontal: 8,
            fontWeight: '600',
        },
        searchButton: {
            backgroundColor: '#06B6D4',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            minWidth: 70,
            alignItems: 'center',
            justifyContent: 'center',
        },
        searchButtonText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '800',
        },
        errorBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            paddingHorizontal: 4,
        },
        errorText: {
            color: '#EF4444',
            fontSize: 12,
            fontWeight: '600',
            flex: 1,
        },
        suggestionsContainer: {
            width: '100%',
        },
        tryLabel: {
            fontSize: 10,
            fontWeight: '900',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 8,
            letterSpacing: 0.8,
        },
        suggestionsScroll: {
            gap: 8,
        },
        suggestionChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.12)',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 10,
            maxWidth: 240,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        suggestionText: {
            color: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: '600',
        },
        sectionHeader: {
            paddingHorizontal: 20,
            marginBottom: 16,
        },
        sectionTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        sectionTitle: {
            fontSize: 12,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 1,
        },
        featuredList: {
            paddingHorizontal: 20,
            gap: 16,
        },
        propertyCard: {
            width: 280,
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
        },
        imageContainer: {
            width: '100%',
            height: 160,
        },
        propertyImage: {
            width: '100%',
            height: '100%',
        },
        appreciationBadge: {
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: '#10B981',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#065F46',
        },
        appreciationText: {
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '900',
        },
        propertyDetails: {
            padding: 16,
        },
        propertyType: {
            fontSize: 11,
            fontWeight: '800',
            color: colors.accent,
            marginBottom: 8,
        },
        propertyAddress: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.textPrimary,
            lineHeight: 22,
            marginBottom: 12,
            height: 44,
        },
        priceRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        propertyPrice: {
            fontSize: 18,
            fontWeight: '900',
            color: colors.textPrimary,
        },
        stickyBarWrap: {
            backgroundColor: colors.cardBackground,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
            marginBottom: 16,
            zIndex: 99,
            elevation: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
        },
        detailContainer: {
            paddingHorizontal: 20,
        },
        propertyBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceSoft,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            marginBottom: 10,
            gap: 10,
        },
        activeTabIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: colors.cardBackground,
            borderRadius: 10,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        activeTabLabel: {
            fontSize: 13,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        activeTabHint: {
            fontSize: 11,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        propertyBarLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,

        },
        propertyBarAddress: {
            flex: 1,
            fontSize: 12,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        propertyBarActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        savePropertyBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 5,
            paddingHorizontal: 9,
            backgroundColor: '#06B6D4',
            borderRadius: 8,
        },
        savePropertyBtnActive: {
            backgroundColor: '#10B981',
        },
        savePropertyBtnText: {
            fontSize: 10,
            fontWeight: '800',
            color: '#FFFFFF',
        },
        barDivider: {
            width: 1,
            height: 16,
            backgroundColor: colors.cardBorder,
            marginHorizontal: 8,
        },
        newSearchBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 4,
            paddingHorizontal: 8,
            backgroundColor: colors.cardBackground,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        newSearchBtnText: {
            fontSize: 10,
            fontWeight: '900',
            color: colors.textSecondary,
        },
        subTabsScroll: {
            paddingBottom: 16,
            gap: 10,
        },
        subTab: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: 'transparent',
        },
        subTabActive: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
        },
        subTabText: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        subTabTextActive: {
            color: colors.accent,
        },
        emptyState: {
            alignItems: 'center',
            paddingVertical: 40,
            gap: 12,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        emptySubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
        },
    });
}
