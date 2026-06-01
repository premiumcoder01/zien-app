import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthCard, AuthLogoBrand, AuthScreenBackground, AuthSubtitle, AuthTitle } from '@/components/auth';
import GradientButton from '@/components/ui/GradientButton';
import LabeledInput from '@/components/ui/labeled-input';
import OutlineButton from '@/components/ui/OutlineButton';
import PasswordInput from '@/components/ui/PasswordInput';

import { useAppTheme } from '@/context/ThemeContext';
import { forgotPassword, resetPassword } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: OTP + Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [expiryTimer, setExpiryTimer] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0 || expiryTimer > 0) {
      interval = setInterval(() => {
        if (resendTimer > 0) setResendTimer((prev) => prev - 1);
        if (expiryTimer > 0) setExpiryTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, expiryTimer]);

  const handleSendOtp = async () => {
    setEmailError('');
    if (!email) {
      setEmailError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotPassword({ email });
      if (response.otp_required) {
        setStep(2);
        setResendTimer(10);
        setExpiryTimer(600); // 10 minutes
      }
    } catch (error: any) {
      if (error.message.toLowerCase().includes('email')) {
        setEmailError(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    try {
      await forgotPassword({ email });
      setResendTimer(10);
      setExpiryTimer(600);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleReset = async () => {
    setOtpError('');
    setPasswordError('');
    setConfirmPasswordError('');

    let hasError = false;
    if (!otp) {
      setOtpError('OTP is required');
      hasError = true;
    }
    if (!newPassword) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      const response = await resetPassword({
        email,
        otp,
        new_password: newPassword,
      });

      if (response.reset) {
        Alert.alert('Success', 'Your password has been reset successfully.', [
          { text: 'Login Now', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    } catch (error: any) {
      const msg = error.message.toLowerCase();
      if (msg.includes('otp')) {
        setOtpError(error.message);
      } else if (msg.includes('password')) {
        setPasswordError(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <AuthCard>
            <AuthLogoBrand brandLabel="ZIEN" />

            {step === 1 ? (
              <>
                <AuthTitle>Forgot Password</AuthTitle>
                <AuthSubtitle center>Enter your email and we will send you an OTP.</AuthSubtitle>

                <View style={styles.form}>
                  <LabeledInput
                    label="Email Address"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                    }}
                    error={emailError}
                    required
                  />
                </View>

                <View style={styles.actionRow}>
                  <GradientButton title="Send OTP" style={styles.flexButton} onPress={handleSendOtp} isLoading={isLoading} />
                  <OutlineButton title="Back to Login" style={styles.flexButton} onPress={() => router.push('/(auth)/login')} disabled={isLoading} />
                </View>
              </>
            ) : (
              <>
                <AuthTitle>Reset Password</AuthTitle>
                <AuthSubtitle center>Enter OTP and set your new password</AuthSubtitle>

                <View style={styles.form}>
                  <LabeledInput
                    label="Email Address"
                    value={email}
                    editable={false}
                    containerStyle={styles.disabledInput}
                  />

                  <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.infoText}>
                      OTP sent to <Text style={styles.bold}>{email}</Text>
                    </Text>
                  </View>

                  <LabeledInput
                    label="OTP"
                    placeholder="Enter 4-digit code"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (otpError) setOtpError('');
                    }}
                    error={otpError}
                    required
                  />

                  {expiryTimer > 0 && (
                    <Text style={styles.expiryText}>
                      Code expires in <Text style={styles.bold}>{formatTime(expiryTimer)}</Text>
                    </Text>
                  )}

                  <PasswordInput
                    label="New Password"
                    placeholder="********"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (passwordError) setPasswordError('');
                    }}
                    error={passwordError}
                    required
                  />

                  <PasswordInput
                    label="Confirm Password"
                    placeholder="********"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    error={confirmPasswordError}
                    required
                  />
                </View>

                <View style={styles.actionRow}>
                  <GradientButton title="Reset Password" style={styles.flexButton} onPress={handleReset} isLoading={isLoading} />
                </View>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Didn't receive OTP? </Text>
                  <Pressable
                    onPress={handleResendOtp}
                    disabled={isResending || resendTimer > 0}
                    style={({ pressed }) => [
                      styles.resendButton,
                      (isResending || resendTimer > 0) && styles.resendButtonDisabled,
                      pressed && !isResending && resendTimer === 0 && { opacity: 0.7 }
                    ]}
                  >
                    {isResending ? (
                      <ActivityIndicator size="small" color={colors.accent || '#0a2341'} />
                    ) : (
                      <Text style={[styles.resendLink, resendTimer > 0 && styles.disabledLink]}>
                        Resend {resendTimer > 0 ? `(${resendTimer}s)` : ''}
                      </Text>
                    )}
                  </Pressable>
                </View>

                <Pressable onPress={() => setStep(1)} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </Pressable>
              </>
            )}
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreenBackground>
  );
}

function getStyles(colors: any, theme: string) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      padding: colors.screenPadding,
      justifyContent: 'center',
    },
    form: {
      alignSelf: 'stretch',
      gap: 16,
      marginTop: 20,
    },
    disabledInput: {
      opacity: 0.7,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      padding: 12,
      borderRadius: 12,
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    bold: {
      fontWeight: '700',
    },
    expiryText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: -8,
      marginBottom: 4,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    flexButton: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    resendButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.accent ? `${colors.accent}15` : 'rgba(11, 160, 178, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    resendButtonDisabled: {
      backgroundColor: 'transparent',
    },
    resendLink: {
      fontSize: 13,
      color: colors.accent || '#0a2341',
      fontWeight: '800',
    },
    disabledLink: {
      color: colors.textSecondary,
      opacity: 0.7,
      fontWeight: '600',
    },
    backLink: {
      marginTop: 16,
      alignItems: 'center',
    },
    backLinkText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    }
  });
}
