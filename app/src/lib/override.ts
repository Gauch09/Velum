export function validarMotivoOverride(motivo: string | null | undefined): boolean {
  return typeof motivo === 'string' && motivo.trim().length >= 10
}
