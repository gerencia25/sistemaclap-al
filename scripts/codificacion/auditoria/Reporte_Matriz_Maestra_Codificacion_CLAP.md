# Comparación y propuesta · Matriz Maestra de Codificación CLAP

## Decisiones de diseño

- **CLAP será el maestro de codificación.** SIIGO conservará el maestro contable sincronizado.
- Formato único futuro: **`CAT-GRU-SUB-BLOQUE`**, siempre con guion antes del bloque numérico.
- Se conservará el código anterior como **alias histórico** cuando haya normalización.
- Habrá **un solo catálogo transversal de colores**.
- El manual de cada clasificación se generará desde la plantilla de CLAP, para que no quede desactualizado.

## Estado actual de CLAP

- Clasificaciones existentes: **97**
- Plantillas activas: **20**
- Productos: **87**
- Clasificaciones usadas: **20**
- Clasificaciones usadas sin plantilla: **4**
- Productos sin clasificación reconocible: **21**

### Plantillas que faltan y que sí tienen respaldo en el Excel del cliente

- **PTC-RT-PO:** Tipo de POP(3) | DETALLE(3) | Dimensión(3) | COLOR(2) | MATERIAL(2)
- **PTF-FM-CJ:** Tipo de componente(4) | ACABADO(2) | Capacidad [mL](3) | COLOR(2) | MATERIAL(2)
- **PTF-FM-JG:** TIPO DE JERINGA(4) | ACABADO(2) | Capacidad [mL](3) | COLOR(2) | MATERIAL(2)
- **PTF-RT-PP:** TIPO(3) | Altura [cm](3) | ACABADO(3) | COLOR(2) | MATERIAL(2)

## Diccionario único de colores propuesto

| Código | Color |
|---|---|
| 01 | AMARILLO |
| 02 | AZUL |
| 03 | AZUL CLARO |
| 04 | AZUL OSCURO |
| 05 | BLANCO |
| 06 | CAFÉ |
| 07 | FUCSIA |
| 08 | GRIS |
| 09 | LILA |
| 10 | MORADO |
| 11 | NARANJA |
| 12 | NATURAL |
| 13 | NEGRO |
| 14 | ROJO |
| 15 | ROSADO |
| 16 | TURQUESA |
| 17 | VERDE |
| 18 | VERDE CLARO |
| 19 | VERDE OSCURO |
| 20 | TRANSPARENTE |
| 21 | DORADO |

### Conflictos detectados en el Excel

- La secuencia mayoritaria usa **16=TURQUESA, 17=VERDE, 18=VERDE CLARO, 19=VERDE OSCURO**.
- `PTF-RT-PP` y `PTF-RT-AC` usan **16=TRANSPARENTE** y desplazan los verdes.
- `PTF-AL-TP` incorpora **20=DORADO**.
- Propuesta: conservar 01–19 de la secuencia mayoritaria y asignar **20=TRANSPARENTE, 21=DORADO**.

## Códigos conocidos que quedarían impactados

| Histórico | Color | Nuevo código de color | Código canónico propuesto |
|---|---|---|---|
| `PTF-RT-PP1080040051606` | TRANSPARENTE | 20 | `PTF-RT-PP-1080040052006` |
| `PTF-RT-PP1160040101606` | TRANSPARENTE | 20 | `PTF-RT-PP-1160040102006` |
| `PTF-RT-PP1080050031606` | TRANSPARENTE | 20 | `PTF-RT-PP-1080050032006` |
| `PTF-AL-TP-1006030282007` | DORADO | 21 | `PTF-AL-TP-1006030282107` |

> Estos cambios todavía **no deben ejecutarse** en CLAP ni SIIGO. Primero se valida el mapa completo y luego se hace una migración controlada.

## Inconsistencias estructurales del archivo fuente

Se detectaron **15** hojas donde la guía superior de letras no coincide con la tabla real `FAMILIA / ORDEN`.

| Clasificación | Guía | Tabla real | Criterio |
|---|---|---|---|
| MPC-AD-PG | ABC | DEF | GHI | JK | LM | ABCD | EFG | HIJ | KLM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-FM-JG | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| INS-PL-PG | ABC | DEFG | HIJK | LM | ABC | DEFG | HIJ | KLM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-AL-TP | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-AL-CH | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-FM-JG | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-FM-CJ | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-FM-TP | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTF-ES-TP | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| PTC-FM-TP | ABC | DE | FG | HI | JK | ABCD | EF | GHI | JK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| ALQ-MC-PF | ABC | DE | FG | HI | JK | ABC | DE | FGH | IJK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| ACPMQIY | ABC | DE | FG | HI | JK | ABC | DE | FGH | IJK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| ACPMCPF | ABC | DE | FG | HI | JK | ABC | DE | FGH | IJK | LM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| ACPMDPM | AB | CD | EF | GH | IJ | AB | CD | EF | GH | IJ | KLM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |
| ACRPHIB | AB | CDE | FGH | IJK | LM | AB | CD | EFG | HIJ | KLM | Usar tabla FAMILIA/ORDEN + códigos generados como fuente; corregir guía. |

## Correcciones semánticas claras

- `PTF-FM-CJ`: **Tipo de tapa → Tipo de componente**.
- `PTF-FM-CJ`: **Boca → Capacidad [mL]**.
- `PTF-FM-JG`: **Capacidad en mm → Capacidad [mL]**.
- `PTC-RT-PO`: conservar `Tipo de POP / Detalle / Dimensión / Color / Material`.
- `PTF-RT-PP`: `Tipo / Altura [cm] / Acabado / Color / Material`.

## Cómo debe verse el manual dentro de CLAP

Al seleccionar una clasificación, CLAP debe mostrar automáticamente:

1. Ruta completa: Categoría → Grupo → Subgrupo.
2. Formato del código.
3. Bloques, longitud y significado de cada campo.
4. Catálogo permitido para cada campo.
5. Ejemplo real.
6. Vista previa en vivo del código y nombre que se van a crear.

Ejemplo para `MPC-CP-MB`:

```text
MPC-CP-MB-1100010100105

11 | 0001 | 01 | 001 | 05
│     │      │    │     └─ Color (2)
│     │      │    └─────── Peso (3)
│     │      └──────────── Presentación (2)
│     └─────────────────── Código (4)
└───────────────────────── Referencia (2)
```

## Regla de prioridad para depurar el Excel histórico

Cuando el archivo se contradiga, la prioridad será:

1. Código real generado en la matriz.
2. Nombre del producto asociado.
3. Tabla `FAMILIA / ORDEN`.
4. Guía descriptiva superior.

De esta forma el Excel sirve como evidencia histórica, pero **no se copia ciegamente**.