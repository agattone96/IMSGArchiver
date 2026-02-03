import { useState } from 'react';

export function Settings() {
    const [isCleaningUp, setIsCleaningUp] = useState(false);

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
