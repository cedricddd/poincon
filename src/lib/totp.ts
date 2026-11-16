import crypto from 'crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(str: string): Buffer {
  const s = str.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const output: number[] = []
  for (const char of s) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31]
  return output
}

// 160-bit secret (RFC 4226 §4 recommends 160, requires at least 128),
// encoded as 32 base32 characters. Authenticator apps such as Aegis or
// Bitwarden warn about shorter secrets.
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

function hotp(secret: string, counter: number): string {
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuf.writeUInt32BE(counter >>> 0, 4)
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counterBuf).digest()
  const offset = hmac[19] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, '0')
}

function currentCounter(): number {
  return Math.floor(Date.now() / 1000 / 30)
}

/** Current 6-digit code of a secret (what the authenticator app shows). */
export function generateTOTP(secret: string): string {
  return hotp(secret, currentCounter())
}

export function verifyTOTP(token: string, secret: string): boolean {
  const clean = token.replace(/\s/g, '')
  const t = currentCounter()
  // Accept ±1 window for clock skew
  return [-1, 0, 1].some((w) => hotp(secret, t + w) === clean)
}

export function keyUri(accountName: string, secret: string): string {
  const issuer = 'Pointon'
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  )
}
