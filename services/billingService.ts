const API_BASE_URL = 'https://staging-api.zien.ai/api';
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
