'use client'

import { useActionState, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProject } from '../../actions'
import Link from 'next/link'
import { 
  Building2, 
  User, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Upload, 
  ArrowLeft, 
  Sparkles,
  FolderPlus,
  Image as ImageIcon
} from 'lucide-react'

const initialState = {
  error: null as string | null,
}

export default function NewProjectPage() {
  const [state, action, isPending] = useActionState(createProject, initialState)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  const [displayBudget, setDisplayBudget] = useState('')

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    if (parts.length > 2) parts.pop()
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    if (parts[1]) parts[1] = parts[1].slice(0, 2)
    setDisplayBudget(parts.join('.'))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-obra transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      {/* Tarjeta Principal */}
      <Card className="border border-border/80 rounded-lg bg-white overflow-hidden">
        
        <CardHeader className="p-6 sm:p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-obra ring-1 ring-obra/20">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-plano sm:text-3xl">
                Nuevo proyecto de obra
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Registra los datos generales para crear una nueva obra en el sistema Bitacor.AI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-4">
          <form action={action} className="space-y-6">
            
            {/* Nombre del Proyecto */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del proyecto *
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej. Torre Norte, Residencia Lago, Nave Industrial B…"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Cliente y Ubicación (Responsive 2 cols en tablet/desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name">
                  Cliente / propietario
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="client_name"
                    name="client_name"
                    placeholder="Ej. Desarrollos Inmobiliarios S.A."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Ubicación de la obra
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Ej. Av. Reforma 120, CDMX"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Presupuesto Base y Fecha de Inicio (Responsive 2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="base_budget">
                  Presupuesto base ($ MXN)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input type="hidden" name="base_budget" value={displayBudget.replace(/,/g, '')} />
                  <Input
                    id="base_budget_display"
                    type="text"
                    placeholder="Ej. 345,678.00"
                    value={displayBudget}
                    onChange={handleBudgetChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">
                  Fecha de inicio de obra
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Imagen del Proyecto con Vista Previa */}
            <div className="space-y-2">
              <Label htmlFor="image">
                Imagen representativa (opcional)
              </Label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-md border border-dashed border-junta bg-muted/40 hover:bg-muted/50 transition-colors">
                {imagePreview ? (
                  <div className="relative h-24 w-36 rounded-lg overflow-hidden border border-border shadow-sm shrink-0">
                    <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-md bg-secondary/60 flex items-center justify-center text-muted-foreground shrink-0">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1 w-full text-center sm:text-left space-y-1">
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="h-auto py-2 text-sm file:mr-3 file:h-9 file:rounded-md file:bg-white file:px-3 file:text-sm file:font-semibold file:text-plano file:ring-1 file:ring-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos JPG, PNG o WebP. Recomendado una foto de la fachada o terreno.
                  </p>
                </div>
              </div>
            </div>

            {/* Mensaje de Error */}
            {state?.error && (
              <div className="rounded-md bg-destructive/5 p-4 text-sm font-medium text-destructive border border-destructive/30">
                {state.error}
              </div>
            )}

            {/* Acciones del Formulario */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-border">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto h-11 rounded-md px-6 font-semibold border-border">
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full sm:w-auto h-11 bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-8 shadow-md  transition-all gap-2"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Crear Proyecto
                  </span>
                )}
              </Button>
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

