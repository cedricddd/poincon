import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { formatBlogDate, getPosts } from '@/lib/blog'

type Params = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })
  return {
    title: 'Blog',
    description: t('metaDescription'),
    alternates: { canonical: `https://pointon.be/${locale}/blog` },
  }
}

export default async function BlogIndexPage({ params }: Params) {
  const { locale } = await params
  const [t, posts] = await Promise.all([
    getTranslations({ locale, namespace: 'blog' }),
    getPosts(locale),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">{t('breadcrumbHome')}</Link>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Blog</span>
      </nav>

      <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--pp-ink)] mb-3">Blog</h1>
      <p className="text-[var(--pp-muted)] mb-12">{t('subtitle')}</p>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)] p-6 text-sm text-[var(--pp-muted)]">
          {t('notTranslated')}{' '}
          <Link href="/blog" locale="fr" className="text-[var(--pp-pos-btn)] underline">
            {t('seeInFrench')}
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-xl border border-[var(--pp-line)] p-6 transition-colors hover:border-[var(--pp-pos)]"
              >
                <p className="text-xs text-[var(--pp-muted)] mb-2">
                  {t('updatedOn')} {formatBlogDate(post.meta.updatedAt, locale)}
                </p>
                <h2 className="font-display font-bold text-xl text-[var(--pp-ink)] mb-2">
                  {post.meta.title}
                </h2>
                <p className="text-sm text-[var(--pp-muted)]">{post.meta.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
