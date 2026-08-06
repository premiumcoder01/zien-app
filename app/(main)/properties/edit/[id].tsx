import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { extractPriceNumber, finalizeProperty, formatPropertyPrice, getPropertyDetails, uploadPropertyImage } from '@/services/propertyService';
import { createOpenHouse, getOpenHouses } from '@/services/openHouseService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Step Indicator Component (Copied from Create) ---
function StepIndicator({ activeStep, steps }: { activeStep: number; steps: { label: string }[] }) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);
  const isDark = theme === 'dark';

  return (
    <View style={styles.indicatorWrapper}>
      <View style={styles.indicatorRow}>
        {steps.map((step, idx) => {
          const isActive = activeStep === idx;
          const isPast = activeStep > idx;
          const activeNumColor = isDark ? colors.cardBackground : '#FFF';

          return (
            <React.Fragment key={idx}>
              <View style={styles.indicatorStepItem}>
                <View style={[
                  styles.indicatorCircle,
                  isActive && styles.indicatorCircleActive,
                  isPast && styles.indicatorCirclePast
                ]}>
                  {isPast ? (
                    <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                  ) : (
                    <Text style={[
                      styles.indicatorNumber,
                      isActive && { color: activeNumColor }
                    ]}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={[styles.indicatorLabel, isActive && styles.indicatorLabelActive]}>{step.label}</Text>
              </View>
              {idx < steps.length - 1 && (
                <View style={[styles.indicatorLine, isPast && styles.indicatorLineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

// --- Helper Components ---
function PropertyStatCard({ icon, label, value }: { icon: string, label: string, value: string }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.statCardPremium}>
      <View style={styles.statIconBoxPremium}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.accentTeal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabelPremium}>{label}</Text>
        <Text style={styles.statValuePremium}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function PropertyDetailItem({ icon, label, value, isPill }: { icon: string, label: string, value: string | string[] | undefined, isPill?: boolean }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const renderValue = () => {
    if (!value) return <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }}>—</Text>;
    if (Array.isArray(value) || isPill) {
      const items = Array.isArray(value) ? value : [value];
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {items.map((item, idx) => (
            <View key={idx} style={styles.pillContainer}>
              <Text style={styles.pillText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    }
    return <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary }} numberOfLines={2}>{value}</Text>;
  };
  return (
    <View style={styles.structuralDetailCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>{label}</Text>
      </View>
      {renderValue()}
    </View>
  );
}

// --- Steps (Copied and adapted from Create) ---

const DETAIL_TABS = ['Structural', 'Exterior', 'Interior', 'Utilities', 'Legal', 'Remarks'] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function StepDetails({ formData }: { formData: any }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState<DetailTab>('Structural');
  const totalBaths = parseFloat(formData.bathsFull || '0') + (parseFloat(formData.bathsHalf || '0') * 0.5);

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: 0, paddingTop: 24 }]}>
      <View style={styles.intelHeaderBox}>
        <View style={styles.intelIconOuter}>
          <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={28} color={colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={styles.intelTitle}>Property Intelligence</Text>
            <View style={styles.verifiedPill}><Text style={styles.verifiedPillText}>{formData.confidence || 90}% VERIFIED</Text></View>
          </View>
          <Text style={styles.intelSubtitle}>Institutional data successfully mapped to your vault.</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PropertyStatCard icon="bed-outline" label="Bedrooms" value={formData.beds} />
          <PropertyStatCard icon="shower" label="Bathrooms" value={totalBaths > 0 ? totalBaths.toString() : ''} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PropertyStatCard icon="ruler-square" label="Living Area" value={formData.sqft ? `${formData.sqft} Sq Ft` : ''} />
          <PropertyStatCard icon="currency-usd" label="List Price" value={formData.price} />
        </View>
      </View>

      {/* Detail Tabs Bar - Matching Web Design */}
      <View style={styles.detailTabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.detailTabBarContent}
        >
          {DETAIL_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.detailTabItem, isActive && styles.detailTabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.detailTabText, isActive && styles.detailTabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.detailTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Structural Tab */}
      {activeTab === 'Structural' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <PropertyDetailItem icon="office-building-outline" label="Property Type" value={formData.type} />
            <PropertyDetailItem icon="map-marker-outline" label="Address" value={formData.address} />
            <PropertyDetailItem icon="calendar-blank-outline" label="Year Built" value={formData.year} />
            <PropertyDetailItem icon="layers-outline" label="Stories" value={formData.stories} />
            <PropertyDetailItem icon="home-roof" label="Roof Material" value={formData.roof} isPill />
          </View>
        </View>
      )}

      {/* Exterior Tab */}
      {activeTab === 'Exterior' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <PropertyDetailItem icon="arrow-expand-all" label="Lot Size" value={formData.lotSize} />
            <PropertyDetailItem icon="earth" label="Lot Features" value={formData.lotFeatures} />
            <PropertyDetailItem icon="shield-outline" label="Fencing" value={formData.fencing} isPill />
            <PropertyDetailItem icon="car-outline" label="Parking" value={formData.parkingFeatures} />
          </View>
        </View>
      )}

      {/* Interior Tab */}
      {activeTab === 'Interior' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <PropertyDetailItem icon="view-grid-outline" label="Flooring" value={formData.flooring} />
            <PropertyDetailItem icon="lightning-bolt-outline" label="Appliances" value={formData.appliances} />
          </View>
        </View>
      )}

      {/* Utilities Tab */}
      {activeTab === 'Utilities' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <PropertyDetailItem icon="thermometer" label="Heating" value={Array.isArray(formData.heating) ? formData.heating.join(', ') : formData.heating} isPill />
            <PropertyDetailItem icon="snowflake" label="Cooling" value={Array.isArray(formData.cooling) ? formData.cooling.join(', ') : formData.cooling} isPill />
            <PropertyDetailItem icon="water-outline" label="Water Source" value={formData.waterSource || '—'} isPill />
            <PropertyDetailItem icon="city-variant-outline" label="City" value={formData.city || (formData.address ? (formData.address.split(',')[1]?.trim() || formData.address.split(',')[0]?.trim()) : '—')} />
            {!!formData.sewer && <PropertyDetailItem icon="water-pump" label="Sewer" value={formData.sewer} isPill />}
          </View>
        </View>
      )}

      {/* Legal Tab */}
      {activeTab === 'Legal' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <PropertyDetailItem icon="pound" label="ListingId" value={formData.listingId} />
            <PropertyDetailItem icon="pulse" label="Status" value={formData.standardStatus} />
            <PropertyDetailItem icon="file-document-outline" label="Listing Terms" value={formData.listingTerms} />
          </View>
        </View>
      )}

      {/* Remarks Tab */}
      {activeTab === 'Remarks' && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Public Remarks</Text>
            <View style={styles.remarkCard}><Text style={styles.remarkText}>{formData.publicRemarks || 'No public remarks.'}</Text></View>
          </View>
        </View>
      )}

      <View style={{ height: 160 }} />
    </View>
  );
}

function StepMedia({ mlsPhotos, setMlsPhotos, userPhotos, setUserPhotos, onPickerOpen, isUploading }: any) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.stepContainer}>
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={styles.intelTitle}>Media & Assets</Text>
        <Text style={styles.intelSubtitle}>Review MLS shots or add your own enhancements.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mediaSection}>
          <Text style={styles.mediaSectionTitle}>MLS Professional</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {mlsPhotos.map((url: string, idx: number) => (
              <View key={idx} style={styles.premiumPhotoCard}>
                <View style={styles.photoContainerLarge}>
                  <Image source={{ uri: url }} style={styles.photoCard} contentFit="cover" />
                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => setMlsPhotos((prev: string[]) => prev.filter(p => p !== url))}>
                    <MaterialCommunityIcons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.photoCardFooter}>
                  <Text style={styles.photoFooterLabel}>VERIFIED MLS</Text>
                  <Text style={styles.photoFooterTitle}>Scene {idx + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.mediaSection, { marginTop: 32 }]}>
          <View style={styles.mediaSectionHeader}>
            <Text style={styles.mediaSectionTitle}>MY UPLOADS</Text>
            <TouchableOpacity style={styles.addMediaBtnSmall} onPress={onPickerOpen}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.accentTeal} />
              <Text style={styles.addMediaBtnText}>Add Media</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {userPhotos.map((url: string, idx: number) => (
              <View key={idx} style={styles.premiumPhotoCard}>
                <View style={styles.photoContainerLarge}>
                  <Image source={{ uri: url }} style={styles.photoCard} contentFit="cover" />
                  <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => setUserPhotos((prev: string[]) => prev.filter(p => p !== url))}>
                    <MaterialCommunityIcons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.photoCardFooter}>
                  <Text style={styles.photoFooterLabel}>AI OPTIMIZED</Text>
                  <Text style={styles.photoFooterTitle}>Scene {idx + 1}</Text>
                </View>
              </View>
            ))}
            {isUploading && (
              <View style={[styles.premiumPhotoCard, styles.uploadPlaceholderCard, { height: 260, justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.accentTeal} />
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function StepReview({ mlsPhotos, userPhotos, formData }: any) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const allImages = [...mlsPhotos, ...userPhotos];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.premiumCardLarge}>
        <Text style={styles.premiumGroupLabel}>READY TO FINALIZE</Text>
        <Text style={styles.cardHeaderTitle}>Review Updates</Text>
        <Text style={styles.cardHeaderSubtitle}>Everything is set to be broadcasted to the network.</Text>

        <View style={{ marginTop: 24, padding: 16, backgroundColor: colors.surfaceIcon, borderRadius: 16 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>{formData.address}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={{ color: colors.textSecondary }}>Photos Count</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{allImages.length}</Text>
          </View>
        </View>

        {allImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }}>
            {allImages.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: 120, height: 80, borderRadius: 12, marginRight: 8 }} contentFit="cover" />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function StepSuccess({ propertyId, address }: { propertyId: string, address: string }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const cards = useMemo(() => {
    if (isMobile) {
      return [
        {
          id: 'inventory',
          title: 'Property Inventory',
          subtitle: 'Return to your vault and manage all listings.',
          icon: 'bank',
        },
        {
          id: 'openhouse',
          title: 'Schedule Open House',
          subtitle: 'Activate digital check-in and visitor tracking.',
          icon: 'calendar-clock-outline',
        },
        {
          id: 'social',
          title: 'Add to Social Media',
          subtitle: 'Broadcast this listing to Instagram and LinkedIn.',
          icon: 'share-variant-outline',
        },
        {
          id: 'campaign',
          title: 'Add to Campaign',
          subtitle: 'Connect to active marketing and drip flows.',
          icon: 'bullhorn-outline',
        },
      ];
    } else {
      return [
        {
          id: 'inventory',
          title: 'Property Inventory',
          subtitle: 'Return to your vault and manage all listings.',
          icon: 'bank',
        },
        {
          id: 'hub',
          title: 'View Property Hub',
          subtitle: 'Access detailed analytics, media, and connected workflows.',
          icon: 'cube-outline',
        },
        {
          id: 'openhouse_live',
          title: 'Live to Open House',
          subtitle: 'Generate an AI-powered Open House registration page.',
          icon: 'calendar-check-outline',
        },
        {
          id: 'campaign_web',
          title: 'Email/SMS Campaign',
          subtitle: 'Launch an email and SMS campaign for this listing.',
          icon: 'bullhorn-outline',
        },
        {
          id: 'social_web',
          title: 'Post to Social Media',
          subtitle: 'Instantly create and share an AI-generated post.',
          icon: 'share-variant-outline',
        },
      ];
    }
  }, [isMobile]);

  return (
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      {/* Icon Circle */}
      <View style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.surfaceIcon,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <MaterialCommunityIcons name="check-bold" size={32} color={colors.accentTeal} />
      </View>

      <Text style={{ fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 }}>
        {isMobile ? "Updates Saved!" : "Property Added"}
      </Text>
      <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
        {isMobile ? (
          <>Your property at <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{address}</Text> has been successfully updated.</>
        ) : (
          <>Your property at <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{address.toLowerCase().includes('usa') ? address : `${address}, USA`}</Text> has been successfully optimized and broadcasted.</>
        )}
      </Text>

      <View style={{ width: '100%', marginTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 }}>
            {isMobile ? "NEXT PHASE" : "PROPERTY ADDED: CHOOSE NEXT PHASE"}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>ID: {propertyId}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={{
                width: isMobile ? (SCREEN_WIDTH - 44) / 2 : '31%',
                backgroundColor: colors.cardBackground,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                minHeight: 140
              }}
              onPress={async () => {
                if (card.id === 'inventory') {
                  router.push('/(main)/properties');
                } else if (card.id === 'openhouse') {
                  router.push('/(main)/open-house');
                } else if (card.id === 'social' || card.id === 'social_web') {
                  router.push({
                    pathname: '/(main)/social-hub/create-post',
                    params: { propertyId }
                  } as any);
                } else if (card.id === 'campaign' || card.id === 'campaign_web') {
                  const cleanAddress = address;
                  const fullAddress = cleanAddress.toLowerCase().includes('usa') ? cleanAddress : `${cleanAddress}, USA`;
                  router.push({
                    pathname: '/(main)/crm/campaigns',
                    params: {
                      openAiModal: 'true',
                      aiPrompt: `Write a persuasive email campaign promoting my new listing at ${fullAddress}. Include a strong call to action for the recipient to click the link to view the property photos and RSVP.`
                    }
                  } as any);
                } else if (card.id === 'hub') {
                  router.push({
                    pathname: '/(main)/properties/[id]',
                    params: { id: propertyId }
                  } as any);
                } else if (card.id === 'openhouse_live') {
                  try {
                    const events = await getOpenHouses(accessToken || '');
                    const existingEvent = events.find(e => e.property_id === Number(propertyId));
                    if (existingEvent) {
                      router.push(`/(main)/open-house/edit/${existingEvent.id}` as any);
                    } else {
                      const defaultDate = new Date();
                      defaultDate.setDate(defaultDate.getDate() + 7);
                      const dateStr = defaultDate.toISOString().split('T')[0];

                      const payload = {
                        property_id: Number(propertyId),
                        date: dateStr,
                        start_time: "10:00",
                        end_time: "12:00",
                        agent_details: {
                          name: "sweta",
                          brokerage: "zien",
                          license: "23243654765",
                          email: "sweta.isynbus@gmail.com",
                          phone: "+91 93196-14264"
                        },
                        ai_description: "Breathtaking Luxury estate featuring rare architectural details, bespoke imported finishes, and a seamless connection to private, manicured grounds. This residence offers an unparalleled lifestyle for those who demand excellence in every square inch.",
                        brand_color: "#0B2D3E",
                        gallery_images: [],
                        logo_text: "sweta",
                        ai_tone: "Luxury",
                        visitor_registration: true,
                        send_report: true,
                      };

                      const res = await createOpenHouse(accessToken || '', payload);
                      const newEventId = res?.data?.id || res?.id;
                      if (newEventId) {
                        router.push(`/(main)/open-house/edit/${newEventId}` as any);
                      } else {
                        Alert.alert('Error', 'Failed to create open house event.');
                      }
                    }
                  } catch (err) {
                    console.error(err);
                    Alert.alert('Error', 'An error occurred while routing to the open house page.');
                  }
                }
              }}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.surfaceSoft,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <MaterialCommunityIcons name={card.icon as any} size={20} color={colors.textPrimary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 }}>{card.title}</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 15 }}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function EditListingScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { accessToken } = useAuth();

  const [activeStep, setActiveStep] = useState(1); // Default to Step 2 (Index 1)
  const [formData, setFormData] = useState<any>(null);
  const [mlsPhotos, setMlsPhotos] = useState<string[]>([]);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [isPickingMedia, setIsPickingMedia] = useState(false);

  // Fetch Logic
  const { isLoading: isFetching } = useQuery({
    queryKey: ['property-edit', id],
    queryFn: async () => {
      const res = await getPropertyDetails(id as string, accessToken!);
      if (res.success) {
        const d = res.data.data;


        // Map backend fields to the keys used in StepDetails/StepReview
        const extractedPrice = extractPriceNumber(d);
        const formattedPrice = formatPropertyPrice(d, '');

        const mappedData = {
          ...d,
          beds: d.BedroomsTotal?.toString() || '',
          bathsFull: d.BathroomsFull?.toString() || '',
          bathsHalf: d.BathroomsHalf?.toString() || '',
          sqft: d.BuildingAreaTotal?.toString() || d.LivingArea?.toString() || '',
          price: formattedPrice || (d.price ? String(d.price) : ''),
          ListPrice: extractedPrice > 0 ? extractedPrice : d.ListPrice,
          HAR_CurrentPrice: extractedPrice > 0 ? extractedPrice : d.HAR_CurrentPrice,
          year: d.YearBuilt?.toString() || '',
          address: d.address || d.UnparsedAddress || '',
          type: d.PropertySubType || d.PropertyType || '',
          stories: d.Stories?.toString() || d.StoriesTotal?.toString() || '',
          roof: d.Roof || [],
          flooring: d.Flooring || [],
          appliances: d.Appliances || [],
          publicRemarks: d.PublicRemarks || '',
          privateRemarks: d.PrivateRemarks || '',
          listingId: d.ListingId || '',
          cooling: d.Cooling || [],
          heating: d.Heating || [],
          lotSize: d.LotSizeArea?.toString() || '',
          fencing: d.Fencing || [],
        };

        setFormData(mappedData);
        setUserPhotos(d.user_images || []);
        setMlsPhotos((d.Media || []).map((m: any) => m.MediaURL));
      }
      return res.data;
    },
    enabled: !!id && !!accessToken
  });

  const { mutate: uploadMutation, isPending: isUploading } = useMutation({
    mutationFn: (uri: string) => uploadPropertyImage(uri, accessToken!),
    onSuccess: (resData) => setUserPhotos(prev => [...prev, resData.url]),
    onError: (err: any) => alert(err.message || "Upload Failed")
  });

  const { mutate: finalizeMutation, isPending: isFinalizing } = useMutation({
    mutationFn: () => {
      const extractedNum = extractPriceNumber(formData);
      const finalPrice = formData.price || (extractedNum > 0 ? `$${extractedNum.toLocaleString()}` : '');

      const finalData = {
        ...formData,
        price: finalPrice,
        ...(extractedNum > 0 ? { ListPrice: extractedNum, HAR_CurrentPrice: extractedNum } : {}),
        user_images: userPhotos,
        Media: mlsPhotos.map(url => ({ MediaCategory: 'Photo', MediaURL: url }))
      };
      return finalizeProperty({
        id: id as string,
        address: formData.address,
        data: finalData,
        userImages: userPhotos
      }, accessToken!);
    },
    onSuccess: () => setActiveStep(4), // Success Step
    onError: (err: any) => alert(err.message || "Finalize Failed")
  });

  const steps = [
    { icon: 'home-edit', label: 'Details' },
    { icon: 'auto-fix', label: 'AI Media' },
    { icon: 'publish', label: 'Review' }
  ];

  const renderStep = () => {
    if (!formData) return null;
    switch (activeStep) {
      case 1: return <StepDetails formData={formData} />;
      case 2: return <StepMedia mlsPhotos={mlsPhotos} setMlsPhotos={setMlsPhotos} userPhotos={userPhotos} setUserPhotos={setUserPhotos} onPickerOpen={() => setIsPickingMedia(true)} isUploading={isUploading} />;
      case 3: return <StepReview mlsPhotos={mlsPhotos} userPhotos={userPhotos} formData={formData} />;
      case 4: return <StepSuccess propertyId={id as string} address={formData.address} />;
      default: return null;
    }
  };

  if (isFetching || !formData) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.accentTeal} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient as any} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={{ paddingTop: insets.top }}>
        <PageHeader title="Edit Property" subtitle={formData.address} onBack={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: activeStep < 4 ? 120 : 40 }]} showsVerticalScrollIndicator={false}>
        {activeStep < 4 && <StepIndicator activeStep={activeStep - 1} steps={steps} />}
        {renderStep()}
      </ScrollView>

      {activeStep < 4 && (
        <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.actionRowFixed}>
            {activeStep > 1 && (
              <TouchableOpacity style={styles.backBtnFixed} onPress={() => setActiveStep(prev => prev - 1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.continueBtnFixed, activeStep === 1 && { flex: 1 }]}
              onPress={() => activeStep === 3 ? finalizeMutation() : setActiveStep(prev => prev + 1)}
              disabled={isFinalizing}
            >
              {isFinalizing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueBtnText}>{activeStep === 3 ? "Save Changes" : "Continue"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Media Picker Modal */}
      <Modal visible={isPickingMedia} transparent animationType="slide" onRequestClose={() => setIsPickingMedia(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsPickingMedia(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}><View style={styles.sheetDragHandle} /><Text style={styles.sheetTitle}>Add Media</Text></View>
            <TouchableOpacity style={styles.sheetActionItem} onPress={() => {
              setIsPickingMedia(false);
              setTimeout(async () => {
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                if (!res.canceled && res.assets[0]) uploadMutation(res.assets[0].uri);
              }, 300);
            }}>
              <MaterialCommunityIcons name="image-multiple" size={24} color={colors.accentTeal} style={{ marginRight: 15 }} />
              <Text style={styles.sheetActionText}>Photo Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetActionItem} onPress={() => {
              setIsPickingMedia(false);
              setTimeout(async () => {
                const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
                if (!res.canceled && res.assets[0]) uploadMutation(res.assets[0].uri);
              }, 300);
            }}>
              <MaterialCommunityIcons name="camera" size={24} color="#EC4899" style={{ marginRight: 15 }} />
              <Text style={styles.sheetActionText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    scrollContent: { paddingHorizontal: 16 },
    indicatorWrapper: { paddingVertical: 20 },
    indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    indicatorStepItem: { alignItems: 'center', gap: 6, width: 80 },
    indicatorCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceIcon, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
    indicatorCircleActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
    indicatorCirclePast: { backgroundColor: colors.accentTeal, borderColor: colors.accentTeal },
    indicatorNumber: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },
    indicatorLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
    indicatorLabelActive: { color: colors.textPrimary, fontWeight: '900' },
    indicatorLine: { width: 40, height: 2, backgroundColor: colors.cardBorder, marginTop: -16 },
    indicatorLineActive: { backgroundColor: colors.accentTeal },
    stepContainer: { width: '100%' },
    premiumCardLarge: { backgroundColor: colors.cardBackground, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 24 },
    cardHeaderCentric: { alignItems: 'center', marginBottom: 24 },
    premiumCardTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
    premiumCardSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
    cardHeaderTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
    cardHeaderSubtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    premiumSearchBox: { backgroundColor: colors.surfaceIcon, borderRadius: 16, padding: 4, marginBottom: 20 },
    searchInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48 },
    premiumSearchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    resultsList: { backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20, overflow: 'hidden' },
    resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, gap: 10 },
    resultText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
    recordIconsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    recordItem: { alignItems: 'center', gap: 6 },
    recordIconInner: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceIcon, alignItems: 'center', justifyContent: 'center' },
    recordText: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
    intelHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
    intelIconOuter: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceIcon, alignItems: 'center', justifyContent: 'center' },
    intelTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    intelSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    verifiedPill: { backgroundColor: colors.accentTeal + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    verifiedPillText: { fontSize: 9, fontWeight: '900', color: colors.accentTeal },
    statCardPremium: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 10 },
    statIconBoxPremium: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceIcon, alignItems: 'center', justifyContent: 'center' },
    statLabelPremium: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
    statValuePremium: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
    structuralDetailCard: { minWidth: '45%', flex: 1, backgroundColor: colors.cardBackground, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.cardBorder },
    pillContainer: { backgroundColor: colors.surfaceIcon, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    pillText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    premiumGroupLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 12 },
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
    remarkCard: { backgroundColor: colors.surfaceIcon, borderRadius: 16, padding: 16 },
    remarkText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
    reviewItemPremium: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    reviewIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceIcon, alignItems: 'center', justifyContent: 'center' },
    reviewLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    reviewValue: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    mediaSection: { gap: 12 },
    mediaSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    mediaSectionTitle: { fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.2 },
    galleryScroll: { paddingLeft: 20, gap: 12, paddingBottom: 10 },
    premiumPhotoCard: { width: 220, backgroundColor: colors.cardBackground, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, marginRight: 12 },
    photoContainerLarge: { width: '100%', height: 180 },
    photoCard: { width: '100%', height: '100%' },
    deletePhotoBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    photoCardFooter: { padding: 12, gap: 4 },
    photoFooterLabel: { fontSize: 9, fontWeight: '900', color: colors.accentTeal },
    photoFooterTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    addMediaBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addMediaBtnText: { fontSize: 13, fontWeight: '800', color: colors.accentTeal },
    uploadPlaceholderCard: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    placeholderTitleSmall: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
    fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cardBackground, padding: 20, borderTopWidth: 1, borderTopColor: colors.cardBorder },
    actionRowFixed: { flexDirection: 'row', gap: 12 },
    backBtnFixed: { flex: 0.8, height: 52, borderRadius: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    backBtnText: { color: colors.textPrimary, fontWeight: '700' },
    continueBtnFixed: { flex: 1.2, height: 52, borderRadius: 16, backgroundColor: colors.accentTeal, alignItems: 'center', justifyContent: 'center' },
    continueBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
    sheetHeader: { alignItems: 'center', marginBottom: 20 },
    sheetDragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    sheetActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    sheetActionText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    detailTabBarContainer: {
      marginTop: 24,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder || 'rgba(0,0,0,0.08)',
      paddingHorizontal: 20,
    },
    detailTabBarContent: {
      gap: 20,
      paddingHorizontal: 4,
      paddingBottom: 2,
    },
    detailTabItem: {
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      position: 'relative',
    },
    detailTabItemActive: {},
    detailTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    detailTabTextActive: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    detailTabIndicator: {
      position: 'absolute',
      bottom: -1,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: '#0B2D3E',
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
    },
  });
}