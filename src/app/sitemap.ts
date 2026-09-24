import { MetadataRoute } from 'next'
import { localesForPath } from '@/lib/seo'
import { blogLocales, blogStaticParams, getPost, postAlternates, postUrl } from '@/lib/blog'

const base = 'https://pointon.be'

const pages: {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/comparaison', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/legal/compliance', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/security', changeFrequency: 'yearly', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = pages.flatMap((page) => {
    const locales = page.path === '/blog' ? blogLocales() : localesForPath(page.path)
    return locales.map((locale) => ({
      url: `${base}/${locale}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      ...(locales.length > 1 && {
        alternates: {
          languages: {
            ...Object.fromEntries(locales.map((l) => [l, `${base}/${l}${page.path}`])),
            'x-default': `${base}${page.path}`,
          },
        },
      }),
    }))
  })

  const blogEntries: MetadataRoute.Sitemap = await Promise.all(
    blogStaticParams().map(async ({ locale, slug }) => {
      const post = await getPost(slug, locale)
      return {
        url: postUrl(slug, locale),
        lastModified: post ? new Date(post.meta.updatedAt) : lastModified,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        alternates: { languages: postAlternates(slug, locale) },
      }
    }),
  )

  return [...staticEntries, ...blogEntries]
}
