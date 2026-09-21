import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/40';

  const variantStyles = {
    primary: 'bg-[#ef4d23] text-white hover:bg-[#d83d14] active:scale-[0.98] shadow-sm shadow-[#ef4d23]/20',
    secondary: 'bg-[#ef4d23]/10 text-[#ef4d23] hover:bg-[#ef4d23]/20 active:scale-[0.98]',
    outline: 'border border-[#e5e7eb] bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98]',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
    dark: 'bg-[#0b0f1a] text-white hover:bg-[#1a1f2e] active:scale-[0.98]',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
  }[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
