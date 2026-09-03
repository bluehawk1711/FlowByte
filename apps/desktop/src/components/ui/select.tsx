import { ChevronDown } from '../../lib/icons';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/**
 * Themed native select (styled trigger + chevron, keeps OS dropdown menu).
 */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(({ className, wrapperClassName, children, ...props }, ref) => (
  <div className={cn('relative inline-flex items-center', wrapperClassName)}>
    <select
      ref={ref}
      {...props}
      className={cn(
        'h-9 w-full cursor-pointer appearance-none rounded-md border border-line bg-card py-0 pl-3 pr-8 text-sm text-ink-1 outline-none transition-colors focus:border-accent',
        className,
      )}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2.5 h-4 w-4 text-ink-3"
      aria-hidden
    />
  </div>
));
Select.displayName = 'Select';
