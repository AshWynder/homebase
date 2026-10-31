import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group flex items-center justify-center rounded-md web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
    Platform.select({
      web: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary web:hover:opacity-90 active:opacity-90',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive web:hover:bg-destructive/90 active:bg-destructive/90',
          Platform.select({ web: 'hover:bg-destructive/90' })
        ),
        outline: cn(
          'border border-border bg-background web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
          Platform.select({ web: 'hover:bg-accent hover:text-accent-foreground' })
        ),
        secondary: cn(
          'bg-secondary web:hover:bg-secondary/80 active:bg-secondary/80',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
          Platform.select({ web: 'hover:bg-accent hover:text-accent-foreground' })
        ),
        link: cn('web:underline-offset-4 web:hover:underline web:focus:underline'),
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9'),
        sm: cn('h-9 rounded-md px-3 sm:h-8'),
        lg: cn('h-11 rounded-md px-8 sm:h-10'),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'web:whitespace-nowrap text-sm font-medium text-foreground web:transition-colors',
    Platform.select({ web: 'pointer-events-none' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: 'group-active:text-accent-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: 'text-primary group-active:underline',
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50 web:pointer-events-none', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
