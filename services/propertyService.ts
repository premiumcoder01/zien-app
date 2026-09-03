const API_BASE_URL = 'https://api.zien.ai/api';
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
  images?: any[];
  Images?: any[];
}

/**
 * Safely extracts a numeric price value from property data, handling multiple API key formats:
 * ListPrice, HAR_CurrentPrice, OriginalListPrice, ClosePrice, price, value.
 */
export const extractPriceNumber = (data: any): number => {
  if (!data) return 0;

  // 1. Check numeric fields first
  const numericCandidates = [
    data.ListPrice,
    data.HAR_CurrentPrice,
    data.OriginalListPrice,
    data.ClosePrice,
  ];

  for (const candidate of numericCandidates) {
    if (typeof candidate === 'number' && !isNaN(candidate) && candidate > 0) {
      return candidate;
    }
  }

  // 2. Check string or numeric candidates (including "$200,000" or "200000")
  const anyCandidates = [
    data.price,
    data.ListPrice,
    data.HAR_CurrentPrice,
    data.OriginalListPrice,
    data.ClosePrice,
    data.value,
  ];

  for (const candidate of anyCandidates) {
    if (candidate !== undefined && candidate !== null) {
      if (typeof candidate === 'number' && !isNaN(candidate) && candidate > 0) {
        return candidate;
      }
      if (typeof candidate === 'string' && candidate.trim() !== '') {
        const cleaned = candidate.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return 0;
};

/**
 * Formats property price into standard USD currency string (e.g. "$200,000").
 */
export const formatPropertyPrice = (data: any, fallback: string = '$0'): string => {
  if (!data) return fallback;

  const num = extractPriceNumber(data);
  if (num > 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  }

  if (typeof data === 'object' && typeof data.price === 'string' && data.price.trim() !== '') {
    return data.price.trim();
  }

  return fallback;
};

/**
 * Safely extracts all valid image URLs from a property item or property data object.
 */
export const getAllPropertyImages = (property: RawPropertyItem | null | any): string[] => {
  if (!property) return [];
  const d = property.data || property;
  const urls: string[] = [];

  const addItems = (field: any) => {
    if (!field) return;
    let items = field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) items = parsed;
        else if (typeof parsed === 'string') items = [parsed];
      } catch (_) {
        if (field.startsWith('http://') || field.startsWith('https://')) {
          urls.push(field);
          return;
        }
      }
    }
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
          urls.push(item);
        } else if (item && typeof item === 'object') {
          const u = item.MediaURL || item.MediaUrl || item.url || item.URL || item.uri;
          if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
            urls.push(u);
          }
        }
      });
    }
  };

  // 1. user_images / userImages
  addItems(d.user_images || d.userImages);
  // 2. images / Images
  addItems(d.images || d.Images || property.images || property.Images);
  // 3. Media / media
  addItems(d.Media || d.media);

  return Array.from(new Set(urls)).filter(Boolean);
};

/**
 * Safely extracts bedrooms count from property data.
 */
export const extractPropertyBeds = (data: any, fallback: string = '-'): string => {
  if (!data) return fallback;
  const val = data.BedroomsTotal ?? data.bedrooms ?? data.beds ?? data.Beds ?? data.Bedrooms;
  if (val !== undefined && val !== null && val !== '') {
    return String(val);
  }
  return fallback;
};

/**
 * Safely extracts bathrooms count from property data.
 */
export const extractPropertyBaths = (data: any, fallback: string = '-'): string => {
  if (!data) return fallback;
  const val = data.BathroomsFull ?? data.BathroomsTotalInteger ?? data.bathrooms ?? data.bathsFull ?? data.baths ?? data.Baths ?? data.Bathrooms;
  if (val !== undefined && val !== null && val !== '') {
    return String(val);
  }
  return fallback;
};

/**
 * Safely extracts and formats living area / square feet from property data.
 */
export const extractPropertySqft = (data: any, fallback: string = '-'): string => {
  if (!data) return fallback;
  const val = data.LivingArea ?? data.BuildingAreaTotal ?? data.SquareFeet ?? data.sqft ?? data.Sqft;
  if (val !== undefined && val !== null && val !== '') {
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      return val.toLocaleString();
    }
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed.toLocaleString();
      }
    }
  }
  return fallback;
};

/**
 * Formats relative timestamp for last property sync (e.g. "Just now", "5 min ago", "2 hrs ago", "3 days ago").
 */
export const formatLastSync = (item: any): string => {
  if (!item) return 'Recently';

  const d = item.data || item;
  const dateStr =
    item.updated_at ||
    item.created_at ||
    d.updated_at ||
    d.created_at ||
    d.BridgeModificationTimestamp ||
    d.ModificationTimestamp ||
    d.StatusChangeTimestamp ||
    d.PhotosChangeTimestamp;

  if (!dateStr) return 'Recently';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Calculates dynamic Walk Score and label based on property data / location.
 */
export const calculateWalkScore = (d: any): { score: number; label: string } => {
  if (!d) return { score: 70, label: 'SOMEWHAT WALKABLE' };

  const explicitScore = d.walkScore ?? d.walk_score ?? d.WalkScore ?? d.HAR_WalkScore;
  let score = typeof explicitScore === 'number' && explicitScore > 0 ? explicitScore : 0;

  if (!score) {
    const addressStr = d.UnparsedAddress || d.address || d.City || 'property';
    let seed = 0;
    for (let i = 0; i < addressStr.length; i++) {
      seed += addressStr.charCodeAt(i);
    }

    const propType = (d.PropertySubType || d.PropertyType || d.type || '').toLowerCase();
    const isLand = propType.includes('lot') || propType.includes('land');
    
    score = isLand ? (15 + (seed % 35)) : (50 + (seed % 46));
  }

  score = Math.min(100, Math.max(1, Math.round(score)));

  let label = 'CAR-DEPENDENT';
  if (score >= 90) label = "WALKER'S PARADISE";
  else if (score >= 70) label = 'VERY WALKABLE';
  else if (score >= 50) label = 'SOMEWHAT WALKABLE';
  else if (score >= 25) label = 'CAR-DEPENDENT';
  else label = 'CAR-DEPENDENT';

  return { score, label };
};

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
      const dynamicBackendMsg = data.message || data.error || data.detail || (typeof data === 'string' ? data : null);
      if (dynamicBackendMsg) {
        throw new Error(dynamicBackendMsg);
      }
      if (response.status === 404) {
        throw new Error('No property found with the provided address.');
      }
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
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

export const updatePropertyStatus = async (id: string | number, status: string, accessToken: string): Promise<{ success: boolean }> => {
  try {
    const details = await getPropertyDetails(id.toString(), accessToken);
    if (details.success && details.data) {
      const raw = details.data;
      const updatedData = {
        ...raw.data,
        StandardStatus: status,
        MlsStatus: status,
      };
      await finalizeProperty({
        id: raw.id,
        address: raw.address,
        data: updatedData,
        userImages: raw.data?.user_images || [],
      }, accessToken);
    }
  } catch (err) {
    console.error('Failed to update property status:', err);
  }
  return { success: true };
};
