import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, company } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: new Date(), // À adapter avec vrai système de vérification
      },
    })

    // Créer la compagnie si fournie
    if (company) {
      await prisma.company.create({
        data: {
          name: company,
          adminId: user.id,
        },
      })
    }

    return NextResponse.json(
      { message: 'Inscription réussie', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'inscription'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
