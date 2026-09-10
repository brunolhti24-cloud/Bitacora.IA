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
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      {/* Tarjeta Principal */}
      <Card className="border border-slate-200/80 shadow-lg shadow-slate-100 rounded-2xl bg-white overflow-hidden">
        {/* Header Decorativo */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />
        
        <CardHeader className="p-6 sm:p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Nuevo Proyecto de Obra
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 mt-1">
                Registra los datos generales para crear una nueva obra en el sistema Bitacor.AI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-4">
          <form action={action} className="space-y-6">
            
            {/* Nombre del Proyecto */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Nombre del Proyecto *
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej. Torre Norte, Residencia Lago, Nave Industrial B..."
                  required
                  className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Cliente y Ubicación (Responsive 2 cols en tablet/desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Cliente / Propietario
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="client_name"
                    name="client_name"
                    placeholder="Ej. Desarrollos Inmobiliarios S.A."
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Ubicación de la Obra
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Ej. Av. Reforma 120, CDMX"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Presupuesto Base y Fecha de Inicio (Responsive 2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="base_budget" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Presupuesto Base ($ MXN)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input type="hidden" name="base_budget" value={displayBudget.replace(/,/g, '')} />
                  <Input
                    id="base_budget_display"
                    type="text"
                    placeholder="Ej. 345,678.00"
                    value={displayBudget}
                    onChange={handleBudgetChange}
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Fecha de Inicio de Obra
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Imagen del Proyecto con Vista Previa */}
            <div className="space-y-2">
              <Label htmlFor="image" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Imagen Representativa (Opcional)
              </Label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                {imagePreview ? (
                  <div className="relative h-24 w-36 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0">
                    <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400 shrink-0">
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
                    className="text-xs cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-slate-500">
                    Formatos JPG, PNG o WebP. Recomendado una foto de la fachada o terreno.
                  </p>
                </div>
              </div>
            </div>

            {/* Mensaje de Error */}
            {state?.error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
                {state.error}
              </div>
            )}

            {/* Acciones del Formulario */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto h-11 rounded-xl px-6 font-semibold border-slate-200">
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 shadow-md shadow-blue-600/20 transition-all gap-2"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
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

