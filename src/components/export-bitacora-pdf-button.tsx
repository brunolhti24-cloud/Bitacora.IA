'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BitacoraReport {
  id: string
  report_date: string
  progress_notes: string
  weather?: string
  workers_count?: number
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

async function loadLogo(url: string): Promise<{ base64: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null

  // 1. Intentar con fetch + blob
  try {
    const res = await fetch(url)
    if (res.ok) {
      const blob = await res.blob()
      const isJpeg = blob.type.includes('jpeg') || blob.type.includes('jpg')
      const format = isJpeg ? 'JPEG' : 'PNG'
      const base64 = await new Promise<string>((resBlob, rejBlob) => {
        const reader = new FileReader()
        reader.onloadend = () => resBlob(reader.result as string)
        reader.onerror = rejBlob
        reader.readAsDataURL(blob)
      })

      const dims = await new Promise<{ width: number; height: number }>((resDim) => {
        const img = new Image()
        img.onload = () => resDim({ width: img.naturalWidth || 200, height: img.naturalHeight || 100 })
        img.onerror = () => resDim({ width: 200, height: 100 })
        img.src = base64
      })

      return { base64, width: dims.width, height: dims.height, format }
    }
  } catch {
    // Fallback a Image + Canvas si fetch falla
  }

  // 2. Fallback Image + Canvas
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || 200
        const height = img.naturalHeight || 100
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const isJpeg = url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')
          const format = isJpeg ? 'JPEG' : 'PNG'
          const base64 = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png')
          resolve({ base64, width, height, format })
        } else {
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export function ExportBitacoraPdfButton({ report }: { report: BitacoraReport }) {
  const [exporting, setExporting] = useState(false)

  const generatePDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExporting(true)

    try {
      // Obtener datos de la empresa y firmas si faltan
      let companyLogoUrl = report.company_logo_url
      let companyName = report.company_name
      let directorSignatureUrl = report.director_signature_url
      let directorName = report.director_name
      let residentSignatureUrl = report.signature_url
      let status = report.status

      try {
        const supabase = createClient()

        if (!companyLogoUrl || !companyName) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('company_name, company_logo_url')
              .eq('id', user.id)
              .single()

            if (!companyLogoUrl && myProfile?.company_logo_url) {
              companyLogoUrl = myProfile.company_logo_url
            }
            if (!companyName && myProfile?.company_name) {
              companyName = myProfile.company_name
            }

            if (!companyLogoUrl && report.id) {
              const { data: rep } = await supabase
                .from('daily_reports')
                .select('project_id, projects(created_by, profiles:created_by(company_name, company_logo_url))')
                .eq('id', report.id)
                .single()

              const projCreator = (rep as any)?.projects?.profiles
              if (projCreator?.company_logo_url) {
                companyLogoUrl = projCreator.company_logo_url
              }
              if (!companyName && projCreator?.company_name) {
                companyName = projCreator.company_name
              }
            }
          }
        }

        // Consultar firmas si faltan
        if ((!directorSignatureUrl || !directorName) && report.id) {
          const { data: repData } = await supabase
            .from('daily_reports')
            .select('signature_url, director_signature_url, status, signer:profiles!daily_reports_signed_by_fkey(full_name), acceptor:profiles!daily_reports_accepted_by_fkey(full_name)')
            .eq('id', report.id)
            .single()

          if (repData) {
            if (!directorSignatureUrl && repData.director_signature_url) {
              directorSignatureUrl = repData.director_signature_url
            }
            if (!directorName) {
              directorName = (repData.signer as any)?.full_name || (repData.acceptor as any)?.full_name
            }
            if (!residentSignatureUrl && repData.signature_url) {
              residentSignatureUrl = repData.signature_url
            }
            if (!status && repData.status) {
              status = repData.status
            }
          }
        }
      } catch (dbErr) {
        console.warn('No se pudo obtener datos complementarios:', dbErr)
      }

      // Cargar logo si existe
      const logoData = companyLogoUrl ? await loadLogo(companyLogoUrl) : null

      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Header Branding (Dark Navy)
      doc.setFillColor(26, 26, 46) // #1a1a2e Dark Navy
      doc.rect(0, 0, 210, 36, 'F')
      
      // Nosotros (Bitacor.AI) en chico a la izquierda
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('BITACOR.AI', 14, 11)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(203, 213, 225)
      doc.text('Sistema de Gestión de Obra | Reporte Oficial', 14, 16)

      // Solo mostrar Nombre de Empresa si fue configurado en Perfil (NUNCA el nombre del proyecto aquí)
      if (companyName && companyName.trim().length > 0 && companyName.trim().toLowerCase() !== (report.project_name || '').toLowerCase()) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(companyName.trim(), 14, 26)
      }

      // Logo de la Empresa (a la derecha en el header)
      if (logoData) {
        try {
          const maxWidth = 50
          const maxHeight = 24
          const ratio = Math.min(maxWidth / logoData.width, maxHeight / logoData.height)
          const renderW = logoData.width * ratio
          const renderH = logoData.height * ratio
          const renderX = 196 - renderW // alineado al margen derecho 196mm
          const renderY = 6 + (maxHeight - renderH) / 2

          // Contenedor blanco sutil para asegurar visibilidad de cualquier logo
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(renderX - 2.5, renderY - 1.5, renderW + 5, renderH + 3, 2, 2, 'F')
          doc.addImage(logoData.base64, logoData.format, renderX, renderY, renderW, renderH, undefined, 'FAST')
        } catch (imgErr) {
          console.warn('Error dibujando logo de empresa:', imgErr)
        }
      }

      // Report Title
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DIARIO DE BITÁCORA', 14, 46)

      // Divider
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(14, 50, 196, 50)

      // Meta Info Grid (2 Columnas limpias y equilibradas sin Código Doc)
      doc.setFontSize(9.5)
      
      // Fila 1 (y = 58)
      doc.setFont('helvetica', 'bold')
      doc.text('Proyecto:', 14, 58)
      doc.setFont('helvetica', 'normal')
      doc.text(report.project_name || 'N/A', 38, 58)

      const formattedDate = new Date(report.report_date).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha Reporte:', 115, 58)
      doc.setFont('helvetica', 'normal')
      doc.text(formattedDate, 145, 58)

      // Fila 2 (y = 66)
      doc.setFont('helvetica', 'bold')
      doc.text('Área de Obra:', 14, 66)
      doc.setFont('helvetica', 'normal')
      doc.text(report.area_name || 'General', 38, 66)

      doc.setFont('helvetica', 'bold')
      doc.text('Elaborado por:', 115, 66)
      doc.setFont('helvetica', 'normal')
      doc.text(report.created_by_name || 'Residente de Obra', 145, 66)

      // Content Box Header
      doc.setFillColor(248, 250, 252)
      doc.rect(14, 76, 182, 9, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.rect(14, 76, 182, 9, 'S')
      
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.text('AVANCES Y ACTIVIDADES REALIZADAS', 18, 82)

      // Content Text
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(51, 65, 85)

      const splitNotes = doc.splitTextToSize(report.progress_notes || 'Sin detalles registrados.', 174)
      doc.text(splitNotes, 18, 93)

      // Calculate y position for footer
      const notesHeight = splitNotes.length * 5
      const footerY = Math.max(93 + notesHeight + 35, 190)

      // Resolución de firmas:
      // Si la bitácora está firmada y directorSignatureUrl está vacío pero residentSignatureUrl tiene firma,
      // corresponde a la firma de director anterior.
      const directorSig = directorSignatureUrl || (status === 'firmada' ? residentSignatureUrl : null)
      const residentSig = (residentSignatureUrl && residentSignatureUrl !== directorSig)
        ? residentSignatureUrl
        : (status !== 'firmada' ? residentSignatureUrl : null)

      // Columna Izquierda: Firma Responsable de Elaboración
      if (residentSig) {
        try {
          doc.addImage(residentSig, 'PNG', 14, footerY - 26, 60, 24)
        } catch (imgErr) {
          console.error('Error dibujando imagen de firma residente:', imgErr)
        }
      }

      // Columna Derecha: Firma Director / Supervisión
      if (directorSig) {
        try {
          doc.addImage(directorSig, 'PNG', 130, footerY - 26, 60, 24)
        } catch (imgErr) {
          console.error('Error dibujando imagen de firma director:', imgErr)
        }
      }

      // Línea y textos - Columna Izquierda
      doc.setDrawColor(203, 213, 225)
      doc.line(14, footerY, 80, footerY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Firma Responsable de Elaboración', 14, footerY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(report.created_by_name || 'Residente de Obra', 14, footerY + 9)

      // Línea y textos - Columna Derecha
      doc.line(130, footerY, 196, footerY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Firma Director / Supervisión', 130, footerY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(directorName || 'Director Responsable de Obra', 130, footerY + 9)

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Generado el ${new Date().toLocaleString('es-MX')} por Bitacor.AI`, 14, 285)
      doc.text('Página 1 de 1', 170, 285)

      // Save PDF
      doc.save(`bitacora_${report.report_date}_${report.id.substring(0, 5)}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('Error generando PDF. Intenta de nuevo.')
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
      <Download className="w-3.5 h-3.5 text-blue-600" />
      {exporting ? 'Generando PDF...' : 'Descargar PDF'}
    </Button>
  )
}

