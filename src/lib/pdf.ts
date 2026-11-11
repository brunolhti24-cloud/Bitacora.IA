// Utilidades compartidas para los PDF (bitácora, expediente y gastos).
import type { jsPDF as JsPDF } from 'jspdf'
import { formatDateTime } from '@/lib/dates'
export { roleLabel } from '@/lib/roles'

// --- Texto seguro para las fuentes estándar de jsPDF ---------------------------
// Las fuentes base (Helvetica) solo codifican WinAnsi. Un solo carácter fuera de
// ese juego (p. ej. el espacio angosto U+202F que pone toLocaleString en "p. m.")
// hace que jsPDF dibuje la línea completa con espaciado irregular entre letras.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const REPLACEMENTS: Record<string, string> = {
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', '​': '',
  '−': '-', '‐': '-', '‑': '-', '•': '•',
  '≥': '>=', '≤': '<=', '×': 'x',
}

export function pdfSafe(text: string): string {
  let out = ''
  for (const ch of text.normalize('NFC')) {
    if (ch in REPLACEMENTS) { out += REPLACEMENTS[ch]; continue }
    const code = ch.codePointAt(0)!
    if (ch === '\n' || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) {
      out += ch
    }
    // Cualquier otro carácter (emoji, símbolos) se omite
  }
  // Al omitir símbolos pueden quedar espacios dobles
  return out.replace(/[ \t]{2,}/g, ' ')
}

/** Envuelve doc.text para limpiar todo el texto que se escribe. */
export function sanitizeDoc(doc: JsPDF): JsPDF {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any
  const text = d.text.bind(doc)
  d.text = (value: string | string[], ...rest: unknown[]) =>
    text(Array.isArray(value) ? value.map(pdfSafe) : pdfSafe(String(value)), ...rest)
  const split = d.splitTextToSize.bind(doc)
  d.splitTextToSize = (value: string, ...rest: unknown[]) => split(pdfSafe(String(value ?? '')), ...rest)
  return doc
}

// --- Fuente incrustada ----------------------------------------------------------
// Helvetica es una fuente "estándar" que jsPDF no incrusta: cada visor la sustituye
// por otra con medidas distintas y el espaciado entre letras y palabras sale
// irregular. Se incrusta Plus Jakarta Sans (la letra de la app).
export const PDF_FONT = 'PlusJakarta'
const FONT_FILES = { normal: '/fonts/PlusJakartaSans-Regular.ttf', bold: '/fonts/PlusJakartaSans-Bold.ttf' }

/** Lee un archivo de fuente como base64. Se puede reemplazar en pruebas. */
export let readFontFile = async (path: string): Promise<string> => {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`No se pudo cargar la fuente ${path}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  // Si la sesión expiró, la respuesta puede ser la página de login: jsPDF no avisa
  // al registrar una fuente inválida y después falla todo el documento
  const isTrueType = bytes.length > 4 && bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0
  if (!isTrueType) throw new Error(`El archivo ${path} no es una fuente TrueType`)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
export function setFontReader(reader: (path: string) => Promise<string>) {
  readFontFile = reader
}

/** Registra la fuente y hace que cualquier setFont('helvetica', …) la use. */
export async function embedFont(doc: JsPDF): Promise<boolean> {
  try {
    const [normal, bold] = await Promise.all([readFontFile(FONT_FILES.normal), readFontFile(FONT_FILES.bold)])
    doc.addFileToVFS('PlusJakartaSans-Regular.ttf', normal)
    doc.addFont('PlusJakartaSans-Regular.ttf', PDF_FONT, 'normal')
    doc.addFileToVFS('PlusJakartaSans-Bold.ttf', bold)
    doc.addFont('PlusJakartaSans-Bold.ttf', PDF_FONT, 'bold')
  } catch (err) {
    console.warn('PDF: se usa Helvetica porque no se pudo cargar la fuente', err)
    return false
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any
  const setFont = d.setFont.bind(doc)
  d.setFont = (family: string, style = 'normal', ...rest: unknown[]) => {
    const isBase = !family || family.toLowerCase() === 'helvetica'
    // No hay cursiva incrustada: se usa la normal
    const st = style === 'bold' || style === 'bolditalic' ? 'bold' : 'normal'
    return isBase ? setFont(PDF_FONT, st, ...rest) : setFont(family, style, ...rest)
  }
  d.setFont('helvetica', 'normal')
  return true
}

// --- Logo ---------------------------------------------------------------------
export type LoadedImage = { base64: string; width: number; height: number; format: 'PNG' | 'JPEG' }

export async function loadImage(url: string | null | undefined): Promise<LoadedImage | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const format = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG'
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth || 200, height: img.naturalHeight || 100 })
      img.onerror = () => resolve({ width: 200, height: 100 })
      img.src = base64
    })
    return { base64, format, ...dims }
  } catch {
    return null
  }
}

// --- Maquetación --------------------------------------------------------------
/** Logotipo de bitacor.ai para el encabezado de los PDF. */
export const BRAND_LOGO = '/logo.png'
/** Alto que ocupa el bloque de firmas con su título (para reservarlo junto a las fotos). */
export const SIGNATURES_HEIGHT = 58

export const PAGE = { left: 14, right: 196, width: 182, top: 44, bottom: 272 }
const PLANO: [number, number, number] = [30, 41, 59]
const TEXT: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [90, 100, 120]
const RULE: [number, number, number] = [216, 220, 226]

export type PdfDoc = {
  doc: JsPDF
  y: number
  /** Agrega página si no caben `height` mm; devuelve true si agregó. */
  ensure: (height: number) => boolean
  /** Título del documento (puede ocupar varias líneas) y renglones de datos debajo. */
  title: (title: string, metaLines?: string[]) => void
  section: (label: string) => void
  /** Tabla de pares etiqueta/valor en dos columnas. */
  fields: (pairs: [string, string][]) => void
  paragraph: (text: string, opts?: { size?: number; color?: [number, number, number]; indent?: number }) => void
  /** Bloque de firmas; con título, ambos se mantienen en la misma página. */
  signatures: (sigs: SignatureSpec[], title?: string) => void
  /**
   * Fotos en cuadrícula de 2 columnas, conservando su proporción. `keepWith` reserva
   * esos mm debajo de la última fila (p. ej. las firmas): si cabe, la fila se reduce
   * un poco en lugar de mandar lo que sigue a otra hoja.
   */
  photos: (images: LoadedImage[], title?: string, opts?: { keepWith?: number }) => void
  /** Dibuja pies de página en todas las páginas y guarda el archivo. */
  save: (filename: string, footerNote: string) => void
}

export type SignatureSpec = {
  label: string
  name?: string | null
  role?: string | null
  image?: string | null
  signedAt?: string | null
  /** Si es true y no hay fecha de firma, se marca "Pendiente de firma". */
  required?: boolean
}

/** Franja de bitacor.ai: no cambia aunque la empresa use el logotipo que quiera. */
const BAND: [number, number, number] = [3, 16, 51]
const BAND_H = 10

/**
 * Encabezado de los PDF. Primera hoja: arriba, en blanco, el logotipo y el nombre de
 * la empresa (sobre blanco cualquier logotipo se ve bien, sin recuadro); debajo, la
 * franja azul con bitacor.ai y el tipo de documento en blanco. Hojas siguientes: solo
 * la franja. Devuelve el alto que ocupa, en mm.
 */
export function drawPdfHeader(
  doc: JsPDF,
  o: { first: boolean; docLabel: string; companyName?: string | null; logo?: LoadedImage | null; brand?: LoadedImage | null }
): number {
  const company = o.companyName?.trim()
  const showCompany = o.first && (!!o.logo || !!company)
  const whiteH = showCompany ? 28 : 0

  if (showCompany) {
    let textX = PAGE.left
    if (o.logo) {
      try {
        const ratio = Math.min(60 / o.logo.width, 20 / o.logo.height)
        const w = o.logo.width * ratio
        const h = o.logo.height * ratio
        doc.addImage(o.logo.base64, o.logo.format, PAGE.left, (whiteH - h) / 2, w, h, 'company-logo', 'FAST')
        textX = PAGE.left + w + 6
      } catch {
        // logotipo ilegible: queda solo el nombre
      }
    }
    if (company) {
      doc.setTextColor(...BAND)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      const lines: string[] = doc.splitTextToSize(company, PAGE.right - textX).slice(0, 2)
      const lineH = 6
      const startY = whiteH / 2 + 1.8 - ((lines.length - 1) * lineH) / 2
      lines.forEach((line, i) => doc.text(line, textX, startY + i * lineH))
    }
  }

  // Franja azul con letras blancas
  doc.setFillColor(...BAND)
  doc.rect(0, whiteH, 210, BAND_H, 'F')
  const mid = whiteH + BAND_H / 2
  let brandX = PAGE.left
  if (o.brand) {
    try {
      doc.addImage(o.brand.base64, o.brand.format, PAGE.left, mid - 3.5, 7, 7, 'bitacor-logo', 'FAST')
      brandX = PAGE.left + 9
    } catch {
      // logotipo ilegible: queda solo el texto
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('bitacor.ai', brandX, mid + 1.3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const right = !o.first && company ? `${o.docLabel}  ·  ${company}` : o.docLabel
  doc.text(doc.splitTextToSize(right, 130)[0], PAGE.right, mid + 1.2, { align: 'right' })

  return whiteH + BAND_H
}

export async function createPdf(opts: {
  companyName?: string | null
  logoUrl?: string | null
  docLabel: string
}): Promise<PdfDoc> {
  const { jsPDF } = await import('jspdf')
  const doc = sanitizeDoc(new jsPDF())
  await embedFont(doc)
  const [logo, brand] = await Promise.all([loadImage(opts.logoUrl), loadImage(BRAND_LOGO)])
  const pageHeight = doc.internal.pageSize.getHeight()

  const header = (first: boolean) => drawPdfHeader(doc, { first, docLabel: opts.docLabel, companyName: opts.companyName, logo, brand })

  const firstHeaderH = header(true)

  const api: PdfDoc = {
    doc,
    y: firstHeaderH + 10,
    ensure(height) {
      if (api.y + height <= PAGE.bottom) return false
      doc.addPage()
      api.y = header(false) + 10
      return true
    },
    title(title, metaLines = []) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...PLANO)
      const lines = doc.splitTextToSize(title, PAGE.width)
      doc.text(lines, PAGE.left, api.y)
      api.y += lines.length * 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      for (const line of metaLines) {
        const wrapped = doc.splitTextToSize(line, PAGE.width)
        doc.text(wrapped, PAGE.left, api.y)
        api.y += wrapped.length * 4.5
      }
      api.y += 2
      doc.setDrawColor(...RULE)
      doc.setLineWidth(0.4)
      doc.line(PAGE.left, api.y, PAGE.right, api.y)
      api.y += 8
    },
    section(label) {
      api.ensure(16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...PLANO)
      doc.text(label, PAGE.left, api.y)
      api.y += 2
      doc.setDrawColor(...RULE)
      doc.line(PAGE.left, api.y, PAGE.right, api.y)
      api.y += 6
    },
    fields(pairs) {
      const colW = PAGE.width / 2
      for (let i = 0; i < pairs.length; i += 2) {
        const row = pairs.slice(i, i + 2)
        const blocks = row.map(([label, value]) => ({
          label,
          lines: doc.splitTextToSize(value || '—', colW - 6),
        }))
        const h = 5 + Math.max(...blocks.map((b) => b.lines.length)) * 4.6
        api.ensure(h + 2)
        blocks.forEach((b, j) => {
          const x = PAGE.left + j * colW
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(...MUTED)
          doc.text(b.label, x, api.y)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.setTextColor(...TEXT)
          doc.text(b.lines, x, api.y + 4.6)
        })
        api.y += h + 2
      }
      api.y += 2
    },
    paragraph(text, o = {}) {
      const size = o.size ?? 10
      const indent = o.indent ?? 0
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...(o.color ?? TEXT))
      const lineH = size * 0.5
      const lines: string[] = doc.splitTextToSize(text || '—', PAGE.width - indent)
      // Se escribe línea por línea para poder partir entre páginas
      for (const line of lines) {
        if (api.ensure(lineH)) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(size)
          doc.setTextColor(...(o.color ?? TEXT))
        }
        doc.text(line, PAGE.left + indent, api.y)
        api.y += lineH
      }
      api.y += 3
    },
    photos(images, title, o = {}) {
      const gap = 4
      const colW = (PAGE.width - gap) / 2
      const maxH = 68
      const minH = 36
      const labelH = 11
      const lastRow = Math.max(0, Math.ceil(images.length / 2) - 1) * 2
      // Alto de la última fila si se quiere dejar espacio debajo en esta misma hoja
      const fitLast = (y: number) => {
        if (!o.keepWith) return maxH
        const room = PAGE.bottom - y - labelH - o.keepWith
        return room >= minH ? Math.min(maxH, room) : maxH
      }
      // El título se queda con la primera fila de fotos
      if (title) {
        // Un título de sección ocupa 8 mm
        const firstH = lastRow === 0 ? fitLast(api.y + 8) : maxH
        api.ensure(8 + firstH + 8)
        api.section(title)
      }
      for (let i = 0; i < images.length; i += 2) {
        const limit = i === lastRow ? fitLast(api.y) : maxH
        const row = images.slice(i, i + 2).map((img) => {
          const ratio = Math.min(colW / img.width, limit / img.height)
          return { img, w: img.width * ratio, h: img.height * ratio }
        })
        const rowH = Math.max(...row.map((r) => r.h))
        api.ensure(rowH + 8)
        row.forEach((r, j) => {
          const x = PAGE.left + j * (colW + gap) + (colW - r.w) / 2
          try {
            doc.addImage(r.img.base64, r.img.format, x, api.y, r.w, r.h, undefined, 'FAST')
            doc.setDrawColor(...RULE)
            doc.rect(x, api.y, r.w, r.h, 'S')
          } catch {
            // imagen ilegible: se omite
          }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(...MUTED)
          doc.text(`Foto ${i + j + 1}`, PAGE.left + j * (colW + gap), api.y + rowH + 4)
        })
        api.y += rowH + labelH
      }
    },
    signatures(sigs, title) {
      const colW = PAGE.width / Math.min(sigs.length, 3)
      const blockH = 46
      // Título y firmas se miden juntos para que nunca queden en páginas distintas
      api.ensure(blockH + 2 + (title ? 8 : 0))
      if (title) api.section(title)
      const top = api.y
      sigs.forEach((s, i) => {
        const x = PAGE.left + i * colW
        const w = colW - 10
        const lineY = top + 24
        if (s.image) {
          try {
            doc.addImage(s.image, 'PNG', x, top, Math.min(w, 56), 22)
          } catch {
            // firma ilegible: se deja la línea
          }
        } else if (s.required && !s.signedAt) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(194, 65, 12)
          doc.text('Pendiente de firma', x, lineY - 4)
        }
        doc.setDrawColor(160, 168, 182)
        doc.setLineWidth(0.3)
        doc.line(x, lineY, x + w, lineY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...TEXT)
        doc.text(s.label, x, lineY + 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        let ly = lineY + 9.5
        for (const line of [s.name, s.role].filter(Boolean) as string[]) {
          doc.text(doc.splitTextToSize(line, w)[0], x, ly)
          ly += 4
        }
        const when = s.signedAt ? `Firmó: ${formatDateTime(s.signedAt)}` : s.required ? 'Sin firma registrada' : ''
        if (when) doc.text(when, x, ly)
      })
      api.y = top + blockH
    },
    save(filename, footerNote) {
      const total = doc.getNumberOfPages()
      const generated = `Generado el ${formatDateTime(new Date())} con bitacor.ai`
      for (let p = 1; p <= total; p++) {
        doc.setPage(p)
        doc.setDrawColor(...RULE)
        doc.line(PAGE.left, pageHeight - 16, PAGE.right, pageHeight - 16)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        doc.text(footerNote, PAGE.left, pageHeight - 11)
        doc.text(generated, PAGE.left, pageHeight - 7)
        doc.text(`Página ${p} de ${total}`, PAGE.right, pageHeight - 7, { align: 'right' })
      }
      doc.save(filename)
    },
  }
  return api
}

export function slug(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')
}
