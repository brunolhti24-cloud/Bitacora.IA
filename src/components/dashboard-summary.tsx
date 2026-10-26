import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export type SummaryMetric = { label: string; value: string; hint?: string; bar?: number; alert?: boolean }

// Encabezado del dashboard de obras: marca + indicadores que requieren atención
export function DashboardSummary({ metrics, canCreate }: { metrics: SummaryMetric[]; canCreate: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#031033] p-5 sm:p-7 md:p-8 text-white shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(#144CC9_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-24 -right-16 w-80 h-80 bg-[#144CC9]/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
            Obras en Ejecución
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Avance físico, bitácoras, finanzas y materiales de cada obra en un solo lugar.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/dashboard/projects/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#A7EC80] hover:bg-[#bdf29f] px-5 py-3 text-sm font-black text-[#031033] shadow-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" aria-hidden />
            <span>Nueva Obra</span>
          </Link>
        )}
      </div>

      <dl className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 sm:mt-8">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 sm:p-4">
            <dt className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300">{m.label}</dt>
            <dd className={`text-2xl sm:text-3xl font-black mt-1 ${m.alert ? 'text-amber-300' : m.bar !== undefined ? 'text-[#A7EC80]' : 'text-white'}`}>
              {m.value}
            </dd>
            {m.bar !== undefined ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-[#A7EC80]" style={{ width: `${m.bar}%` }} />
              </div>
            ) : (
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">{m.hint}</p>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
