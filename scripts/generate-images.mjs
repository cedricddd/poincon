/**
 * fal.ai image generation for PoinçOn landing page
 * Usage: node scripts/generate-images.mjs
 *
 * UI reference:
 *   - Dark sidebar (left, 256px), white/light content area
 *   - Primary green #10b981, sky blue #0ea5e9, orange #fb923c, indigo #6366f1
 *   - Rounded cards with subtle borders, clean minimal design
 *   - Clock page: large rounded green button, pulsing ring, elapsed timer
 *   - Admin dashboard: 6 colored stat cards, live presence list
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'images')

const FAL_KEY = '8b88c915-6341-4a55-83c3-925417adec18:cc3bbf75cdc8154da1e7a75cc9f3dca5'
const MODEL = 'fal-ai/flux/dev'

const images = [
  // ── Hero — MacBook mockup showing the clock-in page ────────────────────────
  {
    file: 'hero-main.png',
    size: 'landscape_16_9',
    steps: 28,
    prompt:
      'Photorealistic MacBook Pro on a clean white desk showing a web application called PoinçOn. ' +
      'The app has a dark left sidebar (deep gray #1a1f2e, width ~240px) with colored navigation icons: ' +
      'a green clock icon for Pointage, a blue calendar icon for Congés, an orange lightning icon for RTT, an indigo bar chart for Rapports. ' +
      'The main content area is white with a large centered rounded rectangle button in emerald green (#10b981) labeled "ARRIVÉE" with a subtle pulsing glow ring around it. ' +
      'Above the button: a greeting text "Bonjour, Marie" and a status card showing "Lundi 09 mai 2026". ' +
      'Clean minimal UI, Inter font style, soft drop shadows on cards. ' +
      'Background: soft light gray desk, everything in sharp focus, no blur, no depth of field effect, ' +
      'professional product mockup photography, the laptop screen is razor sharp and fully legible, no watermarks.',
  },

  // ── Step 01 — Signup on a smartphone ────────────────────────────────────────
  {
    file: 'step-01-signup.png',
    size: 'square_hd',
    steps: 28,
    prompt:
      'Photorealistic iPhone 15 Pro mockup in space black, held in a hand, showing a signup form web page. ' +
      'The page has a white background, a logo "PoinçOn" in bold with a small green clock icon, ' +
      'input fields for email and password with rounded borders, and a large emerald green button "Créer mon compte". ' +
      'Clean minimal design, Inter font style, soft shadows. ' +
      'Background: plain light gray, everything in sharp focus, no blur, no depth of field, studio lighting, product mockup style, no text outside the phone screen.',
  },

  // ── Step 02 — Admin dashboard showing user management ───────────────────────
  {
    file: 'step-02-invite.png',
    size: 'square_hd',
    steps: 28,
    prompt:
      'Photorealistic iPad Pro in landscape mode on a white surface, showing an admin web dashboard. ' +
      'Left dark sidebar with colored navigation links. Main area shows a "Utilisateurs" page: ' +
      'a table with rows for employees (name, email, role badge in green/blue/orange, site name), ' +
      'an "Inviter un employé" button in emerald green at the top right, avatar initials circles in gradient blue-to-green. ' +
      'Clean minimal UI with rounded cards, subtle border lines, white background, Inter font style. ' +
      'Everything in sharp focus, no blur, no depth of field, flat even studio lighting, razor sharp screen, product mockup style.',
  },

  // ── Step 03 — Reports export on laptop ──────────────────────────────────────
  {
    file: 'step-03-export.png',
    size: 'square_hd',
    steps: 28,
    prompt:
      'Photorealistic MacBook Air on a desk, screen showing a time-tracking reports web page. ' +
      'The page title "Rapports" with date range filter, a bar chart in emerald green showing weekly hours worked, ' +
      'below it a table with employee rows: name, clock-in time, clock-out time, duration in hours. ' +
      'Top right: a green "Exporter CSV" button and a blue "Exporter PDF" button. ' +
      'Clean minimal dashboard design, white background, Inter font, rounded cards with subtle shadows. ' +
      'Everything in sharp focus, no blur, no depth of field, flat even lighting, razor sharp screen, product mockup style.',
  },

  // ── Testimonial avatars ──────────────────────────────────────────────────────
  {
    file: 'avatar-01.png',
    size: 'square_hd',
    steps: 20,
    prompt:
      'Professional LinkedIn-style headshot portrait of a 40-year-old Belgian woman with shoulder-length brown hair, ' +
      'warm confident smile, wearing a smart navy blazer over a white blouse, ' +
      'soft neutral gradient background (light gray to white), photorealistic, high quality, natural lighting from the side, no text.',
  },
  {
    file: 'avatar-02.png',
    size: 'square_hd',
    steps: 20,
    prompt:
      'Professional LinkedIn-style headshot portrait of a 35-year-old Belgian man with short dark hair and light stubble, ' +
      'friendly open smile, wearing a light blue oxford shirt, ' +
      'soft neutral gradient background (light gray to white), photorealistic, high quality, natural studio lighting, no text.',
  },
  {
    file: 'avatar-03.png',
    size: 'square_hd',
    steps: 20,
    prompt:
      'Professional LinkedIn-style headshot portrait of a 52-year-old Belgian man with short salt-and-pepper hair, ' +
      'confident professional smile, wearing a dark charcoal suit jacket with open collar, ' +
      'soft neutral gradient background (light gray to white), photorealistic, high quality, natural lighting, no text.',
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
      num_inference_steps: item.steps ?? 25,
      num_images: 1,
      enable_safety_checker: true,
      guidance_scale: 3.5,
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

  // Parse optional --only flag: node generate-images.mjs --only hero-main
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]
  const targets = onlyArg ? images.filter(i => i.file.includes(onlyArg)) : images

  console.log(`Generating ${targets.length} image(s) with ${MODEL}...\n`)

  for (const item of targets) {
    try {
      await generate(item)
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`)
    }
  }

  console.log('\nDone. Images saved to public/images/')
}

main()
