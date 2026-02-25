import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Layout } from './Layout';
import { Onboarding } from './pages/Onboarding';
import { api } from './api/client';
import { Dashboard } from './pages/Dashboard';

import { Messages } from './pages/Messages';
import { Analytics } from './pages/Analytics';
import { Media } from './pages/Media';
import { Settings } from './pages/Settings';
import { ArchivedMessages } from './pages/ArchivedMessages';
import { EditHistory } from './pages/EditHistory';
import { DeletedMessages } from './pages/DeletedMessages';

const HAS_ONBOARDED_KEY = 'archiver_has_onboarded';

function App() {
    const [checking, setChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [mirrorEnabled, setMirrorEnabled] = useState(false);
    const needsOnboardingRef = useRef(false);
    const openQueueRef = useRef<Array<{ argv: string[]; cwd: string; timestamp: number }>>([]);

    const handleOpenRequest = (payload: { argv: string[]; cwd: string; timestamp: number }) => {
        console.log('Open request:', payload);
        window.location.hash = '#/';
    };

    const flushOpenQueue = () => {
        while (openQueueRef.current.length > 0) {
            const payload = openQueueRef.current.shift();
            if (payload) handleOpenRequest(payload);
        }
    };

    useEffect(() => {
        const electron = (window as any)?.electron;
        if (electron?.send) {
            electron.send('renderer-ready');
        }
        if (electron?.on) {
            electron.on('app:open-request', (payload: { argv: string[]; cwd: string; timestamp: number }) => {
                if (needsOnboardingRef.current) {
                    openQueueRef.current.push(payload);
                } else {
                    handleOpenRequest(payload);
                }
            });
        }
    }, []);

    useEffect(() => {
        needsOnboardingRef.current = needsOnboarding;
        if (!needsOnboarding) {
            flushOpenQueue();
        }
    }, [needsOnboarding]);

    useEffect(() => {
        let hasLocal = false;
        try {
            hasLocal = localStorage.getItem(HAS_ONBOARDED_KEY) === 'true';
        } catch {
            hasLocal = false;
        }

        if (hasLocal) {
            setNeedsOnboarding(false);
            setChecking(false);
            return;
        }

        api.getOnboardingStatus().then(status => {
            if (status?.complete) {
                try {
                    localStorage.setItem(HAS_ONBOARDED_KEY, 'true');
                } catch {
                    // ignore
                }
                setNeedsOnboarding(false);
            } else {
                setNeedsOnboarding(true);
            }
            setChecking(false);
        }).catch(() => {
            console.error('Backend unreachable');
            setNeedsOnboarding(true);
            setChecking(false);
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadMirrorStatus = async () => {
            try {
                const status = await api.getMirrorStatus();
                if (!cancelled && status) setMirrorEnabled(status.enabled);
            } catch {
                if (!cancelled) setMirrorEnabled(false);
            }
        };
        loadMirrorStatus();
        return () => {
            cancelled = true;
        };
    }, []);

    if (checking) {
        return (
            <div className="h-screen w-full bg-bg0 flex items-center justify-center text-pink font-mono animate-pulse">
                Initializing Vault...
            </div>
        );
    }

    if (needsOnboarding) {
        return <Onboarding onComplete={() => setNeedsOnboarding(false)} />;
    }

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Layout mirrorEnabled={mirrorEnabled} />}>
                    <Route index element={<Dashboard />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="media" element={<Media />} />
                    <Route path="settings" element={<Settings mirrorEnabled={mirrorEnabled} onMirrorEnabledChange={setMirrorEnabled} />} />
                    <Route
                        path="archived-messages"
                        element={mirrorEnabled ? <ArchivedMessages mirrorEnabled={mirrorEnabled} /> : <Navigate to="/settings" replace />}
                    />
                    <Route
                        path="edit-history"
                        element={mirrorEnabled ? <EditHistory mirrorEnabled={mirrorEnabled} /> : <Navigate to="/settings" replace />}
                    />
                    <Route
                        path="deleted-messages"
                        element={mirrorEnabled ? <DeletedMessages mirrorEnabled={mirrorEnabled} /> : <Navigate to="/settings" replace />}
                    />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
