import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, type GlobalStats } from '../api/client';

export function Analytics() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getGlobalStats();
                if (!cancelled) setStats(data);
            } catch (err: any) {
                if (!cancelled) setError(err?.message || 'Failed to load analytics');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const chartData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Total messages', value: stats.total_messages },
            { name: 'Total chats', value: stats.total_chats },
            { name: 'Top contact msgs', value: stats.top_contact_count }
        ];
    }, [stats]);

    return (
        <div className="h-full overflow-y-auto p-10 bg-bg0/50 space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-muted">High-level usage and archive metrics.</p>
            </div>

            {loading && <div className="text-muted">Loading analytics...</div>}
            {error && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-4">{error}</div>}

            {!loading && !error && stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-stroke bg-panel/80 p-5">
                            <div className="text-muted text-xs uppercase">Top contact</div>
                            <div className="text-xl text-white font-semibold mt-2">{stats.top_contact_handle || 'N/A'}</div>
                        </div>
                        <div className="rounded-2xl border border-stroke bg-panel/80 p-5">
                            <div className="text-muted text-xs uppercase">Messages archived</div>
                            <div className="text-xl text-white font-semibold mt-2">{stats.total_messages.toLocaleString()}</div>
                        </div>
                        <div className="rounded-2xl border border-stroke bg-panel/80 p-5">
                            <div className="text-muted text-xs uppercase">Storage path</div>
                            <div className="text-sm text-white font-medium mt-2 break-all">{stats.storage_path}</div>
                        </div>
                    </div>

                    {chartData.length > 0 ? (
                        <section className="rounded-2xl border border-stroke bg-panel/80 p-5">
                            <h2 className="text-lg font-semibold text-white mb-4">Key metrics chart</h2>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2c40" />
                                        <XAxis dataKey="name" stroke="#84889c" />
                                        <YAxis stroke="#84889c" />
                                        <Tooltip contentStyle={{ background: '#131421', border: '1px solid #2a2c40' }} />
                                        <Bar dataKey="value" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    ) : (
                        <div className="text-muted">No analytics data available.</div>
                    )}
                </>
            )}
        </div>
    );
}
