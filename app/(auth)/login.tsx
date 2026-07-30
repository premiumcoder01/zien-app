import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text as RNText, ScrollView, StyleSheet, View, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
import { loginAgent, loginWithApple, loginWithGoogle, loginWithMicrosoft } from '@/services/authService';

export default function LoginScreen() {
  const { theme, colors } = useAppTheme();
  const { login } = useAuth();
  const styles = getStyles(colors);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [sentToEmail, setSentToEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

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
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        console.log('[AppleAuth] isAvailableAsync resolved to:', available);
        setIsAppleAvailable(available);
      })
      .catch((err) => {
        console.error('[AppleAuth] isAvailableAsync error:', err);
        setIsAppleAvailable(false);
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

  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[AppleAuth] credential received:', JSON.stringify({
        user: credential.user,
        email: credential.email,
        hasFullName: !!credential.fullName,
        hasIdentityToken: !!credential.identityToken,
        hasAuthCode: !!credential.authorizationCode,
      }));

      const appleId = credential.user;
      if (!appleId) {
        throw new Error('No user identifier received from Apple.');
      }

      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple.');
      }

      const firstName = credential.fullName?.givenName || null;
      const lastName = credential.fullName?.familyName || null;
      const appleEmail = credential.email || null;

      console.log('[AppleAuth] Sending to backend — apple_id:', appleId, '| email:', appleEmail, '| name:', firstName, lastName);

      const backendResponse = await loginWithApple({
        identity_token: identityToken,
        apple_id: appleId,
        email: appleEmail,
        first_name: firstName,
        last_name: lastName,
        platform: 'ios',
      });

      console.log('[AppleAuth] Backend response received:', JSON.stringify({
        hasAccessToken: !!backendResponse.access_token,
        role: backendResponse.role,
        complete_profile: backendResponse.complete_profile,
      }));

      await login(
        backendResponse.access_token,
        backendResponse.role,
        backendResponse.complete_profile
      );
    } catch (error: any) {
      // Log full error details to console for debugging
      console.error('[AppleAuth] Full error object:', JSON.stringify({
        code: error.code,
        message: error.message,
        name: error.name,
        domain: error.domain,
        userInfo: error.userInfo,
      }));

      if (error.code === 'ERR_CANCELED') {
        // User cancelled — silent, do nothing
        console.log('[AppleAuth] User cancelled Apple Sign-in.');
      } else if (error.code === 'ERR_REQUEST_NOT_HANDLED') {
        Alert.alert(
          'Apple Sign-In Error',
          `Sign In with Apple is not configured on this device.\n\nError: ${error.code}`
        );
      } else if (error.code === 'ERR_REQUEST_UNKNOWN') {
        Alert.alert(
          'Apple Sign-In Error',
          `Unknown Apple Sign-In error.\n\nError: ${error.code}\n${error.message}`
        );
      } else {
        Alert.alert(
          'Apple Sign-in Failed',
          `${error.message || 'Unknown error occurred.'}\n\nCode: ${error.code || 'N/A'}`
        );
      }
    } finally {
      setIsAppleLoading(false);
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
      const response = await loginAgent({
        email,
        password,
        platform: Platform.OS as 'ios' | 'android',
      });
      console.log('Login Success:', response);

      if (response.activation_email_sent) {
        setActivationMessage(response.message || 'Subscription is not active. A fresh activation link has been sent to your email!');
        setSentToEmail(email);
        setShowActivationModal(true);
        return;
      }

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
              {Platform.OS === 'ios' && (
                <Pressable
                  style={[
                    styles.appleSocialButton,
                    (isAppleLoading || isGoogleLoading || isMicrosoftLoading || isLoading) && { opacity: 0.65 }
                  ]}
                  disabled={isAppleLoading || isGoogleLoading || isMicrosoftLoading || isLoading}
                  onPress={handleAppleLogin}
                >
                  <MaterialCommunityIcons
                    name="apple"
                    size={18}
                    color={colors.socialButtonText}
                    style={styles.appleIcon}
                  />
                  <RNText style={styles.appleSocialText}>
                    {isAppleLoading ? '...' : 'Apple'}
                  </RNText>
                </Pressable>
              )}
              <SocialButton
                label="Google"
                icon={require('@/assets/appImages/google.png')}
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading || isMicrosoftLoading || isAppleLoading}
              />
              <SocialButton
                label="Microsoft"
                icon={require('@/assets/appImages/microsoft.png')}
                onPress={() => msPromptAsync()}
                disabled={!msRequest || isMicrosoftLoading || isGoogleLoading || isLoading || isAppleLoading}
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
      <Modal visible={showActivationModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.activationCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.activationGradient}
            >
              {/* Circular Mail Icon Header */}
              <View style={styles.iconContainerOuter}>
                <LinearGradient
                  colors={['#00A7B5', '#0B2341']}
                  style={styles.iconContainerInner}
                >
                  <MaterialCommunityIcons name="email-fast-outline" size={38} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Title & Subtitle */}
              <RNText style={styles.activationTitle}>Verify Your Email</RNText>
              <RNText style={styles.activationSubtitle}>We've sent an activation link to:</RNText>
              
              {/* Highlighted Email Badge */}
              <View style={styles.emailBadge}>
                <RNText style={styles.emailBadgeText}>{sentToEmail.toLowerCase()}</RNText>
              </View>

              <RNText style={styles.activationDescription}>
                {activationMessage}
              </RNText>

              {/* Steps Container */}
              <View style={styles.stepsContainer}>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <RNText style={styles.stepBadgeText}>1</RNText>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <RNText style={styles.stepTitle}>Open Email Inbox</RNText>
                    <RNText style={styles.stepDesc}>Find the activation email from Zien.</RNText>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <RNText style={styles.stepBadgeText}>2</RNText>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <RNText style={styles.stepTitle}>Activate Plan & Pay</RNText>
                    <RNText style={styles.stepDesc}>Click the link, select a plan and subscribe.</RNText>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <RNText style={styles.stepBadgeText}>3</RNText>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <RNText style={styles.stepTitle}>Return and Log In</RNText>
                    <RNText style={styles.stepDesc}>Sign in with your Zien credentials.</RNText>
                  </View>
                </View>
              </View>

              {/* Got It Button */}
              <GradientButton
                title="Got it!"
                style={styles.activationBtn}
                onPress={() => {
                  setShowActivationModal(false);
                }}
              />
            </LinearGradient>
          </View>
        </View>
      </Modal>

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
    appleSocialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.socialButtonBackground,
      borderWidth: 1,
      borderColor: colors.socialButtonBorder,
      paddingVertical: 10,
      borderRadius: colors.inputBorderRadius || 8,
    },
    appleIcon: {
      marginRight: 2,
    },
    appleSocialText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.socialButtonText,
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    activationCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 15,
      elevation: 10,
    },
    activationGradient: {
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    iconContainerOuter: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(0, 229, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconContainerInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#00E5FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    activationTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary || '#0F172A',
      marginBottom: 8,
      textAlign: 'center',
    },
    activationSubtitle: {
      fontSize: 14,
      color: colors.textSecondary || '#475569',
      marginBottom: 8,
      textAlign: 'center',
    },
    emailBadge: {
      backgroundColor: 'rgba(0, 167, 181, 0.08)',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: 'rgba(0, 167, 181, 0.2)',
      marginBottom: 16,
    },
    emailBadgeText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.accent || '#00A7B5',
    },
    activationDescription: {
      fontSize: 14,
      color: colors.textSecondary || '#334155',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      paddingHorizontal: 10,
    },
    stepsContainer: {
      width: '100%',
      gap: 12,
      marginBottom: 24,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground || '#F8FAFC',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderLight || '#E2E8F0',
    },
    stepBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent || '#00A7B5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    stepBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    stepTextContainer: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary || '#0F172A',
      marginBottom: 2,
    },
    stepDesc: {
      fontSize: 12,
      color: colors.textSecondary || '#64748B',
    },
    activationBtn: {
      width: '100%',
      height: 48,
      borderRadius: 24,
    },
  });
}
