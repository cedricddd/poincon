'use client'

import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { OfflineIndicator } from '@/components/OfflineIndicator'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <OfflineIndicator />
    </SessionProvider>
  )
}
