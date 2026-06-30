import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AiContentItem, deleteAiContent, getAiContentList } from '@/services/aiContentService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;






export default function AiContentScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const contentTools = useMemo(() => [
    {
      id: 'property-description',
      title: 'Property Description',
      description: 'Generate high-converting listing copy automatically.',
      icon: 'home-variant-outline',
      color: colors.accentTeal,
    },
    {
      id: 'social-media',
      title: 'Social Media Posts',
      description: 'Adapt listings for Instagram, LinkedIn, and Facebook.',
      icon: 'cellphone-text',
      color: '#3B82F6',
    },
    {
      id: 'email-templates',
      title: 'Email Templates',
      description: 'Craft follow-ups, newsletters, and just-listed alerts.',
      icon: 'email-variant',
      color: '#8B5CF6',
    },
    {
      id: 'image-enhancer',
      title: 'Image Enhancer',
      description: 'AI-driven quality upscaling and lighting enhancement.',
      icon: 'image-multiple-outline',
      color: '#10B981',
    },
    {
      id: 'presentation-builder',
      title: 'Presentation Builder',
      description: 'Dynamic listing presentations and CMA decks.',
      icon: 'chart-pie',
      color: '#EC4899',
    },
  ], [colors.accentTeal]);
  const { accessToken } = useAuth();

  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Content library list states
  const [entries, setEntries] = useState<AiContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const selectedFilter = 'all';

  // Preview Modal States
  const [selectedItem, setSelectedItem] = useState<AiContentItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Delete Custom Modal States
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemAddress, setDeleteItemAddress] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'library'>('tools');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Fetch AI content helper
  const fetchLibrary = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getAiContentList(accessToken);
      if (response.success && Array.isArray(response.data)) {
        // Sort by creation date descending
        const sortedData = response.data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setEntries(sortedData);
      } else {
        throw new Error('Invalid server response layout.');
      }
    } catch (err: any) {
      console.error('[AiContentScreen] Error fetching library:', err);
      setError(err?.message || 'Failed to load content library. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  // Refetch library whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [fetchLibrary])
  );

  // Handle Delete
  const handleDelete = (id: string, address?: string) => {
    setDeleteItemId(id);
    setDeleteItemAddress(address || null);
    setShowDeleteModal(true);
  };

  // Handle Copy Content
  const handleCopyContent = async (item: AiContentItem) => {
    await Clipboard.setStringAsync(item.content);
    setCopiedId(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Content copied to clipboard successfully.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Share Content
  const handleShareContent = async (item: AiContentItem) => {
    try {
      await Share.share({
        message: item.content,
        title: getTypeDetails(item.type).label,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('[AiContentScreen] Error sharing:', err);
    }
  };

  // Card Content preview text formatter (stripping markdown bold markers for simple card display)
  const formatCardPreview = (text: string) => {
    if (!text) return '';
    const clean = text.replace(/\*\*|#|\*|`|•/g, '').trim();
    return clean;
  };

  // Helper to map content type details
  const getTypeDetails = (type: string) => {
    switch (type) {
      case 'property-description':
        return {
          label: 'Property Description',
          icon: 'home-variant-outline',
          color: colors.accentTeal,
          bg: colors.accentTeal + '15',
        };
      case 'social-media':
      case 'social-posts':
        return {
          label: 'Social Post',
          icon: 'cellphone-text',
          color: '#3B82F6',
          bg: '#3B82F615',
        };
      case 'email-templates':
        return {
          label: 'Email Template',
          icon: 'email-variant',
          color: '#8B5CF6',
          bg: '#8B5CF615',
        };
      case 'image-enhancer':
        return {
          label: 'Image Enhancer',
          icon: 'image-multiple-outline',
          color: '#10B981',
          bg: '#10B98115',
        };
      case 'presentation-builder':
        return {
          label: 'Presentation CMA',
          icon: 'chart-pie',
          color: '#EC4899',
          bg: '#EC489915',
        };
      default:
        return {
          label: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          icon: 'file-document-outline',
          color: '#64748B',
          bg: '#64748B15',
        };
    }
  };

  // Format creation dates to dynamic relative times
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return 'Recently';
    }
  };

  const formatDateDMY = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '21/05/2026';
    }
  };

  // Client side search and category filter implementation
  const filteredEntries = entries.filter((item) => {
    // Filter pill logic
    if (selectedFilter !== 'all' && item.type !== selectedFilter) return false;

    // Search bar logic
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const typeLabel = getTypeDetails(item.type).label.toLowerCase();
    const content = (item.content || '').toLowerCase();
    const inputDetails = (item.metadata?.input_details || '').toLowerCase();
    const customTitle = (item.metadata?.title || '').toLowerCase();

    return (
      typeLabel.includes(searchLower) ||
      content.includes(searchLower) ||
      inputDetails.includes(searchLower) ||
      customTitle.includes(searchLower)
    );
  });

  // Action callback to edit or view full generator
  const handleEditItem = (item: AiContentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prefill = item.metadata?.input_details || '';
    const content = item.content || '';

    // Route based on type, pre-populating inputs
    if (item.type === 'property-description') {
      router.push({
        pathname: '/(main)/ai-content/property-description',
        params: { id: item.id.toString(), prefill, content, address: item.metadata?.address || '' }
      });
    } else if (item.type === 'social-media' || item.type === 'social-posts') {
      router.push({
        pathname: '/(main)/ai-content/social-media-posts',
        params: { 
          id: item.id.toString(),
          prefill, 
          content, 
          address: item.metadata?.address || '',
          platform: item.metadata?.platform || '' 
        }
      });
    } else if (item.type === 'email-templates') {
      router.push({
        pathname: '/(main)/ai-content/email-templates',
        params: { id: item.id.toString(), prefill, content, address: item.metadata?.address || '' }
      });
    } else if (item.type === 'image-enhancer') {
      router.push({
        pathname: '/(main)/ai-content/image-enhancer',
        params: { id: item.id.toString(), prefill, content }
      });
    } else if (item.type === 'presentation-builder') {
      router.push({
        pathname: '/(main)/ai-content/presentation-builder',
        params: { id: item.id.toString(), prefill, content, address: item.metadata?.address || '' }
      });
    } else {
      // Default fallback: show view modal
      setSelectedItem(item);
      setShowModal(true);
    }
  };

  // Animated-looking pulsing skeletons
  const renderSkeletons = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <View key={index} style={styles.skeletonCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.skeletonBarPrimary} />
            <View style={styles.skeletonBarSecondary} />
          </View>
          <View style={styles.skeletonIconBox} />
        </View>
        <View style={styles.skeletonContentPreview} />
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonDate} />
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient as any}
        style={[styles.background, { paddingTop: insets.top }]}
      >
        {toastVisible && (
          <View style={[styles.toastContainer, { top: insets.top + 8 }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        <PageHeader
          title="AI Sweep"
          subtitle="Your 24/7 autonomous marketing engine for the modern real estate professional."
          onBack={() => router.back()}
        />

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'tools' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('tools');
            }}
          >
            <MaterialCommunityIcons
              name="lightning-bolt-outline"
              size={16}
              color={activeTab === 'tools' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabButtonText, activeTab === 'tools' && styles.tabButtonTextActive]}>AI Engines</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'library' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('library');
            }}
          >
            <MaterialCommunityIcons
              name="folder-multiple-outline"
              size={16}
              color={activeTab === 'library' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabButtonText, activeTab === 'library' && styles.tabButtonTextActive]}>Content Library</Text>
          </Pressable>
        </View>

        {activeTab === 'tools' ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Featured Virtual Staging Tool */}
            <Pressable
              style={styles.featuredCard}
              onPress={() => router.push('/(main)/ai-content/virtual-staging')}
            >
              <LinearGradient
                colors={['#083344', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredGradient}
              >
                <View style={styles.featuredRight}>
                  {/* Side-by-Side Images */}
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' }}
                    style={styles.halfImage}
                  />
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80' }}
                    style={styles.halfImage}
                  />
                  <View style={styles.labelBefore}><Text style={styles.labelText}>Before</Text></View>
                  <View style={styles.labelAfter}><Text style={styles.labelText}>After</Text></View>
                </View>

                <View style={styles.featuredLeft}>
                  <Text style={styles.featuredBadge}>Premiere Innovation</Text>
                  <Text style={styles.featuredTitle}>Virtual Staging</Text>
                  <Text style={styles.featuredSubtitle}>
                    Turn cold, empty architectural shells into warm, hyper-realistic spaces.
                  </Text>
                  <View style={styles.tryBtn}>
                    <Text style={styles.tryBtnText}>Try this</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            {/* Strategic Content Engines Section */}
            <Text style={styles.sectionTitle}>Strategic content engines</Text>
            <View style={styles.toolsGrid}>
              {contentTools.map((tool) => (
                <Pressable
                  key={tool.id}
                  style={styles.toolCard}
                  onPress={() => {
                    if (tool.id === 'property-description') router.push('/(main)/ai-content/property-description');
                    else if (tool.id === 'social-media') router.push('/(main)/ai-content/social-media-posts');
                    else if (tool.id === 'email-templates') router.push('/(main)/ai-content/email-templates');
                    else if (tool.id === 'image-enhancer') router.push('/(main)/ai-content/image-enhancer');
                    else if (tool.id === 'presentation-builder') router.push('/(main)/ai-content/presentation-builder');
                  }}
                >
                  <View style={[styles.toolIconBox, { backgroundColor: `${tool.color}10` }]}>
                    <MaterialCommunityIcons name={tool.icon as any} size={22} color={tool.color} />
                  </View>
                  <View style={styles.toolContent}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolDesc} numberOfLines={2}>{tool.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.libraryContainer}>
            {/* Fixed Search Area */}
            <View style={styles.fixedSearchArea}>
              <View style={styles.libraryHeader}>
                <Text style={styles.sectionTitle}>Content library</Text>
              </View>

              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your library..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Scrollable Library List */}
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.libraryScrollContent, { paddingBottom: insets.bottom + 300 }]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchLibrary(true)}
                  tintColor={colors.accentTeal}
                  colors={[colors.accentTeal]}
                />
              }
              ListEmptyComponent={() => (
                loading ? (
                  <View style={{ gap: 16, marginTop: 10 }}>{renderSkeletons()}</View>
                ) : error ? (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={() => fetchLibrary()}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <MaterialCommunityIcons name="folder-open-outline" size={40} color={colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No content found</Text>
                    <Text style={styles.emptySubtitle}>
                      {search
                        ? "We couldn't find matches for your search. Try adjusting terms."
                        : "Your autonomous library is empty. Generate content to see it listed here!"}
                    </Text>
                    {!search && (
                      <Pressable
                        style={styles.emptyActionBtn}
                        onPress={() => router.push('/(main)/ai-content/property-description')}
                      >
                        <Text style={styles.emptyActionBtnText}>Generate listing description</Text>
                      </Pressable>
                    )}
                  </View>
                )
              )}
              renderItem={({ item }) => {
                const details = getTypeDetails(item.type);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.contentCard,
                      { borderLeftWidth: 4, borderLeftColor: details.color, marginBottom: 16 },
                      pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedItem(item);
                      setShowModal(true);
                    }}
                  >
                    {/* Card Header: Address & Type Badge */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleBlock}>
                        <View style={styles.addressRow}>
                          <MaterialCommunityIcons name="map-marker" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                          <Text style={styles.cardTitleText} numberOfLines={1}>
                            {item.metadata?.address ? item.metadata.address.split(',')[0] : 'Market Announcement'}
                          </Text>
                        </View>
                        {item.metadata?.address && (
                          <Text style={styles.cardSubtitleText} numberOfLines={1}>
                            {item.metadata.address.split(',').slice(1).join(',').trim()}
                          </Text>
                        )}
                        <View style={styles.headerBadgeRow}>
                          <View style={[styles.typeBadge, { backgroundColor: details.bg }]}>
                            <MaterialCommunityIcons name={details.icon as any} size={11} color={details.color} style={{ marginRight: 6 }} />
                            <Text style={[styles.typeBadgeText, { color: details.color }]}>{details.label}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Card Body: Content Preview inside frame */}
                    <View style={styles.cardBodyContainer}>
                      <Text style={styles.cardContentPreview} numberOfLines={3}>
                        {formatCardPreview(item.content)}
                      </Text>
                    </View>

                    {/* Card Footer: Metadata & Actions */}
                    <View style={styles.cardFooter}>
                      <View style={styles.footerLeft}>
                        <View style={styles.dateBlock}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.cardDate} numberOfLines={1} ellipsizeMode="tail">{formatRelativeDate(item.created_at)}</Text>
                        </View>
                        {item.metadata?.template_type && (
                          <View style={styles.templateTypeBadge}>
                            <Text style={styles.templateTypeText} numberOfLines={1} ellipsizeMode="tail">{item.metadata.template_type.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardActionsRow}>
                        {/* Eye Button */}
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedItem(item);
                            setShowModal(true);
                          }}
                          style={styles.iconActionBtn}
                        >
                          <MaterialCommunityIcons name="eye-outline" size={16} color={colors.textSecondary} />
                        </Pressable>

                        {/* Copy Button */}
                        <Pressable
                          onPress={() => handleCopyContent(item)}
                          style={[
                            styles.iconActionBtn,
                            copiedId === item.id && { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={copiedId === item.id ? "check" : "content-copy"}
                            size={14}
                            color={copiedId === item.id ? '#10B981' : colors.textSecondary}
                          />
                        </Pressable>

                        {/* Edit Button */}
                        <Pressable
                          onPress={() => handleEditItem(item)}
                          style={styles.iconActionBtn}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.textSecondary} />
                        </Pressable>

                        {/* Delete Button */}
                        <Pressable
                          onPress={() => handleDelete(item.id.toString(), item.metadata?.address)}
                          style={[styles.iconActionBtn, styles.deleteActionBtn]}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={15} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </LinearGradient>
      {/* Premium Preview Modal / Sheet */}
      {selectedItem && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showModal}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={[styles.modalFullScreen, { paddingTop: insets.top, backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleColumn}>
                <Text style={styles.modalTitle}>Content Preview</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2} ellipsizeMode="tail">
                  {selectedItem.metadata?.address || 'Generic Property'}
                </Text>
              </View>
              <Pressable onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <ScrollView
                style={styles.modalTextBox}
                contentContainerStyle={[styles.modalTextBoxContent, { paddingBottom: insets.bottom + 50 }]}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalContentText}>{selectedItem.content}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && deleteItemId && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowDeleteModal(false)}>
              <View style={styles.modalOverlayBg} />
            </TouchableWithoutFeedback>

            <View style={styles.deleteModalContent}>
              <View style={styles.deleteIconCircle}>
                <MaterialCommunityIcons name="alert-outline" size={28} color="#EF4444" />
              </View>

              <Text style={styles.deleteModalTitle}>Confirm Deletion</Text>

              <Text style={styles.deleteModalText}>
                Are you sure you want to delete this architectural narrative for{' '}
                <Text style={styles.deleteModalTextBold}>
                  {deleteItemAddress || 'this property'}
                </Text>
                ? This action cannot be undone.
              </Text>

              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={styles.deleteCancelBtn}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.deleteCancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteConfirmBtn}
                  onPress={async () => {
                    const id = deleteItemId;
                    setShowDeleteModal(false);
                    // Optimistic update
                    setEntries((prev) => prev.filter((item) => item.id.toString() !== id));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showToast('Content deleted successfully.');

                    if (accessToken) {
                      try {
                        await deleteAiContent(id, accessToken);
                      } catch (err) {
                        console.warn('[AiContentScreen] Network deletion failed, removed locally only:', err);
                      }
                    }
                  }}
                >
                  <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft || 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      padding: 4,
      marginHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 9,
    },
    tabButtonActive: {
      backgroundColor: colors.accentTeal || '#0D9488',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    tabButtonTextActive: {
      color: '#FFFFFF',
    },
    libraryContainer: {
      flex: 1,
    },
    fixedSearchArea: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    libraryScrollContent: {
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: 0.8,
    },
    featuredCard: {
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 32,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
    featuredGradient: {
      flexDirection: 'column',
      padding: 16,
    },
    featuredLeft: {
      marginTop: 20,
    },
    featuredBadge: {
      color: '#E0F2FE',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    featuredTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 8,
    },
    featuredSubtitle: {
      color: '#E0F2FE',
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 16,
    },
    tryBtn: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    tryBtnText: {
      color: '#0891B2',
      fontWeight: '900',
      fontSize: 12,
    },
    featuredRight: {
      width: '100%',
      aspectRatio: 1.4,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      position: 'relative',
      flexDirection: 'row',
    },
    halfImage: {
      width: '50%',
      height: '100%',
      resizeMode: 'cover',
    },
    labelBefore: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    labelAfter: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: '#0891B2',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    labelText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '900',
    },
    toolsGrid: {
      marginBottom: 32,
      gap: 12,
    },
    toolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    toolIconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    toolContent: { flex: 1 },
    toolTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    toolDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    libraryHeader: {
      // marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    filterContainer: {
      marginTop: 12,
      flexDirection: 'row',
    },
    filterContentContainer: {
      gap: 8,
      paddingRight: 20,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterPillActive: {
      backgroundColor: colors.accentTeal,
      borderColor: colors.accentTeal,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: '#FFFFFF',
    },
    libraryList: { gap: 16 },
    contentCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitleBlock: {
      flex: 1,
      marginRight: 12,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    cardTitleText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardSubtitleText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginLeft: 20,
    },
    headerBadgeRow: {
      flexDirection: 'row',
      marginTop: 6,
      marginLeft: 20,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      flexShrink: 0,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    cardBodyContainer: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardContentPreview: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      fontWeight: '500',
    },
    cardFooter: {
      flexDirection: 'column',
      gap: 12,
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardDate: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '700',
    },
    templateTypeBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexShrink: 1,
    },
    templateTypeText: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '800',
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    iconActionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteActionBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },

    // Skeleton loaders
    skeletonCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      opacity: 0.6,
    },
    skeletonBarPrimary: {
      height: 16,
      borderRadius: 4,
      backgroundColor: colors.surfaceSoft,
      width: '65%',
    },
    skeletonBarSecondary: {
      height: 11,
      borderRadius: 4,
      backgroundColor: colors.surfaceSoft,
      width: '45%',
      marginTop: 4,
    },
    skeletonIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
    },
    skeletonContentPreview: {
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.surfaceSoft,
      marginVertical: 12,
      width: '100%',
    },
    skeletonFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
    },
    skeletonBadge: {
      height: 18,
      width: 100,
      borderRadius: 6,
      backgroundColor: colors.surfaceSoft,
    },
    skeletonDate: {
      height: 12,
      width: 50,
      borderRadius: 4,
      backgroundColor: colors.surfaceSoft,
    },

    // Error state
    errorContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 16,
      lineHeight: 18,
    },
    retryBtn: {
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 12,
    },

    // Empty State style
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    emptyActionBtn: {
      backgroundColor: colors.accentTeal,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyActionBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 12,
    },

    // Preview Modal Bottom Sheet styles
    modalFullScreen: {
      flex: 1,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    modalTitleColumn: {
      flex: 1,
      alignItems: 'flex-start',
      gap: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: {
      paddingHorizontal: 24,
      marginTop: 8,
      flex: 1,
      minHeight: 300,
    },
    modalTextBox: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flex: 1,
    },
    modalTextBoxContent: {
      padding: 20,
    },
    modalContentText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 24,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalOverlayBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(11, 22, 33, 0.45)',
    },
    deleteModalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      width: '100%',
      maxWidth: 340,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 10,
    },
    deleteIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    deleteModalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    deleteModalText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    deleteModalTextBold: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    deleteCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deleteCancelBtnText: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 14,
    },
    deleteConfirmBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteConfirmBtnText: {
      fontWeight: '700',
      color: '#FFFFFF',
      fontSize: 14,
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
