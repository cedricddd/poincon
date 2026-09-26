// Server-side validation for user-uploaded images (company / kiosk logos).
// Never trust the browser-supplied MIME type or file name: the stored extension
// is derived from the file's magic bytes, so a disguised SVG or AVIF cannot be
// saved and later served or fed to the image optimizer (sharp/libheif).

export type UploadImageExt = 'png' | 'jpg' | 'webp'

export const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2 MB

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false
  return bytes.every((b, i) => buf[offset + i] === b)
}

export function detectImageExt(buf: Uint8Array): UploadImageExt | null {
  if (startsWith(buf, PNG_SIGNATURE)) return 'png'
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpg'
  // RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp'
  return null
}

export type ValidatedImage = { buffer: Buffer; ext: UploadImageExt }

export async function validateLogoUpload(
  file: File
): Promise<{ ok: true; image: ValidatedImage } | { ok: false; error: string }> {
  if (file.size > MAX_LOGO_SIZE) return { ok: false, error: 'Fichier trop lourd (max 2 Mo)' }
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = detectImageExt(buffer)
  if (!ext) return { ok: false, error: 'Format non supporté (PNG, JPG, WebP)' }
  return { ok: true, image: { buffer, ext } }
}
