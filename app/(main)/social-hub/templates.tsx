import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { deleteTemplate, getTemplates } from '@/services/socialService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All', icon: 'apps' as const },
  { id: 'instagram', label: 'Instagram', icon: 'instagram' as const },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' as const },
  // { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' as const },
  { id: 'tiktok', label: 'TikTok', icon: 'music-note' as const },
];

export default function SocialTemplatesScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState('all');
  const [webOnlyModalVisible, setWebOnlyModalVisible] = useState(false);

  // Fetch templates from API
  const { data: apiTemplates = [], isLoading } = useQuery({
    queryKey: ['social-templates'],
    queryFn: () => getTemplates(accessToken || ''),
    enabled: !!accessToken,
  });

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            try {
              await deleteTemplate(accessToken, id);
              queryClient.invalidateQueries({ queryKey: ['social-templates'] });
              Alert.alert('Success', 'Template deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const filteredTemplates = apiTemplates.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = activePlatform === 'all' || item.platform.toLowerCase() === activePlatform.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  const renderTemplate = ({ item, index }: { item: any; index: number }) => {
    const platformIcon = item.platform.toLowerCase() === 'instagram' ? 'instagram' :
      item.platform.toLowerCase() === 'facebook' ? 'facebook' :
        item.platform.toLowerCase() === 'linkedin' ? 'linkedin' :
          item.platform.toLowerCase() === 'tiktok' ? 'music-note' : 'layers-outline';

    const platformColor = item.platform.toLowerCase() === 'instagram' ? '#E1306C' :
      item.platform.toLowerCase() === 'facebook' ? '#1877F2' :
        item.platform.toLowerCase() === 'linkedin' ? '#0A66C2' :
          item.platform.toLowerCase() === 'tiktok' ? '#000000' : colors.accentTeal;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify()}
        style={styles.templateCard}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
          style={styles.glassBackground}
        />

        <View style={styles.cardHeader}>
          <View style={[styles.platformBadge, { backgroundColor: platformColor + '20' }]}>
            <MaterialCommunityIcons name={platformIcon as any} size={14} color={platformColor} />
            <Text style={[styles.platformText, { color: platformColor }]}>{item.platform}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} style={styles.moreButton}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.templateTitle}>{item.name}</Text>
          <Text style={styles.templateMeta}>
            Created {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>88%</Text>
            <Text style={styles.statLabel}>Conv.</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>124</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => setWebOnlyModalVisible(true)}
          >
            <Text style={styles.editButtonText}>Customize</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#FFF" />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <PageHeader
          title="Template Library"
          subtitle="Design premium visual templates for automated social posting."
          onBack={() => router.back()}
        />

        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search templates..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.filterScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {PLATFORM_FILTERS.map((filter) => (
              <Pressable
                key={filter.id}
                onPress={() => setActivePlatform(filter.id)}
                style={[
                  styles.filterPill,
                  activePlatform === filter.id && styles.activeFilterPill,
                ]}
              >
                <MaterialCommunityIcons
                  name={filter.icon as any}
                  size={16}
                  color={activePlatform === filter.id ? '#FFF' : colors.textMuted}
                />
                <Text style={[
                  styles.filterText,
                  activePlatform === filter.id && styles.activeFilterText,
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.loadingText}>Fetching architectures...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="layers-off-outline" size={60} color={colors.cardBorder} />
                <Text style={styles.emptyTitle}>No Templates Found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search or filters.</Text>
              </View>
            }
          />
        )}

        <Pressable
          style={styles.fab}
          onPress={() => setWebOnlyModalVisible(true)}
        >
          <LinearGradient
            colors={[colors.accentTeal, colors.accentBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.fabText}>Create Template</Text>
          </LinearGradient>
        </Pressable>

        <Modal
          animationType="fade"
          transparent={true}
          visible={webOnlyModalVisible}
          onRequestClose={() => setWebOnlyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.webBadge}>
                <MaterialCommunityIcons name="monitor" size={16} color={colors.accentTeal} />
                <Text style={styles.webBadgeText}>WEB FEATURE</Text>
              </View>
              <Text style={styles.modalTitle}>Visual Editor</Text>
              <Text style={styles.modalDescription}>
                Creating and editing template architectures requires the high-fidelity Visual Social Canvas, currently available on our desktop platform.
              </Text>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setWebOnlyModalVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const getStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  filterScrollContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  activeFilterPill: {
    backgroundColor: colors.accentTeal,
    borderColor: colors.accentTeal,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#FFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  templateCard: {
    borderRadius: 24,
    marginBottom: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    marginBottom: 20,
  },
  templateTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  templateMeta: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: -20,
    marginBottom: -20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 15,
  },
  editButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    height: 45,
    borderRadius: 28,
    gap: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(11, 45, 62, 0.5)',
    justifyContent: 'center',
    padding: 25,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(10, 35, 65, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  webBadgeText: {
    color: colors.accentTeal,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
    fontWeight: '500',
  },
  closeModalBtn: {
    backgroundColor: colors.textPrimary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: colors.cardBackground,
    fontSize: 16,
    fontWeight: '800',
  },
});
