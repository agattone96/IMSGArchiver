import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, PieChart, Settings, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export function Sidebar() {
    const navItems = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            to: '/',
            gradient: 'from-pink/20 to-violet/20',
            iconColor: 'text-pink',
            glowColor: 'rgba(255,42,168,0.5)'
        },
        {
            icon: MessageSquare,
            label: 'Messages',
            to: '/messages',
            gradient: 'from-cyan/20 to-blue/20',
            iconColor: 'text-cyan',
            glowColor: 'rgba(6,182,212,0.5)'
        },
        {
            icon: PieChart,
            label: 'Analytics',
            to: '/analytics',
            gradient: 'from-violet/20 to-purple/20',
            iconColor: 'text-violet',
            glowColor: 'rgba(139,92,246,0.5)'
        },
        {
            icon: HardDrive,
            label: 'Media',
            to: '/media',
            gradient: 'from-pink/20 to-orange/20',
            iconColor: 'text-orange-400',
            glowColor: 'rgba(251,146,60,0.5)'
        },
    ];

    return (
        <aside className="h-screen w-[260px] flex flex-col pt-10 pb-6 px-4 bg-bg0/80 backdrop-blur-xl border-r border-stroke select-none shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>

            {/* Header */}
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink via-violet to-cyan shadow-[0_0_20px_rgba(255,42,168,0.6)] flex items-center justify-center text-white font-extrabold text-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                    <span className="relative z-10">A</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-white leading-tight">Archiver</h1>
                    <p className="text-[10px] font-medium text-muted tracking-wider uppercase">Vault v1.0</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                            isActive
                                ? "text-white bg-white/5 shadow-inner"
                                : "text-muted hover:text-white hover:bg-white/5"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-white/5 rounded-xl border border-white/5"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                {/* Enhanced Icon with Background */}
                                <div className={cn(
                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative z-10 transition-all duration-200",
                                    isActive
                                        ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                                        : "bg-white/5 group-hover:bg-white/10"
                                )}
                                    style={isActive ? { boxShadow: `0 0 20px ${item.glowColor}` } : {}}
                                >
                                    <item.icon
                                        className={cn(
                                            "w-5 h-5 transition-all duration-200",
                                            isActive ? item.iconColor : "text-muted group-hover:text-white"
                                        )}
                                        strokeWidth={2.5}
                                    />
                                </div>

                                <span className="font-semibold text-sm relative z-10">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / Settings */}
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <NavLink
                    to="/settings"
                    className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                        isActive
                            ? "text-white bg-white/5 shadow-inner"
                            : "text-muted hover:text-white hover:bg-white/5"
                    )}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/5" />
                            )}

                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative z-10 transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-br from-gray-500/20 to-gray-600/20 shadow-lg"
                                    : "bg-white/5 group-hover:bg-white/10"
                            )}
                                style={isActive ? { boxShadow: '0 0 20px rgba(156,163,175,0.4)' } : {}}
                            >
                                <Settings
                                    className={cn(
                                        "w-5 h-5 transition-all duration-500",
                                        isActive ? "text-gray-300 rotate-90" : "text-muted group-hover:text-white group-hover:rotate-90"
                                    )}
                                    strokeWidth={2.5}
                                />
                            </div>

                            <span className="font-semibold text-sm relative z-10">Settings</span>
                        </>
                    )}
                </NavLink>
            </div>
        </aside>
    );
}
