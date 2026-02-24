import { useEffect, useRef, useState } from 'react';
import { api, type ArchiveFormat, type ArchiveJob, type RecentChat } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';

export function Media() {
    const [chats, setChats] = useState<RecentChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [format, setFormat] = useState<ArchiveFormat>('csv');
    const [activeJob, setActiveJob] = useState<ArchiveJob | null>(null);
    const [activeChatName, setActiveChatName] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<number | null>(null);

    const loadChats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getRecentChats({ limit: 30 });
            setChats(data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load chats for export');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChats();
        return () => {
            if (toastTimer.current) window.clearTimeout(toastTimer.current);
        };
    }, []);

    const showToast = (message: string) => {
        setToast(message);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 5000);
    };

    const pollJobUntilDone = async (jobId: string, chatName: string) => {
        let keepPolling = true;
        while (keepPolling) {
            const job = await api.getArchiveJob(jobId);
            if (!job) {
                setStatus('Unable to fetch export status');
                break;
            }
            setActiveJob(job);
            if (job.status === 'completed') {
                const outPath = job.result?.path ? ` → ${job.result.path}` : '';
                showToast(`Archive complete: ${chatName}${outPath}`);
                setStatus(`Exported ${job.result?.count ?? 0} messages from ${chatName}${outPath}`);
                keepPolling = false;
            } else if (job.status === 'failed') {
                setStatus(job.error || 'Export failed');
                keepPolling = false;
            } else if (job.status === 'canceled') {
                setStatus('Export canceled');
                keepPolling = false;
            } else {
                await new Promise(resolve => setTimeout(resolve, 600));
            }
        }
        setActiveJob(null);
        setActiveChatName(null);
    };

    const exportChat = async (chat: RecentChat) => {
        setStatus(null);
        try {
            const job = await api.enqueueArchiveJob(chat.chat_guid, { format, incremental: true });
            if (!job) {
                setStatus('Unable to start export');
                return;
            }
            setActiveChatName(chat.display_names);
            setActiveJob(job);
            await pollJobUntilDone(job.id, chat.display_names);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : 'Export failed');
            setActiveJob(null);
            setActiveChatName(null);
        }
    };

    const cancelActiveJob = async () => {
        if (!activeJob) return;
        try {
            const canceled = await api.cancelArchiveJob(activeJob.id);
            if (canceled) {
                setActiveJob(canceled);
            }
        } catch (err) {
            setStatus(err instanceof Error ? err.message : 'Cancel failed');
        }
    };

    const progress = activeJob?.progress ?? 0;

    return (
        <div className="h-full overflow-y-auto p-10 bg-bg0/50 space-y-6">
            {toast && (
                <div className="fixed right-6 top-6 z-50 rounded-lg border border-cyan/40 bg-panel px-4 py-3 text-sm text-white shadow-xl">
                    {toast}
                </div>
            )}

            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Media & Exports</h1>
                <p className="text-muted">Archive chats and bundle media attachments to disk.</p>
            </div>

            <div className="rounded-2xl border border-stroke bg-panel/80 p-4 flex items-center gap-3">
                <label className="text-sm text-muted">Export format</label>
                <select
                    value={format}
                    onChange={e => setFormat(e.target.value as ArchiveFormat)}
                    className="rounded-lg bg-bg1 border border-stroke px-3 py-2 text-sm text-white outline-none"
                >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="md">Markdown</option>
                </select>
                <button onClick={loadChats} className="ml-auto rounded-lg border border-stroke px-3 py-2 text-sm text-white hover:border-cyan/50">Refresh</button>
            </div>

            {activeJob && (
                <div className="rounded-xl border border-cyan/30 bg-cyan/10 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="text-sm text-white font-semibold">{activeChatName || activeJob.chat_guid}</div>
                        <div className="text-xs text-muted uppercase">{activeJob.status}</div>
                        {(activeJob.status === 'queued' || activeJob.status === 'running') && (
                            <button
                                onClick={cancelActiveJob}
                                className="ml-auto rounded-md border border-red-300/30 px-2 py-1 text-xs text-red-200 hover:border-red-300/60"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <div className="h-2 w-full rounded bg-bg1 overflow-hidden">
                        <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-muted">
                        {progress}% · {activeJob.processed}/{activeJob.total || '?'} messages
                    </div>
                </div>
            )}

            {status && <div className="text-sm rounded-lg border border-stroke bg-bg1/70 p-3">{status}</div>}
            {loading && <LoadingState message="Loading chats..." />}
            {error && <ErrorState message={error} />}

            {!loading && !error && chats.length === 0 && <EmptyState message="No chats available for export." />}

            {!loading && !error && chats.length > 0 && (
                <div className="space-y-2">
                    {chats.map(chat => (
                        <div key={chat.chat_guid} className="rounded-xl border border-stroke bg-panel2/50 p-4 flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-white font-semibold truncate">{chat.display_names}</div>
                                <div className="text-xs text-muted">{chat.msg_count.toLocaleString()} messages · {chat.badges || 'No media badges'}</div>
                            </div>
                            <button
                                onClick={() => exportChat(chat)}
                                disabled={!!activeJob}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-cyan/20 border border-cyan/40 hover:bg-cyan/30 disabled:opacity-60"
                            >
                                {activeJob ? 'Job running…' : 'Export chat'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
