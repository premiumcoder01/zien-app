import { PageHeader } from '@/components/ui';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = {
  id: string;
  text?: string;
  image?: string;
  isOutgoing: boolean;
  time: string;
};

const conversationSeed = {
  name: 'Jessica Miller',
  channel: 'WhatsApp',
  messages: [
    {
      id: 'msg-1',
      text: 'Hey, is the open house still on for Sunday?',
      isOutgoing: false,
      time: '2m ago',
    },
    {
      id: 'msg-2',
      text: "Absolutely! Looking forward to seeing you there. I'll send you a calendar invite right now.",
      isOutgoing: true,
      time: 'Just now',
    },
  ] as Message[],
};

export default function InboxChatScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // State for messages and input
  const [messages, setMessages] = useState<Message[]>(conversationSeed.messages);
  const [inputText, setInputText] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Dynamic keyboard listeners to adapt bottom safe area padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const conversation = useMemo(() => {
    if (typeof params.id === 'string') {
      const name = params.id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return {
        ...conversationSeed,
        name,
      };
    }
    return conversationSeed;
  }, [params.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Function to send a message
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      isOutgoing: true,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Trigger success haptic notification feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  // Launch photo library picker
  const handleSelectFromLibrary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    setIsSheetVisible(false);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need photo gallery permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        image: selectedImageUri,
        isOutgoing: true,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, newMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  // Launch camera
  const handleLaunchCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    setIsSheetVisible(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        image: selectedImageUri,
        isOutgoing: true,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, newMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  const bottomPadding = isKeyboardVisible
    ? 10
    : Math.max(insets.bottom, 12);

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.background, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PageHeader
          title={conversation.name}
          subtitle={`Online • ${conversation.channel}`}
          onBack={() => router.back()}
          rightIcon="account-circle-outline"
          onRightPress={() => router.push('/(main)/crm/profile')}
        />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming]}>
              {message.image ? (
                <ExpoImage
                  source={{ uri: message.image }}
                  style={styles.bubbleImage}
                  contentFit="cover"
                />
              ) : null}
              {message.text ? (
                <Text style={[
                  styles.bubbleText,
                  message.isOutgoing ? styles.bubbleTextOutgoing : null,
                  message.image ? { marginTop: 6 } : null
                ]}>
                  {message.text}
                </Text>
              ) : null}
              <Text style={[styles.bubbleTime, message.isOutgoing && styles.bubbleTimeOutgoing]}>
                {message.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: bottomPadding }]}>
          <View style={styles.actionsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionChip,
                  pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  if (inputText.trim() === '') {
                    setInputText('Please find the property brochure attached below.');
                  }
                }}>
                <MaterialCommunityIcons name="file-pdf-box" size={14} color={colors.textSecondary} />
                <Text style={styles.actionChipText}>Send Brochure</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionChip,
                  pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  if (inputText.trim() === '') {
                    setInputText("Let's book a viewing session for this property. Are you free this weekend?");
                  }
                }}>
                <MaterialCommunityIcons name="calendar-check" size={14} color={colors.textSecondary} />
                <Text style={styles.actionChipText}>Book Viewing</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionChip,
                  pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  if (inputText.trim() === '') {
                    setInputText("Here is the location link for our office: https://maps.google.com/?q=zien");
                  }
                }}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.actionChipText}>Share Location</Text>
              </Pressable>
            </ScrollView>
          </View>

          <View style={styles.inputWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.attachmentButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                setIsSheetVisible(true);
              }}>
              <MaterialCommunityIcons name="plus" size={22} color={colors.accentTeal} />
            </Pressable>

            <View style={[
              styles.inputContainer,
              isFocused && { borderColor: colors.accentTeal, borderWidth: 1.5 }
            ]}>
              <TextInput
                placeholder={`Reply via ${conversation.channel}...`}
                placeholderTextColor={colors.inputPlaceholder || Theme.inputPlaceholder}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                onFocus={handleFocus}
                onBlur={() => setIsFocused(false)}
                returnKeyType="send"
                multiline
              />
              <Pressable
                style={({ pressed }) => [
                  styles.aiAssistBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                  setInputText("Absolutely! Looking forward to meeting you. Let me know if you need anything else.");
                }}>
                <LinearGradient
                  colors={['#0a2341', '#1B5E9A']}
                  style={styles.aiAssistGradient}
                >
                  <MaterialCommunityIcons name="star-four-points" size={13} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
                pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] }
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}>
              <MaterialCommunityIcons
                name="send"
                size={18}
                color={inputText.trim() ? "#FFFFFF" : "#C5D0DB"}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Premium Media Attachment Bottom Sheet */}
      <Modal
        visible={isSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSheetVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            setIsSheetVisible(false);
          }}
        >
          <Pressable
            style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
            onPress={(e) => {
              // Prevent click propagation
            }}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Attach Media</Text>

            <View style={styles.sheetOptions}>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionCard,
                  pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
                ]}
                onPress={handleLaunchCamera}
              >
                <View style={[styles.sheetIconWrapper, { backgroundColor: '#E2F7F9' }]}>
                  <MaterialCommunityIcons name="camera" size={24} color="#0a2341" />
                </View>
                <View style={styles.sheetOptionTextWrapper}>
                  <Text style={styles.sheetOptionLabel}>Camera</Text>
                  <Text style={styles.sheetOptionSubtitle}>Take a photo in real-time</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionCard,
                  pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
                ]}
                onPress={handleSelectFromLibrary}
              >
                <View style={[styles.sheetIconWrapper, { backgroundColor: '#E8F1FC' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={24} color="#1B5E9A" />
                </View>
                <View style={styles.sheetOptionTextWrapper}>
                  <Text style={styles.sheetOptionLabel}>Photo Gallery</Text>
                  <Text style={styles.sheetOptionSubtitle}>Choose from photo library</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.sheetCancelBtn,
                pressed && { opacity: 0.8, backgroundColor: colors.cardBorder }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                setIsSheetVisible(false);
              }}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    chatContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12, // Compact gap
    },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    bubbleIncoming: {
      backgroundColor: colors.cardBackground,
      alignSelf: 'flex-start',
      borderTopLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 1,
    },
    bubbleOutgoing: {
      backgroundColor: colors.accentTeal,
      alignSelf: 'flex-end',
      borderTopRightRadius: 4,
      shadowColor: colors.cardShadowColor,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    bubbleText: {
      fontSize: 14.5,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    bubbleTextOutgoing: {
      color: '#FFFFFF',
    },
    bubbleTime: {
      marginTop: 4,
      fontSize: 10,
      color: colors.inputPlaceholder,
      textAlign: 'right',
      fontWeight: '500',
    },
    bubbleTimeOutgoing: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
    bubbleImage: {
      width: 220,
      height: 160,
      borderRadius: 14,
      marginBottom: 4,
    },
    // ── Input Section ──
    inputBar: {
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 12,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    attachmentButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderRadius: 22,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      maxHeight: 100,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    },
    aiAssistBtn: {
      marginLeft: 8,
    },
    aiAssistGradient: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentTeal,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accentTeal,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    sendBtnDisabled: {
      backgroundColor: colors.surfaceSoft,
      shadowOpacity: 0,
      elevation: 0,
      opacity: 0.6,
    },
    actionsBar: {
      marginBottom: 10,
      paddingTop: 4,
    },
    actionsScroll: {
      paddingHorizontal: 16,
      gap: 10,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    // ── Bottom Sheet Styles ──
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
    },
    sheetContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 20,
    },
    sheetOptions: {
      gap: 12,
      marginBottom: 20,
    },
    sheetOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 14,
    },
    sheetIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOptionTextWrapper: {
      flex: 1,
      gap: 2,
    },
    sheetOptionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sheetOptionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      opacity: 0.8,
    },
    sheetCancelBtn: {
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sheetCancelText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
}
