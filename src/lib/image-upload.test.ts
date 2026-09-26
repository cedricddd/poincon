import { describe, it, expect } from 'vitest'
import { detectImageExt, validateLogoUpload, MAX_LOGO_SIZE } from './image-upload'

const bytes = (...b: number[]) => new Uint8Array(b)
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d)
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46)
const WEBP = new Uint8Array([...Buffer.from('RIFF'), 0x24, 0, 0, 0, ...Buffer.from('WEBPVP8 ')])
const SVG = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))
// ISO-BMFF box: size + 'ftyp' + major brand 'avif'
const AVIF = new Uint8Array([0, 0, 0, 0x1c, ...Buffer.from('ftypavif'), 0, 0, 0, 0])

describe('detectImageExt', () => {
  it('recognises PNG, JPEG and WebP by magic bytes', () => {
    expect(detectImageExt(PNG)).toBe('png')
    expect(detectImageExt(JPEG)).toBe('jpg')
    expect(detectImageExt(WEBP)).toBe('webp')
  })

  it('rejects SVG, AVIF and truncated input', () => {
    expect(detectImageExt(SVG)).toBeNull()
    expect(detectImageExt(AVIF)).toBeNull()
    expect(detectImageExt(bytes(0x89, 0x50))).toBeNull()
    expect(detectImageExt(new Uint8Array())).toBeNull()
  })
})

describe('validateLogoUpload', () => {
  it('ignores the declared MIME type and file name', async () => {
    const disguised = new File([SVG], 'logo.png', { type: 'image/png' })
    const result = await validateLogoUpload(disguised)
    expect(result.ok).toBe(false)
  })

  it('derives the extension from the content, not the name', async () => {
    const png = new File([PNG], 'logo.svg', { type: 'image/svg+xml' })
    const result = await validateLogoUpload(png)
    expect(result).toMatchObject({ ok: true, image: { ext: 'png' } })
  })

  it('rejects files over the size limit', async () => {
    const big = new File([PNG, new Uint8Array(MAX_LOGO_SIZE)], 'big.png', { type: 'image/png' })
    const result = await validateLogoUpload(big)
    expect(result.ok).toBe(false)
  })
})
