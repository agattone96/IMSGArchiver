import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type GlobalStats, type RecentChat } from '../api/client';

export function Dashboard() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [chats, setChats] = useState<RecentChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [statsRes, chatsRes] = await Promise.all([
                    api.getGlobalStats(),
                    api.getRecentChats({ limit: 6 })
                ]);
                if (!cancelled) {
                    setStats(statsRes);
                    setChats(chatsRes);
                }
            } catch (err: any) {
                if (!cancelled) setError(err?.message || 'Failed to load dashboard');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const cards = useMemo(() => {
        if (!stats) return [];
        return [
            { label: 'Total Messages', value: stats.total_messages.toLocaleString() },
            { label: 'Total Chats', value: stats.total_chats.toLocaleString() },
            { label: 'Top Contact', value: stats.top_contact_handle || 'N/A' },
            { label: 'Top Contact Msgs', value: stats.top_contact_count.toLocaleString() }
        ];
    }, [stats]);

    return (
        <div className="h-full overflow-y-auto p-10 bg-bg0/50 space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-muted">Quick overview of your archive.</p>
                </div>
                <Link to="/analytics" className="text-sm font-semibold text-cyan hover:text-white">View analytics →</Link>
            </div>

            {loading && <div className="text-muted">Loading dashboard data...</div>}
            {error && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-4">{error}</div>}

            {!loading && !error && stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {cards.map(card => (
                            <div key={card.label} className="rounded-2xl border border-stroke bg-panel/80 p-5">
                                <div className="text-muted text-xs uppercase tracking-wide">{card.label}</div>
                                <div className="text-2xl font-bold text-white mt-2">{card.value}</div>
                            </div>
                        ))}
                    </div>

                    <section className="rounded-2xl border border-stroke bg-panel/80 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Recent chats</h2>
                            <Link to="/messages" className="text-sm text-cyan hover:text-white">Open inbox</Link>
                        </div>

                        {chats.length === 0 ? (
                            <div className="text-muted">No chats found yet. Import data, then refresh.</div>
                        ) : (
                            <div className="space-y-2">
                                {chats.map(chat => (
                                    <div key={chat.chat_guid} className="flex items-center justify-between rounded-xl bg-bg1/70 border border-stroke px-4 py-3">
                                        <div>
                                            <div className="text-white font-medium">{chat.display_names}</div>
                                            <div className="text-xs text-muted">{chat.msg_count.toLocaleString()} messages</div>
                                        </div>
                                        <div className="text-sm text-muted">{chat.badges || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
