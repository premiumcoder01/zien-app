import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export type StatusItem = {
  label: string;
  verified: boolean;
};

type AccountStatusCardProps = {
  profileStrengthPercent?: number;
  items: StatusItem[];
};

function AccountStatusCardComponent({
  items,
}: AccountStatusCardProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>ACCOUNT STATUS</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.label} style={styles.listItem}>
            <MaterialCommunityIcons
              name={item.verified ? "check-circle" : "circle-outline"}
              size={18}
              color={item.verified ? (colors.accentTeal || '#00a7b5') : colors.textSecondary}
            />
            <Text style={styles.listLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const AccountStatusCard = memo(AccountStatusCardComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.cardShadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  strengthValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentTeal,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceIcon,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentTeal,
    borderRadius: 4,
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
}
