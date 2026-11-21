// Client IP for rate limits and audit trails.
//
// In production the only way in is Nginx Proxy Manager (LXC 101), which sets
//   X-Real-IP       = $remote_addr            (overwrites anything the client sent)
//   X-Forwarded-For = <client's own value>, $remote_addr
// The first X-Forwarded-For entry is whatever the client typed, so keying a rate limit
// on it lets anyone bypass the limit by sending a new value per attempt. Only the value
// the proxy wrote is trusted: X-Real-IP, else the last X-Forwarded-For entry.
// This assumes the app port is not reachable from the internet without the proxy.

type HeaderSource = { get(name: string): string | null }

export function clientIp(headers: HeaderSource): string | undefined {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = headers.get('x-forwarded-for')
  const last = forwarded?.split(',').map(s => s.trim()).filter(Boolean).at(-1)
  return last || undefined
}
