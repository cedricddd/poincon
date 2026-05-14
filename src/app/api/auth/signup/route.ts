import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const requester = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!isAdminRole(requester?.role)) {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    }
    if (!requester?.companyId) {
      return NextResponse.json({ error: 'Compagnie introuvable pour cet admin' }, { status: 400 })
    }

    const body = await req.json()
    const { email, password, name, role, defaultSiteId } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, mot de passe et nom sont requis' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (minimum 8 caractères)' }, { status: 400 })
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
    const allowedRoles = ['EMPLOYEE', 'ADMIN']
    const userRole = allowedRoles.includes(role) ? role : 'EMPLOYEE'

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        emailVerified: new Date(),
        companyId: requester.companyId,
        ...(defaultSiteId && { defaultSiteId }),
      },
    })

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
