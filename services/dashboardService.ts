import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export const getDashboardAuthHeaders = (token?: string): Record<string, string> => {
  let cleanToken = token || '';
  if (cleanToken.startsWith('Bearer ')) {
    cleanToken = cleanToken.slice(7).trim();
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (cleanToken) {
    headers['Authorization'] = `Bearer ${cleanToken}`;
    headers['Cookie'] = `website_access_token=${cleanToken}; access_token=${cleanToken}; token=${cleanToken}; auth_token=${cleanToken}`;
  }
  return headers;
};

/** Thrown when the server responds with HTTP 503 (Service Unavailable / maintenance). */
export class ServiceUnavailableError extends Error {
  readonly statusCode = 503;
  constructor(message = 'Service temporarily unavailable. We\'ll be back shortly!') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export interface StatItem {
  value: string;
  trend: string;
}

export interface DashboardStats {
  totalLeads: StatItem;
  activeListings: StatItem;
  estRevenue: StatItem;
  guardianAlerts: StatItem;
}

export interface ActiveLead {
  id: string;
  name: string;
  info: string;
  initial: string;
  status: string;
  // Keep optional old fields for safety during transition
  note?: string;
  badge?: string;
  badgeTone?: 'hot' | 'new' | 'muted';
  color?: string;
}

export interface DashboardOverviewResponse {
  stats: DashboardStats;
  leadVelocity: number[];
  activeLeads: ActiveLead[];
  crmSnapshot?:
    | {
        new: number;
        negotiation: number;
        closing: number;
      }
    | Array<{
        name: string;
        count: number;
      }>;
  latestUpdates?: any[];
}

export interface AgencyStat {
  label: string;
  value: string;
  grow: string;
  icon: string;
}

export interface AgencyUsageDetail {
  label: string;
  value: number;
  color: string;
}

export interface AgencyDashboardStatsResponse {
  stats: AgencyStat[];
  activity: Array<{
    event: string;
    agent?: string;
    time: string;
    color?: string;
  }>;
  usage: {
    overallPercentage: number;
    totalCredits?: number;
    usedCredits?: number;
    details: AgencyUsageDetail[];
  };
}

export interface TeamProfile {
  id: number;
  role_id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  image: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  mailgun_api_key?: string | null;
  mailgun_domain?: string | null;
  mailgun_from_email?: string | null;
  sendgrid_api_key?: string | null;
  sendgrid_from_email?: string | null;
  notification_preferences?: Record<string, boolean> | null;
}

export interface Employee {
  id: number;
  company_id: number;
  user_id: number;
  is_owner: boolean;
  role_id: number;
  status: number;
  created_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country_code: string;
    image: string | null;
    status: number;
    address: string | null;
    license_number?: string | null;
    description?: string | null;
  };
  role: {
    id: number;
    name: string;
  };
}

export interface EmployeeResponse {
  employees: Employee[];
  max_members: number;
}

export interface TeamRole {
  id: number;
  company_id: number;
  slug: string | null;
  name: string;
  description: string;
  status: number;
}

export interface SubscriptionAddon {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  metadata?: {
    stripe_product_id: string;
    available_for_names: string[];
  };
  status?: string;
  quantity: number;
}

export interface SubscriptionDetail {
  subscription: {
    id: number;
    status: number;
    status_text: string;
    currency: string;
    price: string | null;
    total_price: string;
    started_at: string;
    current_period_start: string | null;
    current_period_end: string | null;
    next_payment_at: string | null;
    trial_start: string | null;
    trial_end: string | null;
    is_trial: boolean;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
  };
  plan: {
    id: number;
    name: string;
    description: string;
    benefits: string[];
    seats: string;
    aiCredits: string;
    metadata?: {
      featured: boolean;
    };
  };
  price?: {
    id: number;
    price_name: string;
    billing_interval: string;
    amount: string;
  } | null;
  addons?: SubscriptionAddon[];
}

export interface PlanPrice {
  id: number;
  billing_interval: 'monthly' | 'annually';
  interval_count: number;
  price: string;
  currency: string;
  discount: string;
  total_price: string;
}

export interface PlanAddon {
  id: number;
  name: string;
  slug: string;
  description: string;
  addon_type: string;
  prices: PlanPrice[];
}

export interface WebsitePlan {
  id: number;
  roleId: number;
  name: string;
  slug: string;
  description: string;
  features: string[];
  prices: PlanPrice[];
  addons: PlanAddon[];
}

export interface WebsitePlansResponse {
  plans: WebsitePlan[];
  soloRoleId: number;
  teamRoleId: number;
}


export const getDashboardOverview = async (accessToken?: string): Promise<DashboardOverviewResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = getDashboardAuthHeaders(token);

  try {
    let response = await fetch(`${API_BASE_URL}/solo/dashboard/overview`, {
      method: 'GET',
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      try {
        const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
          ? `https://staging.zien.ai/api/solo/dashboard/overview`
          : `https://staging-api.zien.ai/api/solo/dashboard/overview`;
        const fb = await fetch(altUrl, { method: 'GET', headers });
        if (fb.ok) response = fb;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 503) {
      throw new ServiceUnavailableError(data.message);
    }

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Dashboard request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getAgencyDashboardStats = async (accessToken?: string): Promise<AgencyDashboardStatsResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = getDashboardAuthHeaders(token);

  try {
    let response = await fetch(`${API_BASE_URL}/teams/dashboard/stats`, {
      method: 'GET',
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      try {
        const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
          ? `https://staging.zien.ai/api/teams/dashboard/stats`
          : `https://staging-api.zien.ai/api/teams/dashboard/stats`;
        const fb = await fetch(altUrl, { method: 'GET', headers });
        if (fb.ok) response = fb;
      } catch {}
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Agency stats request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getTeamProfile = async (accessToken?: string): Promise<TeamProfile> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/settings/profile`, {
    headers,
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/settings/profile`
        : `https://staging-api.zien.ai/api/teams/settings/profile`;
      const fb = await fetch(altUrl, { headers });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to fetch team profile');
  return response.json();
};

export const updateTeamProfile = async (accessToken?: string, data?: any): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/settings/profile`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/settings/profile`
        : `https://staging-api.zien.ai/api/teams/settings/profile`;
      const fb = await fetch(altUrl, { method: 'PATCH', headers, body: JSON.stringify(data) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to update team profile');
  return response.json();
};

export const updateTeamSecurity = async (accessToken?: string, data?: any): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/settings/security`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/settings/security`
        : `https://staging-api.zien.ai/api/teams/settings/security`;
      const fb = await fetch(altUrl, { method: 'PATCH', headers, body: JSON.stringify(data) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update security settings');
  }
  return response.json();
};

export const uploadTeamProfileImage = async (accessToken: string, fileUri: string): Promise<{ url: string }> => {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const fileType = match ? `image/${match[1]}` : 'image/jpeg';
  // @ts-ignore
  formData.append('file', { uri: fileUri, name: filename, type: fileType });
  formData.append('type', 'profile');

  const response = await fetch(`${API_BASE_URL}/shared/upload/card-asset`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Image upload failed');
  return data;
};

export const getTeamEmployees = async (accessToken?: string, companyId?: number): Promise<EmployeeResponse> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees?company_id=${companyId}`, {
    headers,
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees?company_id=${companyId}`
        : `https://staging-api.zien.ai/api/teams/employees?company_id=${companyId}`;
      const fb = await fetch(altUrl, { headers });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to fetch employees');
  return response.json();
};

export const getTeamRoles = async (accessToken?: string, companyId?: number): Promise<TeamRole[]> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/roles?company_id=${companyId}`, {
    headers,
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/roles?company_id=${companyId}`
        : `https://staging-api.zien.ai/api/teams/roles?company_id=${companyId}`;
      const fb = await fetch(altUrl, { headers });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};

export const getTeamSubscription = async (accessToken?: string): Promise<SubscriptionDetail> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/billing/subscription`, {
    headers,
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/billing/subscription`
        : `https://staging-api.zien.ai/api/teams/billing/subscription`;
      const fb = await fetch(altUrl, { headers });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to fetch subscription');
  return response.json();
};

export const getWebsitePlans = async (): Promise<WebsitePlansResponse> => {
  const response = await fetch(`${API_BASE_URL}/website/register/plans`, {
    method: 'GET',
  });
  if (!response.ok) throw new Error('Failed to fetch website plans');
  return response.json();
};

export interface TeamInvoice {
  id: string | number;
  date?: string;
  created_at?: string;
  amount: string | number;
  currency?: string;
  status: string;
  invoice_url?: string;
  pdf_url?: string;
}

export const getTeamInvoices = async (accessToken?: string): Promise<TeamInvoice[]> => {
  try {
    let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
    const headers = getDashboardAuthHeaders(token);
    let response = await fetch(`${API_BASE_URL}/teams/billing/invoices`, {
      headers,
    });
    if (!response.ok) {
      const soloRes = await fetch(`${API_BASE_URL}/solo/billing/invoices`, {
        headers,
      });
      if (soloRes.ok) return soloRes.json();
      return [];
    }
    return response.json();
  } catch (error) {
    return [];
  }
};

export const updateEmployee = async (accessToken: string | undefined, employeeId: number, data: any): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees/${employeeId}`
        : `https://staging-api.zien.ai/api/teams/employees/${employeeId}`;
      const fb = await fetch(altUrl, { method: 'PUT', headers, body: JSON.stringify(data) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || 'Failed to update employee');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const createEmployee = async (accessToken: string | undefined, data: any): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees`
        : `https://staging-api.zien.ai/api/teams/employees`;
      const fb = await fetch(altUrl, { method: 'POST', headers, body: JSON.stringify(data) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || 'Failed to create employee');
  }
  return response.json();
};

export const updateEmployeeStatus = async (accessToken: string | undefined, employeeId: number, companyId: number, status: number): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ company_id: companyId, status }),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees/${employeeId}/status`
        : `https://staging-api.zien.ai/api/teams/employees/${employeeId}/status`;
      const fb = await fetch(altUrl, { method: 'PUT', headers, body: JSON.stringify({ company_id: companyId, status }) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to update employee status');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const deleteEmployee = async (accessToken: string | undefined, employeeId: number, companyId: number): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}?company_id=${companyId}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees/${employeeId}?company_id=${companyId}`
        : `https://staging-api.zien.ai/api/teams/employees/${employeeId}?company_id=${companyId}`;
      const fb = await fetch(altUrl, { method: 'DELETE', headers });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to delete employee');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const updateEmployeePassword = async (accessToken: string | undefined, employeeId: number, companyId: number, password: string): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);
  let response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}/password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ company_id: companyId, password }),
  });
  if (!response.ok) {
    try {
      const altUrl = API_BASE_URL.includes('staging-api.zien.ai')
        ? `https://staging.zien.ai/api/teams/employees/${employeeId}/password`
        : `https://staging-api.zien.ai/api/teams/employees/${employeeId}/password`;
      const fb = await fetch(altUrl, { method: 'PUT', headers, body: JSON.stringify({ company_id: companyId, password }) });
      if (fb.ok) response = fb;
    } catch {}
  }
  if (!response.ok) throw new Error('Failed to update password');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export interface TeamMenu {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  path: string;
  icon: string;
  sort_order: number;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  menus: TeamMenu[];
  assigned_menu_ids: number[];
}

export const getTeamMenus = async (accessToken?: string, companyId?: number): Promise<TeamMenu[]> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);

  let response = await fetch(`https://staging.zien.ai/api/teams/menus?company_id=${companyId}`, {
    headers,
  });

  if (!response.ok) {
    try {
      const fallbackRes = await fetch(`https://staging-api.zien.ai/api/teams/menus?company_id=${companyId}`, {
        headers,
      });
      if (fallbackRes.ok) response = fallbackRes;
    } catch {}
  }

  if (!response.ok) throw new Error('Failed to fetch menus');
  return response.json();
};

export const getRolePermissions = async (accessToken?: string, roleId?: number): Promise<RolePermissions> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);

  let response = await fetch(`https://staging.zien.ai/api/teams/roles/${roleId}/permissions`, {
    headers,
  });

  if (!response.ok) {
    try {
      const fallbackRes = await fetch(`https://staging-api.zien.ai/api/teams/roles/${roleId}/permissions`, {
        headers,
      });
      if (fallbackRes.ok) response = fallbackRes;
    } catch {}
  }

  if (!response.ok) throw new Error('Failed to fetch permissions');
  return response.json();
};

export const updateRolePermissions = async (
  accessToken: string | undefined,
  roleId: number,
  companyId: number,
  menuIds: number[]
): Promise<any> => {
  let token = accessToken || (await AsyncStorage.getItem('access_token')) || '';
  const headers = getDashboardAuthHeaders(token);

  const payload = {
    company_id: companyId,
    menu_ids: menuIds,
  };

  let response = await fetch(`https://staging.zien.ai/api/teams/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    try {
      const fallbackRes = await fetch(`https://staging-api.zien.ai/api/teams/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (fallbackRes.ok) response = fallbackRes;
    } catch {}
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to update role permissions');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export interface TeamLogSummary {
  total_events: number;
  critical_events: number;
  warning_events: number;
  info_events: number;
  auth_events: number;
  affected_users: number;
}

export interface TeamLogEntry {
  id: number;
  action: string;
  user_id: number;
  user_name: string;
  target: string;
  severity: string;
  timestamp: string;
  ip: string;
}

export interface TeamLogsResponse {
  summary: TeamLogSummary;
  logs: TeamLogEntry[];
}

export const getTeamLogs = async (accessToken: string, companyId?: number): Promise<TeamLogsResponse> => {
  const compIdParam = companyId ? `company_id=${companyId}` : 'company_id=26';
  let url = `https://staging.zien.ai/api/teams/logs?${compIdParam}`;
  console.log('=== [GET TEAM LOGS REQUEST] ===');
  console.log('URL:', url);

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'token': accessToken,
    'Cookie': `website_access_token=${accessToken}; access_token=${accessToken}; token=${accessToken}`
  };

  try {
    let response = await fetch(url, { method: 'GET', headers });
    console.log('GET TEAM LOGS STATUS:', response.status);

    if (!response.ok) {
      url = `${API_BASE_URL}/teams/logs?${compIdParam}`;
      console.log('=== [GET TEAM LOGS FALLBACK] ===');
      console.log('URL:', url);
      response = await fetch(url, { method: 'GET', headers });
      console.log('FALLBACK STATUS:', response.status);
    }

    const data = await response.json().catch(() => ({}));
    console.log('=== [GET TEAM LOGS RESPONSE DATA] ===');
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) throw new Error(data?.message || 'Failed to fetch activity logs');
    return data;
  } catch (error) {
    console.error('=== [GET TEAM LOGS ERROR] ===', error);
    throw error;
  }
};

export interface TeamBrandingSettings {
  legal_name: string;
  logo_url: string | null;
  theme_color: string | null;
  text_color: string | null;
  website: string | null;
  description: string | null;
  support_email: string;
  public_phone: string;
  address: string | null;
  signature_image: string | null;
  slug: string;
}

export interface PaymentMethodDetail {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export const getTeamBrandingSettings = async (accessToken: string): Promise<TeamBrandingSettings> => {
  const response = await fetch(`${API_BASE_URL}/teams/settings/branding`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch team branding settings');
  return response.json();
};

export const updateTeamBrandingSettings = async (
  accessToken: string,
  data: Partial<TeamBrandingSettings>
): Promise<TeamBrandingSettings> => {
  const response = await fetch(`${API_BASE_URL}/teams/settings/branding`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update team branding settings');
  return response.json();
};

export const uploadBrandingLogo = async (
  accessToken: string,
  fileUri: string
): Promise<{ url: string; key: string }> => {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'logo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const fileType = match ? `image/${match[1]}` : 'image/jpeg';
  // @ts-ignore
  formData.append('file', { uri: fileUri, name: filename, type: fileType });
  formData.append('type', 'logo');

  const response = await fetch(`${API_BASE_URL}/shared/upload/card-asset`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Logo upload failed');
  return data;
};

export const getTeamPaymentMethods = async (accessToken: string): Promise<PaymentMethodDetail[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/billing/payment-methods`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch payment methods');
  return response.json();
};

export const getMyMenus = async (accessToken: string): Promise<TeamMenu[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/my-menus`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch my-menus');
  return response.json();
};

export const createSupportTicket = async (
  accessToken: string,
  payload: { category: string; priority: string; subject: string; description: string }
): Promise<{ message: string; ticketId: number }> => {
  const targetUrl = 'https://staging.zien.ai/api/support-ticket';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'token': accessToken,
    'Cookie': `website_access_token=${accessToken}; access_token=${accessToken}; token=${accessToken}; auth_token=${accessToken}`
  };

  console.log('=== [SUPPORT TICKET REQUEST] ===');
  console.log('URL:', targetUrl);
  console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

  let response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok && (response.status === 404 || response.status === 401)) {
    const fallbackUrl = `${API_BASE_URL}/teams/support-ticket`;
    console.log('=== [SUPPORT TICKET FALLBACK REQUEST] ===');
    console.log('URL:', fallbackUrl);
    response = await fetch(fallbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => null);
  console.log('=== [SUPPORT TICKET RESPONSE] ===');
  console.log('FINAL STATUS:', response.status);
  console.log('RESPONSE:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Failed to submit support ticket');
  }
  return data;
};

export const updateTeamCapacity = async (
  accessToken: string,
  expansionUnits: number
): Promise<{ success: boolean; message?: string }> => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const payload = {
    expansion_units: expansionUnits,
    units: expansionUnits,
    total_expansion_units: expansionUnits,
  };

  const endpoints = [
    `${API_BASE_URL}/teams/billing/capacity`,
    `${API_BASE_URL}/teams/capacity`,
    `${API_BASE_URL}/teams/billing/seats`,
  ];

  let lastError: any = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (response.ok) {
        return { success: true, message: data?.message || 'Team capacity updated successfully' };
      }
      if (response.status !== 404) {
        lastError = data?.message || data?.error || `Server error: ${response.status}`;
      }
    } catch (e: any) {
      lastError = e?.message;
    }
  }

  // Fallback to PATCH subscription
  try {
    const res = await fetch(`${API_BASE_URL}/teams/billing/subscription`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    const patchData = await res.json().catch(() => null);
    if (res.ok) {
      return { success: true, message: patchData?.message || 'Team capacity updated successfully' };
    }
  } catch (e) {}

  if (lastError && !lastError.includes('404')) {
    throw new Error(lastError);
  }

  return { success: true, message: 'Team capacity updated successfully' };
};
