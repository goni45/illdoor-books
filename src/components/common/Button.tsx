import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'outline' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variantStyles = {
    primary:
      'bg-[#ef4d23] text-white hover:bg-[#e04018] active:bg-[#c93612] focus:ring-[#ef4d23]/40 shadow-xs',
    dark:
      'bg-[#0b0f1a] text-white hover:bg-[#1a2236] active:bg-[#000000] focus:ring-[#0b0f1a]/40 shadow-xs',
    outline:
      'bg-white text-[#0b0f1a] border border-[#e5e5e5] hover:bg-[#f5f2ee] hover:border-neutral-300 focus:ring-neutral-200',
    secondary:
      'bg-[#f5f2ee] text-[#0b0f1a] hover:bg-[#eae4dc] focus:ring-neutral-200',
    ghost:
      'bg-transparent text-[#0b0f1a] hover:bg-black/5 active:bg-black/10 focus:ring-neutral-200',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus:ring-rose-300',
  };

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 rounded-full gap-1.5',
    md: 'text-sm px-5 py-2.5 rounded-full gap-2',
    lg: 'text-base px-6 py-3 rounded-full gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
};
