import type { SectionHeaderProps } from '@/lib/types';

export default function SectionHeader({
  intro,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="text-left mb-10">
      <h3 className="font-mono text-xs/6 font-medium uppercase tracking-widest text-gray-600 pb-2">
        {intro}
      </h3>
      <h2
        className={`text-4xl tracking-tight text-pretty max-lg:font-medium sm:text-5xl lg:text-6xl text-foreground max-w-5xl ${description ? 'pb-6' : 'pb-0'}`}
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-3xl text-lg/7 font-medium text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </header>
  );
}
