// Fotos y logotipos antes de subirlos. Una foto de celular pesa de 3 a 8 MB y los
// formularios del servidor aceptan pocos MB: si se manda tal cual, la página falla
// con "Algo no cargó correctamente". Aquí se reduce en el navegador.

/** Peso máximo de un archivo que viaja dentro de un formulario del servidor. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024

/** Reduce una imagen a `maxSide` px por lado. `png` conserva la transparencia (logotipos). */
export async function compressImage(file: Blob, opts: { maxSide?: number; png?: boolean } = {}): Promise<Blob> {
  const maxSide = opts.maxSide ?? 1600
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || file), opts.png ? 'image/png' : 'image/jpeg', opts.png ? undefined : 0.8)
  )
}

/**
 * Prepara el archivo elegido en un <input type="file"> para enviarlo en el formulario:
 * las imágenes se reducen y se reemplazan en el propio input. Devuelve el archivo final,
 * o un error si aun así pesa demasiado (p. ej. un PDF grande); en ese caso limpia el input.
 */
export async function prepareUpload(
  input: HTMLInputElement,
  opts: { maxSide?: number; png?: boolean } = {}
): Promise<{ file: File | null; error?: string }> {
  const original = input.files?.[0]
  if (!original) return { file: null }

  let file = original
  if (original.type.startsWith('image/')) {
    const keepPng = !!opts.png && original.type === 'image/png'
    const blob = await compressImage(original, { maxSide: opts.maxSide, png: keepPng })
    // Solo se reemplaza si de verdad quedó más ligera
    if (blob !== original && blob.size < original.size) {
      const base = original.name.replace(/\.[^.]+$/, '') || 'archivo'
      file = new File([blob], `${base}.${keepPng ? 'png' : 'jpg'}`, { type: keepPng ? 'image/png' : 'image/jpeg' })
      try {
        const transfer = new DataTransfer()
        transfer.items.add(file)
        input.files = transfer.files
      } catch {
        // Navegador sin DataTransfer: se envía el original si cabe
        file = original
      }
    }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    input.value = ''
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return { file: null, error: `El archivo pesa ${mb} MB y el máximo es 3.5 MB. Elige uno más ligero o toma una foto.` }
  }
  return { file }
}

/** Lee un archivo como data URL (para vista previa o para enviarlo a la IA). */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
