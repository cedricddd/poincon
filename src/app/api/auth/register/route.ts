import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName, companyAddress, companyVAT } = body

    if (!name || !email || !password || !companyName || !companyVAT) {
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

    // Créer l'utilisateur ADMIN
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    })

    // Créer la company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        address: companyAddress || null,
        vatNumber: companyVAT,
        adminId: user.id,
      },
    })

    // Associer l'utilisateur à sa company
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    })

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
