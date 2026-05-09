'use client'

import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { ToastContainer } from '@/components/Toast'
import { NotificationBell } from '@/components/NotificationBell'
import React from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 pb-16 md:pb-0">
        {children}
      </main>
      <div className="fixed top-3 left-52 z-[9999] hidden md:block">
        <NotificationBell />
      </div>
      <MobileNav />
      <ToastContainer />
    </div>
  )
}
