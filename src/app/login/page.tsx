'use client'

import { useState, useActionState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, validateInviteCode, incrementInviteUsage, upsertProfile } from './actions'
import { createClient } from '@/lib/supabase/client'
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  HardHat,
  FileSpreadsheet,
  Ticket
} from 'lucide-react'

const initialState = {
  error: null as string | null,
}

function LoginFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteFromUrl = searchParams.get('invite') || ''
  const roleFromUrl = searchParams.get('role') || ''

  const [isLogin, setIsLogin] = useState(!inviteFromUrl)
  const [showPassword, setShowPassword] = useState(false)
  const [inviteCode, setInviteCode] = useState(inviteFromUrl)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupPending, setSignupPending] = useState(false)

  const [loginState, loginAction, isLoginPending] = useActionState(login, initialState)

  useEffect(() => {
    if (inviteFromUrl) {
      setIsLogin(false)
      setInviteCode(inviteFromUrl)
    }
  }, [inviteFromUrl])

  const isPending = isLoginPending || signupPending
  const currentError = isLogin ? loginState?.error : signupError

  // Registro desde el CLIENTE (browser) para que las cookies de sesión se guarden correctamente
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSignupError(null)
    setSignupPending(true)

    try {
      const formData = new FormData(e.currentTarget)
      const fullName = formData.get('fullName') as string
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const code = (formData.get('invite_code') as string || '').trim().toUpperCase()

      if (!fullName) {
        setSignupError('El nombre completo es requerido.')
        setSignupPending(false)
        return
      }

      let assignedRole = 'admin'
      let companyName: string | undefined = undefined
      let inviteId: string | undefined = undefined
      let usedCount = 0
      let invitedBy: string | undefined = undefined

      // Validar código de invitación si existe
      if (code) {
        const result = await validateInviteCode(code)
        if (result.error) {
          setSignupError(result.error)
          setSignupPending(false)
          return
        }
        assignedRole = result.role!
        companyName = result.company_name
        inviteId = result.invite_id
        usedCount = result.used_count || 0
        invitedBy = result.created_by
      }

      // Crear cuenta DESDE EL CLIENTE (browser) para que Supabase guarde las cookies
      const supabase = createClient()
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: assignedRole,
            company_name: companyName
          }
        }
      })

      // Si Supabase devuelve un usuario sin identidades (length === 0), significa que el correo ya estaba registrado previamente
      if (authData?.user && authData?.user?.identities?.length === 0) {
        // Intentar login con la contraseña ingresada
        const { data: signInData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
        if (loginErr) {
          setSignupError('Este correo electrónico ya está registrado. Por favor cambia a la pestaña "Iniciar Sesión" para ingresar.')
          setSignupPending(false)
          return
        }
        let session = signInData.session
        if (session) {
          await upsertProfile(session.user.id, fullName, assignedRole, companyName, invitedBy)
          if (assignedRole === 'subcontratista') {
            router.push('/dashboard/mis-tareas')
          } else {
            router.push('/dashboard')
          }
          return
        }
      }

      if (signUpError) {
        if (signUpError.message.includes('already') || signUpError.message.includes('User already registered')) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
          if (loginErr) {
            setSignupError('Esta cuenta ya existe. Por favor cambia a la pestaña "Iniciar Sesión" para ingresar.')
            setSignupPending(false)
            return
          }
        } else {
          let msg = signUpError.message || 'Error al registrar usuario'
          if (msg === '{}' || !msg.trim()) {
            msg = 'Hubo un problema con la base de datos (500). Por favor intenta de nuevo.'
          }
          setSignupError(msg)
          setSignupPending(false)
          return
        }
      }

      // Si no hay sesión inmediata después del signUp, intentar iniciar sesión
      let session = authData?.session
      if (!session) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
          if (signInErr.message.includes('Invalid login credentials')) {
            setSignupError('Este correo electrónico ya está registrado con otra contraseña. Cambia a "Iniciar Sesión" para ingresar.')
          } else {
            setSignupError('Error al iniciar sesión: ' + signInErr.message)
          }
          setSignupPending(false)
          return
        }
        session = signInData.session
      }

      if (!session) {
        setSignupError('Registro completado. Por favor cambia a "Iniciar Sesión" e ingresa con tu correo y contraseña.')
        setSignupPending(false)
        return
      }

      // Guardar perfil usando la cliente browser con sesión activa
      try {
        await upsertProfile(session.user.id, fullName, assignedRole, companyName, invitedBy)
      } catch (e) {
        console.log('El perfil se sincronizó mediante trigger de base de datos')
      }

      // Incrementar usos del código de invitación
      if (inviteId) {
        try {
          await incrementInviteUsage(inviteId, usedCount)
        } catch (e) {}
      }

      // Redirigir según el rol
      if (assignedRole === 'subcontratista') {
        router.push('/dashboard/mis-tareas')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      const errMsg = typeof err === 'object' ? (err.message || err.error_description || JSON.stringify(err)) : String(err)
      setSignupError('Error inesperado: ' + errMsg)
      setSignupPending(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white text-slate-900 font-sans overflow-hidden" translate="no">
      {/* Columna Izquierda: Branding Hero Visual */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex overflow-hidden bg-[#031033]">
        <div className="absolute inset-0 bg-[radial-gradient(#144CC9_1px,transparent_1px)] [background-size:24px_24px] opacity-15 z-0" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#144CC9]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="Bitacor.AI Logo" className="h-12 w-12 object-contain drop-shadow-xl" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white">Bitacor.AI</span>
          </div>
        </div>

        <div className="relative z-10 my-auto space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#A7EC80] ring-1 ring-inset ring-white/20 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#A7EC80]" />
            <span>Sistema Integral de Gestión de Construcción</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight lg:text-5xl">
            Control total de tus obras en <span className="text-[#A7EC80]">tiempo real</span>.
          </h1>

          <p className="text-base text-slate-300 leading-relaxed font-medium">
            Administra proyectos, bitácoras de campo con firma digital, tablero Kanban de tareas, finanzas y solicitudes especiales de materiales o maquinaria.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#144CC9]/20 text-[#144CC9]"><HardHat className="w-5 h-5" /></div>
                <span className="text-2xl font-black text-white">100%</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Digitalización de Bitácoras de Campo</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#A7EC80]/20 text-[#A7EC80]"><FileSpreadsheet className="w-5 h-5" /></div>
                <span className="text-2xl font-black text-white">PDFs</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Exportación Oficial con Firma Digital</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>© 2026 Bitacor.AI. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1 text-[#A7EC80]">
            <ShieldCheck className="w-4 h-4 text-[#A7EC80]" /> Plataforma Segura
          </span>
        </div>
      </div>

      {/* Columna Derecha: Formulario */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24 bg-white relative">
        <div className="mx-auto w-full max-w-md space-y-8">
          
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <img src="/logo.png" alt="Bitacor.AI Logo" className="h-10 w-10 object-contain drop-shadow-sm" />
            <span className="text-2xl font-black text-[#031033]">Bitacor.AI</span>
          </div>

          {inviteFromUrl && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 text-xs text-blue-200 space-y-1">
              <div className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Invitación a Integrarte al Equipo
              </div>
              <p>
                Te han invitado a unirte como <strong className="capitalize text-white">{roleFromUrl || 'Miembro del Equipo'}</strong>. Completa tus datos abajo para acceder.
              </p>
            </div>
          )}

          <div className="flex rounded-xl bg-[#EAEBEF] p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setSignupError(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                isLogin ? 'bg-white text-[#031033] shadow-sm' : 'text-slate-500 hover:text-[#031033]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setSignupError(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                !isLogin ? 'bg-white text-[#031033] shadow-sm' : 'text-slate-500 hover:text-[#031033]'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-[#031033]">
              {isLogin ? '¡Bienvenido de nuevo!' : 'Registra tu cuenta'}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {isLogin 
                ? 'Ingresa tus credenciales para gestionar tus obras' 
                : 'Crea tu cuenta de Director de Obra o ingresa con tu código de invitación'}
            </p>
          </div>

          {currentError && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20 flex items-start gap-3">
              <div className="p-1 rounded-full bg-red-500/20 text-red-400 shrink-0">⚠️</div>
              <div className="flex-1 font-medium">{currentError}</div>
            </div>
          )}

          {/* ===== FORMULARIO DE LOGIN (Server Action) ===== */}
          {isLogin && (
            <form action={loginAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Correo Electrónico *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Mail className="h-4 w-4" /></div>
                  <Input id="email" name="email" type="email" placeholder="nombre@ejemplo.com" required className="pl-10 h-12 bg-white border-slate-200 text-[#031033] font-medium placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Contraseña *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Lock className="h-4 w-4" /></div>
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" required className="pl-10 pr-10 h-12 bg-white border-slate-200 text-[#031033] font-medium placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#031033] transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-full h-12 bg-[#144CC9] hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-[#144CC9]/25 text-base gap-2 transition-all">
                {isPending ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</span>
                ) : (
                  <span className="flex items-center gap-2">Ingresar a Bitacor.AI<ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
          )}

          {/* ===== FORMULARIO DE REGISTRO (Client-Side para que funcionen las cookies) ===== */}
          {!isLogin && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Nombre Completo *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><User className="h-4 w-4" /></div>
                  <Input id="fullName" name="fullName" type="text" placeholder="Ing. Bruno García" required className="pl-10 h-12 bg-white border-slate-200 text-[#031033] font-medium placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_code" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Código de Invitación (Opcional)</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Ticket className="h-4 w-4" /></div>
                  <Input id="invite_code" name="invite_code" type="text" placeholder="Ej. BOGO-8492" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="pl-10 h-12 bg-white border-slate-200 text-[#031033] font-mono font-bold tracking-widest placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                </div>
                <p className="text-[11px] font-medium text-slate-500">Si tu jefe te envió un código o enlace de invitación, escríbelo aquí.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Correo Electrónico *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Mail className="h-4 w-4" /></div>
                  <Input id="signupEmail" name="email" type="email" placeholder="nombre@ejemplo.com" required className="pl-10 h-12 bg-white border-slate-200 text-[#031033] font-medium placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword" className="text-xs font-bold uppercase tracking-wider text-[#031033]">Contraseña *</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Lock className="h-4 w-4" /></div>
                  <Input id="signupPassword" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" required className="pl-10 pr-10 h-12 bg-white border-slate-200 text-[#031033] font-medium placeholder:text-slate-400 focus:border-[#144CC9] rounded-xl" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#031033] transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-12 bg-[#144CC9] hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-[#144CC9]/25 text-base gap-2 transition-all">
                {isPending ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando cuenta...</span>
                ) : (
                  <span className="flex items-center gap-2">Crear Cuenta en Bitacor.AI<ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
          )}

          <div className="p-4 rounded-xl bg-[#EAEBEF]/50 border border-slate-200 text-xs text-[#031033] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#144CC9]" /> Sistema Multirrol Bitacor.AI
            </div>
            <p className="text-slate-600 font-medium">
              Acceso personalizado para Administrador (Director), Residente de Obra y Subcontratistas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-[#031033]">Cargando...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}

