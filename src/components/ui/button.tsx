import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium normal-case tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mcm-brick focus-visible:ring-offset-2 focus-visible:ring-offset-photo-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-mcm-brick text-mcm-cream hover:bg-mcm-brick/90',
        outline: 'border border-photo-border bg-photo-panel text-photo-fg hover:border-mcm-sky hover:text-mcm-sky',
        ghost: 'text-photo-muted hover:text-mcm-brick',
        lightbox: 'border border-photo-border bg-photo-panel text-photo-fg hover:border-mcm-sky hover:text-mcm-sky',
        lightboxPrimary:
          'border border-mcm-brick/80 bg-mcm-brick text-mcm-cream shadow-[0_8px_24px_rgba(166,60,50,0.28)] hover:bg-mcm-brick/90',
        inquirySubmit:
          'border border-mcm-brick/80 bg-mcm-brick text-mcm-cream hover:bg-mcm-brick/90 focus-visible:ring-mcm-sky/60',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} type={type} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
