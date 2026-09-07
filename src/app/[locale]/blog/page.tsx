import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { getPosts } from '@/lib/blog'

type Params = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Blog',
    description:
      "Ressources sur le pointage et l'enregistrement du temps de travail en Belgique : obligation 2027, conformité, RGPD, choix d'un système.",
    alternates: { canonical: `https://pointon.be/${locale}/blog` },
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogIndexPage({ params }: Params) {
  const { locale } = await params
  const posts = await getPosts(locale)

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <nav className="text-sm text-[var(--pp-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors">Accueil</Link>
        <span className="mx-2">›</span>
        <span className="text-[var(--pp-ink)]">Blog</span>
      </nav>

      <h1 className="font-display font-bold text-3xl sm:text-4xl text-[var(--pp-ink)] mb-3">Blog</h1>
      <p className="text-[var(--pp-muted)] mb-12">
        Pointage, enregistrement du temps de travail et obligation belge de 2027.
      </p>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg2)] p-6 text-sm text-[var(--pp-muted)]">
          Les articles ne sont pas encore traduits dans cette langue.{' '}
          <Link href="/blog" locale="fr" className="text-[var(--pp-pos-btn)] underline">
            Voir le blog en français
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
                  Mis à jour le {formatDate(post.meta.updatedAt)}
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
