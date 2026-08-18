const API_BASE_URL = 'https://staging-api.zien.ai/api';
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

const getHeaders = (accessToken: string) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
  'token': accessToken,
  'Cookie': `website_access_token=${accessToken}; access_token=${accessToken}; token=${accessToken}`
});

/**
 * Fetch all chat conversations for the authenticated user.
 * GET /api/solo/chat/conversations
 */
export const getConversations = async (accessToken: string): Promise<Conversation[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let url = 'https://staging.zien.ai/api/solo/chat/conversations';
    console.log('=== [GET CONVERSATIONS REQUEST] ===');
    console.log('URL:', url);

    let response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: getHeaders(accessToken),
    });

    console.log('GET CONVERSATIONS STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/solo/chat/conversations`;
      console.log('=== [GET CONVERSATIONS FALLBACK REQUEST] ===');
      console.log('URL:', url);
      response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(accessToken),
      });
      console.log('FALLBACK STATUS:', response.status);
    }

    const data = await response.json().catch(() => ([]));
    console.log('=== [GET CONVERSATIONS RESPONSE] ===');
    console.log('DATA:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data?.message || `Server error: ${response.status}`);
    }

    if (Array.isArray(data)) {
      return data;
    }
    return data?.conversations || data?.data || [];
  } catch (error: unknown) {
    console.error('=== [GET CONVERSATIONS ERROR] ===', error);
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
    let url = `https://staging.zien.ai/api/solo/chat/conversations/${conversationId}`;
    console.log('=== [GET CONVERSATION DETAIL REQUEST] ===');
    console.log('URL:', url);

    let response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: getHeaders(accessToken),
    });

    console.log('GET CONVERSATION DETAIL STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/solo/chat/conversations/${conversationId}`;
      console.log('=== [GET CONVERSATION DETAIL FALLBACK] ===');
      console.log('URL:', url);
      response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(accessToken),
      });
      console.log('FALLBACK STATUS:', response.status);
    }

    const data = await response.json().catch(() => ({}));
    console.log('=== [GET CONVERSATION DETAIL RESPONSE] ===');
    console.log('DATA:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    console.error('=== [GET CONVERSATION DETAIL ERROR] ===', error);
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
    let url = 'https://staging.zien.ai/api/solo/chat/conversations';
    console.log('=== [CREATE CONVERSATION REQUEST] ===');
    console.log('URL:', url);
    console.log('BODY:', JSON.stringify({ title }));

    let response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: getHeaders(accessToken),
      body: JSON.stringify({ title }),
    });

    console.log('CREATE CONVERSATION STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/solo/chat/conversations`;
      console.log('=== [CREATE CONVERSATION FALLBACK] ===');
      console.log('URL:', url);
      response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify({ title }),
      });
      console.log('FALLBACK STATUS:', response.status);
    }

    const data = await response.json().catch(() => ({}));
    console.log('=== [CREATE CONVERSATION RESPONSE] ===');
    console.log('DATA:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    console.error('=== [CREATE CONVERSATION ERROR] ===', error);
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
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    let url = `https://staging.zien.ai/api/solo/chat/conversations/${conversationId}/messages`;
    console.log('=== [SEND MESSAGE REQUEST] ===');
    console.log('URL:', url);
    console.log('BODY:', JSON.stringify({ content }));

    let response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: getHeaders(accessToken),
      body: JSON.stringify({ content }),
    });

    console.log('SEND MESSAGE STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/solo/chat/conversations/${conversationId}/messages`;
      console.log('=== [SEND MESSAGE FALLBACK] ===');
      console.log('URL:', url);
      response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify({ content }),
      });
      console.log('FALLBACK STATUS:', response.status);
    }

    const data = await response.json().catch(() => ({}));
    console.log('=== [SEND MESSAGE RESPONSE] ===');
    console.log('DATA:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    console.error('=== [SEND MESSAGE ERROR] ===', error);
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
    let url = `https://staging.zien.ai/api/solo/chat/conversations/${conversationId}`;
    console.log('=== [DELETE CONVERSATION REQUEST] ===');
    console.log('URL:', url);

    let response = await fetch(url, {
      method: 'DELETE',
      signal: controller.signal,
      headers: getHeaders(accessToken),
    });

    console.log('DELETE CONVERSATION STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/solo/chat/conversations/${conversationId}`;
      console.log('=== [DELETE CONVERSATION FALLBACK] ===');
      console.log('URL:', url);
      response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(accessToken),
      });
      console.log('FALLBACK STATUS:', response.status);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Server error: ${response.status}`);
    }
  } catch (error: unknown) {
    console.error('=== [DELETE CONVERSATION ERROR] ===', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Delete request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
