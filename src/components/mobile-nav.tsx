'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, FolderKanban, CheckSquare, Users, BarChart, HelpCircle } from 'lucide-react'

export function MobileNav({
  isAdmin,
  isResidente,
  isAdminis,
  isSub,
  isOperador,
}: {
  isAdmin: boolean
  isResidente: boolean
  isAdminis: boolean
  isSub: boolean
  isOperador: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="text-white p-2 focus:outline-none flex items-center justify-center"
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
          <div className="relative w-4/5 max-w-sm bg-[#EAEBEF] h-full shadow-2xl flex flex-col p-4 z-[110] animate-in slide-in-from-left duration-200">
            <div className="flex justify-end mb-6">
              <button onClick={() => setIsOpen(false)} className="text-slate-500 p-2 bg-white rounded-full shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2 flex-1">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
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

              <div className="pt-8 pb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Ajustes
              </div>

              <Link
                href="/dashboard/perfil"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-[#031033] hover:text-[#144CC9] hover:bg-black/5 transition-all"
              >
                <BarChart className="w-5 h-5 text-[#144CC9]" />
                <span>Mi perfil y empresa</span>
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
          </div>
        </div>
      )}
    </div>
  )
}
