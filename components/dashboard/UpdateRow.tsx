import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type UpdateRowProps = {
  icon: string;
  title: string;
  description: any;
  time: string;
  accentColor?: string;
};

function UpdateRowComponent({ icon, title, description, time, accentColor }: UpdateRowProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const activeAccentColor = accentColor ?? colors.accentTeal;

  const displayDescription = (() => {
    if (!description) return '';
    if (typeof description === 'object') {
      return description.addon_name || description.name || JSON.stringify(description);
    }
    return String(description);
  })();

  return (
    <View style={styles.row}>
      {/* Left timeline connector */}
      <View style={styles.timelineCol}>
        <View style={[styles.iconWrap, { backgroundColor: `${activeAccentColor}15`, borderColor: `${activeAccentColor}30` }]}>
          <MaterialCommunityIcons name={icon as any} size={16} color={activeAccentColor} />
        </View>
        <View style={[styles.connector, { backgroundColor: `${activeAccentColor}20` }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.desc}>{displayDescription}</Text>
      </View>
    </View>
  );
}

export const UpdateRow = memo(UpdateRowComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  timelineCol: {
    alignItems: 'center',
    width: 36,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  connector: {
    flex: 1,
    width: 1.5,
    marginTop: 4,
    minHeight: 12,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.05,
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inputPlaceholder,
    marginLeft: 8,
  },
  desc: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
}
