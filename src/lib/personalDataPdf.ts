type JsPDFCtor = typeof import('jspdf').default
type JsPDFInstance = InstanceType<JsPDFCtor>
type AutoTableFn = typeof import('jspdf-autotable').default

interface EmployeeData {
  profile: {
    name: string
    email: string
    role: string
    active: boolean
    createdAt: string
    updatedAt: string
  }
  clockRecords: {
    date: string
    arrivalTime: string
    departureTime: string | null
    location: string
    duration: number | null
  }[]
  timeOffRequests: { startDate: string; endDate: string; status: string; type?: string }[]
  rttRequests: { date: string; status: string }[]
  detectedOvertimes: { date: string; minutes: number }[]
  shifts: { date: string; startTime: string; endTime: string; shiftType: string }[]
}

interface PersonalDataExport extends EmployeeData {
  exportedAt: string
}

interface CompanyDataExport {
  exportedAt: string
  employees: EmployeeData[]
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-BE')
}

const headStyles = { fillColor: [108, 76, 168] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, fontSize: 9 }
const tableStyles = { fontSize: 8, cellPadding: 3 }
const alternateRowStyles = { fillColor: [245, 243, 252] as [number, number, number] }
const MARGIN = { left: 14, right: 14 }

function finalY(doc: JsPDFInstance): number {
  return (doc as JsPDFInstance & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
}

function renderEmployeeSection(doc: JsPDFInstance, autoTable: AutoTableFn, employee: EmployeeData, startY: number): number {
  autoTable(doc, {
    startY,
    head: [['Profil', '']],
    body: [
      ['Nom', employee.profile.name],
      ['Email', employee.profile.email],
      ['Rôle', employee.profile.role],
      ['Statut', employee.profile.active ? 'Actif' : 'Inactif'],
      ['Compte créé le', fmtDate(employee.profile.createdAt)],
      ['Dernière mise à jour', fmtDate(employee.profile.updatedAt)],
    ],
    styles: tableStyles,
    headStyles,
    alternateRowStyles,
    margin: MARGIN,
  })
  let y = finalY(doc)

  if (employee.clockRecords.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Pointages', 'Arrivée', 'Départ', 'Lieu', 'Durée (min)']],
      body: employee.clockRecords.map(r => [
        fmtDate(r.date), fmtDate(r.arrivalTime), fmtDate(r.departureTime), r.location, r.duration?.toString() ?? '—',
      ]),
      styles: tableStyles,
      headStyles,
      alternateRowStyles,
      margin: MARGIN,
    })
    y = finalY(doc)
  }

  if (employee.shifts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Shifts planifiés', 'Début', 'Fin', 'Type']],
      body: employee.shifts.map(s => [fmtDate(s.date), s.startTime, s.endTime, s.shiftType]),
      styles: tableStyles,
      headStyles,
      alternateRowStyles,
      margin: MARGIN,
    })
    y = finalY(doc)
  }

  if (employee.timeOffRequests.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Demandes de congé', 'Du', 'Au', 'Statut']],
      body: employee.timeOffRequests.map(r => [r.type ?? '—', fmtDate(r.startDate), fmtDate(r.endDate), r.status]),
      styles: tableStyles,
      headStyles,
      alternateRowStyles,
      margin: MARGIN,
    })
    y = finalY(doc)
  }

  if (employee.rttRequests.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Demandes RTT', 'Statut']],
      body: employee.rttRequests.map(r => [fmtDate(r.date), r.status]),
      styles: tableStyles,
      headStyles,
      alternateRowStyles,
      margin: MARGIN,
    })
    y = finalY(doc)
  }

  if (employee.detectedOvertimes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Heures supplémentaires détectées', 'Minutes']],
      body: employee.detectedOvertimes.map(o => [fmtDate(o.date), o.minutes.toString()]),
      styles: tableStyles,
      headStyles,
      alternateRowStyles,
      margin: MARGIN,
    })
    y = finalY(doc)
  }

  return y
}

function renderHeader(doc: JsPDFInstance, subtitle: string, exportedAt: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 20, 60)
  doc.text('Pointon', 14, 20)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 60, 120)
  doc.text(subtitle, 14, 29)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Généré le : ${new Date(exportedAt).toLocaleString('fr-BE')}`, 14, 37)

  doc.setDrawColor(200, 190, 230)
  doc.line(14, 41, 196, 41)
}

function renderFooter(doc: JsPDFInstance, startY: number, text: string) {
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.setFont('helvetica', 'italic')
  doc.text(text, 14, startY + 4, { maxWidth: 182 })
}

export async function downloadPersonalDataPdf(data: PersonalDataExport) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  renderHeader(doc, 'Export de mes données personnelles (art. 15 RGPD)', data.exportedAt)

  const endY = renderEmployeeSection(doc, autoTable, data, 47)
  renderFooter(doc, endY, "Ce document contient l'ensemble des données personnelles détenues par Pointon vous concernant, conformément à l'article 15 du RGPD.")

  const exportDate = new Date(data.exportedAt).toISOString().slice(0, 10)
  doc.save(`pointon-mes-donnees-${exportDate}.pdf`)
}

export async function downloadCompanyDataPdf(data: CompanyDataExport) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  renderHeader(doc, "Export RGPD de l'entreprise (art. 20 RGPD)", data.exportedAt)

  let endY = 47
  data.employees.forEach((employee, index) => {
    if (index > 0) {
      doc.addPage()
      endY = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 20, 60)
    doc.text(employee.profile.name, 14, endY)
    endY += 7

    endY = renderEmployeeSection(doc, autoTable, employee, endY)
  })

  renderFooter(doc, endY, "Ce document contient l'ensemble des données personnelles détenues par Pointon concernant les membres de l'entreprise, conformément à l'article 20 du RGPD.")

  const exportDate = new Date(data.exportedAt).toISOString().slice(0, 10)
  doc.save(`pointon-export-entreprise-${exportDate}.pdf`)
}
