import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, sendNewCompanyNotification } from '@/lib/mail'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez plus tard.' },
        { status: 429 }
      )
    }

    const locale = req.headers.get('x-next-intl-locale') ?? 'fr'
    const body = await req.json()
    const { firstName, lastName, email, password, companyName } = body

    if (!firstName || !lastName || !email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Mot de passe trop court (minimum 8 caractères)' },
        { status: 400 }
      )
    }

    // Le plan FREE doit exister (seed `node prisma/seed.js`). Sans lui, on créerait une
    // société avec planId: null → dashboard cassé. On échoue explicitement à la place.
    const freePlan = await prisma.plan.findFirst({ where: { name: 'FREE' } })
    if (!freePlan) {
      console.error('SEED MISSING: table Plan sans entrée FREE — inscription bloquée')
      Sentry.captureMessage('register: plan FREE absent de la table Plan (seed manquant)', 'error')
      return NextResponse.json(
        { error: 'Inscription momentanément indisponible. Réessayez plus tard.' },
        { status: 503 }
      )
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const fullName = `${firstName.trim()} ${lastName.trim()}`

    // TVA, adresse et téléphone sont collectés plus tard (checkout Stripe : billing_address
    // + tax_id, rétro-écrits par le webhook). Les colonnes restent non-null → chaîne vide.
    //
    // Pas de dispatchWebhookSafe('employee.created') ici : à ce stade la company vient
    // d'être créée, aucun addon_webhooks ne peut encore être actif (pas de flag posé).
    const { user, company } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      })

      const company = await tx.company.create({
        data: {
          name: companyName,
          address: '',
          phone: '',
          vatNumber: '',
          contactEmail: email,
          adminId: user.id,
          planId: freePlan.id,
        },
      })

      await tx.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      })

      return { user, company }
    })

    // Fire-and-forget — don't block the response on email delivery
    Promise.all([
      sendWelcomeEmail({ to: email, name: fullName, companyName, locale }),
      sendNewCompanyNotification({
        companyName,
        adminName: fullName,
        adminEmail: email,
        vatNumber: '',
        companyId: company.id,
      }),
    ]).catch((err) => console.error('Registration email error:', err))

    return NextResponse.json(
      {
        message: 'Inscription réussie',
        userId: user.id,
        companyId: company.id,
        email,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    const message = error instanceof Error ? error.message : "Erreur lors de l'inscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
