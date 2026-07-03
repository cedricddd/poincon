interface PersonalDataExport {
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
  exportedAt: string
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-BE')
}

export async function downloadPersonalDataPdf(data: PersonalDataExport) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 20, 60)
  doc.text('Pointon', 14, 20)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 60, 120)
  doc.text('Export de mes données personnelles (art. 15 RGPD)', 14, 29)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Généré le : ${new Date(data.exportedAt).toLocaleString('fr-BE')}`, 14, 37)

  doc.setDrawColor(200, 190, 230)
  doc.line(14, 41, 196, 41)

  const headStyles = { fillColor: [108, 76, 168] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, fontSize: 9 }
  const styles = { fontSize: 8, cellPadding: 3 }
  const alternateRowStyles = { fillColor: [245, 243, 252] as [number, number, number] }
  let startY = 47

  const finalY = () => (doc as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  autoTable(doc, {
    startY,
    head: [['Profil', '']],
    body: [
      ['Nom', data.profile.name],
      ['Email', data.profile.email],
      ['Rôle', data.profile.role],
      ['Statut', data.profile.active ? 'Actif' : 'Inactif'],
      ['Compte créé le', fmtDate(data.profile.createdAt)],
      ['Dernière mise à jour', fmtDate(data.profile.updatedAt)],
    ],
    styles,
    headStyles,
    alternateRowStyles,
    margin: { left: 14, right: 14 },
  })
  startY = finalY()

  if (data.clockRecords.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Pointages', 'Arrivée', 'Départ', 'Lieu', 'Durée (min)']],
      body: data.clockRecords.map(r => [
        fmtDate(r.date), fmtDate(r.arrivalTime), fmtDate(r.departureTime), r.location, r.duration?.toString() ?? '—',
      ]),
      styles,
      headStyles,
      alternateRowStyles,
      margin: { left: 14, right: 14 },
    })
    startY = finalY()
  }

  if (data.shifts.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Shifts planifiés', 'Début', 'Fin', 'Type']],
      body: data.shifts.map(s => [fmtDate(s.date), s.startTime, s.endTime, s.shiftType]),
      styles,
      headStyles,
      alternateRowStyles,
      margin: { left: 14, right: 14 },
    })
    startY = finalY()
  }

  if (data.timeOffRequests.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Demandes de congé', 'Du', 'Au', 'Statut']],
      body: data.timeOffRequests.map(r => [r.type ?? '—', fmtDate(r.startDate), fmtDate(r.endDate), r.status]),
      styles,
      headStyles,
      alternateRowStyles,
      margin: { left: 14, right: 14 },
    })
    startY = finalY()
  }

  if (data.rttRequests.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Demandes RTT', 'Statut']],
      body: data.rttRequests.map(r => [fmtDate(r.date), r.status]),
      styles,
      headStyles,
      alternateRowStyles,
      margin: { left: 14, right: 14 },
    })
    startY = finalY()
  }

  if (data.detectedOvertimes.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Heures supplémentaires détectées', 'Minutes']],
      body: data.detectedOvertimes.map(o => [fmtDate(o.date), o.minutes.toString()]),
      styles,
      headStyles,
      alternateRowStyles,
      margin: { left: 14, right: 14 },
    })
    startY = finalY()
  }

  const footerY = startY + 4
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.setFont('helvetica', 'italic')
  doc.text(
    "Ce document contient l'ensemble des données personnelles détenues par Pointon vous concernant, conformément à l'article 15 du RGPD.",
    14, footerY, { maxWidth: 182 }
  )

  const exportDate = new Date(data.exportedAt).toISOString().slice(0, 10)
  doc.save(`pointon-mes-donnees-${exportDate}.pdf`)
}
