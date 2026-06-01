import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type SearchBarProps = {
  placeholder?: string;
};

function SearchBarComponent({
  placeholder = 'Ask anything about your pipeline…',
}: SearchBarProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push('/(main)/chat-modal')}
    >
      {/* Left: AI Spark badge */}
      <LinearGradient
        colors={['#0a2341', '#1B5E9A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sparkBadge}
      >
        <MaterialCommunityIcons name="star-four-points" size={14} color="#fff" />
      </LinearGradient>

      {/* Placeholder text */}
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>

      {/* Right: Mic */}
      <Pressable
        style={styles.micWrap}
        onPress={() => router.push({ pathname: '/(main)/chat-modal', params: { startVoice: 'true' } })}
      >
        <LinearGradient
          colors={['#0a2341', '#1B5E9A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.micGradient}
        >
          <MaterialCommunityIcons name="microphone" size={16} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

export const SearchBar = memo(SearchBarComponent);

function getStyles(colors: any) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    sparkBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholder: {
      flex: 1,
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    micWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    micGradient: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
