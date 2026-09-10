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
    .single()

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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[#031033] px-4 shadow-md md:px-6 transition-all">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex items-center gap-3">
              {profile?.company_logo_url ? (
                <div className="flex items-center gap-2.5">
                  <img
                    src={profile.company_logo_url}
                    alt="Logo Empresa"
                    className="h-9 w-auto max-w-[160px] object-contain drop-shadow-xs rounded-md"
                  />
                  {profile?.company_name && (
                    <span className="text-lg font-black tracking-tight text-white hidden sm:inline">
                      {profile.company_name}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Bitacor.AI Logo" className="h-8 w-8 object-contain" />
                  <span className="text-xl font-black tracking-tight text-white">
                    {profile?.company_name || 'Bitacor.AI'}
                  </span>
                </div>
              )}
            </div>
            
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/20 hidden sm:inline-flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Bitacor.AI 2.0
            </span>

            {profile?.company_name && (
              <span className="text-xs font-bold text-slate-300 border-l border-white/20 pl-3 hidden md:inline">
                {profile.company_name}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-white">
            <NotificationBell userId={user.id} />
          </div>
          
          <div className="hidden md:block text-right mr-2">
            <p className="text-2xl font-normal text-white leading-tight">{profile?.full_name || user.email}</p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#22c55e]"></span>
              <span className="text-sm font-light tracking-wide text-[#22c55e]">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/20 pl-4">
            <User className="w-6 h-6 text-white" />
            <Link
              href="/dashboard/perfil"
              className="text-sm font-normal text-white px-4 py-1.5 rounded-full border border-white hover:bg-white/10 transition-all flex items-center"
            >
              Perfil
            </Link>

            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-full h-8 px-4 py-1.5 text-sm font-normal bg-transparent text-white border-white hover:bg-white/10 hover:text-white transition-colors hidden sm:block"
              >
                Salir
              </Button>
            </form>

            <MobileNav 
              isAdmin={isAdmin}
              isResidente={isResidente}
              isAdminis={isAdminis}
              isSub={isSub}
              isOperador={isOperador}
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

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <ChatWidget isAdmin={isAdmin} />
    </div>
  )
}

