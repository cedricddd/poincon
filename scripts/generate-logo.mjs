/**
 * Logo generation for PoinçOn using fal.ai Recraft v3
 * Recraft v3 is specialized for logos, icons, and vector illustrations.
 *
 * Usage:
 *   node scripts/generate-logo.mjs
 *
 * Output: public/images/logo-*.png
 * After review, copy the best one to public/logo.png and use in the app.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images')

const FAL_KEY = '8b88c915-6341-4a55-83c3-925417adec18:cc3bbf75cdc8154da1e7a75cc9f3dca5'

// Recraft v3 — best fal.ai model for logos, brand assets, vector illustrations
const MODEL = 'fal-ai/recraft-v3'

// Brand palette
// Primary: #10b981 (emerald green)
// Dark: #0f172a (sidebar bg)
// Light: #ffffff

const logos = [
  // ── Variant A — Horizontal: rounded square icon + wordmark ──────────────────
  {
    file: 'logo-horizontal.png',
    size: 'landscape_4_3',
    style: 'vector_illustration',
    prompt:
      'Minimalist professional logo for a SaaS app called "PoinçOn". ' +
      'Left side: a small rounded square icon in solid emerald green (#10b981) containing a simple white analog clock face — ' +
      'clean circular clock with two short bold white hands pointing to approximately 9:00, no numbers, no tick marks, pure geometric. ' +
      'Right side: the wordmark "PoinçOn" in a modern bold sans-serif typeface (similar to Inter or Geist), color #0f172a (near-black). ' +
      'White background. The icon and text are vertically centered and well-spaced. ' +
      'No gradients, no shadows, no decoration. Clean, corporate, scalable. ' +
      'Logo design, brand identity, flat vector style.',
  },

  // ── Variant B — App icon / favicon (square, icon only) ──────────────────────
  {
    file: 'logo-icon.png',
    size: 'square_hd',
    style: 'vector_illustration',
    prompt:
      'Minimalist app icon for a SaaS time-tracking application. ' +
      'A perfect rounded square with solid emerald green (#10b981) background. ' +
      'Centered: a clean white analog clock with a circular face, two bold short hands at 9:00 position, no numbers, no tick marks. ' +
      'The clock is simple, geometric, and has good padding inside the rounded square. ' +
      'Flat design, no gradients, no shadows, no text. ' +
      'Suitable as an iOS/Android app icon, clean and bold, vector style.',
  },

  // ── Variant C — Dark background version (for dark sidebar/header) ────────────
  {
    file: 'logo-dark.png',
    size: 'landscape_4_3',
    style: 'vector_illustration',
    prompt:
      'Minimalist professional logo for "PoinçOn" on a dark navy background (#0f172a). ' +
      'Left side: a small rounded square icon in emerald green (#10b981) with a clean white clock face inside — ' +
      'simple circular clock with two bold white hands at 9:00, no numbers, purely geometric. ' +
      'Right side: wordmark "PoinçOn" in bold modern sans-serif, color white (#ffffff). ' +
      'Dark navy (#0f172a) background. Clean flat vector logo, no shadows, no gradients. ' +
      'Suitable for dark navigation sidebar or dark header.',
  },

  // ── Variant D — Stacked / compact (icon above text) ─────────────────────────
  {
    file: 'logo-stacked.png',
    size: 'square_hd',
    style: 'vector_illustration',
    prompt:
      'Minimalist stacked logo for "PoinçOn" time-tracking SaaS. ' +
      'Vertically stacked layout: top is a rounded square icon in solid emerald green (#10b981) with a white geometric clock inside — ' +
      'circular clock face, two bold short white hands, no numbers. ' +
      'Below the icon: the brand name "PoinçOn" in bold modern sans-serif, color #0f172a, centered. ' +
      'White background. Clean, minimal, flat vector. No gradients, no effects. ' +
      'Compact logo suitable for profile photos, social media avatars, email signatures.',
  },
]

async function generate(item) {
  console.log(`→ Generating ${item.file}...`)

  const body = {
    prompt: item.prompt,
    image_size: item.size,
    style: item.style,
    num_images: 1,
  }

  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai error for ${item.file}: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error(`No image URL returned for ${item.file}: ${JSON.stringify(data)}`)

  const imgRes = await fetch(url)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const outPath = join(OUT_DIR, item.file)
  writeFileSync(outPath, buffer)
  console.log(`✓ Saved ${item.file} (${(buffer.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`Generating ${logos.length} logo variants with ${MODEL}...\n`)
  console.log('Brand: PoinçOn | Color: #10b981 emerald | Style: vector_illustration\n')

  for (const item of logos) {
    try {
      await generate(item)
    } catch (err) {
      console.error(`✗ Failed ${item.file}: ${err.message}`)
    }
  }

  console.log('\nDone! Check public/images/logo-*.png')
  console.log('→ Pick the best, copy to public/logo.png and update Sidebar + layout metadata.')
}

main()
