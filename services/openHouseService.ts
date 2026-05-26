const API_BASE_URL = 'https://staging.zien.ai/api';

export interface OpenHouseEvent {
  id: number;
  user_id: number;
  property_id: number;
  date: string;
  start_time: string;
  end_time: string;
  brand_color: string;
  uploaded_logo: string | null;
  status: 'live' | 'upcoming' | 'completed';
  visitors_count: number;
  hot_leads_count: number;
  gallery_images: string[];
  agent_details?: {
    name: string;
    email: string;
    phone: string;
    license: string;
    brokerage: string;
  };
  ai_description?: string;
  ai_tone?: string;
  logo_text?: string | null;
  visitor_registration?: boolean;
  send_report?: boolean;
  feedback_rating?: number;
  enquiries?: any[];
  property: {
    id: number;
    address: string;
    data: any;
  };
}

export const getOpenHouses = async (token: string): Promise<OpenHouseEvent[]> => {
  const response = await fetch(`${API_BASE_URL}/solo/open-houses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch open houses');
  }

  return json.data;
};

export const createOpenHouse = async (token: string, payload: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/open-houses`, {
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
    throw new Error(json.message || 'Failed to create open house');
  }

  return json;
};

export const deleteOpenHouse = async (token: string, id: number | string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/open-houses/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to delete open house');
  }

  return json;
};

export const getOpenHouseById = async (token: string, id: number | string): Promise<OpenHouseEvent> => {
  const response = await fetch(`${API_BASE_URL}/solo/open-houses/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to fetch open house details');
  }

  return json.data;
};

export const updateOpenHouse = async (token: string, id: number | string, payload: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/solo/open-houses/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Failed to update open house');
  }

  return json;
};
