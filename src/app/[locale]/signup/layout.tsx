import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
