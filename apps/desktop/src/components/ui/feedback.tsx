import type { ReactNode } from 'react';
import type { IconComponent } from '../../lib/icons';
import { cn } from '../../lib/utils';
import { Button } from './button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-8 py-16 text-center',
        className,
      )}
    >
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card">
        <Icon className="h-7 w-7 text-ink-3" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-ink-1">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  description,
  onRetry,
  details,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  details?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-8 py-16 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-ink-1">{title}</h3>
      <p className="max-w-sm text-sm text-ink-2">
        {description ?? 'Something went wrong — check your connection and try again.'}
      </p>
      {details && <p className="max-w-md text-xs text-ink-3">{details}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
