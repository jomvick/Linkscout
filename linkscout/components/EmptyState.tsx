"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-canvas flex items-center justify-center border border-border/50">
          {icon || (
            <svg className="w-6 h-6 text-text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {description && (
          <p className="text-xs text-text-secondary/50 mt-1">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
