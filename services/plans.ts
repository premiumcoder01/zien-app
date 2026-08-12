const API_BASE_URL = 'https://api.zien.ai/api';
const CHECKOUT_API_URL = 'https://api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface Price {
  id: number;
  billing_interval: 'monthly' | 'annually' | 'yearly';
  interval_count: number;
  price: string;
  currency: string;
}

export interface Addon {
  id: number;
  name: string;
  slug: string;
  description: string;
  addon_type: string;
  prices: Price[];
}

export interface Plan {
  id: number;
  roleId: number;
  name: string;
  slug: string;
  description: string | null;
  features: string[];
  prices: Price[];
  addons: Addon[];
}

export interface CheckoutPayload {
  addon_ids: number[];
  billing: string;
  country_code: string;
  email: string;
  first_name: string;
  last_name: string;
  license_number: string;
  password: string;
  phone: string;
  plan_id: number;
  primary_market: string;
}

export interface TeamCheckoutPayload {
  addon_ids: number[];
  billing: string;
  country_code: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  phone: string;
  plan_id: number;
  primary_market: string;
  team_name: string;
  team_logo?: string;
}

export interface PlansResponse {
  plans: Plan[];
  soloRoleId: number;
  teamRoleId: number;
}

export interface UploadLogoResponse {
  ok: boolean;
  url: string;
  key: string;
}

export const fetchSoloPlans = async (): Promise<Plan[]> => {
  const result = await fetchAllPlans();
  return result.plans.filter(p => p.roleId === result.soloRoleId);
};

export const fetchTeamPlans = async (): Promise<Plan[]> => {
  const result = await fetchAllPlans();
  return result.plans.filter(p => p.roleId === result.teamRoleId);
};

const fetchAllPlans = async (): Promise<PlansResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/register/plans`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const registerSoloCheckout = async (payload: CheckoutPayload): Promise<any> => {
  return registerCheckout(payload, 'solo');
};

export const registerTeamCheckout = async (payload: TeamCheckoutPayload): Promise<any> => {
  return registerCheckout(payload, 'team');
};

const registerCheckout = async (payload: any, flow: 'solo' | 'team'): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const url = `${CHECKOUT_API_URL}/website/register/${flow}/checkout`;

  console.log('=== REGISTER CHECKOUT REQUEST ===');
  console.log('URL:', url);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('Body:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('=== REGISTER CHECKOUT ERROR RESPONSE ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Error Data:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('=== REGISTER CHECKOUT SUCCESS RESPONSE ===');
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    
    return responseData;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('=== REGISTER CHECKOUT TIMEOUT ===');
      throw new Error('Registration timed out. Please check your connection and try again.');
    }
    console.log('=== REGISTER CHECKOUT EXCEPTION ===', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const completeCheckout = async (sessionId: string): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${CHECKOUT_API_URL}/website/register/checkout/complete`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Completion check timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};



export const uploadTeamLogo = async (fileUri: string): Promise<UploadLogoResponse> => {
  const formData = new FormData();

  const filename = fileUri.split('/').pop() || 'logo.png';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/png`;

  formData.append('file', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/website/register/team/logo`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload logo');
  }

  return response.json();
};
