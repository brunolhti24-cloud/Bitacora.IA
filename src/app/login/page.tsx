'use client'

import { useState, useActionState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, validateInviteCode, incrementInviteUsage, upsertProfile } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, Eye, EyeOff, HardHat, Ticket, PenLine, AlertTriangle } from 'lucide-react'

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

  const tabClass = (active: boolean) =>
    `flex-1 min-h-10 rounded-[5px] text-sm font-semibold transition-colors duration-150 ${
      active ? 'bg-white text-plano shadow-[0_1px_2px_rgb(3_16_51/0.12)]' : 'text-muted-foreground hover:text-plano'
    }`

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-plano"
      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </button>
  )

  const spinner = <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />

  return (
    <div className="flex min-h-screen w-full bg-background text-plano" translate="no">
      {/* Columna izquierda: plano de obra */}
      <aside className="plano-grid relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
          <span className="text-2xl font-extrabold tracking-tight [font-stretch:84%]">Bitacor.AI</span>
        </div>

        <div className="max-w-lg space-y-8">
          <h1 className="text-5xl font-extrabold leading-[1.02] [font-stretch:72%] xl:text-6xl">
            La bitácora de obra, firmada desde el sitio.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/75">
            Registra cada nota de bitácora con fotos y firma digital, lleva el avance por área, los gastos y los materiales, y entrega el PDF oficial sin capturar nada dos veces.
          </p>

          {/* Muestra de una nota de bitácora */}
          <figure className="max-w-md rounded-md border border-white/15 bg-plano/80 p-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
              <span className="text-sm font-semibold text-brote">Nota 014</span>
              <span className="text-xs text-white/55">Losa de azotea, nivel 3</span>
            </div>
            <blockquote className="pt-3 text-sm leading-relaxed text-white/85">
              Se realiza el colado de losa con concreto f&apos;c=250 kg/cm². Se toman 4 muestras para prueba de cilindros.
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-2 text-xs text-white/60">
              <PenLine className="h-3.5 w-3.5 text-brote" aria-hidden />
              Firmada por el residente y el director de obra
            </figcaption>
          </figure>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} Bitacor.AI</p>
      </aside>

      {/* Columna derecha: formulario */}
      <main className="flex w-full flex-col justify-center bg-white px-5 py-10 sm:px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-7">
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-extrabold tracking-tight [font-stretch:84%]">Bitacor.AI</span>
          </div>

          {inviteFromUrl && (
            <div className="flex gap-3 rounded-md border border-obra/25 bg-accent p-4 text-sm text-accent-foreground">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                Te invitaron a unirte como <strong className="capitalize">{roleFromUrl || 'miembro del equipo'}</strong>. Completa tus datos para entrar.
              </p>
            </div>
          )}

          <div className="flex rounded-md bg-muted p-1" role="group" aria-label="Tipo de acceso">
            <button
              type="button"
              aria-pressed={isLogin}
              onClick={() => { setIsLogin(true); setSignupError(null) }}
              className={tabClass(isLogin)}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              aria-pressed={!isLogin}
              onClick={() => { setIsLogin(false); setSignupError(null) }}
              className={tabClass(!isLogin)}
            >
              Crear cuenta
            </button>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-3xl font-extrabold">
              {isLogin ? 'Entra a tus obras' : 'Crea tu cuenta'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? 'Usa el correo y la contraseña con los que te registraste.'
                : 'Regístrate como director de obra, o usa el código de invitación que te enviaron.'}
            </p>
          </div>

          {currentError && (
            <div role="alert" className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1">{currentError}</p>
            </div>
          )}

          {/* ===== FORMULARIO DE LOGIN (Server Action) ===== */}
          {isLogin && (
            <form action={loginAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Mail className="h-4 w-4" aria-hidden /></div>
                  <Input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@constructora.com" required className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Lock className="h-4 w-4" aria-hidden /></div>
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra pr-11" />
                  {passwordToggle}
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 rounded-md bg-obra text-base font-semibold text-white transition-colors hover:bg-obra-strong">
                {isPending ? <>{spinner}Entrando…</> : 'Iniciar sesión'}
              </Button>
            </form>
          )}

          {/* ===== FORMULARIO DE REGISTRO (Client-Side para que funcionen las cookies) ===== */}
          {!isLogin && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><User className="h-4 w-4" aria-hidden /></div>
                  <Input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="Ing. Bruno García" required className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_code">
                  Código de invitación <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Ticket className="h-4 w-4" aria-hidden /></div>
                  <Input id="invite_code" name="invite_code" type="text" placeholder="BOGO-8492" aria-describedby="invite_code_help" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra font-mono" />
                </div>
                <p id="invite_code_help" className="text-xs text-muted-foreground">Si tu jefe te mandó un código o enlace, escríbelo aquí. Sin código, la cuenta se crea como director de obra.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail">Correo electrónico</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Mail className="h-4 w-4" aria-hidden /></div>
                  <Input id="signupEmail" name="email" type="email" autoComplete="email" placeholder="nombre@constructora.com" required className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Contraseña</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Lock className="h-4 w-4" aria-hidden /></div>
                  <Input id="signupPassword" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required className="h-12 rounded-md border-input bg-white pl-10 text-base text-plano placeholder:text-muted-foreground/70 focus-visible:border-obra pr-11" />
                  {passwordToggle}
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 rounded-md bg-obra text-base font-semibold text-white transition-colors hover:bg-obra-strong">
                {isPending ? <>{spinner}Creando cuenta…</> : 'Crear cuenta'}
              </Button>
            </form>
          )}

          <p className="flex items-start gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
            <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-obra" aria-hidden />
            Cada persona ve lo que le toca: director de obra, residente, administración y contratistas.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white text-plano">Cargando…</div>}>
      <LoginFormContent />
    </Suspense>
  )
}

