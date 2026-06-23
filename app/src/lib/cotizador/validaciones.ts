const FACTORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

export function validarCuit(cuit: string): boolean {
  const d = cuit.replace(/\D/g, '')
  if (d.length !== 11) return false
  const nums = d.split('').map(Number)
  const suma = FACTORES.reduce((acc, f, i) => acc + f * nums[i], 0)
  const resto = suma % 11
  const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto
  return verificador === nums[10]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizarEmail(email: string): string | null {
  const norm = email.trim().toLowerCase()
  return EMAIL_RE.test(norm) ? norm : null
}
