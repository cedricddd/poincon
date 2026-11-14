// Client-side Sentry init. Next 16 builds with Turbopack, which only loads
// instrumentation-client.ts — the legacy sentry.client.config.ts is ignored.
import * as Sentry from '@sentry/nextjs'
import { SENTRY_DATA_COLLECTION, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE, beforeSendError } from '@/lib/sentry-shared'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  environment: process.env.NODE_ENV,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeSend: beforeSendError,
  dataCollection: SENTRY_DATA_COLLECTION,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
