import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  deleteConversation,
  Conversation,
  ConversationDetail,
  SendMessageResponse,
} from '@/services/chatService';

/**
 * Hook to fetch the list of chat conversations.
 * Uses TanStack Query for caching and state management.
 */
export function useConversations() {
  const { accessToken } = useAuth();

  return useQuery<Conversation[], Error>({
    queryKey: ['chatConversations', accessToken],
    queryFn: () => getConversations(accessToken!),
    enabled: !!accessToken,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
}

/**
 * Mutation hook to load a single conversation with its messages.
 * Used when tapping a history item to load existing chat.
 */
export function useLoadConversation() {
  const { accessToken } = useAuth();

  return useMutation<ConversationDetail, Error, { conversationId: number }>({
    mutationFn: ({ conversationId }) => getConversation(accessToken!, conversationId),
  });
}

/**
 * Mutation hook to create a new conversation.
 * Automatically invalidates the conversations list cache on success.
 */
export function useCreateConversation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<ConversationDetail, Error, { title: string }>({
    mutationFn: ({ title }) => createConversation(accessToken!, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    },
  });
}

/**
 * Mutation hook to send a message and receive AI response.
 * Automatically invalidates the conversations list cache on success
 * (since updated_at changes).
 */
export function useSendMessage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    SendMessageResponse,
    Error,
    { conversationId: number; content: string }
  >({
    mutationFn: ({ conversationId, content }) =>
      sendMessage(accessToken!, conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    },
  });
}

/**
 * Mutation hook to delete a conversation.
 * Automatically invalidates the conversations list cache on success.
 */
export function useDeleteConversation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { conversationId: number }>({
    mutationFn: ({ conversationId }) =>
      deleteConversation(accessToken!, conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    },
  });
}
