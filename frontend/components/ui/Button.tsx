import { ButtonProps } from '@/lib/types';

export default function Button({
  children,
  variant = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const defaultStyle =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer h-9 px-4 py-2 has-[>svg]:px-3 ";

  const s = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    accent: 'bg-accent-foreground text-accent hover:bg-accent-foreground/90',
    icon: 'border border-border bg-background shadow-xs hover:bg-gray-400/10 hover:text-foreground/85 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 size-9',
    outline:
      'border border-border bg-background shadow-sm hover:bg-gray-400/10 hover:text-foreground/85 dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
  };
  return (
    <button className={defaultStyle + s[variant] + ' ' + className} {...props}>
      {children}
    </button>
  );
}
