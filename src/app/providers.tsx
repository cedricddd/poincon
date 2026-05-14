'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import React from 'react'
import { OfflineIndicator } from '@/components/OfflineIndicator'

export function Providers({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      {children}
      <OfflineIndicator />
    </SessionProvider>
  )
}
