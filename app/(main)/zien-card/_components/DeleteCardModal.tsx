import { useAppTheme } from '@/context/ThemeContext';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface DeleteCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteCardModal({ isVisible, onClose, onDelete, isDeleting }: DeleteCardModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Delete Digital Card</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Are you sure you want to delete this profile? This action cannot be undone.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, { backgroundColor: 'rgba(0,0,0,0.05)' }]}
              onPress={onClose}
              disabled={isDeleting}>
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[styles.button, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={onDelete}
              disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: '#EF4444' }]}>Delete</Text>
              )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export { DeleteCardModal as default };
