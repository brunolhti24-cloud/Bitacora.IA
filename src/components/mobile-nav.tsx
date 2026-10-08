'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { 
  Menu, 
  X, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  BarChart, 
  HelpCircle,
  LogOut,
  User as UserIcon,
  Sparkles
} from 'lucide-react'

export function MobileNav({
  isAdmin,
  isResidente,
  isAdminis,
  isSub,
  isOperador,
  profile,
  roleLabel,
  userEmail,
}: {
  isAdmin: boolean
  isResidente: boolean
  isAdminis: boolean
  isSub: boolean
  isOperador: boolean
  profile?: any
  roleLabel?: string
  userEmail?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  const displayName = profile?.full_name || userEmail?.split('@')[0] || 'Usuario'
  const displayRole = roleLabel || 'Colaborador'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="text-white p-2 focus:outline-none flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Fondo oscuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menú lateral */}
          <div className="relative w-4/5 max-w-sm bg-[#EAEBEF] h-full shadow-2xl flex flex-col p-4 z-[110] animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-900 text-white inline-flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Bitacor.AI
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-600 p-2 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tarjeta de Usuario en Móvil */}
            <div className="bg-[#031033] rounded-2xl p-4 text-white mb-4 border border-white/10 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-sm shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-base truncate leading-tight">{displayName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
                    <span className="text-xs font-medium text-[#22c55e] truncate">{displayRole}</span>
                  </div>
                  {profile?.company_name && (
                    <p className="text-[11px] text-slate-300 truncate mt-1">{profile.company_name}</p>
                  )}
                </div>
              </div>
            </div>

            <nav className="space-y-1.5 flex-1">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Navegación Principal
              </div>

              {!isAdminis && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
                >
                  <FolderKanban className="w-5 h-5 text-[#144CC9]" />
                  <span>Obras y Bitácoras</span>
                </Link>
              )}

              {(isSub || isOperador) && (
                <Link
                  href="/dashboard/mis-tareas"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
                >
                  <CheckSquare className="w-5 h-5 text-[#144CC9]" />
                  <span>Tareas (Kanban)</span>
                </Link>
              )}

              {(isAdmin || isResidente) && (
                <Link
                  href="/dashboard/equipo"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-extrabold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
                >
                  <Users className="w-5 h-5 text-[#144CC9]" />
                  <span>Equipo de Trabajo</span>
                </Link>
              )}

              <div className="pt-6 pb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Ajustes de Cuenta
              </div>

              <Link
                href="/dashboard/perfil"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
              >
                <UserIcon className="w-5 h-5 text-[#144CC9]" />
                <span>Mi Perfil y Empresa</span>
              </Link>

              <Link
                href="/dashboard/manual"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
              >
                <HelpCircle className="w-5 h-5 text-[#144CC9]" />
                <span>Manual de Usuario</span>
              </Link>
            </nav>

            {/* Botón Cerrar Sesión en Móvil */}
            <div className="pt-4 mt-6 border-t border-slate-300">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 text-sm transition-all border border-red-200 shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
