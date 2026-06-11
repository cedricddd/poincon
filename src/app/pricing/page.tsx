import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function PricingPage() {
  const session = await auth()
  if (session?.user) {
    redirect('/admin/dashboard/settings#subscription')
  }
  redirect('/#pricing')
}
