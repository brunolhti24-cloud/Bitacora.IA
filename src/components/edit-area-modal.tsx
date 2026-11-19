'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateArea } from '@/app/dashboard/projects/[id]/actions'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image'
import { AREA_FALLBACK_BG, areaCover, areaPhotoFolder } from '@/lib/area-images'
import { ImagePlus, Loader2, Layers, Pencil, Trash2 } from 'lucide-react'

/** Edita el nombre del área y su foto de portada (opcional). */
export function EditAreaModal({
  areaId,
  currentName,
  currentImage = null,
  projectId,
}: {
  areaId: string
  currentName: string
  currentImage?: string | null
  projectId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(currentName)
  // undefined = sin cambios; null = quitar; texto = foto nueva ya subida
  const [image, setImage] = useState<string | null | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  const shownImage = image === undefined ? currentImage : image
  const preview = areaCover({ name, image_url: shownImage })

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Elige una imagen (JPG, PNG o WebP).')
    setError(null)
    setUploading(true)
    try {
      // Se reduce en el navegador y se sube directo al almacenamiento de la obra
      const blob = await compressImage(file, { maxSide: 1280 })
      const supabase = createClient()
      const path = `${areaPhotoFolder(projectId)}${areaId}-${Date.now()}.jpg`
      const { error: upError } = await supabase.storage.from('project_images').upload(path, blob, { contentType: 'image/jpeg' })
      if (upError) throw upError
      setImage(supabase.storage.from('project_images').getPublicUrl(path).data.publicUrl)
    } catch (err) {
      setError(`No se pudo subir la foto: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return setError('El nombre del área es obligatorio.')
    setLoading(true)
    setError(null)
    try {
      const res = await updateArea(areaId, name, projectId, image)
      if (res?.error) return setError(res.error)
      setOpen(false)
      setImage(undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer shadow-2xs">
        <Pencil className="w-3.5 h-3.5 text-blue-600" aria-hidden /> Editar área
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Layers className="w-5 h-5 text-blue-600" aria-hidden /> Editar área
          </DialogTitle>
          <DialogDescription>Cambia el nombre o pon una foto real del área. Sin foto se usa una imagen de referencia.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`area-name-${areaId}`} className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nombre del área *
            </Label>
            <Input
              id={`area-name-${areaId}`}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Recámara principal, Cocina, Baño..."
              className="h-11 rounded-xl bg-slate-50/50 text-slate-900 font-semibold"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Foto de portada</span>
            <div className="relative h-32 w-full overflow-hidden rounded-xl" style={{ backgroundColor: AREA_FALLBACK_BG }}>
              {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
              <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                {shownImage ? 'Foto del área' : preview ? 'Imagen de referencia' : 'Sin imagen'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                id={`area-photo-${areaId}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="rounded-lg">
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden />}
                {uploading ? 'Subiendo…' : shownImage ? 'Cambiar foto' : 'Subir foto del área'}
              </Button>
              {shownImage && (
                <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => setImage(null)} className="rounded-lg text-red-600 hover:text-red-700">
                  <Trash2 className="mr-1.5 h-4 w-4" aria-hidden /> Quitar foto
                </Button>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" aria-hidden /> Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
