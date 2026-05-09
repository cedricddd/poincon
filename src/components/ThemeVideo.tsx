'use client'

import { useEffect, useRef } from 'react'

export function ThemeVideo({ style }: { style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    function applyTheme() {
      if (!video) return
      const dark = document.documentElement.classList.contains('dark')
      const next = dark ? '/poincon-demo-dark.mp4' : '/poincon-demo-light.mp4'
      if (video.getAttribute('src') !== next) {
        video.src = next
        video.load()
        video.play().catch(() => {})
      }
    }

    applyTheme()

    const obs = new MutationObserver(applyTheme)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src="/poincon-demo-light.mp4"
      autoPlay
      loop
      muted
      playsInline
      className="w-full block"
      style={style}
    />
  )
}
