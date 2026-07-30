import { useAppTheme } from '@/context/ThemeContext';
import { useLeadEnquiries } from '@/hooks/useLeadEnquiries';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface LeadEnquiriesSectionProps {
  onSectionChange?: (section: string) => void;
  cards?: any[];
  activeCardId?: string | null;
  setActiveCardId?: (id: string | null) => void;
  activeCard?: any;
}

function formatLeadDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function LeadEnquiriesSection({
  onSectionChange,
  cards = [],
  activeCardId,
  setActiveCardId,
  activeCard,
}: LeadEnquiriesSectionProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [search, setSearch] = useState('');
  const { data: leads = [], isLoading } = useLeadEnquiries();

  // Filter leads based on the active/selected digital card profile
  const cardLeads = activeCard
    ? leads.filter(lead => String(lead.digital_card_id) === String(activeCard.id))
    : leads;

  const filteredLeads = cardLeads.filter(lead =>
    (lead.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (lead.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const thisMonthLeads = cardLeads.filter(lead => {
    try {
      const date = new Date(lead.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  }).length;

  const responseRate = cardLeads.length > 0 ? '100%' : '0%';

  const statCardsData = [
    { key: 'total', label: 'Total Leads', value: String(cardLeads.length), icon: 'account-outline' as const, iconBg: '#E0F2FE' },
    { key: 'month', label: 'This Month', value: String(thisMonthLeads), icon: 'calendar-outline' as const, iconBg: '#DCFCE7' },
    { key: 'rate', label: 'Response Rate', value: responseRate, icon: 'email-open-outline' as const, iconBg: '#FFEDD5' },
  ];

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <ActivityIndicator size="large" color={colors.accentTeal} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '600' }}>Loading enquiries...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Profile Selector */}
      {cards && cards.length > 0 && (
        <View style={styles.profileSelectorCard}>
          <View style={styles.profileHeader}>
            <View style={styles.activeProfileIndicator}>
              <View style={[styles.avatarIndicator, { backgroundColor: activeCard?.card_color || colors.accentTeal }]}>
                <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeProfileLabel}>Viewing Leads For</Text>
                <Text style={styles.activeProfileName} numberOfLines={1}>
                  {activeCard?.profile_name || 'Active Profile'}
                </Text>
              </View>
            </View>
          </View>
          
          {cards.filter(c => c.id !== activeCard?.id).length > 0 && (
            <View style={styles.switchRowContainer}>
              <Text style={styles.switchToLabel}>SWITCH PROFILE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switchChipsScroll}>
                {cards.filter(c => c.id !== activeCard?.id).map((card) => (
                  <Pressable
                    key={card.id}
                    style={[styles.switchChip, { borderColor: card.card_color || colors.cardBorder }]}
                    onPress={() => setActiveCardId && setActiveCardId(card.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${card.profile_name}`}>
                    <View style={[styles.switchChipBullet, { backgroundColor: card.card_color || colors.textPrimary }]} />
                    <Text style={styles.switchChipText}>{card.profile_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.statsRow}>
        {statCardsData.map((stat) => (
          <View key={stat.key} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
              <MaterialCommunityIcons
                name={stat.icon}
                size={18}
                color="#0B2D3E"
              />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + Filters */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9AA7B6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#9AA7B6"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Leads List */}
      <Text style={styles.listHeader}>Recent Leads</Text>

      {filteredLeads.length > 0 ? (
        filteredLeads.map((lead) => (
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
                    {formatLeadDate(lead.created_at)} • {lead.digital_card?.profile_name || 'Digital Card'}
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
                    {"\""}{lead.message}{"\""}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.leadActions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  const cleanedPhone = lead.phone ? lead.phone.replace(/[^+\d]/g, '') : '';
                  if (cleanedPhone) {
                    Linking.openURL(`tel:${cleanedPhone}`).catch(() => {
                      Alert.alert('Error', 'Could not open the dialer. Please make sure phone calls are supported on your device.');
                    });
                  } else {
                    Alert.alert('Error', 'No phone number available.');
                  }
                }}>
                <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Call</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.accentTeal }]}
                onPress={() => {
                  if (lead.email) {
                    Linking.openURL(`mailto:${lead.email}`).catch(() => {
                      Alert.alert('Error', 'Could not open the mail client. Please check your email configuration.');
                    });
                  } else {
                    Alert.alert('Error', 'No email address available.');
                  }
                }}>
                <MaterialCommunityIcons name="email" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Email</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="magnify" size={56} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No matching leads</Text>
          <Text style={styles.emptySub}>Try adjusting your search terms.</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
  profileSelectorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeProfileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarIndicator: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeProfileLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  activeProfileName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  switchRowContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  switchToLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  switchChipsScroll: {
    gap: 8,
  },
  switchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.02)',
  },
  switchChipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  switchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentTeal,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 15,
    justifyContent: 'center',
    marginBottom: 15,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
    minWidth: 0,
    elevation: 2,
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    minHeight: 52,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingRight: 8,
  },
  filtersBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    elevation: 1,
  },
  listHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  leadCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: colors.cardShadowColor,
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
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LeadEnquiriesSection;
