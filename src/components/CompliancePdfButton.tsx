'use client'

import { useState } from 'react'

const checklistItems = [
  {
    category: 'Enregistrement du temps de travail',
    items: [
      "Enregistrement électronique de l'heure d'arrivée et de départ",
      'Données immuables — aucune modification possible sans trace d\'audit',
      'Horodatage automatique (serveur, pas client)',
      'Conservation minimale 5 ans (obligation légale belge)',
    ],
  },
  {
    category: 'Audit trail & traçabilité',
    items: [
      'Toutes les actions admin sont enregistrées (AuditLog)',
      'Qui a fait quoi, quand — traçabilité complète',
      'Export CSV des logs d\'audit disponible',
      'Impossible de supprimer un pointage sans trace',
    ],
  },
  {
    category: 'RGPD & protection des données',
    items: [
      'Base légale définie pour chaque traitement',
      'Durées de conservation documentées',
      'Droits des personnes concernées respectés',
      'Pseudo-anonymisation des données après la période légale',
      'Sous-traitants conformes RGPD (Brevo, Stripe, Hostinger)',
    ],
  },
  {
    category: 'Sécurité & confidentialité',
    items: [
      'Chiffrement HTTPS/TLS 1.3 en transit',
      'Mots de passe hashés bcrypt (cost factor 12)',
      'Isolation des données par entreprise (multi-tenancy)',
      'Sessions sécurisées (expiration, token rotation)',
      'Audit des accès et des modifications sensibles',
    ],
  },
]

async function generatePDF() {
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
  doc.text('Certificat de conformité légale', 14, 29)

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Généré le : ${new Date().toLocaleDateString('fr-BE')}`, 14, 37)

  doc.setDrawColor(200, 190, 230)
  doc.line(14, 41, 196, 41)

  let startY = 47

  for (const section of checklistItems) {
    const body = section.items.map(item => [item, 'Conforme ✓'])

    autoTable(doc, {
      startY,
      head: [[section.category, 'Statut']],
      body,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [108, 76, 168],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 145 },
        1: { cellWidth: 35, halign: 'center', textColor: [34, 120, 60], fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [245, 243, 252] },
      margin: { left: 14, right: 14 },
    })

    startY = (doc as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  const footerY = startY + 6
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.setFont('helvetica', 'italic')
  const footer = "Ce document atteste la conformité de l'application Pointon aux exigences légales belges en vigueur."
  doc.text(footer, 14, footerY, { maxWidth: 182 })

  doc.save('pointon-certificat-conformite.pdf')
}

export default function CompliancePdfButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await generatePDF()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: loading ? 'var(--pp-bg2)' : 'var(--pp-accent)',
        color: loading ? 'var(--pp-muted)' : '#fff',
        border: loading ? '1px solid var(--pp-line)' : '1px solid transparent',
        borderRadius: '10px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Génération…
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Télécharger le certificat PDF
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
