'use client'

type LogoSize = 'sm' | 'md' | 'lg' | 'hero'

const heights: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  hero: 280,
}

interface LogoProps {
  size?: LogoSize
  dark?: boolean
  className?: string
  useThemeVar?: boolean
}

export function Logo({ size = 'md', dark, className = '', useThemeVar = false }: LogoProps) {
  const h = heights[size]

  if (useThemeVar) {
    return (
      <span className={`inline-block ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-light.svg"
          alt="Pointon"
          style={{ height: h, width: 'auto' }}
          className="block dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-dark.svg"
          alt="Pointon"
          style={{ height: h, width: 'auto' }}
          className="hidden dark:block"
        />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dark ? '/images/logo-dark.svg' : '/images/logo-light.svg'}
      alt="Pointon"
      style={{ height: h, width: 'auto' }}
      className={`inline-block ${className}`}
    />
  )
}
