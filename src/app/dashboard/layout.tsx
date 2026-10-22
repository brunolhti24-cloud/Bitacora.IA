import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'
import { Button } from '@/components/ui/button'
import { ChatWidget } from '@/components/chat-widget'
import { NotificationBell } from '@/components/notification-bell'
import { MobileNav } from '@/components/mobile-nav'
import { DashboardNav } from '@/components/dashboard-nav'
import { LogOut } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtenemos el perfil del usuario para mostrar su nombre
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, company_name, company_logo_url')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role || 'admin'
  const isAdmin = role === 'admin' || role === 'director'
  const isResidente = role === 'residente'
  const isAdminis = role === 'administracion'
  const isSub = role === 'subcontratista'
  const isOperador = role === 'operador'

  const roleLabel =
    role === 'admin' || role === 'director' ? 'Director de Obra'
    : role === 'residente' ? 'Residente de Obra'
    : role === 'administracion' ? 'Administración'
    : role === 'subcontratista' ? 'Contratista'
    : 'Operador'

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
  const initial = displayName.charAt(0).toUpperCase()
  const roles = { isAdmin, isResidente, isAdminis, isSub, isOperador }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-plano px-3 text-white sm:px-4 md:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-md">
          {profile?.company_logo_url ? (
            <img
              src={profile.company_logo_url}
              alt={profile?.company_name || 'Logo de la empresa'}
              className="h-8 w-auto max-w-[110px] rounded object-contain sm:max-w-[150px]"
            />
          ) : (
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          )}
          <span className="truncate text-base font-extrabold tracking-tight [font-stretch:84%] sm:text-lg">
            {profile?.company_name || 'Bitacor.AI'}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationBell userId={user.id} />

          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10"
            title="Mi perfil"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brote text-sm font-bold text-plano">
              {initial}
            </span>
            <span className="block min-w-0 text-left">
              <span className="block max-w-[92px] truncate text-sm font-semibold leading-tight sm:max-w-[180px]">{displayName}</span>
              <span className="block max-w-[92px] truncate text-xs leading-tight text-white/65 sm:max-w-none">{roleLabel}</span>
            </span>
          </Link>

          <form action={logout} className="hidden md:block">
            <Button
              type="submit"
              variant="ghost"
              className="h-9 gap-1.5 px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </Button>
          </form>

          <MobileNav
            roles={roles}
            displayName={displayName}
            roleLabel={roleLabel}
            companyName={profile?.company_name}
          />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 md:flex">
          <DashboardNav roles={roles} />
          <p className="mt-auto px-3 text-xs text-muted-foreground">Bitacor.AI, control de obra</p>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <ChatWidget isAdmin={isAdmin} />
    </div>
  )
}
