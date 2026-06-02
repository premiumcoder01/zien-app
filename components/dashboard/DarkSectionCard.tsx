import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SnapshotItem = {
  value: string;
  label: string;
  icon?: string;
};

type DarkSectionCardProps = {
  title: string;
  items: SnapshotItem[];
  buttonLabel: string;
  onButtonPress: () => void;
  style?: object;
};

const ITEM_ACCENTS = ['#0ECFDF', '#6B8EFF', '#5CDB95'];

function DarkSectionCardComponent({
  title,
  items,
  buttonLabel,
  onButtonPress,
  style,
}: DarkSectionCardProps) {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors);

  const isDark = theme === 'dark';

  return (
    <LinearGradient
      colors={isDark ? ['#0A1B29', '#081520', '#061018'] : ['#0D2F45', '#0B2D3E', '#0A2233']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {/* Subtle top-right glow blob */}
      <View style={styles.glowBlob} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleDot} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.row}>
        {items.map((item, i) => (
          <View key={item.label} style={styles.item}>
            <Text style={[styles.value, { color: ITEM_ACCENTS[i % ITEM_ACCENTS.length] }]}>
              {item.value}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* CTA Button */}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        onPress={onButtonPress}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#0ECFDF" />
      </Pressable>
    </LinearGradient>
  );
}

export const DarkSectionCard = memo(DarkSectionCardComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  glowBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(11,160,178,0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0ECFDF',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(11,160,178,0.15)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(11,160,178,0.25)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0ECFDF',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0ECFDF',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  item: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  label: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(190,220,240,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(11,160,178,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(11,160,178,0.25)',
  },
  buttonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0ECFDF',
    letterSpacing: 0.2,
  },
});
}
