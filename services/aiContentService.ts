import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.zien.ai/api';
const FALLBACK_API_BASE_URL = 'https://api.zien.ai/api';
const AI_API_BASE_URL = 'https://api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;
const AI_GENERATE_TIMEOUT_MS = 60000; // AI generation can take longer

export interface AiContentItem {
  id: number;
  user_id: number;
  type: string; // 'property-description', 'social-media', 'email-templates', 'virtual-staging', etc.
  content: string;
  metadata: {
    input_details?: string;
    title?: string;
    designBrief?: string;
    style?: string;
    roomType?: string;
    toolId?: string;
    originalImage?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface AiContentApiResponse {
  success: boolean;
  data: AiContentItem[];
}

/**
 * Fetches the user's generated AI content items from the server.
 * GET https://api.zien.ai/api/solo/ai-content
 */
export const getAiContentList = async (accessToken?: string, type?: string): Promise<AiContentApiResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('user_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const primaryUrl = type
      ? `${API_BASE_URL}/solo/ai-content?type=${encodeURIComponent(type)}`
      : `${API_BASE_URL}/solo/ai-content`;

    let response = await fetch(primaryUrl, {
      method: 'GET',
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      try {
        const fallbackUrl = type
          ? `${FALLBACK_API_BASE_URL}/solo/ai-content?type=${encodeURIComponent(type)}`
          : `${FALLBACK_API_BASE_URL}/solo/ai-content`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'GET',
          signal: controller.signal,
          headers,
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
        }
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Deletes an AI content item by its ID.
 */
export const deleteAiContent = async (id: number | string, accessToken?: string): Promise<{ success: boolean; message: string }> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('user_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`${API_BASE_URL}/solo/ai-content/${id}`, {
      method: 'DELETE',
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      try {
        const fallbackRes = await fetch(`${FALLBACK_API_BASE_URL}/solo/ai-content/${id}`, {
          method: 'DELETE',
          signal: controller.signal,
          headers,
        });
        if (fallbackRes.ok) response = fallbackRes;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Saves (exports) a new AI content item to the server.
 * POST /api/solo/ai-content
 */
export interface SaveAiContentPayload {
  type: string;
  content: string;
  metadata: {
    input_details?: string;
    [key: string]: any;
  };
}

export const saveAiContent = async (
  payload: SaveAiContentPayload,
  accessToken?: string
): Promise<{ success: boolean; data: AiContentItem }> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('user_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`${API_BASE_URL}/solo/ai-content`, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      try {
        const fallbackRes = await fetch(`${FALLBACK_API_BASE_URL}/solo/ai-content`, {
          method: 'POST',
          signal: controller.signal,
          headers,
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) response = fallbackRes;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Updates an existing AI content item on the server.
 * PUT /api/solo/ai-content/:id
 */
export const updateAiContent = async (
  id: number | string,
  payload: SaveAiContentPayload,
  accessToken?: string
): Promise<{ success: boolean; data: AiContentItem }> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('user_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`${API_BASE_URL}/solo/ai-content/${id}`, {
      method: 'PUT',
      signal: controller.signal,
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      try {
        const fallbackRes = await fetch(`${FALLBACK_API_BASE_URL}/solo/ai-content/${id}`, {
          method: 'PUT',
          signal: controller.signal,
          headers,
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) response = fallbackRes;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};


/**
 * Generates AI text content using the shared AI generation endpoint.
 * POST /api/shared/ai/generate-text
 */
export const generateAiText = async (
  prompt: string,
  accessToken: string,
  complexity: 'simple' | 'complex' = 'complex'
): Promise<{ result: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_API_BASE_URL}/shared/ai/generate-text`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt, complexity }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || (response.status === 402 ? 'Insufficient AI Credits.' : `Server error: ${response.status} ${response.statusText}`);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI generation timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};



export interface VirtualStagingPayload {
  designBrief: string;
  image: string;
  roomType: string;
  style: string;
  toolId: string;
}

export interface VirtualStagingResponse {
  success: boolean;
  message?: string;
  data: {
    imageUrl: string;
  };
}

/**
 * Generates virtual staging image using the API:
 * POST https://api.zien.ai/api/solo/ai-content/virtual-staging/generate
 */
export const generateVirtualStaging = async (
  payload: VirtualStagingPayload,
  accessToken?: string
): Promise<VirtualStagingResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`https://api.zien.ai/api/solo/ai-content/virtual-staging/generate`, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(payload),
    });

    // Fallback to staging-api if primary proxy fails
    if (!response.ok) {
      try {
        const fallbackRes = await fetch(`https://api.zien.ai/api/solo/ai-content/virtual-staging/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
        }
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI virtual staging generation timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface GenerateAiImageResponse {
  success: boolean;
  message?: string;
  data: {
    imageUrl: string;
  };
  result?: string[];
}

/**
 * Generates an AI image using the endpoint:
 * POST https://api.zien.ai/api/solo/ai-content/generate-image
 * Payload: { prompt: string }
 * Response: { success: true, message: "Image generated successfully", data: { imageUrl: "..." } }
 */
export const generateAiImage = async (
  prompt: string,
  accessToken?: string
): Promise<GenerateAiImageResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('user_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response = await fetch(`https://api.zien.ai/api/solo/ai-content/generate-image`, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({ prompt }),
    });

    // Fallback to staging-api if primary proxy fails
    if (!response.ok) {
      try {
        const fallbackRes = await fetch(`https://api.zien.ai/api/solo/ai-content/generate-image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ prompt }),
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
        }
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (data?.data?.imageUrl && !data.result) {
      data.result = [data.data.imageUrl];
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI image generation timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};


