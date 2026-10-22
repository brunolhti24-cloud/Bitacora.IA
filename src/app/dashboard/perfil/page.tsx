'use client'

import { useActionState, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '../actions'
import { createClient } from '@/lib/supabase/client'
import { User, Building, Save, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react'

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
      const supabase = createClient()
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
      <header className="space-y-1 border-b border-border pb-5">
        <h1 className="text-3xl font-extrabold text-plano sm:text-4xl">Perfil y empresa</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Tu nombre y el de tu constructora aparecen en las bitácoras, y el logotipo en la portada de los PDF.
        </p>
      </header>

      {showSavedToast && (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-ok/30 bg-ok-soft p-4 text-sm font-semibold text-ok animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          Perfil guardado.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Vista previa de cómo te ve el equipo */}
        <aside className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-2">
                <img src={logoPreview} alt="Logotipo de la empresa" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="plano-grid flex h-20 w-20 shrink-0 items-center justify-center rounded-md">
                <Building className="h-8 w-8 text-brote/80" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-plano">{profile?.full_name || 'Cargando…'}</h2>
              <p className="text-sm text-obra">{roleLabel}</p>
            </div>
          </div>

          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Empresa</dt>
              <dd className="truncate font-semibold text-plano">{profile?.company_name || 'Sin especificar'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Correo electrónico</dt>
              <dd className="truncate font-semibold text-plano">{email}</dd>
            </div>
          </dl>

          <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-obra" aria-hidden />
            El logotipo se agrega solo a la portada de tus reportes PDF.
          </p>
        </aside>

        {/* Columna Derecha: Formulario de Configuración High-Tech */}
        <Card className="lg:col-span-2 rounded-lg border border-border bg-card ring-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-xl font-bold text-plano">Datos de la cuenta</CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            {profile ? (
              <form action={action} className="space-y-6">
                
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Nombre completo
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile.full_name || ''}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Nombre de la Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="company_name">
                    Empresa o constructora
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                      <Building className="h-4 w-4" />
                    </div>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="Constructora del Norte S.A. de C.V."
                      defaultValue={profile.company_name || ''}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Logotipo de la Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="company_logo">
                    Logotipo de la empresa
                  </Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border-2 border-dashed border-junta bg-muted/40">
                    {logoPreview ? (
                      <div className="h-20 w-32 rounded-md border border-border bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-accent text-obra flex items-center justify-center shrink-0">
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
                        aria-describedby="company_logo_help"
                        className="h-auto py-2 text-sm file:mr-3 file:h-9 file:rounded-md file:bg-white file:px-3 file:text-sm file:font-semibold file:text-plano file:ring-1 file:ring-border"
                      />
                      <p id="company_logo_help" className="text-xs text-muted-foreground">
                        PNG con fondo transparente o JPG cuadrado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensaje de Error */}
                {state?.error && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {state.error}
                  </div>
                )}

                {/* Botón Guardar */}
                <div className="pt-4 flex justify-end border-t border-border">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-11 w-full gap-2 px-6 sm:w-auto"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-4 h-4" aria-hidden />
                        Guardar cambios
                      </span>
                    )}
                  </Button>
                </div>

              </form>
            ) : (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2 text-sm">
                <div className="w-6 h-6 border-2 border-obra border-t-transparent rounded-full animate-spin" aria-hidden />
                Cargando perfil…
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}


