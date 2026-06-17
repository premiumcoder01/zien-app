import { ExternalLink } from '@/components/external-link';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLeadEnquiries } from '@/hooks/useLeadEnquiries';
import { CreateDigitalCardPayload, DigitalCard, createDigitalCard, deleteDigitalCard } from '@/services/digitalCardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Clipboard, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { CreateCardModal } from '../_components/CreateCardModal';
import { DeleteCardModal } from '../_components/DeleteCardModal';
import { ProfileCard, type ProfileCardData } from '../_components/ProfileCard';



interface DashboardSectionProps {
  onSectionChange?: (section: string) => void;
  cards: DigitalCard[];
  activeCardId: string | null;
  setActiveCardId: (id: string | null) => void;
  activeCard: DigitalCard;
  refetch: () => Promise<any>;
}

function mapToCardData(card: DigitalCard): ProfileCardData {
  return {
    fullName: card.name || card.full_name || card.profile_name || '',
    title: card.title || '',
    legalRole: card.role || '',
    license: card.license || '',
    company: card.company_name || '',
    address: card.address || '',
    phone: card.phone || '',
    email: card.email || '',
    website: card.website || '',
    instagram: card.instagram || '',
    linkedin: card.linkedin || '',
    facebook: card.facebook || '',
    tiktok: card.tiktok || '',
  };
}

export function DashboardSection({
  onSectionChange,
  cards,
  activeCardId,
  setActiveCardId,
  activeCard,
  refetch
}: DashboardSectionProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const { accessToken } = useAuth();

  const [mainTab, setMainTab] = useState<'mycard' | 'enquiries'>('mycard');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<'work' | 'personal'>('work');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: enquiries = [] } = useLeadEnquiries();
  const cardLeads = enquiries.filter(e => String(e.digital_card_id) === String(activeCard?.id));
  const enquiryCount = cardLeads.length;

  console.log('[Lead Debug] Active Card:', activeCard?.id, `(${activeCard?.profile_name})`);
  console.log('[Lead Debug] Total enquiries in cache:', enquiries.length);
  enquiries.forEach(e => {
    console.log(`  - Lead ID: ${e.id}, Card ID in Lead: ${e.digital_card_id}, Match: ${String(e.digital_card_id) === String(activeCard?.id)}`);
  });

  const formatLeadDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const otherCards = cards.filter((c) => c.id !== activeCard?.id);

  const profileUrl = `https://staging.zien.ai/card/${activeCard?.id}`;

  const handleShare = async () => {
    if (!activeCard) return;
    await Share.share({
      message: `${activeCard.profile_name} — Digital Business Card\n${profileUrl}`,
      url: profileUrl,
      title: 'Zien Digital Card',
    });
  };

  const handleCopyLink = () => {
    Clipboard.setString(profileUrl);
    // Success feedback could be a Toast, using Alert here as a fallback
    if (Platform.OS !== 'web') {
      Alert.alert('Link Copied', 'The profile link has been copied to your clipboard.');
    }
  };

  const handleDeleteCard = () => {
    if (!activeCard || !accessToken) return;
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteCard = async () => {
    if (!activeCard || !accessToken) return;
    setIsDeleting(true);
    try {
      await deleteDigitalCard(accessToken, activeCard.id);
      await refetch();
      setActiveCardId(null); // Reset to first card
      setIsDeleteModalVisible(false);
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete the card. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = (type: 'work' | 'personal') => {
    setModalInitialType(type);
    setIsModalVisible(true);
  };

  const handleCreateCard = async (payload: CreateDigitalCardPayload) => {
    if (!accessToken) return;
    try {
      await createDigitalCard(accessToken, payload);
      await refetch();

      // Wait for refetch to complete, then try to find the new card
      setTimeout(() => {
        // Logic to select new card could go here
      }, 500);
    } catch (error) {
      console.error('Modal creation error:', error);
      throw error;
    }
  };

  // Handle Empty State
  if (cards.length === 0) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.emptyContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="card-plus-outline" size={20} color={colors.textPrimary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Digital Cards Yet</Text>
          <Text style={styles.emptyStateSub}>
            Create your first professional digital card to start sharing your contact info and collecting leads instantly.
          </Text>

          <View style={styles.emptyActionsStack}>
            <Pressable style={styles.createCardBtn} onPress={() => openCreateModal('work')}>
              <MaterialCommunityIcons name="plus" size={16} color={colors.cardBackground} />
              <Text style={styles.createCardBtnText}>Create Work Card</Text>
            </Pressable>
            <Pressable style={styles.personalCardBtn} onPress={() => openCreateModal('personal')}>
              <MaterialCommunityIcons name="account-plus-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.personalCardBtnText}>Personal Card</Text>
            </Pressable>
          </View>

          <CreateCardModal
            isVisible={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            onCreate={handleCreateCard}
            initialType={modalInitialType}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>

      {/* Active Card */}
      <View style={styles.activeCardOuter}>
        <Text style={styles.activeCardLabel}>Active Card</Text>

        <View style={styles.activeProfileRow}>
          <View style={[styles.activeProfileIconWrap, { backgroundColor: activeCard.card_color || 'rgba(11, 160, 178, 0.12)' }]}>
            <MaterialCommunityIcons
              name={activeCard.profile_type === 'personal' ? 'account-outline' : 'briefcase-outline'}
              size={28}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.activeProfileTextWrap}>
            <Text style={styles.activeProfileTitle} numberOfLines={1}>{activeCard?.profile_name}</Text>
            <Text style={styles.activeProfileSub}>{activeCard?.profile_type} Profile</Text>
          </View>
        </View>

        {otherCards.length > 0 && (
          <>
            <Text style={styles.switchToLabel}>SWITCH TO</Text>
            {otherCards.map((card) => (
              <Pressable
                key={card.id}
                style={styles.switchToItem}
                onPress={() => setActiveCardId(card.id)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${card.profile_name}`}>
                <View style={[styles.switchToBullet, { backgroundColor: card.card_color || colors.textPrimary }]} />
                <Text style={styles.switchToItemText}>{card.profile_name}</Text>
              </Pressable>
            ))}
          </>
        )}

        <Pressable
          style={styles.createProfileBtn}
          onPress={() => openCreateModal('work')}
          accessibilityRole="button"
          accessibilityLabel="Create new profile">
          <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
          <Text style={styles.createProfileBtnText}>Create New Profile</Text>
        </Pressable>
      </View>

      <CreateCardModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreate={handleCreateCard}
        initialType={modalInitialType}
      />

      <DeleteCardModal
        isVisible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onDelete={confirmDeleteCard}
        isDeleting={isDeleting}
      />

      {/* Main: Digital Cards + Tabs */}
      <View style={styles.mainSection}>
        <Text style={styles.mainTitle}>Digital Cards</Text>
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, mainTab === 'mycard' && styles.tabActive]}
            onPress={() => setMainTab('mycard')}>
            <Text style={[styles.tabText, mainTab === 'mycard' && styles.tabTextActive]}>My Card</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mainTab === 'enquiries' && styles.tabActive]}
            onPress={() => setMainTab('enquiries')}>
            <Text style={[styles.tabText, mainTab === 'enquiries' && styles.tabTextActive]}>Enquiries</Text>
            <View style={[styles.enquiryBadge, mainTab === 'enquiries' && styles.enquiryBadgeActive]}>
              <Text style={[styles.enquiryBadgeText, mainTab === 'enquiries' && styles.enquiryBadgeTextActive]}>{enquiryCount}</Text>
            </View>
          </Pressable>
        </View>

        {mainTab === 'mycard' && (
          <>
            <View style={[styles.workCardTag, { backgroundColor: activeCard.card_color || colors.accentTeal }]}>
              <Text style={styles.workCardTagText}>{activeCard?.profile_type} card</Text>
            </View>

            <View style={styles.profileCardWrap}>
              <ProfileCard
                card={mapToCardData(activeCard)}
                accentColor={activeCard.card_color || undefined}
                template={(activeCard.template as any) || 'modern'}
                avatarUri={activeCard.image || undefined}
                companyLogoUri={activeCard.logo || undefined}
                cardUrl={profileUrl}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <Text style={styles.quickActionsSub}>Manage and share your card.</Text>

              <Pressable
                style={({ pressed }) => [styles.shareProfileBtn, pressed && styles.shareProfileBtnPressed]}
                onPress={handleShare}>
                <MaterialCommunityIcons name="share-variant" size={22} color="#FFFFFF" />
                <Text style={styles.shareProfileBtnText}>Share Profile</Text>
              </Pressable>

              <View style={styles.secondaryActionsRow}>
                <ExternalLink
                  href={profileUrl}
                  style={styles.secondaryBtn}>
                  <View style={styles.secondaryBtnInner}>
                    <MaterialCommunityIcons name="eye-outline" size={22} color={colors.textPrimary} />
                    <Text style={styles.secondaryBtnText}>Preview</Text>
                  </View>
                </ExternalLink>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                  onPress={handleCopyLink}>
                  <MaterialCommunityIcons name="link-variant" size={22} color={colors.textPrimary} />
                  <Text style={styles.secondaryBtnText}>Copy Link</Text>
                </Pressable>
              </View>

              <View style={styles.inputFieldBlock}>
                <Text style={styles.inputFieldLabel}>PROFILE NAME</Text>
                <View style={styles.inputFieldContainer}>
                  <Text style={styles.inputFieldText}>{activeCard?.profile_name}</Text>
                </View>
              </View>

              <View style={styles.leadsBlock}>
                <View style={styles.leadsIconWrap}>
                  <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.accentTeal} />
                </View>
                <View style={styles.leadsTextWrap}>
                  <Text style={styles.leadsLabel}>TOTAL LEADS Enquiries</Text>
                  <Text style={styles.leadsMeta}>All time</Text>
                </View>
                <Text style={styles.leadsValue}>{enquiryCount}</Text>
              </View>
            </View>

            <Pressable style={styles.deleteCardAction} onPress={handleDeleteCard}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteCardText}>Delete this card</Text>
            </Pressable>

          </>
        )}

        {mainTab === 'enquiries' && (
          <View style={styles.enquiriesSection}>
            <Text style={styles.enquiriesHeading}>Enquiries</Text>
            <Text style={styles.enquiriesSubheading}>
              Manage leads and contacts collected from your "{activeCard?.profile_name || 'active'}" card.
            </Text>

            {cardLeads.length > 0 ? (
              cardLeads.map((lead) => (
                <View key={lead.id} style={styles.leadCard}>
                  <View style={styles.leadHeader}>
                    <View style={styles.leadInfo}>
                      <View style={[styles.avatar, { backgroundColor: '#3B82F620' }]}>
                        <Text style={[styles.avatarText, { color: '#3B82F6' }]}>
                          {lead.name ? lead.name[0].toUpperCase() : '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leadName} numberOfLines={1}>{lead.name}</Text>
                        <Text style={styles.leadDate} numberOfLines={1}>
                          {formatLeadDate(lead.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#3B82F615' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={[styles.statusText, { color: '#3B82F6' }]}>New</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.leadBody}>
                    <View style={styles.contactItem}>
                      <MaterialCommunityIcons name="email-outline" size={16} color="#9AA7B6" />
                      <Text style={styles.contactText} numberOfLines={1}>{lead.email}</Text>
                    </View>
                    <View style={styles.contactItem}>
                      <MaterialCommunityIcons name="phone-outline" size={16} color="#9AA7B6" />
                      <Text style={styles.contactText}>{lead.phone}</Text>
                    </View>
                    {lead.message ? (
                      <View style={[styles.contactItem, { alignItems: 'flex-start', marginTop: 4 }]}>
                        <MaterialCommunityIcons name="message-outline" size={16} color="#9AA7B6" style={{ marginTop: 2 }} />
                        <Text style={[styles.contactText, { fontWeight: '400', fontSize: 13, color: '#64748B' }]}>
                          "{lead.message}"
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.leadActions}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                      <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.accentTeal }]}
                      onPress={() => Linking.openURL(`mailto:${lead.email}`)}>
                      <MaterialCommunityIcons name="email" size={18} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Email</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.enquiriesEmptyCard}>
                <MaterialCommunityIcons name="account-group-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.enquiriesEmptyTitle}>No Data Yet</Text>
                <Text style={styles.enquiriesEmptyText}>
                  Share your card QR code to start collecting enquiries. When someone scans and shares their info, it will appear here.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 24,
  },
  activeCardOuter: {
    marginBottom: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 24,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  activeCardLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  activeProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeProfileIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeProfileTextWrap: { flex: 1, minWidth: 0 },
  activeProfileTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  activeProfileSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    opacity: 0.8,
  },
  switchToLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },
  switchToItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  switchToBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textPrimary,
  },
  switchToItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  createProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary + '60',
    marginTop: 12,
  },
  createProfileBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  mainSection: {},
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 6,
    borderRadius: 20,
    marginBottom: 24,
    alignSelf: 'flex-start',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.accentTeal,
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  enquiryBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  enquiryBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  enquiryBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  enquiryBadgeTextActive: {
    color: '#FFFFFF',
  },
  workCardTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workCardTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  profileCardWrap: {
    marginBottom: 20,
  },
  quickActionsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  quickActionsSub: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 18,
  },
  shareProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.accentTeal,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 14,
    minHeight: 52,
  },
  shareProfileBtnPressed: {
    opacity: 0.88,
  },
  shareProfileBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 52,
  },
  secondaryBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  secondaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  leadsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
    paddingTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  leadsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 160, 178, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadsTextWrap: { flex: 1 },
  leadsLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  leadsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  leadsMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputFieldBlock: {
    marginTop: 18,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  inputFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  inputFieldContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputFieldText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  deleteCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  deleteCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  enquiriesSection: {
    paddingTop: 8,
  },
  enquiriesHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  enquiriesSubheading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  enquiriesEmptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 28,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    minHeight: 320,
  },
  enquiriesEmptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 20,
  },
  enquiriesEmptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 40,
    paddingBottom: 40,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: 'rgba(11, 160, 178, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(11, 160, 178, 0.2)',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateSub: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
    marginBottom: 48,
    opacity: 0.8,
  },
  emptyActionsStack: {
    width: '100%',
    gap: 14,
    paddingHorizontal: 12,
  },
  createCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textPrimary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createCardBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.cardBackground,
  },
  personalCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  personalCardBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  leadCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: colors.cardShadowColor || 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  leadDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
    opacity: 0.5,
  },
  leadBody: {
    gap: 10,
    marginBottom: 18,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  leadActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
