import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'mauve'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-all font-sans'

  const variantStyles = {
    primary: 'bg-[var(--pp-pos)] text-white hover:opacity-90',
    secondary: 'bg-[var(--pp-info)] text-white hover:opacity-90',
    outline: 'border border-[var(--pp-line)] text-[var(--pp-ink)] hover:bg-[var(--pp-bg)]',
    mauve: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]',
  }

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
