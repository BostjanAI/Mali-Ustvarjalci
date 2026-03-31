import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
        hover ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
