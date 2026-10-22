'use client'

import { useState, useActionState, useEffect } from 'react'
import { createCompanyInvite } from '@/app/dashboard/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { UserPlus, Copy, Check, HardHat, Wrench, Share2 } from 'lucide-react'

export function NewInviteModal() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const [state, action, isPending] = useActionState(createCompanyInvite, null)

  useEffect(() => {
    if (state?.success && state?.code) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const link = `${baseUrl}/login?invite=${state.code}&role=${state.role}`
      setGeneratedLink(link)
      setGeneratedCode(state.code)
    }
  }, [state])

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(
        `Hola, aquí tienes el enlace para unirte a nuestro equipo de trabajo en Bitacor.AI:\n${generatedLink}\nCódigo: ${generatedCode}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setGeneratedLink(null)
      setGeneratedCode(null)
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="h-11 gap-2 px-4">
            <UserPlus className="h-4 w-4" aria-hidden />
            Invitar al equipo
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-plano">
            <UserPlus className="h-5 w-5 text-obra" />
            Generar enlace de invitación
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Elige el rol de tu trabajador para generar un código que podrás compartirle por WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {state?.error && (
          <div className="rounded-md bg-destructive/5 p-3 text-xs font-medium text-destructive border border-destructive/30">
            {state.error}
          </div>
        )}

        {!generatedLink ? (
          <form action={action} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role">
                Rol del trabajador a invitar *
              </Label>
              <select
                id="role"
                name="role"
                defaultValue="residente"
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano transition-colors focus-visible:border-obra md:text-sm"
              >
                <option value="residente">Residente de Obra (Acceso completo a obra + Acepta Bitácoras)</option>
                <option value="administracion">Administración (Tickets de Gastos y Solicitudes Especiales)</option>
                <option value="subcontratista">Contratista / Subcontratista (Bitácoras, Crear/Ver Tareas y Subir Tickets)</option>
                <option value="operador">Operador (Crear Bitácoras y Ver Tareas)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Los permisos y accesos de la plataforma se adaptarán automáticamente al rol seleccionado.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-6">
                {isPending ? 'Generando Enlace…' : 'Generar Invitación'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
            <div className="p-4 rounded-lg bg-accent border border-obra/25 space-y-2">
              <span className="text-xs font-bold text-obra">Código Generado:</span>
              <p className="text-3xl font-black font-mono text-obra-strong">
                {generatedCode}
              </p>
              <p className="text-xs text-muted-foreground">
                Comparte este código o el enlace directo para que tu trabajador se registre.
              </p>
            </div>

            <div className="p-3 bg-muted rounded-md border text-xs text-muted-foreground font-mono break-all text-left">
              {generatedLink}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={copyToClipboard}
                className="w-full bg-ok hover:bg-ok/90 text-white font-bold rounded-md h-11 gap-2 shadow-md shadow-emerald-600/20"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    ¡Copiado para WhatsApp!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Copiar Enlace para WhatsApp
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full rounded-md"
              >
                Listo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

