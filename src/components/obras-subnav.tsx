'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Archive, CheckCircle2, HardHat } from 'lucide-react'

const ITEMS = [
  { key: 'activa', label: 'En proceso', href: '/dashboard', icon: HardHat },
  { key: 'terminada', label: 'Terminadas', href: '/dashboard/archivo?estado=terminada', icon: CheckCircle2 },
  { key: 'archivada', label: 'Archivadas', href: '/dashboard/archivo?estado=archivada', icon: Archive },
] as const

function Items({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const estado = useSearchParams().get('estado')
  const current =
    pathname === '/dashboard' ? 'activa' : pathname.startsWith('/dashboard/archivo') ? (estado === 'archivada' ? 'archivada' : 'terminada') : null

  return (
    <ul className="ml-6 space-y-0.5 border-l border-slate-300 pl-2" aria-label="Obras por estado">
      {ITEMS.map((item) => {
        const active = current === item.key
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors ${
                active ? 'bg-white font-bold text-[#144CC9] shadow-sm' : 'font-medium text-slate-600 hover:bg-black/5 hover:text-[#031033]'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Subsecciones de "Obras y Bitácoras": en proceso, terminadas y archivadas. */
export function ObrasSubnav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <Items onNavigate={onNavigate} />
    </Suspense>
  )
}
