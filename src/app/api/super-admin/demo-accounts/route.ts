import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createProspectDemoCompany, DemoAccountExistsError } from '@/lib/demo-seed'
import { sendDemoAccountEmail } from '@/lib/mail'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const locale = req.headers.get('x-next-intl-locale') ?? 'fr'
  const { email, name } = await req.json()
  if (!email || !name) {
    return NextResponse.json({ error: 'Email et nom requis' }, { status: 400 })
  }

  try {
    const { companyId, password } = await createProspectDemoCompany({
      adminEmail: email,
      adminName: name,
      locale,
    })

    await sendDemoAccountEmail({ to: email.toLowerCase().trim(), name, password, locale })

    await logAudit({
      userId: session.user.id,
      action: 'super_admin_create_demo_account',
      resource: 'Company',
      resourceId: companyId,
      changes: { adminEmail: email },
    })

    return NextResponse.json({ ok: true, companyId, adminEmail: email })
  } catch (error) {
    if (error instanceof DemoAccountExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Create demo account error:', error)
    return NextResponse.json({ error: 'Failed to create demo account' }, { status: 500 })
  }
}
