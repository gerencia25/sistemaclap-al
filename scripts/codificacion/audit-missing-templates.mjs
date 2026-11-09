import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const targets = [
  "PTC-RT-PO",
  "PTF-FM-CJ",
  "PTF-FM-JG",
  "PTF-RT-PP",
];

function norm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

async function get(table, select = "*") {
  const { data, error } =
    await supabase
      .from(table)
      .select(select);

  if (error) {
    throw error;
  }

  return data ?? [];
}

const [
  products,
  templates,
  fields,
] = await Promise.all([
  get(
    "products",
    `
      id,
      final_code,
      reference,
      name,
      classification_code,
      siigo_product_id
    `,
  ),

  get(
    "item_classification_templates",
  ),

  get(
    "item_classification_template_fields",
  ),
]);

for (const target of targets) {
  const [
    categoryCode,
    groupCode,
    subgroupCode,
  ] = target.split("-");

  console.log(
    "\n\n==================================================",
  );

  console.log(
    `CLASIFICACIÓN SIN PLANTILLA: ${target}`,
  );

  console.log(
    "==================================================",
  );

  const matchingProducts =
    products.filter(product => {
      const code =
        norm(
          product.final_code ??
          product.reference,
        );

      return (
        norm(
          product.classification_code,
        ) === target ||
        code.startsWith(
          `${target}-`,
        ) ||
        code.startsWith(target)
      );
    });

  console.log(
    "\n--- PRODUCTOS HISTÓRICOS ---",
  );

  console.table(
    matchingProducts.map(product => {
      const fullCode =
        norm(
          product.final_code ??
          product.reference,
        );

      let tail =
        fullCode.startsWith(target)
          ? fullCode
              .slice(target.length)
              .replace(/^-/, "")
          : "";

      return {
        codigo:
          fullCode,

        bloque:
          tail,

        longitud_bloque:
          tail.length,

        nombre:
          product.name,

        siigo:
          Boolean(
            product.siigo_product_id,
          ),
      };
    }),
  );

  /*
   * Primero buscamos plantillas de la misma
   * categoría y grupo.
   */
  const sameGroup =
    templates.filter(template =>
      norm(template.category_code) ===
        categoryCode &&
      norm(template.group_code) ===
        groupCode &&
      norm(template.status) ===
        "ACTIVO",
    );

  console.log(
    "\n--- PLANTILLAS DEL MISMO GRUPO ---",
  );

  console.table(
    sameGroup.map(template => ({
      clasificacion:
        `${template.category_code}-${template.group_code}-${template.subgroup_code}`,

      nombre:
        template.name,

      patron:
        template.code_pattern,

      longitud:
        template.numeric_code_length,
    })),
  );

  /*
   * También buscamos plantillas cuyo
   * subgrupo tenga el mismo código.
   *
   * Esto sirve para detectar si CJ, JG, PP,
   * etc. utilizan estructuras similares
   * en otra rama.
   */
  const sameSubgroup =
    templates.filter(template =>
      norm(template.subgroup_code) ===
        subgroupCode &&
      norm(template.status) ===
        "ACTIVO",
    );

  console.log(
    "\n--- PLANTILLAS CON EL MISMO SUBGRUPO ---",
  );

  console.table(
    sameSubgroup.map(template => ({
      clasificacion:
        `${template.category_code}-${template.group_code}-${template.subgroup_code}`,

      nombre:
        template.name,

      patron:
        template.code_pattern,

      longitud:
        template.numeric_code_length,
    })),
  );

  const candidates =
    [
      ...sameGroup,
      ...sameSubgroup,
    ];

  const uniqueCandidates =
    [
      ...new Map(
        candidates.map(
          item => [
            item.id,
            item,
          ],
        ),
      ).values(),
    ];

  for (
    const template
    of uniqueCandidates
  ) {
    const templateFields =
      fields
        .filter(
          field =>
            field.template_id ===
              template.id &&
            norm(field.status) ===
              "ACTIVO",
        )
        .sort(
          (a, b) =>
            Number(
              a.display_order ?? 0,
            ) -
            Number(
              b.display_order ?? 0,
            ),
        );

    console.log(
      `\nCAMPOS → ${template.category_code}-${template.group_code}-${template.subgroup_code}`,
    );

    console.table(
      templateFields.map(field => ({
        orden:
          field.display_order,

        campo:
          field.field_key,

        etiqueta:
          field.field_label,

        longitud:
          field.code_length,

        aporta_codigo:
          field.contributes_to_code,

        aporta_nombre:
          field.contributes_to_name,

        catalogo:
          field.option_catalog_id ??
          "propio",
      })),
    );
  }
}

console.log(
  "\n✅ Solo lectura. No se modificó la base de datos.",
);
