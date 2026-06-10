const API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  role: string;
  complete_profile: boolean;
  redirect_to: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  otp_required: true;
  expires_at: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  reset: boolean;
}

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_id: number;
  image: string | null;
  company_id: number | null;
  company_role_id: number | null;
  is_owner: boolean;
  description?: string;
  website?: string;
  country_code?: string;
  complete_profile?: boolean;
  address?: string;
  license_number?: string;
}

export const loginAgent = async (payload: LoginRequest): Promise<LoginResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/login`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.data?.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Staging API returns token in Set-Cookie header as 'website_access_token'
    // Extract it from the cookie if not present in response body
    let accessToken = data?.access_token || data?.data?.access_token;

    if (!accessToken) {
      const setCookie = response.headers.get('set-cookie') || '';
      const tokenMatch = setCookie.match(/website_access_token=([^;]+)/);
      if (tokenMatch) {
        accessToken = tokenMatch[1];
        console.log('[AuthService] Token extracted from Set-Cookie header');
      }
    }

    if (!accessToken) {
      console.error('[AuthService] No access_token found in response body or headers');
      throw new Error('Login failed: No access token received from server.');
    }

    return {
      access_token: accessToken,
      role: data.role || '',
      complete_profile: data.complete_profile ?? false,
      redirect_to: data.redirect_to || '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Login request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const forgotPassword = async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/forgot-password`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
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
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const resetPassword = async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/reset-password`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
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
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getProfile = async (accessToken: string): Promise<UserProfile> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/settings/profile`, {
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
      throw new Error('Profile request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  website?: string;
  description?: string;
  image?: string | null;
}

export const updateProfile = async (
  accessToken: string,
  payload: UpdateProfileRequest
): Promise<UserProfile> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/settings/profile`, {
      method: 'PATCH',
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
      throw new Error('Update profile request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface GoogleLoginRequest {
  token: string;
}

export const loginWithGoogle = async (payload: GoogleLoginRequest): Promise<LoginResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/google-login`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.data?.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    let accessToken = data?.access_token || data?.data?.access_token;

    if (!accessToken) {
      const setCookie = response.headers.get('set-cookie') || '';
      const tokenMatch = setCookie.match(/website_access_token=([^;]+)/);
      if (tokenMatch) {
        accessToken = tokenMatch[1];
      }
    }

    if (!accessToken) {
      throw new Error('Google login failed: No access token received from server.');
    }

    return {
      access_token: accessToken,
      role: data.role || '',
      complete_profile: data.complete_profile ?? false,
      redirect_to: data.redirect_to || '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Google Sign-in request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface MicrosoftLoginRequest {
  token: string;
}

export const loginWithMicrosoft = async (payload: MicrosoftLoginRequest): Promise<LoginResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/microsoft-login`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.data?.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    let accessToken = data?.access_token || data?.data?.access_token;

    if (!accessToken) {
      const setCookie = response.headers.get('set-cookie') || '';
      const tokenMatch = setCookie.match(/website_access_token=([^;]+)/);
      if (tokenMatch) {
        accessToken = tokenMatch[1];
      }
    }

    if (!accessToken) {
      throw new Error('Microsoft login failed: No access token received from server.');
    }

    return {
      access_token: accessToken,
      role: data.role || '',
      complete_profile: data.complete_profile ?? false,
      redirect_to: data.redirect_to || '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Microsoft Sign-in request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface CheckExistsRequest {
  email?: string;
  country_code?: string;
  phone?: string;
}

export interface CheckExistsResponse {
  email?: { exists: boolean; message: string };
  phone?: { exists: boolean; message: string };
}

export const checkUserExists = async (payload: CheckExistsRequest): Promise<CheckExistsResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/register/check-exists`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.data?.message || `Server error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Check exists request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
