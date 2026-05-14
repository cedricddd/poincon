import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const safeSegments = params.path.filter(s => !s.includes('..') && !s.includes('/') && !s.includes('\\'))
  if (safeSegments.length !== params.path.length) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', ...safeSegments)
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const mime = MIME_TYPES[ext] ?? 'application/octet-stream'

  try {
    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
