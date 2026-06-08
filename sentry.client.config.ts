import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeSend(event) {
    // Strip sensitive headers from request context
    if (event.request?.headers) {
      const safe = { ...event.request.headers }
      delete safe['authorization']
      delete safe['cookie']
      delete safe['x-cron-secret']
      event.request.headers = safe
    }
    return event
  },
})
