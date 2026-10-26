'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateOnly, formatDateTime } from '@/lib/dates'
import { createPdf, roleLabel, slug, STATUS_LABELS } from '@/lib/pdf'

interface BitacoraReport {
  id: string
  report_date: string
  progress_notes: string
  created_by_name?: string
  area_name?: string
  project_name?: string
  signature_url?: string | null
  director_signature_url?: string | null
  director_name?: string | null
  status?: string | null
  company_name?: string | null
  company_logo_url?: string | null
}

type Person = { full_name: string | null; role: string | null } | null

export function ExportBitacoraPdfButton({ report }: { report: BitacoraReport }) {
  const [exporting, setExporting] = useState(false)

  const generatePDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExporting(true)

    try {
      const supabase = createClient()
      // Datos completos y actuales: el PDF no depende de lo que la página tenga cargado
      const { data: rep } = await supabase
        .from('daily_reports')
        .select('*, creator:profiles!daily_reports_created_by_fkey(full_name, role), acceptor:profiles!daily_reports_accepted_by_fkey(full_name, role), signer:profiles!daily_reports_signed_by_fkey(full_name, role), project_areas(name), projects(name)')
        .eq('id', report.id)
        .maybeSingle()

      const r = { ...report, ...(rep || {}) }
      const creator = (rep?.creator as Person) || { full_name: report.created_by_name || null, role: null }
      const acceptor = rep?.acceptor as Person
      const signer = (rep?.signer as Person) || (report.director_name ? { full_name: report.director_name, role: 'director' } : null)
      const status: string = r.status || 'pendiente'
      const projectName = (rep?.projects as { name?: string } | null)?.name || report.project_name || 'Obra'
      const areaName = (rep?.project_areas as { name?: string } | null)?.name || report.area_name || 'General'
      const folio: string | null = rep?.folio || null
      const version: number = rep?.version || 1

      // Bitácoras antiguas firmadas guardaban la firma del director en signature_url
      const directorSig = r.director_signature_url || (status === 'firmada' ? r.signature_url : null) || null
      const authorSig = r.signature_url && r.signature_url !== directorSig ? r.signature_url : null

      const pdf = await createPdf({
        companyName: report.company_name,
        logoUrl: report.company_logo_url,
        docLabel: 'Bitácora de obra',
      })

      pdf.title(`Bitácora de obra${folio ? ` ${folio}` : ''}`, [
        `${projectName} — ${areaName}`,
        `Fecha del reporte: ${formatDateOnly(r.report_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
      ])

      pdf.fields([
        ['Folio', folio || 'Sin folio'],
        ['Versión', version > 1 ? `${version} (con correcciones registradas)` : '1 (original)'],
        ['Obra', projectName],
        ['Área o frente', areaName],
        ['Elaboró', [creator?.full_name, roleLabel(creator?.role)].filter(Boolean).join(', ') || 'Sin registro'],
        ['Fecha de elaboración', rep?.created_at ? formatDateTime(rep.created_at) : 'Sin registro'],
        ['Estado', STATUS_LABELS[status] || status],
        ['Aceptó', acceptor?.full_name ? `${acceptor.full_name}${rep?.accepted_at ? `, ${formatDateTime(rep.accepted_at)}` : ''}` : 'Pendiente de aceptación'],
      ])

      pdf.section('Avances y actividades')
      pdf.paragraph(r.progress_notes || 'Sin detalles registrados.')

      if (rep?.special_request) {
        pdf.section('Solicitud para el director')
        pdf.paragraph(rep.special_request)
      }

      pdf.section('Firmas')
      pdf.signatures([
        {
          label: 'Elaboró',
          name: creator?.full_name,
          role: roleLabel(creator?.role),
          image: authorSig,
          signedAt: authorSig ? rep?.created_at : null,
          required: true,
        },
        {
          label: 'Vo. Bo. director de obra',
          name: signer?.full_name,
          role: roleLabel(signer?.role) || 'Director de obra',
          image: directorSig,
          signedAt: status === 'firmada' ? rep?.signed_at || null : null,
          required: true,
        },
      ])

      pdf.save(
        `bitacora_${folio || r.report_date}_${slug(projectName)}.pdf`,
        `${folio ? `Folio ${folio} · ` : ''}Versión ${version} · ${projectName}`
      )
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('No se pudo generar el PDF. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={generatePDF}
      disabled={exporting}
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
    >
      <Download className="w-3.5 h-3.5 text-blue-600" aria-hidden />
      {exporting ? 'Generando PDF...' : 'Descargar PDF'}
    </Button>
  )
}
