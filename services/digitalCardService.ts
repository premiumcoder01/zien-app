const DIGITAL_CARD_API_BASE_URL = 'https://staging-api.zien.ai/api';
const ASSET_UPLOAD_API_URL = 'https://staging-api.zien.ai/api/shared/upload/card-asset';
const REQUEST_TIMEOUT_MS = 15000;

export interface DigitalCard {
  id: string;
  user_id: number;
  full_name: string;
  profile_name: string;
  profile_type: 'work' | 'personal';
  card_color: string;
  name: string;
  title: string;
  role: string;
  company_name: string;
  image: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  bio: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  facebook: string;
  logo: string;
  card_url: string;
  avatar_url: string | null;
  company_logo_url: string | null;
  accent_color: string | null;
  template: string | null;
  font: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface CardAnalytics {
  totals: { event_type: string; count: string | number }[];
  daily: { date: string; event_type: string; count: string | number }[];
  monthly: { month: string; event_type: string; count: string | number }[];
}

export const getDigitalCards = async (accessToken: string): Promise<DigitalCard[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DIGITAL_CARD_API_BASE_URL}/solo/digital-cards`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json().catch(() => ([]));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    // Ensure it returns an array
    return Array.isArray(data) ? data : (data.cards || []);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface CreateDigitalCardPayload {
  card_type: 'work' | 'personal';
  profile_name: string;
  name: string;
  email: string;
  phone: string;
  title?: string;
  company_name?: string;
}

export const createDigitalCard = async (accessToken: string, payload: CreateDigitalCardPayload): Promise<DigitalCard> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Construct the exact payload required by the backend
  const isWork = payload.card_type === 'work';
  const apiPayload = {
    profile_name: payload.profile_name,
    profile_type: payload.card_type,
    name: payload.name || '',
    title: payload.title || '',
    role: '',
    company_name: payload.company_name || '',
    image: '',
    phone: payload.phone || '',
    email: payload.email || '',
    website: '',
    license: '',
    bio: '',
    instagram: '',
    linkedin: '',
    tiktok: '',
    facebook: '',
    logo: '',
    card_color: isWork ? '#0B2341' : '#14b8a6',
    template: 'modern',
    font: 'inter',
    status: 1,
  };

  try {
    const response = await fetch(`${DIGITAL_CARD_API_BASE_URL}/solo/digital-cards`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(apiPayload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
export const deleteDigitalCard = async (accessToken: string, cardId: string): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DIGITAL_CARD_API_BASE_URL}/solo/digital-cards/${cardId}`, {
      method: 'DELETE',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Server error: ${response.status}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const updateDigitalCard = async (accessToken: string, cardId: string, data: Partial<DigitalCard>): Promise<DigitalCard> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DIGITAL_CARD_API_BASE_URL}/solo/digital-cards/${cardId}`, {
      method: 'PUT',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const uploadCardAsset = async (accessToken: string, fileUri: string, type: 'image' | 'logo'): Promise<{ url: string; key: string }> => {
  const formData = new FormData();

  // Create file object from URI
  const filename = fileUri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const fileType = match ? `image/${match[1]}` : `image`;

  // @ts-ignore
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: fileType,
  });
  formData.append('type', type);

  try {
    const response = await fetch(ASSET_UPLOAD_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
};

export const getCardAnalytics = async (accessToken: string, cardId: string): Promise<CardAnalytics> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const ANALYTICS_API_URL = `https://staging-api.zien.ai/api/solo/digital-cards/stats/analytics?digital_card_id=${cardId}`;

  try {
    const response = await fetch(ANALYTICS_API_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json().catch(() => ({ totals: [], daily: [], monthly: [] }));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analytics request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface LeadEnquiryItem {
  id: number;
  digital_card_id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
  updated_at: string;
  digital_card?: {
    profile_name: string;
  };
}

export const getLeadEnquiries = async (accessToken: string): Promise<LeadEnquiryItem[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DIGITAL_CARD_API_BASE_URL}/solo/digital-cards/enquiries/all`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json().catch(() => ([]));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Lead enquiries request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
