# Plan de migración · Codificación CLAP

Generado: 2026-11-08T21:41:01.175Z

**Estado:** PLAN ÚNICAMENTE. No modifica Supabase ni SIIGO.

## Salvaguardas

- No modificar productos todavía.
- No modificar SIIGO todavía.
- No eliminar opciones existentes.
- No reutilizar códigos históricos.
- No cambiar códigos de color existentes.
- Agregar únicamente colores faltantes.
- Conservar alias históricos en la fase de productos.

## Resumen

- Acciones de jerarquía: **13**
- Plantillas a crear: **21**
- Plantillas a actualizar: **13**
- Catálogos transversales: **1**
- Casos solo para revisión: **10**

## Jerarquía a completar

| Acción | Clasificación | Código |
|---|---|---|
| CREATE_SUBGROUP | INS-PL-PG | PG |
| CREATE_SUBGROUP | MPC-AD-PG | PG |
| CREATE_GROUP | MPC-AH-CN | AH |
| CREATE_SUBGROUP | MPC-AH-CN | CN |
| CREATE_SUBGROUP | MPP-OR-PD | PD |
| CREATE_GROUP | PTC-TT-CC | TT |
| CREATE_SUBGROUP | PTC-TT-CC | CC |
| CREATE_SUBGROUP | PTF-AL-CH | CH |
| CREATE_SUBGROUP | PTF-AL-CJ | CJ |
| CREATE_SUBGROUP | PTF-ES-EN | EN |
| CREATE_SUBGROUP | PTF-RT-AC | AC |
| CREATE_GROUP | SER-PP-TR | PP |
| CREATE_SUBGROUP | SER-PP-TR | TR |

## Plantillas a crear

### ACP-MC-PF

Fuente: `ACP-MC-PF`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | MAQUINA | 3 | OWN | 1 |
| 2 | TIPO | 2 | OWN | 6 |
| 3 | MARCA | 3 | OWN | 1 |
| 4 | REFERENCIA | 3 | OWN | 1 |
| 5 | CAPACIDAD EN TON | 2 | OWN | 2 |

### ACP-MD-IY

Fuente: `ACP-MD-IY`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | MOLDE | 1 | OWN | 5 |
| 2 | CATEGORÍA | 3 | OWN | 4 |
| 3 | REFERENCIA | 3 | OWN | 14 |
| 4 | CAPACIDAD EN gr ó mL - mm | 3 | OWN | 56 |
| 5 | CAVIDADES | 3 | OWN | 5 |

### ACP-MD-MT

Fuente: `ACP-MD-MT-`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | MOLDE | 1 | OWN | 4 |
| 2 | CATEGORÍA | 3 | OWN | 2 |
| 3 | REFERENCIA | 3 | OWN | 9 |
| 4 | CAPACIDAD EN gr ó mL - mm | 3 | OWN | 40 |
| 5 | CAVIDADES | 3 | OWN | 5 |

### ACP-MD-PM

Fuente: `ACP-MD-PM-`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | PORTA MOLDE | 2 | OWN | 6 |
| 2 | FORMA GEOMETRICA | 2 | OWN | 5 |
| 3 | MÉTODO DE EXPULSIÓN | 2 | OWN | 3 |
| 4 | ENTRADA DE MATERIAL | 2 | OWN | 4 |
| 5 | PATINES | 2 | OWN | 2 |
| 6 | ALTURA mm | 3 | OWN | 1 |

### ACP-MD-SP

Fuente: `ACP-MD-SP`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | MOLDE | 1 | OWN | 4 |
| 2 | CATEGORÍA | 3 | OWN | 1 |
| 3 | REFERENCIA | 3 | OWN | 11 |
| 4 | CAPACIDAD EN gr ó mL - mm | 3 | OWN | 36 |
| 5 | CAVIDADES | 3 | OWN | 2 |

### ACP-MQ-IY

Fuente: `ACP-MQ-IY`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | MAQUINA | 3 | OWN | 1 |
| 2 | TIPO | 2 | OWN | 4 |
| 3 | MARCA | 3 | OWN | 1 |
| 4 | REFERENCIA | 3 | OWN | 1 |
| 5 | CAPACIDAD EN TON | 2 | OWN | 1 |

### ACR-PH-IB

Fuente: `ACR-PH-IB`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | ACTIVO | 2 | OWN | 5 |
| 2 | PAÍS | 2 | OWN | 1 |
| 3 | DEPARTAMENTO | 3 | OWN | 2 |
| 4 | CIUDAD | 3 | OWN | 2 |
| 5 | DIRECCIÓN | 3 | OWN | 1 |

### INS-PL-PG

Fuente: `INS-PL-PG`

Longitud numérica: **14**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | REFERENCIA | 3 | OWN | 2 |
| 2 | TIPO | 4 | OWN | 1 |
| 3 | MEDIDA | 3 | OWN | 2 |
| 4 | PRESENTACIÓN | 4 | OWN | 9 |

### MPC-AD-PG

Fuente: `MPC-AD-PG`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE PURGA | 4 | OWN | 1 |
| 2 | REFERENCIA | 3 | OWN | 1 |
| 3 | PRESENTACIÓN | 3 | OWN | 1 |
| 4 | COLOR | 3 | GLOBAL_COLOR | 19 |

### MPC-AH-CN

Fuente: `MPC-AH-CN`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | REFERENCIA | 2 | OWN | 1 |
| 2 | CÓDIGO | 4 | OWN | 2 |
| 3 | PRESENTACIÓN | 2 | OWN | 1 |
| 4 | DIMENSIÒN EN g | 3 | OWN | 1 |
| 5 | COLOR | 2 | GLOBAL_COLOR | 19 |

### MPP-OR-PD

Fuente: `MPP-OR-PD-`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | REFERENCIA | 2 | OWN | 3 |
| 2 | CÓDIGO | 4 | OWN | 5 |
| 3 | PRESENTACIÓN | 2 | OWN | 2 |
| 4 | PESO EN Kg | 3 | OWN | 17 |
| 5 | COLOR | 2 | GLOBAL_COLOR | 19 |

### PTC-RT-PO

Fuente: `PTC-RT-PO`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | Tipo de POP | 3 | OWN | 1 |
| 2 | Detalle | 3 | OWN | 2 |
| 3 | Dimensión | 3 | OWN | 3 |
| 4 | Color | 2 | GLOBAL_COLOR | 19 |
| 5 | Material | 2 | OWN | 6 |

### PTC-TT-CC

Fuente: `PTC-TT-CC`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | CATEGORÍA | 3 | OWN | 2 |
| 2 | FORMA | 4 | OWN | 1 |
| 3 | PUNTO DE ENTRADA | 4 | OWN | 2 |
| 4 | CAVIDADES | 2 | OWN | 4 |

### PTF-AL-CH

Fuente: `PTF-AL-CH`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE CUCHARA | 4 | OWN | 1 |
| 2 | ACABADO | 2 | OWN | 2 |
| 3 | CAPACIDAD | 3 | OWN | 9 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 19 |
| 5 | MATERIAL | 2 | OWN | 6 |

### PTF-AL-CJ

Fuente: `PTF-AL-CJ`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE CONJUNTO | 3 | OWN | 1 |
| 2 | BOCA | 3 | OWN | 26 |
| 3 | CAPACIDAD EN gr O mL | 3 | OWN | 18 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 19 |
| 5 | MATERIAL | 2 | OWN | 6 |

### PTF-ES-EN

Fuente: `PTF-ES-EN`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE ENVASE | 3 | OWN | 1 |
| 2 | BOCA | 3 | OWN | 22 |
| 3 | CAPACIDAD EN gr O mL | 3 | OWN | 19 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 19 |
| 5 | MATERIAL | 2 | OWN | 6 |

### PTF-FM-CJ

Fuente: `PTF-FM-CJ`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | Tipo de componente | 4 | OWN | 4 |
| 2 | ACABADO | 2 | OWN | 3 |
| 3 | Capacidad [mL] | 3 | OWN | 6 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 19 |
| 5 | MATERIAL | 2 | OWN | 8 |

### PTF-FM-JG

Fuente: `PTF-FM-JG`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE JERINGA | 4 | OWN | 6 |
| 2 | ACABADO | 2 | OWN | 1 |
| 3 | Capacidad [mL] | 3 | OWN | 6 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 19 |
| 5 | MATERIAL | 2 | OWN | 7 |

### PTF-RT-AC

Fuente: `PTF-RT-AC`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO | 3 | OWN | 6 |
| 2 | TIPO | 3 | OWN | 6 |
| 3 | CANTIDAD EN und | 3 | OWN | 10 |
| 4 | COLOR | 2 | GLOBAL_COLOR | 20 |
| 5 | MATERIAL | 2 | OWN | 12 |

### PTF-RT-PP

Fuente: `PTF-RT-PP`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | Tipo | 3 | OWN | 23 |
| 2 | Altura [cm] | 3 | OWN | 10 |
| 3 | Acabado | 3 | OWN | 10 |
| 4 | Color | 2 | GLOBAL_COLOR | 20 |
| 5 | Material | 2 | OWN | 7 |

### SER-PP-TR

Fuente: `SER-PR-PR`

Longitud numérica: **13**

| Orden | Campo | Longitud | Catálogo | Opciones fuente |
|---:|---|---:|---|---:|
| 1 | TIPO DE SERVICIO | 9 | OWN | 10 |
| 2 | LINEA | 4 | OWN | 4 |

## Plantillas a actualizar

### ALQ-MC-PF

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 2 | Tipo | TIPO | 2 | 2 | 2 opciones objetivo faltan |
| 5 | Capacidad [t] | CAPACIDAD EN TON | 2 | 2 | etiqueta "Capacidad [t]"→"CAPACIDAD EN TON"; 1 códigos tienen otro significado |

### INS-EM-AC

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Referencia | REFERENCIA | 3 | 3 | 1 códigos tienen otro significado |
| 3 | Medida | MEDIDA | 3 | 4 | longitud 3→4; 1 opciones objetivo faltan |
| 4 | Calibre | CALIBRE | 3 | 2 | longitud 3→2; 2 opciones objetivo faltan |

### INS-EM-BL

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### MPC-CP-MB

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Referencia | REFERENCIA | 2 | 2 | 4 códigos tienen otro significado |
| 2 | Código | CÓDIGO | 4 | 4 | 1 opciones objetivo faltan; 1 códigos tienen otro significado |
| 4 | Peso [g] | PESO EN g | 3 | 3 | etiqueta "Peso [g]"→"PESO EN g"; 3 códigos tienen otro significado |
| 5 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### MPP-OR-PP

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 2 | Código | CÓDIGO | 4 | 4 | 1 códigos tienen otro significado |
| 4 | Peso [kg] | PESO EN Kg | 3 | 3 | etiqueta "Peso [kg]"→"PESO EN Kg"; 1 opciones objetivo faltan; 16 códigos tienen otro significado |
| 5 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### PTC-FM-EN

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE ENVASE | 3 | 3 | etiqueta "Tipo"→"TIPO DE ENVASE"; 8 códigos tienen otro significado |
| 3 | Capacidad [g o ml] | CAPACIDAD EN gr O mL | 3 | 3 | etiqueta "Capacidad [g o ml]"→"CAPACIDAD EN gr O mL"; 18 códigos tienen otro significado |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### PTC-FM-TP

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE TAPA | 4 | 4 | etiqueta "Tipo"→"TIPO DE TAPA"; 5 códigos tienen otro significado |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### PTF-AL-EN

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE ENVASE | 3 | 3 | etiqueta "Tipo"→"TIPO DE ENVASE"; 1 opciones objetivo faltan |
| 2 | Boca | BOCA | 3 | 3 | 3 opciones objetivo faltan; 5 códigos tienen otro significado |
| 3 | Capacidad [g o ml] | CAPACIDAD EN onz_gr O mL | 3 | 3 | etiqueta "Capacidad [g o ml]"→"CAPACIDAD EN onz_gr O mL"; 1 opciones objetivo faltan; 18 códigos tienen otro significado |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |
| 5 | Material | MATERIAL | 2 | 2 | 1 códigos tienen otro significado |

### PTF-AL-TP

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE TAPA | 4 | 4 | etiqueta "Tipo"→"TIPO DE TAPA"; 2 opciones objetivo faltan |
| 2 | Acabado | ACABADO | 2 | 2 | 3 opciones objetivo faltan; 2 códigos tienen otro significado |
| 3 | Boca | BOCA | 3 | 3 | 6 opciones objetivo faltan |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |
| 5 | Material | MATERIAL | 2 | 2 | 1 códigos tienen otro significado |

### PTF-ES-TP

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE TAPA | 4 | 4 | etiqueta "Tipo"→"TIPO DE TAPA"; 1 opciones objetivo faltan; 2 códigos tienen otro significado |
| 3 | Boca | BOCA | 3 | 3 | 2 opciones objetivo faltan |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### PTF-FM-EN

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE ENVASE | 3 | 3 | etiqueta "Tipo"→"TIPO DE ENVASE"; 7 códigos tienen otro significado |
| 2 | Boca | BOCA | 3 | 3 | 1 opciones objetivo faltan |
| 3 | Capacidad [g o ml] | CAPACIDAD EN gr O mL | 3 | 3 | etiqueta "Capacidad [g o ml]"→"CAPACIDAD EN gr O mL"; 1 opciones objetivo faltan; 18 códigos tienen otro significado |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

### PTF-FM-TP

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Tipo | TIPO DE TAPA o TAPÓN | 4 | 4 | etiqueta "Tipo"→"TIPO DE TAPA o TAPÓN"; 2 opciones objetivo faltan |
| 2 | Acabado | ACABADO | 2 | 2 | 1 opciones objetivo faltan |
| 3 | Boca | BOCA | 3 | 3 | 4 opciones objetivo faltan |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |
| 5 | Material | MATERIAL | 2 | 2 | 1 códigos tienen otro significado |

### PTF-RT-PO

| Orden | CLAP actual | Objetivo | Longitud actual | Objetivo | Detalle |
|---:|---|---|---:|---:|---|
| 1 | Línea | LINEA | 3 | 3 | 2 opciones objetivo faltan; 1 códigos tienen otro significado |
| 2 | Tipo | TIPO | 3 | 3 | 22 opciones objetivo faltan; 1 códigos tienen otro significado |
| 3 | Dimensiones | CAPACIDAD EN gr O mL | 3 | 3 | etiqueta "Dimensiones"→"CAPACIDAD EN gr O mL"; 3 opciones objetivo faltan |
| 4 | Color | COLOR | 2 | 2 | 2 opciones objetivo faltan |

## Colores

### Colores

Opciones faltantes: **2**

| Código | Color |
|---|---|
| 20 | TRANSPARENTE |
| 21 | DORADO |

## Impactos históricos conocidos

> Esta fase NO modifica estos productos.

| Código actual | Código objetivo |
|---|---|
| PTF-RT-PP1080040051606 | PTF-RT-PP-1080040052006 |
| PTF-RT-PP1160040101606 | PTF-RT-PP-1160040102006 |
| PTF-RT-PP1080050031606 | PTF-RT-PP-1080050032006 |
| PTF-AL-TP-1006030282007 | PTF-AL-TP-1006030282107 |

## Casos de revisión

- **INS-EM-AC** · Referencia: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **INS-EM-AC** · Calibre: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **MPC-CP-MB** · Peso [g]: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **MPP-OR-PP** · Peso [kg]: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTC-FM-EN** · Material: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTC-FM-TP** · Material: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTF-AL-EN** · Boca: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTF-ES-TP** · Material: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTF-FM-EN** · Tipo: CLAP tiene opciones adicionales que no están en el Excel histórico.
- **PTF-FM-EN** · Material: CLAP tiene opciones adicionales que no están en el Excel histórico.