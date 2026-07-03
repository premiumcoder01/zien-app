const API_BASE_URL = 'https://staging-api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface SoloInboxEmail {
  id: number;
  user_id: number;
  recipient_email: string;
  subject: string;
  module_source: string;
  status: string;
  content_preview: string;
  created_at: string;
  updated_at: string;
}

export interface GetSoloEmailsResponse {
  success: boolean;
  data: SoloInboxEmail[];
  message?: string;
  error?: string;
}

export const MOCK_INBOX_EMAILS: SoloInboxEmail[] = [
  {
    id: 12,
    user_id: 81,
    recipient_email: "vikram.singh@pastclient.in",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:23.534Z",
    updated_at: "2026-06-26T09:50:23.534Z"
  },
  {
    id: 11,
    user_id: 81,
    recipient_email: "ananya.patel@realtorsmumbai.com",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:23.433Z",
    updated_at: "2026-06-26T09:50:23.433Z"
  },
  {
    id: 10,
    user_id: 81,
    recipient_email: "priya.mehta@homesindia.co",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:23.283Z",
    updated_at: "2026-06-26T09:50:23.283Z"
  },
  {
    id: 9,
    user_id: 81,
    recipient_email: "rahul.verma@investpro.in",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:23.135Z",
    updated_at: "2026-06-26T09:50:23.135Z"
  },
  {
    id: 8,
    user_id: 81,
    recipient_email: "aarav.sharma@realestateindia.in",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.997Z",
    updated_at: "2026-06-26T09:50:22.997Z"
  },
  {
    id: 7,
    user_id: 81,
    recipient_email: "swetasingh03052000@gmail.com",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.854Z",
    updated_at: "2026-06-26T09:50:22.854Z"
  },
  {
    id: 6,
    user_id: 81,
    recipient_email: "do_not_reply@zien.ai",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.729Z",
    updated_at: "2026-06-26T09:50:22.729Z"
  },
  {
    id: 5,
    user_id: 81,
    recipient_email: "vikram.patel@global.net",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.629Z",
    updated_at: "2026-06-26T09:50:22.629Z"
  },
  {
    id: 4,
    user_id: 81,
    recipient_email: "anjali@innovate.co.in",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.484Z",
    updated_at: "2026-06-26T09:50:22.484Z"
  },
  {
    id: 3,
    user_id: 81,
    recipient_email: "rohan@business.com",
    subject: "Welcome aboard, ! 🏡 Your real estate journey starts now",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Campaign Email Content: We are thrilled to have you onboard. Let's make your real estate journey smooth and successful!",
    created_at: "2026-06-26T09:50:22.354Z",
    updated_at: "2026-06-26T09:50:22.354Z"
  },
  {
    id: 2,
    user_id: 81,
    recipient_email: "swetasingh03052000@gmail.com",
    subject: "Welcome, ! Let’s find your perfect home 🏡",
    module_source: "CRM Campaign",
    status: "sent",
    content_preview: "Welcome Email: Let's find your perfect home. Browse our curated listings and contact your agent anytime.",
    created_at: "2026-06-26T08:53:36.761Z",
    updated_at: "2026-06-26T08:53:36.762Z"
  }
];

export const getSoloInboxEmails = async (
  accessToken: string | null
): Promise<GetSoloEmailsResponse> => {
  if (!accessToken) {
    return {
      success: true,
      data: MOCK_INBOX_EMAILS,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/solo/inbox/emails`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        data: MOCK_INBOX_EMAILS,
        message: data.message || `Server error: ${response.status}`,
        error: data.error
      };
    }

    return {
      success: true,
      data: data.data || [],
    };
  } catch (error) {
    console.warn('[InboxService] Failed to fetch emails:', error);
    return {
      success: false,
      data: MOCK_INBOX_EMAILS,
      message: 'Network connection error. Using local offline cache data.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
