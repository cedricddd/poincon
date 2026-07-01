import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, sendNewCompanyNotification } from '@/lib/mail'

export async function POST(req: NextRequest) {
  try {
    const locale = req.headers.get('x-next-intl-locale') ?? 'fr'
    const body = await req.json()
    const { firstName, lastName, email, password, phone, companyName, companyAddress, companyVAT } = body

    if (!firstName || !lastName || !email || !password || !phone || !companyName || !companyAddress || !companyVAT) {
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

    if (!/^BE\d{10}$/.test(companyVAT)) {
      return NextResponse.json(
        { error: 'Numéro de TVA invalide (format: BE + 10 chiffres)' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const fullName = `${firstName.trim()} ${lastName.trim()}`

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

      const freePlan = await tx.plan.findFirst({ where: { name: 'FREE' } })

      const company = await tx.company.create({
        data: {
          name: companyName,
          address: companyAddress,
          phone,
          vatNumber: companyVAT,
          contactEmail: email,
          adminId: user.id,
          planId: freePlan?.id ?? null,
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
        vatNumber: companyVAT,
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
