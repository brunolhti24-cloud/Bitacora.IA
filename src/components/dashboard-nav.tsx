'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, CheckSquare, Users, UserCog, BookOpen, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavRoles = {
  isAdmin: boolean
  isResidente: boolean
  isAdminis: boolean
  isSub: boolean
  isOperador: boolean
}

type NavItem = { href: string; label: string; icon: LucideIcon; show: (r: NavRoles) => boolean }

const WORK_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Obras y bitácoras', icon: FolderKanban, show: (r) => !r.isAdminis },
  { href: '/dashboard/mis-tareas', label: 'Mis tareas', icon: CheckSquare, show: (r) => r.isSub || r.isOperador },
  { href: '/dashboard/equipo', label: 'Equipo de trabajo', icon: Users, show: (r) => r.isAdmin || r.isResidente },
]

const ACCOUNT_ITEMS: NavItem[] = [
  { href: '/dashboard/perfil', label: 'Perfil y empresa', icon: UserCog, show: () => true },
  { href: '/dashboard/manual', label: 'Manual de usuario', icon: BookOpen, show: () => true },
]

function isActive(pathname: string, href: string) {
  // "Obras" también cubre el detalle de cada proyecto
  if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/projects')
  return pathname === href || pathname.startsWith(href + '/')
}

export function DashboardNav({ roles, onNavigate }: { roles: NavRoles; onNavigate?: () => void }) {
  const pathname = usePathname()

  const renderGroup = (title: string, items: NavItem[]) => {
    const visible = items.filter((i) => i.show(roles))
    if (visible.length === 0) return null
    return (
      <div className="space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{title}</p>
        {visible.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-150',
                active
                  ? 'bg-white text-plano shadow-[0_1px_0_var(--junta)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-obra'
                  : 'text-plano/75 hover:bg-white/60 hover:text-plano'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-obra' : 'text-plano/55')} aria-hidden />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <nav aria-label="Navegación principal" className="space-y-6">
      {renderGroup('Trabajo', WORK_ITEMS)}
      {renderGroup('Cuenta', ACCOUNT_ITEMS)}
    </nav>
  )
}
