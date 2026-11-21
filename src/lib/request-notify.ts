import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { getCompanyPlan, planCanAccess } from '@/lib/plan'
import { sendRequestNotificationEmail, type RequestKind } from '@/lib/mail'
import { LEAVE_TYPE_KEY_TYPE_PREFIX, isValidLeaveType } from '@/lib/leaveTypes'

// When an employee makes a request (leave, time off in lieu, missed clocking), the people who
// review it get a bell notification, and an e-mail if they ticked the box in their profile.
// Reviewers: the company's admins, plus (plans with managers) the managers of the employee's
// teams and their direct manager.

export type RequestDetails =
  | { kind: 'timeoff'; leaveType: string; start: Date; end: Date }
  | { kind: 'rtt'; date: Date; hours: number }
  | { kind: 'correction'; date: Date }

export type Reviewer = {
  id: string
  email: string
  name: string | null
  locale: string | null
  emailOnRequests: boolean
  /** Admins review the whole company; a manager only their teams, from their own dashboard. */
  asAdmin: boolean
}

const ADMIN_PATH: Record<RequestKind, string> = {
  timeoff: '/admin/dashboard/timeoffs',
  rtt: '/admin/dashboard/rtts',
  correction: '/admin/dashboard/corrections',
}
const MANAGER_PATH = '/manager/dashboard'

const reviewerSelect = { id: true, email: true, name: true, locale: true, emailOnRequests: true } as const

/** Who reviews this employee's requests. Never includes the employee. */
export async function findRequestReviewers(employeeId: string): Promise<{ employee: { name: string | null; email: string }; reviewers: Reviewer[] } | null> {
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: { name: true, email: true, companyId: true, managerId: true },
  })
  if (!employee?.companyId) return null
  const companyId = employee.companyId

  const admins = await prisma.user.findMany({
    where: { companyId, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, active: true, id: { not: employeeId } },
    select: reviewerSelect,
  })
  const reviewers = new Map<string, Reviewer>(admins.map(a => [a.id, { ...a, asAdmin: true }]))

  if (planCanAccess(await getCompanyPlan(companyId), 'managers')) {
    const teams = await prisma.teamMember.findMany({ where: { userId: employeeId }, select: { teamId: true } })
    const teamManagers = teams.length
      ? await prisma.teamMember.findMany({
          where: { teamId: { in: teams.map(t => t.teamId) }, role: 'manager' },
          select: { userId: true },
        })
      : []
    const managerIds = [...new Set([...teamManagers.map(m => m.userId), ...(employee.managerId ? [employee.managerId] : [])])]
      .filter(id => id !== employeeId && !reviewers.has(id))
    if (managerIds.length) {
      const managers = await prisma.user.findMany({
        where: { id: { in: managerIds }, companyId, active: true },
        select: reviewerSelect,
      })
      for (const m of managers) reviewers.set(m.id, { ...m, asAdmin: false })
    }
  }

  return { employee: { name: employee.name, email: employee.email }, reviewers: [...reviewers.values()] }
}

const fmtDay = (d: Date, locale: string) =>
  d.toLocaleDateString(locale === 'fr' ? 'fr-BE' : locale === 'nl' ? 'nl-BE' : locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Brussels',
  })

/** Translated, plain-text description of the request, after the employee's name. */
export async function describeRequest(details: RequestDetails, locale: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'emails' })
  if (details.kind === 'timeoff') {
    const tt = await getTranslations({ locale, namespace: 'timeoff' })
    const type = isValidLeaveType(details.leaveType) ? tt(LEAVE_TYPE_KEY_TYPE_PREFIX[details.leaveType]) : details.leaveType
    const from = fmtDay(details.start, locale)
    const to = fmtDay(details.end, locale)
    return from === to
      ? t('request.lineTimeoffOneDay', { type, date: from })
      : t('request.lineTimeoff', { type, from, to })
  }
  if (details.kind === 'rtt') {
    return t('request.lineRtt', { hours: String(details.hours).replace('.', ','), date: fmtDay(details.date, locale) })
  }
  return t('request.lineCorrection', { date: fmtDay(details.date, locale) })
}

async function sendEmails(reviewers: Reviewer[], who: string, details: RequestDetails): Promise<void> {
  for (const r of reviewers.filter(r => r.emailOnRequests)) {
    const locale = r.locale ?? 'fr'
    try {
      await sendRequestNotificationEmail({
        to: r.email,
        name: r.name,
        employee: who,
        kind: details.kind,
        line: await describeRequest(details, locale),
        path: r.asAdmin ? ADMIN_PATH[details.kind] : MANAGER_PATH,
        locale,
      })
    } catch (error) {
      console.error('Request notification e-mail failed:', error)
    }
  }
}

/**
 * Bell notification for every reviewer (awaited: one DB write), then e-mails to those who
 * opted in, sent in the background so SMTP never slows down the employee's request.
 * Never throws: a failed notification must not fail the request. Resolves with the
 * e-mail promise, for tests.
 */
export async function notifyRequestReviewers(employeeId: string, details: RequestDetails): Promise<{ emails: Promise<void> }> {
  const none = { emails: Promise.resolve() }
  try {
    const found = await findRequestReviewers(employeeId)
    if (!found || found.reviewers.length === 0) return none
    const who = found.employee.name ?? found.employee.email

    // Stored bell messages are in French, like the existing ones
    const bellLine = await describeRequest(details, 'fr')
    await prisma.notification.createMany({
      data: found.reviewers.map(r => ({ userId: r.id, message: `${who} ${bellLine}`, type: 'info' })),
    })

    const emails = sendEmails(found.reviewers, who, details).catch(error => {
      console.error('Request notification e-mails failed:', error)
    })
    return { emails }
  } catch (error) {
    console.error('Request notification failed:', error)
    return none
  }
}
