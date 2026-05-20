import { PageHeader } from '@/components/ui/PageHeader';
import { Theme } from '@/constants/theme';
import { useConversations, useDeleteConversation } from '@/hooks/useChat';
import type { Conversation } from '@/services/chatService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ──────────────────────────────────────────────────────
// Relative time helper
// ──────────────────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w ago`;
    return date.toLocaleDateString();
}

export default function ChatHistoryScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const { data: conversations = [], isLoading, isError } = useConversations();
    const deleteConversationMutation = useDeleteConversation();

    const filteredHistory = conversations.filter((item: Conversation) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = (item: Conversation) => {
        Alert.alert(
            'Delete Conversation',
            `Are you sure you want to delete "${item.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteConversationMutation.mutate({ conversationId: item.id }),
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: Conversation }) => (
        <Pressable
            style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
            onPress={() => router.push({
                pathname: '/(main)/chat-modal',
                params: { conversationId: item.id.toString() }
            })}
        >
            <View style={styles.iconBox}>
                <MaterialCommunityIcons name="robot-outline" size={18} color="#5B6B7A" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>
                    {getRelativeTime(item.updated_at)}
                </Text>
            </View>
            <Pressable
                onPress={() => handleDelete(item)}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                hitSlop={8}
            >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
            </Pressable>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader
                title="Chat History"
                subtitle="Your previous AI interactions"
                onBack={() => router.back()}
            />

            <View style={styles.headerActionRow}>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
                    <TextInput
                        placeholder="Search your chats..."
                        placeholderTextColor="#94A3B8"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
                        </Pressable>
                    )}
                </View>
                <Pressable
                    style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/(main)/chat-modal')}
                >
                    <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                    <Text style={styles.newChatBtnText}>New</Text>
                </Pressable>
            </View>

            {isLoading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={Theme.accentTeal} />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredHistory}
                    keyExtractor={(item: Conversation) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        searchQuery.length > 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="magnify-close" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyStateTitle}>No results found</Text>
                                <Text style={styles.emptyStateText}>We couldn't find any chats matching "{searchQuery}"</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="chat-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                                <Text style={styles.emptyStateText}>Start a new chat to begin your AI-powered journey</Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F7FB',
    },
    headerActionRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#102A43',
        marginLeft: 8,
    },
    newChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#102A43',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 44,
        gap: 6,
    },
    newChatBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        gap: 12,
    },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    chatCardPressed: {
        backgroundColor: '#F8FAFC',
        borderColor: Theme.accentTeal,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#102A43',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#627D98',
        lineHeight: 16,
    },
    dot: {
        color: '#BCCCDC',
        marginHorizontal: 2,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#102A43',
        marginTop: 16,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#627D98',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 80,
    },
    loadingText: {
        fontSize: 14,
        color: '#627D98',
        marginTop: 12,
        fontWeight: '500',
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
