import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MaintenanceBannerProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

const AUTO_RETRY_SECONDS = 30;

export function MaintenanceBanner({
  message = "We're performing scheduled maintenance. Back shortly!",
  onRetry,
  isRetrying = false,
}: MaintenanceBannerProps) {
  const [countdown, setCountdown] = useState(AUTO_RETRY_SECONDS);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (isRetrying) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 700, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRetrying, spinAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    setCountdown(AUTO_RETRY_SECONDS);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRetry();
          return AUTO_RETRY_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onRetry]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0D2037', '#0B1D2F', '#071520']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <MaterialCommunityIcons name="wrench-clock" size={48} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Text style={styles.title}>System Maintenance</Text>
      <Text style={styles.subtitle}>{message}</Text>

      <View style={styles.dotsRow}>
        {(['API', 'SERVER', 'DB'] as const).map((label, i) => (
          <View key={label} style={styles.dotItem}>
            <View style={[styles.dot, i === 0 && styles.dotOffline]} />
            <Text style={styles.dotLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.countdownBox}>
        <MaterialCommunityIcons name="timer-outline" size={14} color="rgba(190,220,240,0.6)" />
        <Text style={styles.countdownText}>Auto-retry in {countdown}s</Text>
      </View>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
        disabled={isRetrying}
      >
        <LinearGradient
          colors={['#0BA0B2', '#0B7E8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.retryGradient}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons
              name={isRetrying ? 'loading' : 'refresh'}
              size={18}
              color="#fff"
            />
          </Animated.View>
          <Text style={styles.retryText}>{isRetrying ? 'Retrying\u2026' : 'Retry Now'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        If this persists, please contact{'\n'}
        <Text style={styles.footerLink}>support@zien.ai</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(245,158,11,0.10)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(11,160,178,0.10)',
  },
  iconWrapper: {
    marginBottom: 28,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(190,220,240,0.75)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  dotItem: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(190,220,240,0.55)',
    letterSpacing: 0.5,
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 12,
    color: 'rgba(190,220,240,0.65)',
    fontWeight: '600',
  },
  retryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0BA0B2',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 24,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerNote: {
    fontSize: 12,
    color: 'rgba(190,220,240,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: '#0BA0B2',
    fontWeight: '700',
  },
});
