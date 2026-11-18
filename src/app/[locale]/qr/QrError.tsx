// Error screen shared by the printed site QR page and the dynamic kiosk QR page.
export function QrError({ title, message, loginHref }: { title: string; message: string; loginHref?: string }) {
  return (
    <div className="min-h-screen bg-[#090c14] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-white/50 text-sm">{message}</p>
        {loginHref && (
          <a
            href={loginHref}
            className="inline-block mt-6 px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-400 transition-colors"
          >
            Se connecter
          </a>
        )}
      </div>
    </div>
  )
}
