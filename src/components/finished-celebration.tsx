'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const COLORS = ['#144CC9', '#A7EC80', '#031033', '#F59E0B', '#0E7490']

// Confeti de un solo disparo: cada pieza sale del sello hacia un punto fijo (sin azar,
// para que servidor y navegador dibujen lo mismo)
const PIECES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2
  const reach = 110 + (i % 3) * 38
  return {
    dx: `${Math.round(Math.cos(angle) * reach)}px`,
    dy: `${Math.round(Math.sin(angle) * reach * 0.8 + 40)}px`,
    giro: `${(i % 2 ? 1 : -1) * (160 + i * 12)}deg`,
    delay: `${120 + (i % 6) * 40}ms`,
    color: COLORS[i % COLORS.length],
    round: i % 4 === 0,
  }
})

/** Logro al marcar una obra como terminada. Se muestra una vez, al llegar a "Terminadas". */
export function FinishedCelebration({ projectName, reports }: { projectName: string; reports: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const close = () => {
    setOpen(false)
    // Se quita ?logro= para que no vuelva a salir al recargar
    router.replace('/dashboard/archivo?estado=terminada', { scroll: false })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="overflow-visible p-8 text-center sm:max-w-md">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
            {PIECES.map((p, i) => (
              <span
                key={i}
                className={`logro-confeti absolute block h-2.5 w-2.5 ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
                style={{ backgroundColor: p.color, animationDelay: p.delay, ['--dx' as string]: p.dx, ['--dy' as string]: p.dy, ['--giro' as string]: p.giro }}
              />
            ))}
          </div>
          <div className="logro-sello relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-8 ring-emerald-100">
            <Check className="h-10 w-10" strokeWidth={3} aria-hidden />
          </div>
        </div>

        <div className="logro-texto space-y-2" style={{ animationDelay: '220ms' }}>
          <DialogTitle className="text-2xl font-black tracking-tight text-[#031033]">¡Obra terminada!</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{projectName}</strong> quedó concluida
            {reports > 0 ? ` con ${reports} ${reports === 1 ? 'bitácora registrada' : 'bitácoras registradas'}` : ''}. Todo su historial se conserva en
            Terminadas.
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={close} className="bg-[#144CC9] hover:bg-blue-700">Ver obras terminadas</Button>
          <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Volver al tablero
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
