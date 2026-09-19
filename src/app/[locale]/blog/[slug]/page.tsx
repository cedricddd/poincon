import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  articleJsonLd,
  blogStaticParams,
  faqJsonLd,
  formatBlogDate,
  getPost,
  localesForSlug,
  ogImageUrl,
  postUrl,
} from '@/lib/blog'
import { FaqSection, Prose } from '@/content/blog/_components'

export const dynamicParams = false

type Params = { params: Promise<{ locale: string; slug: string }> }

export function generateStaticParams() {
  return blogStaticParams()
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPost(slug, locale)
  if (!post) return {}

  const url = postUrl(slug, locale)
  const languages = Object.fromEntries(
    localesForSlug(slug).map((l) => [l, postUrl(slug, l)]),
  )

  return {
    title: post.meta.title,
    description: post.meta.description,
    keywords: post.meta.keywords,
    alternates: { canonical: url, languages },
    openGraph: {
      type: 'article',
      url,
      title: post.meta.title,
      description: post.meta.description,
      publishedTime: post.meta.publishedAt,
      modifiedTime: post.meta.updatedAt,
      images: [{ url: ogImageUrl(post.meta), width: 1200, height: 630, alt: post.meta.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta.title,
      description: post.meta.description,
      images: [ogImageUrl(post.meta)],
    },
  }
}

export default async function BlogArticlePage({ params }: Params) {
  const { locale, slug } = await params
  const [post, t] = await Promise.all([
    getPost(slug, locale),
    getTranslations({ locale, namespace: 'blog' }),
  ])
  if (!post) notFound()

  const { meta, Body } = post
  const showUpdated = meta.updatedAt !== meta.publishedAt

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />
      {meta.faq && meta.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(meta.faq)) }}
        />
      )}

      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">{t('breadcrumbHome')}</Link>
        <span className="mx-2">›</span>
        <Link href="/blog" className="hover:text-[var(--pp-ink)] transition-colors">Blog</Link>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">{meta.title}</span>
      </nav>

      <article>
        <h1 className="font-display font-bold text-3xl sm:text-[2.5rem] leading-tight text-[var(--pp-ink)] mb-4">
          {meta.title}
        </h1>
        <p className="text-sm text-[var(--pp-muted)] mb-10">
          {t('publishedOn')} {formatBlogDate(meta.publishedAt, locale)}
          {showUpdated && <> · {t('updatedOn')} {formatBlogDate(meta.updatedAt, locale)}</>}
        </p>

        <Prose>
          <Body />
        </Prose>

        {meta.faq && <FaqSection items={meta.faq} />}
      </article>

      <section className="mt-14 rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-bg2)] p-8 text-center">
        <h2 className="font-display font-bold text-xl text-[var(--pp-ink)] mb-2">
          {t('ctaTitle')}
        </h2>
        <p className="text-sm text-[var(--pp-muted)] mb-6">
          {t('ctaText')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--pp-pos-btn)' }}
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="/comparaison"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold border border-[var(--pp-line)] text-[var(--pp-ink)]"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </section>
    </div>
  )
}
