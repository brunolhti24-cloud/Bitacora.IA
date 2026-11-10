// Limpieza de notas de bitácora. Las notas son texto plano: se quitan restos de
// Markdown y los marcadores de plantilla que generaba la versión anterior de la IA.

const PLACEHOLDER_LINE = /^\s*\[[^\]]*\]\s*$/ // "[Nombre del Ingeniero Residente]"
const HEADER_LINE = /^\s*(proyecto|obra|área|area|fecha|folio|responsable|elaboró|cargo|firma)\s*:/i
const TITLE_LINE = /^\s*bitácora (diaria )?de (construcción|obra)\s*$/i

export function cleanNotes(text: string | null | undefined): string {
  if (!text) return ''
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\*\*/g, '').replace(/^#{1,6}\s+/, '').replace(/\s+$/, ''))
    .filter((line) => !/^\s*-{3,}\s*$/.test(line))
    .filter((line) => !PLACEHOLDER_LINE.test(line) && !HEADER_LINE.test(line) && !TITLE_LINE.test(line))
  // Sin renglones vacíos repetidos ni al inicio o al final
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
