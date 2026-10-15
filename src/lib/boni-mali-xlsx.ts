import ExcelJS from 'exceljs'
import type { ReportDay, ReportTotals } from '@/lib/boni-mali-report'
import type { DayFlag } from '@/lib/boni-mali'

// Excel layout of the Boni/Mali timesheet, modelled on the format payroll teams already keep by hand:
// jour | date | in | out | tot | in | out | tot | total | base | Boni | Mali | prestation | intitulé | remarques
// Times and durations are real Excel values (fractions of a day) so the file stays computable.
// The workbook uses the 1904 date system: it is the only one in which Excel displays negative durations (mali).

export type EmployeeSheet = {
  name: string
  email: string
  days: ReportDay[]
  totals: ReportTotals
}

const WEEKDAYS = ['', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

const FLAG_LABELS: Record<DayFlag, string> = {
  after_latest: 'Temps après l\'heure limite non compté',
  over_daily_max: 'Plafonné au maximum journalier',
}

export const PAYROLL_FLAG_LABELS: Record<string, string> = {
  no_social_transport: 'Jours sans abonnement social',
}

const DURATION_FMT = '[h]:mm'
const TIME_FMT = 'hh:mm'
const GREY = 'FFD9D9D9'
const HEADER = 'FFFFF2CC'

const asDuration = (minutes: number) => minutes / 1440

function brusselsTime(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return (h * 60 + m) / 1440
}

const fmtDateKey = (key: string) => {
  const [y, m, d] = key.split('-')
  return `${d}-${m}-${y}`
}

/** Excel sheet names: max 31 chars, no []:*?/\ , unique within the workbook. */
export function sheetName(raw: string, used: Set<string>): string {
  const base = (raw.replace(/[[\]:*?/\\]/g, ' ').trim() || 'Employé').slice(0, 28)
  let name = base
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 26)} ${i}`
  used.add(name.toLowerCase())
  return name
}

function addEmployeeSheet(wb: ExcelJS.Workbook, emp: EmployeeSheet, name: string, period: string) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 3 }] })
  ws.columns = [
    { width: 6 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 },
    { width: 9 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 11 }, { width: 24 }, { width: 38 },
  ]
  ws.getCell('A1').value = `${emp.name || emp.email} — ${period}`
  ws.getCell('A1').font = { bold: true, size: 12 }

  const header = ws.getRow(3)
  header.values = ['jour', 'date', 'in', 'out', 'tot', 'in', 'out', 'tot', 'total', 'base', 'Boni', 'Mali', 'prestation', 'intitulé prestation ou absence', 'remarques']
  header.font = { bold: true }
  header.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } }
    c.alignment = { horizontal: 'center' }
    c.border = { bottom: { style: 'thin' } }
  })

  for (const day of emp.days) {
    const remarks = [
      ...day.flags.map(f => FLAG_LABELS[f]),
      ...(day.hasOpenRecord ? ['Pointage en cours / non clôturé'] : []),
      ...(!day.isWeekend && !day.hasRecords && !day.label ? ['Aucun pointage'] : []),
    ].join(' · ')

    const row = ws.addRow([
      WEEKDAYS[day.weekday],
      fmtDateKey(day.dateKey),
      day.block1 ? brusselsTime(day.block1.in) : null,
      day.block1 ? brusselsTime(day.block1.out) : null,
      day.block1 ? asDuration(day.block1.minutes) : null,
      day.block2 ? brusselsTime(day.block2.in) : null,
      day.block2 ? brusselsTime(day.block2.out) : null,
      day.block2 ? asDuration(day.block2.minutes) : null,
      day.hasRecords ? asDuration(day.workedMinutes) : null,
      day.baseMinutes > 0 ? asDuration(day.baseMinutes) : null,
      day.boniMinutes > 0 ? asDuration(day.boniMinutes) : null,
      day.hasRecords && day.baseMinutes > 0 ? asDuration(day.maliMinutes) : null,
      day.code || null,
      day.label || null,
      remarks || null,
    ])
    ;[3, 4, 6, 7].forEach(c => { row.getCell(c).numFmt = TIME_FMT })
    ;[5, 8, 9, 10, 11, 12].forEach(c => { row.getCell(c).numFmt = DURATION_FMT })
    row.getCell(11).font = { color: { argb: 'FF15803D' } }
    row.getCell(12).font = { color: { argb: 'FFDC2626' } }
    row.getCell(13).alignment = { horizontal: 'center' }
    if (day.isWeekend) {
      row.eachCell({ includeEmpty: true }, c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } } })
    }
  }

  ws.addRow([])
  const t = emp.totals
  const totalRow = ws.addRow(['Total', null, null, null, null, null, null, null,
    asDuration(t.workedMinutes), asDuration(t.baseMinutes), asDuration(t.boniMinutes), asDuration(t.maliMinutes)])
  totalRow.font = { bold: true }
  ;[9, 10, 11, 12].forEach(c => { totalRow.getCell(c).numFmt = DURATION_FMT })
  const balanceRow = ws.addRow(['Solde (Boni + Mali)', null, null, null, null, null, null, null, null, null, asDuration(t.balanceMinutes)])
  balanceRow.font = { bold: true }
  balanceRow.getCell(11).numFmt = DURATION_FMT
}

function addSummarySheet(wb: ExcelJS.Workbook, employees: EmployeeSheet[], period: string, codes: string[], payrollFlags: string[]) {
  const ws = wb.addWorksheet('Synthèse', { views: [{ state: 'frozen', ySplit: 3 }] })
  ws.getCell('A1').value = `Synthèse Boni/Mali — ${period}`
  ws.getCell('A1').font = { bold: true, size: 12 }

  const headers = ['Employé', 'Email', 'Presté', 'Base', 'Boni', 'Mali', 'Solde',
    ...codes.map(c => `Jours ${c}`), ...payrollFlags.map(f => PAYROLL_FLAG_LABELS[f] ?? f)]
  const header = ws.getRow(3)
  header.values = headers
  header.font = { bold: true }
  header.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER } } })
  ws.columns = headers.map((_, i) => ({ width: i === 0 ? 26 : i === 1 ? 30 : 12 }))

  for (const emp of employees) {
    const t = emp.totals
    const row = ws.addRow([
      emp.name, emp.email,
      asDuration(t.workedMinutes), asDuration(t.baseMinutes), asDuration(t.boniMinutes), asDuration(t.maliMinutes), asDuration(t.balanceMinutes),
      ...codes.map(c => t.daysByCode[c] ?? 0),
      ...payrollFlags.map(f => t.payrollFlagDays[f] ?? 0),
    ])
    ;[3, 4, 5, 6, 7].forEach(c => { row.getCell(c).numFmt = DURATION_FMT })
  }
}

export async function buildBoniMaliWorkbook({
  employees,
  from,
  to,
  codes,
}: {
  employees: EmployeeSheet[]
  from: string
  to: string
  codes: string[] // column order of the per-code day counts in the summary
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Pointon'
  wb.created = new Date()
  wb.properties.date1904 = true

  const period = `du ${fmtDateKey(from)} au ${fmtDateKey(to)}`
  const payrollFlags = [...new Set(employees.flatMap(e => Object.keys(e.totals.payrollFlagDays)))].sort()
  addSummarySheet(wb, employees, period, codes, payrollFlags)

  const used = new Set<string>(['synthèse'])
  for (const emp of employees) addEmployeeSheet(wb, emp, sheetName(emp.name || emp.email, used), period)

  return Buffer.from(await wb.xlsx.writeBuffer())
}
