'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Table as TableIcon, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExpenseReportItem {
  id: string
  concept: string
  amount: number
  expense_date: string
  project_name?: string
  created_by_name?: string
  category?: string
}

interface ExportExpensesProps {
  expenses: ExpenseReportItem[]
  title?: string
  projectName?: string
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

export function ExportExpensesButton({ expenses, title = 'Control General de Gastos', projectName }: ExportExpensesProps) {
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const generateCSV = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExportingCsv(true)

    try {
      const headers = ['ID', 'Fecha', 'Concepto', 'Monto (MXN)', 'Proyecto', 'Responsable', 'Categoría']
      const rows = expenses.map(exp => [
        exp.id.substring(0, 8),
        exp.expense_date || '',
        `"${(exp.concept || '').replace(/"/g, '""')}"`,
        Number(exp.amount || 0).toFixed(2),
        `"${(exp.project_name || projectName || 'N/A').replace(/"/g, '""')}"`,
        `"${(exp.created_by_name || 'Usuario').replace(/"/g, '""')}"`,
        `"${(exp.category || 'General').replace(/"/g, '""')}"`
      ])

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      const filename = `Reporte_Gastos_${projectName ? projectName.replace(/\s+/g, '_') : 'General'}_${new Date().toISOString().slice(0, 10)}.csv`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error al exportar Excel/CSV:', err)
      alert('Hubo un error al generar el archivo Excel.')
    } finally {
      setExportingCsv(false)
    }
  }

  const generatePDF = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExportingPdf(true)

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

      let currentY = 0
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 30) {
          doc.addPage()
          doc.setFillColor(248, 250, 252)
          doc.rect(14, 15, 182, 8, 'F')
          doc.setTextColor(100, 116, 139)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text(`Bitacor.AI - Reporte de Gastos (continuación)`, 18, 20)
          currentY = 30
          drawTableHeader()
        }
      }

      const drawTableHeader = () => {
        doc.setFillColor(241, 245, 249)
        doc.rect(14, currentY, 182, 8, 'F')
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text('FECHA', 17, currentY + 5.5)
        doc.text('CONCEPTO / DESCRIPCIÓN', 42, currentY + 5.5)
        doc.text('PROYECTO', 120, currentY + 5.5)
        doc.text('MONTO (MXN)', 168, currentY + 5.5)
        currentY += 8
      }

      // 1. Header Branding
      doc.setFillColor(26, 26, 46) // Dark Navy
      doc.rect(0, 0, 210, 36, 'F')
      
      // Nosotros en chico a la izquierda
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('BITACOR.AI 2.0', 14, 11)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(203, 213, 225)
      doc.text('Reporte Oficial de Finanzas y Control de Gastos', 14, 16)

      // Nombre de la empresa en grande
      const companyDisplayName = companyName || projectName || 'CONTROL FINANCIERO'
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
      currentY = 45
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.text(title.toUpperCase(), 14, 45)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-MX')}`, 155, 45)

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(14, 48, 196, 48)

      // 3. Summary Box
      const totalAmount = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
      doc.setFillColor(248, 250, 252)
      doc.rect(14, 53, 182, 22, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.rect(14, 53, 182, 22, 'S')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text('Total de Tickets / Gasto Registrado:', 18, 66)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.setFontSize(13)
      doc.text(`$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 95, 66)

      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Comprobantes: ${expenses.length}`, 155, 66)

      // 4. Table of Expenses
      currentY = 83
      drawTableHeader()

      if (expenses.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text('No hay gastos registrados en este reporte.', 18, currentY + 8)
        currentY += 15
      } else {
        expenses.forEach((exp) => {
          const expDate = exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A'
          const conceptText = exp.concept || 'Sin descripción'
          const splitConcept = doc.splitTextToSize(conceptText, 72)
          const rowHeight = Math.max(8, splitConcept.length * 4 + 4)

          checkPageBreak(rowHeight)

          doc.setDrawColor(226, 232, 240)
          doc.rect(14, currentY, 182, rowHeight, 'S')

          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(51, 65, 85)
          doc.text(expDate, 17, currentY + 5)
          doc.text(splitConcept, 42, currentY + 5)
          
          const projName = exp.project_name || projectName || 'General'
          doc.text(projName.substring(0, 22), 120, currentY + 5)

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(30, 41, 59)
          const amountStr = `$${Number(exp.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          doc.text(amountStr, 168, currentY + 5)

          currentY += rowHeight
        })
      }

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Generado por Bitacor.AI el ${new Date().toLocaleString('es-MX')} | Reporte Oficial de Auditoría`, 14, pageHeight - 10)

      doc.save(`Reporte_Gastos_${projectName ? projectName.replace(/\s+/g, '_') : 'General'}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Error generando PDF de gastos:', err)
      alert('Hubo un error al generar el archivo PDF de gastos.')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={generateCSV}
        disabled={exportingCsv || exportingPdf || expenses.length === 0}
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs font-semibold bg-white text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 shadow-sm transition-all"
      >
        <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
        {exportingCsv ? 'Exportando...' : 'Exportar Excel'}
      </Button>
      <Button
        onClick={generatePDF}
        disabled={exportingPdf || exportingCsv || expenses.length === 0}
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs font-semibold bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50 border-slate-300 shadow-sm transition-all"
      >
        <FileText className="w-3.5 h-3.5 text-blue-600" />
        {exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
      </Button>
    </div>
  )
}

