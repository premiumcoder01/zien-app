const API_BASE_URL = 'https://staging-api.zien.ai/api';
const AI_API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;
const AI_GENERATE_TIMEOUT_MS = 60000; // AI generation can take longer

export interface AiContentItem {
  id: number;
  user_id: number;
  type: string; // 'property-description', 'social-media', 'email-templates', etc.
  content: string;
  metadata: {
    input_details?: string;
    title?: string;
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
 */
export const getAiContentList = async (accessToken: string, type?: string): Promise<AiContentApiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = type
      ? `${API_BASE_URL}/solo/ai-content?type=${encodeURIComponent(type)}`
      : `${API_BASE_URL}/solo/ai-content`;
    const response = await fetch(url, {
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
export const deleteAiContent = async (id: number | string, accessToken: string): Promise<{ success: boolean; message: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/ai-content/${id}`, {
      method: 'DELETE',
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
  accessToken: string
): Promise<{ success: boolean; data: AiContentItem }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/ai-content`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

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
  accessToken: string
): Promise<{ success: boolean; data: AiContentItem }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/ai-content/${id}`, {
      method: 'PUT',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

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
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
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

/**
 * Generates AI images using the shared AI generation endpoint.
 * POST /api/shared/ai/generate-image
 * Payload: { prompt: string }
 * Response: { result: string[] }
 */
export const generateAiImage = async (
  prompt: string,
  accessToken: string
): Promise<{ result: string[] }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_API_BASE_URL}/shared/ai/generate-image`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
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

