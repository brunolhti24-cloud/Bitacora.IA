'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Building2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProjectPdfProps {
  project: {
    id: string
    name: string
    location: string
    physical_progress: number
    base_budget: number
    status?: string
  }
  areasCount: number
  recentReports: {
    id: string
    report_date: string
    progress_notes: string
    created_by_name?: string
    area_name?: string
  }[]
  totalExpenses?: number
}

async function loadLogo(url: string): Promise<{ base64: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null
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
  } catch {}
  return null
}

export function ExportProjectPdfButton({ project, areasCount, recentReports, totalExpenses = 0 }: ProjectPdfProps) {
  const [exporting, setExporting] = useState(false)

  const generatePDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExporting(true)

    try {
      let companyLogoUrl: string | null = null
      let companyName: string | null = null

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('company_name, company_logo_url')
            .eq('id', user.id)
            .single()
          if (prof?.company_logo_url) companyLogoUrl = prof.company_logo_url
          if (prof?.company_name) companyName = prof.company_name
        }
      } catch (dbErr) {
        console.warn('Error fetching profile logo:', dbErr)
      }

      const logoData = companyLogoUrl ? await loadLogo(companyLogoUrl) : null

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Function to check page overflow and create new page
      let currentY = 0
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 35) {
          doc.addPage()
          // Re-draw subheader on new page
          doc.setFillColor(248, 250, 252)
          doc.rect(14, 15, 182, 8, 'F')
          doc.setTextColor(100, 116, 139)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text(`Bitacor.AI - Expediente Técnico: ${project.name} (continuación)`, 18, 20)
          currentY = 30
        }
      }

      // 1. Header Branding
      doc.setFillColor(26, 26, 46) // #1a1a2e Dark Navy
      doc.rect(0, 0, 210, 36, 'F')
      
      // Nosotros en chico a la izquierda
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('BITACOR.AI', 14, 11)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(203, 213, 225)
      doc.text('Sistema Multirrol de Gestión y Supervisión de Obra', 14, 16)

      // Nombre de la empresa en grande
      const companyDisplayName = companyName || project.name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.text(companyDisplayName, 14, 26)

      // Logo de la empresa en el header
      if (logoData) {
        try {
          const maxWidth = 48
          const maxHeight = 24
          const ratio = Math.min(maxWidth / logoData.width, maxHeight / logoData.height)
          const renderW = logoData.width * ratio
          const renderH = logoData.height * ratio
          const renderX = 196 - renderW
          const renderY = 6 + (maxHeight - renderH) / 2

          doc.setFillColor(255, 255, 255)
          doc.roundedRect(renderX - 2.5, renderY - 1.5, renderW + 5, renderH + 3, 2, 2, 'F')
          doc.addImage(logoData.base64, logoData.format, renderX, renderY, renderW, renderH, undefined, 'FAST')
        } catch (imgErr) {
          console.warn('Error dibujando logo:', imgErr)
        }
      }

      // 2. Report Title
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('EXPEDIENTE TÉCNICO Y AVANCE DE OBRA', 14, 48)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, 130, 48)

      // Divider
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(14, 52, 196, 52)

      // 3. Project Summary Box
      doc.setFillColor(248, 250, 252)
      doc.rect(14, 58, 182, 38, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.rect(14, 58, 182, 38, 'S')

      doc.setFontSize(10)
      
      // Left Column
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Nombre de la Obra:', 18, 68)
      doc.setFont('helvetica', 'normal')
      doc.text(project.name || 'N/A', 60, 68)

      doc.setFont('helvetica', 'bold')
      doc.text('Ubicación:', 18, 76)
      doc.setFont('helvetica', 'normal')
      doc.text(project.location || 'Sin ubicación registrada', 60, 76)

      doc.setFont('helvetica', 'bold')
      doc.text('Áreas / Frentes:', 18, 84)
      doc.setFont('helvetica', 'normal')
      doc.text(`${areasCount} área(s) activas`, 60, 84)

      // Right Column
      doc.setFont('helvetica', 'bold')
      doc.text('Avance Físico:', 125, 68)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235) // Blue-600
      doc.text(`${project.physical_progress || 0}%`, 160, 68)

      doc.setTextColor(51, 65, 85)
      doc.setFont('helvetica', 'bold')
      doc.text('Presupuesto Base:', 125, 76)
      doc.setFont('helvetica', 'normal')
      doc.text(`$${(project.base_budget || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 160, 76)

      doc.setFont('helvetica', 'bold')
      doc.text('Gastos Registrados:', 125, 84)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38) // Red-600
      doc.text(`-$${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 160, 84)

      // 4. Recent Reports Section
      currentY = 108
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('ÚLTIMOS REPORTES DIARIOS DE BITÁCORA', 14, currentY)

      doc.setDrawColor(226, 232, 240)
      doc.line(14, currentY + 3, 196, currentY + 3)
      currentY += 10

      if (recentReports.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text('No hay reportes diarios registrados recientemente en esta obra.', 14, currentY)
        currentY += 15
      } else {
        recentReports.forEach((rep, index) => {
          const repDate = new Date(rep.report_date).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          const notesText = rep.progress_notes || 'Sin observaciones.'
          const splitNotes = doc.splitTextToSize(notesText, 172)
          const boxHeight = 16 + (splitNotes.length * 4.5)

          checkPageBreak(boxHeight + 6)

          // Report Header Box
          doc.setFillColor(241, 245, 249) // Slate-100
          doc.rect(14, currentY, 182, 8, 'F')
          doc.setDrawColor(203, 213, 225)
          doc.rect(14, currentY, 182, boxHeight, 'S')

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 41, 59)
          doc.text(`[${repDate}] Área: ${rep.area_name || 'General'}`, 18, currentY + 5.5)

          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 116, 139)
          doc.text(`Responsable: ${rep.created_by_name || 'Residente de Obra'}`, 125, currentY + 5.5)

          // Report Body Text
          doc.setFontSize(9)
          doc.setTextColor(51, 65, 85)
          doc.text(splitNotes, 18, currentY + 14)

          currentY += boxHeight + 6
        })
      }

      // 5. Signature Footer
      checkPageBreak(35)
      const footerY = Math.max(currentY + 20, pageHeight - 35)

      doc.setDrawColor(203, 213, 225)
      doc.line(20, footerY, 85, footerY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Firma Residente Responsable', 25, footerY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Supervisión de Campo / Bitácora', 27, footerY + 9)

      doc.setDrawColor(203, 213, 225)
      doc.line(125, footerY, 190, footerY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Firma Director de Obra / Vo.Bo.', 128, footerY + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Aprobación General de Proyecto', 133, footerY + 9)

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Generado por la Plataforma Bitacor.AI el ${new Date().toLocaleString('es-MX')}`, 14, pageHeight - 10)
      doc.text('Documento Oficial de Control', 160, pageHeight - 10)

      // Save
      doc.save(`Expediente_Obra_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Error generando PDF de obra:', err)
      alert('Hubo un error al generar el archivo PDF del proyecto.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={generatePDF}
      disabled={exporting}
      variant="default"
      size="sm"
      className="gap-2 text-xs font-semibold bg-[#144CC9] text-white hover:bg-blue-700 rounded-full shadow-sm transition-all h-9 px-4"
    >
      <FileText className="w-4 h-4 text-white" />
      {exporting ? 'Generando PDF...' : 'Exportar Expediente Oficial (PDF)'}
    </Button>
  )
}

