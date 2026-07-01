import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';

export function NetworkStatusAlert() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [status, setStatus] = useState<'idle' | 'offline' | 'restored'>('idle');
  const previousConnected = useRef<boolean | null>(null);
  
  // Animation value for sliding in/out (translateY)
  const slideAnim = useRef(new Animated.Value(-120)).current;
  // Animation value for opacity
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track slide state to avoid redundant animation triggers
  const isVisible = useRef(false);

  const slideIn = () => {
    if (isVisible.current) return;
    isVisible.current = true;
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const slideOut = (callback?: () => void) => {
    if (!isVisible.current) return;
    isVisible.current = false;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  useEffect(() => {
    const currentConnected = netInfo.isConnected;
    const prevConnected = previousConnected.current;

    if (currentConnected === null) {
      return;
    }

    if (prevConnected === null) {
      // First check on mount
      if (currentConnected === false) {
        setStatus('offline');
        slideIn();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      // Transition from online to offline
      if (prevConnected === true && currentConnected === false) {
        setStatus('offline');
        slideIn();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Transition from offline to online
      else if (prevConnected === false && currentConnected === true) {
        setStatus('restored');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Hold the restored banner for 2.5 seconds then slide out
        const timer = setTimeout(() => {
          slideOut(() => {
            setStatus('idle');
          });
        }, 2500);

        return () => clearTimeout(timer);
      }
    }

    previousConnected.current = currentConnected;
  }, [netInfo.isConnected]);

  if (status === 'idle') {
    return null;
  }

  const isOffline = status === 'offline';
  const bannerBg = isOffline ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  const bannerBorder = isOffline ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)';
  const message = isOffline ? 'No Internet Connection' : 'Back Online!';
  const iconName = isOffline ? 'wifi-off' : 'wifi';

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: bannerBg,
            borderColor: bannerBorder,
          },
        ]}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons name={iconName} size={20} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.text}>{message}</Text>
        </View>
        
        {isOffline && (
          <Pressable
            onPress={() => slideOut()}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    width: '100%',
    maxWidth: 400,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: 2,
  },
});
