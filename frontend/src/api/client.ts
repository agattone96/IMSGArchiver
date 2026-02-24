const API_BASE = 'http://127.0.0.1:8000';

const PATH_RE = /\/(?:Users|var|private|tmp|Volumes)\/[\w\-./]+/g;

const redactPaths = (message: string) => {
    return message.replace(PATH_RE, '[redacted]');
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    try {
        const response = await fetch(`${API_BASE}${path}`, options);
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!response.ok) {
            let detail = 'API Error';
            if (isJson) {
                try {
                    const data = await response.json();
                    if (data?.detail) detail = String(data.detail);
                } catch {
                    // ignore parse errors
                }
            }
            const safeDetail = redactPaths(detail);
            console.error(safeDetail);
            throw new Error(safeDetail);
        }

        if (isJson) {
            return await response.json();
        }
        return null as T;
    } catch (err: any) {
        const safeMessage = redactPaths(err?.message || 'Network error');
        console.error(safeMessage);
        throw new Error(safeMessage);
    }
}

export interface RecentChat {
    chat_guid: string;
    display_names: string;
    msg_count: number;
    last_date: string | null;
    badges: string;
}

export interface ChatMessage {
    row_id: number;
    text: string;
    is_from_me: boolean;
    date: string;
    handle_id: string | null;
    sender_name: string | null;
}

export interface GlobalStats {
    total_messages: number;
    total_chats: number;
    top_contact_handle: string;
    top_contact_count: number;
    storage_path: string;
}

export type ArchiveFormat = 'csv' | 'json' | 'md';

export type ArchiveJobStatusType = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface ArchiveJob {
    id: string;
    type: 'archive_chat';
    chat_guid: string;
    format: ArchiveFormat;
    incremental: boolean;
    status: ArchiveJobStatusType;
    progress: number;
    processed: number;
    total: number;
    result: { path: string | null; count: number } | null;
    error: string | null;
    cancel_requested: boolean;
    created_at: string;
    updated_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export const api = {
    getOnboardingStatus: async () => {
        return await fetchJson<{ complete: boolean; step: number }>('/onboarding/status');
    },
    completeOnboarding: async () => {
        return await fetchJson<{ status: 'ok' }>('/onboarding/complete', { method: 'POST' });
    },
    getSystemStatus: async () => {
        return await fetchJson<{ status: string; version: string; storage: string }>('/system/status');
    },
    getRecentChats: async (params?: { search?: string; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return await fetchJson<RecentChat[]>(`/chats/recent${suffix}`);
    },
    getChatMessages: async (guid: string, params?: { limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return await fetchJson<ChatMessage[]>(`/chats/${encodeURIComponent(guid)}/messages${suffix}`);
    },
    getGlobalStats: async () => {
        return await fetchJson<GlobalStats>('/stats/global');
    },
    enqueueArchiveJob: async (guid: string, body?: { format?: ArchiveFormat; incremental?: boolean }) => {
        return await fetchJson<ArchiveJob>('/archive/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_guid: guid,
                format: body?.format ?? 'csv',
                incremental: body?.incremental ?? true
            })
        });
    },
    getArchiveJob: async (jobId: string) => {
        return await fetchJson<ArchiveJob>(`/archive/jobs/${encodeURIComponent(jobId)}`);
    },
    cancelArchiveJob: async (jobId: string) => {
        return await fetchJson<ArchiveJob>(`/archive/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
    }
};
