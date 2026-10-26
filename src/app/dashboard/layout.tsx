import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../login/actions'
import { Button } from '@/components/ui/button'
import { ChatWidget } from '@/components/chat-widget'
import { NotificationBell } from '@/components/notification-bell'
import { MobileNav } from '@/components/mobile-nav'
import { FolderKanban, CheckSquare, Receipt, ClipboardList, Users, Building2, ShieldCheck, Sparkles, UserCheck, HelpCircle, BarChart, User } from 'lucide-react'

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

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 font-sans">
      {/* High-Tech Header with Glassmorphism */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[#031033] px-3 sm:px-4 md:px-6 shadow-md transition-all gap-3">
        {/* Lado Izquierdo: Logo y Marca */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            {profile?.company_logo_url ? (
              <img
                src={profile.company_logo_url}
                alt="Logo Empresa"
                className="h-8 sm:h-9 w-auto max-w-[90px] sm:max-w-[150px] object-contain drop-shadow-xs rounded-md"
              />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <img src="/logo.png" alt="Bitacor.AI Logo" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  {profile?.company_name || 'Bitacor.AI'}
                </span>
              </div>
            )}
            
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20 hidden sm:inline-flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Bitacor.AI
            </span>
          </Link>
        </div>

        {/* Lado Derecho: Notificaciones, Usuario y Menú */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5 shrink-0">
          {/* Campanita */}
          <div className="text-white">
            <NotificationBell userId={user.id} />
          </div>
          
          {/* En Celular: Chip Elegante con Avatar, Nombre y Rol */}
          <Link
            href="/dashboard/perfil"
            className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all max-w-[130px]"
            title="Mi Perfil"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
              {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold block truncate leading-tight text-white">
                {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0"></span>
                <span className="text-[9px] text-[#22c55e] font-medium block truncate leading-none">{roleLabel}</span>
              </div>
            </div>
          </Link>

          {/* En Computadora (md y superior): Nombre grande y Rol */}
          <div className="hidden md:block text-right">
            <p className="text-lg lg:text-xl font-normal text-white leading-tight">
              {profile?.full_name || user.email}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]"></span>
              <span className="text-xs lg:text-sm font-light tracking-wide text-[#22c55e]">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* En Computadora: Botones Perfil y Salir */}
          <div className="hidden md:flex items-center gap-3 border-l border-white/20 pl-4">
            <Link
              href="/dashboard/perfil"
              className="text-sm font-normal text-white px-4 py-1.5 rounded-full border border-white hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Perfil</span>
            </Link>

            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-full h-8 px-4 py-1.5 text-sm font-normal bg-transparent text-white border-white hover:bg-white/10 hover:text-white transition-colors"
              >
                Salir
              </Button>
            </form>
          </div>

          {/* Menú Hamburguesa para Móvil y Tablet */}
          <div className="md:hidden flex items-center">
            <MobileNav 
              isAdmin={isAdmin}
              isResidente={isResidente}
              isAdminis={isAdminis}
              isSub={isSub}
              isOperador={isOperador}
              profile={profile}
              roleLabel={roleLabel}
              userEmail={user.email}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col justify-between bg-[#EAEBEF] p-4 md:flex">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Navegación Principal
            </div>

            {!isAdminis && (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all duration-200 group"
              >
                <FolderKanban className="w-4 h-4 text-[#144CC9] shrink-0 group-hover:scale-110 transition-transform" />
                <span>Obras y Bitácoras</span>
              </Link>
            )}

            {(isSub || isOperador) && (
              <Link
                href="/dashboard/mis-tareas"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all duration-200 group"
              >
                <CheckSquare className="w-4 h-4 text-[#144CC9] shrink-0 group-hover:scale-110 transition-transform" />
                <span>Tareas (Kanban)</span>
              </Link>
            )}

            {(isAdmin || isResidente) && (
              <Link
                href="/dashboard/equipo"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all duration-200 group"
              >
                <Users className="w-4 h-4 text-[#144CC9] shrink-0 group-hover:scale-110 transition-transform" />
                <span>Equipo de Trabajo</span>
              </Link>
            )}

            <div className="pt-8 pb-3 px-3 text-[11px] text-center font-bold uppercase tracking-widest text-[#031033]">
              AJUSTES DE CUENTA
            </div>

            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all duration-200 group"
            >
              <BarChart className="w-5 h-5 text-[#144CC9] shrink-0 group-hover:scale-110 transition-transform" />
              <span>Mi perfil y empresa</span>
            </Link>

            <Link
              href="/dashboard/manual"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all duration-200 group"
            >
              <HelpCircle className="w-5 h-5 text-[#144CC9] shrink-0 group-hover:scale-110 transition-transform" />
              <span>Manual de Usuario</span>
            </Link>
          </nav>

          <div className="mt-auto pt-4">
            <div className="rounded-2xl bg-[#031033] p-4 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#144CC9]/20 rounded-full blur-xl group-hover:bg-[#144CC9]/35 transition-all" />
              <div className="flex items-center gap-1.5 text-white font-black text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#A7EC80]" />
                <span>Bitacor.AI 2.0 Tech</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-medium">
                Command Center activo & Control Inteligente de Obra.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
      <ChatWidget isAdmin={isAdmin} />
    </div>
  )
}

