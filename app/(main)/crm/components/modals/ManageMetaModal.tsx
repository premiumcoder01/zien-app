import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  addCRMGroup,
  addCRMTag,
  deleteCRMGroup,
  deleteCRMTag,
  getCRMMeta
} from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ManageMetaModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_COLORS = ['#00A3AD', '#EA580C', '#0B213E', '#6366F1', '#10B981', '#64748B', '#EC4899', '#8B5CF6'];

export const ManageMetaModal: React.FC<ManageMetaModalProps> = ({ visible, onClose }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'groups' | 'tags'>('groups');
  const [newGroupName, setNewGroupName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number, name: string, type: 'group' | 'tag' } | null>(null);

  // Fetch Metadata
  const { data: metaData } = useQuery({
    queryKey: ['crm-meta'],
    queryFn: () => getCRMMeta(accessToken!),
    enabled: !!accessToken && visible,
  });

  // Mutations
  const addGroupMutation = useMutation({
    mutationFn: (name: string) => addCRMGroup(accessToken!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-meta'] });
      setNewGroupName('');
    },
    onError: (error: any) => {
      console.log('Add group error:', error);
      Alert.alert('Error', error.message || 'Failed to add group. Please try again.');
    }
  });

  const addTagMutation = useMutation({
    mutationFn: ({ name, color }: { name: string, color: string }) => addCRMTag(accessToken!, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-meta'] });
      setNewTagName('');
    },
    onError: (error: any) => {
      console.log('Add tag error:', error);
      Alert.alert('Error', error.message || 'Failed to add tag. Please try again.');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) => deleteCRMGroup(accessToken!, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-meta'] });
    },
    onError: (error: any) => {
      console.log('Delete group error:', error);
      Alert.alert('Error', error.message || 'Failed to delete group. Please try again.');
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: (tagId: number) => deleteCRMTag(accessToken!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-meta'] });
    },
    onError: (error: any) => {
      console.log('Delete tag error:', error);
      Alert.alert('Error', error.message || 'Failed to delete tag. Please try again.');
    }
  });

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addGroupMutation.mutate(newGroupName.trim());
    }
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      addTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
        <View style={styles.modalContent}>
          <View style={styles.premiumModalHeader}>
            <View>
              <Text style={styles.premiumModalTitle}>Groups & tags</Text>
              <Text style={styles.premiumModalSubtitle}>Manage categories, segments and labels</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.premiumCloseBtn}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.premiumModalBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode='on-drag'
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Management Tabs */}
            <View style={styles.managementTabContainer}>
              <Pressable
                style={[styles.managementTab, activeTab === 'groups' && styles.managementTabActive]}
                onPress={() => setActiveTab('groups')}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={activeTab === 'groups' ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.managementTabText, activeTab === 'groups' && styles.managementTabTextActive]}>Groups</Text>
              </Pressable>
              <Pressable
                style={[styles.managementTab, activeTab === 'tags' && styles.managementTabActive]}
                onPress={() => setActiveTab('tags')}>
                <MaterialCommunityIcons
                  name="tag-multiple"
                  size={20}
                  color={activeTab === 'tags' ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.managementTabText, activeTab === 'tags' && styles.managementTabTextActive]}>Tags</Text>
              </Pressable>
            </View>

            {activeTab === 'groups' ? (
              <View style={styles.managementSection}>
                <View style={styles.managementInputRow}>
                  <TextInput
                    style={styles.managementInput}
                    placeholder="New group name"
                    placeholderTextColor="#94A3B8"
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                  />
                  <Pressable
                    style={[styles.managementAddBtn, (!newGroupName.trim() || addGroupMutation.isPending) && styles.managementAddBtnDisabled]}
                    onPress={handleAddGroup}
                    disabled={!newGroupName.trim() || addGroupMutation.isPending}>
                    <LinearGradient
                      colors={newGroupName.trim() ? ['#0B213E', '#0a2341'] : ['#334155', '#334155']}
                      style={styles.managementAddBtnGradient}>
                      {addGroupMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.managementAddBtnText}>Add</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                <View style={styles.managementList}>
                  {metaData?.groups?.map((group) => (
                    <View key={`api-g-${group.id}`} style={styles.managementItem}>
                      <Text style={styles.managementItemText}>{group.name}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          setDeleteTarget({ id: group.id, name: group.name, type: 'group' });
                          setDeleteModalVisible(true);
                        }}>
                        {deleteGroupMutation.isPending && deleteGroupMutation.variables === group.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <MaterialCommunityIcons name="close-circle-outline" size={20} color="#EF4444" />
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.managementSection}>
                <View style={styles.managementInputRow}>
                  <TextInput
                    style={[styles.managementInput, { flex: 1 }]}
                    placeholder="Tag name"
                    placeholderTextColor="#94A3B8"
                    value={newTagName}
                    onChangeText={setNewTagName}
                  />
                  <View style={styles.colorPreviewContainer}>
                    <Pressable
                      style={[styles.colorPreviewBox, { backgroundColor: newTagColor }]}
                      onPress={() => {
                        const nextColor = PRESET_COLORS[(PRESET_COLORS.indexOf(newTagColor) + 1) % PRESET_COLORS.length];
                        setNewTagColor(nextColor);
                      }}
                    />
                  </View>
                  <Pressable
                    style={[styles.managementAddBtn, (!newTagName.trim() || addTagMutation.isPending) && styles.managementAddBtnDisabled]}
                    onPress={handleAddTag}
                    disabled={!newTagName.trim() || addTagMutation.isPending}>
                    <LinearGradient
                      colors={newTagName.trim() ? ['#0B213E', '#0a2341'] : ['#334155', '#334155']}
                      style={styles.managementAddBtnGradient}>
                      {addTagMutation.isPending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.managementAddBtnText}>Add</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                <View style={styles.managementList}>
                  {metaData?.tags?.map((tag) => (
                    <View key={`api-t-${tag.id}`} style={styles.managementItem}>
                      <View style={styles.itemWithColor}>
                        <View style={[styles.itemColorDot, { backgroundColor: tag.tag_color || '#F37021' }]} />
                        <Text style={styles.managementItemText}>{tag.name}</Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          setDeleteTarget({ id: tag.id, name: tag.name, type: 'tag' });
                          setDeleteModalVisible(true);
                        }}>
                        {deleteTagMutation.isPending && deleteTagMutation.variables === tag.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <MaterialCommunityIcons name="close-circle-outline" size={20} color="#EF4444" />
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Custom Delete Modal to prevent Android Uppercase */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Delete {deleteTarget?.type === 'group' ? 'Group' : 'Tag'}</Text>
            <Text style={styles.alertMessage}>Are you sure you want to delete {deleteTarget?.type === 'group' ? 'group' : 'tag'} "{deleteTarget?.name}"?</Text>
            <View style={styles.alertBtnRow}>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnCancel]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.alertBtnTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.alertBtn, styles.alertBtnConfirm]}
                onPress={() => {
                  if (deleteTarget?.type === 'group') {
                    deleteGroupMutation.mutate(deleteTarget.id);
                  } else if (deleteTarget?.type === 'tag') {
                    deleteTagMutation.mutate(deleteTarget.id);
                  }
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.alertBtnTextConfirm}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  fullPageModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  premiumModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: colors.cardBackground,
  },
  premiumModalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },
  premiumModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  premiumCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumModalBody: {
    flex: 1,
    paddingHorizontal: 24,
  },
  managementTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    padding: 6,
    borderRadius: 16,
    marginBottom: 32,
  },
  managementTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  managementTabActive: {
    backgroundColor: '#0B213E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  managementTabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  managementTabTextActive: {
    color: '#FFFFFF',
  },
  managementSection: {
    flex: 1,
  },
  managementInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  managementInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  managementAddBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0a2341',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  managementAddBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managementAddBtnDisabled: {
    opacity: 0.4,
  },
  managementAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  colorPreviewContainer: {
    padding: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  colorPreviewBox: {
    width: 40,
    height: 32,
    borderRadius: 10,
  },
  managementList: {
    gap: 14,
  },
  managementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  managementItemText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  itemWithColor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  alertBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  alertBtnCancel: {
    backgroundColor: 'transparent',
  },
  alertBtnTextCancel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  alertBtnConfirm: {
    backgroundColor: '#FEF2F2',
  },
  alertBtnTextConfirm: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
});
