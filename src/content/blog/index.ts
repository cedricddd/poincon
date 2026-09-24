import type { ComponentType } from 'react'
import type { BlogMeta } from '@/lib/blog'

type PostModule = { meta: BlogMeta; default: ComponentType }
type Loader = () => Promise<PostModule>

export interface BlogRegistryEntry {
  /** Default slug — used for every locale not listed in `localizedSlugs`. */
  slug: string
  /** Per-locale URL slug overrides, so each language ranks on its own keywords. */
  localizedSlugs?: Partial<Record<string, string>>
  /** One loader per locale that has this article. */
  locales: Partial<Record<string, Loader>>
}

/**
 * Ordered list of blog articles. Add an entry + its `<slug>/<locale>.tsx` file
 * to publish. Order here is not significant — the index sorts by publishedAt.
 */
export const BLOG_REGISTRY: BlogRegistryEntry[] = [
  {
    slug: 'pointage-obligatoire-belgique-2027',
    localizedSlugs: { nl: 'verplichte-tijdregistratie-belgie-2027' },
    locales: {
      fr: () => import('./pointage-obligatoire-belgique-2027/fr'),
      nl: () => import('./pointage-obligatoire-belgique-2027/nl'),
    },
  },
  {
    slug: 'pointeuse-rgpd-belgique',
    locales: {
      fr: () => import('./pointeuse-rgpd-belgique/fr'),
    },
  },
  {
    slug: 'enregistrer-temps-travail-methodes',
    locales: {
      fr: () => import('./enregistrer-temps-travail-methodes/fr'),
    },
  },
]
