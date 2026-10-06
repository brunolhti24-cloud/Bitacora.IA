'use client'

import { useActionState, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '../actions'
import { createBrowserClient } from '@supabase/ssr'
import { 
  User, 
  Building, 
  Upload, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  BadgeCheck,
  Image as ImageIcon,
  Sparkles,
  ShieldAlert,
  Building2
} from 'lucide-react'

const initialState = {
  error: null as string | null,
  success: false as boolean | undefined
}

export default function PerfilPage() {
  const [state, action, isPending] = useActionState(updateProfile, initialState)
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState<string>('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [showSavedToast, setShowSavedToast] = useState(false)

  useEffect(() => {
    async function loadUserData() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (data) {
          setProfile(data)
          if (data.company_logo_url) {
            setLogoPreview(data.company_logo_url)
          }
        }
      }
    }
    loadUserData()
  }, [])

  useEffect(() => {
    if (state?.success) {
      setShowSavedToast(true)
      const timer = setTimeout(() => setShowSavedToast(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [state])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setLogoPreview(url)
    }
  }

  const roleLabel =
    profile?.role === 'admin' || profile?.role === 'director' ? 'Director de Obra'
    : profile?.role === 'residente' ? 'Residente de Obra'
    : profile?.role === 'administracion' ? 'Administración'
    : profile?.role === 'subcontratista' ? 'Contratista'
    : 'Operador'

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-extrabold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-purple-600" /> Ajustes de Identidad y Empresa
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Mi Perfil y Personalización
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Personaliza el nombre de tu constructora, membrete para reportes PDF y tus credenciales de usuario.
          </p>
        </div>
      </div>

      {/* Toast Notificación */}
      {showSavedToast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span className="text-xs font-black">
            ¡Perfil y logotipo de la empresa actualizados con éxito!
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Tarjeta de Vista Previa del Perfil y Marca */}
        <Card className="lg:col-span-1 border border-slate-200/90 shadow-md rounded-3xl bg-white/90 backdrop-blur-md overflow-hidden flex flex-col items-center p-6 text-center">
          <div className="relative mb-4 mt-2">
            {logoPreview ? (
              <div className="h-28 w-28 rounded-3xl border-2 border-blue-500/40 p-2 bg-white shadow-xl flex items-center justify-center overflow-hidden">
                <img src={logoPreview} alt="Logo Empresa" className="h-full w-full object-contain rounded-2xl" />
              </div>
            ) : (
              <div className="h-28 w-28 rounded-3xl border-2 border-dashed border-blue-300/80 bg-blue-50/50 flex items-center justify-center text-blue-600 shadow-inner">
                <Building className="w-12 h-12 text-blue-500" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1.5 rounded-full shadow-md">
              <BadgeCheck className="w-4 h-4 text-emerald-300" />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 leading-snug">
            {profile?.full_name || 'Cargando...'}
          </h2>
          
          <span className="mt-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
            {roleLabel}
          </span>

          <div className="w-full border-t border-slate-100 mt-6 pt-4 space-y-3 text-left text-xs text-slate-600">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Building className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-800 block text-[11px] uppercase tracking-wider">Empresa</span>
                <span className="truncate font-semibold text-slate-700">{profile?.company_name || 'Sin especificar'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-800 block text-[11px] uppercase tracking-wider">Correo Electrónico</span>
                <span className="truncate font-semibold text-slate-700">{email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-800 block text-[11px] uppercase tracking-wider">Nivel de Acceso</span>
                <span className="font-semibold text-emerald-700">Cuenta Verificada</span>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2 text-left">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>El logotipo de tu empresa se incluirá automáticamente en la carátula superior de tus reportes PDF.</span>
          </div>
        </Card>

        {/* Columna Derecha: Formulario de Configuración High-Tech */}
        <Card className="lg:col-span-2 border border-slate-200/90 shadow-md rounded-3xl bg-white/90 backdrop-blur-md">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-xl font-black text-slate-900">
              Editar Datos y Empresa
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">
              Actualiza la información visible para tu equipo, reportes de obra y firma digital.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {profile ? (
              <form action={action} className="space-y-6">
                
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Tu Nombre Completo *
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-blue-600">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile.full_name || ''}
                      required
                      className="pl-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Nombre de la Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Nombre de la Empresa o Constructora
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-purple-600">
                      <Building className="h-4 w-4" />
                    </div>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="Ej. Constructora Bitacor.AI S.A. de C.V."
                      defaultValue={profile.company_name || ''}
                      className="pl-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Logotipo de la Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="company_logo" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Logotipo de la Empresa
                  </Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50/60 transition-colors">
                    {logoPreview ? (
                      <div className="h-20 w-32 rounded-xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 w-full text-center sm:text-left space-y-1">
                      <Input
                        id="company_logo"
                        name="company_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      />
                      <p className="text-xs text-slate-500 font-medium">
                        Formato recomendado: PNG transparente o JPG cuadrado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensaje de Error */}
                {state?.error && (
                  <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-200">
                    {state.error}
                  </div>
                )}

                {/* Botón Guardar */}
                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl px-8 shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition-all gap-2"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Guardar Cambios
                      </span>
                    )}
                  </Button>
                </div>

              </form>
            ) : (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 font-medium text-xs">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Cargando datos de perfil...
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}


