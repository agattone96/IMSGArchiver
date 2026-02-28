import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type LoadingStateProps = {
    message: string;
    className?: string;
};

export function LoadingState({ message, className }: LoadingStateProps) {
    return (
        <div
            className={cn('text-muted flex items-center gap-2', className)}
            role="status"
            aria-live="polite"
        >
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}

type ErrorStateProps = {
    message: string;
    className?: string;
};

export function ErrorState({ message, className }: ErrorStateProps) {
    return <div className={className ?? 'text-red-300'}>{message}</div>;
}

type EmptyStateProps = {
    message: ReactNode;
    className?: string;
};

export function EmptyState({ message, className }: EmptyStateProps) {
    return <div className={className ?? 'text-muted'}>{message}</div>;
}

type SuccessStateProps = {
    message: ReactNode;
    className?: string;
};

export function SuccessState({ message, className }: SuccessStateProps) {
    return <div className={className ?? 'text-emerald-300'}>{message}</div>;
}

type RestrictedStateProps = {
    message: ReactNode;
    className?: string;
};

export function RestrictedState({ message, className }: RestrictedStateProps) {
    return <div className={className ?? 'text-amber-300'}>{message}</div>;
}
