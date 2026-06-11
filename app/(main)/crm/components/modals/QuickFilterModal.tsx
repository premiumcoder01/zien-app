import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface QuickFilterModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'group' | 'status' | 'tag' | null;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const QuickFilterModal: React.FC<QuickFilterModalProps> = ({
  visible,
  onClose,
  type,
  options,
  selectedValue,
  onSelect,
}) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const getTitle = () => {
    switch (type) {
      case 'group': return 'Select Group';
      case 'status': return 'Select Status';
      case 'tag': return 'Select Tag';
      default: return 'Select Option';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'group': return 'Filter contacts by their assigned segments';
      case 'status': return 'Filter by lead activity and retention state';
      case 'tag': return 'Quick filter using custom labels';
      default: return 'Browse and select an option';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.fullPageModal, { paddingTop: insets.top }]}>
        <View style={styles.modalContent}>
          {/* Premium Header */}
          <View style={styles.premiumHeader}>
            <View>
              <Text style={styles.premiumTitle}>{getTitle()}</Text>
              <Text style={styles.premiumSubtitle}>{getSubtitle()}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.premiumCloseBtn} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            {/* Search Filter Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={22} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${type || ''}`}
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus={false}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }}
            >
              <View style={styles.list}>
                {filteredOptions.length === 0 ? (
                  <View style={styles.noResults}>
                    <View style={styles.noResultsIconCircle}>
                      <MaterialCommunityIcons name="magnify-scan" size={40} color="#94A3B8" />
                    </View>
                    <Text style={styles.noResultsText}>No matches found for "{search}"</Text>
                  </View>
                ) : (
                  filteredOptions.map(opt => {
                    const isSelected = selectedValue === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[
                          styles.item,
                          isSelected && styles.itemActive
                        ]}
                        onPress={() => {
                          onSelect(opt);
                          onClose();
                        }}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            isSelected && styles.itemTextActive
                          ]}
                        >
                          {opt}
                        </Text>
                        {isSelected && (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={20}
                            color="#0a2341"
                          />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  fullPageModal: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  premiumCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.textPrimary,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemTextActive: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  noResultsIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
  },
});
