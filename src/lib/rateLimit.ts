// Rate limiter en mémoire — adapté pour un seul process (Docker, Vercel single-instance)
// Pour un déploiement multi-instances, remplacer par Upstash Redis

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1 }
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: max - entry.count }
}

// Nettoyage périodique pour éviter les fuites mémoire
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 60_000)
}
