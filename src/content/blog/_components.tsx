import type { ReactNode } from 'react'
import type { BlogFaqItem } from '@/lib/blog'

/** Wraps the article body — all prose styling lives in `.blog-prose` (globals.css). */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="blog-prose">{children}</div>
}

/** "En résumé" box, placed at the top of an article. */
export function KeyTakeaway({ children }: { children: ReactNode }) {
  return (
    <aside className="blog-takeaway" aria-label="En résumé">
      <p className="blog-takeaway__title">En résumé</p>
      {children}
    </aside>
  )
}

/** Neutral highlighted note inside the prose flow. */
export function Callout({ children }: { children: ReactNode }) {
  return <aside className="blog-callout">{children}</aside>
}

/**
 * Visible Q/A list (no accordion — the text must be crawlable). The same
 * `items` array feeds the FAQPage JSON-LD from the route.
 */
export function FaqSection({ items }: { items: BlogFaqItem[] }) {
  if (!items.length) return null
  return (
    <section className="blog-faq" aria-labelledby="blog-faq-heading">
      <h2 id="blog-faq-heading">Questions fréquentes</h2>
      <dl>
        {items.map((f) => (
          <div key={f.q} className="blog-faq__item">
            <dt>{f.q}</dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
