import type { ReactNode } from 'react';

type LoadingStateProps = {
    message: string;
    className?: string;
};

export function LoadingState({ message, className }: LoadingStateProps) {
    return <div className={className ?? 'text-muted'}>{message}</div>;
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
