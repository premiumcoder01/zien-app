import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type LeadStatus = 'HOT' | 'WARM' | 'NEW' | 'COLD' | string;

type LeadRowProps = {
  id?: string;
  name: string;
  info: string;
  initial: string;
  status: LeadStatus;
  // Backward compatibility
  note?: string;
  badge?: string;
  color?: string;
  onPress?: () => void;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  HOT: { bg: '#FFF1F0', text: '#CF1322', icon: 'fire' },
  WARM: { bg: '#FFF7E6', text: '#D46B08', icon: 'thermometer-lines' },
  NEW: { bg: '#E6FFFB', text: '#08979C', icon: 'star-outline' },
  COLD: { bg: '#F0F5FF', text: '#1D39C4', icon: 'snowflake' },
  DEFAULT: { bg: '#F5F5F5', text: '#595959', icon: 'account-outline' },
};

const AVATAR_GRADIENTS = [
  ['#6B4EFF', '#9A7BFF'],
  ['#0a2341', '#26C6DA'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#FBBF24'],
  ['#EC4899', '#F472B6'],
];

function LeadRowComponent({
  name,
  info,
  initial,
  status,
  note,
  badge,
  color,
  onPress
}: LeadRowProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const displayInfo = info || note || 'No additional info';
  const displayStatus = status || badge || 'NEW';
  const displayInitial = initial || name?.[0]?.toUpperCase() || '?';

  const statusConfig = STATUS_CONFIG[displayStatus.toUpperCase()] || STATUS_CONFIG.DEFAULT;

  // Choose a gradient based on the name hash for consistency
  const gradientIndex = (name || '').length % AVATAR_GRADIENTS.length;
  const avatarGradient = color ? [color, color] : AVATAR_GRADIENTS[gradientIndex];


  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={true}
    >
      <View style={styles.mainContent}>
        {/* Avatar with Gradient */}
        <LinearGradient
          colors={avatarGradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{displayInitial}</Text>
        </LinearGradient>

        {/* Lead Details */}
        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <MaterialCommunityIcons name={statusConfig.icon} size={10} color={statusConfig.text} />
              <Text style={[styles.statusText, { color: statusConfig.text }]}>{displayStatus}</Text>
            </View>
          </View>
          <Text style={styles.info} numberOfLines={1}>{displayInfo}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      {/* <View style={styles.actions}>
        <Pressable 
          onPress={() => handleAction('message')}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <MaterialCommunityIcons name="chat-outline" size={18} color={colors.accentTeal} />
        </Pressable>
        <Pressable 
          onPress={() => handleAction('call')}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <MaterialCommunityIcons name="phone-outline" size={18} color={colors.accentTeal} />
        </Pressable>
      </View> */}
    </Pressable>
  );
}

export const LeadRow = memo(LeadRowComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowPressed: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
    },
    mainContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 3,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      maxWidth: '65%',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    info: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.accentTeal}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnPressed: {
      backgroundColor: `${colors.accentTeal}25`,
      transform: [{ scale: 0.95 }],
    },
  });
}
