const API_BASE_URL = 'https://staging-api.zien.ai/api';

export interface SocialPostMedia {
  id: number;
  post_id: number;
  media_url: string;
  media_type: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: number;
  user_id: number;
  campaign_id: number | null;
  property_id: number | null;
  caption: string;
  status: number;
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  media: SocialPostMedia[];
  post_platforms: any[];
}

/**
 * Fetch social posts by status.
 * status=1 → scheduled/upcoming posts
 */
export const getSocialPosts = async (token: string, status?: number): Promise<SocialPost[]> => {
  const params = status !== undefined ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE_URL}/solo/social/posts${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch social posts');
  }

  return json.data;
};

/**
 * Create a new social post (scheduled or immediate).
 */
export const createSocialPost = async (token: string, payload: any): Promise<{ success: boolean; message: string; post: SocialPost }> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to create social post');
  }

  return json;
};

/**
 * Fetch a single social post by its ID.
 */
export const getSocialPostById = async (token: string, postId: number): Promise<SocialPost> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/posts/${postId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch social post');
  }

  return json.data;
};

/**
 * Update an existing social post.
 */
export const updateSocialPost = async (token: string, postId: number, payload: any): Promise<{ success: boolean; message: string; post: SocialPost }> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/posts/${postId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to update social post');
  }

  return json;
};

/**
 * Create a new social campaign.
 */
export const createCampaign = async (
  token: string,
  payload: { name: string; target_audience: string; start_date: string; status: number }
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/campaigns`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to create campaign');
  }

  return json;
};

/**
 * Fetch all social campaigns for the current user.
 */
export const getCampaigns = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/campaigns`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch campaigns');
  }

  return json.data;
};

/**
 * Update an existing social campaign.
 */
export const updateCampaign = async (
  token: string,
  campaignId: number,
  payload: { name?: string; target_audience?: string; start_date?: string; status?: number }
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/campaigns/${campaignId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to update campaign');
  }

  return json;
};

/**
 * Delete a social campaign.
 */
export const deleteCampaign = async (token: string, campaignId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to delete campaign');
  }

  return json;
};

/**
 * Fetch all social templates.
 */
export const getTemplates = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/templates`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch templates');
  }

  return json.data;
};





/**
 * Delete a social template.
 */
export const deleteTemplate = async (token: string, templateId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/templates/${templateId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to delete template');
  }

  return json;
};

export interface SocialOverviewData {
  scheduled_posts: SocialPost[];
  published_posts_count: number;
  recent_published_posts: SocialPost[];
  templates: any[];
}

/**
 * Fetch social hub overview.
 */
export const getSocialOverview = async (token: string): Promise<SocialOverviewData> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/overview`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch social overview');
  }

  return json.data;
};

/**
 * Fetch connected social accounts.
 */
export const getSocialAccounts = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch social accounts');
  }

  return json.data;
};

/**
 * Disconnect a social account.
 */
export const disconnectSocialAccount = async (token: string, accountId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/social/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to disconnect social account');
  }

  return json;
};
