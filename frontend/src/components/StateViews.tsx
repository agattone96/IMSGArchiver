type LoadingStateProps = {
    message?: string;
    className?: string;
};

export function LoadingState({ message = 'Loading...', className = 'text-muted' }: LoadingStateProps) {
    return <div className={className}>{message}</div>;
}

type ErrorStateProps = {
    message: string;
    className?: string;
};

export function ErrorState({ message, className = 'text-red-300' }: ErrorStateProps) {
    return <div className={className}>{message}</div>;
}

type EmptyStateProps = {
    message: string;
    className?: string;
};

export function EmptyState({ message, className = 'text-muted' }: EmptyStateProps) {
    return <div className={className}>{message}</div>;
}
