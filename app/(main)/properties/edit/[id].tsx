import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { extractPriceNumber, finalizeProperty, formatPropertyPrice, getPropertyDetails, uploadPropertyImage } from '@/services/propertyService';
import { generateAiImage } from '@/services/aiContentService';
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
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AI_ARCHITECTURAL_PRESETS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=1200',
];

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
function StepMedia({
  mlsPhotos,
  setMlsPhotos,
  userPhotos,
  setUserPhotos,
  aiPhotos,
  setAiPhotos,
  onPickerOpen,
  isUploading,
  aiPrompt,
  setAiPrompt,
  onGenerateAi,
  isGeneratingAi,
  enhancedImages,
  enhancingMap,
  toggleEnhance,
}: any) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const [activeMediaTab, setActiveMediaTab] = useState<'mls' | 'uploads' | 'ai-generated'>('mls');

  const PHOTO_W = (SCREEN_WIDTH - 44) / 2;

  const removeMlsPhoto = (url: string) => {
    setMlsPhotos((prev: string[]) => prev.filter((p: string) => p !== url));
  };

  const removeUserPhoto = (url: string) => {
    setUserPhotos((prev: string[]) => prev.filter((p: string) => p !== url));
  };

  const removeAiPhoto = (url: string) => {
    setAiPhotos((prev: string[]) => prev.filter((p: string) => p !== url));
  };

  return (
    <View style={styles.stepContainer}>
      <View style={{ paddingHorizontal: 4, marginBottom: 20 }}>
        <Text style={styles.intelTitle}>AI Media</Text>
        <Text style={styles.intelSubtitle}>Upload your photos or use Zien AI to generate high-end architectural visuals.</Text>
      </View>

      {/* Top 2 Action Cards */}
      <View style={{ gap: 14, marginBottom: 24 }}>
        {/* Upload Media Card */}
        <TouchableOpacity style={styles.mediaUploadCard} onPress={onPickerOpen} activeOpacity={0.8}>
          <View style={styles.mediaUploadIconWrap}>
            <MaterialCommunityIcons name="tray-arrow-up" size={26} color={colors.accentTeal} />
          </View>
          <Text style={styles.mediaUploadTitle}>Upload Media</Text>
          <Text style={styles.mediaUploadSub}>Add multiple property photos</Text>
          <View style={styles.mediaSelectBtn}>
            <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
            <Text style={styles.mediaSelectBtnText}>Select Photos</Text>
          </View>
        </TouchableOpacity>

        {/* AI Studio Generator Card */}
        <View style={styles.aiStudioCardNew}>
          <LinearGradient
            colors={['rgba(6,182,212,0.12)', 'rgba(99,102,241,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
          </View>

          <Text style={styles.aiStudioPromptLabel}>GENERATION PROMPT</Text>
          <View style={styles.aiStudioPromptBox}>
            <TextInput
              style={styles.aiStudioPromptInput}
              placeholder="e.g. A high-end modern living room with floor-to-ceiling windows at golden hour, minimalist furniture, marble floors..."
              placeholderTextColor={colors.textMuted}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.aiStudioGenerateBtn,
              isGeneratingAi && { opacity: 0.7 }
            ]}
            onPress={onGenerateAi}
            disabled={isGeneratingAi}
            activeOpacity={0.85}
          >
            {isGeneratingAi ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.aiStudioGenerateBtnText}>Synthesizing Visual...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="creation" size={18} color="#FFF" />
                <Text style={styles.aiStudioGenerateBtnText}>Generate with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.mediaTabBar}>
        <TouchableOpacity
          style={[styles.mediaTab, activeMediaTab === 'mls' && styles.mediaTabActive]}
          onPress={() => setActiveMediaTab('mls')}
        >
          <Text style={[styles.mediaTabText, activeMediaTab === 'mls' && styles.mediaTabTextActive]}>
            MLS Professional ({mlsPhotos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mediaTab, activeMediaTab === 'uploads' && styles.mediaTabActive]}
          onPress={() => setActiveMediaTab('uploads')}
        >
          <Text style={[styles.mediaTabText, activeMediaTab === 'uploads' && styles.mediaTabTextActive]}>
            My Uploads ({userPhotos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mediaTab, activeMediaTab === 'ai-generated' && styles.mediaTabActive]}
          onPress={() => setActiveMediaTab('ai-generated')}
        >
          <Text style={[styles.mediaTabText, activeMediaTab === 'ai-generated' && styles.mediaTabTextActive]}>
            AI Generated ({aiPhotos.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 1, backgroundColor: colors.cardBorder, marginBottom: 16 }} />

      {/* Tab: MLS */}
      {activeMediaTab === 'mls' && (
        <View>
          {mlsPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {mlsPhotos.map((url: string, idx: number) => (
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

      {/* Tab: Uploads */}
      {activeMediaTab === 'uploads' && (
        <View>
          {userPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {userPhotos.map((url: string, idx: number) => {
                const isEnhanced = enhancedImages?.has?.(url);
                const isProcessing = enhancingMap?.[url];
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
                          onPress={() => toggleEnhance?.(url)}
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

      {/* Tab: AI Generated */}
      {activeMediaTab === 'ai-generated' && (
        <View>
          {aiPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {aiPhotos.map((url: string, idx: number) => (
                <View key={idx} style={[styles.photoGridCard, { width: PHOTO_W }]}>
                  <View style={styles.photoGridImgWrap}>
                    <Image source={{ uri: url }} style={styles.photoGridImg} contentFit="cover" />
                    <TouchableOpacity style={styles.photoGridDeleteBtn} onPress={() => removeAiPhoto(url)}>
                      <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.photoGridFooter}>
                    <Text style={[styles.photoGridLabel, { color: '#06B6D4' }]}>AI GENERATED</Text>
                    <Text style={styles.photoGridScene}>Scene {idx + 1}</Text>
                    <View style={styles.enhancedBadgeSmall}>
                      <MaterialCommunityIcons name="sparkles" size={11} color="#06B6D4" />
                      <Text style={[styles.enhancedBadgeSmallText, { color: '#06B6D4' }]}>Synthesized</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.mediaEmptyState}>
              <View style={[styles.mediaEmptyIconCircle, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                <MaterialCommunityIcons name="creation" size={32} color="#06B6D4" />
              </View>
              <Text style={styles.mediaEmptyTitle}>No AI Visuals Yet</Text>
              <Text style={styles.mediaEmptySub}>Type a scene description in the AI Studio Generator above and tap "Generate with AI"</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StepReview({ mlsPhotos, userPhotos, aiPhotos, formData }: any) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const allImages = [...mlsPhotos, ...userPhotos, ...(aiPhotos || [])];

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
                  router.push('/(main)/social-hub');
                } else if (card.id === 'campaign' || card.id === 'campaign_web') {
                  router.push('/(main)/crm');
                } else if (card.id === 'hub') {
                  router.push(`/(main)/properties/${propertyId}` as any);
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
  const [aiPhotos, setAiPhotos] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [enhancingMap, setEnhancingMap] = useState<Record<string, boolean>>({});
  const [enhancedImages, setEnhancedImages] = useState<Set<string>>(new Set());
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
        setAiPhotos(d.ai_images || []);
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

  const handleGenerateAi = async () => {
    const promptToUse = aiPrompt.trim() || 'A high-end modern living room with floor-to-ceiling windows at golden hour, minimalist furniture, marble floors';
    setIsGeneratingAi(true);
    try {
      const res = await generateAiImage(promptToUse, accessToken || undefined);
      if (res?.success && res?.data?.imageUrl) {
        setAiPhotos(prev => [res.data.imageUrl, ...prev]);
        setAiPrompt('');
        Alert.alert('Image Generated', 'AI architectural visual generated successfully and added to your media vault!');
      } else {
        throw new Error(res?.message || 'Failed to generate visual');
      }
    } catch (e: any) {
      console.error('[AI Studio Generator] Error:', e);
      Alert.alert('Generation Failed', e?.message || 'Failed to generate visual. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const toggleEnhance = (url: string) => {
    setEnhancingMap(prev => ({ ...prev, [url]: true }));
    setTimeout(() => {
      setEnhancingMap(prev => ({ ...prev, [url]: false }));
      setEnhancedImages(prev => new Set(prev).add(url));
    }, 1500);
  };

  const { mutate: finalizeMutation, isPending: isFinalizing } = useMutation({
    mutationFn: () => {
      const extractedNum = extractPriceNumber(formData);
      const finalPrice = formData.price || (extractedNum > 0 ? `$${extractedNum.toLocaleString()}` : '');

      const finalData = {
        ...formData,
        price: finalPrice,
        ...(extractedNum > 0 ? { ListPrice: extractedNum, HAR_CurrentPrice: extractedNum } : {}),
        user_images: [...userPhotos, ...aiPhotos],
        ai_images: aiPhotos,
        Media: mlsPhotos.map(url => ({ MediaCategory: 'Photo', MediaURL: url }))
      };
      return finalizeProperty({
        id: id as string,
        address: formData.address,
        data: finalData,
        userImages: [...userPhotos, ...aiPhotos]
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
      case 2:
        return (
          <StepMedia
            mlsPhotos={mlsPhotos}
            setMlsPhotos={setMlsPhotos}
            userPhotos={userPhotos}
            setUserPhotos={setUserPhotos}
            aiPhotos={aiPhotos}
            setAiPhotos={setAiPhotos}
            onPickerOpen={() => setIsPickingMedia(true)}
            isUploading={isUploading}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            onGenerateAi={handleGenerateAi}
            isGeneratingAi={isGeneratingAi}
            enhancedImages={enhancedImages}
            enhancingMap={enhancingMap}
            toggleEnhance={toggleEnhance}
          />
        );
      case 3:
        return (
          <StepReview
            mlsPhotos={mlsPhotos}
            userPhotos={userPhotos}
            aiPhotos={aiPhotos}
            formData={formData}
          />
        );
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
    mediaUploadCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 18,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
    },
    mediaUploadIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceIcon,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    mediaUploadTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
    mediaUploadSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 14 },
    mediaSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceIcon,
    },
    mediaSelectBtnText: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    aiStudioCardNew: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    aiStudioCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    aiStudioIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiStudioCardTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
    aiStudioCardSub: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    aiStudioPromptLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    aiStudioPromptBox: {
      backgroundColor: colors.inputBackground || colors.surfaceIcon,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 84,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    aiStudioPromptInput: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
      minHeight: 60,
    },
    aiStudioGenerateBtn: {
      backgroundColor: '#0B213E',
      borderRadius: 12,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    aiStudioGenerateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    mediaTabBar: { flexDirection: 'row', paddingHorizontal: 0, gap: 4, marginTop: 8 },
    mediaTab: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
    mediaTabActive: { borderBottomWidth: 2, borderBottomColor: colors.accentTeal, borderRadius: 0 },
    mediaTabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    mediaTabTextActive: { color: colors.textPrimary, fontWeight: '900' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingBottom: 24 },
    photoGridCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    photoGridImgWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
    photoGridImg: { width: '100%', height: '100%' },
    photoGridOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoGridDeleteBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(239,68,68,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoGridFooter: { padding: 10 },
    photoGridLabel: { fontSize: 8, fontWeight: '900', color: colors.accentTeal, letterSpacing: 0.5, marginBottom: 2 },
    photoGridScene: { fontSize: 13, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 },
    photoGridReadOnly: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    photoGridReadOnlyText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
    enhancedBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    enhancedBadgeSmallText: { fontSize: 10, fontWeight: '800', color: colors.accentTeal },
    magicBtnSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentTeal + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.accentTeal + '30',
    },
    magicBtnSmallText: { fontSize: 10, fontWeight: '800', color: colors.accentTeal },
    photoGridAddTile: {
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceIcon,
    },
    mediaEmptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
    mediaEmptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentTeal + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    mediaEmptyTitle: { fontSize: 15, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
    mediaEmptySub: { fontSize: 12, color: colors.textMuted, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
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