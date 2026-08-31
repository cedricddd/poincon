import * as Sentry from '@sentry/nextjs'
import { SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE, beforeSendError } from './src/lib/sentry-shared'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  environment: process.env.NODE_ENV,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  beforeSend: beforeSendError,
})
