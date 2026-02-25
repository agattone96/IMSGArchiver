import { useEffect, useMemo, useState } from 'react';
import { api, type TimelineRevision } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { TextDiffRenderer } from './TextDiffRenderer';

type MessageTimelineProps = {
    heading: string;
    description: string;
    restrictedReason: string;
    mirrorEnabled: boolean;
};

export function MessageTimeline({ heading, description, restrictedReason, mirrorEnabled }: MessageTimelineProps) {
    const [guid, setGuid] = useState('');
    const [queryGuid, setQueryGuid] = useState('');
    const [timeline, setTimeline] = useState<TimelineRevision[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!mirrorEnabled || !queryGuid.trim()) {
            setTimeline([]);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const rows = await api.getMessageTimeline(queryGuid.trim());
                if (!cancelled) setTimeline(rows ?? []);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Timeline lookup failed.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [queryGuid, mirrorEnabled]);

    const revisions = useMemo(
        () => timeline.map((row, idx) => ({ current: row, previous: idx > 0 ? timeline[idx - 1] : null })),
        [timeline]
    );

    return (
        <div className="h-full overflow-hidden bg-bg0/50 p-8 flex flex-col gap-6">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">{heading}</h1>
                <p className="text-muted">{description}</p>
            </div>

            <section className="rounded-2xl border border-stroke bg-panel/80 p-4 flex flex-col gap-4 min-h-0">
                <div className="flex gap-3">
                    <input
                        value={guid}
                        onChange={e => setGuid(e.target.value)}
                        placeholder="chat-guid:message-row-id"
                        className="flex-1 rounded-lg bg-bg1 border border-stroke px-3 py-2 text-sm text-white outline-none focus:border-cyan"
                        disabled={!mirrorEnabled}
                    />
                    <button
                        onClick={() => setQueryGuid(guid)}
                        disabled={!mirrorEnabled || !guid.trim()}
                        className="rounded-lg px-4 py-2 text-sm font-semibold bg-cyan/20 text-cyan hover:bg-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Load Timeline
                    </button>
                </div>

                {!mirrorEnabled && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="text-amber-300 font-medium">Restricted</div>
                        <div className="text-amber-100/90 text-sm mt-1">{restrictedReason}</div>
                    </div>
                )}

                {mirrorEnabled && !queryGuid && (
                    <div className="rounded-xl border border-stroke bg-bg1/60 p-4">
                        <EmptyState message="Success: Forensic Mirror Mode is active. Enter a GUID to inspect a full revision timeline." />
                    </div>
                )}

                {mirrorEnabled && queryGuid && loading && (
                    <div className="rounded-xl border border-stroke bg-bg1/60 p-4">
                        <LoadingState message="Loading: Building revision timeline from forensic mirror…" />
                    </div>
                )}

                {mirrorEnabled && queryGuid && error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                        <ErrorState message={`Error: ${error}`} />
                    </div>
                )}

                {mirrorEnabled && queryGuid && !loading && !error && timeline.length === 0 && (
                    <div className="rounded-xl border border-stroke bg-bg1/60 p-4">
                        <EmptyState message="Empty: No mirrored revisions exist for this GUID yet." />
                    </div>
                )}

                {mirrorEnabled && queryGuid && !loading && !error && timeline.length > 0 && (
                    <div className="overflow-y-auto min-h-0 space-y-3 pr-1">
                        {revisions.map(({ current, previous }) => (
                            <article key={current.id} className="rounded-xl border border-stroke bg-bg1/70 p-4 space-y-2">
                                <div className="text-xs text-muted">
                                    Revision #{current.id} · timestamp {current.revision_timestamp} · source row {current.source_message_row_id ?? 'n/a'}
                                </div>
                                {!previous && (
                                    <p className="text-sm text-white whitespace-pre-wrap break-words">{current.text || '[No text]'} </p>
                                )}
                                {previous && (
                                    <TextDiffRenderer before={previous.text || ''} after={current.text || ''} />
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
