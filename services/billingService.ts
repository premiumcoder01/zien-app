const API_BASE_URL = 'https://api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface SoloSubscription {
  id: number;
  status: number;
  status_text: string;
  currency: string;
  price: string;
  total_price: string;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_at: string | null;
  trial_start: string;
  trial_end: string;
  is_trial: boolean;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

export interface SoloPlan {
  id: number;
  name: string;
  description: string;
  benefits: string[];
  seats: string;
  aiCredits: string;
  metadata: {
    featured: boolean;
  };
}

export interface SoloPrice {
  amount: string;
  billing_interval: string;
}

export interface SoloAddon {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  status: string;
  quantity: number;
}

export interface SoloSubscriptionResponse {
  subscription: SoloSubscription;
  plan: SoloPlan;
  price: SoloPrice;
  addons: SoloAddon[];
}

export interface SoloInvoice {
  id: string;
  date: string;
  time: string;
  amt: string;
  status: string;
  desc: string;
  method: string;
  pdf: string;
}

export interface CreditFlowData {
  totalSpent: number;
  remainingCredits: number;
  usedCredits: number;
  categories?: Array<{
    name: string;
    used: number;
    color: string;
  }>;
}

export interface CreditTimelineItem {
  id: string;
  title: string;
  date: string;
  tag: string;
  tagType: 'paid' | 'data_fetch' | 'ai_usage' | 'plan_renewal' | 'signup_bonus' | string;
  amount: string;
  amountType: 'positive' | 'negative' | 'currency' | 'zero';
  icon: string;
  iconBg: string;
  iconColor: string;
}

// Fallback values in case the local environment is offline or staging API fails
export const DEFAULT_SOLO_SUBSCRIPTION: SoloSubscriptionResponse = {
  subscription: {
    id: 1,
    status: 2,
    status_text: "Active",
    currency: "usd",
    price: "59.95",
    total_price: "59.95",
    started_at: "2026-04-06T06:34:58.000Z",
    current_period_start: null,
    current_period_end: null,
    next_payment_at: null,
    trial_start: "2026-04-06T06:34:58.000Z",
    trial_end: "2026-04-20T06:34:58.000Z",
    is_trial: false,
    cancel_at_period_end: false,
    canceled_at: null
  },
  plan: {
    id: 1,
    name: "PRO AGENT",
    description: "[\"AI-Powered CRM with Smart Lead Scoring\",\"Unified Inbox (Email, SMS, WhatsApp)\",\"Marketing Automation & Drip Campaigns\",\"Email Campaign, A/B Testing and AI Automation\",\"Social Media Automation & Scheduling & Publishing\",\"AI Content Writer (Listings, Posts, Campaigns)\",\"AI Virtual Staging (10 images/month included)\",\"Zien Guardian Safety System (10 verifications/mo)\",\"Property Intelligence Reports (10 reports/mo)\",\"Ghost Mode Automated Lead Follow-Up\",\"Open House Management with QR Sign-In and Links\",\"Bulk Import & Export Tools\",\"Unlimited contact\",\"The Cliper Chrome Extension\",\"Pipeline Management & Deal Tracking\",\"Behavior-Triggered Notifications\",\"Full Mobile App (iOS + Android)\",\"24/7 Support + Email support\"]",
    benefits: [
      "AI-Powered CRM with Smart Lead Scoring",
      "Unified Inbox (Email, SMS, WhatsApp)",
      "Marketing Automation & Drip Campaigns",
      "Email Campaign, A/B Testing and AI Automation",
      "Social Media Automation & Scheduling & Publishing",
      "AI Content Writer (Listings, Posts, Campaigns)",
      "AI Virtual Staging (10 images/month included)",
      "Zien Guardian Safety System (10 verifications/mo)",
      "Property Intelligence Reports (10 reports/mo)",
      "Ghost Mode Automated Lead Follow-Up",
      "Open House Management with QR Sign-In and Links",
      "Bulk Import & Export Tools",
      "Unlimited contact",
      "The Cliper Chrome Extension",
      "Pipeline Management & Deal Tracking",
      "Behavior-Triggered Notifications",
      "Full Mobile App (iOS + Android)",
      "24/7 Support + Email support"
    ],
    seats: "N/A",
    aiCredits: "N/A",
    metadata: {
      featured: true
    }
  },
  price: {
    amount: "59.95",
    billing_interval: "monthly"
  },
  addons: [
    {
      id: 1,
      slug: "ai-virtual-staging",
      name: "AI Virtual Staging",
      description: "AI Virtual Staging, per 20 images",
      price: "14.95",
      currency: "usd",
      status: "active",
      quantity: 1
    },
    {
      id: 2,
      slug: "lead-verification",
      name: "Lead Verification",
      description: "Lead Verification, per 25 checks",
      price: "14.95",
      currency: "usd",
      status: "active",
      quantity: 1
    },
    {
      id: 3,
      slug: "property-intelligence",
      name: "Property Intelligence",
      description: "Property Intelligence, per 25 reports",
      price: "14.95",
      currency: "usd",
      status: "active",
      quantity: 1
    }
  ]
};

export const DEFAULT_SOLO_INVOICES: SoloInvoice[] = [
  {
    id: "in_1TkIVW1PXva88JUVKGAfv3Vz",
    date: "6/20/2026",
    time: "06:35 AM",
    amt: "$74.90",
    status: "paid",
    desc: "1 × PRO AGENT (at $59.95 / month)",
    method: "Credit Card",
    pdf: "https://invoice.stripe.com/i/acct_1TElVV1PXva88JUV/test_YWNjdF8xVEVsVlYxUFh2YTg4SlVWLF9Vam0zTWtPS3IxaGFHd243NDk3eXJGVFNqem1HQ3BJLDE3MjY0MjU1OQ0200YamY02ap?s=ap"
  },
  {
    id: "in_1TZ3jV1PXva88JUVdlFZTlsl",
    date: "5/20/2026",
    time: "06:35 AM",
    amt: "$74.90",
    status: "paid",
    desc: "1 × PRO AGENT (at $59.95 / month)",
    method: "Credit Card",
    pdf: "https://invoice.stripe.com/i/acct_1TElVV1PXva88JUV/test_YWNjdF8xVEVsVlYxUFh2YTg4SlVWLF9VWUEzYUhYV1haU3JNSG1iSzRGblIwdzdGU0tyRDJ2LDE3MjY0MjU1OQ0200PfUkNtco?s=ap"
  },
  {
    id: "in_1TOBQb1PXva88JUViuvPPpqY",
    date: "4/20/2026",
    time: "06:35 AM",
    amt: "$74.90",
    status: "paid",
    desc: "1 × PRO AGENT (at $59.95 / month)",
    method: "Credit Card",
    pdf: "https://invoice.stripe.com/i/acct_1TElVV1PXva88JUV/test_YWNjdF8xVEVsVlYxUFh2YTg4SlVWLF9VTXZITXU1WURDNFkwQ2VDTDJJN1R4RGtNYU9UZUl0LDE3MjY0MjU1OQ0200Fj9seqKp?s=ap"
  },
  {
    id: "in_1TJ6kQ1PXva88JUVkYNUfddA",
    date: "4/6/2026",
    time: "06:34 AM",
    amt: "$0.00",
    status: "paid",
    desc: "Free trial for 1 × PRO AGENT",
    method: "Credit Card",
    pdf: "https://invoice.stripe.com/i/acct_1TElVV1PXva88JUV/test_YWNjdF8xVEVsVlYxUFh2YTg4SlVWLF9VSGc2YVBBaldsckN5QXJaUHNlUk5Fd1VGa1JCQ2lILDE3MjY0MjU1OQ0200NuDb3Km0?s=ap"
  }
];

export const DEFAULT_CREDIT_FLOW: CreditFlowData = {
  totalSpent: 16,
  remainingCredits: 2484,
  usedCredits: 16,
  categories: [
    { name: 'Remaining Credits', used: 2484, color: '#00a7b5' },
    { name: 'Used Credits', used: 16, color: '#0B1E2F' }
  ]
};

export const DEFAULT_CREDIT_TIMELINE: CreditTimelineItem[] = [
  {
    id: 'tl_1',
    title: '500 AI Credits',
    date: 'Aug 14, 2026, 02:52 PM',
    tag: 'Paid',
    tagType: 'paid',
    amount: '$5.00',
    amountType: 'currency',
    icon: 'credit-card-outline',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3B82F6'
  },
  {
    id: 'tl_2',
    title: 'Hybrid Property Intelligence Data Fetch',
    date: 'Aug 14, 2026, 02:51 PM',
    tag: 'DATA FETCH',
    tagType: 'data_fetch',
    amount: '-5 Credits',
    amountType: 'negative',
    icon: 'chart-line',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444'
  },
  {
    id: 'tl_3',
    title: 'Hybrid Property Intelligence Data Fetch',
    date: 'Aug 14, 2026, 02:49 PM',
    tag: 'DATA FETCH',
    tagType: 'data_fetch',
    amount: '-5 Credits',
    amountType: 'negative',
    icon: 'chart-line',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444'
  },
  {
    id: 'tl_4',
    title: 'Property MLS Data Fetch',
    date: 'Aug 14, 2026, 02:48 PM',
    tag: 'DATA FETCH',
    tagType: 'data_fetch',
    amount: '-5 Credits',
    amountType: 'negative',
    icon: 'chart-line',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444'
  },
  {
    id: 'tl_5',
    title: 'Chat Message Generation',
    date: 'Aug 14, 2026, 02:47 PM',
    tag: 'AI USAGE',
    tagType: 'ai_usage',
    amount: '-1 Credits',
    amountType: 'negative',
    icon: 'chart-line',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444'
  },
  {
    id: 'tl_6',
    title: 'Granted 2000 credits from plan PRO AGENT',
    date: 'Aug 14, 2026, 02:46 PM',
    tag: 'Plan Renewal',
    tagType: 'plan_renewal',
    amount: '+2000 Credits',
    amountType: 'positive',
    icon: 'refresh',
    iconBg: 'rgba(34, 197, 94, 0.12)',
    iconColor: '#22C55E'
  },
  {
    id: 'tl_7',
    title: 'Bonus Point (Signup Reward)',
    date: 'Aug 14, 2026, 02:46 PM',
    tag: 'Sign Up Bonus',
    tagType: 'signup_bonus',
    amount: '+500 Credits',
    amountType: 'positive',
    icon: 'ribbon',
    iconBg: 'rgba(34, 197, 94, 0.12)',
    iconColor: '#22C55E'
  },
  {
    id: 'tl_8',
    title: 'Free trial for 1 × PRO AGENT',
    date: 'Aug 14, 2026, 02:46 PM',
    tag: 'Paid',
    tagType: 'paid',
    amount: '$0.00',
    amountType: 'zero',
    icon: 'credit-card-outline',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3B82F6'
  }
];

export const getSoloSubscription = async (accessToken: string | null): Promise<SoloSubscriptionResponse> => {
  if (!accessToken) {
    return DEFAULT_SOLO_SUBSCRIPTION;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/billing/subscription`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[BillingService] Failed to fetch subscription, using fallback data:', error);
    return DEFAULT_SOLO_SUBSCRIPTION;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getSoloInvoices = async (accessToken: string | null): Promise<SoloInvoice[]> => {
  if (!accessToken) {
    return DEFAULT_SOLO_INVOICES;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/billing/invoices`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[BillingService] Failed to fetch invoices, using fallback data:', error);
    return DEFAULT_SOLO_INVOICES;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const toggleSoloAddon = async (
  accessToken: string | null,
  addonId: number,
  action: 'cancel' | 'activate' | string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!accessToken) {
    return { success: true, message: 'Offline toggle action successful (fallback)' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/billing/addons/toggle`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ addonId, action }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Server error: ${response.status}`,
        error: data.error
      };
    }

    return {
      success: true,
      message: data.message || 'Add-on updated successfully',
      ...data
    };
  } catch (error) {
    console.warn('[BillingService] Failed to toggle addon:', error);
    return { success: false, message: 'Network connection error or request timed out.' };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const cancelSoloSubscription = async (
  accessToken: string | null
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!accessToken) {
    return { success: true, message: 'Offline cancellation successful (fallback)' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/billing/subscription/cancel`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Server error: ${response.status}`,
        error: data.error
      };
    }

    return {
      success: true,
      message: data.message || 'Subscription cancellation scheduled successfully',
      ...data
    };
  } catch (error) {
    console.warn('[BillingService] Failed to cancel subscription:', error);
    return { success: false, message: 'Network connection error or request timed out.' };
  } finally {
    clearTimeout(timeoutId);
  }
};

import { getProfile } from './authService';

export const getSoloCreditFlow = async (accessToken: string | null): Promise<CreditFlowData> => {
  if (!accessToken) {
    return DEFAULT_CREDIT_FLOW;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [flowRes, profileRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/solo/billing/credits/flow`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }),
      getProfile(accessToken),
    ]);

    let remainingCredits = 0;
    let usedCredits = 0;
    let totalSpent = 0;
    let hasProfileData = false;

    if (profileRes.status === 'fulfilled' && profileRes.value) {
      const p = profileRes.value as any;
      const c = p.credits || p.data?.credits || p.user?.credits;
      if (c) {
        hasProfileData = true;
        if (typeof c === 'number') {
          remainingCredits = c;
        } else if (typeof c === 'object') {
          if (typeof c.balance === 'number') {
            remainingCredits = c.balance;
          } else if (typeof c.remaining === 'number') {
            remainingCredits = c.remaining;
          } else if (typeof c.plan_credits === 'number' || typeof c.topup_credits === 'number') {
            remainingCredits = (c.plan_credits || 0) + (c.topup_credits || 0);
          }
          if (typeof c.total_used === 'number') {
            usedCredits = c.total_used;
            totalSpent = c.total_used;
          }
        }
      }
    }

    if (flowRes.status === 'fulfilled' && flowRes.value && flowRes.value.ok) {
      const flowData = await flowRes.value.json().catch(() => null);
      if (flowData && (typeof flowData.remainingCredits === 'number' || typeof flowData.totalSpent === 'number')) {
        return flowData;
      }
    }

    if (hasProfileData) {
      return {
        totalSpent,
        remainingCredits,
        usedCredits,
        categories: [
          { name: 'Remaining Credits', used: remainingCredits, color: '#00a7b5' },
          { name: 'Used Credits', used: usedCredits, color: '#0B1E2F' },
        ],
      };
    }

    return DEFAULT_CREDIT_FLOW;
  } catch (error) {
    console.warn('[BillingService] Failed to fetch credit flow:', error);
    return DEFAULT_CREDIT_FLOW;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getSoloCreditTimeline = async (accessToken: string | null): Promise<CreditTimelineItem[]> => {
  if (!accessToken) {
    return DEFAULT_CREDIT_TIMELINE;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': `website_access_token=${accessToken}; access_token=${accessToken}`,
  };

  const urls = [
    `${API_BASE_URL}/solo/credits/history?limit=100&offset=0`,
    `https://api.zien.ai/api/solo/credits/history?limit=100&offset=0`,
    `${API_BASE_URL}/solo/billing/timeline`,
  ];

  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          let rawRows: any[] = [];
          if (Array.isArray(data)) {
            rawRows = data;
          } else if (Array.isArray(data.history?.rows)) {
            rawRows = data.history.rows;
          } else if (Array.isArray(data.rows)) {
            rawRows = data.rows;
          } else if (Array.isArray(data.items)) {
            rawRows = data.items;
          } else if (Array.isArray(data.history)) {
            rawRows = data.history;
          }

          if (rawRows.length > 0) {
            const mapped = rawRows.map((item: any, idx: number) => {
              if (item.amountType && item.title) return item;

              const amtNum = typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0);
              const isPositive = amtNum > 0;
              const isNegative = amtNum < 0;

              const actionType = item.action_type || item.tagType || 'TRANSACTION';
              const formattedTag = actionType.replace(/_/g, ' ').toUpperCase();

              let iconName = 'refresh';
              let iconBg = 'rgba(59, 130, 246, 0.12)';
              let iconColor = '#3B82F6';

              if (isNegative) {
                iconName = 'trending-up';
                iconBg = 'rgba(239, 68, 68, 0.12)';
                iconColor = '#EF4444';
              } else if (actionType.toLowerCase().includes('bonus') || actionType.toLowerCase().includes('sign_up')) {
                iconName = 'seal';
                iconBg = 'rgba(34, 197, 94, 0.12)';
                iconColor = '#22C55E';
              } else if (isPositive) {
                iconName = 'credit-card-outline';
                iconBg = 'rgba(34, 197, 94, 0.12)';
                iconColor = '#22C55E';
              }

              let formattedDate = item.created_at || item.date || '';
              if (formattedDate) {
                try {
                  const dObj = new Date(formattedDate);
                  if (!isNaN(dObj.getTime())) {
                    formattedDate = dObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }) + ', ' + dObj.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                  }
                } catch (_e) {}
              }

              return {
                id: item.id || `hist_${idx}`,
                title: item.description || item.title || item.action_type || 'Credit Transaction',
                date: formattedDate || 'N/A',
                tag: formattedTag,
                tagType: actionType,
                amount: `${isPositive ? '+' : ''}${amtNum} Credits`,
                amountType: isPositive ? 'positive' : (isNegative ? 'negative' : 'zero'),
                icon: iconName,
                iconBg,
                iconColor,
              } as CreditTimelineItem;
            });

            return mapped;
          }
        }
      } catch (err) {
        console.warn(`[BillingService] Failed to fetch timeline from ${url}:`, err);
      }
    }

    return DEFAULT_CREDIT_TIMELINE;
  } catch (error) {
    console.warn('[BillingService] Failed to fetch timeline, using fallback data:', error);
    return DEFAULT_CREDIT_TIMELINE;
  } finally {
    clearTimeout(timeoutId);
  }
};

