// Root layout — minimal shell required by Next.js.
// All UI pages live under src/app/[locale]/layout.tsx which handles
// lang, fonts, metadata, NextIntlClientProvider, and Providers.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
