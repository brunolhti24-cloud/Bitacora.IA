'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export const REPORT_PHOTOS_BUCKET = 'report_photos'
const MAX_PHOTOS = 8
const MAX_SIDE = 1600

type Photo = { id: string; preview: string; url?: string; status: 'subiendo' | 'lista' | 'error'; error?: string }

// Reduce la foto del celular (3-8 MB) a ~300 KB antes de subirla
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8))
}

/**
 * Fotos de evidencia de la bitácora. Se suben directo a Supabase Storage desde el
 * navegador (sin pasar por el servidor) y el formulario envía solo las URLs en
 * campos ocultos `photo_urls`.
 */
export function ReportPhotosInput({ projectId, onUploadingChange }: { projectId: string; onUploadingChange?: (uploading: boolean) => void }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Avisa al formulario para no guardar mientras haya fotos subiéndose
  const uploading = photos.some((p) => p.status === 'subiendo')
  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  const update = (id: string, patch: Partial<Photo>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - photos.length
    const selected = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
    const supabase = createClient()

    const queued: Photo[] = selected.map((f) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(f), status: 'subiendo' }))
    setPhotos((prev) => [...prev, ...queued])

    await Promise.all(
      selected.map(async (file, i) => {
        const { id } = queued[i]
        try {
          const blob = await compress(file)
          const path = `${projectId}/${id}.jpg`
          const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
          if (error) throw error
          const { data } = supabase.storage.from(REPORT_PHOTOS_BUCKET).getPublicUrl(path)
          update(id, { status: 'lista', url: data.publicUrl })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          update(id, { status: 'error', error: message })
        }
      })
    )
  }

  const remove = (id: string) => {
    const target = photos.find((p) => p.id === id)
    if (!target) return
    URL.revokeObjectURL(target.preview)
    // Si ya se había subido, se borra del almacenamiento para no dejar archivos sueltos
    if (target.status === 'lista') {
      createClient().storage.from(REPORT_PHOTOS_BUCKET).remove([`${projectId}/${id}.jpg`]).catch(() => {})
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const full = photos.length >= MAX_PHOTOS
  const failed = photos.filter((p) => p.status === 'error')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Fotos del Área (Opcional)</span>
        <span className="text-xs text-slate-500">{photos.length}/{MAX_PHOTOS}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={full}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" aria-hidden /> Tomar Foto
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" aria-hidden /> Galería
        </button>
      </div>

      {/* capture abre la cámara trasera en el celular; en computadora abre el selector de archivos */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              {p.status === 'subiendo' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" aria-label="Subiendo" />
                </div>
              )}
              {p.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/70" title={p.error}>
                  <AlertCircle className="h-5 w-5 text-white" aria-label="No se pudo subir" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              {p.status === 'lista' && p.url && <input type="hidden" name="photo_urls" value={p.url} />}
            </li>
          ))}
        </ul>
      )}

      {failed.length > 0 && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {failed.length === 1 ? 'Una foto no se pudo subir' : `${failed.length} fotos no se pudieron subir`}. Quítala{failed.length > 1 ? 's' : ''} e inténtalo de nuevo; revisa tu conexión.
        </p>
      )}
    </div>
  )
}
