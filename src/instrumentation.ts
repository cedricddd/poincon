import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Report unhandled errors from route handlers, server components, server actions
// and middleware. Without this hook Next swallows them and only manual
// captures reach Sentry. Data sent stays bound by SENTRY_DATA_COLLECTION.
export const onRequestError = Sentry.captureRequestError
