import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImagePickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (source: 'gallery' | 'camera') => void;
  title: string;
}

export function ImagePickerModal({ isVisible, onClose, onSelect, title }: ImagePickerModalProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer, 
          { 
            backgroundColor: colors.cardBackground,
            paddingBottom: Math.max(insets.bottom, 16) + 24
          }
        ]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose source</Text>

          <View style={styles.buttonStack}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => onSelect('gallery')}>
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Gallery</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => onSelect('camera')}>
              <MaterialCommunityIcons name="camera-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Camera</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  buttonStack: {
    gap: 12,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export { ImagePickerModal as default };
