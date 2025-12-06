export type VariantButton =  'default' | 'outline' | 'accent' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'accent' | 'icon';
  className?: string;
}
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export interface SectionHeaderProps {
  intro: string;
  title: string;
  description?: string;
	align?: "left" | "right" | "center";
}
