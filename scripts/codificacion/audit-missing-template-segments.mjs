import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cases = [
  {
    target: "PTC-RT-PO",
    donor: "PTF-RT-PO",
  },
  {
    target: "PTF-FM-CJ",
    donor: "PTF-FM-EN",
  },
  {
    target: "PTF-FM-JG",
    donor: "PTF-FM-EN",
  },
  {
    target: "PTF-RT-PP",
    donor: "PTF-RT-PO",
  },
];

function norm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

async function fetchAll(
  table,
  select = "*",
) {
  const { data, error } =
    await supabase
      .from(table)
      .select(select);

  if (error) throw error;

  return data ?? [];
}

const [
  products,
  templates,
  fields,
  options,
] = await Promise.all([
  fetchAll(
    "products",
    `
      final_code,
      reference,
      name,
      classification_code
    `,
  ),

  fetchAll(
    "item_classification_templates",
  ),

  fetchAll(
    "item_classification_template_fields",
  ),

  fetchAll(
    "item_classification_field_options",
  ),
]);

function findTemplate(code) {
  const [
    category,
    group,
    subgroup,
  ] = code.split("-");

  return templates.find(
    template =>
      norm(template.category_code) === category &&
      norm(template.group_code) === group &&
      norm(template.subgroup_code) === subgroup &&
      norm(template.status) === "ACTIVO",
  );
}

for (const config of cases) {
  const donor =
    findTemplate(config.donor);

  if (!donor) {
    console.log(
      `\n❌ No existe plantilla donante ${config.donor}`,
    );

    continue;
  }

  const donorFields =
    fields
      .filter(
        field =>
          field.template_id === donor.id &&
          norm(field.status) === "ACTIVO" &&
          field.contributes_to_code,
      )
      .sort(
        (a, b) =>
          Number(a.display_order ?? 0) -
          Number(b.display_order ?? 0),
      );

  const targetProducts =
    products.filter(product => {
      const code =
        norm(
          product.final_code ??
          product.reference,
        );

      return (
        norm(product.classification_code) ===
          config.target ||
        code.startsWith(
          `${config.target}-`,
        ) ||
        code.startsWith(
          config.target,
        )
      );
    });

  console.log(
    "\n\n==================================================",
  );

  console.log(
    `${config.target}  ← estructura comparada con ${config.donor}`,
  );

  console.log(
    "==================================================",
  );

  console.log(
    "\nEstructura candidata:",
  );

  console.log(
    donorFields
      .map(
        field =>
          `${field.field_label}(${field.code_length})`,
      )
      .join(" | "),
  );

  for (const product of targetProducts) {
    const fullCode =
      norm(
        product.final_code ??
        product.reference,
      );

    const numeric =
      fullCode
        .slice(
          config.target.length,
        )
        .replace(/^-/, "");

    console.log(
      `\n${fullCode}`,
    );

    console.log(
      product.name,
    );

    let cursor = 0;

    const rows = [];

    for (const field of donorFields) {
      const length =
        Number(
          field.code_length ?? 0,
        );

      const segment =
        numeric.slice(
          cursor,
          cursor + length,
        );

      cursor += length;

      const matchingOptions =
        options.filter(
          option =>
            option.template_id ===
              donor.id &&
            option.field_key ===
              field.field_key &&
            String(option.code)
              .padStart(
                length,
                "0",
              ) === segment &&
            norm(option.status) ===
              "ACTIVO",
        );

      rows.push({
        campo:
          field.field_key,

        etiqueta:
          field.field_label,

        longitud:
          length,

        segmento:
          segment,

        opciones_conocidas:
          matchingOptions
            .map(
              option =>
                option.name,
            )
            .join(" | ") ||
          "(sin coincidencia)",
      });
    }

    console.table(rows);

    if (
      cursor !== numeric.length
    ) {
      console.log(
        `⚠️ Longitud esperada ${cursor}, longitud real ${numeric.length}`,
      );
    }
  }
}

console.log(
  "\n✅ Solo lectura. No se modificó la base de datos.",
);
