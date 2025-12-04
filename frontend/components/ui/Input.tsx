import { InputProps } from '@/lib/types';

export default function Input({ className = '', ...props }: InputProps) {
  const defaultStyle =
    'bg-background outline-border foucs:ring-2 focus:ring-foreground h-10 w-full rounded-lg px-3 text-base shadow-sm outline -outline-offset-1 focus:ring';
  return <input {...props} className={defaultStyle + ' ' + className} />;
}
