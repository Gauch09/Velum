const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

export function validarCuit(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return false
  const suma = PESOS.reduce((acc, p, i) => acc + p * Number(digits[i]), 0)
  const resto = suma % 11
  const verificador = resto === 0 ? 0 : 11 - resto
  return verificador === Number(digits[10])
}

export function formatCuit(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}
