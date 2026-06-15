import { redirect } from 'next/navigation'

export default function CustomReportsRedirect() {
  redirect('/admin/dashboard/reports')
}
