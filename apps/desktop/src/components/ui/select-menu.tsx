import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from '../../lib/icons';
import { cn } from '../../lib/utils';

/**
 * Themed dropdown select (shadcn-style, Radix-powered). Replaces the plain
 * native selects — keyboard accessible, portal-based menu, searchable by typing.
 */
export interface SelectMenuOption {
  value: string;
  label: string;
}

export function SelectMenu<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-line bg-card px-3 text-sm text-ink-1 outline-none transition-colors',
          'focus:border-accent focus:ring-2 focus:ring-accent/30 data-[placeholder]:text-ink-3',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="shrink-0 text-ink-3">
          <ChevronDown className="h-4 w-4" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'animate-fade-in-up z-[150] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-y-auto overflow-x-hidden rounded-lg border border-line bg-elevated p-1 shadow-elev-3',
          )}
        >
          <RadixSelect.Viewport>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-1 outline-none',
                  'data-[highlighted]:bg-white/8 data-[state=checked]:text-accent-hover',
                )}
              >
                <RadixSelect.ItemIndicator className="shrink-0 text-accent">
                  <Check className="h-3.5 w-3.5" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
