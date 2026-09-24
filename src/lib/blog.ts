import type { ComponentType } from 'react'
import { routing } from '@/i18n/routing'
import { BLOG_REGISTRY, type BlogRegistryEntry } from '@/content/blog'

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface BlogFaqItem {
  q: string
  a: string
}

export interface BlogMeta {
  title: string
  description: string
  /** ISO date, 'YYYY-MM-DD' */
  publishedAt: string
  /** ISO date, 'YYYY-MM-DD' — shown as "mis à jour le…" and used in schema */
  updatedAt: string
  keywords: string[]
  faq?: BlogFaqItem[]
  /** Path under /public, or an absolute URL. Falls back to the site hero image. */
  ogImage?: string
}

export interface BlogPost {
  slug: string
  locale: string
  meta: BlogMeta
  Body: ComponentType
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const SITE = 'https://pointon.be'
const DEFAULT_OG_IMAGE = '/images/hero-main.png'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

/** Locale-aware long date, e.g. "7 septembre 2026". */
export function formatBlogDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(BCP47[locale] ?? 'fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/* ─── Registry helpers (no content loaded) ─────────────────────────────── */

function slugFor(entry: BlogRegistryEntry, locale: string): string {
  return entry.localizedSlugs?.[locale] ?? entry.slug
}

function entryFor(slug: string, locale: string): BlogRegistryEntry | undefined {
  return BLOG_REGISTRY.find((e) => e.locales[locale] && slugFor(e, locale) === slug)
}

/** Every (locale, slug) pair that has content — for generateStaticParams. */
export function blogStaticParams(): { locale: string; slug: string }[] {
  return BLOG_REGISTRY.flatMap((entry) =>
    Object.keys(entry.locales).map((locale) => ({ locale, slug: slugFor(entry, locale) })),
  )
}

/**
 * hreflang map for an article (each locale with its own slug), plus x-default
 * pointing at the default-locale version when it exists.
 */
export function postAlternates(slug: string, locale: string): Record<string, string> {
  const entry = entryFor(slug, locale)
  if (!entry) return {}
  const languages: Record<string, string> = Object.fromEntries(
    Object.keys(entry.locales).map((l) => [l, postUrl(slugFor(entry, l), l)]),
  )
  if (languages[routing.defaultLocale]) languages['x-default'] = languages[routing.defaultLocale]
  return languages
}

/**
 * When `slug` is another locale's slug for an article that exists in `locale`
 * (old URL, or the locale switcher keeping the path), returns the slug to
 * redirect to. Null when there is nothing to redirect to.
 */
export function redirectSlug(slug: string, locale: string): string | null {
  const entry = BLOG_REGISTRY.find(
    (e) => e.slug === slug || Object.values(e.localizedSlugs ?? {}).includes(slug),
  )
  if (!entry?.locales[locale]) return null
  const target = slugFor(entry, locale)
  return target === slug ? null : target
}

/* ─── Content loading ──────────────────────────────────────────────────── */

export async function getPost(slug: string, locale: string): Promise<BlogPost | null> {
  const loader = entryFor(slug, locale)?.locales[locale]
  if (!loader) return null
  const mod = await loader()
  return { slug, locale, meta: mod.meta, Body: mod.default }
}

export async function getPosts(locale: string): Promise<BlogPost[]> {
  const loaded = await Promise.all(
    BLOG_REGISTRY.filter((e) => e.locales[locale]).map((e) => getPost(slugFor(e, locale), locale)),
  )
  return (loaded.filter(Boolean) as BlogPost[]).sort((a, b) =>
    b.meta.publishedAt.localeCompare(a.meta.publishedAt),
  )
}

/* ─── URLs & metadata ──────────────────────────────────────────────────── */

export function postUrl(slug: string, locale: string): string {
  return `${SITE}/${locale}/blog/${slug}`
}

export function ogImageUrl(meta: BlogMeta): string {
  const path = meta.ogImage ?? DEFAULT_OG_IMAGE
  return path.startsWith('http') ? path : `${SITE}${path}`
}

/* ─── JSON-LD ──────────────────────────────────────────────────────────── */

export function articleJsonLd(post: BlogPost) {
  const url = postUrl(post.slug, post.locale)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta.title,
    description: post.meta.description,
    datePublished: post.meta.publishedAt,
    dateModified: post.meta.updatedAt,
    inLanguage: post.locale,
    image: ogImageUrl(post.meta),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'Pointon', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Ced-IT',
      url: 'https://ced-it.be',
      logo: { '@type': 'ImageObject', url: `${SITE}/icon-192.svg` },
    },
  }
}

export function faqJsonLd(items: BlogFaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
