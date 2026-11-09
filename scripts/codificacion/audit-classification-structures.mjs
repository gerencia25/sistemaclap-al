import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

async function query(table, select = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(select);

  if (error) {
    throw new Error(
      `${table}: ${error.message}`,
    );
  }

  return data ?? [];
}

const [
  categories,
  groups,
  subgroups,
  templates,
  fields,
  catalogs,
  products,
] = await Promise.all([
  query("item_categories"),
  query("item_groups"),
  query("item_subgroups"),
  query("item_classification_templates"),
  query("item_classification_template_fields"),
  query("item_option_catalogs"),
  query(
    "products",
    `
      id,
      reference,
      final_code,
      name,
      classification_code,
      category_id,
      group_id,
      subgroup_id,
      siigo_product_id
    `,
  ),
]);

const categoryById =
  new Map(
    categories.map(
      item => [item.id, item],
    ),
  );

const groupById =
  new Map(
    groups.map(
      item => [item.id, item],
    ),
  );

const catalogById =
  new Map(
    catalogs.map(
      item => [item.id, item],
    ),
  );

const classifications = [];

for (const subgroup of subgroups) {
  const group =
    groupById.get(
      subgroup.group_id,
    );

  if (!group) continue;

  const category =
    categoryById.get(
      group.category_id,
    );

  if (!category) continue;

  const fullCode =
    [
      category.code,
      group.code,
      subgroup.code,
    ]
      .map(normalize)
      .join("-");

  classifications.push({
    fullCode,
    category,
    group,
    subgroup,
  });
}

classifications.sort(
  (a, b) =>
    a.fullCode.localeCompare(
      b.fullCode,
    ),
);

const classificationByCode =
  new Map(
    classifications.map(
      item => [
        item.fullCode,
        item,
      ],
    ),
  );

function detectClassification(
  product,
) {
  const stored =
    normalize(
      product.classification_code,
    );

  if (
    stored &&
    classificationByCode.has(
      stored,
    )
  ) {
    return stored;
  }

  const code =
    normalize(
      product.final_code ??
      product.reference,
    );

  if (!code) {
    return null;
  }

  const matches =
    classifications
      .filter(({ fullCode }) =>
        code === fullCode ||
        code.startsWith(
          `${fullCode}-`,
        ) ||
        code.startsWith(
          fullCode,
        )
      )
      .sort(
        (a, b) =>
          b.fullCode.length -
          a.fullCode.length,
      );

  return (
    matches[0]?.fullCode ??
    null
  );
}

const productStats =
  new Map();

const unresolvedProducts = [];

for (const product of products) {
  const classificationCode =
    detectClassification(
      product,
    );

  if (!classificationCode) {
    unresolvedProducts.push(
      product,
    );

    continue;
  }

  if (
    !productStats.has(
      classificationCode,
    )
  ) {
    productStats.set(
      classificationCode,
      {
        total: 0,
        siigo: 0,
      },
    );
  }

  const stats =
    productStats.get(
      classificationCode,
    );

  stats.total += 1;

  if (
    product.siigo_product_id
  ) {
    stats.siigo += 1;
  }
}

const activeTemplates =
  templates.filter(
    item =>
      normalize(item.status) ===
      "ACTIVO",
  );

const templatesByClassification =
  new Map();

for (
  const template
  of activeTemplates
) {
  const code =
    [
      template.category_code,
      template.group_code,
      template.subgroup_code,
    ]
      .map(normalize)
      .join("-");

  if (
    !templatesByClassification.has(
      code,
    )
  ) {
    templatesByClassification.set(
      code,
      [],
    );
  }

  templatesByClassification
    .get(code)
    .push(template);
}

const fieldsByTemplate =
  new Map();

for (const field of fields) {
  if (
    normalize(field.status) !==
    "ACTIVO"
  ) {
    continue;
  }

  if (
    !fieldsByTemplate.has(
      field.template_id,
    )
  ) {
    fieldsByTemplate.set(
      field.template_id,
      [],
    );
  }

  fieldsByTemplate
    .get(field.template_id)
    .push(field);
}

for (
  const templateFields
  of fieldsByTemplate.values()
) {
  templateFields.sort(
    (a, b) =>
      Number(
        a.display_order ?? 0,
      ) -
      Number(
        b.display_order ?? 0,
      ),
  );
}

const lines = [];

lines.push(
  "# Mapa maestro de codificación CLAP",
);

lines.push("");

lines.push(
  `Generado: ${new Date().toISOString()}`,
);

lines.push("");

lines.push(
  `Clasificaciones configuradas: ${classifications.length}`,
);

lines.push(
  `Plantillas activas: ${activeTemplates.length}`,
);

lines.push(
  `Productos analizados: ${products.length}`,
);

lines.push(
  `Productos sin clasificación reconocible: ${unresolvedProducts.length}`,
);

lines.push("");

for (
  const classification
  of classifications
) {
  const {
    fullCode,
    category,
    group,
    subgroup,
  } = classification;

  const matchingTemplates =
    templatesByClassification.get(
      fullCode,
    ) ?? [];

  const stats =
    productStats.get(
      fullCode,
    ) ?? {
      total: 0,
      siigo: 0,
    };

  lines.push(
    `## ${fullCode}`,
  );

  lines.push("");

  lines.push(
    `${category.name} → ${group.name} → ${subgroup.name}`,
  );

  lines.push("");

  lines.push(
    `Productos CLAP: ${stats.total}`,
  );

  lines.push(
    `Productos provenientes/vinculados con SIIGO: ${stats.siigo}`,
  );

  lines.push("");

  if (
    matchingTemplates.length === 0
  ) {
    lines.push(
      "⚠️ SIN PLANTILLA ACTIVA.",
    );

    lines.push("");

    continue;
  }

  if (
    matchingTemplates.length > 1
  ) {
    lines.push(
      `⚠️ Tiene ${matchingTemplates.length} plantillas activas.`,
    );

    lines.push("");
  }

  for (
    const template
    of matchingTemplates
  ) {
    lines.push(
      `Plantilla: ${template.name ?? template.id}`,
    );

    lines.push(
      `Formato: ${template.full_code ?? fullCode}-[BLOQUE NUMÉRICO]`,
    );

    lines.push(
      `Patrón: ${template.code_pattern ?? "N/A"}`,
    );

    lines.push(
      `Longitud numérica: ${template.numeric_code_length ?? "N/A"}`,
    );

    lines.push("");

    const templateFields =
      fieldsByTemplate.get(
        template.id,
      ) ?? [];

    if (
      templateFields.length === 0
    ) {
      lines.push(
        "Sin campos activos.",
      );

      lines.push("");

      continue;
    }

    lines.push(
      "| Orden | Campo | Etiqueta | Longitud | Código | Nombre | Fuente |",
    );

    lines.push(
      "|---:|---|---|---:|:---:|:---:|---|",
    );

    for (
      const field
      of templateFields
    ) {
      let source =
        "Opciones de plantilla";

      if (
        field.option_catalog_id
      ) {
        const catalog =
          catalogById.get(
            field.option_catalog_id,
          );

        source =
          catalog
            ? `Catálogo transversal: ${
                catalog.name ??
                catalog.code ??
                catalog.key ??
                catalog.id
              }`
            : `Catálogo transversal ${field.option_catalog_id}`;
      }

      lines.push(
        `| ${field.display_order ?? ""} | ${field.field_key ?? ""} | ${field.field_label ?? ""} | ${field.code_length ?? ""} | ${field.contributes_to_code ? "Sí" : "No"} | ${field.contributes_to_name ? "Sí" : "No"} | ${source} |`,
      );
    }

    lines.push("");

    const codeFields =
      templateFields.filter(
        field =>
          field.contributes_to_code,
      );

    if (
      codeFields.length > 0
    ) {
      lines.push(
        "Estructura numérica:",
      );

      lines.push("");

      lines.push(
        codeFields
          .map(
            field =>
              `${field.field_key}(${field.code_length})`,
          )
          .join(" | "),
      );

      lines.push("");
    }
  }
}

lines.push(
  "# Productos sin clasificación automática",
);

lines.push("");

for (
  const product
  of unresolvedProducts
) {
  lines.push(
    `- ${product.final_code ?? product.reference ?? "(sin código)"} · ${product.name ?? ""}${product.siigo_product_id ? " · SIIGO" : ""}`,
  );
}

const outputPath =
  "scripts/codificacion/reports/mapa-maestro-codificacion.md";

fs.writeFileSync(
  outputPath,
  lines.join("\n"),
  "utf8",
);

const usedWithSiigo =
  classifications
    .map(
      classification => {
        const stats =
          productStats.get(
            classification.fullCode,
          ) ?? {
            total: 0,
            siigo: 0,
          };

        return {
          clasificacion:
            classification.fullCode,

          productos:
            stats.total,

          siigo:
            stats.siigo,

          plantillas:
            (
              templatesByClassification.get(
                classification.fullCode,
              ) ?? []
            ).length,
        };
      },
    )
    .filter(
      item =>
        item.productos > 0 ||
        item.siigo > 0,
    );

console.log(
  "\n===== CLASIFICACIONES UTILIZADAS =====",
);

console.table(
  usedWithSiigo,
);

const usedWithoutTemplate =
  usedWithSiigo.filter(
    item =>
      item.plantillas === 0,
  );

if (
  usedWithoutTemplate.length
) {
  console.log(
    "\n⚠️ CLASIFICACIONES CON PRODUCTOS PERO SIN PLANTILLA",
  );

  console.table(
    usedWithoutTemplate,
  );
}

console.log(
  "\n===== RESUMEN =====",
);

console.table({
  "Clasificaciones existentes":
    classifications.length,

  "Plantillas activas":
    activeTemplates.length,

  "Productos":
    products.length,

  "Productos sin clasificación reconocible":
    unresolvedProducts.length,

  "Clasificaciones usadas por productos":
    usedWithSiigo.length,

  "Clasificaciones usadas sin plantilla":
    usedWithoutTemplate.length,
});

console.log(
  `\n✅ Informe creado en:\n${outputPath}`,
);

console.log(
  "\n✅ Solo lectura. No se modificó la base de datos.",
);
