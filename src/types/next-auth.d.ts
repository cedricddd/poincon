import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: string
      twoFactorEnabled: boolean
      twoFactorVerified: boolean
    }
  }

  interface User {
    role: string
    twoFactorEnabled?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    sessionExpiry?: number
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
}

// next-auth/jwt re-exports JWT from @auth/core/jwt via `export *`, which doesn't
// merge module augmentations — the callback signature actually uses @auth/core/jwt's JWT.
declare module '@auth/core/jwt' {
  interface JWT {
    role: string
    sessionExpiry?: number
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
}
