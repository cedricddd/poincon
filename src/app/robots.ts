import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',
          '/admin/',
          '/manager/',
          '/super-admin/',
          '/api/',
          '/clock',
          '/login',
          '/signup',
          '/set-password',
          '/reset-password',
          '/forgot-password',
          '/offline',
          '/pricing/upgrade',
        ],
      },
    ],
    sitemap: 'https://pointon.be/sitemap.xml',
  }
}
