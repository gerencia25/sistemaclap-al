import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/*
 * FASE 2 · PREVIEW DE ADOPCIÓN DE PRODUCTOS SIIGO
 * -----------------------------------------------
 * SOLO LECTURA.
 *
 * Objetivo:
 * - reconocer clasificación por el código actual;
 * - aceptar códigos con y sin guion antes del bloque numérico;
 * - descomponer el bloque según la plantilla activa;
 * - resolver cada segmento contra sus opciones;
 * - proponer dynamic_code_data;
 * - detectar códigos que solo requieren normalización visual;
 * - separar correcciones reales de código ya conocidas;
 * - NO modificar products ni SIIGO.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function codeNorm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function numericCode(value, length) {
  const raw = String(value ?? "").trim();
  return /^\d+$/.test(raw)
    ? raw.padStart(length, "0")
    : raw;
}

async function read(table, select = "*") {
  const { data, error } =
    await supabase
      .from(table)
      .select(select);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

const [
  products,
  categories,
  groups,
  subgroups,
  templates,
  fields,
  legacyOptions,
  sharedCatalogValues,
] = await Promise.all([
  read(
    "products",
    `
      id,
      reference,
      final_code,
      name,
      category,
      category_id,
      group_id,
      subgroup_id,
      classification_code,
      dynamic_code_data,
      siigo_product_id,
      siigo_sync_status
    `,
  ),
  read("item_categories"),
  read("item_groups"),
  read("item_subgroups"),
  read("item_classification_templates"),
  read("item_classification_template_fields"),
  read("item_classification_field_options"),
  read("item_option_catalog_values"),
]);

const siigoProducts =
  products.filter(
    (product) =>
      Boolean(product.siigo_product_id),
  );

const activeTemplates =
  templates.filter(
    (template) =>
      norm(template.status) === "ACTIVO",
  );

const activeFields =
  fields.filter(
    (field) =>
      norm(field.status) === "ACTIVO",
  );

function classificationOfTemplate(template) {
  return [
    template.category_code,
    template.group_code,
    template.subgroup_code,
  ]
    .map(norm)
    .join("-");
}

const templateByClassification =
  new Map(
    activeTemplates.map(
      (template) => [
        classificationOfTemplate(template),
        template,
      ],
    ),
  );

const classifications =
  [...templateByClassification.keys()]
    .sort(
      (a, b) =>
        b.length - a.length,
    );

const categoryByCode =
  new Map(
    categories.map(
      (item) => [
        norm(item.code),
        item,
      ],
    ),
  );

const groupByPath =
  new Map();

for (const group of groups) {
  const category =
    categories.find(
      (item) =>
        item.id === group.category_id,
    );

  if (!category) continue;

  groupByPath.set(
    `${norm(category.code)}|${norm(group.code)}`,
    group,
  );
}

const subgroupByPath =
  new Map();

for (const subgroup of subgroups) {
  const group =
    groups.find(
      (item) =>
        item.id === subgroup.group_id,
    );

  if (!group) continue;

  const category =
    categories.find(
      (item) =>
        item.id === group.category_id,
    );

  if (!category) continue;

  subgroupByPath.set(
    [
      norm(category.code),
      norm(group.code),
      norm(subgroup.code),
    ].join("|"),
    subgroup,
  );
}

function fieldsFor(templateId) {
  return activeFields
    .filter(
      (field) =>
        field.template_id === templateId,
    )
    .sort(
      (a, b) =>
        Number(a.display_order ?? 0) -
        Number(b.display_order ?? 0),
    );
}

function resolveOptions(field) {
  if (field.option_catalog_id) {
    return sharedCatalogValues
      .filter(
        (option) =>
          option.catalog_id ===
            field.option_catalog_id &&
          norm(option.status) === "ACTIVO",
      )
      .map(
        (option) => ({
          code:
            numericCode(
              option.code,
              Number(field.code_length),
            ),
          name:
            String(option.name ?? "").trim(),
          source:
            "shared",
        }),
      );
  }

  return legacyOptions
    .filter(
      (option) =>
        option.template_id ===
          field.template_id &&
        option.field_key ===
          field.field_key &&
        norm(option.status) === "ACTIVO",
    )
    .map(
      (option) => ({
        code:
          numericCode(
            option.code,
            Number(field.code_length),
          ),
        name:
          String(option.name ?? "").trim(),
        source:
          "legacy",
      }),
    );
}

/*
 * Correcciones históricas ya confirmadas en la auditoría.
 * En esta fase SOLO se reportan.
 */
const knownCanonicalChanges = new Map([
  [
    "PTF-RT-PP1080040051606",
    "PTF-RT-PP-1080040052006",
  ],
  [
    "PTF-RT-PP1160040101606",
    "PTF-RT-PP-1160040102006",
  ],
  [
    "PTF-RT-PP1080050031606",
    "PTF-RT-PP-1080050032006",
  ],
  [
    "PTF-AL-TP-1006030282007",
    "PTF-AL-TP-1006030282107",
  ],
]);

function detectClassification(code) {
  const value = codeNorm(code);

  for (const classification of classifications) {
    if (
      value === classification ||
      value.startsWith(
        `${classification}-`,
      ) ||
      value.startsWith(classification)
    ) {
      return classification;
    }
  }

  return null;
}

function extractNumericTail(
  code,
  classification,
) {
  const value = codeNorm(code);

  if (!value.startsWith(classification)) {
    return null;
  }

  return value
    .slice(classification.length)
    .replace(/^-/, "");
}

const results = [];

for (const product of siigoProducts) {
  const currentCode =
    codeNorm(
      product.final_code ??
      product.reference ??
      "",
    );

  const classification =
    detectClassification(
      currentCode,
    );

  if (!classification) {
    results.push({
      product_id:
        product.id,
      current_code:
        currentCode,
      name:
        product.name,
      status:
        "REQUIERE_REVISION",
      reason:
        "No se reconoce una clasificación activa por el prefijo del código.",
      classification:
        null,
      proposed_code:
        null,
      dynamic_code_data:
        null,
    });

    continue;
  }

  const template =
    templateByClassification.get(
      classification,
    );

  const templateFields =
    fieldsFor(template.id);

  const tail =
    extractNumericTail(
      currentCode,
      classification,
    );

  const expectedLength =
    Number(
      template.numeric_code_length ?? 0,
    );

  if (
    !tail ||
    !/^\d+$/.test(tail) ||
    tail.length !== expectedLength
  ) {
    results.push({
      product_id:
        product.id,
      current_code:
        currentCode,
      name:
        product.name,
      status:
        "REQUIERE_REVISION",
      reason:
        `Bloque numérico inválido. Actual=${tail?.length ?? 0}; esperado=${expectedLength}.`,
      classification,
      proposed_code:
        null,
      dynamic_code_data:
        null,
    });

    continue;
  }

  let cursor = 0;
  const dynamicData = {};
  const parsedFields = [];
  const unresolvedFields = [];

  for (const field of templateFields) {
    const length =
      Number(
        field.code_length ?? 0,
      );

    const segment =
      tail.slice(
        cursor,
        cursor + length,
      );

    cursor += length;

    if (!field.contributes_to_code) {
      continue;
    }

    const options =
      resolveOptions(field);

    const match =
      options.find(
        (option) =>
          option.code === segment,
      );

    if (!match) {
      unresolvedFields.push({
        field_key:
          field.field_key,
        field_label:
          field.field_label,
        segment,
        option_catalog_id:
          field.option_catalog_id,
      });

      parsedFields.push({
        field_key:
          field.field_key,
        field_label:
          field.field_label,
        segment,
        value:
          null,
        resolved:
          false,
      });

      continue;
    }

    dynamicData[field.field_key] =
      match.name;

    parsedFields.push({
      field_key:
        field.field_key,
      field_label:
        field.field_label,
      segment,
      value:
        match.name,
      resolved:
        true,
    });
  }

  const canonicalCode =
    `${classification}-${tail}`;

  const explicitChange =
    knownCanonicalChanges.get(
      currentCode,
    );

  let status;
  let reason;
  let proposedCode =
    canonicalCode;

  if (unresolvedFields.length > 0) {
    status =
      "REQUIERE_REVISION";
    reason =
      `${unresolvedFields.length} segmento(s) no existen en los catálogos vigentes.`;
  } else if (explicitChange) {
    status =
      "REQUIERE_CAMBIO_CODIGO";
    reason =
      "Corrección histórica previamente confirmada; cambia el valor codificado, no solo el formato.";
    proposedCode =
      explicitChange;
  } else if (
    currentCode !== canonicalCode
  ) {
    status =
      "NORMALIZAR_GUION";
    reason =
      "La identidad codificada coincide; solo falta el guion canónico antes del bloque numérico.";
  } else {
    status =
      "ADOPTAR";
    reason =
      "Código y estructura coinciden con la plantilla vigente.";
  }

  const [
    categoryCode,
    groupCode,
    subgroupCode,
  ] =
    classification.split("-");

  const category =
    categoryByCode.get(
      categoryCode,
    );

  const group =
    groupByPath.get(
      `${categoryCode}|${groupCode}`,
    );

  const subgroup =
    subgroupByPath.get(
      `${categoryCode}|${groupCode}|${subgroupCode}`,
    );

  results.push({
    product_id:
      product.id,
    siigo_product_id:
      product.siigo_product_id,
    current_code:
      currentCode,
    proposed_code:
      proposedCode,
    name:
      product.name,
    status,
    reason,
    classification,
    category_id:
      category?.id ?? null,
    group_id:
      group?.id ?? null,
    subgroup_id:
      subgroup?.id ?? null,
    numeric_tail:
      tail,
    parsed_fields:
      parsedFields,
    unresolved_fields:
      unresolvedFields,
    dynamic_code_data:
      unresolvedFields.length
        ? null
        : dynamicData,
  });
}

const summary =
  Object.fromEntries(
    [
      "ADOPTAR",
      "NORMALIZAR_GUION",
      "REQUIERE_CAMBIO_CODIGO",
      "REQUIERE_REVISION",
    ].map(
      (status) => [
        status,
        results.filter(
          (item) =>
            item.status === status,
        ).length,
      ],
    ),
  );

const reportsDir =
  path.resolve(
    "scripts/codificacion/reports",
  );

fs.mkdirSync(
  reportsDir,
  { recursive: true },
);

const jsonPath =
  path.join(
    reportsDir,
    "preview-adopcion-productos-siigo-fase2.json",
  );

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      generated_at:
        new Date().toISOString(),
      read_only:
        true,
      total_siigo_products:
        siigoProducts.length,
      summary,
      results,
    },
    null,
    2,
  ),
  "utf8",
);

const md = [];

md.push(
  "# Fase 2 · Vista previa de adopción de productos SIIGO",
);
md.push("");
md.push(
  "**Solo lectura. No modifica CLAP ni SIIGO.**",
);
md.push("");
md.push(
  `Productos SIIGO analizados: **${siigoProducts.length}**`,
);
md.push("");
md.push(
  `- ADOPTAR: **${summary.ADOPTAR}**`,
);
md.push(
  `- NORMALIZAR_GUION: **${summary.NORMALIZAR_GUION}**`,
);
md.push(
  `- REQUIERE_CAMBIO_CODIGO: **${summary.REQUIERE_CAMBIO_CODIGO}**`,
);
md.push(
  `- REQUIERE_REVISION: **${summary.REQUIERE_REVISION}**`,
);
md.push("");

for (const status of [
  "REQUIERE_CAMBIO_CODIGO",
  "REQUIERE_REVISION",
  "NORMALIZAR_GUION",
  "ADOPTAR",
]) {
  md.push(
    `## ${status}`,
  );
  md.push("");
  md.push(
    "| Código actual | Código propuesto | Clasificación | Producto | Motivo |",
  );
  md.push(
    "|---|---|---|---|---|",
  );

  for (
    const item
    of results.filter(
      (row) =>
        row.status === status,
    )
  ) {
    md.push(
      `| ${item.current_code || ""} | ${item.proposed_code || ""} | ${item.classification || ""} | ${(item.name || "").replaceAll("|", "/")} | ${(item.reason || "").replaceAll("|", "/")} |`,
    );
  }

  md.push("");
}

const mdPath =
  path.join(
    reportsDir,
    "preview-adopcion-productos-siigo-fase2.md",
  );

fs.writeFileSync(
  mdPath,
  md.join("\n"),
  "utf8",
);

console.log(
  "\n============================================",
);
console.log(
  "FASE 2 · PREVIEW ADOPCIÓN PRODUCTOS SIIGO",
);
console.log(
  "============================================\n",
);

console.table({
  "Productos SIIGO":
    siigoProducts.length,
  ADOPTAR:
    summary.ADOPTAR,
  NORMALIZAR_GUION:
    summary.NORMALIZAR_GUION,
  REQUIERE_CAMBIO_CODIGO:
    summary.REQUIERE_CAMBIO_CODIGO,
  REQUIERE_REVISION:
    summary.REQUIERE_REVISION,
});

console.log(
  "\n===== REQUIERE CAMBIO DE CÓDIGO =====",
);
console.table(
  results
    .filter(
      (item) =>
        item.status ===
        "REQUIERE_CAMBIO_CODIGO",
    )
    .map(
      (item) => ({
        actual:
          item.current_code,
        propuesto:
          item.proposed_code,
        producto:
          item.name,
      }),
    ),
);

console.log(
  "\n===== REQUIERE REVISIÓN =====",
);
console.table(
  results
    .filter(
      (item) =>
        item.status ===
        "REQUIERE_REVISION",
    )
    .map(
      (item) => ({
        codigo:
          item.current_code,
        clasificacion:
          item.classification,
        producto:
          item.name,
        motivo:
          item.reason,
        segmentos:
          (item.unresolved_fields ?? [])
            .map(
              (field) =>
                `${field.field_key}=${field.segment}`,
            )
            .join(", "),
      }),
    ),
);

console.log(
  "\n===== NORMALIZAR SOLO GUION =====",
);
console.table(
  results
    .filter(
      (item) =>
        item.status ===
        "NORMALIZAR_GUION",
    )
    .map(
      (item) => ({
        actual:
          item.current_code,
        propuesto:
          item.proposed_code,
        producto:
          item.name,
      }),
    ),
);

console.log(
  "\n✅ SOLO LECTURA. No se modificó CLAP ni SIIGO.",
);
console.log(
  `\nReportes:\n- ${mdPath}\n- ${jsonPath}`,
);
