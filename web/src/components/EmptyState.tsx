import clsx from 'clsx';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, className, action }: EmptyStateProps) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center py-20 px-6',
      'text-ink-muted',
      className,
    )}>
      {icon && <div className="text-4xl opacity-40 mb-3">{icon}</div>}
      {title && <div className="text-sm font-medium text-ink-soft mb-1">{title}</div>}
      {description && <div className="text-xs max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
