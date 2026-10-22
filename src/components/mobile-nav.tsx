'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/app/login/actions'
import { Menu, X, LogOut } from 'lucide-react'
import { DashboardNav, type NavRoles } from '@/components/dashboard-nav'

export function MobileNav({
  roles,
  displayName,
  roleLabel,
  companyName,
}: {
  roles: NavRoles
  displayName: string
  roleLabel: string
  companyName?: string | null
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Cerrar con Escape y bloquear el scroll del fondo mientras el menú está abierto
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
        aria-label="Abrir menú"
        aria-expanded={isOpen}
      >
        <Menu className="h-6 w-6" aria-hidden />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="fixed inset-0 bg-plano/60" onClick={() => setIsOpen(false)} />

          <div className="relative z-[110] flex h-full w-4/5 max-w-xs flex-col overflow-y-auto bg-sidebar text-foreground shadow-xl animate-in slide-in-from-left duration-200">
            <div className="plano-grid flex items-start justify-between gap-3 px-4 pb-4 pt-5 text-white">
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight">{displayName}</p>
                <p className="mt-0.5 text-sm text-brote">{roleLabel}</p>
                {companyName && <p className="mt-1 truncate text-xs text-white/60">{companyName}</p>}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 px-3 py-5">
              <DashboardNav roles={roles} onNavigate={() => setIsOpen(false)} />
            </div>

            <form action={logout} className="border-t border-border p-3">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
