import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        accent:
          'bg-accent text-accent-fg shadow-elev-1 hover:bg-accent-hover active:bg-accent-press',
        secondary:
          'border border-line bg-card text-ink-1 hover:bg-elevated hover:text-ink-1',
        ghost: 'text-ink-2 hover:bg-white/8 hover:text-ink-1',
        outline: 'border border-line-strong text-ink-1 hover:bg-white/8',
        danger: 'bg-danger text-white hover:bg-danger-hover',
      },
      size: {
        default: 'h-9 rounded-md px-4',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-[15px]',
        icon: 'h-9 w-9 rounded-md',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: { variant: 'accent', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
