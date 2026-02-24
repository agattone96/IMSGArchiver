import { useEffect, useState } from 'react';
import { api, type ArchiveFormat, type RecentChat } from '../api/client';

export function Media() {
    const [chats, setChats] = useState<RecentChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [format, setFormat] = useState<ArchiveFormat>('csv');
    const [exporting, setExporting] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const loadChats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getRecentChats({ limit: 30 });
            setChats(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load chats for export');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChats();
    }, []);

    const exportChat = async (chat: RecentChat) => {
        setExporting(chat.chat_guid);
        setStatus(null);
        try {
            const res = await api.archiveChat(chat.chat_guid, { format, incremental: true });
            setStatus(`Exported ${res.count} messages from ${chat.display_names}${res.path ? ` → ${res.path}` : ''}`);
        } catch (err: any) {
            setStatus(err?.message || 'Export failed');
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-10 bg-bg0/50 space-y-6">
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

            {status && <div className="text-sm rounded-lg border border-stroke bg-bg1/70 p-3">{status}</div>}
            {loading && <div className="text-muted">Loading chats...</div>}
            {error && <div className="text-red-300">{error}</div>}

            {!loading && !error && chats.length === 0 && <div className="text-muted">No chats available for export.</div>}

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
                                disabled={exporting === chat.chat_guid}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-cyan/20 border border-cyan/40 hover:bg-cyan/30 disabled:opacity-60"
                            >
                                {exporting === chat.chat_guid ? 'Exporting…' : 'Export chat'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
