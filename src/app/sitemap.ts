import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://pointon.be'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/comparaison`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/legal/compliance`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/legal/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/security`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
