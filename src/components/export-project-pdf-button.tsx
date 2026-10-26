'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { addDays, formatDateOnly, formatDateTime, startOfMonth, todayInObra } from '@/lib/dates'
import { summarizeFinance, formatMoney } from '@/lib/finance'
import { createPdf, roleLabel, slug, STATUS_LABELS } from '@/lib/pdf'

interface ProjectPdfProps {
  project: {
    id: string
    name: string
    location?: string | null
    physical_progress?: number | null
    base_budget?: number | null
    start_date?: string | null
    client_name?: string | null
  }
}

type Period = 'todo' | 'mes' | 'semana' | 'rango'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'todo', label: 'Todo el historial' },
  { value: 'mes', label: 'Este mes' },
  { value: 'semana', label: 'Últimos 7 días' },
  { value: 'rango', label: 'Elegir fechas' },
]

type Person = { full_name: string | null; role: string | null } | null
type Company = { full_name: string | null; role: string | null; company_name?: string | null; company_logo_url?: string | null } | null

export function ExportProjectPdfButton({ project }: ProjectPdfProps) {
  const today = todayInObra()
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('todo')
  const [from, setFrom] = useState(startOfMonth(today))
  const [to, setTo] = useState(today)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const range = (): { from: string | null; to: string } => {
    if (period === 'mes') return { from: startOfMonth(today), to: today }
    if (period === 'semana') return { from: addDays(today, -6), to: today }
    if (period === 'rango') return { from, to }
    return { from: null, to: today }
  }

  const generate = async () => {
    setError(null)
    const { from: dFrom, to: dTo } = range()
    if (dFrom && dFrom > dTo) {
      setError('La fecha inicial es posterior a la final. Corrige el periodo.')
      return
    }
    setExporting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: me }, { data: proj }, { count: areasCount }] = await Promise.all([
        supabase.from('profiles').select('full_name, role, company_name, company_logo_url').eq('id', user?.id || '').maybeSingle(),
        supabase.from('projects').select('*, director:profiles!projects_created_by_fkey(full_name, role, company_name, company_logo_url)').eq('id', project.id).maybeSingle(),
        supabase.from('project_areas').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
      ])

      let reportsQuery = supabase
        .from('daily_reports')
        .select('id, folio, version, report_date, progress_notes, status, created_at, accepted_at, signed_at, creator:profiles!daily_reports_created_by_fkey(full_name, role), acceptor:profiles!daily_reports_accepted_by_fkey(full_name), signer:profiles!daily_reports_signed_by_fkey(full_name), project_areas(name)')
        .eq('project_id', project.id)
        .lte('report_date', dTo)
        .order('report_date', { ascending: true })
        .order('created_at', { ascending: true })
      if (dFrom) reportsQuery = reportsQuery.gte('report_date', dFrom)

      const [reportsRes, expensesRes, incomesRes] = await Promise.all([
        reportsQuery,
        supabase.from('expenses').select('amount, expense_date').eq('project_id', project.id).lte('expense_date', dTo),
        supabase.from('incomes').select('amount, income_date').eq('project_id', project.id).lte('income_date', dTo),
      ])

      // Antes un error de consulta se mostraba como "no hay reportes"; ahora se informa
      if (reportsRes.error) throw new Error(`No se pudieron leer las bitácoras: ${reportsRes.error.message}`)

      const p = { ...project, ...(proj || {}) }
      const director = (proj?.director as unknown as Company) || null
      const reports = reportsRes.data || []
      const canSeeIncomes = !incomesRes.error && ['admin', 'director'].includes(me?.role || '')
      const fin = summarizeFinance(p.base_budget, canSeeIncomes ? incomesRes.data : [], expensesRes.data)
      const signed = reports.filter((r) => r.status === 'firmada').length

      const periodLabel = dFrom
        ? `${formatDateOnly(dFrom)} al ${formatDateOnly(dTo)}`
        : `todo el historial hasta el ${formatDateOnly(dTo)}`

      const pdf = await createPdf({
        companyName: me?.company_name || director?.company_name,
        logoUrl: me?.company_logo_url || director?.company_logo_url,
        docLabel: 'Expediente de obra',
      })

      pdf.title(`Expediente de obra: ${p.name}`, [
        `Periodo: ${periodLabel}`,
        `Emitido: ${formatDateTime(new Date())}${me?.full_name ? ` por ${me.full_name}` : ''}`,
      ])

      pdf.section('Datos de la obra')
      pdf.fields([
        ['Obra', p.name],
        ['Ubicación', p.location || 'Sin ubicación registrada'],
        ['Cliente', p.client_name || 'Sin registro'],
        ['Inicio de obra', p.start_date ? formatDateOnly(p.start_date) : 'Sin registro'],
        ['Director de obra', director?.full_name || 'Sin registro'],
        ['Áreas o frentes', `${areasCount ?? 0}`],
        ['Avance físico actual', `${p.physical_progress || 0}%`],
        ['Bitácoras en el periodo', `${reports.length} (${signed} firmadas, ${reports.length - signed} pendientes)`],
      ])

      pdf.section(`Resumen financiero al ${formatDateOnly(dTo)}`)
      pdf.fields([
        ['Presupuesto autorizado', formatMoney(fin.budget)],
        ['Presupuesto por ejercer', `${formatMoney(fin.budgetRemaining)}${fin.budgetUsedPct !== null ? ` (ejercido ${fin.budgetUsedPct}%)` : ''}`],
        ['Ingresos recibidos', canSeeIncomes ? formatMoney(fin.incomes) : 'Solo visible para el director'],
        ['Gastos pagados', formatMoney(fin.expenses)],
        ['Saldo de caja (ingresos menos gastos)', canSeeIncomes ? formatMoney(fin.cash) : 'Solo visible para el director'],
      ])
      pdf.paragraph('El presupuesto autorizado no es dinero disponible. El saldo de caja solo considera ingresos recibidos y gastos pagados.', { size: 8, color: [90, 100, 120] })

      pdf.section('Bitácoras del periodo')
      if (reports.length === 0) {
        pdf.paragraph(`No hay bitácoras registradas en el periodo: ${periodLabel}.`, { color: [90, 100, 120] })
      } else {
        for (const r of reports) {
          const creator = r.creator as unknown as Person
          const signer = r.signer as unknown as Person
          const acceptor = r.acceptor as unknown as Person
          const area = (r.project_areas as unknown as { name?: string } | null)?.name || 'General'
          pdf.ensure(30)
          const doc = pdf.doc
          doc.setFillColor(241, 242, 244)
          doc.rect(14, pdf.y - 4.5, 182, 7, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9.5)
          doc.setTextColor(3, 16, 51)
          doc.text(`${r.folio || 'Sin folio'}  ·  ${formatDateOnly(r.report_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}  ·  ${area}`, 16, pdf.y)
          pdf.y += 7
          const signLine =
            r.status === 'firmada'
              ? `Firmada por ${signer?.full_name || 'el director'}${r.signed_at ? ` el ${formatDateTime(r.signed_at)}` : ''}`
              : r.status === 'aceptada'
              ? `Aceptada por ${acceptor?.full_name || 'el residente'}${r.accepted_at ? ` el ${formatDateTime(r.accepted_at)}` : ''}. Pendiente de firma del director`
              : STATUS_LABELS.pendiente
          pdf.paragraph(
            `Elaboró: ${[creator?.full_name, roleLabel(creator?.role)].filter(Boolean).join(', ') || 'Sin registro'}${(r.version || 1) > 1 ? `  ·  Versión ${r.version}` : ''}\n${signLine}`,
            { size: 8, color: [90, 100, 120] }
          )
          pdf.paragraph(r.progress_notes || 'Sin observaciones.', { size: 9.5 })
          pdf.y += 2
        }
      }

      pdf.section('Firmas del expediente')
      pdf.signatures([
        { label: 'Elaboró el expediente', name: me?.full_name, role: roleLabel(me?.role), required: true },
        { label: 'Vo. Bo. director de obra', name: director?.full_name, role: 'Director de obra', required: true },
      ])

      pdf.save(
        `Expediente_${slug(p.name)}_${dFrom ? `${dFrom}_a_${dTo}` : `hasta_${dTo}`}.pdf`,
        `Expediente de ${p.name} · Periodo: ${periodLabel}`
      )
      setOpen(false)
    } catch (err) {
      console.error('Error generando expediente:', err)
      setError(err instanceof Error ? err.message : 'No se pudo generar el expediente. Inténtalo de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="default"
            size="sm"
            className="gap-2 text-xs font-semibold bg-[#144CC9] text-white hover:bg-blue-700 rounded-full shadow-sm transition-all h-9 px-4"
          >
            <FileText className="w-4 h-4 text-white" aria-hidden />
            Exportar Expediente Oficial (PDF)
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Expediente Oficial</DialogTitle>
          <DialogDescription>
            Elige el periodo. El PDF incluye todas las bitácoras de esas fechas y el periodo queda impreso en el documento.
          </DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-plano">Periodo</legend>
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((opt) => (
              <label
                key={opt.value}
                className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                  period === opt.value ? 'border-obra bg-accent text-obra-strong' : 'border-border bg-white text-plano hover:bg-muted'
                }`}
              >
                <input
                  type="radio"
                  name="periodo"
                  value={opt.value}
                  checked={period === opt.value}
                  onChange={() => setPeriod(opt.value)}
                  className="accent-[var(--obra)]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {period === 'rango' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-from">Desde</Label>
              <Input id="exp-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-to">Hasta</Label>
              <Input id="exp-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={generate} disabled={exporting} className="gap-2">
            {exporting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {exporting ? 'Generando…' : 'Descargar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
