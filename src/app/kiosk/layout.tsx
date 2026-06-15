export const metadata = { title: 'Kiosque — Pointon', robots: { index: false } }

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
