import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-md',
  secondary:
    'bg-white text-brand border-2 border-brand hover:bg-brand-50 active:bg-brand-100',
  ghost:
    'text-brand hover:bg-brand-50 active:bg-brand-100',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 gap-1.5',
  md: 'text-sm px-6 py-2.5 gap-2',
  lg: 'text-base px-8 py-3.5 gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  return (
    <button
      className={[base, variantClasses[variant], sizeClasses[size], className].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
