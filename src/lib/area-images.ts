// Portada de las tarjetas de área. En orden:
// 1. La foto que subió el director para esa área (project_areas.image_url).
// 2. Una imagen de referencia generada con IA según el nombre (public/areas/*.webp).
// 3. Sin coincidencia: fondo gris oscuro neutro.

const PRESETS: { file: string; words: string[] }[] = [
  { file: 'bano', words: ['bano', 'sanitario', 'wc', 'regadera', 'medio bano'] },
  { file: 'cocina', words: ['cocina', 'cocineta', 'alacena', 'despensa'] },
  { file: 'recamara', words: ['recamara', 'habitacion', 'cuarto', 'dormitorio', 'vestidor', 'closet'] },
  { file: 'sala', words: ['sala', 'estancia', 'estudio', 'oficina', 'family', 'tv'] },
  { file: 'comedor', words: ['comedor', 'antecomedor'] },
  { file: 'cochera', words: ['cochera', 'garage', 'garaje', 'estacionamiento', 'bodega'] },
  { file: 'patio', words: ['patio', 'jardin', 'terraza', 'balcon', 'alberca', 'asador', 'exterior', 'pasillo'] },
  { file: 'azotea', words: ['azotea', 'techo', 'impermeabilizacion', 'tinaco', 'roof'] },
  { file: 'estructura', words: ['cimentacion', 'losa', 'estructura', 'castillo', 'columna', 'trabe', 'zapata', 'muro', 'obra negra', 'escalera'] },
  { file: 'fachada', words: ['fachada', 'frente', 'barda', 'acceso', 'entrada'] },
  { file: 'terreno', words: ['terreno', 'excavacion', 'nivelacion', 'trazo', 'desplante', 'lote'] },
  { file: 'cisterna', words: ['cisterna', 'aljibe', 'fosa', 'drenaje', 'registro', 'hidraulica'] },
]

/** Fondo cuando no hay foto ni imagen de referencia: gris oscuro, sin colores. */
export const AREA_FALLBACK_BG = '#334155'

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Imagen de portada del área, o null para usar el fondo neutro. */
export function areaCover(area: { name?: string | null; image_url?: string | null }): string | null {
  if (area.image_url) return area.image_url
  const name = ` ${normalize(area.name || '').replace(/[^a-z0-9]+/g, ' ')} `
  const preset = PRESETS.find((p) => p.words.some((w) => name.includes(` ${w} `) || name.includes(` ${w}s `) || name.includes(` ${w}es `)))
  return preset ? `/areas/${preset.file}.webp` : null
}

/** Carpeta del almacenamiento donde se guardan las fotos de áreas de una obra. */
export const areaPhotoFolder = (projectId: string) => `areas/${projectId}/`
