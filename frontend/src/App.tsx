import { HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { Onboarding } from './pages/Onboarding';
import { api } from './api/client';
import { Dashboard } from './pages/Dashboard';

import { Messages } from './pages/Messages';
import { Analytics } from './pages/Analytics';
import { Media } from './pages/Media';
import { Settings } from './pages/Settings';

function App() {
    const [checking, setChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        api.getOnboardingStatus().then(status => {
            setNeedsOnboarding(!status.complete);
            setChecking(false);
        }).catch(() => {
            // If backend fails, assume valid for now or show error screen?
            // For now, let's assume valid to allow debug, or show error.
            // Ideally we retry.
            console.error("Backend unreachable");
            setChecking(false); // Fallback
        });
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
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="media" element={<Media />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
