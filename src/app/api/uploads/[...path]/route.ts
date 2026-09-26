import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

// Uploaded files are user content: never let them run script, even if a
// disguised file slipped through (proxy.ts CSP does not apply to /api routes).
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params
  const safeSegments = pathSegments.filter(s => !s.includes('..') && !s.includes('/') && !s.includes('\\'))
  if (safeSegments.length !== pathSegments.length) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', ...safeSegments)
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const mime = MIME_TYPES[ext]
  if (!mime) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
        ...SECURITY_HEADERS,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
