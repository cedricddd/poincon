import { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'

const base = 'https://pointon.be'

const pages: {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/comparaison', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/legal/compliance', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/security', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return pages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${page.path}`])
        ),
      },
    }))
  )
}
