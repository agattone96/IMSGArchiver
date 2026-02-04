import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { api } from '../api/client';
import noiseUrl from '../assets/noise.svg';

const HAS_ONBOARDED_KEY = 'archiver_has_onboarded';
const THEME_KEY = 'archiver_theme';
const UPDATES_KEY = 'archiver_updates';

type Step = 'welcome' | 'permissions' | 'privacy' | 'defaults';

type OnboardingProps = {
    onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState<Step>('welcome');
    const [storagePath, setStoragePath] = useState('~/Analyzed');
    const [theme, setTheme] = useState<'system' | 'dark'>('system');
    const [updates, setUpdates] = useState<'auto' | 'manual'>('auto');

    useEffect(() => {
        api.getSystemStatus()
            .then((status) => {
                if (status?.storage) setStoragePath(status.storage);
            })
            .catch(() => {
                // Ignore; keep default
            });
    }, []);

    const totalSteps = 4;
    const stepIndex =
        step === 'welcome' ? 1 : step === 'permissions' ? 2 : step === 'privacy' ? 3 : 4;

    const persistFlag = () => {
        try {
            localStorage.setItem(HAS_ONBOARDED_KEY, 'true');
            localStorage.setItem(THEME_KEY, theme);
            localStorage.setItem(UPDATES_KEY, updates);
        } catch {
            // Ignore storage errors
        }
    };

    const finish = async () => {
        persistFlag();
        try {
            await api.completeOnboarding();
        } catch {
            // Backend may be unavailable; still proceed
        }
        onComplete();
    };

    const handleContinue = () => {
        if (step === 'welcome') setStep('permissions');
        else if (step === 'permissions') setStep('privacy');
        else if (step === 'privacy') setStep('defaults');
        else finish();
    };

    const handleBack = () => {
        if (step === 'permissions') setStep('welcome');
        if (step === 'privacy') setStep('permissions');
        if (step === 'defaults') setStep('privacy');
    };

    const openFullDiskAccess = async () => {
        const electron = (window as any)?.electron;
        if (electron?.invoke) {
            try {
                await electron.invoke('open-full-disk-access');
            } catch {
                // Ignore failures; user can open manually
            }
        }
    };

    const handleSkip = () => {
        finish();
    };

    return (
        <div className="min-h-screen w-full bg-bg0 text-text flex items-center justify-center p-6 relative overflow-hidden">
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: `url(${noiseUrl})`, backgroundRepeat: 'repeat' }}
            />
            <div className="w-full max-w-2xl bg-panel/80 border border-stroke rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-muted tracking-wide">
                        Step {stepIndex} of {totalSteps}
                    </div>
                    <button
                        onClick={handleSkip}
                        className="text-sm text-muted hover:text-white transition-colors"
                    >
                        Skip setup
                    </button>
                </div>

                <div className="mt-6">
                    {step === 'welcome' && (
                        <div className="space-y-4">
                            <h1 className="text-3xl font-bold text-white">Welcome to Archiver</h1>
                            <p className="text-muted text-base">
                                Archive and explore your iMessage history locally, fast, and private.
                            </p>
                        </div>
                    )}

                    {step === 'permissions' && (
                        <div className="space-y-4">
                            <h1 className="text-3xl font-bold text-white">Allow Full Disk Access</h1>
                            <p className="text-muted text-base">
                                Archiver needs <strong className="text-white">Full Disk Access</strong> to read your local Messages database.
                            </p>
                            <div className="bg-bg1/60 border border-stroke rounded-xl p-4 space-y-2">
                                <div className="text-xs uppercase tracking-wide text-muted">Steps</div>
                                <ol className="list-decimal list-inside text-sm text-muted space-y-1">
                                    <li>Open Full Disk Access settings</li>
                                    <li>Enable Archiver</li>
                                    <li>Quit and re-open Archiver</li>
                                </ol>
                                <button
                                    onClick={openFullDiskAccess}
                                    className="mt-3 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-semibold hover:brightness-110 transition-all"
                                >
                                    Open Full Disk Access Settings
                                </button>
                            </div>
                            <p className="text-xs text-muted">
                                If you skip this, imports may fail until access is granted.
                            </p>
                        </div>
                    )}

                    {step === 'privacy' && (
                        <div className="space-y-4">
                            <h1 className="text-3xl font-bold text-white">Privacy & Data Location</h1>
                            <p className="text-muted text-base">
                                Your data never leaves this Mac. Archives are stored locally for your control.
                            </p>
                            <div className="bg-bg1/60 border border-stroke rounded-xl p-4">
                                <div className="text-xs uppercase tracking-wide text-muted">Storage Location</div>
                                <div className="mt-2 font-mono text-sm text-white break-all">{storagePath}</div>
                                <div className="mt-2 text-xs text-muted">
                                    You can change this later in Settings.
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'defaults' && (
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Defaults</h1>
                                <p className="text-muted text-base">Choose your preferred defaults. You can change these later.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-semibold text-white">Theme</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setTheme('system')}
                                        className={cn(
                                            'rounded-xl border px-4 py-3 text-sm transition-colors',
                                            theme === 'system'
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-bg1/60 border-stroke text-muted hover:text-white'
                                        )}
                                    >
                                        System
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={cn(
                                            'rounded-xl border px-4 py-3 text-sm transition-colors',
                                            theme === 'dark'
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-bg1/60 border-stroke text-muted hover:text-white'
                                        )}
                                    >
                                        Dark
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-semibold text-white">Updates</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setUpdates('auto')}
                                        className={cn(
                                            'rounded-xl border px-4 py-3 text-sm transition-colors',
                                            updates === 'auto'
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-bg1/60 border-stroke text-muted hover:text-white'
                                        )}
                                    >
                                        Automatic
                                    </button>
                                    <button
                                        onClick={() => setUpdates('manual')}
                                        className={cn(
                                            'rounded-xl border px-4 py-3 text-sm transition-colors',
                                            updates === 'manual'
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-bg1/60 border-stroke text-muted hover:text-white'
                                        )}
                                    >
                                        Manual
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={step === 'welcome'}
                        className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-muted"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleContinue}
                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-pink to-violet text-white text-sm font-semibold hover:brightness-110 transition-all"
                    >
                        {step === 'defaults' ? 'Finish' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
