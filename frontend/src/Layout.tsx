import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';

type LayoutProps = {
    mirrorEnabled: boolean;
};

export function Layout({ mirrorEnabled }: LayoutProps) {
    return (
        <div className="flex w-full h-screen overflow-hidden text-text selection:bg-pink/30 selection:text-white">
            <Sidebar mirrorEnabled={mirrorEnabled} />
            <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
                <Outlet />
            </main>
        </div>
    );
}
