'use client'

import { Sidebar } from '@/components/Sidebar'
import React from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:ml-64">
        {children}
      </main>
    </div>
  )
}
