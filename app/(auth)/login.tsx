import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const microsoftDiscovery = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  AuthFooterLink,
  AuthFooterText,
  AuthLogoBrand,
  AuthScreenBackground,
  AuthSubtitle,
  AuthTitle,
  SocialButton
} from '@/components/auth';
import GradientButton from '@/components/ui/GradientButton';
import LabeledInput from '@/components/ui/labeled-input';
import PasswordInput from '@/components/ui/PasswordInput';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { loginAgent, loginWithGoogle, loginWithMicrosoft } from '@/services/authService';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const { login } = useAuth();
  const styles = getStyles(colors);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'zien',
    path: 'auth',
  });

  // Temporarily log the redirect URI to help the user configure Azure
  console.log('===== AZURE REDIRECT URI TO CONFIGURE =====');
  console.log(redirectUri);
  console.log('===========================================');

  const [msRequest, msResponse, msPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: '1b8a1f17-9585-4cc1-bfdd-d817aea7248b',
      scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
      redirectUri,
    },
    microsoftDiscovery
  );

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '643931044813-00aqqtoqcpqgn06c43vet55dp00sjbhp.apps.googleusercontent.com',
      iosClientId: '643931044813-tfbh0a8f1q69g0vthql6pl1r4vpf7l3u.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const processedMsCode = useRef<string | null>(null);

  useEffect(() => {
    if (msResponse?.type === 'success') {
      const { code } = msResponse.params;
      // Prevent exchanging the same code twice (happens in React Strict Mode or hot reloads)
      if (processedMsCode.current !== code) {
        processedMsCode.current = code;
        handleMicrosoftCallback(code);
      }
    } else if (msResponse?.type === 'error') {
      Alert.alert('Microsoft Sign-in Failed', msResponse.error?.message || 'Unknown error');
    }
  }, [msResponse]);

  const handleMicrosoftCallback = async (code: string) => {
    setIsMicrosoftLoading(true);
    try {
      let tokenResult;
      try {
        tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: '1b8a1f17-9585-4cc1-bfdd-d817aea7248b',
            code,
            redirectUri: AuthSession.makeRedirectUri({ scheme: 'zien', path: 'auth' }),
            extraParams: {
              code_verifier: msRequest?.codeVerifier || '',
            },
          },
          microsoftDiscovery
        );
      } catch (e: any) {
        console.error('Exchange Code Error:', e);
        throw new Error('Microsoft Token Error: ' + e.message);
      }

      const token = tokenResult.accessToken || tokenResult.idToken;

      console.log(token, "ffjjfjfjfjfjfj")

      if (!token) {
        throw new Error('Failed to obtain token from Microsoft.');
      }

      console.log('Microsoft Sign-in Success. Token obtained:', token.substring(0, 20) + '...');

      // Send the token to the backend
      let backendResponse;
      try {
        backendResponse = await loginWithMicrosoft({ token });
      } catch (e: any) {
        console.error('Backend API Error:', e);
        throw new Error('Backend API Error: ' + e.message);
      }

      // Complete sign-in in AuthContext
      await login(
        backendResponse.access_token,
        backendResponse.role,
        backendResponse.complete_profile
      );
    } catch (error: any) {
      console.error('Microsoft Sign-in Error:', error);
      Alert.alert('Microsoft Sign-in Failed', error.message || 'Unknown error occurred.');
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      console.log(response, "lplplp")

      // Fetch tokens (including accessToken starting with ya29.)
      const tokens = await GoogleSignin.getTokens().catch(() => null);
      const token = tokens?.accessToken || response.data?.idToken;

      if (!token) {
        throw new Error('Failed to obtain Google authentication token.');
      }

      console.log('Google Sign-in Success. Token obtained.');

      // Send the token to the backend
      const backendResponse = await loginWithGoogle({ token });

      // Complete sign-in in AuthContext
      await login(
        backendResponse.access_token,
        backendResponse.role,
        backendResponse.complete_profile
      );

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled Google Sign-in.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-in already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services are not available on this device.');
      } else {
        console.error('Google Sign-in Error:', error);
        Alert.alert('Google Sign-in Failed', error.message || 'Unknown error occurred.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');

    let hasError = false;
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      const response = await loginAgent({ email, password });
      console.log('Login Success:', response);

      const { access_token, role, complete_profile } = response;

      // Store token, role and profile status in context & storage
      // Redirection will be handled automatically by AuthContext's protector effect
      await login(access_token, role, complete_profile);
    } catch (error: any) {
      console.error('Login Error:', error.message);
      // If it's a general login error, we might still want an alert or a general error message
      // But the user specifically asked to avoid alerts for mandatory fields
      if (error.message.toLowerCase().includes('email')) {
        setEmailError(error.message);
      } else if (error.message.toLowerCase().includes('password')) {
        setPasswordError(error.message);
      } else {
        Alert.alert('Login Failed', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <AuthCard>
            <AuthLogoBrand brandLabel="ZIEN" />
            <AuthTitle>Welcome Back</AuthTitle>
            <AuthSubtitle>Sign in to your Zien workspace</AuthSubtitle>

            <View style={styles.form}>
              <LabeledInput
                label="Email Address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                required
              />
              <View style={styles.passwordWrapper}>
                <PasswordInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  error={passwordError}
                  required
                />
                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password')}
                  style={styles.forgotPasswordContainer}
                >
                  <RNText style={styles.forgotPasswordText}>Forgot Password?</RNText>
                </Pressable>
              </View>
            </View>

            <View style={styles.actionRow}>
              <GradientButton
                title="Sign In"
                style={styles.agentButton}
                onPress={handleLogin}
                isLoading={isLoading}
              />
            </View>

            <AuthDivider />

            <View style={styles.socialRow}>
              <SocialButton
                label="Google"
                icon={require('@/assets/appImages/google.png')}
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading || isMicrosoftLoading}
              />
              <SocialButton
                label="Microsoft"
                icon={require('@/assets/appImages/microsoft.png')}
                onPress={() => msPromptAsync()}
                disabled={!msRequest || isMicrosoftLoading || isGoogleLoading || isLoading}
              />
            </View>

            {/* <SSOButton onPress={() => Alert.alert('Coming soon')} /> */}

            <AuthFooter>
              <AuthFooterText>
                Don't have an account? <AuthFooterLink onPress={() => router.push('/(auth)/register')}>Create Account</AuthFooterLink>
              </AuthFooterText>
              <AuthFooterText>
                Are you a Brokerage? <AuthFooterLink onPress={() => router.push('/(auth)/enterprise-contact')}>Contact Enterprise</AuthFooterLink>
              </AuthFooterText>
            </AuthFooter>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreenBackground>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      padding: colors.screenPadding,
      justifyContent: 'center',
    },
    form: {
      alignSelf: 'stretch',
      gap: 12,
    },
    passwordWrapper: {
      gap: 6,
    },
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
    },
    forgotPasswordText: {
      fontSize: 13,
      color: colors.link,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
      alignItems: 'stretch',
    },
    agentButton: {
      flex: 1,
    },
    joinTeamButton: {
      flex: 0,
      minWidth: 100,
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 14,
    },
  });
}
