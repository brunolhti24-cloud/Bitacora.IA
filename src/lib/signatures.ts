// Estado de firmas de una bitácora. Nombra exactamente la firma que falta.
// - Responsable: quien elabora firma al registrar (o el residente la acepta).
// - Director: da el visto bueno con su firma.

export type SignatureStage = 'responsable' | 'director' | 'completa'

export type SignatureFields = {
  status?: string | null
  signature_url?: string | null
}

export const SIGNATURE_LABELS: Record<SignatureStage, string> = {
  responsable: 'Pendiente de firma del responsable',
  director: 'Pendiente de visto bueno del director',
  completa: 'Firmas completas',
}

export function signatureStage(report: SignatureFields): SignatureStage {
  if (report.status === 'firmada') return 'completa'
  if (report.signature_url || report.status === 'aceptada') return 'director'
  return 'responsable'
}

export function signatureLabel(report: SignatureFields): string {
  return SIGNATURE_LABELS[signatureStage(report)]
}
