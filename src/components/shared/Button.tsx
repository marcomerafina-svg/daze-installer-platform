import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant =
  | 'primaryBlack'
  | 'primaryWhite'
  | 'secondary'
  | 'secondaryDark'
  | 'destructive'
  | 'ghost'
  | 'icon';

type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primaryBlack:
    'bg-daze-black text-white hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
  primaryWhite:
    'bg-white text-daze-black hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent border border-daze-gray text-daze-black hover:bg-daze-gray/10 active:bg-daze-gray/20 disabled:opacity-50 disabled:cursor-not-allowed',
  secondaryDark:
    'bg-[rgba(29,29,27,0.12)] border border-daze-gray text-white hover:bg-[rgba(29,29,27,0.2)] active:bg-[rgba(29,29,27,0.3)] disabled:opacity-50 disabled:cursor-not-allowed',
  destructive:
    'bg-daze-salmon text-white hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-daze-blue hover:text-daze-black hover:bg-daze-gray/10 disabled:opacity-50 disabled:cursor-not-allowed',
  icon:
    'p-2 bg-transparent text-daze-black/60 hover:bg-daze-gray/20 active:bg-daze-gray/30 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-[44px] px-4 gap-2.5 text-sm',
  md: 'h-[52px] px-4 gap-3 text-base',
  lg: 'h-[58px] px-5 gap-3 text-base',
};

export default function Button({
  variant = 'primaryBlack',
  size = 'sm',
  icon,
  iconPosition = 'right',
  children,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const isIcon = variant === 'icon';

  const baseClasses = [
    'font-roobert font-medium tracking-[0.48px]',
    'inline-flex items-center justify-center',
    'transition-all duration-200',
    isIcon ? 'rounded-pill' : 'rounded-pill',
    fullWidth ? 'w-full' : '',
    variantClasses[variant],
    isIcon ? '' : sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={baseClasses} {...props}>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
}
