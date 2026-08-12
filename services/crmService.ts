const CRM_API_BASE_URL = 'https://api.zien.ai/api';
const REQUEST_TIMEOUT_MS = 15000;

export interface CRMOverviewResponse {
    stats: {
        totalContacts: {
            value: string;
            change: string;
        };
        totalLeads: {
            value: string;
            change: string;
        };
        pendingFollowUps: {
            value: string;
            change: string;
        };
        activeDeals: {
            value: string;
            change: string;
        };
        hotLeads: {
            value: string;
            change: string;
        };
        avgHeatIndex: {
            value: string;
            change: string;
        };
    };
    recentLeads: Array<{
        name: string;
        source: string;
        time: string;
        score: number;
    }>;
    sourceAttribution: Array<{
        source: string;
        leads: number;
        conversion: string;
        roi: string;
        color: string;
    }>;
    leadVelocity: number[];
    conversionRoi: {
        totalPipelineValue: number;
        closedWonValue: number;
        totalLeadsCount: number;
        closedWonCount: number;
        estimatedAdCost: number;
        netROI: number;
        funnel: Array<{ level: string; count: number }>;
    };
    heatIndex: {
        cold: number;
        warm: number;
        hot: number;
        scoringRules: Array<{ event: string; weight: string }>;
    };
    activityLog: Array<any>;
}

export interface CRMMetaResponse {
    groups: Array<{
        id: number;
        user_id: number;
        name: string;
        created_at: string;
        updated_at: string;
    }>;
    tags: Array<{
        id: number;
        user_id: number;
        name: string;
        tag_color: string;
        created_at: string;
        updated_at: string;
    }>;
}

export interface AddCRMContactPayload {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country_code: string;
    group_id: number;
    tag_id: number;
}

export interface CRMContact {
    id: string;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    country_code: string;
    phone: string | null;
    group_id: number;
    tag_id: number;
    status: number;
    notes: any[];
    events: any[];
    source: string | null;
    attribution: string | null;
    heat_index: number;
    heat_factors: any;
    activity_timeline: any;
    pipeline_stage: any;
    budget: any;
    timeline: any;
    pre_approved: any;
    created_at: string;
    updated_at: string;
    group: {
        id: number;
        name: string;
    };
    tag: {
        id: number;
        name: string;
        tag_color: string;
    };
    latest_note: any;
}

export interface CRMLead {
    id: string;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    country_code: string;
    phone: string;
    source: string;
    status: number;
    score: number;
    group_id: number;
    tag_id: number;
    lead_date_label: string;
    created_at: string;
    updated_at: string;
    group: {
        id: number;
        name: string;
    };
    tag: {
        id: number;
        name: string;
        tag_color: string;
    };
}

export interface CRMFollowUp {
    id: string;
    user_id: number;
    contact_id: string | null;
    subject: string;
    due_at: string;
    status: number;
    completed_at: string | null;
    group_id: number;
    tag_id: number;
    priority: string;
    created_at: string;
    updated_at: string;
    contact: any | null;
    group: {
        id: number;
        name: string;
    } | null;
    tag: {
        id: number;
        name: string;
        tag_color: string;
    } | null;
}
export interface CRMStage {
    id: string;
    name: string;
    sort_order: number;
    pipeline_id: string;
}

export interface CRMPipeline {
    id: string;
    name: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
    stages: CRMStage[];
}

export interface AddCRMDealPayload {
    contact_id: string;
    pipeline_id: string;
    stage_id: string;
    related_property: string;
    deal_value: number;
}

export interface CRMDeal {
    id: string;
    user_id: number;
    contact_id: string | null;
    pipeline_id: string;
    stage_id: string;
    related_property: string;
    deal_value: string | number;
    last_activity_at: string;
    created_at: string;
    updated_at: string;
    contact: {
        id: string;
        first_name: string;
        last_name: string | null;
        email: string;
    } | null;
    stage: CRMStage;
    pipeline: {
        id: string;
        name: string;
        sort_order: number;
    };
}

export interface CRMCampaign {
    id: string;
    user_id: number;
    template_id: string;
    name: string;
    channel: string;
    target_segment: string;
    sending_account: string;
    schedule_type: number;
    scheduled_at: string | null;
    sent_at: string | null;
    status: number;
    open_rate: string;
    click_rate: string;
    reply_rate: string;
    conversion_rate: string;
    ai_prompt: string | null;
    created_at: string;
    updated_at: string;
    template: {
        id: string;
        name: string;
        template_type: string;
    };
    ab_testing?: number | boolean;
    version_a?: string | null;
    version_b?: string | null;
}

export interface AddCRMFollowUpPayload {
    subject: string;
    contact_id: string | null;
    due_at: string;
    group_id: number | null;
    tag_id: number | null;
    priority: string;
    status: number;
}

export interface CRMAutomation {
    id: string;
    user_id: number;
    name: string;
    trigger: string;
    action: string;
    status: number;
    category: string;
    target: string;
    target_id: string | null;
    template_id: string | null;
    execution: string;
    reasoning?: string;
    icon: string;
    created_at: string;
    updated_at: string;
}





export const getCRMOverview = async (accessToken: string): Promise<CRMOverviewResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/dashboard/overview`, {
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


export const getCRMMeta = async (accessToken: string): Promise<CRMMetaResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/meta`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMGroup = async (accessToken: string, groupId: number): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/groups/${groupId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMTag = async (accessToken: string, tagId: number): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/tags/${tagId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMGroup = async (accessToken: string, name: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/groups`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMTag = async (accessToken: string, name: string, color: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/tags`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name, tag_color: color }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};



export const addCRMContact = async (accessToken: string, payload: AddCRMContactPayload): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export interface CRMContactFilters {
    q?: string;
    group_id?: number;
    tag_id?: number;
    status?: number;
}

export const getCRMContacts = async (accessToken: string, filters?: CRMContactFilters): Promise<CRMContact[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const queryParts = [];
        if (filters?.q) queryParts.push(`q=${encodeURIComponent(filters.q)}`);
        if (filters?.group_id !== undefined) queryParts.push(`group_id=${filters.group_id}`);
        if (filters?.tag_id !== undefined) queryParts.push(`tag_id=${filters.tag_id}`);
        if (filters?.status !== undefined) queryParts.push(`status=${filters.status}`);

        const url = queryParts.length > 0
            ? `${CRM_API_BASE_URL}/solo/crm/contacts?${queryParts.join('&')}`
            : `${CRM_API_BASE_URL}/solo/crm/contacts`;

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMContact = async (accessToken: string, contactId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMContactStatus = async (accessToken: string, contactId: string, status: number): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMContact = async (accessToken: string, contactId: string, payload: any): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMContactDetail = async (accessToken: string, contactId: string): Promise<CRMContact> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};
export const appendCRMNote = async (accessToken: string, contactId: string, content: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ append_note: { content } }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const appendCRMEvent = async (accessToken: string, contactId: string, title: string, date: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/${contactId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ append_event: { title, date } }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMLeads = async (accessToken: string): Promise<CRMLead[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {




        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMLead = async (accessToken: string, leadId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads/${leadId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};


export const addCRMLead = async (accessToken: string, payload: any): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMLead = async (accessToken: string, leadId: string, payload: any): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads/${leadId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const convertCRMLead = async (accessToken: string, leadId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads/${leadId}/convert`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMGroup = async (accessToken: string, groupId: number, name: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/groups/${groupId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMTag = async (accessToken: string, tagId: number, name: string, color: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/tags/${tagId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name, tag_color: color }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};
export const getCRMFollowUps = async (accessToken: string, tab?: string): Promise<CRMFollowUp[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const url = tab
            ? `${CRM_API_BASE_URL}/solo/crm/follow-ups?tab=${tab}`
            : `${CRM_API_BASE_URL}/solo/crm/follow-ups`;
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const createCRMFollowUp = async (accessToken: string, payload: AddCRMFollowUpPayload): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/follow-ups`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMFollowUp = async (accessToken: string, followUpId: string, payload: Partial<AddCRMFollowUpPayload>): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/follow-ups/${followUpId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const markCRMFollowUpDone = async (accessToken: string, followUpId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/follow-ups/${followUpId}/done`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const rescheduleCRMFollowUp = async (accessToken: string, followUpId: string, dueAt: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/follow-ups/${followUpId}/reschedule`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ due_at: dueAt }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMFollowUp = async (accessToken: string, followUpId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/follow-ups/${followUpId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMPipelines = async (accessToken: string): Promise<CRMPipeline[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/pipelines`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMDeals = async (accessToken: string, pipelineId: string): Promise<CRMDeal[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/deals?pipeline_id=${pipelineId}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMPipelineStage = async (accessToken: string, pipelineId: string, name: string): Promise<CRMStage> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/pipelines/${pipelineId}/stages`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMDeal = async (accessToken: string, payload: AddCRMDealPayload): Promise<CRMDeal> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/deals`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMPipelineStage = async (accessToken: string, stageId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/pipeline-stages/${stageId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMPipelineStage = async (accessToken: string, stageId: string, name: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/pipeline-stages/${stageId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};
export const updateCRMDealStage = async (accessToken: string, dealId: string, stageId: string): Promise<CRMDeal> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/deals/${dealId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ stage_id: stageId }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMDeal = async (accessToken: string, dealId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/deals/${dealId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMCampaigns = async (accessToken: string): Promise<CRMCampaign[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const CAMPAIGN_API_URL = `${CRM_API_BASE_URL}/solo/crm/campaigns`;
        const response = await fetch(CAMPAIGN_API_URL, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const patchCRMCampaignStatus = async (accessToken: string, campaignId: string, status: number): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const CAMPAIGN_API_URL = `${CRM_API_BASE_URL}/solo/crm/campaigns/${campaignId}`;
        const response = await fetch(CAMPAIGN_API_URL, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMCampaign = async (accessToken: string, campaignId: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const CAMPAIGN_API_URL = `${CRM_API_BASE_URL}/solo/crm/campaigns/${campaignId}`;
        const response = await fetch(CAMPAIGN_API_URL, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export interface CRMCampaignROIStreamItem {
    name: string;
    action: string;
    channel: string;
    time: string;
    score: string;
}

export interface CRMCampaignROI {
    id: string;
    name: string;
    target_segment: string;
    delivered: string;
    open_rate: string;
    click_rate: string;
    reply_rate: string;
    conversion_rate: string;
    click_through_rate: string;
    reply_velocity: string;
    unsubscribe_rate: string;
    delivery_success_rate: string;
    audience_contacts_count: number;
    audience_leads_count: number;
    has_ab_test: boolean;
    ai_insights: string;
    attributed_revenue: number;
    pipeline_value: number;
    average_deal_value: number;
    properties_influenced: any[];
    stream: CRMCampaignROIStreamItem[];
}

export const getCRMCampaignROI = async (accessToken: string, campaignId: string): Promise<CRMCampaignROI> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const CAMPAIGN_ROI_API_URL = `${CRM_API_BASE_URL}/solo/crm/campaigns/${campaignId}/roi`;
        const response = await fetch(CAMPAIGN_ROI_API_URL, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export interface CRMTemplate {
    id: string;
    user_id: number;
    name: string;
    template_type: 'email' | 'sms' | 'whatsapp';
    subject?: string | null;
    content_json: {
        components: any[];
        emailHeader?: {
            company: string;
            greeting: string;
        };
    };
    tokens_json: any | null;
    status: number;
    created_at: string;
    updated_at: string;
}

export const getCRMTemplates = async (accessToken: string): Promise<CRMTemplate[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const TEMPLATE_API_URL = `${CRM_API_BASE_URL}/solo/crm/templates?status=all`;
        const response = await fetch(TEMPLATE_API_URL, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const renderCRMTemplate = async (accessToken: string, contentJson: any): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/templates/render`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ content_json: contentJson }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Server error: ${response.status}`);
        }

        return await response.text();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMTemplate = async (accessToken: string, templateData: any): Promise<CRMTemplate> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/templates`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(templateData),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const createCRMCampaign = async (accessToken: string, campaignData: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(campaignData),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create campaign');
        }

        return await response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};
export const updateCRMCampaign = async (accessToken: string, campaignId: string, campaignData: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/campaigns/${campaignId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(campaignData),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update campaign');
        }

        return await response.json();
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const patchCRMTemplateStatus = async (accessToken: string, templateId: string, status: number): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/templates/${templateId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMTemplate = async (accessToken: string, templateId: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/templates/${templateId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const duplicateCRMTemplate = async (accessToken: string, templateId: string): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/templates/${templateId}/duplicate`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMAutomations = async (accessToken: string): Promise<CRMAutomation[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/automations`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json().catch(() => ([]));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const deleteCRMAutomation = async (accessToken: string, automationId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/automations/${automationId}`, {
            method: 'DELETE',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMAutomationStatus = async (accessToken: string, automationId: string, status: number): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/automations/${automationId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const updateCRMAutomation = async (accessToken: string, automationId: string, payload: any): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/automations/${automationId}`, {
            method: 'PATCH',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const addCRMAutomation = async (accessToken: string, payload: any): Promise<CRMAutomation> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/automations`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const analyzeContactsFile = async (
    accessToken: string,
    prompt: string,
    systemInstruction: string,
    file: { mimeType: string; data: string }
): Promise<{ result: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch('https://api.zien.ai/api/shared/ai/generate-text', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                prompt,
                systemInstruction,
                complexity: 'complex',
                file,
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('AI Analysis timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const extractContactsWithAI = async (
    accessToken: string,
    prompt: string,
    systemInstruction: string
): Promise<{ result: string } | any[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch('https://api.zien.ai/api/shared/ai/extract-data', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                prompt,
                systemInstruction,
                complexity: 'complex',
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('AI extraction timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const importCRMContacts = async (
    accessToken: string,
    contacts: any[]
): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/contacts/import`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ contacts }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Import timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const importCRMLeads = async (
    accessToken: string,
    leads: any[]
): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/leads/import`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ leads }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Import timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};


export interface CRMSettingsPayload {
    lead_distribution: string;
    auto_merge: boolean;
    inactivity_threshold: string;
    safety_limit: string;
    target_segment: string;
    reengagement_channel: string;
    protocol_identity: string;
    recovery_script: string;
    ghost_protocol: boolean;
    anniversaries: Array<{ event: string; icon: string; key: string }>;
    anniversary_settings: Record<string, boolean>;
}

export const updateCRMSettings = async (accessToken: string, payload: CRMSettingsPayload): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/settings`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getCRMSettings = async (accessToken: string): Promise<CRMSettingsPayload> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${CRM_API_BASE_URL}/solo/crm/settings`, {
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
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const generateCRMAutomationWithAI = async (
    accessToken: string,
    prompt: string,
    systemInstruction: string
): Promise<{ result: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch('https://api.zien.ai/api/shared/ai/extract-data', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                prompt,
                systemInstruction,
                complexity: 'complex',
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return data;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('AI generation timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};


