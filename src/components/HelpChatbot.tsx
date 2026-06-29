'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function HelpChatbot() {
  const t = useTranslations('HelpChatbot')
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('greeting') }])
    }
  }, [open, messages.length, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t('label')}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9990] w-12 h-12 rounded-full bg-[var(--pp-accent)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center text-xl"
      >
        {open ? '✕' : '❓'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-[9991] w-[calc(100vw-2rem)] max-w-sm bg-white rounded-xl shadow-2xl border border-[var(--pp-line)] flex flex-col overflow-hidden"
          style={{ height: '420px' }}>

          {/* Header */}
          <div className="px-4 py-3 bg-[var(--pp-accent)] text-white flex items-center gap-2 shrink-0">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-sm font-semibold leading-none">{t('title')}</p>
              <p className="text-xs opacity-80 mt-0.5">{t('subtitle')}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-[var(--pp-accent)] text-white rounded-br-none'
                    : 'bg-[var(--pp-bg2,#f3f4f6)] text-[var(--pp-ink)] rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--pp-bg2,#f3f4f6)] rounded-xl rounded-bl-none px-3 py-2">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[var(--pp-muted)] rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-[var(--pp-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-[var(--pp-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-[var(--pp-neg)] text-center">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-[var(--pp-line)] flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--pp-line)] bg-white focus:outline-none focus:border-[var(--pp-accent)] disabled:opacity-50 text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-lg bg-[var(--pp-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-[9989] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
