// Colores de las tarjetas de área. Se guardan por clave en project_areas.color;
// sin color elegido, cada área toma uno fijo según su nombre (siempre el mismo).

export const AREA_COLORS = [
  { key: 'azul', label: 'Azul', hex: '#144CC9' },
  { key: 'marino', label: 'Marino', hex: '#031033' },
  { key: 'turquesa', label: 'Turquesa', hex: '#0E7490' },
  { key: 'verde', label: 'Verde', hex: '#2F7D4F' },
  { key: 'ambar', label: 'Ámbar', hex: '#B45309' },
  { key: 'rojo', label: 'Rojo', hex: '#B42318' },
  { key: 'morado', label: 'Morado', hex: '#6D28D9' },
  { key: 'gris', label: 'Gris', hex: '#475569' },
] as const

export type AreaColorKey = (typeof AREA_COLORS)[number]['key']

export const isAreaColor = (value: unknown): value is AreaColorKey =>
  typeof value === 'string' && AREA_COLORS.some((c) => c.key === value)

/** Color de un área: el elegido o, si no hay, uno estable derivado del nombre. */
export function areaColor(area: { name?: string | null; color?: string | null }) {
  const chosen = AREA_COLORS.find((c) => c.key === area.color)
  if (chosen) return chosen
  const name = (area.name || '').toLowerCase()
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AREA_COLORS[hash % AREA_COLORS.length]
}
