const API_BASE_URL = 'https://staging.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

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
  activity: any[];
  usage: {
    overallPercentage: number;
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


export const getDashboardOverview = async (accessToken: string): Promise<DashboardOverviewResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/dashboard/overview`, {
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
      throw new Error('Dashboard request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getAgencyDashboardStats = async (accessToken: string): Promise<AgencyDashboardStatsResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/teams/dashboard/stats`, {
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
      throw new Error('Agency stats request timed out. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getTeamProfile = async (accessToken: string): Promise<TeamProfile> => {
  const response = await fetch(`${API_BASE_URL}/teams/settings/profile`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch team profile');
  return response.json();
};

export const getTeamEmployees = async (accessToken: string, companyId: number): Promise<EmployeeResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees?company_id=${companyId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch employees');
  return response.json();
};

export const getTeamRoles = async (accessToken: string, companyId: number): Promise<TeamRole[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/roles?company_id=${companyId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};

export const getTeamSubscription = async (accessToken: string): Promise<SubscriptionDetail> => {
  const response = await fetch(`${API_BASE_URL}/teams/billing/subscription`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
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

export const updateEmployee = async (accessToken: string, employeeId: number, data: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update employee');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const createEmployee = async (accessToken: string, data: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create employee');
  return response.json();
};

export const updateEmployeeStatus = async (accessToken: string, employeeId: number, companyId: number, status: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ company_id: companyId, status }),
  });
  if (!response.ok) throw new Error('Failed to update employee status');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const deleteEmployee = async (accessToken: string, employeeId: number, companyId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}?company_id=${companyId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to delete employee');
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
};

export const updateEmployeePassword = async (accessToken: string, employeeId: number, companyId: number, password: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/employees/${employeeId}/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ company_id: companyId, password }),
  });
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

export const getTeamMenus = async (accessToken: string, companyId: number): Promise<TeamMenu[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/menus?company_id=${companyId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch menus');
  return response.json();
};

export const getRolePermissions = async (accessToken: string, roleId: number): Promise<RolePermissions> => {
  const response = await fetch(`${API_BASE_URL}/teams/roles/${roleId}/permissions`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch permissions');
  return response.json();
};

export const updateRolePermissions = async (
  accessToken: string,
  roleId: number,
  companyId: number,
  menuIds: number[]
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/teams/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_id: companyId,
      menu_ids: menuIds,
    }),
  });
  if (!response.ok) throw new Error('Failed to update role permissions');
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

export const getTeamLogs = async (accessToken: string, companyId: number): Promise<TeamLogsResponse> => {
  const response = await fetch(`${API_BASE_URL}/teams/logs?company_id=${companyId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to fetch activity logs');
  return response.json();
};

export interface TeamBrandingSettings {
  legal_name: string;
  logo_url: string;
  website: string | null;
  description: string;
  support_email: string;
  public_phone: string;
  address: string;
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
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update team branding settings');
  return response.json();
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
  if (!response.ok) throw new Error('Failed to fetch user menus');
  return response.json();
};


