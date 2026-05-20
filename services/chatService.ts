const API_BASE_URL = 'https://staging.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageAPI {
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

export interface ConversationDetail {
  status: number;
  id: number;
  user_id: number;
  title: string;
  messages: ChatMessageAPI[];
  created_at: string;
  updated_at: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessageAPI;
  aiMessage: ChatMessageAPI;
  conversationId: number;
}

// ──────────────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────────────

/**
 * Fetch all chat conversations for the authenticated user.
 * GET /api/solo/chat/conversations
 */
export const getConversations = async (accessToken: string): Promise<Conversation[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/chat/conversations`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Conversations request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fetch a single conversation with its messages.
 * GET /api/solo/chat/conversations/{conversationId}
 */
export const getConversation = async (
  accessToken: string,
  conversationId: number
): Promise<ConversationDetail> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_BASE_URL}/solo/chat/conversations/${conversationId}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Conversation request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Create a new chat conversation.
 * POST /api/solo/chat/conversations
 */
export const createConversation = async (
  accessToken: string,
  title: string
): Promise<ConversationDetail> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/chat/conversations`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Create conversation timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Send a message to a conversation and receive the AI response.
 * POST /api/solo/chat/conversations/{conversationId}/messages
 */
export const sendMessage = async (
  accessToken: string,
  conversationId: number,
  content: string
): Promise<SendMessageResponse> => {
  const controller = new AbortController();
  // AI responses may take longer, so extend the timeout
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/solo/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Message request timed out. The AI may be taking longer than expected.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Delete a chat conversation.
 * DELETE /api/solo/chat/conversations/{conversationId}
 */
export const deleteConversation = async (
  accessToken: string,
  conversationId: number
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_BASE_URL}/solo/chat/conversations/${conversationId}`,
      {
        method: 'DELETE',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Delete request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
