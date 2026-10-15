import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildEmployeeReport, dayKeysBetween, type ReportRecord } from './boni-mali-report'
import { buildBoniMaliWorkbook, sheetName } from './boni-mali-xlsx'
import { DEFAULT_WORK_MODES } from './boni-mali'

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+02:00`)
const mode = (code: string) => DEFAULT_WORK_MODES.find(m => m.code === code)!
// ExcelJS reads time-formatted cells back as Dates (1904 system); the stored value is a day fraction.
const num = (v: unknown) => (v instanceof Date ? (v.getTime() - Date.UTC(1904, 0, 1)) / 86400000 : v)

// One record per block, as when the employee clocks out for lunch and back in.
function blocks(date: string, code: string, in1: string, out1: string, in2: string, out2: string): ReportRecord[] {
  return [
    { arrivalTime: at(date, in1), departureTime: at(date, out1), workMode: mode(code) },
    { arrivalTime: at(date, in2), departureTime: at(date, out2), workMode: mode(code) },
  ]
}

// Week of 14 → 20 September 2026 from the Interreg timesheet.
const records: ReportRecord[] = [
  ...blocks('2026-09-14', 'PR', '09:00', '13:00', '13:30', '16:00'), // 6h30 → -1:06
  ...blocks('2026-09-15', 'PR', '09:00', '13:00', '13:30', '17:30'), // 8h00 → +0:24
  ...blocks('2026-09-16', 'TT', '08:30', '13:00', '13:30', '16:40'), // 7h40 → 0
  ...blocks('2026-09-17', 'TT', '08:30', '13:00', '13:30', '16:40'), // 7h40 → 0
  ...blocks('2026-09-18', 'MIS', '08:30', '13:00', '13:30', '19:45'), // 10h45 → +3:09
]

const report = () => buildEmployeeReport({
  from: '2026-09-14', to: '2026-09-20', records, baseMinutes: 456, leaves: new Map(), defaultMode: mode('PR'),
})

describe('dayKeysBetween', () => {
  it('includes both bounds and crosses months', () => {
    expect(dayKeysBetween('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  })
})

describe('buildEmployeeReport', () => {
  it('reproduces the timesheet week', () => {
    const { days, totals } = report()
    expect(days).toHaveLength(7)
    expect(days.map(d => d.code)).toEqual(['PR', 'PR', 'TT', 'TT', 'MIS', '', ''])
    expect(days[0].maliMinutes).toBe(-66)
    expect(days[1].boniMinutes).toBe(24)
    expect(days[4].boniMinutes).toBe(189)
    expect(days[5].isWeekend).toBe(true)
    expect(totals.boniMinutes).toBe(24 + 189)
    expect(totals.maliMinutes).toBe(-66)
    expect(totals.balanceMinutes).toBe(147)
    expect(totals.daysByCode).toEqual({ PR: 2, TT: 2, MIS: 1 })
    expect(totals.payrollFlagDays).toEqual({ no_social_transport: 1 })
  })

  it('splits morning / afternoon blocks', () => {
    const { days } = report()
    expect(days[0].block1?.minutes).toBe(240)
    expect(days[0].block2?.minutes).toBe(150)
  })

  it('leave day owes no base and shows the leave label', () => {
    const { days } = buildEmployeeReport({
      from: '2026-09-21', to: '2026-09-21', records: [], baseMinutes: 456,
      leaves: new Map([['2026-09-21', 'Congé annuel']]), defaultMode: null,
    })
    expect(days[0]).toMatchObject({ baseMinutes: 0, maliMinutes: 0, label: 'Congé annuel', code: '' })
  })

  it('records without a code fall back to the company default mode', () => {
    const { days } = buildEmployeeReport({
      from: '2026-09-22', to: '2026-09-22', baseMinutes: 456, leaves: new Map(), defaultMode: mode('PR'),
      records: [{ arrivalTime: at('2026-09-22', '08:00'), departureTime: at('2026-09-22', '19:00'), workMode: null }],
    })
    expect(days[0].code).toBe('PR')
    expect(days[0].flags).toEqual(['after_latest', 'over_daily_max'])
  })

  it('a working day without clocking is left empty, not counted as mali', () => {
    const { days, totals } = buildEmployeeReport({
      from: '2026-09-23', to: '2026-09-23', records: [], baseMinutes: 456, leaves: new Map(), defaultMode: null,
    })
    expect(days[0].maliMinutes).toBe(0)
    expect(totals.baseMinutes).toBe(0)
  })
})

describe('sheetName', () => {
  it('strips forbidden characters, truncates and dedupes', () => {
    const used = new Set<string>()
    expect(sheetName('A/B [test]', used)).toBe('A B  test')
    expect(sheetName('a/b [test]', used)).toBe('a b  test 2')
    expect(sheetName('x'.repeat(40), new Set()).length).toBeLessThanOrEqual(31)
  })

  it('avoids names Excel rejects (reserved "History", leading/trailing quote)', () => {
    expect(sheetName('History', new Set())).toBe('History 2')
    expect(sheetName("'O'Neil'", new Set())).toBe("O'Neil")
    expect(sheetName("'''", new Set())).toBe('Employé')
  })
})

describe('buildBoniMaliWorkbook', () => {
  it('does not throw on employee names Excel would reject as sheet names', async () => {
    const { days, totals } = report()
    const employees = ['History', "'Quote'", 'Synthèse'].map(name => ({ name, email: 'x@test.be', days, totals }))
    await expect(buildBoniMaliWorkbook({ employees, from: '2026-09-14', to: '2026-09-20', codes: ['PR'] }))
      .resolves.toBeInstanceOf(Buffer)
  })

  it('writes a summary and one sheet per employee with computable values', async () => {
    const { days, totals } = report()
    const buffer = await buildBoniMaliWorkbook({
      employees: [{ name: 'Danielle Test', email: 'd@test.be', days, totals }],
      from: '2026-09-14', to: '2026-09-20', codes: ['PR', 'TT', 'MIS'],
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as ArrayBuffer)
    expect(wb.worksheets.map(w => w.name)).toEqual(['Synthèse', 'Danielle Test'])
    expect(wb.properties.date1904).toBe(true)

    const ws = wb.getWorksheet('Danielle Test')!
    const monday = ws.getRow(4)
    expect(monday.getCell(1).value).toBe('lun')
    expect(monday.getCell(2).value).toBe('14-09-2026')
    expect(num(monday.getCell(3).value)).toBeCloseTo(9 / 24)        // in 09:00
    expect(num(monday.getCell(12).value)).toBeCloseTo(-66 / 1440)   // mali -1:06
    expect(monday.getCell(13).value).toBe('PR')
    const friday = ws.getRow(8)
    expect(num(friday.getCell(11).value)).toBeCloseTo(189 / 1440)   // boni 3:09
    expect(friday.getCell(14).value).toBe('Missions externes')

    const summary = wb.getWorksheet('Synthèse')!.getRow(4)
    expect(summary.getCell(1).value).toBe('Danielle Test')
    expect(num(summary.getCell(7).value)).toBeCloseTo(147 / 1440)   // solde +2:27
    expect(summary.getCell(8).value).toBe(2)                   // jours PR
    expect(summary.getCell(11).value).toBe(1)                  // jours sans abonnement social
  })
})
