const API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface LoginRequest {
  email: string;
  password: string;
  platform?: 'ios' | 'android';
  device_token?: string;
}

export interface LoginResponse {
  access_token: string;
  role: string;
  complete_profile: boolean;
  redirect_to: string;
  message?: string;
  activation_email_sent?: boolean;
  is_subscription?: boolean;
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
    const url = `${API_BASE_URL}/website/auth/login`;
    console.log('[AuthService] Sending POST to:', url);
    console.log('[AuthService] Request Body Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
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

    if (data.activation_email_sent) {
      console.log('[AuthService] Login response has activation_email_sent=true');
      return {
        access_token: data.access_token || '',
        role: data.role || '',
        complete_profile: data.complete_profile ?? false,
        redirect_to: data.redirect_to || '',
        activation_email_sent: true,
        message: data.message || 'Subscription is not active. A fresh activation link has been sent to your email!',
        is_subscription: data.is_subscription ?? false,
      };
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
      is_subscription: data.is_subscription ?? true,
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
  license_number?: string;
  address?: string;
  country_code?: string;
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

export interface AppleLoginRequest {
  identity_token: string;
  apple_id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  platform: 'ios' | 'android';
}

export const loginWithApple = async (payload: AppleLoginRequest): Promise<LoginResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/website/auth/apple-login`, {
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
      throw new Error('Apple login failed: No access token received from server.');
    }

    return {
      access_token: accessToken,
      role: data.role || '',
      complete_profile: data.complete_profile ?? false,
      redirect_to: data.redirect_to || '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Apple Sign-in request timed out. Please check your connection and try again.');
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

export interface SendOtpRequest {
  type: 'email' | 'phone';
  target: string;
}

export interface VerifyOtpRequest {
  type: 'email' | 'phone';
  otp: string;
  target: string;
}

export const sendOtp = async (accessToken: string, payload: SendOtpRequest): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/settings/send-otp`, {
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
      throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Send OTP request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const verifyOtp = async (accessToken: string, payload: VerifyOtpRequest): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/settings/verify-otp`, {
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
      throw new Error(data.message || 'Incorrect OTP.');
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Verify OTP request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface RegisterMobileIosRequest {
  flow: 'solo' | 'team';
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  phone: string;
  password: string;
  license_number?: string;
  primary_market: string;
  team_name?: string;
  team_logo_url?: string;
}

export const registerMobileIos = async (payload: RegisterMobileIosRequest): Promise<LoginResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = `${API_BASE_URL}/website/register/mobile/ios`;
  console.log('=== iOS REGISTER REQUEST ===');
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    console.log('=== iOS REGISTER RESPONSE ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error?.message || data?.data?.message || `Server error: ${response.status} ${response.statusText}`;
      console.log('=== iOS REGISTER ERROR ===', errorMessage);
      throw new Error(errorMessage);
    }

    let accessToken = data?.access_token || data?.data?.access_token;

    if (!accessToken) {
      const setCookie = response.headers.get('set-cookie') || '';
      const tokenMatch = setCookie.match(/website_access_token=([^;]+)/);
      if (tokenMatch) {
        accessToken = tokenMatch[1];
        console.log('=== iOS REGISTER: Token found in Set-Cookie ===');
      }
    }

    if (!accessToken) {
      console.log('=== iOS REGISTER: No access_token — showing server message ===');
      // Server returned 201 OK with a message (e.g., email verification needed)
      return {
        access_token: '',
        role: data.role || '',
        complete_profile: false,
        redirect_to: '',
        message: data.message || 'Registration successful. Please check your email.',
      };
    }

    console.log('=== iOS REGISTER SUCCESS === role:', data.role);
    return {
      access_token: accessToken,
      role: data.role || '',
      complete_profile: data.complete_profile ?? false,
      redirect_to: data.redirect_to || '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Registration request timed out. Please check your connection and try again.');
    }
    console.log('=== iOS REGISTER EXCEPTION ===', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface RegisterDeviceTokenRequest {
  device_token: string;
  platform?: 'ios' | 'android';
}

export const registerDeviceToken = async (
  accessToken: string,
  payload: RegisterDeviceTokenRequest
): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/settings/device-token`, {
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
      console.log('[AuthService] Register device token status:', response.status, data?.message);
    }

    return data;
  } catch (error: unknown) {
    console.log('[AuthService] Register device token catch error:', error);
  } finally {
    clearTimeout(timeoutId);
  }
};
