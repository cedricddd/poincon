import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import { SENTRY_DATA_COLLECTION, beforeSendError } from '@/lib/sentry-shared'

function makeEvent(partial: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...partial } as ErrorEvent
}

describe('beforeSendError', () => {
  it('drops hydration mismatches caused by a browser extension', () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: 'Error',
            value:
              "Hydration failed because the server rendered HTML didn't match the client. " +
              'data-pcloud-pass-id="mth43j5ba0afkvx6mbt" <div class="pcloud-pass-icon">',
          },
        ],
      },
    })
    expect(beforeSendError(event)).toBeNull()
  })

  it('keeps hydration mismatches that are not attributable to an extension', () => {
    const event = makeEvent({
      exception: {
        values: [
          { type: 'Error', value: "Hydration failed because the server rendered HTML didn't match the client." },
        ],
      },
    })
    expect(beforeSendError(event)).toBe(event)
  })

  it('drops generic hydration mismatches that fire on a credential page (password managers)', () => {
    const event = makeEvent({
      request: { url: 'https://pointon.be/fr/login' },
      exception: {
        values: [
          {
            type: 'Error',
            value:
              "Hydration failed because the server rendered HTML didn't match the client. " +
              'As a result this tree will be regenerated on the client.',
          },
        ],
      },
    })
    expect(beforeSendError(event)).toBeNull()
  })

  it('matches the credential page from the transaction name too', () => {
    const event = makeEvent({
      transaction: '/[locale]/set-password',
      exception: {
        values: [{ type: 'Error', value: "Hydration failed because the server rendered HTML didn't match the client." }],
      },
    })
    expect(beforeSendError(event)).toBeNull()
  })

  it('keeps non-hydration errors that happen on a credential page', () => {
    const event = makeEvent({
      request: { url: 'https://pointon.be/nl/signup' },
      exception: {
        values: [{ type: 'TypeError', value: "Cannot read properties of undefined (reading 'name')" }],
      },
    })
    expect(beforeSendError(event)).toBe(event)
  })

  it('keeps hydration mismatches on non-credential pages', () => {
    const event = makeEvent({
      request: { url: 'https://pointon.be/fr/admin/dashboard' },
      exception: {
        values: [{ type: 'Error', value: "Hydration failed because the server rendered HTML didn't match the client." }],
      },
    })
    expect(beforeSendError(event)).toBe(event)
  })

  it('keeps unrelated errors even when an extension URL appears in the stack', () => {
    const event = makeEvent({
      exception: {
        values: [{ type: 'TypeError', value: 'x is not a function (chrome-extension://abc/inject.js)' }],
      },
    })
    expect(beforeSendError(event)).toBe(event)
  })

  it('drops Outlook Safe Links scanner promise rejections', () => {
    const event = makeEvent({
      request: { url: 'https://pointon.be/en' },
      exception: {
        values: [
          {
            type: 'UnhandledRejection',
            value:
              'Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4',
          },
        ],
      },
    })
    expect(beforeSendError(event)).toBeNull()
  })

  it('keeps other non-Error promise rejections', () => {
    const event = makeEvent({
      exception: {
        values: [{ type: 'UnhandledRejection', value: 'Non-Error promise rejection captured with value: undefined' }],
      },
    })
    expect(beforeSendError(event)).toBe(event)
  })

  it('strips sensitive request headers', () => {
    const event = makeEvent({
      request: {
        headers: { authorization: 'Bearer x', cookie: 'session=y', 'x-cron-secret': 'z', 'user-agent': 'ua' },
      },
    })
    const result = beforeSendError(event)
    expect(result?.request?.headers).toEqual({ 'user-agent': 'ua' })
  })
})

// Sentry v11 collects bodies, cookies, user info and DB data by default. These
// guards fail loudly if someone loosens the GDPR-restrictive configuration.
describe('SENTRY_DATA_COLLECTION', () => {
  it('never sends request/response bodies (passwords, PINs, employee data)', () => {
    expect(SENTRY_DATA_COLLECTION.httpBodies).toEqual([])
  })

  it('never sends cookies, user info (incl. IP) or local variables', () => {
    expect(SENTRY_DATA_COLLECTION.cookies).toBe(false)
    expect(SENTRY_DATA_COLLECTION.userInfo).toBe(false)
    expect(SENTRY_DATA_COLLECTION.stackFrameVariables).toBe(false)
  })

  it('never sends database, queue, GraphQL, AI or MCP payloads', () => {
    expect(SENTRY_DATA_COLLECTION.databaseQueryData).toBe(false)
    expect(SENTRY_DATA_COLLECTION.queues).toBe(false)
    expect(SENTRY_DATA_COLLECTION.graphQL).toEqual({ document: false, variables: false })
    expect(SENTRY_DATA_COLLECTION.genAI).toEqual({ inputs: false, outputs: false })
    expect(SENTRY_DATA_COLLECTION.mcp).toEqual({ inputs: false, outputs: false })
  })

  it('filters credentials and IP-revealing names out of headers and query params', () => {
    const headers = SENTRY_DATA_COLLECTION.httpHeaders as { request: { deny: string[] }; response: { deny: string[] } }
    const query = SENTRY_DATA_COLLECTION.urlQueryParams as { deny: string[] }
    for (const deny of [headers.request.deny, headers.response.deny, query.deny]) {
      expect(deny).toEqual(expect.arrayContaining(['authorization', 'cookie', 'token', 'forwarded', '-ip', 'password', 'pin']))
    }
  })
})
