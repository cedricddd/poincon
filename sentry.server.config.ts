import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
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
