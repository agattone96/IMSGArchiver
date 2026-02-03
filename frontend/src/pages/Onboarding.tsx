import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, HardDrive, Lock, Shield, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface OnboardingProps {
    onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            // Call backend init here if needed
            onComplete();
        }
    };

    const steps = [
        { num: 1, label: 'Initialize', desc: 'Prepare your secure vault' },
        { num: 2, label: 'Permission', desc: 'Secure local access' },
        { num: 3, label: 'Context', desc: 'Connect message history' },
    ];

    return (
        <div className="flex h-screen w-full bg-bg0 text-text overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,42,168,0.08),transparent_70%)] pointer-events-none" />

            {/* Grid Layout - simplified to 2 columns for better spacing */}
            <div className="w-full h-full flex items-center justify-center px-16 py-12">
                <div className="w-full max-w-[1400px] grid grid-cols-[240px_1fr] gap-16 items-center relative z-10">

                    {/* LEFT: Timeline Rail */}
                    <div className="h-full flex flex-col justify-center border-r border-stroke/30 pr-8">
                        <div className="space-y-12 relative">
                            <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-pink/50 to-transparent" />

                            {steps.map((s) => {
                                const isActive = step === s.num;
                                const isDone = step > s.num;

                                return (
                                    <div key={s.num} className={`relative flex items-center gap-6 transition-all duration-500 ${isActive || isDone ? 'opacity-100' : 'opacity-30'}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-all duration-500
                                        ${isActive ? 'bg-pink text-white shadow-[0_0_20px_rgba(255,42,168,0.5)] scale-110' :
                                                isDone ? 'bg-emerald-500 text-white' : 'bg-panel border border-stroke'}`}>
                                            {isDone ? <Check className="w-5 h-5" /> : <span className="font-bold">{s.num}</span>}
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold transition-colors duration-300 ${isActive ? 'text-white' : 'text-muted'}`}>
                                                {s.label}
                                            </div>
                                            <div className="text-sm text-muted/60">{s.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CENTER: Main Content */}
                    <div className="max-w-xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="space-y-10"
                            >
                                {step === 1 && (
                                    <>
                                        <div className="space-y-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink/10 text-pink text-xs font-bold uppercase tracking-widest border border-pink/20">
                                                <Shield className="w-3 h-3" />
                                                Local-only Vault
                                            </div>

                                            <h1 className="text-[3.5rem] font-extrabold tracking-tight text-white leading-tight">
                                                Initialize your <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink to-violet">iMessage Archive</span>.
                                            </h1>

                                            <p className="text-lg text-muted/90 leading-relaxed max-w-md">
                                                Export, index, and browse locally. No cloud. No tracking.
                                                Your data stays on your device.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                                <div className="mt-1 w-8 h-8 rounded-lg bg-gradient-to-br from-green/20 to-emerald/20 flex items-center justify-center shrink-0">
                                                    <ShieldCheck className="w-4 h-4 text-green" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">Local-only processing</div>
                                                    <div className="text-sm text-muted/70">Messages never leave this machine.</div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                                <div className="mt-1 w-8 h-8 rounded-lg bg-gradient-to-br from-blue/20 to-cyan/20 flex items-center justify-center shrink-0">
                                                    <HardDrive className="w-4 h-4 text-cyan" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">Stored on this Mac</div>
                                                    <div className="text-sm text-muted/70">Saved to your secure ~/Analyzed folder.</div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleNext}
                                            className="group bg-gradient-to-r from-pink to-violet text-white px-8 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,42,168,0.3)] hover:shadow-[0_0_60px_rgba(255,42,168,0.5)]"
                                        >
                                            Initialize Archive
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <div className="space-y-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 text-cyan text-xs font-bold uppercase tracking-widest border border-cyan/20">
                                                <Lock className="w-3 h-3" />
                                                Full Disk Access
                                            </div>

                                            <h1 className="text-5xl font-extrabold tracking-tight text-white">
                                                Grant Permission
                                            </h1>

                                            <p className="text-lg text-muted/90 leading-relaxed">
                                                To read your messages database, macOS require you to grant Full Disk Access to your terminal or IDE.
                                            </p>
                                        </div>

                                        <div className="space-y-4 bg-panel border border-stroke rounded-2xl p-6">
                                            <div className="space-y-4 text-sm font-medium text-muted/80">
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">1</div>
                                                    <span>Open System Settings</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">2</div>
                                                    <span>Go to Privacy & Security &gt; Full Disk Access</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">3</div>
                                                    <span>Enable access for your Terminal / VS Code</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button onClick={() => setStep(1)} className="px-6 py-4 rounded-full font-medium text-muted hover:text-white transition-colors">
                                                Back
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:scale-105 transition-transform"
                                            >
                                                Verify Access
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {step === 3 && (
                                    <>
                                        <div className="space-y-6">
                                            <h1 className="text-5xl font-extrabold tracking-tight text-white">
                                                Ready to Index
                                            </h1>

                                            <p className="text-lg text-muted/90 leading-relaxed">
                                                Your archive will be initialized in the default location.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 font-mono text-sm text-muted">
                                            ~/Library/Application Support/Archiver/output
                                        </div>

                                        <div className="flex gap-4">
                                            <button onClick={() => setStep(2)} className="px-6 py-4 rounded-full font-medium text-muted hover:text-white transition-colors">
                                                Back
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:scale-105 transition-transform"
                                            >
                                                Enter Vault
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
}
