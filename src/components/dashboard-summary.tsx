import Link from 'next/link'
import { ChevronRight, PlusCircle } from 'lucide-react'

export type SummaryMetric = { label: string; value: string; hint?: string; bar?: number; alert?: boolean; danger?: boolean; href?: string }

// Encabezado del dashboard de obras: título + indicadores que requieren atención
export function DashboardSummary({ metrics, canCreate }: { metrics: SummaryMetric[]; canCreate: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-5 sm:p-7 md:p-8 text-slate-800 shadow-md border border-slate-200/90">
      <div className="absolute inset-0 bg-[radial-gradient(#144CC9_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Obras en Ejecución
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Pendientes, bitácoras, cronograma, finanzas y materiales de cada obra en un solo lugar.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/dashboard/projects/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#144CC9] hover:bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" aria-hidden />
            <span>Nueva Obra</span>
          </Link>
        )}
      </div>

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 sm:mt-8">
        {metrics.map((m) => {
          const tone = m.danger ? 'bg-red-50 border-red-200' : m.alert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200/70'
          const body = (
            <>
              <p className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                {m.label}
                {m.href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />}
              </p>
              <p className={`text-2xl sm:text-3xl font-black mt-1 ${m.danger ? 'text-red-700' : m.alert ? 'text-amber-700' : 'text-slate-900'}`}>
                {m.value}
              </p>
              {m.bar !== undefined ? (
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full bg-slate-500" style={{ width: `${m.bar}%` }} />
                </div>
              ) : (
                <p className={`text-[11px] sm:text-xs mt-1 leading-snug ${m.danger ? 'text-red-800' : m.alert ? 'text-amber-800' : 'text-slate-500'}`}>
                  {m.hint}
                  {m.href && <span className="mt-1 block font-semibold underline-offset-2 group-hover:underline">Ver detalle</span>}
                </p>
              )}
            </>
          )
          return m.href ? (
            <Link
              key={m.label}
              href={m.href}
              className={`group rounded-2xl border p-3.5 sm:p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#144CC9] focus-visible:ring-offset-2 ${tone}`}
            >
              <div>{body}</div>
            </Link>
          ) : (
            <div key={m.label} className={`rounded-2xl border p-3.5 sm:p-4 ${tone}`}>
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}
