import { useAppTheme } from '@/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getSoloInboxEmails, SoloInboxEmail } from '@/services/inboxService';

const formatDisplayName = (emailOrPhone: string) => {
  if (!emailOrPhone) return 'Contact';
  if (emailOrPhone.includes('@')) {
    const username = emailOrPhone.split('@')[0];
    const words = username.split(/[\._\-]/).filter(Boolean);
    if (words.length > 0) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return username;
  }
  return emailOrPhone;
};

const formatBubbleTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
};

const getCommunicationChannel = (item: SoloInboxEmail) => {
  if ((item as any).channel) return (item as any).channel.toLowerCase();
  if ((item as any).type) return (item as any).type.toLowerCase();
  const recipient = item.recipient_email || '';
  if (recipient.includes('@')) return 'email';
  const content = (item.content_preview || '').toLowerCase();
  const subject = (item.subject || '').toLowerCase();
  const source = (item.module_source || '').toLowerCase();
  if (content.includes('whatsapp') || subject.includes('whatsapp') || source.includes('whatsapp')) return 'whatsapp';
  return 'email';
};

export default function CommunicationDetailScreen() {
  const { colors, theme } = useAppTheme();
  const styles = getStyles(colors, theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();

  const recipientEmail = (params.recipient_email as string) || (params.id as string) || '';

  // Fetch all communications
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['solo-inbox-emails', accessToken],
    queryFn: () => getSoloInboxEmails(accessToken),
  });

  const emails = responseData?.data || [];

  // Filter messages for this contact and sort chronologically (oldest to newest)
  const conversationMessages = useMemo(() => {
    if (!recipientEmail) return [];
    const matched = emails.filter((item: SoloInboxEmail) => 
      item.recipient_email.toLowerCase() === recipientEmail.toLowerCase()
    );
    return matched.sort((a: SoloInboxEmail, b: SoloInboxEmail) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [emails, recipientEmail]);

  const displayName = formatDisplayName(recipientEmail);
  const primaryChannel = conversationMessages.length > 0 ? getCommunicationChannel(conversationMessages[0]) : 'email';

  return (
    <LinearGradient
      colors={colors.backgroundGradient as any}
      style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar key={theme} style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Screen Header matching Web */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.headerSub}>Channel: {primaryChannel.charAt(0).toUpperCase() + primaryChannel.slice(1)}</Text>
        </View>

        <Pressable
          style={styles.viewProfileBtn}
          onPress={() => router.push('/(main)/crm/leads')}
        >
          <MaterialCommunityIcons name="account-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.viewProfileBtnText}>View Profile</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.chatContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentTeal} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : conversationMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages found for this conversation.</Text>
          </View>
        ) : (
          conversationMessages.map((item: SoloInboxEmail) => {
            const isIncoming = item.module_source?.toLowerCase().includes('incoming') || 
                               item.subject?.toLowerCase().startsWith('re:') ||
                               (!item.recipient_email.includes('@') && item.subject?.toLowerCase().includes('incoming'));

            const isHtml = item.content_preview && (
              item.content_preview.includes('<html') || 
              item.content_preview.includes('<div') || 
              item.content_preview.includes('<body')
            );

            const timeStr = formatBubbleTime(item.created_at);

            if (isIncoming) {
              // Incoming Reply Bubble (Left Aligned White Bubble - Matching Web Screenshot 2)
              return (
                <View key={item.id} style={styles.incomingWrapper}>
                  <View style={styles.incomingBubble}>
                    <Text style={styles.incomingText}>{item.content_preview?.trim()}</Text>
                    <Text style={styles.incomingTime}>{timeStr}</Text>
                  </View>
                </View>
              );
            }

            // Outgoing Message (Right Aligned - Matching Web Screenshot 2)
            return (
              <View key={item.id} style={styles.outgoingWrapper}>
                {/* Dark Navy Subject Banner (Matching Web Screenshot 2) */}
                {item.subject ? (
                  <View style={styles.subjectNavyBubble}>
                    <Text style={styles.subjectNavyText}>
                      Subject: {item.subject}
                    </Text>
                    <Text style={styles.subjectNavyTime}>{timeStr}</Text>
                  </View>
                ) : null}

                {/* HTML Template Card or Outgoing Text Bubble */}
                {isHtml ? (
                  <View style={styles.htmlCardWrapper}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: item.content_preview }}
                      style={{ flex: 1, backgroundColor: 'transparent' }}
                      scrollEnabled={true}
                    />
                  </View>
                ) : item.content_preview ? (
                  <View style={styles.outgoingBubble}>
                    <Text style={styles.outgoingText}>{item.content_preview}</Text>
                    <Text style={styles.outgoingTime}>{timeStr}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function getStyles(colors: any, theme: string) {
  const isDark = theme === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    backBtn: {
      padding: 6,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerSub: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    viewProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    viewProfileBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    chatContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 16,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    // Left Aligned Incoming Reply Bubble (Matching Web Screenshot)
    incomingWrapper: {
      alignItems: 'flex-start',
      marginVertical: 4,
      maxWidth: '88%',
    },
    incomingBubble: {
      backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? colors.cardBorder : '#E2E8F0',
      borderRadius: 16,
      borderTopLeftRadius: 4,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    incomingText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    incomingTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
      alignSelf: 'flex-start',
    },
    // Right Aligned Outgoing Thread (Matching Web Screenshot)
    outgoingWrapper: {
      alignItems: 'flex-end',
      marginVertical: 4,
      width: '100%',
    },
    subjectNavyBubble: {
      backgroundColor: '#0B2341',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      borderTopRightRadius: 4,
      maxWidth: '90%',
      marginBottom: 8,
      alignItems: 'flex-end',
    },
    subjectNavyText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    subjectNavyTime: {
      color: '#94A3B8',
      fontSize: 10,
      marginTop: 4,
    },
    htmlCardWrapper: {
      width: '100%',
      height: 440,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    outgoingBubble: {
      backgroundColor: '#0B2341',
      borderRadius: 16,
      borderTopRightRadius: 4,
      padding: 14,
      maxWidth: '85%',
    },
    outgoingText: {
      color: '#FFFFFF',
      fontSize: 14,
      lineHeight: 20,
    },
    outgoingTime: {
      color: '#94A3B8',
      fontSize: 10,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
  });
}
