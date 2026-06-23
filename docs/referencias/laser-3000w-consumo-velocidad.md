# Láser 3000 W — Velocidad de corte y consumo eléctrico

**Fecha:** 2026-06-13
**Equipo:** Láser de fibra 3000 W, asistencia con **aire comprimido a 16 bar** (compresor de 3 kW).
**Estado:** Referencia técnica. NO integrada al cotizador (ver nota al pie).

Tablas de rendimiento por material y espesor. El consumo total combina la máquina + el compresor, por **metro lineal de corte**.

## Acero Galvanizado

| Espesor (mm) | Vel. corte (m/min) | Tiempo/metro (s) | Máquina (Wh/m) | Compresor (Wh/m) | **Total (Wh/m)** |
|---:|---:|---:|---:|---:|---:|
| 0,5 | 32,0 – 38,0 | 1,7 | 7,8 | 5,6 | **13,4** |
| 1,0 | 22,0 – 26,0 | 2,5 | 11,5 | 8,3 | **19,8** |
| 2,0 | 9,0 – 11,0 | 6,0 | 27,5 | 20,0 | **47,5** |
| 3,0 | 4,5 – 5,5 | 12,0 | 55,0 | 40,0 | **95,0** |
| 4,0 | 2,5 – 3,2 | 21,0 | 96,3 | 70,0 | **166,3** |

## Aluminio

| Espesor (mm) | Vel. corte (m/min) | Tiempo/metro (s) | Máquina (Wh/m) | Compresor (Wh/m) | **Total (Wh/m)** |
|---:|---:|---:|---:|---:|---:|
| 0,5 | 35,0 – 40,0 | 1,6 | 7,3 | 5,3 | **12,6** |
| 1,0 | 24,0 – 28,0 | 2,3 | 10,6 | 7,7 | **18,3** |
| 2,0 | 10,0 – 12,0 | 5,5 | 25,2 | 18,3 | **43,5** |
| 3,0 | 5,0 – 6,0 | 10,9 | 50,0 | 36,3 | **86,3** |
| 4,0 | 2,2 – 2,8 | 24,0 | 110,0 | 80,0 | **190,0** |

## Notas de uso

- **El driver de tiempo/costo de corte es la LONGITUD DE CORTE (perímetro + cortes internos), NO el área.**
  Dos piezas de igual área pueden tener tiempos de corte muy distintos según su forma y cantidad de perforaciones.
  Para estimar tiempo desde esta tabla se necesita el **perímetro de corte por pieza** (dato del DXF/CAD).
- **No está integrada al cotizador** porque:
  1. El tiempo de láser por pieza ya está en el modelo vía `CapacidadTeorica` (deriva de "Minutos por 100u corte" de la hoja `datos`), y se afinará con el dato medido real de `TramoTrabajo`.
  2. La energía del láser es marginal frente al resto del costo y ya está absorbida en el overhead (energía eléctrica) de la tasa de planta.
- **Si en algún momento hace falta** (ej. costear energía del láser por pieza, o una línea de corte a terceros):
  costo_energía/pieza = (Wh/m total ÷ 1000) × longitud_corte[m] × tarifa[$/kWh].
  Ojo doble conteo: habría que sacar la parte del láser del overhead de energía.
