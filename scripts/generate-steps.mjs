/**
 * Regenerate step images only — realistic photo style
 * Usage: node scripts/generate-steps.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images')

const FAL_KEY = '8b88c915-6341-4a55-83c3-925417adec18:cc3bbf75cdc8154da1e7a75cc9f3dca5'
const MODEL = 'fal-ai/flux/schnell'

const images = [
  {
    file: 'step-01-signup.png',
    size: 'square_hd',
    prompt:
      'Close-up of hands typing on a modern laptop keyboard, screen showing a clean signup form with email and password fields, soft bokeh office background, warm natural light, professional stock photo style, no visible text on screen, high quality DSLR photo',
  },
  {
    file: 'step-02-invite.png',
    size: 'square_hd',
    prompt:
      'Over-the-shoulder view of a manager at a desk looking at a monitor showing a team management dashboard with employee profile cards, small group of blurred colleagues visible in background office, modern open-plan workspace, professional stock photo, warm light, no legible text',
  },
  {
    file: 'step-03-export.png',
    size: 'square_hd',
    prompt:
      'Close-up of a hand holding a smartphone showing a green clock-in confirmation screen with a checkmark, blurred office desk background with a coffee mug, professional stock photo, natural light, no legible text, clean and modern',
  },
]

async function generate(item) {
  console.log(`→ Generating ${item.file}...`)

  const res = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: item.prompt,
      image_size: item.size,
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai error for ${item.file}: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error(`No image URL returned for ${item.file}`)

  const imgRes = await fetch(url)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const outPath = join(OUT_DIR, item.file)
  writeFileSync(outPath, buffer)
  console.log(`✓ Saved ${item.file} (${(buffer.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`Regenerating 3 step images (realistic photo style)...\n`)
  for (const item of images) {
    try {
      await generate(item)
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`)
    }
  }
  console.log('\nDone. Images saved to public/images/')
}

main()
