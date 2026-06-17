import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { createOpenHouse, getOpenHouses } from '@/services/openHouseService';
import { analyzeProperty as analyzePropertyService, finalizeProperty, uploadPropertyImage } from '@/services/propertyService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');






// --- Step Components ---

const GOOGLE_API_KEY = 'AIzaSyAZM9Ef3yGGfgAX12z0Hv5CZkft2lRyFSQ';



function StepAddress({
  input,
  setInput,
  analyzing,
  onNext
}: {
  input: string,
  setInput: (v: string) => void,
  analyzing: boolean,
  onNext: () => void
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPredictions = async (text: string) => {
    setInput(text);
    if (text.length < 3) {
      setPredictions([]);
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
          },
          body: JSON.stringify({
            input: text,
          }),
        }
      );

      const data = await response.json();


      if (data.error) {
        setErrorMsg(data.error.message || "Places API access denied.");
        setPredictions([]);
        return;
      }

      if (data.suggestions) {
        const formatted = data.suggestions.map((item: any) => ({
          place_id: item.placePrediction.placeId,
          description: item.placePrediction.text.text,
        }));
        setPredictions(formatted);
      } else {
        setPredictions([]);
      }
    } catch (error: any) {
      console.error("Places API Error:", error);
      setErrorMsg(error.message || "Places API request failed. Please check connection.");
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (pred: any) => {
    setInput(pred.description);
    setPredictions([]);
    setErrorMsg(null);
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.premiumCardLarge}>
        <View style={styles.cardHeaderCentric}>
          <Text style={styles.premiumCardTitle}>Provide Property Address</Text>
          <Text style={styles.premiumCardSubtitle}>Enter the address and we'll fetch legal specs.</Text>
        </View>

        <View style={styles.premiumSearchBox}>
          <View style={styles.searchInner}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.premiumSearchInput}
              placeholder="e.g. Killeen TX 76541"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={fetchPredictions}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={colors.accentTeal} style={{ marginRight: 10 }} />}
          </View>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}



        {predictions.length > 0 && (
          <View style={styles.resultsList}>
            {predictions.map((item, index) => (
              <TouchableOpacity
                key={item.place_id}
                style={[styles.resultItem, index === predictions.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSelect(item)}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.textMuted} />
                <Text style={styles.resultText} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}


        <View style={styles.recordIconsRow}>
          <View style={styles.recordItem}>
            <View style={styles.recordIconInner}>
              <MaterialCommunityIcons name="office-building-outline" size={22} color={colors.accentTeal} />
            </View>
            <Text style={styles.recordText}>County Records</Text>
          </View>
          <View style={styles.recordItem}>
            <View style={styles.recordIconInner}>
              <MaterialCommunityIcons name="map-outline" size={22} color={colors.accentTeal} />
            </View>
            <Text style={styles.recordText}>Zoning Data</Text>
          </View>
          <View style={styles.recordItem}>
            <View style={styles.recordIconInner}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.accentTeal} />
            </View>
            <Text style={styles.recordText}>Tax History</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PropertyStatCard({ icon, label, value, accent }: { icon: string, label: string, value: string, accent?: string }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const accentColor = accent || colors.accentTeal;

  return (
    <View style={[styles.statCardPremium, { borderColor: accentColor + '30' }]}>
      <View style={[styles.statIconBoxPremium, { backgroundColor: accentColor + '18' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={accentColor} />
      </View>
      <Text style={[styles.statLabelPremium, { color: accentColor }]}>{label}</Text>
      <Text style={styles.statValuePremium}>{value || '—'}</Text>
    </View>
  );
}

function PropertyDetailItem({ icon, label, value, isPill }: { icon: string, label: string, value: string | string[] | undefined, isPill?: boolean }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  // Skip rendering if no meaningful value
  const isEmpty = !value || (Array.isArray(value) && value.length === 0);
  if (isEmpty) return null;

  const renderValue = () => {
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
    return (
      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.textPrimary }} numberOfLines={3}>
        {value}
      </Text>
    );
  };

  return (
    <View style={styles.structuralDetailCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={styles.detailIconBox}>
          <MaterialCommunityIcons name={icon as any} size={15} color={colors.accentTeal} />
        </View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      {renderValue()}
    </View>
  );
}


function StepDetails({
  formData,
  setFormData,
  onNext,
  onBack
}: {
  formData: any,
  setFormData: (data: any) => void,
  onNext: () => void,
  onBack: () => void
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  // Formatting baths for display
  const totalBaths = parseFloat(formData.bathsFull || '0') + (parseFloat(formData.bathsHalf || '0') * 0.5);

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: 0, paddingTop: 24 }]}>
      {/* Intelligence Header */}
      <View style={styles.intelHeaderBox}>
        <View style={styles.intelIconOuter}>
          <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={28} color={colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={[styles.intelTitle, { flexShrink: 1 }]} numberOfLines={1}>Property Intelligence</Text>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedPillText}>{formData.confidence || 90}% VERIFIED</Text>
            </View>
          </View>
          <Text style={styles.intelSubtitle}>Institutional data successfully mapped to your vault.</Text>
        </View>
      </View>

      {/* Stats Grid - 2 Rows of 2 Columns */}
      <View style={{ paddingHorizontal: 0, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PropertyStatCard
            icon="bed-outline"
            label="BEDROOMS"
            value={formData.beds}
            accent="#0D9488"
          />
          <PropertyStatCard
            icon="shower"
            label="BATHROOMS"
            value={totalBaths > 0 ? totalBaths.toString() : ''}
            accent="#0891B2"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PropertyStatCard
            icon="ruler-square"
            label="LIVING AREA"
            value={formData.sqft ? `${formData.sqft} Sq Ft` : ''}
            accent="#7C3AED"
          />
          <PropertyStatCard
            icon="currency-usd"
            label="LIST PRICE"
            value={formData.price}
            accent="#059669"
          />
        </View>
      </View>

      {/* Structural Section - Matching Screenshot */}
      <View style={{ paddingHorizontal: 0, marginTop: 24 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>STRUCTURAL</Text>
        <View style={{ gap: 10 }}>
          <PropertyDetailItem icon="office-building-outline" label="Property Type" value={formData.type} />
          <PropertyDetailItem icon="map-marker-outline" label="Address" value={formData.address} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="calendar-blank-outline" label="Year Built" value={formData.year} /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="layers-outline" label="Stories" value={formData.stories} /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="home-roof" label="Roof" value={formData.roof} isPill /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="shape-outline" label="Foundation" value={formData.foundation} isPill /></View>
          </View>
          <PropertyDetailItem icon="wind-power-outline" label="Structure Type" value={formData.structureType} />
          <PropertyDetailItem icon="palette-outline" label="Architectural Style" value={formData.architecturalStyle} isPill />
          <PropertyDetailItem icon="wall" label="Construction" value={formData.construction} isPill />
        </View>
      </View>

      {/* Exterior */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>EXTERIOR</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="arrow-expand-all" label="Lot Size" value={formData.lotSize} /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="earth" label="Lot Sq Ft" value={formData.lotSqFt} /></View>
          </View>
          <PropertyDetailItem icon="tag-multiple-outline" label="Lot Features" value={formData.lotFeatures} isPill />
          <PropertyDetailItem icon="shield-outline" label="Fencing" value={formData.fencing} isPill />
          <PropertyDetailItem icon="car-outline" label="Parking" value={formData.parkingFeatures} isPill />
          <PropertyDetailItem icon="home-outline" label="Exterior Features" value={formData.exteriorFeatures} isPill />
          <PropertyDetailItem icon="table-furniture" label="Patio Features" value={formData.patioFeatures} isPill />
          <PropertyDetailItem icon="water-pump" label="Sewer" value={formData.sewer} isPill />
          <PropertyDetailItem icon="water-outline" label="Water Source" value={formData.waterSource} isPill />
        </View>
      </View>

      {/* Interior */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>INTERIOR</Text>
        <View style={{ gap: 10 }}>
          <PropertyDetailItem icon="view-grid-outline" label="Flooring" value={formData.flooring} isPill />
          <PropertyDetailItem icon="lightning-bolt-outline" label="Appliances" value={formData.appliances} isPill />
          <PropertyDetailItem icon="silverware-variant" label="Kitchen Features" value={formData.kitchenFeatures} isPill />
          <PropertyDetailItem icon="bathtub-outline" label="Bath Features" value={formData.bathFeatures} isPill />
          <PropertyDetailItem icon="washing-machine" label="Laundry" value={formData.laundryFeatures} isPill />
          <PropertyDetailItem icon="creation" label="Interior Features" value={formData.interiorFeatures} isPill />
          <PropertyDetailItem icon="floor-plan" label="Room Description" value={formData.roomDescription} isPill />
        </View>
      </View>

      {/* Utilities */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>UTILITIES</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="thermometer" label="Heating" value={Array.isArray(formData.heating) ? formData.heating.join(', ') : formData.heating} /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="snowflake" label="Cooling" value={Array.isArray(formData.cooling) ? formData.cooling.join(', ') : formData.cooling} /></View>
          </View>
        </View>
      </View>

      {/* Financial */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>FINANCIAL</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="currency-usd" label="Annual Tax" value={formData.taxAnnualAmount} /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="percent" label="Tax Rate" value={formData.taxRate} /></View>
          </View>
          <PropertyDetailItem icon="file-document-outline" label="Legal Description" value={formData.taxLegalDescription} />
          <PropertyDetailItem icon="tag-outline" label="Listing Terms" value={formData.listingTerms} isPill />
          <PropertyDetailItem icon="currency-usd" label="Tax Exemptions" value={formData.taxExemptions} isPill />
          <PropertyDetailItem icon="lock-outline" label="Restrictions" value={formData.restrictions} isPill />
        </View>
      </View>

      {/* Schools */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>SCHOOLS</Text>
        <View style={{ gap: 10 }}>
          <PropertyDetailItem icon="school-outline" label="District" value={formData.highSchoolDistrict} />
          <PropertyDetailItem icon="school" label="Elementary" value={formData.elemSchool} />
          <PropertyDetailItem icon="school" label="Middle School" value={formData.midSchool} />
          <PropertyDetailItem icon="school" label="High School" value={formData.highSchool} />
        </View>
      </View>

      {/* MLS & Legal */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>MLS & LEGAL</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="pound" label="Listing ID" value={formData.listingId} /></View>
            <View style={{ flex: 1 }}><PropertyDetailItem icon="pulse" label="Status" value={formData.standardStatus} /></View>
          </View>
          <PropertyDetailItem icon="calendar-check" label="Listed On" value={formData.listingContractDate} />
          <PropertyDetailItem icon="calendar-clock" label="Days on Market" value={formData.daysOnMarket} />
          <PropertyDetailItem icon="account-group-outline" label="Community Features" value={formData.communityFeatures} isPill />
          <PropertyDetailItem icon="alert-circle-outline" label="Disclosures" value={formData.disclosures} isPill />
          <PropertyDetailItem icon="map-marker-path" label="Subdivision" value={formData.subdivision} />
          <PropertyDetailItem icon="map" label="Geo Market Area" value={formData.geoMarketArea} />
        </View>
      </View>

      {/* Directions */}
      {!!formData.directions && (
        <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
          <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 16 }]}>DIRECTIONS</Text>
          <View style={styles.directionsCard}>
            <MaterialCommunityIcons name="directions" size={20} color={colors.accentTeal} style={{ marginBottom: 10 }} />
            <Text style={styles.directionsText}>{formData.directions}</Text>
          </View>
        </View>
      )}

      {/* Remarks */}
      <View style={{ paddingHorizontal: 0, marginTop: 28 }}>
        <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 12 }]}>REMARKS</Text>
        {!!formData.publicRemarks && (
          <View style={[styles.remarkCard, { marginBottom: 12 }]}>
            <Text style={styles.remarkLabel}>PUBLIC</Text>
            <Text style={styles.remarkText}>{formData.publicRemarks}</Text>
          </View>
        )}
        {!!formData.privateRemarks && (
          <View style={[styles.remarkCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.remarkLabel, { color: '#D97706' }]}>AGENT ONLY</Text>
            <Text style={[styles.remarkText, { fontStyle: 'italic', color: '#92400E' }]}>{formData.privateRemarks}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 160 }} />
    </View>
  );
}

function StepMedia({
  mlsPhotos,
  setMlsPhotos,
  userPhotos,
  setUserPhotos,
  selectedLocalPhotos,
  setSelectedLocalPhotos,
  onPickerOpen,
  isUploading,
  uploadProgress,
  onUploadPress,
  activeTab,
  setActiveTab,
}: {
  mlsPhotos: string[],
  setMlsPhotos: React.Dispatch<React.SetStateAction<string[]>>,
  userPhotos: string[],
  setUserPhotos: React.Dispatch<React.SetStateAction<string[]>>,
  selectedLocalPhotos: string[],
  setSelectedLocalPhotos: React.Dispatch<React.SetStateAction<string[]>>,
  onPickerOpen: () => void,
  isUploading: boolean,
  uploadProgress: { current: number, total: number },
  onUploadPress: () => void,
  activeTab: 'mls' | 'uploads',
  setActiveTab: React.Dispatch<React.SetStateAction<'mls' | 'uploads'>>,
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [enhancedImages, setEnhancedImages] = useState<Set<string>>(new Set());
  const [enhancingMap, setEnhancingMap] = useState<Record<string, boolean>>({});

  const toggleEnhance = (url: string) => {
    if (enhancingMap[url]) return;
    setEnhancingMap(prev => ({ ...prev, [url]: true }));
    setTimeout(() => {
      setEnhancedImages(prev => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url); else next.add(url);
        return next;
      });
      setEnhancingMap(prev => ({ ...prev, [url]: false }));
    }, 1200);
  };

  const removeUserPhoto = (uri: string) => setUserPhotos(prev => prev.filter(p => p !== uri));
  const removeMlsPhoto = (uri: string) => setMlsPhotos(prev => prev.filter(p => p !== uri));

  const PHOTO_W = '47%' as any;

  return (
    <View style={[styles.stepContainer, { paddingBottom: 40 }]}>

      {/* Header */}
      <View style={{ paddingHorizontal: 0, marginBottom: 20 }}>
        <Text style={styles.intelTitle}>AI Media</Text>
        <Text style={styles.intelSubtitle}>Upload your photos or use Zien AI to generate high-end architectural visuals.</Text>
      </View>

      {/* Top action cards */}
      <View style={{ paddingHorizontal: 0, gap: 12, marginBottom: 24 }}>

        {/* Upload Media Card or Local Preview Card */}
        {selectedLocalPhotos.length > 0 ? (
          <View style={[styles.localPreviewCard, { marginBottom: 0 }]}>
            <View style={styles.localPreviewHeader}>
              <Text style={styles.localPreviewTitle}>Selected Photos</Text>
              <Text style={styles.localPreviewCount}>{selectedLocalPhotos.length} photo{selectedLocalPhotos.length > 1 ? 's' : ''} selected</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.localPreviewScroll}
            >
              {selectedLocalPhotos.map((uri, idx) => (
                <View key={idx} style={styles.localPreviewThumbWrap}>
                  <Image source={{ uri }} style={styles.localPreviewThumb} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.localPreviewRemoveBtn}
                    onPress={() => setSelectedLocalPhotos(prev => prev.filter((_, i) => i !== idx))}
                    disabled={isUploading}
                  >
                    <MaterialCommunityIcons name="close" size={10} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {isUploading && (
              <View style={styles.uploadProgressRow}>
                <ActivityIndicator size="small" color={colors.accentTeal} />
                <Text style={styles.uploadProgressText}>
                  Uploading {uploadProgress.current} of {uploadProgress.total}...
                </Text>
              </View>
            )}

            {!isUploading && (
              <View style={styles.localPreviewActionRow}>
                <TouchableOpacity
                  style={styles.localPreviewAddMoreBtn}
                  onPress={onPickerOpen}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
                  <Text style={styles.localPreviewAddMoreText}>Add More</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.localPreviewUploadBtn}
                  onPress={onUploadPress}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="cloud-upload" size={16} color="#FFF" />
                  <Text style={styles.localPreviewUploadText}>Upload to Vault</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.mediaUploadCard} onPress={onPickerOpen} activeOpacity={0.8}>
            <View style={styles.mediaUploadIconWrap}>
              <MaterialCommunityIcons name="tray-arrow-up" size={26} color={colors.textSecondary} />
            </View>
            <Text style={styles.mediaUploadTitle}>Upload Media</Text>
            <Text style={styles.mediaUploadSub}>Add multiple property photos</Text>
            <View style={styles.mediaSelectBtn}>
              <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
              <Text style={styles.mediaSelectBtnText}>Select Photos</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* AI Studio Card */}
        <View style={styles.aiStudioCardNew}>
          <LinearGradient
            colors={['rgba(13,148,136,0.07)', 'rgba(99,102,241,0.07)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.aiStudioCardHeader}>
            <View style={styles.aiStudioIconBox}>
              <MaterialCommunityIcons name="creation" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiStudioCardTitle}>AI Studio Generator</Text>
              <Text style={styles.aiStudioCardSub}>Describe the architectural scene to synthesize.</Text>
            </View>
            <View style={styles.aiStudioComingSoon}>
              <Text style={styles.aiStudioComingSoonText}>SOON</Text>
            </View>
          </View>
          <Text style={styles.aiStudioPromptLabel}>GENERATION PROMPT</Text>
          <View style={styles.aiStudioPromptBox}>
            <TextInput
              style={styles.aiStudioPromptInput}
              placeholder="e.g. A high-end modern living room with floor-to-ceiling windows at golden hour, minimalist furniture, marble floors..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.aiStudioGenerateBtn,
              { backgroundColor: colors.accentTeal + '15' }
            ]}
            activeOpacity={0.85}
            disabled
          >
            <MaterialCommunityIcons name="creation" size={16} color={colors.accentTeal} />
            <Text style={[styles.aiStudioGenerateBtnText, { color: colors.accentTeal }]}>Generate with AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.mediaTabBar}>
        <TouchableOpacity
          style={[styles.mediaTab, activeTab === 'mls' && styles.mediaTabActive]}
          onPress={() => setActiveTab('mls')}
        >
          <Text style={[styles.mediaTabText, activeTab === 'mls' && styles.mediaTabTextActive]}>
            MLS Professional ({mlsPhotos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mediaTab, activeTab === 'uploads' && styles.mediaTabActive]}
          onPress={() => setActiveTab('uploads')}
        >
          <Text style={[styles.mediaTabText, activeTab === 'uploads' && styles.mediaTabTextActive]}>
            My Uploads ({userPhotos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.cardBorder, marginBottom: 16 }} />

      {/* MLS Grid */}
      {activeTab === 'mls' && (
        <View style={{ paddingHorizontal: 0 }}>
          {mlsPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {mlsPhotos.map((url, idx) => (
                <View key={idx} style={[styles.photoGridCard, { width: PHOTO_W }]}>
                  <View style={styles.photoGridImgWrap}>
                    <Image source={{ uri: url }} style={styles.photoGridImg} contentFit="cover" />
                    <TouchableOpacity style={styles.photoGridDeleteBtn} onPress={() => removeMlsPhoto(url)}>
                      <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.photoGridFooter}>
                    <Text style={styles.photoGridLabel}>VERIFIED MLS</Text>
                    <Text style={styles.photoGridScene}>Scene {idx + 1}</Text>
                    <View style={styles.photoGridReadOnly}>
                      <MaterialCommunityIcons name="lock-outline" size={11} color={colors.textMuted} />
                      <Text style={styles.photoGridReadOnlyText}>Read Only</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.mediaEmptyState}>
              <MaterialCommunityIcons name="image-multiple-outline" size={40} color={colors.textMuted} />
              <Text style={styles.mediaEmptyTitle}>No MLS photos found</Text>
              <Text style={styles.mediaEmptySub}>MLS photos will appear here after enrichment</Text>
            </View>
          )}
        </View>
      )}

      {/* Uploads Grid */}
      {activeTab === 'uploads' && (
        <View style={{ paddingHorizontal: 0 }}>
          {userPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {userPhotos.map((url, idx) => {
                const isEnhanced = enhancedImages.has(url);
                const isProcessing = enhancingMap[url];
                return (
                  <View key={idx} style={[styles.photoGridCard, { width: PHOTO_W }]}>
                    <View style={styles.photoGridImgWrap}>
                      <Image source={{ uri: url }} style={styles.photoGridImg} contentFit="cover" />
                      {isProcessing && (
                        <View style={styles.photoGridOverlay}>
                          <ActivityIndicator color="#FFF" size="small" />
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 4 }}>Optimizing...</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.photoGridDeleteBtn} onPress={() => removeUserPhoto(url)}>
                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.photoGridFooter}>
                      <Text style={[styles.photoGridLabel, { color: '#7C3AED' }]}>AI OPTIMIZED</Text>
                      <Text style={styles.photoGridScene}>Scene {idx + 1}</Text>
                      {isEnhanced ? (
                        <View style={styles.enhancedBadgeSmall}>
                          <MaterialCommunityIcons name="check-circle" size={11} color={colors.accentTeal} />
                          <Text style={styles.enhancedBadgeSmallText}>Enhanced</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.magicBtnSmall, isProcessing && { opacity: 0.5 }]}
                          onPress={() => toggleEnhance(url)}
                          disabled={isProcessing}
                        >
                          <MaterialCommunityIcons name="creation" size={11} color={colors.accentTeal} />
                          <Text style={styles.magicBtnSmallText}>Enhance</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              {/* Add more tile — same dimensions as photo card */}
              <TouchableOpacity
                style={[styles.photoGridCard, styles.photoGridAddTile, { width: PHOTO_W }]}
                onPress={onPickerOpen}
                activeOpacity={0.7}
              >
                <View style={[styles.photoGridImgWrap, { alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="plus" size={32} color={colors.textMuted} />
                </View>
                <View style={styles.photoGridFooter}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Add Photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.mediaEmptyState} onPress={onPickerOpen} activeOpacity={0.8}>
              <View style={styles.mediaEmptyIconCircle}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={32} color={colors.accentTeal} />
              </View>
              <Text style={styles.mediaEmptyTitle}>No uploads yet</Text>
              <Text style={styles.mediaEmptySub}>Tap to add your own property photos</Text>
              <View style={[styles.mediaSelectBtn, { marginTop: 16, alignSelf: 'center' }]}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
                <Text style={styles.mediaSelectBtnText}>Select Photos</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}



function StepReview({ onNext, onBack, mlsPhotos, userPhotos, formData }: {
  onNext: () => void,
  onBack: () => void,
  mlsPhotos: string[],
  userPhotos: string[],
  formData: any
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const allImages = [...mlsPhotos, ...userPhotos];

  const ReviewItem = ({ label, value, icon }: { label: string, value: string | undefined, icon: string }) => (
    <View style={styles.reviewItemPremium}>
      <View style={styles.reviewIconBox}>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value || 'Not Specified'}</Text>
      </View>
    </View>
  );

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={[styles.premiumCardLarge, { marginBottom: 16 }]}>
      <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 12 }]}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );

  return (
    <View style={styles.stepContainer}>
      <Section title="STRUCTURAL SPECS">
        <ReviewItem icon="tag-outline" label="Price" value={formData.price} />
        <ReviewItem icon="home-outline" label="Property Type" value={formData.type} />
        <ReviewItem icon="bed-outline" label="Bedrooms" value={formData.beds} />
        <ReviewItem icon="shower" label="Bathrooms" value={`${formData.bathsFull} Full / ${formData.bathsHalf} Half`} />
        <ReviewItem icon="ruler" label="Living Area" value={formData.sqft ? `${formData.sqft} Sq Ft` : undefined} />
        <ReviewItem icon="calendar-outline" label="Year Built" value={formData.year} />
      </Section>

      <Section title="INTERIOR & ENERGY">
        <ReviewItem icon="thermometer" label="Heating / Cooling" value={`${formData.heating} / ${formData.cooling}`} />
        <ReviewItem icon="fire" label="Fireplace" value={formData.fireplace ? 'Yes' : 'No'} />
        <ReviewItem icon="fridge-outline" label="Appliances" value={formData.appliances?.join(', ')} />
        <ReviewItem icon="format-paint" label="Flooring" value={formData.flooring?.join(', ')} />
      </Section>

      <Section title="EXTERIOR & STRUCTURE">
        <ReviewItem icon="wall" label="Construction" value={formData.construction?.join(', ')} />
        <ReviewItem icon="home-roof" label="Roof" value={formData.roof} />
        <ReviewItem icon="fence" label="Fencing" value={formData.fencing} />
        <ReviewItem icon="nature" label="Exterior Features" value={formData.exteriorFeatures?.join(', ')} />
      </Section>

      <Section title="LOCATION & SCHOOLS">
        <ReviewItem icon="city" label="City" value={formData.city} />
        <ReviewItem icon="map-outline" label="County / Subdivision" value={`${formData.county} / ${formData.subdivision}`} />
        <ReviewItem icon="school-outline" label="Elem/Mid/High Schools" value={`${formData.elemSchool}, ${formData.midSchool}, ${formData.highSchool}`} />
      </Section>

      <Section title="REMARKS">
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Public Remarks</Text>
          <Text style={[styles.reviewValue, { lineHeight: 20 }]}>{formData.publicRemarks || 'No remarks provided'}</Text>
        </View>
        <View style={[styles.inputGroup, { marginTop: 12 }]}>
          <Text style={styles.inputLabel}>Private Remarks (Agent Only)</Text>
          <Text style={[styles.reviewValue, { lineHeight: 20, fontStyle: 'italic' }]}>{formData.privateRemarks || 'No private notes'}</Text>
        </View>
      </Section>

      {allImages.length > 0 && (
        <View style={[styles.premiumCardLarge, { marginBottom: 30 }]}>
          <Text style={[styles.premiumGroupLabel, { marginTop: 0, marginBottom: 12 }]}>MEDIA GALLERY ({allImages.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGallery}>
            {allImages.map((uri, idx) => (
              <View key={idx} style={styles.reviewGalleryItem}>
                <Image source={{ uri }} style={styles.reviewGalleryImg} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function StepSuccess({ propertyId, address }: { propertyId: string, address: string }) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
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
        {isMobile ? "Property Added!" : "Property Added"}
      </Text>
      <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
        {isMobile ? (
          <>Your property at <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{address}</Text> has been successfully optimized.</>
        ) : (
          <>Your property at <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{address.toLowerCase().includes('usa') ? address : `${address}, USA`}</Text> has been successfully optimized and broadcasted.</>
        )}
      </Text>

      <View style={{ width: '100%', marginTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1 }}>PROPERTY ADDED: CHOOSE NEXT PHASE</Text>
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

export default function CreateListingScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [mlsPhotos, setMlsPhotos] = useState<string[]>([]);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [isPickingMedia, setIsPickingMedia] = useState(false);
  const [input, setInput] = useState('');

  // Local photo preview and upload confirmation states
  const [selectedLocalPhotos, setSelectedLocalPhotos] = useState<string[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'mls' | 'uploads'>('mls');
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  const handleUploadSelected = async () => {
    if (selectedLocalPhotos.length === 0) return;
    setIsUploadingLocal(true);
    setUploadProgress({ current: 0, total: selectedLocalPhotos.length });

    let successCount = 0;
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedLocalPhotos.length; i++) {
      try {
        const uri = selectedLocalPhotos[i];
        const res = await uploadPropertyImage(uri, accessToken || '');
        if (res.url) {
          uploadedUrls.push(res.url);
          successCount++;
        }
      } catch (err) {
        console.error("Failed to upload image at index:", i, err);
      }
      setUploadProgress(prev => ({ ...prev, current: i + 1 }));
    }

    if (uploadedUrls.length > 0) {
      setUserPhotos(prev => [...prev, ...uploadedUrls]);
    }

    setIsUploadingLocal(false);
    setSelectedLocalPhotos([]);
    setUploadProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      setActiveMediaTab('uploads');
      showToast(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully!`);
    } else {
      Alert.alert("Upload Failed", "Failed to upload photos. Please try again.");
    }
  };

  const [formData, setFormData] = useState({
    confidence: 0,
    address: '',
    price: '',
    type: 'Residential SFH',
    beds: '',
    bathsFull: '',
    bathsHalf: '',
    garage: 'None',
    sqft: '',
    lotArea: '',
    lotSqFt: '',
    year: '',
    stories: '',
    structureType: '',
    architecturalStyle: [] as string[],
    lotSize: '',
    lotFeatures: [] as string[],
    fencing: '',
    parkingFeatures: [] as string[],
    exteriorFeatures: [] as string[],
    patioFeatures: [] as string[],
    sewer: '',
    construction: [] as string[],
    roof: '',
    foundation: '',
    appliances: [] as string[],
    flooring: [] as string[],
    kitchenFeatures: [] as string[],
    bathFeatures: [] as string[],
    laundryFeatures: [] as string[],
    interiorFeatures: [] as string[],
    roomDescription: [] as string[],
    heating: [] as string[],
    cooling: [] as string[],
    waterSource: [] as string[],
    fireplace: false,
    city: '',
    county: '',
    subdivision: '',
    elemSchool: '',
    midSchool: '',
    highSchool: '',
    highSchoolDistrict: '',
    mlsStatus: '',
    listingId: '',
    standardStatus: '',
    listingTerms: [] as string[],
    taxExemptions: [] as string[],
    restrictions: [] as string[],
    communityFeatures: [] as string[],
    disclosures: [] as string[],
    daysOnMarket: '',
    listingContractDate: '',
    taxAnnualAmount: '',
    taxRate: '',
    taxLegalDescription: '',
    directions: '',
    geoMarketArea: '',
    publicRemarks: '',
    privateRemarks: '',
  });


  const { mutate: analyzeProperty, isPending: analyzing } = useMutation({
    mutationFn: (address: string) => analyzePropertyService(address, accessToken || ''),
    onSuccess: (resData) => {
      console.log("AI Enrichment Analysis Result:", JSON.stringify(resData));

      if (resData.success && resData.data) {
        const d = resData.data;

        // Map API response to expanded formData
        setFormData({
          ...formData,
          confidence: resData.metadata?.confidence || 0,
          address: d.UnparsedAddress || d.FullAddress || input,
          stories: String(d.StoriesTotal || d.Levels?.[0] || d.Stories || ''),
          structureType: Array.isArray(d.StructureType) ? d.StructureType[0] : d.StructureType || '',
          architecturalStyle: Array.isArray(d.ArchitecturalStyle) ? d.ArchitecturalStyle : [],
          price: d.ListPrice ? `$${d.ListPrice.toLocaleString()}` : '',
          type: d.PropertySubType || d.PropertyType || 'Residential',
          beds: String(d.BedroomsTotal || ''),
          bathsFull: String(d.BathroomsFull || ''),
          bathsHalf: String(d.BathroomsHalf || ''),
          sqft: d.LivingArea ? `${d.LivingArea.toLocaleString()}` : '',
          lotArea: d.LotSizeSquareFeet ? `${d.LotSizeSquareFeet.toLocaleString()}` : '',
          lotSqFt: d.LotSizeSquareFeet ? `${Math.round(d.LotSizeSquareFeet).toLocaleString()} Sq Ft` : '',
          year: String(d.YearBuilt || ''),
          lotSize: d.LotSizeAcres ? `${d.LotSizeAcres} Acres` : d.LotSizeSquareFeet ? `${(d.LotSizeSquareFeet / 43560).toFixed(4)} Acres` : '',
          lotFeatures: Array.isArray(d.LotFeatures) ? d.LotFeatures : [],
          parkingFeatures: Array.isArray(d.ParkingFeatures) ? d.ParkingFeatures : [],
          patioFeatures: Array.isArray(d.LotAndPorchFeatures) ? d.LotAndPorchFeatures : [],
          sewer: Array.isArray(d.Sewer) ? d.Sewer[0] : d.Sewer || '',
          garage: d.GarageSpaces ? `${d.GarageSpaces} Car` : d.ParkingTotal ? `${d.ParkingTotal} Car` : 'None',
          appliances: Array.isArray(d.Appliances) ? d.Appliances : [],
          flooring: Array.isArray(d.Flooring) ? d.Flooring : [],
          kitchenFeatures: Array.isArray(d.RoomKitchenFeatures) ? d.RoomKitchenFeatures : [],
          bathFeatures: Array.isArray(d.RoomMasterBathroomFeatures) ? d.RoomMasterBathroomFeatures : [],
          laundryFeatures: Array.isArray(d.LaundryFeatures) ? d.LaundryFeatures : [],
          interiorFeatures: Array.isArray(d.InteriorFeatures) ? d.InteriorFeatures : [],
          roomDescription: Array.isArray(d.HAR_RoomDescription) ? d.HAR_RoomDescription : Array.isArray(d.RoomType) ? d.RoomType : [],
          heating: Array.isArray(d.Heating) ? d.Heating : [],
          cooling: Array.isArray(d.Cooling) ? d.Cooling : [],
          waterSource: Array.isArray(d.WaterSource) ? d.WaterSource : [],
          fireplace: !!d.FireplaceYN || (d.FireplacesTotal > 0),
          construction: Array.isArray(d.ConstructionMaterials) ? d.ConstructionMaterials : [],
          roof: Array.isArray(d.Roof) ? d.Roof[0] : '',
          foundation: Array.isArray(d.FoundationDetails) ? d.FoundationDetails[0] : '',
          exteriorFeatures: Array.isArray(d.ExteriorFeatures) ? d.ExteriorFeatures : [],
          fencing: Array.isArray(d.Fencing) ? d.Fencing[0] : d.Fencing || '',
          city: d.City || '',
          county: d.CountyOrParish || '',
          subdivision: d.SubdivisionName || '',
          elemSchool: d.ElementarySchool || '',
          midSchool: d.MiddleOrJuniorSchool || '',
          highSchool: d.HighSchool || '',
          highSchoolDistrict: d.HighSchoolDistrict || '',
          mlsStatus: d.MlsStatus || '',
          listingId: d.ListingId || '',
          standardStatus: d.StandardStatus || '',
          listingTerms: Array.isArray(d.ListingTerms) ? d.ListingTerms : [],
          taxExemptions: Array.isArray(d.TaxExemptions) ? d.TaxExemptions : [],
          restrictions: Array.isArray(d.HAR_Restrictions) ? d.HAR_Restrictions : [],
          communityFeatures: Array.isArray(d.CommunityFeatures) ? d.CommunityFeatures : [],
          disclosures: Array.isArray(d.Disclosures) ? d.Disclosures : [],
          daysOnMarket: d.DaysOnMarket ? String(d.DaysOnMarket) : '',
          listingContractDate: d.ListingContractDate || '',
          taxAnnualAmount: d.TaxAnnualAmount ? `$${d.TaxAnnualAmount.toLocaleString()}` : '',
          taxRate: d.HAR_TaxRate ? `${d.HAR_TaxRate}%` : '',
          taxLegalDescription: d.TaxLegalDescription || '',
          directions: d.Directions || '',
          geoMarketArea: d.HAR_GeoMarketArea || '',
          publicRemarks: d.PublicRemarks || '',
          privateRemarks: d.PrivateRemarks || '',
        });

        // If you want to automatically add images as well:
        if (Array.isArray(d.Media)) {
          const apiImages = d.Media.filter((m: any) => m.MediaCategory === 'Photo').map((m: any) => m.MediaURL);
          if (apiImages.length > 0) {
            setMlsPhotos(apiImages);
          }
        }

        setActiveStep(1);
      } else {
        alert(resData.message || "Request failed");
      }
    },
    onError: (error: any) => {
      console.log("Enrichment API Error:", error);
      alert(error.message || "Enrichment request failed. Please check connection.");
    }
  });

  const { mutate: uploadMutation, isPending: isUploading } = useMutation({
    mutationFn: (uri: string) => uploadPropertyImage(uri, accessToken || ''),
    onSuccess: (resData) => {
      console.log("Upload Success:", resData);
      if (resData.url) {
        setUserPhotos(prev => [...prev, resData.url]);
      }
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      alert(error.message || "Failed to upload image. Please try again.");
    }
  });

  const { mutate: finalizeMutation, isPending: isFinalizing } = useMutation({
    mutationFn: () => finalizeProperty({
      address: formData.address || input,
      data: formData,
      userImages: userPhotos,
    }, accessToken || ''),
    onSuccess: (resData) => {
      console.log("Finalize Success:", resData);
      setActiveStep(4);
    },
    onError: (error: any) => {
      console.error("Finalize error:", error);
      alert(error.message || "Failed to publish property. Please check all details.");
    }
  });

  const handleAnalyze = () => {
    if (!input) return;
    analyzeProperty(input);
  };

  const steps = [
    { icon: 'map-marker', label: 'Address' },
    { icon: 'home-edit', label: 'Details' },
    { icon: 'auto-fix', label: 'AI Media' },
    { icon: 'publish', label: 'Publish' }
  ];

  const renderStep = () => {
    switch (activeStep) {
      case 0: return (
        <StepAddress
          input={input}
          setInput={setInput}
          analyzing={analyzing}
          onNext={() => setActiveStep(1)}
        />
      );
      case 1: return (
        <StepDetails
          formData={formData}
          setFormData={setFormData}
          onNext={() => setActiveStep(2)}
          onBack={() => setActiveStep(0)}
        />
      );
      case 2: return (
        <StepMedia
          mlsPhotos={mlsPhotos}
          setMlsPhotos={setMlsPhotos}
          userPhotos={userPhotos}
          setUserPhotos={setUserPhotos}
          selectedLocalPhotos={selectedLocalPhotos}
          setSelectedLocalPhotos={setSelectedLocalPhotos}
          onPickerOpen={() => setIsPickingMedia(true)}
          isUploading={isUploadingLocal}
          uploadProgress={uploadProgress}
          onUploadPress={handleUploadSelected}
          activeTab={activeMediaTab}
          setActiveTab={setActiveMediaTab}
        />
      );
      case 3: return (
        <StepReview
          formData={formData}
          onNext={() => setActiveStep(4)}
          onBack={() => setActiveStep(2)}
          mlsPhotos={mlsPhotos}
          userPhotos={userPhotos}
        />
      );
      case 4: return <StepSuccess propertyId={formData.listingId || '7'} address={formData.address} />;
      default: return null;
    }
  };



  const renderFooter = () => {
    if (activeStep >= 4) return null;

    let nextLabel = "Continue";
    if (activeStep === 0) nextLabel = "Start AI Enrichment";
    if (activeStep === 1) nextLabel = "Continue to Media";
    if (activeStep === 2) nextLabel = "Finalize Property";
    if (activeStep === 3) nextLabel = "Save Listing";

    return (
      <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 16), paddingTop: 16 }]}>
        <View style={styles.actionRowFixed}>
          {activeStep > 0 && (
            <TouchableOpacity style={styles.backBtnFixed} onPress={() => setActiveStep(activeStep - 1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.continueBtnFixed,
              activeStep === 0 && { flex: 1 },
              activeStep === 0 && !input && styles.enrichButtonDisabled
            ]}
            onPress={() => {
              if (activeStep === 0) {
                handleAnalyze()
              } else if (activeStep === 3) {
                finalizeMutation()
              } else {
                setActiveStep(activeStep + 1)
              }
            }}
            disabled={(activeStep === 0 && (!input || analyzing)) || isFinalizing}
          >
            {analyzing || isFinalizing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.continueBtnText}>{nextLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {toastVisible && (
        <View style={[styles.toastContainer, { top: insets.top + 8 }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
      >
        <PageHeader
          title="Add New Property"
          subtitle="Pull from public records or upload info."
          onBack={() => {
            if (activeStep > 0 && activeStep < 4) setActiveStep(activeStep - 1);
            else router.back();
          }}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* MOBILE OPTIMIZED STEP INDICATOR */}
          <View style={styles.stepIndicatorContainerMobile}>
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <View style={[
                  styles.stepCircleMobile,
                  activeStep >= idx && styles.stepCircleActiveMobile
                ]}>
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={16}
                    color={activeStep >= idx ? "#FFF" : colors.textMuted}
                  />
                </View>
                {idx < steps.length - 1 && (
                  <View style={[
                    styles.stepLineMobile,
                    activeStep > idx && styles.stepLineActiveMobile
                  ]} />
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.contentWrapMobile}>
            {renderStep()}
          </View>
        </ScrollView>

        {activeStep < 4 && renderFooter()}
      </KeyboardAvoidingView>

      {/* Media Picker Modal */}
      <Modal
        visible={isPickingMedia}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPickingMedia(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsPickingMedia(false)}>
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetDragHandle} />
              <Text style={styles.sheetTitle}>Add Media</Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetActionItem}
                onPress={() => {
                  setIsPickingMedia(false);
                  setTimeout(async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      alert("Photo library permission is required to select photos.");
                      return;
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsMultipleSelection: true,
                      quality: 0.8,
                    });

                    if (!result.canceled && result.assets.length > 0) {
                      const newUris = result.assets.map(asset => asset.uri);
                      setSelectedLocalPhotos(prev => [...prev, ...newUris]);
                    }
                  }, 300);
                }}
              >
                <View style={[styles.sheetActionIcon, { backgroundColor: colors.accentTeal + '20' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={24} color={colors.accentTeal} />
                </View>
                <Text style={styles.sheetActionText}>Photo Library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetActionItem}
                onPress={() => {
                  setIsPickingMedia(false);
                  setTimeout(async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                      alert("Camera permission is required");
                      return;
                    }

                    const result = await ImagePicker.launchCameraAsync({
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const newUri = result.assets[0].uri;
                      setSelectedLocalPhotos(prev => [...prev, newUri]);
                    }
                  }, 300);
                }}
              >
                <View style={[styles.sheetActionIcon, { backgroundColor: '#EC489920' }]}>
                  <MaterialCommunityIcons name="camera" size={24} color="#EC4899" />
                </View>
                <Text style={styles.sheetActionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetActionItem, { borderBottomWidth: 0 }]}
                onPress={() => setIsPickingMedia(false)}
              >
                <View style={[styles.sheetActionIcon, { backgroundColor: colors.textMuted + '20' }]}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                </View>
                <Text style={styles.sheetActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 12,
    },

    // Step Indicator
    indicatorWrapper: {
      paddingVertical: 20,
      marginBottom: 8,
    },
    indicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    indicatorStepItem: {
      alignItems: 'center',
      gap: 6,
      width: 60,
    },
    indicatorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    indicatorCircleActive: {
      backgroundColor: colors.textPrimary,
      borderColor: colors.textPrimary,
    },
    indicatorCirclePast: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    indicatorNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    indicatorLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      textAlign: 'center',
    },
    indicatorLabelActive: {
      color: colors.textPrimary,
      fontWeight: '900',
    },
    indicatorLine: {
      width: 20,
      height: 2,
      backgroundColor: colors.cardBorder,
      marginTop: -16,
      borderRadius: 1,
    },
    indicatorLineActive: {
      backgroundColor: colors.accentTeal,
    },
    activeStepLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    activeStepText: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    stepCounterText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },

    stepContainer: {
      width: '100%',
    },
    premiumCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      paddingHorizontal: 14,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 15,
      elevation: 4,
    },

    // Form elements
    groupLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 12,
    },
    formGrid: {
      gap: 12,
    },
    formRow: {
      flexDirection: 'row',
    },
    inputGroup: {
      flex: 1,
      gap: 6,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    inputLabelSmall: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    dropdownTrigger: {
      height: 44,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    dropdownValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    dropdownMenu: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginTop: 4,
      padding: 4,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    dropdownItemText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    dropdownItemTextActive: {
      color: colors.accentTeal,
      fontWeight: '700',
    },
    textInput: {
      height: 44,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },

    // Chip Grid
    chipSection: {
      marginTop: 20,
      gap: 10,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    chipActive: {
      borderColor: colors.accentTeal,
      backgroundColor: colors.surfaceIcon,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.textPrimary,
    },

    // Step 1: Mobile Address
    addressBoxMobile: {
      gap: 12,
      marginVertical: 20,
    },
    addressInputMobile: {
      height: 48,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    enrichBtnFull: {
      height: 48,
      backgroundColor: colors.accentTeal,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    enrichBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 14,
    },
    enrichmentSources: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    sourceItem: {
      alignItems: 'center',
      flex: 1,
    },
    sourceIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    sourceLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
    },

    // Step 3: Mobile Media Stack
    mediaStack: {
      gap: 16,
      marginBottom: 24,
    },
    mediaUploadBox: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderStyle: 'dashed',
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      gap: 12,
    },
    uploadOptions: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginTop: 8,
      overflow: 'hidden',
    },
    uploadOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    uploadOptionText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    optionDivider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginHorizontal: 12,
    },
    galleryContainer: {
      marginTop: 8,
    },
    galleryGrid: {
      gap: 12,
    },
    galleryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    galleryImageWrap: {
      width: '100%',
      height: 160,
      backgroundColor: colors.surfaceIcon,
    },
    galleryImg: {
      width: '100%',
      height: '100%',
    },
    removeImgBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    sceneLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    sceneTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    enhanceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceIcon,
    },
    enhanceBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    uploadIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
    },
    horizontalGallery: {
      gap: 12,
      paddingRight: 0,
    },
    reviewGalleryItem: {
      width: SCREEN_WIDTH * 0.6,
      height: 140,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    reviewGalleryImg: {
      width: '100%',
      height: '100%',
    },
    uploadTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    uploadSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    selectPhotosBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    selectPhotosBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    aiStudioBoxMobile: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    aiIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    aiSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    promptWrapper: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    promptInputMobile: {
      height: 60,
      fontSize: 13,
      color: colors.textPrimary,
      textAlignVertical: 'top',
    },
    generateBtn: {
      backgroundColor: colors.accentTeal,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    generateBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },

    // Review
    reviewList: {
      gap: 4,
      marginBottom: 20,
    },
    reviewItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    reviewLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    reviewValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    // Success Mobile
    nextStepsList: {
      gap: 10,
    },
    nextStepMobileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: 14,
      borderRadius: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    nextStepIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextStepBtnText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },

    // Common titles
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    headerIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    cardHeaderSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    contentTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    contentSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '500',
      paddingHorizontal: 0,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    successSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    successIconOuter: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },

    // Action Buttons
    fixedFooter: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 10,
    },
    actionRowFixed: {
      flexDirection: 'row',
      gap: 12,
    },
    backBtnFixed: {
      flex: 0.8,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueBtnFixed: {
      flex: 1.2,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    backBtn: {
      flex: 0.8,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    continueBtn: {
      flex: 1.2,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFF',
    },

    // Premium Design Tokens
    premiumCardLarge: {
      backgroundColor: colors.cardBackground,
      borderRadius: 28,
      paddingHorizontal: 14,
      paddingVertical: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: colors.cardShadowOpacity,
      shadowRadius: colors.cardShadowRadius,
      elevation: 8,
    },
    premiumCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20,
    },
    headerIconBoxPremium: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.2,
      borderColor: colors.cardBorder,
    },
    premiumCardTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    premiumCardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    cardHeaderCentric: {
      alignItems: 'center',
      marginBottom: 24,
    },
    premiumSearchBox: {
      backgroundColor: colors.surfaceIcon,
      borderRadius: 18,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 12,
    },
    premiumSearchInput: {
      flex: 1,
      height: 48,
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    searchActionBtn: {
      backgroundColor: colors.textPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      height: 44,
      borderRadius: 14,
    },
    searchActionText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    recordIconsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    recordItem: {
      alignItems: 'center',
      flex: 1,
    },
    recordIconInner: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      borderWidth: 1.2,
      borderColor: colors.cardBorder,
    },
    recordText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
    },
    premiumGroupLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginTop: 24,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    // Intelligence Dashboard (Step 2)
    intelHeaderBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 0,
      marginBottom: 30,
    },
    intelIconOuter: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    intelTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    verifiedPill: {
      backgroundColor: '#CCFBF1',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: '#99F6E4',
    },
    verifiedPillText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#0D9488',
      letterSpacing: 0.5,
    },
    intelSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    statsScrollContent: {
      paddingHorizontal: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingBottom: 24,
    },
    statCardPremium: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
      gap: 8,
      alignItems: 'flex-start',
    },
    statIconBoxPremium: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    statLabelPremium: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 2,
    },
    statValuePremium: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    infoBoxPremium: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      padding: 16,
      borderRadius: 16,
      gap: 12,
      alignItems: 'center',
    },
    infoBoxText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      fontWeight: '500',
    },

    // Step 1: Search & Results
    resultsList: {
      backgroundColor: colors.surfaceIcon,
      borderRadius: 16,
      marginTop: -16,
      marginBottom: 20,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    resultText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
      flex: 1,
    },

    // Global Components
    enrichButtonDisabled: {
      backgroundColor: colors.textMuted,
      shadowOpacity: 0,
      elevation: 0,
    },
    premiumTextInput: {
      height: 48,
      backgroundColor: colors.surfaceIcon,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    premiumContentTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    premiumContentSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      fontWeight: '500',
      paddingHorizontal: 0,
    },
    reviewItemPremium: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 4,
    },
    reviewIconBox: {
      width: 32,
      height: 32,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
    },

    structuralDetailCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 14,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    detailIconBox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: colors.accentTeal + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillContainer: {
      backgroundColor: '#F0FDFB',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#CCFBF1',
    },
    pillText: {
      color: '#0D9488',
      fontWeight: '800',
      fontSize: 11,
      textTransform: 'capitalize',
    },
    remarkCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    remarkLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.accentTeal,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    remarkText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
      fontWeight: '500',
    },
    directionsCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.accentTeal + '30',
      backgroundColor: colors.accentTeal + '08',
    },
    directionsText: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
      fontWeight: '500',
    },
    galleryScroll: {
      paddingHorizontal: 0,
      gap: 12,
    },
    photoContainerLarge: {
      width: '100%',
      height: 180,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    premiumPhotoCard: {
      width: SCREEN_WIDTH * 0.8,
      height: 260,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    photoCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flex: 1,
    },
    photoFooterLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.accentTeal,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    photoFooterTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    photoStatusBadgeReadOnly: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceIcon,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    photoStatusBadgeTextReadOnly: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    magicBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentTeal + '15',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accentTeal + '30',
    },
    magicBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    enhancedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentTeal + '10',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    enhancedBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accentTeal,
    },
    enhancementOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      zIndex: 10,
    },
    enhancementOverlayText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    photoCard: {
      width: '100%',
      height: '100%',
    },
    emptyGalleryCard: {
      width: SCREEN_WIDTH - 40,
      height: 150,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
    },
    emptyGalleryText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    mediaSection: {
      paddingTop: 12,
    },
    mediaSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 0,
      marginBottom: 16,
    },
    mediaSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.2,
    },
    lockedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceIcon,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    lockedBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
    },
    addMediaBtnSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addMediaBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    userPhotosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 0,
      gap: 12,
    },
    userPhotoItem: {
      width: (SCREEN_WIDTH - 52) / 2,
      height: 140,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    userPhotoImg: {
      width: '100%',
      height: '100%',
    },
    deletePhotoBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    uploadPlaceholderCard: {
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderTitleSmall: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 8,
    },
    uploadPlaceholderLarge: {
      width: '100%',
      height: 180,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
    },
    placeholderTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 12,
    },
    placeholderSub: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    aiStudioCard: { marginHorizontal: 0, marginTop: 32, borderRadius: 24, overflow: 'hidden' },
    aiStudioGradient: { padding: 24 },
    aiStudioContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    aiStudioInfo: { flex: 1, paddingRight: 16 },
    aiStudioTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    aiStudioDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    aiStudioBadge: { backgroundColor: colors.accentTeal, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    aiStudioBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFF' },
    mediaUploadCard: {
      backgroundColor: colors.cardBackground, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 16,
      alignItems: 'center' as const, borderWidth: 1.5, borderColor: colors.cardBorder, borderStyle: 'dashed' as const,
    },
    mediaUploadIconWrap: {
      width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surfaceIcon,
      alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10,
    },
    mediaUploadTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
    mediaUploadSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 14 },
    mediaSelectBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
      borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.surfaceIcon,
    },
    mediaSelectBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    aiStudioCardNew: {
      backgroundColor: colors.cardBackground, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 16,
      borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' as const,
    },
    aiStudioCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 16 },
    aiStudioIconBox: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentTeal,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    aiStudioCardTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
    aiStudioCardSub: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    aiStudioComingSoon: { backgroundColor: colors.accentTeal + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    aiStudioComingSoonText: { fontSize: 9, fontWeight: '900', color: colors.accentTeal, letterSpacing: 0.5 },
    aiStudioPromptLabel: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    aiStudioPromptBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 80,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    aiStudioPromptInput: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
      minHeight: 56,
    },
    aiStudioPromptInputStatic: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    aiStudioGenerateBtn: {
      backgroundColor: colors.accentTeal, borderRadius: 12, height: 44,
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8,
    },
    aiStudioGenerateBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    mediaTabBar: { flexDirection: 'row' as const, paddingHorizontal: 0, gap: 4 },
    mediaTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    mediaTabActive: { borderBottomWidth: 2, borderBottomColor: colors.accentTeal, borderRadius: 0 },
    mediaTabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    mediaTabTextActive: { color: colors.textPrimary, fontWeight: '900' },
    photoGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'space-between' as const, rowGap: 12 },
    photoGridCard: {
      backgroundColor: colors.cardBackground, borderRadius: 16,
      overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.cardBorder,
    },
    photoGridImgWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' as const },
    photoGridImg: { width: '100%', height: '100%' },
    photoGridOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center' as const, justifyContent: 'center' as const },
    photoGridDeleteBtn: {
      position: 'absolute' as const, top: 8, right: 8, width: 26, height: 26,
      borderRadius: 13, backgroundColor: 'rgba(239,68,68,0.85)',
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    photoGridFooter: { padding: 10 },
    photoGridLabel: { fontSize: 8, fontWeight: '900', color: colors.accentTeal, letterSpacing: 0.5, marginBottom: 2 },
    photoGridScene: { fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 },
    photoGridReadOnly: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
    photoGridReadOnlyText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
    enhancedBadgeSmall: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
    enhancedBadgeSmallText: { fontSize: 10, fontWeight: '800', color: colors.accentTeal },
    magicBtnSmall: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
      backgroundColor: colors.accentTeal + '15', paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 6, borderWidth: 1, borderColor: colors.accentTeal + '30',
    },
    magicBtnSmallText: { fontSize: 10, fontWeight: '800', color: colors.accentTeal },
    photoGridAddTile: {
      alignItems: 'center' as const, justifyContent: 'center' as const,
      borderStyle: 'dashed' as const, borderWidth: 2, borderColor: colors.cardBorder, backgroundColor: colors.surfaceIcon,
    },
    mediaEmptyState: { alignItems: 'center' as const, paddingVertical: 48, paddingHorizontal: 0 },
    mediaEmptyIconCircle: {
      width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentTeal + '15',
      alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16,
    },
    mediaEmptyTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
    mediaEmptySub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', textAlign: 'center' as const },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingBottom: 40,
    },
    sheetHeader: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    sheetDragHandle: {
      width: 40,
      height: 5,
      backgroundColor: colors.cardBorder,
      borderRadius: 3,
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    sheetActions: {
      paddingHorizontal: 20,
    },
    sheetActionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: colors.cardBorder,
    },
    sheetActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    uploadingOverlay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 20,
    },
    uploadingText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    stepIndicatorContainerMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 0,
    },
    stepCircleMobile: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.cardBorder,
    },
    stepCircleActiveMobile: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    stepLineMobile: {
      flex: 1,
      height: 2,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 0,
    },
    stepLineActiveMobile: {
      backgroundColor: colors.accentTeal,
    },
    contentWrapMobile: {
      flex: 1,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.dangerBg || '#FEF2F2',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.dangerBorder || '#FECACA',
      marginBottom: 20,
    },
    errorText: {
      fontSize: 12,
      color: colors.danger || '#DC2626',
      fontWeight: '600',
      flex: 1,
    },
    localPreviewCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 24,
    },
    localPreviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    localPreviewTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
    },
    localPreviewCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    localPreviewScroll: {
      paddingVertical: 4,
      marginBottom: 16,
    },
    localPreviewThumbWrap: {
      position: 'relative',
      marginRight: 12,
    },
    localPreviewThumb: {
      width: 80,
      height: 80,
      borderRadius: 12,
    },
    localPreviewRemoveBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(239,68,68,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBackground,
    },
    localPreviewActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    localPreviewAddMoreBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceIcon,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    localPreviewAddMoreText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    localPreviewUploadBtn: {
      flex: 2,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    localPreviewUploadText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    uploadProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.accentTeal + '10',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accentTeal + '20',
      marginBottom: 20,
    },
    uploadProgressText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentTeal,
    },
    toastContainer: {
      position: 'absolute',
      left: 20,
      right: 20,
      zIndex: 9999,
      backgroundColor: '#10B981',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    toastText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
}

