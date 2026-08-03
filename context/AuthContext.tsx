import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  setupNotificationListeners,
  syncDeviceTokenWithBackend,
} from '@/services/notificationService';

type AuthContextType = {
  accessToken: string | null;
  userRole: string | null;
  isCompleteProfile: boolean;
  isLoading: boolean;
  login: (token: string, role?: string, isComplete?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCompleteProfile, setIsCompleteProfile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  // Track tokens we've already synced to avoid duplicate requests
  const syncedTokenRef = useRef<string | null>(null);

  // Setup notification deep-link listeners once on mount
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    loadStorageData();
  }, []);

  // Whenever we get a valid accessToken (login or session restore),
  // request notification permission and sync device token with backend.
  useEffect(() => {
    if (accessToken && accessToken !== syncedTokenRef.current) {
      syncedTokenRef.current = accessToken;
      syncDeviceTokenWithBackend(accessToken).catch(() => {});
    }
  }, [accessToken]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[1] === 'solo-onboarding' || segments[1] === 'team-onboarding';
    const atRoot = !segments[0];

    if (accessToken) {
      if ((inAuthGroup && !inOnboarding) || atRoot) {
        // Note: Specific redirection logic is handled in the Login screen after API call
        // This is a safety fallback for app restarts
        let dashboardPath = (userRole === 'agency_user' || userRole === 'agency') ? '/(main)/agency' : '/(main)/dashboard';

        // If profile is not complete, redirect back to onboarding
        if (!isCompleteProfile) {
          dashboardPath = (userRole === 'agency_user' || userRole === 'agency')
            ? '/(auth)/team-onboarding?isCompleting=true'
            : '/(auth)/solo-onboarding?isCompleting=true';
        }

        router.replace(dashboardPath as any);
      }
    } else {
      if (!inAuthGroup) {
        // Redirect to login if not logged in and not at auth pages
        router.replace('/login');
      }
    }
  }, [accessToken, userRole, isCompleteProfile, segments, isLoading]);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedRole = await AsyncStorage.getItem('user_role');
      const storedComplete = await AsyncStorage.getItem('is_complete_profile');

      if (storedToken) {
        setAccessToken(storedToken);
      }
      if (storedRole) {
        setUserRole(storedRole);
      }
      if (storedComplete !== null) {
        setIsCompleteProfile(storedComplete === 'true');
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, role?: string, isComplete?: boolean) => {
    setAccessToken(token);
    if (role) setUserRole(role);
    if (isComplete !== undefined) setIsCompleteProfile(isComplete);

    await AsyncStorage.setItem('access_token', token);
    if (role) await AsyncStorage.setItem('user_role', role);
    if (isComplete !== undefined) {
      await AsyncStorage.setItem('is_complete_profile', isComplete ? 'true' : 'false');
    }
  };

  const logout = async () => {
    syncedTokenRef.current = null;
    setAccessToken(null);
    setUserRole(null);
    setIsCompleteProfile(false);
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user_role');
    await AsyncStorage.removeItem('is_complete_profile');
    // Note: Redirection will be handled automatically by the protector effect 
    // when it notices accessToken is null and user is in a protected route
  };

  return (
    <AuthContext.Provider value={{ accessToken, userRole, isCompleteProfile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
