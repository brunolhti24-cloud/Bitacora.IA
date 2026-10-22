// Fechas de obra. Las columnas DATE de Supabase ('2026-10-09') son un día del
// calendario, no un instante: `new Date('2026-10-09')` las lee como medianoche UTC
// y en México (UTC-6) eso cae en el día anterior. Por eso las fechas de calendario
// se formatean siempre en UTC, y los instantes (TIMESTAMPTZ) en la zona de la obra.

export const OBRA_TIME_ZONE = 'America/Mexico_City'

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Convierte 'YYYY-MM-DD' (o un ISO que empiece así) en un Date anclado a UTC. */
function dateOnlyToUtc(value: string): Date | null {
  const m = DATE_ONLY.exec(value.slice(0, 10))
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/** Formatea una columna DATE sin moverla de día, igual en servidor y navegador. */
export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string {
  if (!value) return ''
  const d = dateOnlyToUtc(value)
  if (!d) return value
  return d.toLocaleDateString('es-MX', { ...options, timeZone: 'UTC' })
}

/** Formatea un instante (TIMESTAMPTZ) en la hora de la obra. */
export function formatDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-MX', { ...options, timeZone: OBRA_TIME_ZONE })
}

/** Fecha de hoy en la obra como 'YYYY-MM-DD' (para valores por defecto de <input type="date">). */
export function todayInObra(): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: OBRA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Suma días a una fecha 'YYYY-MM-DD'. */
export function addDays(value: string, days: number): string {
  const d = dateOnlyToUtc(value)
  if (!d) return value
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Primer día del mes de una fecha 'YYYY-MM-DD'. */
export function startOfMonth(value: string): string {
  return value.slice(0, 8) + '01'
}
