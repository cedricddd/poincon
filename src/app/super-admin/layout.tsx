'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user) {
      router.push('/login')
      return
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      router.push('/app')
      return
    }
  }, [session, status, router])

  if (status === 'loading' || !session || session.user.role !== 'SUPER_ADMIN') {
    return null
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:ml-64">
        {children}
      </main>
    </div>
  )
}
