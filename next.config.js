/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withSentryConfig } = require('@sentry/nextjs/config')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require('next-intl/plugin')

const isDev = process.env.NODE_ENV !== 'production'

// CSP is set dynamically via middleware (src/middleware.ts) using per-request nonces.
// Static headers only — no CSP here.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // camera=(self) : requis par le scanner QR (/qr)
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
]

const nextConfig = {
  output: 'standalone',
  // Sentry v11 loads its diagnostics-channel hook by path at runtime, so Next's
  // file tracing misses it in the standalone output ("Failed to register
  // diagnostics-channel injection hooks"). Ship the package and the ESM build
  // of @sentry/core it imports (the traced output only keeps the CJS build).
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@sentry/server-runtime-injection/**/*',
      './node_modules/@sentry/core/build/esm/**/*',
      './node_modules/@sentry/core/package.json',
      './node_modules/@sentry/conventions/dist/**/*.mjs',
    ],
  },
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

module.exports = withNextIntl(withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
}))
