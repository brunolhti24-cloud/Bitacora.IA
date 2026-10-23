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
export const PAGE = { left: 14, right: 196, width: 182, top: 44, bottom: 272 }
const PLANO: [number, number, number] = [3, 16, 51]
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
  signatures: (sigs: SignatureSpec[]) => void
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

export async function createPdf(opts: {
  companyName?: string | null
  logoUrl?: string | null
  docLabel: string
}): Promise<PdfDoc> {
  const { jsPDF } = await import('jspdf')
  const doc = sanitizeDoc(new jsPDF())
  const logo = await loadImage(opts.logoUrl)
  const pageHeight = doc.internal.pageSize.getHeight()

  const header = (first: boolean) => {
    doc.setFillColor(...PLANO)
    doc.rect(0, 0, 210, first ? 32 : 18, 'F')
    doc.setTextColor(167, 236, 128)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('BITACOR.AI', PAGE.left, 10)
    doc.setTextColor(210, 216, 228)
    doc.setFont('helvetica', 'normal')
    doc.text(opts.docLabel, PAGE.left + 22, 10)
    if (first && opts.companyName?.trim()) {
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      // El nombre de la empresa no invade el área del logo
      const maxW = logo ? 120 : PAGE.width
      doc.text(doc.splitTextToSize(opts.companyName.trim(), maxW)[0], PAGE.left, 23)
    }
    if (first && logo) {
      try {
        const ratio = Math.min(44 / logo.width, 20 / logo.height)
        const w = logo.width * ratio
        const h = logo.height * ratio
        const x = PAGE.right - w
        const y = 6 + (20 - h) / 2
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(x - 2, y - 1.5, w + 4, h + 3, 1.5, 1.5, 'F')
        doc.addImage(logo.base64, logo.format, x, y, w, h, undefined, 'FAST')
      } catch {
        // logo ilegible: se omite
      }
    }
  }

  header(true)

  const api: PdfDoc = {
    doc,
    y: PAGE.top,
    ensure(height) {
      if (api.y + height <= PAGE.bottom) return false
      doc.addPage()
      header(false)
      api.y = 28
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
    signatures(sigs) {
      const colW = PAGE.width / Math.min(sigs.length, 3)
      const blockH = 46
      api.ensure(blockH + 4)
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
      const generated = `Generado el ${formatDateTime(new Date())} con Bitacor.AI`
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

export const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente de aceptación',
  aceptada: 'Aceptada, pendiente de firma del director',
  firmada: 'Firmada por el director',
}

export function slug(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')
}
