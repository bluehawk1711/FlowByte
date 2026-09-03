import { Loader2 } from '../../lib/icons';
import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-ink-3', className)} aria-hidden />;
}
