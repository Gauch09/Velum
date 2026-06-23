import type { SkinRailInput, SkinRailGeometria } from './tipos'
import { contarSkin } from '@/lib/cotizador/skin/geometria'

const OMEGA_STEP_M = 1.5
const OMEGA_TRAMO_M = 3.0

export function contarSkinRail(i: SkinRailInput): SkinRailGeometria {
  const g_skin = contarSkin(i)

  const omegas = Math.ceil(i.alto / OMEGA_STEP_M)
  const mlOmega = omegas * i.ancho
  const empallesC = omegas * Math.max(Math.ceil(i.ancho / OMEGA_TRAMO_M) - 1, 0)
  const autoperfCostillaOmega = 2 * g_skin.costillas * omegas
  const autoperfOmegaPanel = 2 * omegas * g_skin.columnas
  const piezasOmegaHorno = omegas * Math.ceil(i.ancho / OMEGA_TRAMO_M)

  return {
    ...g_skin,
    omegas,
    mlOmega,
    empallesC,
    autoperfCostillaOmega,
    autoperfOmegaPanel,
    piezasOmegaHorno,
  }
}
