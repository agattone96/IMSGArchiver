import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ErrorState, LoadingState, SuccessState } from '../components/StateViews';

type SettingsProps = {
    mirrorEnabled: boolean;
    onMirrorEnabledChange: (enabled: boolean) => void;
};

export function Settings({ mirrorEnabled, onMirrorEnabledChange }: SettingsProps) {
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [mirrorLoading, setMirrorLoading] = useState(false);
    const [mirrorMessage, setMirrorMessage] = useState<string | null>(null);
    const [mirrorError, setMirrorError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadMirrorStatus = async () => {
            setMirrorLoading(true);
            setMirrorError(null);
            try {
                const status = await api.getMirrorStatus();
                if (!cancelled && status) onMirrorEnabledChange(status.enabled);
            } catch (err) {
                if (!cancelled) setMirrorError(err instanceof Error ? err.message : 'Failed to load mirror status');
            } finally {
                if (!cancelled) setMirrorLoading(false);
            }
        };
        loadMirrorStatus();
        return () => {
            cancelled = true;
        };
    }, [onMirrorEnabledChange]);

    const toggleMirror = async () => {
        setMirrorLoading(true);
        setMirrorError(null);
        setMirrorMessage(null);
        try {
            const next = mirrorEnabled ? await api.disableMirror() : await api.enableMirror();
            const enabled = Boolean(next?.enabled);
            onMirrorEnabledChange(enabled);
            setMirrorMessage(enabled ? 'Success: Forensic Mirror Mode enabled.' : 'Success: Forensic Mirror Mode disabled.');
        } catch (err) {
            setMirrorError(err instanceof Error ? err.message : 'Unable to toggle mirror mode.');
        } finally {
            setMirrorLoading(false);
        }
    };

    const handleCompleteCleanup = async () => {
        const confirmed = window.confirm(
            '⚠️ COMPLETE APP WIPE\n\n' +
            'This will:\n' +
            '1. Export all logs to Downloads (zipped)\n' +
            '2. Kill the backend\n' +
            '3. Delete ALL app data\n' +
            '4. Quit the app\n\n' +
            'This action cannot be undone.\n\n' +
            'Continue?'
        );

        if (!confirmed) return;

        setIsCleaningUp(true);
        try {
            const result = await (window as any).electron.invoke('complete-cleanup');
            if (result.success) {
                // App will quit automatically
            } else {
                alert(`Cleanup failed: ${result.error}`);
                setIsCleaningUp(false);
            }
        } catch (error) {
            alert(`Cleanup error: ${error}`);
            setIsCleaningUp(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-10 bg-bg0/50">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-4xl font-bold text-white mb-8">Settings</h1>

                <div className="bg-panel border border-stroke rounded-3xl p-6 backdrop-blur-md space-y-6">
                    <h2 className="text-xl font-bold text-white">General</h2>

                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                        <div>
                            <div className="font-medium text-white">Theme</div>
                            <div className="text-sm text-muted">Customize the look and feel</div>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg text-sm">System</div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                        <div>
                            <div className="font-medium text-white">Export Path</div>
                            <div className="text-sm text-muted">Where your archives are saved</div>
                        </div>
                        <button className="text-pink hover:text-pink2 text-sm font-medium">Change</button>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-white/5 gap-6">
                        <div>
                            <div className="font-medium text-white">Enable Forensic Mirror Mode</div>
                            <div className="text-sm text-muted">
                                Capture message revisions for Archived Messages, Edit History, and Deleted Messages views.
                            </div>
                        </div>
                        <button
                            onClick={toggleMirror}
                            disabled={mirrorLoading}
                            className={`min-w-28 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                mirrorEnabled ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {mirrorLoading ? 'Saving...' : mirrorEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                    </div>

                    {mirrorLoading && <LoadingState message="Loading: Checking mirror status…" className="text-sm" />}
                    {mirrorError && <ErrorState message={`Error: ${mirrorError}`} className="text-sm" />}
                    {mirrorMessage && <SuccessState message={mirrorMessage} className="text-sm" />}

                    <div className="pt-4">
                        <button
                            onClick={handleCompleteCleanup}
                            disabled={isCleaningUp}
                            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCleaningUp ? 'Cleaning up...' : '🗑️  Complete App Cleanup & Reset'}
                        </button>
                        <p className="text-xs text-muted/60 mt-2 text-center">
                            Exports logs to Downloads, wipes all data, quits app
                        </p>
                    </div>
                </div>

                <div className="text-center text-xs text-muted">
                    Archiver v1.0.0 • Antigravity
                </div>
            </div>
        </div>
    );
}
