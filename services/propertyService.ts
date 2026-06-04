const API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface PropertyStats {
  totalValue: number;
  avgConfidence: number;
  activeCount: number;
  draftCount: number;
}

export interface PropertyApiResponse {
  success: boolean;
  properties: RawPropertyItem[];
  stats?: PropertyStats;
}

export interface RawPropertyItem {
  id: number;
  user_id: number;
  address: string;
  data: {
    ListPrice?: number;
    PropertyType?: string;
    MlsStatus?: string;
    StandardStatus?: string;
    City?: string;
    StateOrProvince?: string;
    YearBuilt?: number;
    LivingArea?: number;
    BedroomsTotal?: number;
    BathroomsFull?: number;
    user_images?: string[];
    UnparsedAddress?: string;
    [key: string]: any;
  };
  status: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the user's properties from the server.
 */
export const getProperties = async (accessToken: string): Promise<PropertyApiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/properties`, {
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


export const analyzeProperty = async (address: string, accessToken: string): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Normalize address: remove trailing ', USA' and use 'soft' encoding (keep commas literal)
    const normalizedAddress = address.replace(/, USA$/i, '');
    const encodedAddress = encodeURIComponent(normalizedAddress).replace(/%2C/g, ',');

    const url = `${API_BASE_URL}/solo/properties/analyze?address=${encodedAddress}`;

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
      if (response.status === 404) {
        throw new Error('No property found for this place');
      }
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
export const uploadPropertyImage = async (fileUri: string, accessToken: string): Promise<{ success: boolean; url: string; key: string }> => {
  const formData = new FormData();

  // Create file object from URI
  const filename = fileUri.split('/').pop() || 'property.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  // @ts-ignore
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: type,
  });

  try {
    const response = await fetch(`${API_BASE_URL}/solo/properties/upload`, {
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

export const finalizeProperty = async (payload: { id?: number | string; address: string; data: any; userImages: string[] }, accessToken: string): Promise<{ success: boolean; message: string; property: any }> => {
  const response = await fetch(`${API_BASE_URL}/solo/properties/finalize`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Finalization failed');
  }
  return data;
};

export const deleteProperty = async (id: number, accessToken: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/solo/properties/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Deletion failed');
  }
  return data;
};

export const getPropertyDetails = async (id: string, accessToken: string): Promise<{ success: boolean; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/solo/properties/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch property details');
  }
  return data;
};
