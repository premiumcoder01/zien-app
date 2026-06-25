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
  Image as RNImage,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



export default function SocialTemplatesScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();


  const [webOnlyModalVisible, setWebOnlyModalVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch templates from API
  const { data: apiTemplates = [], isLoading } = useQuery({
    queryKey: ['social-templates'],
    queryFn: () => getTemplates(accessToken || ''),
    enabled: !!accessToken,
  });

  console.log(apiTemplates)

  const confirmDelete = async () => {
    if (!templateToDelete || !accessToken) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(accessToken, templateToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['social-templates'] });
      setTemplateToDelete(null);
      Alert.alert('Success', 'Template deleted successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };



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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Eye Icon (Preview) */}
            <Pressable
              onPress={() => setPreviewTemplate(item)}
              style={styles.moreButton}
            >
              <MaterialCommunityIcons name="eye-outline" size={18} color={colors.textMuted} />
            </Pressable>

            {/* Edit Icon */}
            <Pressable
              onPress={() => setWebOnlyModalVisible(true)}
              style={styles.moreButton}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>

            {/* Delete Icon */}
            <Pressable
              onPress={() => setTemplateToDelete(item)}
              style={[styles.moreButton, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        </View>

        {/* Preview image */}
        {!!item.content?.preview_image_url && (
          <View style={styles.cardImageContainer}>
            <RNImage
              source={{ uri: item.content.preview_image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.templateTitle}>{item.name}</Text>
          <Text style={styles.templateMeta}>
            Created {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
          </Text>
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
          title="Templates"
          subtitle="Design premium visual templates for automated social posting."
          onBack={() => router.back()}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.loadingText}>Fetching architectures...</Text>
          </View>
        ) : (
          <FlatList
            data={apiTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="layers-off-outline" size={60} color={colors.cardBorder} />
                <Text style={styles.emptyTitle}>No Templates Found</Text>
                <Text style={styles.emptySubtitle}>You haven't created any templates yet.</Text>
              </View>
            }
          />
        )}

        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom + 16, 28) }]}
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

        <DeleteTemplateModal
          visible={!!templateToDelete}
          onClose={() => setTemplateToDelete(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />

        <TemplatePreviewModal
          visible={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
        />
      </LinearGradient>
    </View>
  );
}

const getStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 4,
    marginTop: 12,
  },
  cardImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: colors.surfaceSoft,
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
    bottom: 20,
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

// ─── Custom Delete Confirmation Modal ──────────────────────────────
function DeleteTemplateModal({
  visible,
  onClose,
  onConfirm,
  isDeleting,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(11, 35, 65, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
        <View style={{
          backgroundColor: colors.cardBackground,
          width: '100%',
          maxWidth: 340,
          borderRadius: 28,
          padding: 28,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}>
          {/* Circular Alert Icon */}
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <MaterialCommunityIcons name="alert-outline" size={32} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 10,
            textAlign: 'center',
          }}>
            Delete Template?
          </Text>

          {/* Description */}
          <Text style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 28,
          }}>
            Are you sure you want to delete this template? This action cannot be undone and it will be removed from your social builder.
          </Text>

          {/* Button Row */}
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <Pressable
              disabled={isDeleting}
              onPress={onClose}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBackground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={isDeleting}
              onPress={onConfirm}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 16,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Custom Template Preview Modal ─────────────────────────────────
function TemplatePreviewModal({
  visible,
  onClose,
  template,
}: {
  visible: boolean;
  onClose: () => void;
  template: any | null;
}) {
  const { colors } = useAppTheme();

  if (!template) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(11, 35, 65, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
        <View style={{
          backgroundColor: colors.cardBackground,
          width: '100%',
          maxWidth: 360,
          borderRadius: 28,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary }}>Template Preview</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>{template.name}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surfaceIcon || 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.cardBorder, marginVertical: 20 }} />

          {/* Mock Social Card Container */}
          <View style={{
            backgroundColor: '#FFF',
            borderRadius: 24,
            padding: 16,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}>
            {/* Header info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#0a2341',
                marginRight: 10,
              }} />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#0a2341' }}>@zien_estates</Text>
            </View>

            {/* Mock Image Section */}
            <View style={{
              width: '100%',
              height: 260,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#CBD5E1',
            }}>
              {/* Image */}
              <RNImage
                source={{ uri: template.content?.preview_image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />

              {/* Top Text Badge Overlay */}
              <View style={{
                position: 'absolute',
                top: 16,
                left: 12,
                right: 12,
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: 'rgba(10, 35, 65, 0.85)',
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  width: '90%',
                  alignItems: 'center',
                }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'center' }}
                    numberOfLines={1}
                  >
                    {template.name.toLowerCase().replace(/\s+/g, '')}
                  </Text>
                </View>
              </View>

              {/* Bottom Specs Badge Overlay */}
              <View style={{
                position: 'absolute',
                bottom: 16,
                left: 12,
                right: 12,
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: '#FFF',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0a2341' }}>
                    🛏️ {"{{beds}}"} Beds  |  🛁 {"{{baths}}"} Baths  |  📐 {"{{sqft}}"} SqFt
                  </Text>
                </View>
              </View>
            </View>

            {/* Description Text */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                <Text style={{ fontWeight: '900', color: '#0a2341' }}>@zien_estates</Text>
                {" "}Discover your dream home in the heart of Malibu. Exclusive features & breathtaki...
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

