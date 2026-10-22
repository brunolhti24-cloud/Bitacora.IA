import { cn } from '@/lib/utils'

// Barra de avance tipo cinta métrica (marcas cada 10%). Estilos en globals.css (.cinta)
export function ProgressTape({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      data-done={pct >= 100}
      className={cn('cinta', className)}
    >
      <div data-fill style={{ width: `${pct}%` }} />
    </div>
  )
}
