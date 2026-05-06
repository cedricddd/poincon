import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-[var(--pp-line)] bg-[var(--pp-bg)] p-6 ${className}`}>
      {children}
    </div>
  )
}
