import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';

export function Layout() {
    return (
        <div className="flex w-full h-screen overflow-hidden text-text selection:bg-pink/30 selection:text-white">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
                <Outlet />
            </main>
        </div>
    );
}
