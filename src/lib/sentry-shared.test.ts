import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import { beforeSendError } from '@/lib/sentry-shared'

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
