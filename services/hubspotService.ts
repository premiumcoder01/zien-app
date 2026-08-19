const CRM_API_BASE_URL = 'https://staging.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

// ── Types ──────────────────────────────────────────────────────────

export interface HubSpotAuthResponse {
    url: string;
}

export interface GenericIntegrationStatusResponse {
    connected: boolean;
    [key: string]: any;
}

export interface HubSpotStatusResponse {
    connected: boolean;
    portalId: string | null;
    sync_push: boolean;
    sync_pull: boolean;
    settings: {
        default_group_id: number | null;
        default_tag_id: number | null;
    };
}

export interface HubSpotSyncResponse {
    success: boolean;
    count: number;
}

export interface HubSpotSettingsPayload {
    sync_push: boolean;
    sync_pull: boolean;
    settings: {
        default_group_id: number | null;
        default_tag_id: number | null;
    };
}

export interface HubSpotDisconnectResponse {
    ok: boolean;
}

// ── Helper ──────────────────────────────────────────────────────────

function createFetchOptions(accessToken: string, method: string = 'GET', body?: object) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const options: RequestInit = {
        method,
        signal: controller.signal,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
    };
    if (body) options.body = JSON.stringify(body);
    return { controller, timeoutId, options };
}

async function handleResponse<T>(response: Response, timeoutId: ReturnType<typeof setTimeout>): Promise<T> {
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any).message || `Server error: ${response.status} ${response.statusText}`);
    }
    return data as T;
}

function handleError(error: unknown): never {
    if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
}

// ── API Functions ────────────────────────────────────────────────────

/**
 * GET /integrations/hubspot/auth
 * Returns the OAuth URL to redirect the user to HubSpot authorization.
 */
export const getHubSpotAuthUrl = async (accessToken: string): Promise<HubSpotAuthResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const redirectUri = encodeURIComponent('zien://crm/integrations');
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/hubspot/auth?redirect_uri=${redirectUri}&platform=mobile`, options);
        return handleResponse<HubSpotAuthResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * GET /integrations/hubspot/status
 * Checks the current HubSpot connection status and settings.
 */
export const getHubSpotStatus = async (accessToken: string): Promise<HubSpotStatusResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/hubspot/status`, options);
        return handleResponse<HubSpotStatusResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * POST /integrations/hubspot/sync
 * Triggers a manual sync of contacts from HubSpot.
 */
export const triggerHubSpotSync = async (accessToken: string): Promise<HubSpotSyncResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken, 'POST');
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/hubspot/sync`, options);
        return handleResponse<HubSpotSyncResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

export interface IntegrationSettingsPayload {
    sync_push?: boolean;
    sync_pull?: boolean;
    settings?: {
        default_group_id?: number | null;
        default_tag_id?: number | null;
        [key: string]: any;
    };
}

/**
 * POST /solo/crm/integrations/:provider/settings
 * Updates integration sync settings (push/pull toggles, default group/tag).
 */
export const updateIntegrationSettings = async (
    provider: string,
    accessToken: string,
    payload: IntegrationSettingsPayload
): Promise<any> => {
    const { timeoutId, options } = createFetchOptions(accessToken, 'POST', payload);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/${provider}/settings`, options);
        return handleResponse<any>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * POST /solo/crm/integrations/:provider/sync
 * Triggers a manual sync for the given provider.
 */
export const triggerIntegrationSync = async (
    provider: string,
    accessToken: string
): Promise<any> => {
    const { timeoutId, options } = createFetchOptions(accessToken, 'POST');
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/${provider}/sync`, options);
        return handleResponse<any>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * POST /integrations/hubspot/settings
 * Updates HubSpot sync settings (push/pull toggles, default group/tag).
 */
export const updateHubSpotSettings = async (accessToken: string, payload: HubSpotSettingsPayload): Promise<HubSpotSettingsPayload> => {
    return updateIntegrationSettings('hubspot', accessToken, payload);
};

/**
 * DELETE /integrations/hubspot
 * Disconnects the HubSpot integration entirely.
 */
export const disconnectHubSpot = async (accessToken: string): Promise<HubSpotDisconnectResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken, 'DELETE');
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/hubspot`, options);
        return handleResponse<HubSpotDisconnectResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * GET /integrations/zoho/status
 * Checks the current Zoho CRM connection status.
 */
export const getZohoStatus = async (accessToken: string): Promise<GenericIntegrationStatusResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/zoho/status`, options);
        return handleResponse<GenericIntegrationStatusResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * GET /integrations/pipedrive/status
 * Checks the current Pipedrive connection status.
 */
export const getPipedriveStatus = async (accessToken: string): Promise<GenericIntegrationStatusResponse> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/pipedrive/status`, options);
        return handleResponse<GenericIntegrationStatusResponse>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * GET /integrations/zoho/auth
 * Returns OAuth authorization URL for Zoho CRM.
 */
export const getZohoAuthUrl = async (accessToken: string): Promise<{ url: string }> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/zoho/auth`, options);
        return handleResponse<{ url: string }>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * GET /integrations/pipedrive/auth
 * Returns OAuth authorization URL for Pipedrive.
 */
export const getPipedriveAuthUrl = async (accessToken: string): Promise<{ url: string }> => {
    const { timeoutId, options } = createFetchOptions(accessToken);
    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/integrations/pipedrive/auth`, options);
        return handleResponse<{ url: string }>(response, timeoutId);
    } catch (error) {
        return handleError(error);
    }
};
