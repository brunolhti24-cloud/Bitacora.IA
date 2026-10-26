import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export type SummaryMetric = { label: string; value: string; hint?: string; bar?: number; alert?: boolean }

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
            Avance físico, bitácoras, finanzas y materiales de cada obra en un solo lugar.
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

      <dl className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 sm:mt-8">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`rounded-2xl border p-3.5 sm:p-4 ${m.alert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200/70'}`}
          >
            <dt className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{m.label}</dt>
            <dd className={`text-2xl sm:text-3xl font-black mt-1 ${m.alert ? 'text-amber-700' : m.bar !== undefined ? 'text-emerald-600' : 'text-slate-900'}`}>
              {m.value}
            </dd>
            {m.bar !== undefined ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.bar}%` }} />
              </div>
            ) : (
              <p className={`text-[11px] sm:text-xs mt-1 leading-snug ${m.alert ? 'text-amber-800' : 'text-slate-500'}`}>{m.hint}</p>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
